# Onboard New Developer

## Overview

Comprehensive onboarding process to get a new developer up and running quickly.

## Steps

1. **Environment setup**
    - Install required tools
    - Set up development environment
    - Configure IDE and extensions
    - Set up git and SSH keys
2. **Project familiarization**
    - Review project structure
    - Understand architecture
    - Read key documentation
    - Set up local database

## MCP Tool Reference

### Verify Local Database Setup

```typescript
// Check tables exist
CallMcpTool({ server: "user-Supabase (local)", toolName: "list_tables", arguments: { schemas: ["public"] } })

// Check migrations are applied
CallMcpTool({ server: "user-Supabase (local)", toolName: "list_migrations", arguments: {} })

// Get project URL for env setup
CallMcpTool({ server: "user-Supabase (local)", toolName: "get_project_url", arguments: {} })
```

## Onboarding Checklist

- [ ] Development environment ready
- [ ] All tests passing
- [ ] Can run application locally
- [ ] Database set up and working
- [ ] First PR submitted
