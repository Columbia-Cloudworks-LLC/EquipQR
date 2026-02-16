# Security Audit

## Overview

Comprehensive security review to identify and fix vulnerabilities in the
codebase.

## Steps

1. **Dependency audit**
    - Check for known vulnerabilities
    - Update outdated packages
    - Review third-party dependencies
2. **Code security review**
    - Check for common vulnerabilities
    - Review authentication/authorization
    - Audit data handling practices
3. **Infrastructure security**
    - Review environment variables
    - Check access controls
    - Audit network security

## MCP Tool Reference

### Verify RLS Policies

```typescript
// List all tables
CallMcpTool({ server: "user-Supabase (local)", toolName: "list_tables", arguments: { schemas: ["public"] } })

// Check RLS policies on a table
CallMcpTool({ server: "user-Supabase (local)", toolName: "execute_sql", arguments: {
  query: "SELECT tablename, policyname, permissive, roles, cmd, qual FROM pg_policies WHERE schemaname = 'public'"
}})

// Check for tables WITHOUT RLS enabled
CallMcpTool({ server: "user-Supabase (local)", toolName: "execute_sql", arguments: {
  query: "SELECT relname FROM pg_class WHERE relrowsecurity = false AND relkind = 'r' AND relnamespace = 'public'::regnamespace"
}})
```

## Security Checklist

- [ ] Dependencies updated and secure
- [ ] No hardcoded secrets
- [ ] Input validation implemented
- [ ] Authentication secure
- [ ] Authorization properly configured
