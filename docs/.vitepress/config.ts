import tailwindcssPostcss from "@tailwindcss/postcss";
import { defineConfig } from "vitepress";
import type { DefaultTheme } from "vitepress";

const supportSidebarArticles: Record<string, { text: string; link: string }[]> =
  {
    "start-here": [
      { text: "Welcome to EquipQR", link: "/support/start-here/welcome-to-equipqr" },
      { text: "Navigation tour", link: "/support/start-here/navigation-tour" },
      { text: "Invite your team", link: "/support/start-here/invite-team-members" },
      { text: "Role overview", link: "/support/start-here/role-overview" },
    ],
    "technician-field-work": [
      {
        text: "Scan equipment QR",
        link: "/support/technician-field-work/scan-equipment-qr",
      },
      {
        text: "Create work order from equipment",
        link: "/support/technician-field-work/create-work-order-from-equipment",
      },
      {
        text: "Update work order status",
        link: "/support/technician-field-work/update-work-order-status",
      },
      {
        text: "Add notes and photos",
        link: "/support/technician-field-work/add-notes-and-photos",
      },
      { text: "PM checklist", link: "/support/technician-field-work/pm-checklist" },
      {
        text: "Consume inventory on work order",
        link: "/support/technician-field-work/consume-inventory-on-wo",
      },
      {
        text: "Mobile quick actions",
        link: "/support/technician-field-work/mobile-quick-actions",
      },
    ],
    "work-orders": [
      {
        text: "Work order lifecycle",
        link: "/support/work-orders/work-order-lifecycle",
      },
      {
        text: "Manage PM template on work order",
        link: "/support/work-orders/manage-pm-template-on-work-order",
      },
      {
        text: "Triage submitted requests",
        link: "/support/work-orders/triage-submitted-requests",
      },
      { text: "Assign a work order", link: "/support/work-orders/assign-work-order" },
      { text: "Reports overview", link: "/support/work-orders/reports-overview" },
      {
        text: "Submit request as Requestor",
        link: "/support/work-orders/submit-request-as-requestor",
      },
    ],
    "equipment-qr": [
      { text: "Add equipment", link: "/support/equipment-qr/add-equipment" },
      { text: "Print equipment QR", link: "/support/equipment-qr/print-equipment-qr" },
      {
        text: "Set display image",
        link: "/support/equipment-qr/set-equipment-display-image",
      },
      { text: "Bulk edit equipment", link: "/support/equipment-qr/bulk-import-equipment" },
      { text: "Fleet map", link: "/support/equipment-qr/fleet-map-basics" },
      {
        text: "Location sources and maps",
        link: "/support/equipment-qr/location-sources-and-maps",
      },
    ],
    "inventory-parts": [
      { text: "Add inventory item", link: "/support/inventory-parts/add-inventory-item" },
      {
        text: "Storage locations",
        link: "/support/inventory-parts/inventory-storage-locations",
      },
      {
        text: "Adjust quantity",
        link: "/support/inventory-parts/adjust-inventory-quantity",
      },
      {
        text: "Parts Access",
        link: "/support/inventory-parts/parts-managers-setup",
      },
      {
        text: "Alternate part groups",
        link: "/support/inventory-parts/alternate-groups-setup",
      },
      {
        text: "Bulk edit inventory",
        link: "/support/inventory-parts/bulk-import-inventory",
      },
      { text: "Part lookup", link: "/support/inventory-parts/part-lookup-search" },
    ],
    "teams-roles": [
      {
        text: "Organization roles",
        link: "/support/teams-roles/organization-roles",
      },
      { text: "Team role matrix", link: "/support/teams-roles/team-role-matrix" },
      {
        text: "Example: Apex Repair",
        link: "/support/teams-roles/apex-example-hierarchy",
      },
      { text: "Add team members", link: "/support/teams-roles/add-team-member" },
      { text: "Dedicated team views", link: "/support/teams-roles/team-views" },
      {
        text: "Teams & roles FAQ",
        link: "/support/teams-roles/multi-team-questions",
      },
    ],
    administration: [
      {
        text: "Daily Operator Check-Ins",
        link: "/support/administration/operator-daily-check-ins",
      },
    ],
    "admin-integrations": [
      {
        text: "Organization settings",
        link: "/support/admin-integrations/organization-settings",
      },
      {
        text: "Connect QuickBooks",
        link: "/support/admin-integrations/connect-quickbooks",
      },
      {
        text: "Map teams to QB customers",
        link: "/support/admin-integrations/map-teams-to-qb-customers",
      },
      {
        text: "Export work order to QB",
        link: "/support/admin-integrations/export-work-order-to-qb",
      },
      {
        text: "Connect Google Workspace",
        link: "/support/admin-integrations/google-workspace-connect",
      },
    ],
    "privacy-support": [
      { text: "Report an issue (in app)", link: "/support/privacy-support/report-an-issue" },
      {
        text: "Track reported issues (in app)",
        link: "/support/privacy-support/track-my-tickets",
      },
      {
        text: "Submit privacy request",
        link: "/support/privacy-support/submit-privacy-request",
      },
      { text: "Audit log", link: "/support/privacy-support/audit-log-basics" },
      { text: "DSR cockpit", link: "/support/privacy-support/dsr-cockpit-overview" },
      { text: "System status", link: "/support/privacy-support/system-status" },
    ],
  };

function supportSidebar(): DefaultTheme.SidebarItem[] {
  const categories: { id: string; label: string }[] = [
    { id: "start-here", label: "Start Here" },
    { id: "technician-field-work", label: "Technician Field Work" },
    { id: "work-orders", label: "Work Orders" },
    { id: "equipment-qr", label: "Equipment & QR Codes" },
    { id: "inventory-parts", label: "Inventory & Parts" },
    { id: "teams-roles", label: "Teams & Roles" },
    { id: "administration", label: "Administration" },
    { id: "admin-integrations", label: "Admin & Integrations" },
    { id: "privacy-support", label: "Privacy & Support" },
  ];

  return categories.map(({ id, label }) => ({
    text: label,
    collapsed: id !== "start-here",
    items: [
      { text: "Overview", link: `/support/${id}/` },
      ...supportSidebarArticles[id],
    ],
  }));
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "EquipQR Docs",
  description:
    "User guides, workflows, and how-tos for EquipQR fleet equipment management — technicians, managers, admins, and equipment owners.",
  lang: "en-US",
  // Mission Control is dark-only — force dark and hide the ineffective light toggle.
  appearance: "force-dark",
  lastUpdated: true,
  cleanUrls: true,
  srcDir: ".",
  srcExclude: [
    "ops/**",
    "getting-started/**",
    "technical/**",
    "edge-functions/**",
    "database/**",
    "maintenance/**",
    "compliance/**",
    "rca/**",
    "archive/**",
    "audit-readiness/**",
    "features/**",
    "README.md",
  ],
  sitemap: {
    hostname: "https://equipqr.info",
  },
  vite: {
    css: {
      postcss: {
        plugins: [tailwindcssPostcss()],
      },
    },
  },
  head: [
    ["link", { rel: "icon", href: "/favicon.ico", sizes: "32x32" }],
    ["link", { rel: "icon", href: "/eqr-logo/icon.svg", type: "image/svg+xml" }],
    ["link", { rel: "apple-touch-icon", href: "/eqr-logo/icon.svg" }],
    ["meta", { name: "theme-color", content: "#B79CFF" }],
    [
      "meta",
      {
        name: "keywords",
        content:
          "EquipQR,docs,help center,support,fleet management,work orders,QR codes,CMMS",
      },
    ],
  ],
  themeConfig: {
    logo: { src: "/eqr-logo/icon.svg", alt: "EquipQR" },
    // Primary wordmark; CSS appends a secondary " Docs" label.
    siteTitle: "EquipQR",

    search: {
      provider: "local",
    },

    nav: [
      { text: "Home", link: "/" },
      { text: "Help Center", link: "/support/" },
      { text: "Permissions", link: "/guides/permissions" },
      { text: "PM Templates", link: "/pm-templates/" },
      {
        text: "Open App",
        link: "https://equipqr.app",
        target: "_blank",
        rel: "noopener noreferrer",
      },
    ],

    sidebar: {
      "/support/": [
        {
          text: "Help Center",
          link: "/support/",
        },
        ...supportSidebar(),
        {
          text: "More guides",
          collapsed: true,
          items: [
            { text: "Workflows", link: "/guides/workflows" },
            { text: "Image upload (overview)", link: "/how-to/image-upload/" },
            {
              text: "Technician image upload",
              link: "/how-to/image-upload/technician-image-upload-guide",
            },
            { text: "QuickBooks", link: "/integrations/quickbooks" },
          ],
        },
      ],

      "/guides/": [
        {
          text: "Guides",
          items: [
            { text: "Workflows", link: "/guides/workflows" },
            { text: "Permissions (RBAC)", link: "/guides/permissions" },
          ],
        },
      ],

      "/how-to/": [
        {
          text: "How-to",
          items: [
            { text: "Image upload (overview)", link: "/how-to/image-upload/" },
            {
              text: "Quick reference card",
              link: "/how-to/image-upload/quick-reference-card",
            },
            {
              text: "Technician image upload guide",
              link: "/how-to/image-upload/technician-image-upload-guide",
            },
          ],
        },
      ],

      "/integrations/": [
        {
          text: "Integrations",
          items: [{ text: "QuickBooks", link: "/integrations/quickbooks" }],
        },
      ],

      "/pm-templates/": [
        {
          text: "PM templates",
          items: [
            { text: "Overview", link: "/pm-templates/" },
            { text: "Compressor PM", link: "/pm-templates/compressor-pm-checklist" },
            { text: "Excavator PM", link: "/pm-templates/excavator-pm-checklist" },
            { text: "Forklift PM", link: "/pm-templates/forklift-pm-checklist" },
            {
              text: "Pull trailer PM",
              link: "/pm-templates/pull-trailer-pm-checklist",
            },
            {
              text: "Scissor lift PM",
              link: "/pm-templates/scissor-lift-pm-checklist",
            },
            { text: "Skid steer PM", link: "/pm-templates/skid-steer-pm-checklist" },
          ],
        },
      ],
    },

    footer: {
      message:
        "EquipQR Docs — product app at equipqr.app · status at status.equipqr.app",
      copyright: "Copyright © Columbia Cloudworks LLC",
    },
  },
});
