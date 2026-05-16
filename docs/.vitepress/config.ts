import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "EquipQR Documentation",
  description:
    "Technical guides, operations runbooks, and references for the EquipQR fleet equipment management platform.",
  lang: "en-US",
  lastUpdated: true,
  cleanUrls: true,
  srcDir: ".",
  sitemap: {
    hostname: "https://equipqr.info",
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
        "https://github.com/Columbia-Cloudworks-LLC/EquipQR/edit/preview/docs/:path",
      text: "Edit this page on GitHub",
    },

    nav: [
      { text: "Home", link: "/" },
      { text: "Getting started", link: "/getting-started/developer-onboarding" },
      { text: "Technical", link: "/technical/setup" },
      { text: "Guides", link: "/guides/workflows" },
      { text: "Operations", link: "/ops/deployment" },
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

      "/ops/": [
        {
          text: "Operations",
          items: [
            { text: "Deployment", link: "/ops/deployment" },
            { text: "CI/CD pipeline", link: "/ops/ci-cd-pipeline" },
            { text: "Migrations", link: "/ops/migrations" },
            {
              text: "Migration rules (quick ref)",
              link: "/ops/migration-rules-quick-reference",
            },
            {
              text: "Local Supabase",
              link: "/ops/local-supabase-development",
            },
            { text: "Disaster recovery", link: "/ops/disaster-recovery" },
            { text: "Observability", link: "/ops/observability" },
            {
              text: "Better Stack monitoring",
              link: "/ops/better-stack-monitoring",
            },
            { text: "Supabase branching", link: "/ops/supabase-branching" },
            {
              text: "Supabase branch secrets",
              link: "/ops/supabase-branch-secrets",
            },
            { text: "Cloud admin access", link: "/ops/cloud-admin-access" },
            {
              text: "Access control policy",
              link: "/ops/access-control-policy",
            },
            { text: "DSR compliance runbook", link: "/ops/dsr-compliance-runbook" },
          ],
        },
        {
          text: "Workshop",
          collapsed: true,
          items: [
            {
              text: "AI model comparison report (April 2026)",
              link: "/ops/ci-cd-workshop/AI Model Comparison Report  28 Models Across 6 Families (April 2026)",
            },
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
