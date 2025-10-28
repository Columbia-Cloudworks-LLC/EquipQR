# Quick Start Guide: Documentation Validator

**Last Updated**: October 28, 2025  
**Audience**: Developers, Documentation Maintainers  
**Time to Complete**: 10 minutes

## Overview

The EquipQR Documentation Validator is a CLI tool that automatically checks documentation quality, detects code-documentation synchronization issues, and enforces consistency standards. This guide will help you get started with using the validator in your local development workflow and understanding CI validation results.

---

## Prerequisites

- Node.js 18.x or 20.x
- Git (for incremental validation and sync detection)
- Access to the EquipQR repository

---

## Installation

The documentation validator is integrated into the EquipQR project. No separate installation required.

### Verify Installation

```bash
# From repository root
npm run doc:validate --help
```

You should see the validator help output with available commands and options.

---

## Basic Usage

### Validate All Documentation

Run a complete validation of all documentation files:

```bash
npm run doc:validate
```

This performs:
- ✅ Structural validation (heading hierarchy, file naming)
- ✅ Content quality checks (required sections, code examples)
- ✅ Internal link validation
- ✅ Terminology consistency
- ⏭️  External link validation (skipped in quick mode)

**Expected Output**:
```
📋 Documentation Validation Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Files Validated: 87
⚠️  Total Issues: 12

Issues by Severity:
  🔴 Critical: 2
  🟠 High: 3
  🟡 Medium: 5
  🔵 Low: 2

Quality Score: 92.5% ⬆️ +4.5% from previous run

📊 View detailed report: .doc-validator/reports/latest.json
```

---

### Incremental Validation (PR Context)

Validate only files changed in your current branch:

```bash
npm run doc:validate -- --incremental
```

This is faster (<5 minutes) and focuses on your changes. Perfect for pre-commit checks.

**What it validates**:
- Changed documentation files
- Files that reference changed files (for link validation)
- Code changes that may require documentation updates

---

### Validate with External Links

Check external links for availability (slower, includes rate limiting):

```bash
npm run doc:validate -- --external-links
```

**Note**: This runs slower due to rate limiting (1 request/second per domain). Recommended for:
- Pre-release validation
- Weekly documentation audits
- After major documentation restructuring

---

## Understanding Validation Results

### Severity Levels

| Level | Icon | Description | Action Required |
|-------|------|-------------|----------------|
| **Critical** | 🔴 | Breaks navigation/understanding (broken links, missing required sections) | Fix immediately |
| **High** | 🟠 | Misleading information (code-doc sync issues) | Fix before merge |
| **Medium** | 🟡 | Reduces readability (formatting, structure) | Fix when convenient |
| **Low** | 🔵 | Style preferences (minor accessibility) | Optional improvement |

### Example Validation Issue

```
🔴 CRITICAL: quality-001-internal-links
  File: docs/features/equipment-management.md
  Line: 42
  Message: Broken internal link to 'database-schema.md' - file does not exist
  Fix: Update link to 'docs/architecture/database-schema.md' or remove reference
  Context: [Database Schema](database-schema.md)
```

**How to Fix**:
1. Open `docs/features/equipment-management.md`
2. Navigate to line 42
3. Update the link: `[Database Schema](../architecture/database-schema.md)`
4. Re-run validation to confirm fix

---

## Common Workflows

### 1. Before Creating a Pull Request

```bash
# Validate your changes
npm run doc:validate -- --incremental

# Review issues
# Fix critical and high severity issues
# (Medium and low are optional)

# Re-validate to confirm fixes
npm run doc:validate -- --incremental
```

### 2. Creating New Documentation

```markdown
---
title: My New Feature
status: draft
type: feature
---

# My New Feature

[Your content here]
```

**Use `status: draft` or `wip: true` in frontmatter** to exempt work-in-progress docs from completeness checks while you're still writing.

When complete, remove the status field or change to `status: complete`.

### 3. Fixing Code-Documentation Sync Issues

When you modify code, the validator detects documentation that may need updates:

```
🟠 HIGH: sync-001-schema
  File: docs/architecture/database-schema.md
  Message: Database migration detected (20251028143000_add_user_preferences.sql) 
           but schema documentation not updated
  Fix: Update database-schema.md to document new 'user_preferences' table
```

**Steps**:
1. Review the migration file referenced
2. Update documentation to reflect schema changes
3. Re-run validation

---

## Configuration

### Customize Validation Rules

Edit `.doc-validator/config.json`:

```json
{
  "rules": {
    "quality-001-internal-links": {
      "enabled": true,
      "severity": "critical"
    },
    "structure-002-duplicate-content": {
      "enabled": false
    }
  }
}
```

### Add External Link Exemptions

Edit `.doc-validator/exemptions.json`:

```json
{
  "exemptedUrls": [
    "https://internal.company.com/*"
  ],
  "exemptedDomains": [
    "localhost",
    "internal.example.com"
  ],
  "exemptionReasons": {
    "internal.company.com": "Internal domain - requires VPN"
  }
}
```

### Update Glossary Terms

Edit `.doc-validator/glossary.yaml`:

```yaml
terms:
  - term: Equipment
    definition: Physical asset tracked in the system
    synonyms:
      - Asset
      - Item
    deprecatedTerms:
      - Machine
    usage: "Use 'Equipment' in documentation"
```

---

## CI Integration

The documentation validator runs automatically in GitHub Actions on every pull request.

### Viewing CI Results

1. Open your pull request
2. Scroll to "Checks" section
3. Find "Documentation Validation" check
4. Click "Details" to view full report

### CI Behavior

- ✅ **Advisory Only**: Validation never blocks PR merges
- 📊 **PR Comments**: Summary posted as PR comment with key issues
- 📁 **Artifacts**: Full JSON report uploaded as artifact for detailed analysis

### Downloading Detailed Reports

1. Go to PR → "Checks" → "Documentation Validation"
2. Scroll to "Artifacts" section
3. Download `validation-report.json`
4. Open with any JSON viewer or text editor

---

## Advanced Usage

### Generate Quality Metrics Report

```bash
npm run doc:validate -- --report
```

Generates a detailed quality metrics report in `.doc-validator/reports/`:
- Quality scores by category
- Trend analysis (if previous runs exist)
- Issue breakdown by severity and category

### Consolidate Deprecated Documentation

```bash
npm run doc:consolidate
```

Automatically:
- Moves deprecated feature docs to `docs/archive/`
- Updates `docs/DEPRECATIONS.md` with removal information
- Consolidates root-level status documents into `docs/CHANGELOG.md`

### Validate Specific Files

```bash
npm run doc:validate -- --files "docs/features/*.md"
```

---

## Troubleshooting

### Issue: "No documentation files found"

**Cause**: Validator looking in wrong directory.

**Fix**: Check `docsRoot` in `.doc-validator/config.json` matches your repository structure.

### Issue: "Too many false positives for external links"

**Cause**: External services may block automated requests or have temporary outages.

**Fix**: Add problematic URLs to `.doc-validator/exemptions.json`

### Issue: "Validation taking too long"

**Cause**: External link validation with large documentation set.

**Fix**: 
- Use `--incremental` for day-to-day checks
- Reserve full validation with external links for pre-release
- Increase `rateLimits.defaultDelayMs` in config if needed

### Issue: "Sync detection flagging incorrect files"

**Cause**: Git diff pattern matching may have false positives.

**Fix**: 
- Review the suggested documentation updates
- If truly not related, document why in PR description
- Open issue to refine sync detection patterns

---

## Best Practices

### ✅ Do

- Run incremental validation before committing documentation changes
- Fix critical and high severity issues before requesting review
- Use `status: draft` frontmatter for work-in-progress documentation
- Update glossary when introducing new canonical terms
- Review validation trends to track documentation quality improvements

### ❌ Don't

- Don't disable validation rules without team discussion
- Don't commit fixes without re-running validation
- Don't ignore code-documentation sync warnings (high severity)
- Don't exempt external links without documenting reasons

---

## Getting Help

### Documentation Issues

- Review validation message and suggested fix
- Check relevant documentation files referenced in this guide
- Search existing GitHub issues for similar problems

### Feature Requests

Open a GitHub issue with:
- Current behavior
- Desired behavior
- Example documentation that should pass/fail
- Suggested validation rule or enhancement

### False Positives

If a validation rule produces incorrect results:
1. Document the specific case
2. Open GitHub issue with reproduction steps
3. Add temporary exemption if blocking work
4. Team will refine validation rule

---

## Next Steps

- 📖 **Deep Dive**: Read [data-model.md](./data-model.md) for complete entity definitions
- ⚙️ **Customize**: Configure validation rules in `.doc-validator/config.json`
- 📊 **Track Quality**: Review metrics reports to monitor documentation improvements
- 🤝 **Contribute**: Suggest new validation rules or refinements

---

**Questions?** Open an issue on GitHub or reach out to the documentation maintainers.
