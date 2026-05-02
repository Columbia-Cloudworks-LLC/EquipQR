import type { SupportArticle } from "../types";

const adminIntegrationsArticles: SupportArticle[] = [
  {
    id: "organization-settings",
    title: "Organization settings tour",
    summary:
      "Where to find organization branding, notifications, and integrations as an Owner or Admin.",
    category: "admin-integrations",
    personas: ["admin", "owner"],
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Open Organization",
        description:
          "From the sidebar under Infrastructure, click Organization. The page has tabs for Settings, Members, Teams, Integrations, and more.",
      },
      {
        title: "Settings tab",
        description:
          "Name, time zone, branding color, and display preferences live on the Settings tab. Branding color recolors the sidebar for every user in the organization.",
      },
      {
        title: "Integrations tab",
        description:
          "QuickBooks Online and Google Workspace integrations live on the Integrations tab. Each integration has its own connect button and status indicator.",
        screenshot: {
          src: "/docs/support/admin-integrations/organization-settings/step-03-integrations.png",
          alt: "Organization Integrations tab showing QuickBooks and Google Workspace cards",
          viewport: "desktop",
        },
      },
    ],
    related: [
      { id: "connect-quickbooks", label: "Connect QuickBooks" },
      { id: "google-workspace-connect", label: "Connect Google Workspace" },
    ],
  },
  {
    id: "connect-quickbooks",
    title: "Connect QuickBooks",
    summary:
      "Authorize EquipQR to create draft invoices in your QuickBooks Online company.",
    category: "admin-integrations",
    personas: ["admin", "owner"],
    requirement: "Must be Organization Owner or Admin.",
    lastReviewed: "2026-05-01",
    intro: (
      <p>
        The QuickBooks integration pushes work order details to QuickBooks
        Online as <strong>draft invoices</strong>. You still review and send
        from QuickBooks, so you keep full control over customer billing.
      </p>
    ),
    steps: [
      {
        title: "Open Organization → Integrations",
        description:
          "From the sidebar, open Organization, then click the Integrations tab.",
      },
      {
        title: "Click Connect to QuickBooks Online",
        description:
          "EquipQR redirects you to QuickBooks to authorize the connection. Sign in to the QuickBooks company you want to connect.",
      },
      {
        title: "Approve access",
        description:
          "Grant the requested scopes. EquipQR only reads customers and writes invoices — it does not touch payroll, banking, or transactions.",
      },
      {
        title: "Return to EquipQR",
        description:
          "You land back on the Integrations tab with a Connected status. Next, map your teams to QuickBooks customers.",
        note: "QuickBooks access tokens expire every 100 days. EquipQR auto-refreshes the connection every 15 minutes, so you rarely need to reconnect manually.",
      },
    ],
    related: [
      { id: "map-teams-to-qb-customers", label: "Map teams to QuickBooks customers" },
      { id: "export-work-order-to-qb", label: "Export a work order to QuickBooks" },
    ],
  },
  {
    id: "map-teams-to-qb-customers",
    title: "Map teams to QuickBooks customers",
    summary:
      "Tell EquipQR which QuickBooks customer each team bills to so invoice export knows where to post.",
    category: "admin-integrations",
    personas: ["admin", "owner"],
    requirement:
      "QuickBooks must be connected. Only Organization Owners and Admins can map teams.",
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Open the team",
        description:
          "Go to Teams, then select the team you want to map.",
      },
      {
        title: "Find the QuickBooks Customer card",
        description:
          "Scroll on the team page until you see the QuickBooks Customer card. It shows the current mapping (or 'Not mapped').",
      },
      {
        title: "Click Select Customer",
        description:
          "A searchable picker opens pulling live customers from QuickBooks. Pick the customer this team bills to.",
      },
      {
        title: "Save",
        description:
          'The mapping saves automatically. The team card now shows the linked QuickBooks customer name, and invoice exports from this team post to that customer.',
        note: "Map every active team before you start exporting so you do not get blocked at invoicing time.",
      },
    ],
    related: [
      { id: "export-work-order-to-qb", label: "Export a work order to QuickBooks" },
    ],
  },
  {
    id: "export-work-order-to-qb",
    title: "Export a work order to QuickBooks",
    summary:
      "Send a completed work order to QuickBooks Online as a draft invoice with line items, notes, and a customer memo.",
    category: "admin-integrations",
    personas: ["admin", "owner"],
    requirement:
      "Only Owners and Admins can export. The equipment must be on a team that is mapped to a QuickBooks customer.",
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Open the work order",
        description:
          "From Work Orders, open the job you are invoicing. All costs should be finalised before exporting.",
      },
      {
        title: "Click Take Action → Export to QuickBooks",
        description:
          "The Take Action dropdown appears in the work order header. Pick Export to QuickBooks.",
        screenshot: {
          src: "/docs/support/admin-integrations/export-work-order-to-qb/step-02-take-action.png",
          alt: "Work order header with Take Action dropdown open showing Export to QuickBooks",
          viewport: "desktop",
        },
      },
      {
        title: "Review the draft invoice in QuickBooks",
        description: (
          <>
            EquipQR creates a <strong>draft invoice</strong> with the total as
            an "EquipQR Services" line item, the work order description,
            public notes in the invoice description, and cost breakdown in the
            private note.
          </>
        ),
      },
      {
        title: "Re-export if the work order changes",
        description:
          'Updating the work order and exporting again updates the same draft invoice in QuickBooks. Once you mark the invoice as sent in QuickBooks, a subsequent re-export creates a new invoice rather than editing the sent one.',
      },
    ],
    outro: (
      <p className="text-sm text-muted-foreground">
        Troubleshooting tip: if the Export option is disabled, confirm
        QuickBooks is connected, the equipment is on a team, that team has a
        QuickBooks customer mapping, and you are an Admin or Owner.
      </p>
    ),
    related: [
      { id: "connect-quickbooks", label: "Connect QuickBooks" },
      { id: "map-teams-to-qb-customers", label: "Map teams to QuickBooks customers" },
    ],
  },
  {
    id: "google-workspace-connect",
    title: "Connect Google Workspace",
    summary:
      "Use your Google Workspace directory to sync users, groups, and admin controls into EquipQR.",
    category: "admin-integrations",
    personas: ["admin", "owner"],
    requirement:
      "Must be a Google Workspace super-admin for your domain and an EquipQR Organization Owner or Admin.",
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Open Workspace onboarding",
        description:
          "Navigate to Dashboard → Onboarding → Workspace, or click the Google Workspace card from Organization → Integrations.",
      },
      {
        title: "Sign in with Google",
        description:
          "Authorize EquipQR with the scopes it needs to read your directory. EquipQR never modifies Workspace settings; it reads users and groups only.",
      },
      {
        title: "Pick users and groups to sync",
        description:
          "Check the groups and users you want to mirror into EquipQR. Selective sync avoids importing every mailbox from a large Workspace.",
      },
      {
        title: "Run the sync",
        description:
          'After the initial sync, Workspace users appear as pending EquipQR invites. Finish onboarding by assigning each imported user to a team.',
        note: "Workspace sync is optional — you can keep inviting users manually and the rest of EquipQR works identically.",
      },
    ],
  },
];

export default adminIntegrationsArticles;
