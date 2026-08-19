# QuickBooks Online

The QuickBooks integration pushes completed work orders to QuickBooks Online as **draft invoices**. You still review and send every invoice from QuickBooks, so you keep control over customer billing.

Organization owners and admins connect the company, map customer teams to QuickBooks customers, and export completed work orders as drafts.

Step-by-step walkthroughs live in the Help Center:

- [Connect QuickBooks](/support/admin-integrations/connect-quickbooks)
- [Map teams to QuickBooks customers](/support/admin-integrations/map-teams-to-qb-customers)
- [Export a work order to QuickBooks](/support/admin-integrations/export-work-order-to-qb)

## Connect

From the sidebar, open **Integrations** (or Organization → Integrations). Click **Connect to QuickBooks Online**, sign in to the QuickBooks company, and grant the requested scopes. EquipQR reads customers, items, invoices, and payments. It writes draft invoices and can create missing product/service items used on those drafts. It does not touch payroll or banking.

You land back on the Integrations tab with a **Connected** badge. The card also offers **Disconnect**.

QuickBooks refresh tokens last about 100 days. EquipQR refreshes short-lived access tokens in the background. If the connection health indicator in the top bar turns red, reconnect from this page.

## Map teams to customers

Invoice export needs a QuickBooks customer on the team. Open the customer team, find the **Customer account** card, and link a QuickBooks customer. Teams that are already linked show a **QuickBooks synced** badge on the Teams list.

## Export draft invoices

On a **completed** work order, use **Export → QuickBooks**. Requirements:

- The work order's equipment belongs to a team
- That team has a QuickBooks customer mapping
- You can manage QuickBooks (owner, admin, or a member granted access)

Exported drafts include summarized billing lines from EquipQR work-order costs. EquipQR stays the source of truth for itemized inventory and labor detail.

- **Labor.** Billable labor from work-order cost rows.
- **Parts.** One summarized non-inventory line for other work-order costs.

**Private Note** on the QuickBooks invoice still holds the EquipQR work order ID, dates, private notes, and the full itemized cost breakdown. **Customer Memo** holds the timeline and resolution summary.

## Related

- [Connect QuickBooks](/support/admin-integrations/connect-quickbooks)
- [Map teams to QuickBooks customers](/support/admin-integrations/map-teams-to-qb-customers)
- [Export a work order to QuickBooks](/support/admin-integrations/export-work-order-to-qb)
