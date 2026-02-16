# Setup New Feature

## Overview

Systematically set up a new feature from initial planning through to implementation structure.

## Steps

1. **Define requirements**
    - Clarify feature scope and goals
    - Identify user stories and acceptance criteria
    - Plan technical approach
2. **Create feature branch**
    - Branch from main/develop
    - Set up local development environment
    - Configure any new dependencies
3. **Plan architecture**
    - Design data models and APIs
    - Plan UI components and flow
    - Consider testing strategy

## MCP Tool Reference

### When new dependencies are needed

```typescript
// Resolve library ID first
CallMcpTool({ server: "user-context7", toolName: "resolve-library-id", arguments: {
  query: "How to use React Query for data fetching",
  libraryName: "tanstack-query"
}})

// Get documentation for the library
CallMcpTool({ server: "user-context7", toolName: "query-docs", arguments: {
  libraryId: "/tanstack/query",
  query: "How to set up QueryClient and use useQuery hook"
}})
```

### Create GitHub Issue for Feature Tracking

```typescript
CallMcpTool({ server: "user-github", toolName: "issue_write", arguments: {
  method: "create",
  owner: "Columbia-Cloudworks-LLC",
  repo: "EquipQR",
  title: "Feature: Add equipment status field",
  body: "## Description\n...\n\n## Acceptance Criteria\n- [ ] ..."
}})
```

## Setup New Feature Checklist

- [ ] Requirements documented
- [ ] User stories written
- [ ] Technical approach planned
- [ ] Feature branch created
- [ ] Development environment ready
