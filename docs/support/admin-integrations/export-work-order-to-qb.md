---
title: "Export a work order to QuickBooks"
description: "Complete a PM work order and send it to QuickBooks Online as a draft invoice with labor and parts line items, notes, and a customer memo."
lastReviewed: 2026-09-21
personas: ["admin","owner"]
requirement: "Only Owners and Admins (or members granted QuickBooks access) can export. The work order must be completed, and its equipment must be on a team linked to a QuickBooks customer."
---

**For:** Admin, Owner  
**Last reviewed:** 2026-09-21

::: info Requires
Only Owners and Admins (or members granted QuickBooks access) can export. The work order must be **completed**, and its equipment must be on a team linked to a QuickBooks customer.
:::

This guide follows a preventative-maintenance job end to end: create the PM work order, complete the checklist, record billable costs, complete the work order, and export it to QuickBooks as a draft invoice.

## Desktop walkthrough video

<https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-demo.mp4>

## 1. Create the work order (with PM checklist)

From the equipment page, open the **Work Orders** tab and click **Create Work Order**. Give it a clear title and description, assign a technician, and choose the equipment's **PM template** from the dropdown directly below the title (defaults to the assigned template when one exists).

![Create Work Order dialog, general information](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-04-create-work-order-general.png)

![Create Work Order dialog with PM template selected below the title](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-05-create-work-order-pm-type.png)

If you have not updated the equipment's working hours, EquipQR asks before creating:

![Working hours confirmation before creating the work order](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-06-create-work-order-hours-guard.png)

The new work order opens with the PM checklist attached and the customer's contacts in the sidebar.

![New work order assigned with PM checklist](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-07-work-order-assigned.png)

## 2. Complete the PM checklist

Click **Start Work**, then work through the checklist sections. When the machine checks out, **Set All to OK** completes the remaining items in one step. **Complete PM** unlocks once every item is rated.

![PM checklist with all sections complete](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-08-pm-checklist-complete.png)

::: tip PM gate
A work order with a PM checklist cannot be completed until the PM itself is completed — the **Complete** action stays disabled until then.
:::

## 3. Record billable costs

Use **Add labor** for billable hours × hourly rate, and **Add Cost Item** for parts and materials. These become the line items on the invoice, so finalize them before completing.

![Add labor dialog with hours and hourly rate](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-09-add-labor-dialog.png)

![Itemized costs with labor and parts lines](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-10-itemized-costs.png)

## 4. Complete the work order

Click **Complete** and confirm. After completion, notes, images, and costs are locked.

![Complete work order confirmation](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-11-complete-work-order-confirm.png)

## 5. Export → QuickBooks → Create New Invoice

Open the **Export** menu in the work order header and choose **QuickBooks → Create New Invoice**.

Review invoice details before confirming the export. Enter the **Service date** for each line, **Invoice date**, **Payment terms**, and **Due date** (the payment deadline). Unknown dates start empty: creating or completing a work order today does not mean the service happened today.

**Calculate from invoice date and terms** fills the due date from your selections. You can choose an explicit payment deadline instead. **Save details** keeps your entries without exporting. The **Work order due date** remains a separate scheduling deadline.

For example, work performed August 5 and billed September 21 under Net 30 can have a service date of August 5, invoice date September 21, and payment due date October 21.

![Export menu with the QuickBooks submenu](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-12-export-menu-quickbooks.png)

On mobile, the same actions live in the work order quick-actions sheet under **QuickBooks**:

![Mobile action sheet with the QuickBooks section](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/admin-integrations/mobile/qb-04-action-sheet-quickbooks.png)

When the export finishes, the work order header shows an invoice badge with the draft total and invoice number:

![Work order header with the Invoice Draft badge](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-13-invoice-draft-badge.png)

After the first export the QuickBooks submenu switches to **Update Invoice #…** and **Open Invoice**:

![Export menu after the invoice exists](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-14-export-menu-post-invoice.png)

## 6. Review the draft invoice in QuickBooks

**Open Invoice** takes you straight to the draft in QuickBooks Online. EquipQR maps the work order like this:

| Work order data | Where it lands in QuickBooks |
| --- | --- |
| Labor cost lines | One **Labor** service line (summed) |
| All other cost lines | One **Parts** line (summed) |
| Performed PM | Separate concise **PM — service name** line, quantity 1 and initial unit price $0 |
| PM findings + public notes + parts detail | Customer memo, without the internal status timeline |
| Service date | Date on its service line, when the QuickBooks form enables Service date |
| Invoice date | Invoice billing/accounting date |
| Payment terms + Due date | Customer payment terms and deadline |
| Full cost breakdown + private notes | Private note (not customer-visible) |
| Equipment make/model/serial/hours | Invoice custom field |
| Work order ID and dates | Memo on statement (hidden) |
| Customer tax status | Sales tax (automatic calculation, tax-exempt respected) |

![Draft invoice in QuickBooks with labor and parts lines](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-15-qbo-invoice-top.png)

![Draft invoice totals, customer note, and hidden statement memo](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-16-qbo-invoice-totals.png)

::: tip Review pricing before sending
PM unit prices start at **$0** so you can enter your standard rate in QuickBooks. Separately billable labor and parts keep their amounts. EquipQR does not call the invoice-send action and creates invoices with online payments disabled for review. Set the PM price and any desired payment options before deliberately sending from QuickBooks.
:::

In QuickBooks, enable **Manage → Customization → Service date** to show dates alongside service lines. The printed column is labeled **Date**. On phones, customers may need to open invoice details to see dates rather than only the payment summary. Check your actual customer view and printable invoice.

## 7. Re-export if the work order changes

**Update Invoice** opens another review of the linked invoice. QuickBooks dates, existing service dates, quantities, and prices are preserved by default. Changing the invoice date, terms, or due date requires an explicit replacement choice. If the invoice or work order changes after review, reload the review before exporting.

Older invoices without saved line associations, and invoices with online payments enabled, must be updated directly in QuickBooks. EquipQR explains this rather than guessing which charges to replace or changing delivery settings.

## Troubleshooting

If the QuickBooks option is missing or disabled in the Export menu, confirm:

1. QuickBooks is connected (Integrations page shows **Connected**).
2. The work order status is **Completed**.
3. The equipment is on a team whose customer account shows **Linked for invoice export**.
4. You are an Owner/Admin or have been granted QuickBooks access on the Members page.

## Related articles

- [Connect QuickBooks](./connect-quickbooks)
- [Map teams to QuickBooks customers](./map-teams-to-qb-customers)
- [Complete a PM checklist](../technician-field-work/pm-checklist)
