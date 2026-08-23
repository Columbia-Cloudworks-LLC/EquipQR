/**
 * Live SEO copy for public marketing feature pages (/features/*).
 * HowTo JSON-LD steps come from visible Step[] on each feature page.
 */

export interface FeatureFaqItem {
  question: string;
  answer: string;
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
      'Scan equipment QR codes to open service history, work orders, and PM checklists from any phone. Generate printable QR labels for your fleet.',
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
          'EquipQR ships with a free tier designed for repair-shop workloads. Unlimited seats with sensible limits such as storage. Expand capacity when you outgrow starter quotas.',
      },
    ],
    howTo: {
      name: 'How QR code tracking works in EquipQR',
      description: 'Print labels, stick them on machines, and scan on the job.',
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
      'Create, assign, and complete repair-shop work orders with PM templates, parts, photos, and statuses built for field crews.',
    faq: [
      {
        question: 'Can work orders include preventive maintenance checklists?',
        answer:
          'Yes. Attach PM templates so technicians complete inspections consistently while supervisors monitor overdue items from dashboards.',
      },
      {
        question: 'How does QuickBooks export relate to work orders?',
        answer:
          'Completed work orders can be exported as QuickBooks Online draft invoices when integrations are configured. Summarized billing lines reduce duplicate entry.',
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
    },
  },
  '/features/quickbooks': {
    path: '/features/quickbooks',
    pageTitle: 'QuickBooks Work Order Invoice Export for Repair Shops',
    description:
      'Push completed jobs into QuickBooks Online as draft invoices with summarized Labor and Parts lines. Fewer spreadsheets between shop floor and accounting.',
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
          'Exports summarize labor and parts per EquipQR billing conventions. Operators finalize wording inside QuickBooks before sending invoices.',
      },
      {
        question: 'Can I reconnect QuickBooks if tokens expire?',
        answer:
          'Revisit Organization Settings, then Integrations, to reconnect. Mappings persist wherever EquipQR stores team-customer relationships.',
      },
    ],
    howTo: {
      name: 'How QuickBooks integration works',
      description: 'QuickBooks integration links work orders, teams, and customers to your accounting workflow.',
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
          'Yes. Define compatibility links so preferred parts surface while technicians log consumption against work orders.',
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
          'Yes. Alternate groups capture OEM-to-aftermarket mappings with governance over preferred picks.',
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
        'Part Lookup and alternates sit with Inventory Management and work orders so a search can become a used part on the job.',
    },
  },
  '/features/pm-templates': {
    path: '/features/pm-templates',
    pageTitle: 'Heavy Equipment PM Templates & Inspection Checklists',
    description:
      'Ship structured PM templates for forklifts, excavators, lifts, trailers, and more. Attach them to work orders for consistent inspections.',
    breadcrumbLabel: 'PM Templates',
    heroTitle: 'Heavy Equipment PM Templates & Inspection Checklists',
    heroDescription:
      'Ship structured PM templates for forklifts, excavators, lifts, trailers, and more. Attach them to work orders for consistent inspections.',
    faq: [
      {
        question: 'Which equipment templates ship out of the box?',
        answer:
          'EquipQR includes heavy-equipment-friendly templates such as forklifts, excavators, scissor lifts, skid steers, trailers, and compressors. Each is organized into inspection sections.',
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
      description: 'Attach a PM template to a work order and work the checklist on that job.',
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
          'Google Authentication policies still apply. EquipQR inherits whatever MFA posture Workspace requires.',
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
          'Yes. Assign equipment and work-order scopes per team so regional crews only interact with their fleet.',
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
          'No dedicated GPS puck is required. Shops capture addresses or coordinates already recorded during dispatch.',
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
          'Yes. Attach unlimited equipment records while preserving historical PM and work-order timelines.',
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
      description: 'EquipQR™ works in the shop, in the field, or at a desk.',
    },
  },
};

export function getFeatureSeoByPath(pathname: string): FeatureSeoEntry | undefined {
  return FEATURE_SEO_BY_PATH[pathname];
}
