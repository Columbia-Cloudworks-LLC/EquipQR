# Research: Documentation Standards and Quality Assurance System

**Date**: October 28, 2025  
**Purpose**: Resolve technical unknowns and establish technology choices for the documentation validation system

## Research Tasks

This document addresses the following clarifications from the Technical Context:
1. Markdown parsing library selection
2. Git diff analysis library selection
3. Link validation library selection
4. Documentation validation patterns and best practices
5. External link validation with rate limiting strategies

---

## 1. Markdown Parsing Library Selection

### Options Evaluated

#### Option A: remark/unified Ecosystem
**Description**: Part of the unified collective, a comprehensive markdown processing pipeline using Abstract Syntax Trees (AST).

**Pros**:
- Highly extensible plugin ecosystem (remark-gfm, remark-frontmatter, remark-lint)
- AST-based approach enables complex structural analysis (heading hierarchy, link extraction)
- Active maintenance and large community
- Supports GitHub Flavored Markdown (GFM)
- Can compose plugins for custom validation rules

**Cons**:
- Steeper learning curve (AST traversal concepts)
- More dependencies in the ecosystem
- Potentially overkill for simple parsing needs

**Performance**: Good for complex transformations; AST construction has overhead but enables efficient tree traversal

**Use Cases**: Perfect for structural validation (heading hierarchy, table structure), content extraction (links, code blocks), and custom linting rules

#### Option B: markdown-it
**Description**: Fast, pluggable markdown parser with a focus on speed and CommonMark compliance.

**Pros**:
- Very fast parsing performance
- Simple API for basic parsing
- Good plugin ecosystem
- CommonMark compliant with GFM support via plugins

**Cons**:
- Less suited for structural analysis (token-based, not full AST)
- Harder to implement complex validation rules
- Plugin API less composable than unified

**Performance**: Fastest parsing among options; optimized for rendering

**Use Cases**: Better for rendering/conversion than deep structural analysis

#### Option C: marked
**Description**: Lightweight, fast markdown parser with a simple API.

**Pros**:
- Very lightweight (small bundle size)
- Simple to use for basic parsing
- Fast parsing

**Cons**:
- Limited plugin ecosystem
- No built-in AST for structural analysis
- Fewer features for advanced validation
- Less active development compared to remark/unified

**Performance**: Fast but lacks features needed for validation

**Use Cases**: Simple rendering tasks, not ideal for complex validation

### Decision: **remark/unified**

**Rationale**: 
- The validation system requires deep structural analysis (heading hierarchy, link extraction, table structure, code block validation)
- AST-based approach enables efficient implementation of complex validation rules
- Plugin ecosystem (remark-frontmatter, remark-gfm, remark-lint) provides ready-made solutions for common tasks
- Extensibility is critical for adding new validation rules incrementally
- Community momentum and active maintenance reduce long-term risk

**Alternatives Considered**:
- markdown-it: Rejected because token-based parsing is less suitable for structural validation rules
- marked: Rejected due to limited extensibility and lack of AST support

**Implementation Plan**:
- Use `unified`, `remark-parse`, `remark-frontmatter`, `remark-gfm` as core dependencies
- Build custom remark plugins for validation rules (completeness, terminology, structure)
- Use `unist-util-visit` for AST traversal in validators

---

## 2. Git Diff Analysis Library Selection

### Options Evaluated

#### Option A: simple-git
**Description**: Simple wrapper around Git CLI commands for Node.js.

**Pros**:
- Wraps Git CLI, so it supports all Git features
- Simple Promise-based API
- Active maintenance
- Lightweight (no native bindings)
- Works wherever Git is installed

**Cons**:
- Requires Git to be installed on the system
- Spawns child processes (slight performance overhead)
- Less control over low-level Git operations

**Performance**: Depends on Git CLI performance; slight overhead from process spawning

**Use Cases**: Perfect for CI environments where Git is already available; simple diff extraction

#### Option B: nodegit
**Description**: Native Node.js bindings to libgit2.

**Pros**:
- Full-featured Git API (no Git CLI required)
- Low-level control over Git operations
- Can work in environments without Git CLI

**Cons**:
- Native bindings require compilation (node-gyp)
- Large binary size
- Installation issues on some platforms (Windows, unusual architectures)
- Heavier maintenance burden
- Slower updates compared to Git CLI

**Performance**: Fast native operations, but compilation and installation complexity

**Use Cases**: Applications needing Git functionality without Git CLI dependency

#### Option C: isomorphic-git
**Description**: Pure JavaScript implementation of Git.

**Pros**:
- No native dependencies (works in browser and Node.js)
- Cross-platform without compilation
- Active development

**Cons**:
- Not feature-complete compared to Git CLI
- Performance overhead (JavaScript vs native Git)
- Complex API for some operations
- Less mature than simple-git or nodegit

**Performance**: Slower than native Git for large repositories

**Use Cases**: Browser-based Git applications, environments without Git CLI

### Decision: **simple-git**

**Rationale**:
- CI environments (GitHub Actions) always have Git installed
- Local development environments have Git installed (project requirement)
- Simple API for the specific needs: `git diff`, `git log`, `git show`
- No compilation or native binding concerns
- Proven reliability in CI/CD workflows
- Performance is sufficient for documentation validation (not processing massive repos)

**Alternatives Considered**:
- nodegit: Rejected due to native binding compilation complexity and installation issues; overkill for simple diff analysis
- isomorphic-git: Rejected due to incomplete feature set and performance overhead; browser compatibility not needed

**Implementation Plan**:
- Use `simple-git` to detect changed files in PR context (`git diff --name-only`)
- Extract patterns from diffs for code-doc sync detection (migration files, API routes, env.example changes)
- Use `git log` for historical analysis (deprecation detection)

---

## 3. Link Validation Library Selection

### Options Evaluated

#### Option A: Custom Fetch Implementation
**Description**: Build custom link validation using native `fetch` with rate limiting.

**Pros**:
- Full control over rate limiting, retry logic, timeout handling
- No external dependency for simple HTTP checks
- Can customize validation logic (status codes, redirects, content-type)
- Lightweight

**Cons**:
- Need to implement rate limiting, retry logic, timeout handling from scratch
- More code to maintain and test
- Need to handle edge cases (redirects, DNS errors, SSL issues)

**Performance**: Depends on implementation; can be optimized for specific needs

**Use Cases**: When full control and customization are required

#### Option B: check-links
**Description**: Fast link checker with support for various protocols.

**Pros**:
- Designed specifically for link checking
- Handles common edge cases (redirects, timeouts)
- Concurrent checking with configurable limits

**Cons**:
- Less flexible than custom implementation
- May not support all rate limiting requirements
- Dependency maintenance

**Performance**: Optimized for concurrent link checking

**Use Cases**: General-purpose link validation

#### Option C: broken-link-checker
**Description**: Comprehensive broken link checker with crawling capabilities.

**Pros**:
- Feature-rich (supports HTML parsing, crawling, various protocols)
- Handles many edge cases

**Cons**:
- Heavier dependency (includes HTML parsing, crawling)
- Overkill for simple external link validation
- Less active maintenance
- More complex API than needed

**Performance**: Slower due to additional features

**Use Cases**: Full website crawling and link validation

### Decision: **Custom Fetch Implementation**

**Rationale**:
- Rate limiting requirement is very specific (1 req/sec per domain with configurable delays)
- Need precise control over retry logic for flaky external services
- External link validation is a small subset of overall validation (most validation is structural)
- Native `fetch` (available in Node.js 18+) is sufficient for HTTP/HTTPS checks
- Lightweight implementation keeps dependencies minimal
- Can add sophisticated features incrementally (HEAD request before GET, content-type validation)

**Alternatives Considered**:
- check-links: Rejected because rate limiting per domain requires custom logic anyway
- broken-link-checker: Rejected due to unnecessary features (HTML crawling) and weight

**Implementation Plan**:
- Create rate limiter utility with per-domain tracking
- Implement retry logic with exponential backoff
- Support exemptions for known flaky links (configuration-based)
- Use HEAD requests for initial validation, fall back to GET if needed
- Track last validated timestamp for caching

---

## 4. Documentation Validation Patterns and Best Practices

### Research Findings

#### Pattern 1: Rule-Based Validation Architecture

**Industry Pattern**: Most documentation validators use a rule-based architecture where each rule is:
- Independently testable
- Configurable (enabled/disabled, severity level)
- Produces structured output (file, line, rule ID, message, severity)

**Application**:
- Create base `ValidationRule` interface with `validate()` method
- Each rule returns `ValidationResult[]` with file path, severity, message, suggested fix
- Rules organized by category (quality, sync, structure, accessibility)
- Configuration file enables/disables rules and sets severity overrides

#### Pattern 2: Incremental Validation Strategy

**Industry Pattern**: Documentation validators support two modes:
- **Full validation**: Complete repository scan (scheduled or on-demand)
- **Incremental validation**: Only validate changed files (PR context, fast feedback)

**Application**:
- CLI flag `--incremental` uses git diff to identify changed files
- Validate changed files + files that reference them (for link validation)
- Full validation mode for comprehensive checks (external links, cross-file consistency)
- Performance target: <5 minutes for incremental, <15 minutes for full

#### Pattern 3: Severity-Based Reporting

**Industry Pattern**: Validation issues are categorized by severity:
- **Critical**: Breaks navigation or understanding (broken internal links, missing required sections)
- **High**: Misleading information (code-doc sync issues)
- **Medium**: Reduces readability (formatting, structure violations)
- **Low**: Style preferences (minor accessibility issues)

**Application**:
- Each validation rule assigns severity based on impact
- Reports group issues by severity for prioritization
- Advisory-only approach: display all issues but never fail builds
- Metrics track issues by severity for trend analysis

#### Pattern 4: Progressive Enhancement

**Industry Pattern**: Start with high-value, low-false-positive rules; add sophisticated rules incrementally.

**Application**:
- Phase 1: Critical rules (broken internal links, missing required sections)
- Phase 2: High-value rules (code-doc sync, terminology consistency)
- Phase 3: Refinement rules (accessibility, advanced structure validation)
- False positive feedback loop: refine rules based on real-world usage

---

## 5. External Link Validation with Rate Limiting Strategies

### Research Findings

#### Strategy 1: Per-Domain Rate Limiting

**Pattern**: Track requests per domain to avoid overwhelming any single service.

**Implementation**:
- Maintain map of domain → last request timestamp
- Before making request, check if enough time has passed since last request to that domain
- Default: 1 second per domain (configurable)
- Use URL parsing to extract domain, handle subdomains appropriately

#### Strategy 2: Exponential Backoff for Retries

**Pattern**: When request fails (timeout, 5xx error), retry with increasing delays.

**Implementation**:
- First retry: 2 seconds
- Second retry: 4 seconds
- Third retry: 8 seconds
- Max retries: 3
- Record final status (success, failed, timeout)

#### Strategy 3: Configurable Exemptions

**Pattern**: Some links are known to be flaky (require auth, block bots, temporary issues).

**Implementation**:
- Configuration file with exempted URLs or domains
- Exempted links skipped in validation
- Report shows exempted links separately
- Team reviews exemptions periodically

#### Strategy 4: Caching with Timestamps

**Pattern**: Cache validation results to avoid re-checking recently validated links.

**Implementation**:
- Store last validation timestamp and status for each external link
- Skip validation if link was validated successfully within N hours (configurable, default 24h)
- Configurable cache duration per environment (shorter for CI, longer for local dev)
- Incremental validation uses cache; full validation bypasses cache

---

## Technology Stack Summary

| Component | Technology Choice | Rationale |
|-----------|------------------|-----------|
| **Markdown Parsing** | remark/unified | AST-based analysis enables complex structural validation; extensible plugin ecosystem |
| **Git Operations** | simple-git | Simple API, works in CI/CD, no compilation issues; Git CLI always available in target environments |
| **Link Validation** | Custom fetch implementation | Precise rate limiting control (1 req/sec per domain); lightweight; native Node.js fetch (18+) |
| **YAML Parsing** | yaml | Standard, well-maintained, handles frontmatter and glossary files |
| **Schema Validation** | Zod | Aligns with existing EquipQR stack; excellent TypeScript integration |
| **CLI Framework** | commander | Industry standard, simple API, good TypeScript support |
| **Testing** | Vitest | Aligns with existing EquipQR test framework; fast, modern |

---

## Implementation Phases

Based on research findings, the implementation will follow this sequence:

### Phase 1: Foundation (P1 - Critical Infrastructure)
- CLI framework setup (commander)
- Markdown parser integration (remark/unified)
- Base validation rule interface and runner
- Configuration loading (Zod schemas)
- JSON report generation

### Phase 2: Critical Validators (P1 - High Value, Low False Positives)
- Internal link validation (broken links)
- Required sections validation (completeness)
- Frontmatter status detection (WIP exemptions)
- Basic file naming conventions

### Phase 3: Code-Doc Sync (P2 - High Value, Moderate Complexity)
- Git diff analysis integration (simple-git)
- Schema sync detection (migration pattern matching)
- Environment variable sync (env.example changes)
- API endpoint sync (route file changes)

### Phase 4: Structure & Quality (P2 - Medium Value)
- Heading hierarchy validation
- Duplicate content detection (3+ consecutive sentences)
- Terminology consistency (glossary integration)
- Directory organization validation

### Phase 5: External Links & Accessibility (P3 - Lower Priority, Higher Complexity)
- External link validation (custom fetch with rate limiting)
- Image alt text validation
- Table structure validation
- Code block syntax validation

### Phase 6: Reporting & Integration (P2 - Essential for Adoption)
- Console reporter with color/formatting
- PR comment formatter (GitHub integration)
- Quality metrics dashboard (JSON to readable report)
- CI/CD workflow integration (GitHub Actions)

---

## Open Questions for Implementation

1. **Glossary Format**: YAML vs Markdown for canonical terminology?
   - **Recommendation**: YAML for machine-readability; include examples and synonyms
   
2. **Configuration Location**: Root `.doc-validator/` vs `docs/.validator/`?
   - **Recommendation**: Root `.doc-validator/` for visibility and CI access
   
3. **Incremental Validation Scope**: Validate only changed files or include files that link to them?
   - **Recommendation**: Changed files + files that reference them (for link validation impact)

4. **Report Artifact Format**: Single JSON file vs multiple files (one per category)?
   - **Recommendation**: Single JSON with categorized structure for easier CI artifact upload

5. **Deprecation Log Format**: Markdown table vs structured YAML?
   - **Recommendation**: Markdown (`DEPRECATIONS.md`) for human readability; extract to YAML if automation needed

---

## References

- [Remark/Unified Documentation](https://unifiedjs.com/)
- [simple-git Documentation](https://github.com/steveukx/git-js)
- [Node.js Fetch API](https://nodejs.org/dist/latest-v18.x/docs/api/globals.html#fetch)
- [Documentation Validation Best Practices (Google)](https://developers.google.com/tech-writing/overview)
- [Vale Documentation Linter](https://vale.sh/) (inspiration for rule-based approach)
- [markdownlint](https://github.com/DavidAnson/markdownlint) (inspiration for markdown validation patterns)

---

**Research Complete**: All NEEDS CLARIFICATION items resolved. Ready for Phase 1 (Design & Contracts).
