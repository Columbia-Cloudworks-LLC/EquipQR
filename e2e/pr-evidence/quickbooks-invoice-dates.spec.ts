import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { test, expect } from '../user/fixtures/equipqr-test';
import { apexOrgId, seedWorkOrders } from '../user/shared/seed-data';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import type { InvoiceReview } from '../../src/services/quickbooks/invoiceReview';

// Only vendor-dependent review is stubbed. Authentication, permissions, work order,
// connection/mapping reads, and saving/reloading invoice details use local Supabase.
const workOrderId = seedWorkOrders.apexCompletedPm.id;
const realm = 'invoice-date-evidence-only';
let admin: SupabaseClient;
let teamId: string;
let previousDetails: Record<string, unknown> | null;
let previousMapping: Record<string, unknown> | null;
let pmId: string;

test.describe('Explicit invoice dates and concise PM review #1551 @pr-evidence', () => {
  test.beforeAll(async () => {
    const status = JSON.parse(execFileSync(process.execPath, [
      path.join(process.cwd(), 'node_modules/supabase/dist/supabase.js'), 'status', '-o', 'json',
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
    const url = process.env.PR_EVIDENCE_SUPABASE_URL || status.API_URL;
    if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Evidence requires local Supabase');
    admin = createClient(url, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: workOrder, error } = await admin.from('work_orders').select('equipment_id,status').eq('id', workOrderId).single();
    if (error) throw error;
    expect(workOrder.status).toBe('completed');
    const { data: equipment } = await admin.from('equipment').select('team_id').eq('id', workOrder.equipment_id).single();
    teamId = equipment!.team_id;
    const { data: pm } = await admin.from('preventative_maintenance').select('id').eq('work_order_id', workOrderId).single();
    pmId = pm!.id;
    previousDetails = (await admin.from('work_order_invoice_details').select('*').eq('work_order_id', workOrderId).maybeSingle()).data;
    previousMapping = (await admin.from('quickbooks_team_customers').select('*').eq('team_id', teamId).eq('organization_id', apexOrgId).maybeSingle()).data;
    const setup = await Promise.all([
      admin.from('work_order_invoice_details').delete().eq('work_order_id', workOrderId),
      admin.from('quickbooks_team_customers').upsert({ organization_id: apexOrgId, team_id: teamId, quickbooks_customer_id: 'evidence-customer', display_name: 'Evidence customer' }, { onConflict: 'organization_id,team_id' }),
      admin.from('quickbooks_credentials').insert({ organization_id: apexOrgId, realm_id: realm, access_token: 'local-evidence-not-a-token', refresh_token: 'local-evidence-not-a-token', access_token_expires_at: '2099-01-01T00:00:00Z', refresh_token_expires_at: '2099-01-01T00:00:00Z' }),
    ]);
    for (const result of setup) if (result.error) throw result.error;
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('quickbooks_credentials').delete().eq('realm_id', realm).eq('organization_id', apexOrgId);
    await admin.from('work_order_invoice_details').delete().eq('work_order_id', workOrderId);
    if (previousDetails) await admin.from('work_order_invoice_details').insert(previousDetails);
    if (previousMapping) await admin.from('quickbooks_team_customers').upsert(previousMapping, { onConflict: 'organization_id,team_id' });
    else if (teamId) await admin.from('quickbooks_team_customers').delete().eq('team_id', teamId).eq('quickbooks_customer_id', 'evidence-customer');
  });

  test('historical dates remain explicit and persist through a real local save', async ({ page, gotoDashboard, assertHealthyShell }) => {
    let reviewRequests = 0;
    let exportRequests = 0;
    await page.route('**/functions/v1/quickbooks-export-invoice', async (route) => {
      const body = route.request().postDataJSON();
      if (body.action !== 'review') {
        exportRequests++;
        await route.fulfill({ status: 400, json: { error: 'Evidence does not export invoices' } });
        return;
      }
      reviewRequests++;
      const { data, error } = await admin.from('work_order_invoice_details').select('invoice_date,due_date,payment_term_id,service_dates').eq('work_order_id', workOrderId).maybeSingle();
      if (error) throw error;
      const review: InvoiceReview = {
        source_fingerprint: 'local-visual-evidence',
        saved_details: data,
        terms: [{ id: 'net30', name: 'Net 30', due_days: 30, day_of_month_due: null, due_next_month_days: null }],
        customer_term_id: 'net30', existing_invoice: null, blocking_reason: null,
        services: [{ key: `pm:${pmId}`, description: 'PM — 250-hour service', service_date: data?.service_dates?.[`pm:${pmId}`] ?? null, quantity: 1, unit_price: 0, amount: 0 }],
      };
      await route.fulfill({ json: review });
    });
    await gotoDashboard(`/work-orders/${workOrderId}`);
    await assertHealthyShell();
    const openReview = async () => {
      await page.getByRole('button', { name: 'Export', exact: true }).click();
      await page.getByRole('menuitem', { name: 'QuickBooks', exact: true }).hover();
      await page.getByRole('menuitem', { name: 'Create New Invoice', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Review invoice details' })).toBeVisible();
      await expect(page.getByLabel('Invoice date', { exact: true })).toBeVisible();
      await expect(page.getByRole('menu')).toHaveCount(0);
    };
    await openReview();
    const dialog = page.getByRole('dialog', { name: 'Review invoice details' });
    await expect(dialog.getByLabel('Invoice date', { exact: true })).toHaveValue('');
    await expect(dialog.getByLabel('Due date', { exact: true })).toHaveValue('');
    await expect(dialog.getByLabel('Service date', { exact: true })).toHaveValue('');
    await expect(dialog.getByRole('button', { name: 'Confirm and create invoice' })).toBeDisabled();
    await evidenceScreenshot(page, '01-business-dates-start-empty');
    await dialog.getByLabel('Invoice date', { exact: true }).fill('2026-09-21');
    await dialog.getByRole('button', { name: 'Calculate from invoice date and terms' }).click();
    await expect(dialog.getByLabel('Due date', { exact: true })).toHaveValue('2026-10-21');
    await dialog.getByLabel('Service date', { exact: true }).fill('2026-08-05');
    await evidenceScreenshot(page, '02-historical-service-and-invoice-dates');
    await dialog.getByRole('button', { name: 'Save details', exact: true }).click();
    await expect(dialog.getByText('Invoice details saved.', { exact: true })).toBeVisible();
    const stored = (await admin.from('work_order_invoice_details').select('invoice_date,due_date,service_dates').eq('work_order_id', workOrderId).single()).data;
    expect(stored).toEqual({ invoice_date: '2026-09-21', due_date: '2026-10-21', service_dates: { [`pm:${pmId}`]: '2026-08-05' } });
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.reload();
    await openReview();
    await expect(dialog.getByLabel('Invoice date', { exact: true })).toHaveValue('2026-09-21');
    await expect(dialog.getByLabel('Due date', { exact: true })).toHaveValue('2026-10-21');
    await expect(dialog.getByLabel('Service date', { exact: true })).toHaveValue('2026-08-05');
    await expect(dialog.getByRole('button', { name: 'Confirm and create invoice' })).toBeEnabled();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Open work order quick actions' }).click();
    const actionSheet = page.getByRole('dialog', { name: 'Work order actions' });
    await actionSheet.getByRole('button', { name: 'Export to QuickBooks', exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(actionSheet).toHaveCount(0);
    await expect(dialog.getByLabel('Service date', { exact: true })).toHaveValue('2026-08-05');
    await dialog.getByLabel('Invoice date', { exact: true }).scrollIntoViewIfNeeded();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-mobile-billing-dates');
    await dialog.getByRole('button', { name: 'Confirm and create invoice' }).scrollIntoViewIfNeeded();
    await expect(dialog.getByRole('button', { name: 'Save details', exact: true })).toBeVisible();
    await expect(page.getByRole('menu')).toHaveCount(0);
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '04-mobile-concise-pm-and-service-date');
    expect(reviewRequests).toBeGreaterThanOrEqual(2);
    expect(exportRequests).toBe(0);
  });
});
