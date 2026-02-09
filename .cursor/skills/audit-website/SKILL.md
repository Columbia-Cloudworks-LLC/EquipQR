---
name: audit-website
description: Audit websites for SEO, performance, security, technical, content, and 15 other issue categories with 230+ rules using the squirrelscan CLI. Returns LLM-optimized reports with health scores, broken links, meta tag analysis, and actionable recommendations. Use to discover and assess website or webapp issues and health.
license: See LICENSE file in repository root
metadata:
  author: squirrelscan
  version: "1.22"
  source_repo: squirrelscan/skills
---

# Website Audit Skill

Audit websites for SEO, technical, content, performance and security issues using the squirrelscan CLI (`squirrel`). Covers 230+ rules across 21 categories. Returns LLM-optimized reports with health scores, broken links, and actionable recommendations.

- **Docs**: [docs.squirrelscan.com](https://docs.squirrelscan.com)
- **Rule lookup**: `https://docs.squirrelscan.com/rules/{rule_category}/{rule_id}`

## EquipQR-Specific Notes

- **Live site**: `https://preview.equipqr.app` (Vercel deployment)
- **Local dev**: `http://localhost:8080` (via `npm run dev`)
- Prefer auditing the **live site** for true performance/rendering results
- Apply fixes from live audit against the local codebase
- After fixes, verify: `npm run lint && npx tsc --noEmit && npm run build`

## Categories Audited

SEO, Technical, Performance, Content Quality, Security, Accessibility, Usability, Links, E-E-A-T, User Experience, Mobile, Crawlability, Schema, Legal, Social, URL Structure, Keywords, Images, Local SEO, Video

## Prerequisites

Requires `squirrel` CLI in PATH.

**Windows install:**

```powershell
irm https://squirrelscan.com/install.ps1 | iex
```

**Verify:**

```bash
squirrel --version
```

## Setup

Initialize a project config (creates `squirrel.toml`):

```bash
squirrel init -n equipqr
# Overwrite existing:
squirrel init -n equipqr --force
```

## Workflow

Three cached processes: **crawl** -> **analyze** -> **report**. The `audit` command wraps all three:

```bash
squirrel audit https://preview.equipqr.app --format llm
```

Always prefer `--format llm` — optimized for AI consumption (40% smaller than XML).

### Scan Strategy

1. **First scan** — surface scan (quick, shallow, gathers structure):

```bash
squirrel audit https://preview.equipqr.app --format llm
```

2. **Second scan** — deep scan (thorough, full coverage):

```bash
squirrel audit https://preview.equipqr.app -C full --format llm
```

### Two-Step Workflow

```bash
# Step 1: Run audit
squirrel audit https://preview.equipqr.app

# Step 2: Export as LLM format
squirrel report --format llm
```

### Regression Diffs

```bash
squirrel report --diff --format llm
squirrel report --regression-since preview.equipqr.app --format llm
```

## Running Audits

1. **Present the report** — show audit results and score
2. **Propose fixes** — list issues and confirm before making changes
3. **Parallelize approved fixes** — use subagents for bulk edits
4. **Iterate** — fix batch -> re-audit -> present results -> propose next batch
5. **Pause for judgment** — flag broken links and ambiguous issues for user review
6. **Show before/after** — score comparison after each fix batch

### Score Targets

| Starting Score | Target Score | Expected Work |
|----------------|--------------|---------------|
| < 50 (Grade F) | 75+ (Grade C) | Major fixes |
| 50-70 (Grade D) | 85+ (Grade B) | Moderate fixes |
| 70-85 (Grade C) | 90+ (Grade A) | Polish |
| > 85 (Grade B+) | 95+ | Fine-tuning |

A site is COMPLETE when scores are above 95 with `--coverage full`.

### Issue Categories

| Category | Fix Approach | Parallelizable |
|----------|--------------|----------------|
| Meta tags/titles | Edit page components or metadata | No |
| Structured data | Add JSON-LD to page templates | No |
| Missing H1/headings | Edit page components + content files | Yes (content) |
| Image alt text | Edit content files | Yes |
| Heading hierarchy | Edit content files | Yes |
| Short descriptions | Edit content frontmatter | Yes |
| HTTP->HTTPS links | Find and replace in content | Yes |
| Broken links | Manual review (flag for user) | No |

### Parallelizing Fixes

- Confirm with user before spawning subagents
- Group 3-5 files per subagent for the same fix type
- Only parallelize independent files (no shared components)
- Spawn multiple subagents in a single message for concurrency

## Options Reference

### Coverage Modes

| Mode | Default Pages | Behavior | Use Case |
|------|---------------|----------|----------|
| `quick` | 25 | Seed + sitemaps only | CI, fast health check |
| `surface` | 100 | One sample per URL pattern | General audits (default) |
| `full` | 500 | Crawl everything up to limit | Deep analysis |

### Audit Command

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--format <fmt>` | `-f` | console, text, json, html, markdown, llm | console |
| `--coverage <mode>` | `-C` | quick, surface, full | surface |
| `--max-pages <n>` | `-m` | Maximum pages (max 5000) | varies |
| `--output <path>` | `-o` | Output file path | - |
| `--refresh` | `-r` | Ignore cache, fetch fresh | false |
| `--resume` | - | Resume interrupted crawl | false |
| `--verbose` | `-v` | Verbose output | false |

### Report Command

| Option | Alias | Description |
|--------|-------|-------------|
| `--list` | `-l` | List recent audits |
| `--severity <level>` | - | Filter: error, warning, all |
| `--category <cats>` | - | Filter by categories (comma-separated) |
| `--format <fmt>` | `-f` | console, text, json, html, markdown, xml, llm |
| `--output <path>` | `-o` | Output file path |

### Other Commands

| Command | Description |
|---------|-------------|
| `config show` | Show current config |
| `config set <key> <value>` | Set config value |
| `self update` | Check and apply updates |
| `self doctor` | Run health checks |

## Output Format

See [references/OUTPUT-FORMAT.md](references/OUTPUT-FORMAT.md) for the detailed LLM output format specification.

## Troubleshooting

- **Command not found**: Install via `irm https://squirrelscan.com/install.ps1 | iex` (Windows)
- **Slow crawl**: Use `--verbose` to monitor progress
- **Invalid URL**: Always include protocol (`https://`)
