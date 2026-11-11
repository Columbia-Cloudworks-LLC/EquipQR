import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import type { PreventativeMaintenance } from '@/features/pm-templates/services/preventativeMaintenanceService';

/** Complete, typed work order for tests. Override only the fields a test cares about. */
export function createWorkOrderFixture(overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: 'wo-1',
    title: 'Replace hydraulic line',
    description: 'Repair leak',
    status: 'submitted',
    priority: 'medium',
    created_date: '2024-01-01T00:00:00Z',
    created_by: 'user-1',
    created_by_admin: null,
    created_by_name: null,
    updated_at: '2024-01-01T00:00:00Z',
    due_date: null,
    due_date_has_time: false,
    estimated_hours: null,
    completed_date: null,
    acceptance_date: null,
    assignee_id: null,
    assignee_name: null,
    equipment_id: 'eq-1',
    equipment_working_hours_at_creation: null,
    organization_id: 'org-1',
    has_pm: false,
    pm_required: false,
    is_historical: false,
    historical_start_date: null,
    historical_notes: null,
    primary_image_id: null,
    invoice_balance_cents: null,
    invoice_due_date: null,
    invoice_last_synced_at: null,
    invoice_paid_at: null,
    invoice_sent_at: null,
    invoice_status: null,
    invoice_sync_error: null,
    quickbooks_invoice_environment: null,
    quickbooks_invoice_id: null,
    quickbooks_invoice_number: null,
    quickbooks_realm_id: null,
    ...overrides,
  };
}

/** Complete, typed preventative maintenance row for tests. */
export function createPreventativeMaintenanceFixture(
  overrides: Partial<PreventativeMaintenance> = {},
): PreventativeMaintenance {
  return {
    id: 'pm-1',
    work_order_id: 'wo-1',
    equipment_id: 'eq-1',
    organization_id: 'org-1',
    status: 'pending',
    checklist_data: [],
    notes: null,
    template_id: null,
    completed_at: null,
    completed_by: null,
    completed_by_name: null,
    created_at: '2024-01-01T00:00:00Z',
    created_by: 'user-1',
    created_by_name: null,
    updated_at: '2024-01-01T00:00:00Z',
    equipment_working_hours_at_completion: null,
    historical_completion_date: null,
    historical_notes: null,
    is_historical: false,
    ...overrides,
  };
}
