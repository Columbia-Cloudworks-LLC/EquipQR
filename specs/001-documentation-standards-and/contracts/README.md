# Contracts: Documentation Validator Schemas

This directory contains TypeScript/Zod schemas and contract definitions for the Documentation Standards and Quality Assurance System.

## Schema Files

### Configuration Schemas

- **`validation-config-schema.ts`** - Validation configuration structure
  - Defines `.doc-validator/config.json` schema
  - Rule enablement and severity overrides
  - Rate limiting configuration
  - Path exclusions

- **`exemptions-schema.ts`** - Link exemptions configuration
  - Defines `.doc-validator/exemptions.json` schema
  - Exempted URLs and domains
  - Exemption reasons (documentation)

### Data Schemas

- **`documentation-file-schema.ts`** - Documentation file metadata
  - Frontmatter validation
  - Document type and status enums
  - Derived properties (isWorkInProgress, requiresFullValidation)

- **`glossary-schema.ts`** - Glossary structure (TypeScript)
  - Defines `.doc-validator/glossary.yaml` schema (TypeScript version)
  - Term definitions with synonyms and deprecated terms
  - Validation rules (uniqueness, no conflicts)

- **`glossary-schema.yaml`** - Glossary structure (YAML reference)
  - Human-readable schema documentation
  - Example glossary entries

### Validation Schemas

- **`validation-result-schema.ts`** - Validation results and reports
  - ValidationResult structure (individual validation issue)
  - MetricsReport structure (aggregated quality metrics)
  - ValidationReport structure (complete report with all results)
  - TrendData structure (historical comparison)

## Usage

### Import Schemas in TypeScript

```typescript
import { ValidationConfigSchema, type ValidationConfig } from './contracts/validation-config-schema';
import { GlossarySchema, type Glossary } from './contracts/glossary-schema';
import { ValidationReportSchema, type ValidationReport } from './contracts/validation-result-schema';

// Validate configuration file
const config = ValidationConfigSchema.parse(rawConfig);

// Validate glossary
const glossary = GlossarySchema.parse(rawGlossary);

// Generate validation report
const report: ValidationReport = {
  metrics: { /* ... */ },
  results: [ /* ... */ ],
  validatedFiles: [ /* ... */ ],
  exemptedFiles: [ /* ... */ ],
};

// Validate report structure before exporting
const validatedReport = ValidationReportSchema.parse(report);
```

### Configuration File Locations

These schemas validate files in the repository:

- `.doc-validator/config.json` ← `validation-config-schema.ts`
- `.doc-validator/exemptions.json` ← `exemptions-schema.ts`
- `.doc-validator/glossary.yaml` ← `glossary-schema.ts`

### Report Artifact Schema

Validation reports exported as CI artifacts follow:

- `validation-result-schema.ts` → ValidationReport type

## Validation Rules

### Configuration Validation

- All rule IDs must follow format: `{category}-{number}-{short-name}`
- Severity overrides must be one of: `critical`, `high`, `medium`, `low`
- Rate limit delays must be >= 100ms
- Excluded paths support glob patterns

### Glossary Validation

- Term names must be unique (case-insensitive)
- Synonyms must not conflict with other canonical terms
- Deprecated terms must not appear as canonical terms elsewhere
- Definitions cannot be empty

### Report Validation

- Quality scores must be 0-100
- Issue counts must be non-negative
- Timestamps must be valid ISO 8601 datetime strings
- File paths must be relative (not absolute)

## Schema Versioning

All schemas follow semantic versioning:
- **Breaking changes**: Update major version
- **New optional fields**: Update minor version
- **Documentation/clarifications**: Update patch version

Current version: **1.0.0**

## Examples

See individual schema files for detailed examples of:
- Configuration file structure
- Glossary YAML format
- Validation report JSON output
- Metrics report structure

## Related Documentation

- [data-model.md](../data-model.md) - Complete entity definitions
- [quickstart.md](../quickstart.md) - User guide for configuration
- [research.md](../research.md) - Technology choices and rationale

