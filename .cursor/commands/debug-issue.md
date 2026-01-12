# Debug Issue

## Overview

Help debug the current issue in the code by walking through the debugging process systematically and providing clear, actionable solutions.

## Steps

1. **Problem Analysis**
    - Identify the specific problem or error
    - Understand the expected vs actual behavior
    - Trace the execution flow to find the root cause
2. **Debugging Strategy**
    - Add appropriate logging statements
    - Suggest debugging tools and techniques
    - Identify key variables and states to monitor
    - Recommend breakpoint locations
3. **Solution Approach**
    - Propose potential fixes with explanations
    - Consider multiple solution approaches
    - Evaluate trade-offs of different approaches
    - Provide step-by-step resolution plan
4. **Prevention**
    - Suggest ways to prevent similar issues
    - Recommend additional tests or checks
    - Identify code patterns that could be improved

## MCP Tool Reference

### Database Debugging

```typescript
// Check auth service logs
CallMcpTool({ server: "user-Supabase (local)", toolName: "get_logs", arguments: { service: "auth" } })

// Check API/edge function logs
CallMcpTool({ server: "user-Supabase (local)", toolName: "get_logs", arguments: { service: "edge-function" } })

// Check postgres logs for query issues
CallMcpTool({ server: "user-Supabase (local)", toolName: "get_logs", arguments: { service: "postgres" } })

// Query data to verify state
CallMcpTool({ server: "user-Supabase (local)", toolName: "execute_sql", arguments: {
  query: "SELECT * FROM equipment WHERE id = '<uuid>' LIMIT 1"
}})
```

### UI Debugging (use browser MCP)

```typescript
// Navigate to the problematic page
CallMcpTool({ server: "cursor-ide-browser", toolName: "browser_navigate", arguments: { url: "http://localhost:5173/equipment" } })

// Capture accessibility snapshot for DOM analysis
CallMcpTool({ server: "cursor-ide-browser", toolName: "browser_snapshot", arguments: {} })

// Check console for JavaScript errors
CallMcpTool({ server: "cursor-ide-browser", toolName: "browser_console_messages", arguments: {} })

// Check network requests for failed API calls
CallMcpTool({ server: "cursor-ide-browser", toolName: "browser_network_requests", arguments: {} })
```

### Deployment Debugging

```typescript
// Get recent deployments to find failing one
CallMcpTool({ server: "user-Vercel", toolName: "list_deployments", arguments: { 
  projectId: "<project-id>", teamId: "<team-id>" 
}})

// Get build logs from failing deployment
CallMcpTool({ server: "user-Vercel", toolName: "get_deployment_build_logs", arguments: {
  idOrUrl: "<deployment-id>", teamId: "<team-id>", limit: 200
}})
```

## Debug Issue Checklist

- [ ] Identified the specific problem or error
- [ ] Understood expected vs actual behavior
- [ ] Traced execution flow to find root cause
- [ ] Added appropriate logging statements
- [ ] Proposed potential fixes with explanations
- [ ] Evaluated trade-offs of different approaches
- [ ] Provided step-by-step resolution plan
- [ ] Suggested ways to prevent similar issues
- [ ] Recommended additional tests or checks
