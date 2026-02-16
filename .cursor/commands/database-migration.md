# Database Migration

## Overview

Help create and manage database migrations, generating complete migration files following the project's database framework conventions.

## Steps

1. **Migration Analysis**
    - Review current database schema changes needed
    - Identify data transformation requirements
    - Check for potential data loss or corruption risks
    - Analyze performance impact of schema changes
2. **Migration Script Generation**
    - Create up and down migration scripts
    - Include proper indexing and constraint management
    - Add data migration logic where needed
    - Implement rollback procedures
3. **Best Practices**
    - Ensure migrations are atomic and reversible
    - Add proper error handling and validation
    - Include progress monitoring for large datasets
    - Consider zero-downtime deployment strategies
4. **Testing Strategy**
    - Create test data scenarios
    - Verify migration on staging environment
    - Plan rollback procedures and testing
    - Document deployment steps and timing

## MCP Tool Reference

### Before Creating Migration

```typescript
// List existing tables to understand current schema
CallMcpTool({ server: "user-Supabase (local)", toolName: "list_tables", arguments: { schemas: ["public"] } })

// View existing migrations
CallMcpTool({ server: "user-Supabase (local)", toolName: "list_migrations", arguments: {} })

// Query current schema structure
CallMcpTool({ server: "user-Supabase (local)", toolName: "execute_sql", arguments: {
  query: "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public'"
}})
```

### Apply Migrations

```typescript
// Apply the migration (use instead of execute_sql for DDL)
CallMcpTool({ server: "user-Supabase (local)", toolName: "apply_migration", arguments: {
  name: "add_equipment_status_field",
  query: "ALTER TABLE equipment ADD COLUMN status TEXT DEFAULT 'active';"
}})
```

### Verify Migration

```typescript
// Check postgres logs if issues
CallMcpTool({ server: "user-Supabase (local)", toolName: "get_logs", arguments: { service: "postgres" } })

// Search Supabase docs for migration best practices
CallMcpTool({ server: "user-Supabase (local)", toolName: "search_docs", arguments: {
  graphql_query: "{ searchDocs(query: \"migrations\", limit: 5) { nodes { title href content } } }"
}})
```

## Database Migration Checklist

- [ ] Reviewed schema changes and data transformation requirements
- [ ] Checked for potential data loss or corruption risks
- [ ] Created up and down migration scripts
- [ ] Included proper indexing and constraint management
- [ ] Ensured migrations are atomic and reversible
- [ ] Added error handling and validation
- [ ] Created test data scenarios
- [ ] Verified migration on staging environment
- [ ] Documented deployment steps and timing
