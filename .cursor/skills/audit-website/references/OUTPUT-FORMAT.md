# LLM Format Output Reference

## Overview

The `--format llm` output is a compact, token-optimized hybrid XML/text format designed for AI agent consumption. 40-70% smaller than verbose XML.

## Format Structure

### Document Header

```xml
<audit>
<site url="https://example.com" crawled="50" date="2026-01-15T10:30:00Z"/>
```

### Health Score

```xml
<score overall="72" grade="C">
<cat n="core-seo" s="65"/>
<cat n="technical" s="80"/>
<cat n="content" s="70"/>
<cat n="security" s="85"/>
</score>
```

### Summary

```xml
<summary passed="150" warnings="20" failed="10"/>
```

### Issues Section

Issues grouped by category with compact inline metadata:

```xml
<issues>
<g cat="core-seo" rules="5">
<r id="core/meta-title" severity="error" status="fail">
Missing or empty meta title tags
Desc: Every page should have a unique meta title
Fix: Add descriptive <title> tags to each page
Pages (2): https://example.com/about, https://example.com/contact
Items (2):
 - https://example.com/about
 - https://example.com/contact
</r>
</g>
</issues>
```

#### Rule Attributes

- `id` - Rule identifier (e.g., `core/meta-title`)
- `severity` - `error`, `warning`, or `info`
- `status` - `pass`, `warn`, or `fail`

#### Text Content (in order)

1. **Message** (optional) - Human-readable issue summary
2. **Desc:** - Rule description
3. **Fix:** - Recommended solution
4. **Pages (n):** - Comma-separated affected URLs
5. **Items (n):** - Dash-prefixed list with metadata

### Items Format

```xml
Items (3):
 - https://example.com/missing-title (title: "")
 - https://example.com/duplicate-title (title: "Home Page") (from: https://example.com/other)
 - /broken-link [status: 404, type: internal] (from: https://example.com/contact)
```

## Diff Output

When using `--diff` or `--regression-since`:

```xml
<diff>
<baseline id="abc123" date="2026-01-10"/>
<current id="def456" date="2026-01-15"/>
<scores before="65" after="72" change="+7"/>
<regressions count="1">
<r id="core/meta-title" severity="error" fp="abc">
Missing page title
Target: page /about
</r>
</regressions>
</diff>
```

## Format Comparison

| Format | Size | Best For |
|--------|------|----------|
| `xml` | 209KB | Enterprise integration |
| `llm` | 125KB | AI agents |
| `json` | 180KB | Programmatic processing |
| `text` | 45KB | Simple piping |
