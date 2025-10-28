# Data Model: Documentation Standards and Quality Assurance System

**Date**: October 28, 2025  
**Purpose**: Define data structures, schemas, and relationships for the documentation validation system

## Overview

This document defines the core data entities used throughout the documentation validation system. All entities are implemented as TypeScript interfaces with Zod schemas for runtime validation.

---

## Core Entities

### 1. DocumentationFile

Represents a single documentation artifact in the repository.

**Attributes**:
- `path: string` - Relative path from repository root (e.g., `docs/architecture/database-schema.md`)
- `type: DocumentationType` - Classification of document (guide, reference, architecture, feature, deployment)
- `status: DocumentationStatus` - Current status extracted from YAML frontmatter
- `lastModified: Date` - Timestamp of last git commit touching this file
- `frontmatter: Record<string, unknown>` - Raw YAML frontmatter data
- `content: string` - Full markdown content
- `ast?: MarkdownAST` - Parsed Abstract Syntax Tree (optional, populated on demand)

**Enums**:
```typescript
enum DocumentationType {
  GUIDE = 'guide',           // How-to guides and tutorials
  REFERENCE = 'reference',   // API references, command references
  ARCHITECTURE = 'architecture', // System design documents
  FEATURE = 'feature',       // Feature specifications
  DEPLOYMENT = 'deployment', // Deployment and operations guides
  OTHER = 'other'           // Miscellaneous documentation
}

enum DocumentationStatus {
  DRAFT = 'draft',           // Work in progress, exempt from completeness checks
  WIP = 'wip',              // Alternative work-in-progress marker
  COMPLETE = 'complete',     // Full validation applies
  DEPRECATED = 'deprecated'  // Marked for archival
}
```

**Derived Attributes**:
- `isWorkInProgress: boolean` - True if status is DRAFT or WIP, or frontmatter has `wip: true`
- `requiresFullValidation: boolean` - False for WIP documents, true otherwise

**Validation Rules**:
- `path` must be relative, not absolute
- `type` automatically inferred from path if not specified in frontmatter
- `status` defaults to COMPLETE if not specified in frontmatter
- WIP documents skip completeness validation but still undergo syntax/structure checks

**TypeScript Interface**:
```typescript
interface DocumentationFile {
  path: string;
  type: DocumentationType;
  status: DocumentationStatus;
  lastModified: Date;
  frontmatter: Record<string, unknown>;
  content: string;
  ast?: MarkdownAST;
  
  // Derived properties
  isWorkInProgress: boolean;
  requiresFullValidation: boolean;
}
```

---

### 2. ValidationRule

Represents a specific quality check that can be applied to documentation.

**Attributes**:
- `id: string` - Unique rule identifier (e.g., `quality-001-internal-links`, `sync-002-schema`)
- `category: ValidationCategory` - Rule classification
- `name: string` - Human-readable rule name
- `description: string` - Detailed explanation of what the rule checks
- `severity: Severity` - Default severity level (can be overridden in config)
- `enabled: boolean` - Whether rule is active (from configuration)
- `appliesToTypes: DocumentationType[]` - Which document types this rule applies to

**Enums**:
```typescript
enum ValidationCategory {
  QUALITY = 'quality',           // Documentation quality (completeness, links, terminology)
  SYNC = 'sync',                // Code-documentation synchronization
  STRUCTURE = 'structure',       // Organization and naming conventions
  ACCESSIBILITY = 'accessibility' // Accessibility standards
}

enum Severity {
  CRITICAL = 'critical', // Breaks navigation or understanding (broken internal links, missing required sections)
  HIGH = 'high',        // Misleading information (code-doc sync issues)
  MEDIUM = 'medium',    // Reduces readability (formatting, structure violations)
  LOW = 'low'          // Style preferences (minor accessibility issues)
}
```

**Rule ID Convention**:
- Format: `{category}-{number}-{short-name}`
- Example: `quality-001-internal-links`, `sync-003-env-vars`, `structure-005-naming`
- Numbers are zero-padded to 3 digits for sorting

**TypeScript Interface**:
```typescript
interface ValidationRule {
  id: string;
  category: ValidationCategory;
  name: string;
  description: string;
  severity: Severity;
  enabled: boolean;
  appliesToTypes: DocumentationType[];
  
  // Method signature for validation function
  validate(file: DocumentationFile, context: ValidationContext): Promise<ValidationResult[]>;
}
```

---

### 3. ValidationResult

Represents the outcome of applying a validation rule to a documentation file.

**Attributes**:
- `ruleId: string` - Reference to ValidationRule.id
- `filePath: string` - Path to file where issue was found
- `line?: number` - Line number of issue (if applicable)
- `column?: number` - Column number of issue (if applicable)
- `severity: Severity` - Effective severity for this result (may differ from rule default)
- `message: string` - Human-readable description of the issue
- `suggestedFix?: string` - Actionable guidance for resolving the issue
- `context?: string` - Surrounding content for clarity (e.g., the problematic heading text)

**Status**:
- `status: 'pass' | 'fail'` - Whether the validation passed or failed

**TypeScript Interface**:
```typescript
interface ValidationResult {
  ruleId: string;
  filePath: string;
  line?: number;
  column?: number;
  severity: Severity;
  status: 'pass' | 'fail';
  message: string;
  suggestedFix?: string;
  context?: string;
}
```

**Example**:
```json
{
  "ruleId": "quality-001-internal-links",
  "filePath": "docs/features/equipment-management.md",
  "line": 42,
  "severity": "critical",
  "status": "fail",
  "message": "Broken internal link to 'database-schema.md' - file does not exist",
  "suggestedFix": "Update link to 'docs/architecture/database-schema.md' or remove reference",
  "context": "[Database Schema](database-schema.md)"
}
```

---

### 4. MetricsReport

Represents aggregated quality metrics for a validation run.

**Attributes**:
- `timestamp: Date` - When the validation was executed
- `validationMode: 'incremental' | 'full'` - Type of validation run
- `filesValidated: number` - Total files checked
- `totalIssues: number` - Total validation failures
- `issuesBySeverity: Record<Severity, number>` - Breakdown by severity
- `issuesByCategory: Record<ValidationCategory, number>` - Breakdown by category
- `qualityScore: number` - Overall score (0-100): `(passing rules / total applicable rules) * 100`
- `categoryScores: Record<ValidationCategory, number>` - Score per category
- `trendComparison?: TrendData` - Comparison to previous run (if available)

**TypeScript Interface**:
```typescript
interface MetricsReport {
  timestamp: Date;
  validationMode: 'incremental' | 'full';
  filesValidated: number;
  totalIssues: number;
  issuesBySeverity: Record<Severity, number>;
  issuesByCategory: Record<ValidationCategory, number>;
  qualityScore: number;
  categoryScores: Record<ValidationCategory, number>;
  trendComparison?: TrendData;
}

interface TrendData {
  previousScore: number;
  scoreDelta: number; // Positive = improvement
  previousTimestamp: Date;
  issuesDelta: number; // Negative = improvement
}
```

**Quality Score Calculation**:
```
qualityScore = (total applicable rules - failed rules) / total applicable rules * 100

Example:
- 100 rules apply to the validated files
- 10 rules failed
- Quality score = (100 - 10) / 100 * 100 = 90%
```

---

### 5. DeprecationEntry

Represents a deprecated feature that has been removed or is being phased out.

**Attributes**:
- `featureName: string` - Name of deprecated feature (e.g., "Billing System", "Old Equipment API")
- `removalDate: Date` - When the feature was removed
- `reason: string` - Why the feature was deprecated
- `migrationPath: string` - Guidance for users to migrate away from the feature
- `affectedFiles: string[]` - Documentation files that reference this feature (for tracking archival)
- `archiveLocation?: string` - Path where deprecated documentation was moved

**TypeScript Interface**:
```typescript
interface DeprecationEntry {
  featureName: string;
  removalDate: Date;
  reason: string;
  migrationPath: string;
  affectedFiles: string[];
  archiveLocation?: string;
}
```

**Consolidation**: All deprecation entries are stored in `docs/DEPRECATIONS.md` in a standardized format:

```markdown
## [Feature Name]

**Removed**: YYYY-MM-DD  
**Reason**: [Explanation]  
**Migration Path**: [Guidance]  
**Archived Documentation**: [Path]
```

---

### 6. GlossaryTerm

Represents a canonical term in the project's terminology glossary.

**Attributes**:
- `term: string` - The canonical term (e.g., "Equipment", "Work Order")
- `definition: string` - Clear definition of the term
- `category?: string` - Optional grouping (e.g., "Domain Model", "UI Component")
- `synonyms: string[]` - Approved alternative names (e.g., "Asset" for "Equipment")
- `deprecatedTerms: string[]` - Old terms that should be flagged (e.g., "Item" → "Equipment")
- `usage?: string` - Example usage or context

**TypeScript Interface**:
```typescript
interface GlossaryTerm {
  term: string;
  definition: string;
  category?: string;
  synonyms: string[];
  deprecatedTerms: string[];
  usage?: string;
}
```

**Glossary File Format** (`.doc-validator/glossary.yaml`):
```yaml
terms:
  - term: Equipment
    definition: Physical asset tracked in the system (machinery, tools, vehicles)
    category: Domain Model
    synonyms:
      - Asset
      - Item
    deprecatedTerms:
      - Machine
    usage: "Use 'Equipment' in documentation; 'Asset' is acceptable in financial contexts"
    
  - term: Work Order
    definition: Request for maintenance or repair work on equipment
    category: Domain Model
    synonyms:
      - Service Request
      - Maintenance Request
    deprecatedTerms:
      - Ticket
    usage: "Prefer 'Work Order' over 'Service Request' for consistency"
```

---

### 7. ExternalLink

Represents an outbound link to external documentation or resources.

**Attributes**:
- `url: string` - Full URL of the external link
- `domain: string` - Extracted domain for rate limiting (e.g., `github.com`, `supabase.com`)
- `sourceFile: string` - Documentation file containing the link
- `lastValidated: Date | null` - Timestamp of last successful validation
- `status: LinkStatus` - Current validation status
- `statusCode?: number` - HTTP status code from last validation attempt
- `exempted: boolean` - Whether this link is exempt from validation

**Enums**:
```typescript
enum LinkStatus {
  ACTIVE = 'active',         // Link is reachable (2xx status)
  BROKEN = 'broken',         // Link is unreachable (4xx, 5xx, DNS error)
  DEPRECATED = 'deprecated', // Link returns redirect or moved status (3xx)
  EXEMPTED = 'exempted',     // Link is in exemption list
  UNCHECKED = 'unchecked'    // Link has not been validated yet
}
```

**TypeScript Interface**:
```typescript
interface ExternalLink {
  url: string;
  domain: string;
  sourceFile: string;
  lastValidated: Date | null;
  status: LinkStatus;
  statusCode?: number;
  exempted: boolean;
}
```

**Exemption Configuration** (`.doc-validator/exemptions.json`):
```json
{
  "exemptedUrls": [
    "https://example.com/requires-auth",
    "https://internal.company.com/*"
  ],
  "exemptedDomains": [
    "localhost",
    "127.0.0.1"
  ]
}
```

---

### 8. ValidationContext

Provides contextual information needed during validation execution.

**Attributes**:
- `repositoryRoot: string` - Absolute path to repository root
- `changedFiles: string[]` - Files modified in current PR (for incremental validation)
- `allDocumentationFiles: DocumentationFile[]` - Complete list of all docs (for cross-file validation)
- `glossaryTerms: GlossaryTerm[]` - Loaded canonical terminology
- `externalLinkCache: Map<string, ExternalLink>` - Cache of previously validated external links
- `config: ValidationConfig` - Loaded configuration

**TypeScript Interface**:
```typescript
interface ValidationContext {
  repositoryRoot: string;
  changedFiles: string[];
  allDocumentationFiles: DocumentationFile[];
  glossaryTerms: GlossaryTerm[];
  externalLinkCache: Map<string, ExternalLink>;
  config: ValidationConfig;
}

interface ValidationConfig {
  rules: Record<string, RuleConfig>;
  incremental: boolean;
  externalLinkCacheDuration: number; // Hours
  rateLimits: {
    defaultDelayMs: number;
    perDomain: Record<string, number>; // Custom delays per domain
  };
}

interface RuleConfig {
  enabled: boolean;
  severity?: Severity; // Override default severity
}
```

---

## Validation Rule Categories

### Quality Rules (FR-001 to FR-006)

| Rule ID | Name | Description | Severity |
|---------|------|-------------|----------|
| `quality-001` | Internal Links | Validates that all internal markdown links resolve to existing files | Critical |
| `quality-002` | Required Sections | Checks for mandatory sections based on document type | Critical |
| `quality-003` | Code Examples | Verifies presence of code examples in API/guide documents | High |
| `quality-004` | External Links | Validates external links are reachable (with rate limiting) | Medium |
| `quality-005` | Terminology Consistency | Checks terms against canonical glossary | Medium |
| `quality-006` | Vague Language | Flags untestable language in requirement documents | Low |

### Sync Rules (FR-007 to FR-011)

| Rule ID | Name | Description | Severity |
|---------|------|-------------|----------|
| `sync-001` | Schema Sync | Detects schema changes (migrations) not reflected in docs | High |
| `sync-002` | Env Variable Sync | Validates documented env vars match env.example and codebase | High |
| `sync-003` | API Endpoint Sync | Checks documented endpoints match route definitions | High |
| `sync-004` | File Path Sync | Validates file references match actual paths | High |
| `sync-005` | Feature Flag Sync | Checks documented feature flags match config | High |

### Structure Rules (FR-017 to FR-021)

| Rule ID | Name | Description | Severity |
|---------|------|-------------|----------|
| `structure-001` | File Naming | Enforces kebab-case naming conventions | Medium |
| `structure-002` | Duplicate Content | Detects 3+ consecutive verbatim sentences across files | Medium |
| `structure-003` | Directory Purpose | Verifies subdirectories have purpose statements | Medium |
| `structure-004` | Media Organization | Checks media files are in appropriate subdirectories | Medium |
| `structure-005` | README Indexing | Validates subdirectories are indexed in main README | Medium |

### Accessibility Rules (FR-022 to FR-026)

| Rule ID | Name | Description | Severity |
|---------|------|-------------|----------|
| `accessibility-001` | Heading Hierarchy | Validates H1→H2→H3 without skipping levels | Medium |
| `accessibility-002` | Image Alt Text | Checks all images have descriptive alt text | Medium |
| `accessibility-003` | Code Syntax Highlighting | Verifies code blocks have language tags | Low |
| `accessibility-004` | Formatting Consistency | Checks consistent formatting for paths/commands | Low |
| `accessibility-005` | Table Structure | Validates table headers and structure | Medium |

---

## State Transitions

### DocumentationFile Status Flow

```
[Created] → DRAFT (wip: true in frontmatter)
           ↓
       COMPLETE (frontmatter removed or status: complete)
           ↓
       DEPRECATED (when feature is removed)
           ↓
       [Archived to docs/archive/]
```

### ExternalLink Status Flow

```
UNCHECKED → ACTIVE (2xx response)
         → BROKEN (4xx/5xx/DNS error)
         → DEPRECATED (3xx redirect)
         → EXEMPTED (in exemption list)
```

### ValidationResult Lifecycle

```
1. Rule executed on file
2. ValidationResult created (pass or fail)
3. Result added to MetricsReport
4. Result formatted for output (console/JSON/PR comment)
5. Historical comparison (if previous run exists)
```

---

## Data Persistence

### File-Based Storage

- **Glossary**: `.doc-validator/glossary.yaml` - Version controlled, manually edited
- **Exemptions**: `.doc-validator/exemptions.json` - Version controlled configuration
- **Configuration**: `.doc-validator/config.json` - Rule enablement and severity overrides
- **Deprecation Log**: `docs/DEPRECATIONS.md` - Human-readable markdown table
- **Changelog**: `docs/CHANGELOG.md` - Consolidated historical status documents

### CI Artifacts

- **Metrics Report**: JSON file uploaded as GitHub Actions artifact
- **Validation Results**: Complete results in structured JSON format
- **Trend Data**: Comparison with previous run (stored in CI artifact metadata)

---

## Schema Validation

All configuration files and data structures use Zod schemas for runtime validation:

- `DocumentationFileSchema` - Validates frontmatter structure
- `GlossarySchema` - Validates glossary YAML structure
- `ConfigSchema` - Validates validation configuration
- `MetricsReportSchema` - Validates generated reports

See `/contracts/` directory for complete Zod schema definitions.

---

**Data Model Complete**: Ready for contract generation and implementation.
