/**
 * Central SEO copy for public marketing feature pages (/features/*).
 * Visible How To sections should stay aligned with howTo.steps copy below (FAQ/schema parity).
 */

export interface FeatureFaqItem {
  question: string;
  answer: string;
}

export interface FeatureHowToStep {
  name: string;
  text: string;
}

export interface FeatureSeoEntry {
  path: string;
  /** Used by PageSEO (suffix "| EquipQR" added automatically except path "/" elsewhere). */
  pageTitle: string;
  description: string;
  breadcrumbLabel: string;
  heroTitle: string;
  heroDescription: string;
  faq?: FeatureFaqItem[];
  howTo?: {
    name: string;
    description: string;
    steps: FeatureHowToStep[];
  };
}

export const FEATURE_SEO_BY_PATH: Record<string, FeatureSeoEntry> = {
  '/features/qr-code-integration': {
    path: '/features/qr-code-integration',
    pageTitle: 'QR Code Equipment Tracking for Heavy Equipment Repair Shops',
    description:
      'Scan equipment QR codes to open service history, work orders, and PM checklists from any phone. Generate printable QR labels for your fleet.',
    breadcrumbLabel: 'QR Code Tracking',
    heroTitle: 'QR Code Equipment Tracking for Heavy Equipment Repair Shops',
    heroDescription:
      'Instantly access equipment details, work orders, and maintenance history with QR code scanning. Generate labels and streamline field operations from any device.',
    faq: [
      {
        question: 'Do technicians need to install an app to scan QR codes?',
        answer:
          'Technicians can use the EquipQR web app with any smartphone browser or use built-in camera flows depending on device settings. QR stickers encode HTTPS URLs so scans route straight into the signed-in workflow.',
      },
      {
        question: 'Can QR scanning connect customers to service requests?',
        answer:
          'EquipQR supports QR-powered workflows so stakeholders scanning equipment can land on role-appropriate experiences based on your org configuration and team assignments.',
      },
      {
        question: 'Is EquipQR free for heavy equipment repair shops?',
        answer:
          'EquipQR ships with a free tier designed for repair-shop workloads — unlimited seats with sensible limits such as storage. Expand capacity when you outgrow starter quotas.',
      },
    ],
    howTo: {
      name: 'How QR code tracking works in EquipQR',
      description: 'QR codes connect your physical assets to EquipQR™ in seconds.',
      steps: [
        {
          name: 'Generate QR Labels',
          text:
            'From the equipment or inventory detail view, generate a QR code. Print labels at your preferred size and apply them to assets, bins, or parts.',
        },
        {
          name: 'Scan in the Field',
          text:
            "Use your phone camera or the in-app QR scanner to scan any label. You're redirected directly to that equipment's or item's page—no login required for public links when configured.",
        },
        {
          name: 'View Details & History',
          text:
            'Access specs, maintenance history, active work orders, and linked documents. Create or accept work orders from the same screen when signed in.',
        },
        {
          name: 'Streamline Operations',
          text:
            'Reduce errors and speed up check-ins, PMs, and parts lookup. QR codes work for equipment, inventory items, and custom workflows you build on top.',
        },
      ],
    },
  },
  '/features/work-order-management': {
    path: '/features/work-order-management',
    pageTitle: 'Work Order Management Software for Heavy Equipment Repair',
    description:
      'Create, assign, and complete repair-shop work orders with PM templates, parts, photos, and statuses built for field crews.',
    breadcrumbLabel: 'Work Orders',
    heroTitle: 'Work Order Management Software for Heavy Equipment Repair',
    heroDescription:
      'Create, assign, and track work orders with intelligent workflows. Monitor progress and ensure nothing falls through the cracks—from request to completion.',
    faq: [
      {
        question: 'Can work orders include preventive maintenance checklists?',
        answer:
          'Yes. Attach PM templates so technicians complete inspections consistently while supervisors monitor overdue items from dashboards.',
      },
      {
        question: 'How does QuickBooks export relate to work orders?',
        answer:
          'Completed work orders can be exported as QuickBooks Online draft invoices when integrations are configured — summarized billing lines reduce duplicate entry.',
      },
      {
        question: 'Does EquipQR support team assignment?',
        answer:
          'Work orders can target teams or individual technicians with acceptance flows so dispatch stays accountable.',
      },
    ],
    howTo: {
      name: 'How work orders flow in EquipQR',
      description: 'Work orders tie equipment, teams, PM templates, and inventory into one workflow.',
      steps: [
        {
          name: 'Create a Work Order',
          text:
            'Link the work order to equipment, add a description, and optionally attach a PM template. Set priority, due date, and assign to a technician or team.',
        },
        {
          name: 'Assign & Accept',
          text:
            'Assignees receive notifications and can accept or decline. Once accepted, they see the full work order with PM checklist, parts, and equipment details.',
        },
        {
          name: 'Complete the Work',
          text:
            'Work through the checklist, log parts used, add notes or photos, and update status. Progress saves automatically so nothing is lost.',
        },
        {
          name: 'Close & Record',
          text:
            'Mark the work order complete. The PM record and service history are stored permanently on the equipment for compliance and future reference.',
        },
      ],
    },
  },
  '/features/quickbooks': {
    path: '/features/quickbooks',
    pageTitle: 'QuickBooks Work Order Invoice Export for Repair Shops',
    description:
      'Push completed jobs into QuickBooks Online as draft invoices with summarized Labor and Parts lines — fewer spreadsheets between shop floor and accounting.',
    breadcrumbLabel: 'QuickBooks',
    heroTitle: 'QuickBooks Work Order Invoice Export for Repair Shops',
    heroDescription:
      'Link QuickBooks Online, map teams to customers, and export completed work orders as draft invoices in one guided workflow.',
    faq: [
      {
        question: 'Which QuickBooks product does EquipQR integrate with?',
        answer:
          'EquipQR integrates with QuickBooks Online via Intuit OAuth. Connection status appears inside Organization Settings so admins know tokens remain healthy.',
      },
      {
        question: 'What appears on customer-facing invoice exports?',
        answer:
          'Exports summarize labor and parts per EquipQR billing conventions — operators finalize wording inside QuickBooks before sending invoices.',
      },
      {
        question: 'Can I reconnect QuickBooks if tokens expire?',
        answer:
          'Absolutely — revisit Organization Settings → Integrations to reconnect; mappings persist wherever EquipQR stores team-customer relationships.',
      },
    ],
    howTo: {
      name: 'How QuickBooks integration works',
      description: 'QuickBooks integration links work orders, teams, and customers to your accounting workflow.',
      steps: [
        {
          name: 'Connect QuickBooks',
          text:
            'In Organization Settings → Integrations, connect QuickBooks Online. Authorize via Intuit OAuth. Your org is linked to your QuickBooks company; connection status is shown in settings.',
        },
        {
          name: 'Map Teams to Customers',
          text:
            'For each team, map to a QuickBooks customer. Work orders for equipment on that team export to that customer’s draft invoices. Use the customer search to find and select the right QuickBooks customer.',
        },
        {
          name: 'Complete Work Orders',
          text:
            'Complete work orders as usual. Only work orders in “Completed” status can be exported. Ensure the equipment has a team and that team has a QuickBooks customer mapping.',
        },
        {
          name: 'Export to QuickBooks',
          text:
            'From the work order detail, use “Export to QuickBooks” to create a draft invoice. View export history, open the invoice in QuickBooks, and manage billing there. Re-export is blocked once an invoice exists.',
        },
      ],
    },
  },
  '/features/inventory': {
    path: '/features/inventory',
    pageTitle: 'Repair Shop Parts Inventory & Stock Alerts',
    description:
      'Track parts, receipts, issues, and low-stock alerts with audit trails linked to equipment compatibility rules and work orders.',
    breadcrumbLabel: 'Inventory',
    heroTitle: 'Repair Shop Parts Inventory & Stock Alerts',
    heroDescription:
      'Track parts and supplies with stock levels, low-stock alerts, and compatibility rules so technicians pull the right inventory on every job.',
    faq: [
      {
        question: 'Can inventory tie to equipment compatibility?',
        answer:
          'Yes — define compatibility links so preferred parts surface while technicians log consumption against work orders.',
      },
      {
        question: 'Do low-stock alerts notify teams?',
        answer:
          'EquipQR highlights low-stock thresholds inside dashboards so purchasers can reorder before jobs stall.',
      },
      {
        question: 'Is barcode or QR supported for inventory?',
        answer:
          'EquipQR treats QR labels as first-class identifiers across equipment and inventory bins so scanning speeds receiving and issuing.',
      },
    ],
    howTo: {
      name: 'How inventory management works',
      description: 'Inventory connects receipts, issues, and alerts with equipment-aware workflows.',
      steps: [
        {
          name: 'Add Inventory Items',
          text:
            'Create items with part numbers, descriptions, and optional min/max quantities. Organize with categories or custom fields to match your catalog structure.',
        },
        {
          name: 'Record Transactions',
          text:
            'Log receipts when stock arrives, issues when parts are used, and adjustments for counts or corrections. Every change is tracked with timestamp and user.',
        },
        {
          name: 'Link to Equipment',
          text:
            'Define compatibility rules so the right parts show up for each equipment type. Use Part Lookup and alternates when creating work orders to pull from inventory quickly.',
        },
        {
          name: 'Stay Ahead of Stockouts',
          text:
            'Rely on low-stock alerts to reorder before you run out. View dashboards and reports to analyze usage patterns and optimize replenishment.',
        },
      ],
    },
  },
  '/features/part-lookup-alternates': {
    path: '/features/part-lookup-alternates',
    pageTitle: 'Part Lookup & Alternate Groups for Equipment Shops',
    description:
      'Search OEM and aftermarket parts, compare alternates, and pull substitutes directly into work orders when preferred stock runs dry.',
    breadcrumbLabel: 'Part Lookup',
    heroTitle: 'Part Lookup & Alternate Groups for Equipment Shops',
    heroDescription:
      'Find parts fast, compare alternates, and keep technicians productive when preferred SKUs are unavailable.',
    faq: [
      {
        question: 'How does Part Lookup integrate with inventory?',
        answer:
          'Lookup surfaces live stock counts alongside alternate groups so planners see availability before issuing parts to a technician.',
      },
      {
        question: 'Can shops maintain alternate relationships?',
        answer:
          'Yes — alternate groups capture OEM-to-aftermarket mappings with governance over preferred picks.',
      },
      {
        question: 'Does lookup support partial keyword search?',
        answer:
          'Technicians can begin typing descriptions or numbers and narrow results with filters tailored to equipment compatibility.',
      },
    ],
    howTo: {
      name: 'How part lookup works',
      description:
        'Part Lookup and alternates integrate with Inventory Management and work orders for a seamless lookup-to-use workflow.',
      steps: [
        {
          name: 'Search by Part Number',
          text:
            'Enter a part number, description, or keyword in Part Lookup. Results include matching inventory items, alternate groups, and cross-references. Filter by availability or equipment compatibility as needed.',
        },
        {
          name: 'View Alternates & Stock',
          text:
            'Open any part to see its alternate group and stock levels. Compare availability and cost across preferred and alternate options. Use what’s in stock or plan reorders accordingly.',
        },
        {
          name: 'Use in Work Orders',
          text:
            'When adding parts to a work order, search from Part Lookup or pick from equipment-linked inventory. Select an alternate if the primary is out of stock—consumption and history stay accurate.',
        },
        {
          name: 'Manage Alternate Groups',
          text:
            'Create and maintain alternate groups in the app. Add or remove equivalents, set preferred parts, and keep cross-references up to date. Part Lookup always reflects your latest data.',
        },
      ],
    },
  },
  '/features/pm-templates': {
    path: '/features/pm-templates',
    pageTitle: 'Heavy Equipment PM Templates & Inspection Checklists',
    description:
      'Ship structured PM templates for forklifts, excavators, lifts, trailers, and more — attach them to work orders for consistent inspections.',
    breadcrumbLabel: 'PM Templates',
    heroTitle: 'Heavy Equipment PM Templates & Inspection Checklists',
    heroDescription:
      'Standardize preventative maintenance across your fleet with pre-built checklists for common equipment types, or create custom templates tailored to your specific needs.',
    faq: [
      {
        question: 'Which equipment templates ship out of the box?',
        answer:
          'EquipQR includes heavy-equipment-friendly templates such as forklifts, excavators, scissor lifts, skid steers, trailers, and compressors — each organized into inspection sections.',
      },
      {
        question: 'Can templates evolve over time?',
        answer:
          'Org admins can clone, refine, and retire templates while preserving historical PM records on closed work orders.',
      },
      {
        question: 'Do PM templates enforce photo evidence?',
        answer:
          'Operators attach photos per checklist policy using existing EquipQR media workflows tied to work orders.',
      },
    ],
    howTo: {
      name: 'How PM templates attach to work orders',
      description: 'PM Templates integrate seamlessly with work orders for a streamlined maintenance workflow.',
      steps: [
        {
          name: 'Create Work Order',
          text:
            'When creating a new work order for preventative maintenance, select a PM template from your available templates. The template is automatically attached to the work order.',
        },
        {
          name: 'Complete Checklist',
          text:
            'Work through the checklist items organized by section. Mark items as OK, flag issues that need attention, or add notes for specific items. Use "Set All OK" to quickly mark completed sections.',
        },
        {
          name: 'Save Progress',
          text:
            'Your checklist progress is saved automatically. Come back later to continue where you left off, or complete the inspection in one session. All data is preserved until the work order is completed.',
        },
        {
          name: 'Permanent Record',
          text:
            'When the work order is completed, the PM checklist becomes a permanent record. Access the full inspection details anytime from the work order history or equipment service records.',
        },
      ],
    },
  },
  '/features/google-workspace': {
    path: '/features/google-workspace',
    pageTitle: 'Google Workspace SSO & Directory Sync for EquipQR',
    description:
      'Let technicians sign in with Google Workspace, sync directory users, and onboard shops without juggling separate passwords.',
    breadcrumbLabel: 'Google Workspace',
    heroTitle: 'Google Workspace SSO & Directory Sync for EquipQR',
    heroDescription:
      'Import users from your directory. Sign in with existing Google accounts.',
    faq: [
      {
        question: 'Does EquipQR replace Google MFA?',
        answer:
          'Google Authentication policies still apply — EquipQR inherits whatever MFA posture Workspace requires.',
      },
      {
        question: 'Can admins limit imported roles?',
        answer:
          'During import, admins map Workspace users to EquipQR organization roles before invitations activate.',
      },
      {
        question: 'Will directory sync pick up new hires?',
        answer:
          'Re-sync operations refresh membership lists so staffing changes propagate without manual CSV juggling.',
      },
    ],
    howTo: {
      name: 'How Google Workspace onboarding works',
      description: 'Google Workspace integration connects your directory to EquipQR™ in a few steps.',
      steps: [
        {
          name: 'Connect Google Workspace',
          text:
            'In Organization Settings → Integrations, connect your Google Workspace. Authorize EquipQR™ to access your organization’s directory. Your domain is linked to your EquipQR™ org.',
        },
        {
          name: 'Sync Directory',
          text:
            'Sync users from your Google directory. The list populates with everyone in your Workspace. Re-sync anytime to reflect new hires or departures.',
        },
        {
          name: 'Import Members',
          text:
            'Open “Import from Google Workspace” and select which users to add. Assign roles (admin, member, viewer). Selected users show as pending until they sign in with Google.',
        },
        {
          name: 'Sign In & Access',
          text:
            'Invited users sign in with their Google account. Once authenticated, they’re added to the organization and can access EquipQR™ based on their role. No manual invite emails required.',
        },
      ],
    },
  },
  '/features/team-collaboration': {
    path: '/features/team-collaboration',
    pageTitle: 'Team Roles & Collaboration for Equipment Organizations',
    description:
      'Blend organization roles with Manager, Technician, Requestor, and Viewer team roles so every stakeholder sees the right equipment and work orders.',
    breadcrumbLabel: 'Teams & Roles',
    heroTitle: 'Team Roles & Collaboration for Equipment Organizations',
    heroDescription:
      'Org and team roles control who sees what. Every action is attributed.',
    faq: [
      {
        question: 'What is the Requestor role?',
        answer:
          'Requestors are trusted customer-facing teammates who can initiate work from QR-enabled intake flows without receiving full technician privileges.',
      },
      {
        question: 'Can teams isolate equipment?',
        answer:
          'Yes — assign equipment and work-order scopes per team so regional crews only interact with their fleet.',
      },
      {
        question: 'Are audit logs available?',
        answer:
          'Sensitive actions remain attributable via EquipQR audit surfaces accessible to administrators.',
      },
    ],
    howTo: {
      name: 'How teams collaborate in EquipQR',
      description: 'Teams connect people, equipment, and work orders in one place.',
      steps: [
        {
          name: 'Create Teams',
          text:
            'Create teams that match your structure—by location, trade, or project. Add members and assign roles. Each team can have its own equipment and work order scope.',
        },
        {
          name: 'Assign Equipment & Work',
          text:
            'Link equipment to teams so members see only relevant assets. Assign work orders to teams or individuals. Use filters and dashboards to view workload by team.',
        },
        {
          name: 'Collaborate in Context',
          text:
            'Team members access equipment, work orders, and PMs from their team view. Admins manage members, settings, and visibility. Viewers get read-only access where configured.',
        },
        {
          name: 'Track & Rebalance',
          text:
            'Monitor completion rates, overdue work, and assignee load. Reassign work or adjust team scope as needed. Use fleet efficiency and dashboard metrics to optimize allocation.',
        },
      ],
    },
  },
  '/features/fleet-visualization': {
    path: '/features/fleet-visualization',
    pageTitle: 'Fleet Map & Last-Known Location for Heavy Equipment',
    description:
      'Plot equipment using last-known addresses or coordinates, filter by team, and combine map insights with utilization dashboards.',
    breadcrumbLabel: 'Fleet Map',
    heroTitle: 'Fleet Map & Last-Known Location for Heavy Equipment',
    heroDescription:
      "See every machine's last confirmed location on an interactive map.",
    faq: [
      {
        question: 'Does EquipQR require GPS hardware?',
        answer:
          'No dedicated GPS puck is required — shops capture addresses or coordinates already recorded during dispatch.',
      },
      {
        question: 'Can maps filter by overdue PM?',
        answer:
          'Teams combine fleet overlays with work-order filters to prioritize nearby machines needing service.',
      },
      {
        question: 'How often should locations update?',
        answer:
          'Best practice is updating whenever equipment moves job sites so routing math stays trustworthy.',
      },
    ],
    howTo: {
      name: 'How fleet visualization works',
      description: 'The fleet map brings your equipment locations and status together in one view.',
      steps: [
        {
          name: 'Set Equipment Locations',
          text:
            'Set the last confirmed location for each piece of equipment — address, job site, or coordinates. Update it when assets move so the map reflects where they were last seen.',
        },
        {
          name: 'View the Fleet Map',
          text:
            'Open the Fleet Map to see all equipment with locations on an interactive map. Pan, zoom, and filter by team, status, or type. Click markers to open equipment details.',
        },
        {
          name: 'Plan Routes & Dispatch',
          text:
            'Use the map to identify equipment with due PMs or open work orders. Group by location to plan technician routes and reduce travel time.',
        },
        {
          name: 'Analyze by Geography',
          text:
            'Combine map view with fleet efficiency and utilization. Spot patterns by region, optimize asset placement, and align maintenance capacity with demand.',
        },
      ],
    },
  },
  '/features/customer-crm': {
    path: '/features/customer-crm',
    pageTitle: 'Customer CRM Linked to Equipment Service History',
    description:
      'Keep owners, locations, and contacts aligned with each asset so invoices and service narratives stay tied to the right customer.',
    breadcrumbLabel: 'Customer CRM',
    heroTitle: 'Customer CRM Linked to Equipment Service History',
    heroDescription:
      'Link equipment to customers. Permanent service history per client asset.',
    faq: [
      {
        question: 'Can one customer own many assets?',
        answer:
          'Yes — attach unlimited equipment records while preserving historical PM and work-order timelines.',
      },
      {
        question: 'Does CRM integrate with QuickBooks customers?',
        answer:
          'Team-to-customer mappings help invoice exports land on the correct QuickBooks profile.',
      },
      {
        question: 'Who can edit customer records?',
        answer:
          'Organization administrators control CRUD permissions while technicians consume read-only context in the field.',
      },
    ],
    howTo: {
      name: 'How Customer CRM works',
      description: 'Customer CRM connects clients, equipment, and service history in one place.',
      steps: [
        {
          name: 'Create Customers',
          text:
            'Add customer records with name, contact info, and any custom fields. Organize clients by type or segment as needed.',
        },
        {
          name: 'Link Equipment',
          text:
            'Assign equipment to customers. Each asset is tied to an owner, so you can filter and report by client. Equipment retains its full service history.',
        },
        {
          name: 'Track Service',
          text:
            'Work orders and PMs are completed as usual. All activity is recorded on the equipment and, by extension, visible in the context of the owning customer.',
        },
        {
          name: 'Report by Customer',
          text:
            'Filter work orders, equipment, and reports by customer. Use service history for warranty claims, audits, and client-specific maintenance summaries.',
        },
      ],
    },
  },
  '/features/mobile-first-design': {
    path: '/features/mobile-first-design',
    pageTitle: 'Mobile CMMS Experience for Field Technicians',
    description:
      'Responsive layouts, offline-friendly workflows, and touch-first interactions keep crews productive on phones and tablets.',
    breadcrumbLabel: 'Mobile First',
    heroTitle: 'Mobile CMMS Experience for Field Technicians',
    heroDescription:
      'Touch-optimized for phones and tablets. Works offline in the field.',
    faq: [
      {
        question: 'Which workflows support offline mode?',
        answer:
          'Critical technician flows remain usable without connectivity and reconcile automatically once signal returns.',
      },
      {
        question: 'Are fonts and tap targets WCAG-minded?',
        answer:
          'EquipQR follows dark-theme contrast guidance with generous tap targets for gloved hands.',
      },
      {
        question: 'Can tablets run the same maps as desktops?',
        answer:
          'Fleet visualizations scale responsively so yard coordinators can mirror dispatcher boards.',
      },
    ],
    howTo: {
      name: 'How mobile-first workflows behave',
      description: 'EquipQR™ adapts to how you work—in the shop, in the field, or at a desk.',
      steps: [
        {
          name: 'Access Anywhere',
          text:
            'Log in from your phone, tablet, or computer. The same data and features are available—responsive layout ensures a good experience on any screen size.',
        },
        {
          name: 'Work Offline When Needed',
          text:
            'In low-signal areas, continue viewing equipment and work orders, and complete PM checklists. Changes sync automatically when you’re back online so nothing is lost.',
        },
        {
          name: 'Use Touch-Optimized Flows',
          text:
            'Scan QR codes, fill forms, complete checklists, and add parts from your phone. Large tap targets and simple navigation keep field use quick and error-free.',
        },
        {
          name: 'Switch Devices Seamlessly',
          text:
            'Start on a phone in the field and pick up on a tablet or desktop later. Your account, org, and data stay in sync across all devices.',
        },
      ],
    },
  },
};

export function getFeatureSeoByPath(pathname: string): FeatureSeoEntry | undefined {
  return FEATURE_SEO_BY_PATH[pathname];
}
