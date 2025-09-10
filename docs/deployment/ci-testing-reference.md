# CI Testing Reference Guide

## Overview

This document outlines the testing strategy and CI configuration for EquipQR to ensure reliable, maintainable test coverage with minimal noise.

## Coverage Strategy

### Scope
- **Target**: Core application components, hooks, and services
- **Exclude**: Landing pages, billing UI, layout components, and infrastructure code
- **Approach**: Test-driven coverage (only files touched by tests)

### Configuration
```typescript
// vitest.config.ts
coverage: {
  all: false, // Only include files touched by tests
  thresholds: {
    global: {
      lines: 70,
      branches: 70,
      functions: 70,
      statements: 70
    }
  }
}
```

### Excluded Components
- **Landing pages** (`src/components/landing/**`) - Marketing/public content
- **Billing UI** (`src/components/billing/**`) - Third-party integration UI
- **Layout** (`src/components/layout/**`) - Static layout components
- **Infrastructure** (`src/components/performance/**`, `src/components/security/**`) - System-level components

## Test Quality Standards

### Error Handling
- All expected error scenarios should be tested
- Console error/warning noise should be suppressed for expected test errors
- Use descriptive error messages in tests

### Accessibility
- All dialog components must include `DialogDescription` for accessibility
- Interactive components should have proper ARIA labels
- Focus management should be tested where relevant

### Mock Patterns

#### Supabase Mocking
Use centralized mock utilities:
```typescript
import { createMockSupabaseClient } from '@/test/utils/mock-supabase';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient(),
}));
```

#### Context Mocking
Use consistent provider mocks:
```typescript
import { MockSessionProvider } from '@/test/utils/mock-providers';
```

## CI Pipeline Requirements

### Test Execution
- All tests must pass
- Coverage thresholds must be met (70% minimum)
- No accessibility warnings in CI output
- Minimal console noise from expected error paths

### Quality Gates
1. **Test Coverage**: ≥70% for lines, branches, functions, statements
2. **Accessibility**: No missing DialogDescription warnings
3. **Console Cleanliness**: Expected error messages suppressed
4. **Build Success**: No TypeScript errors
5. **JS Bundle Size (Gzipped)**: Every `dist/assets/*.js` must be ≤ 500KB

## Best Practices

### Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Test both success and error scenarios
- Mock external dependencies consistently

### Performance
- Use `all: false` in coverage to avoid scanning untested files
- Parallel test execution where possible
- Efficient mock setup with beforeEach/afterEach

### Maintenance
- Regular review of excluded components
- Update mock patterns as APIs evolve
- Keep test utilities DRY and reusable

## Database Migration Testing

### Migration Validation
While the main CI pipeline focuses on code quality, it's important to validate database migrations separately:

```bash
# Local migration testing
supabase db reset  # Test complete migration chain
supabase db push   # Apply pending migrations
npm run test       # Ensure tests pass with new schema
```

### Migration Requirements
- All migration files must follow naming convention: `YYYYMMDDHHMMSS_name.sql`
- Baseline tables (work_orders, equipment, organizations) must exist early in migration sequence
- Use idempotent operations (`IF NOT EXISTS`, `IF NOT FOUND`)
- Enable RLS on all user data tables

### Optional CI Enhancement
Add to `.github/workflows/ci.yml` for migration testing:
```yaml
  migration-test:
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.modified, 'supabase/migrations/')
    steps:
      - uses: actions/checkout@v3
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
      - name: Test migration chain
        run: |
          supabase start
          supabase db reset
          npm run test
```

## Troubleshooting

### Common Issues
1. **Coverage Below Threshold**: Add tests for core components or exclude non-app code
2. **Accessibility Warnings**: Add DialogDescription to all DialogContent components  
3. **Console Noise**: Update error message filters in test setup
4. **Mock Failures**: Ensure consistent use of centralized mock utilities
5. **Migration Failures**: Check naming conventions and baseline table existence

### Debug Commands
```bash
# Run tests with coverage
npm run test:coverage

# Run specific test file
npx vitest run src/path/to/test.tsx

# Debug test in watch mode
npx vitest --reporter=verbose

# Test database migrations locally
supabase db reset && npm run test
```

This configuration ensures reliable CI execution while maintaining focus on testing core application functionality.