import tailwindcssPostcss from "@tailwindcss/postcss";
import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "EquipQR Documentation",
  description:
    "Public technical guides, support how-tos, and references for the EquipQR fleet equipment management platform.",
  lang: "en-US",
  lastUpdated: true,
  cleanUrls: true,
  srcDir: ".",
  // Internal ops runbooks stay in-repo only (not published on equipqr.info).
  srcExclude: ["ops/**"],
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
    ["meta", { name: "theme-color", content: "#5f67ee" }],
    [
      "meta",
      {
        name: "keywords",
        content:
          "EquipQR,documentation,fleet management,work orders,CMMS,QR codes",
      },
    ],
  ],
  themeConfig: {
    siteTitle: "EquipQR Docs",

    search: {
      provider: "local",
    },

    editLink: {
      pattern:
        "https://github.com/Columbia-Cloudworks-LLC/EquipQR/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    nav: [
      { text: "Home", link: "/" },
      { text: "Getting started", link: "/getting-started/developer-onboarding" },
      { text: "Technical", link: "/technical/setup" },
      { text: "Guides", link: "/guides/workflows" },
      {
        text: "App",
        link: "https://equipqr.app",
      },
    ],

    sidebar: {
      "/getting-started/": [
        {
          text: "Getting started",
          items: [
            {
              text: "Developer onboarding",
              link: "/getting-started/developer-onboarding",
            },
            {
              text: "Development lifecycle",
              link: "/getting-started/development-lifecycle",
            },
            { text: "Troubleshooting", link: "/getting-started/troubleshooting" },
          ],
        },
      ],

      "/technical/": [
        {
          text: "Technical",
          items: [
            { text: "Setup", link: "/technical/setup" },
            { text: "Architecture", link: "/technical/architecture" },
            { text: "Standards", link: "/technical/standards" },
            {
              text: "Testing guidelines",
              link: "/technical/testing-guidelines",
            },
            { text: "API reference", link: "/technical/api-reference" },
            {
              text: "Inventory mobile QA",
              link: "/technical/inventory-detail-mobile-qa",
            },
          ],
        },
        {
          text: "Edge functions",
          collapsed: true,
          items: [
            { text: "Auth patterns", link: "/edge-functions/auth-patterns" },
            {
              text: "RLS audit checklist",
              link: "/edge-functions/rls-audit-checklist",
            },
          ],
        },
        {
          text: "Database",
          collapsed: true,
          items: [
            {
              text: "Migration squashing",
              link: "/database/migration-squashing",
            },
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

      "/features/": [
        {
          text: "Features",
          items: [{ text: "Bug reporting", link: "/features/bug-reporting" }],
        },
      ],

      "/maintenance/": [
        {
          text: "Maintenance",
          items: [
            { text: "Security fixes", link: "/maintenance/security-fixes" },
            {
              text: "Performance optimization",
              link: "/maintenance/performance-optimization",
            },
          ],
        },
      ],

      "/compliance/": [
        {
          text: "Compliance",
          items: [
            {
              text: "Texas audit questionnaire",
              link: "/compliance/texas-audit-questionnaire",
            },
            {
              text: "Compliance audit summary",
              link: "/compliance/compliance-audit-summary",
            },
          ],
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

      "/rca/": [
        {
          text: "Root cause analysis",
          items: [
            { text: "Overview", link: "/rca/" },
            {
              text: "2026-01-25 local Supabase",
              link: "/rca/RCA-2026-01-25-local-supabase-infrastructure-failures",
            },
            {
              text: "2025-11-28 PM template migration",
              link: "/rca/RCA-2025-11-28-pm-template-migration-rls-bypass-failure",
            },
          ],
        },
      ],

      "/archive/": [
        {
          text: "Archive",
          items: [
            { text: "Historical fixes", link: "/archive/historical-fixes/" },
          ],
        },
      ],

      "/audit-readiness/": [
        {
          text: "Audit readiness",
          items: [
            { text: "2026-04 research", link: "/audit-readiness/2026-04/RESEARCH" },
          ],
        },
      ],
    },

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/Columbia-Cloudworks-LLC/EquipQR",
      },
    ],

    footer: {
      message:
        "Released documentation for EquipQR™. Product app: equipqr.app",
      copyright: "Copyright © Columbia Cloudworks LLC",
    },
  },
});
