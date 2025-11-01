## ESLint Warning Catalog (2025-10-31)

Source: `npm run lint` (tsconfig + eslint.config.js ruleset)

### Console Usage (`no-console`)
- `src/components/auth/ProtectedRoute.tsx`
- `src/components/equipment/EquipmentDetailsTab.tsx`
- `src/components/equipment/InlineEditField.tsx`
- `src/components/equipment/WorkingHoursTimelineModal.tsx`
- `src/components/fleet-map/MapView.tsx`
- `src/components/qr/QRRedirectHandler.tsx`
- `src/components/work-orders/*` (multiple files incl. `MobileWorkOrderCard.tsx`, `PMChecklistComponent.tsx`, `WorkOrderNotesSection.tsx`)
- `src/contexts/*` (AuthContext, SimpleOrganizationProvider, etc.)
- `src/hooks/*` (useAutoSave, useBrowserStorage, etc.)
- `src/utils/*` (dateFormatter, logger, sessionPersistence, invitationSystemValidation, etc.)
- `src/test/*` utilities and mocks (e.g., `src/test/setup.ts`)

### Unused Imports / Variables (`no-unused-vars`)
- Billing UI: `src/components/billing/*`
- Equipment UI: `src/components/equipment/*`
- Layout/UI primitives: `src/components/layout/AppSidebar.tsx`, `src/components/ui/*`
- Organization & Teams: `src/components/organization/*`, `src/components/teams/*`
- Hooks: `src/hooks/*` (useSmartAutoSave, useNotificationSettings, etc.)
- Pages: `src/pages/*`
- Tests & services: `src/tests/*`, `src/services/*`, `src/utils/*`, `src/types/*`

### Explicit `any` (`@typescript-eslint/no-explicit-any`)
- `src/components/equipment/MobileEquipmentFilters.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/scanner/QRScannerComponent.tsx`
- `src/components/ui/data-table.tsx`
- `src/components/work-orders/*` (cards, selectors, notes, filters)
- Hooks: `useCacheInvalidation.ts`, `useHistoricalWorkOrders.ts`, `useMemoryOptimization.ts`, `useOptimizedOrganizationMembers.ts`, `useOrganizationAdmins.ts`, `useQuickWorkOrderAssignment.ts`, etc.
- Utils/Tests: `src/utils/jsonDiff.ts`, `src/utils/pdfGenerator.ts`, `src/tests/billing/*`, `src/test/utils/*`

### Fast Refresh Rules (`react-refresh/only-export-components`)
- UI primitives exporting helpers: `src/components/ui/badge.tsx`, `button.tsx`, `form.tsx`, `navigation-menu.tsx`, `sidebar.tsx`, `sonner.tsx`, `toggle.tsx`
- Context providers mixing hooks/constants: `src/components/migration/DataMigrationProvider.tsx`
- Application contexts: `src/contexts/*` (`CacheManagerContext.tsx`, `OrganizationContext.tsx`, `SettingsContext.tsx`, `TeamContext.tsx`, `UserContext.tsx`)
- Test utilities: `src/test/utils/mock-providers.tsx`, `src/test/utils/test-utils.tsx`

### Hook Dependency Issues (`react-hooks/exhaustive-deps`)
- `src/components/auth/SignUpForm.tsx`
- `src/components/scanner/QRScannerComponent.tsx`

### Miscellaneous Rules
- Empty block: `src/hooks/useInvitationPerformanceMonitoring.ts` (`no-empty`)
- Useless catch: `src/hooks/useSmartAutoSave.ts` (`no-useless-catch`)
- Action-type-only usage: `src/hooks/use-toast.ts`
- Formatting helpers: `src/utils/basicDateFormatter.ts`
- Tests: unused params & `any` usage across `src/tests/*`

### Summary Counts (approximate)
- Console-related warnings: ~120
- Unused imports/vars: ~140
- Explicit `any`: ~55
- Fast Refresh export issues: 12 files
- Hook dependency warnings: 2 files
- Miscellaneous: remaining ~8

### Next Actions
1. Replace console usage with structured logging utilities or conditional wrappers.
2. Remove or repurpose unused symbols; ensure props align with usage.
3. Introduce domain-specific types to replace `any` (leverage `src/types/*`, service responses).
4. Extract non-component exports into adjacent modules for Fast Refresh compliance.
5. Fix hook dependency arrays via stable refs or dependency additions.
6. Clear remaining rule violations with minimal-behavior changes.

