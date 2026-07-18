import js from "@eslint/js";
import globals from "globals";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

/**
 * Phase 1 timezone migration: remove paths here as call sites move to
 * src/utils/dateFormatter.ts primitives / useFormatTimestamp (#767).
 */
const timezoneFormattingLegacyAllowlist = [
  "src/components/audit/explorer/AuditExplorer.tsx",
  "src/components/audit/explorer/AuditLogTimeRangePicker.tsx",
  "src/components/audit/explorer/aggregate-bucket.ts",
  "src/components/common/ImageGallery.tsx",
  "src/components/common/InlineNoteComposer.tsx",
  "src/components/notifications/NotificationBell.tsx",
  "src/components/notifications/NotificationCenter.tsx",
  "src/components/session/SessionStatus.tsx",
  "src/components/settings/MFASettings.tsx",
  "src/components/ui/chart.tsx",
  "src/components/ui/datetime-picker.tsx",
  "src/features/dashboard/components/DashboardHighPriorityWorkOrdersCard.tsx",
  "src/features/dashboard/components/widgets/CostTrendWidget.tsx",
  "src/features/dsr/components/DsrCaseWorkspace.tsx",
  "src/features/dsr/components/DsrChecklistPanel.tsx",
  "src/features/dsr/components/DsrQueueRail.tsx",
  "src/features/equipment/components/EquipmentDetailsTab.tsx",

  "src/features/equipment/components/WorkingHoursTimelineModal.tsx",

  "src/features/fleet-map/components/EquipmentPanel.tsx",
  "src/features/fleet-map/components/MapView.tsx",
  "src/features/organization/components/InvitationManagement.tsx",
  "src/features/organization/components/MembersList.tsx",
  "src/features/organization/components/PendingTransferCard.tsx",
  "src/features/organization/components/UnifiedMembersList.tsx",
  "src/features/organization/components/WorkspaceMergeRequestsCard.tsx",
  "src/features/pm-templates/pages/PMTemplateView.tsx",
  "src/features/reports/components/ReportCharts.tsx",
  "src/features/reports/components/ReportFilters.tsx",
  "src/features/reports/pages/Reports.tsx",
  "src/features/teams/components/CustomerAccountCard.tsx",
  "src/features/teams/components/QuickBooksCustomerMapping.tsx",
  "src/features/teams/pages/TeamDetails.tsx",
  "src/features/teams/pages/Teams.tsx",
  "src/features/tickets/components/MyTickets.tsx",
  "src/features/tickets/components/TicketDetail.tsx",
  "src/features/work-orders/components/HistoricalWorkOrderBadge.tsx",

  "src/features/work-orders/components/WorkOrderAssigneeDisplay.tsx",
  "src/features/work-orders/components/WorkOrderDetailsMobile.tsx",
  "src/features/work-orders/components/WorkOrderEquipmentSelector.tsx",
  "src/features/work-orders/components/WorkOrderStatusManager.tsx",
  "src/features/work-orders/hooks/useWorkOrderFilters.ts",

  "src/hooks/useAuditLog.ts",
  "src/pages/AuditLog.tsx",
  "src/pages/InvitationAccept.tsx",
  "src/pages/Notifications.tsx",
  "src/pages/WorkspaceOnboarding.tsx",
  "src/utils/exportUtils.ts",

];

const timezoneLocaleMemberNames = [
  "toLocaleString",
  "toLocaleDateString",
  "toLocaleTimeString",
];

const timezoneLocaleCallSelectors = timezoneLocaleMemberNames.map((name) => ({
  selector: [
    `CallExpression[callee.type='MemberExpression'][callee.computed=false][callee.optional=false]`,
    `[callee.property.type='Identifier'][callee.property.name='${name}']`,
    `[callee.object.type='NewExpression'][callee.object.callee.type='Identifier'][callee.object.callee.name='Date']`,
  ].join(""),
  message: `Use dateFormatter / useFormatTimestamp instead of new Date(...).${name} (#767). Numeric grouping may use Number.prototype.toLocaleString.`,
}));

export default tseslint.config(
  {
    ignores: [
      "dist",
      "supabase/functions",
      "scripts",
      "coverage",
      "tmp",
      ".claude",
      "e2e",
      "playwright.config.ts",
      // VitePress build cache (generated, vendored deps) must not be linted.
      "docs/.vitepress/cache",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // eslint-plugin-react-hooks@7 merges React Compiler rules into `recommended`.
      // Keep classic hooks lint only until we opt into compiler rules project-wide.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "no-empty": "warn",
      "no-useless-catch": "warn",
      // Disallow console usage in src except errors; allow in Supabase edge functions via ignores above
      "no-console": [
        "warn",
        { allow: ["error"] }
      ],
    },
  },
  {
    files: ["src/**/*.tsx"],
    ignores: ["**/*.test.tsx"],
    plugins: {
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "**/*.test.ts",
      "**/*.test.tsx",
      ...timezoneFormattingLegacyAllowlist,
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...timezoneLocaleCallSelectors,
        {
          selector:
            "CallExpression[callee.type='Identifier'][callee.name='format'][arguments.0.type='NewExpression'][arguments.0.callee.type='Identifier'][arguments.0.callee.name='Date']",
          message:
            "Use dateFormatter primitives with the user's timezone instead of date-fns format(new Date(...), ...) (#767).",
        },
        {
          selector:
            "CallExpression[callee.type='Identifier'][callee.name='formatDate'][arguments.0.type='NewExpression'][arguments.0.callee.type='Identifier'][arguments.0.callee.name='Date'][arguments.1.type='Literal']",
          message:
            "Use dateFormatter.formatDate / formatDateTime with UserSettings instead of date-fns formatDate(new Date(...), pattern) (#767).",
        },
      ],
    },
  },
);
