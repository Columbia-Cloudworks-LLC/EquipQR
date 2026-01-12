# Optimize Performance

## Overview

Analyze the current code for performance bottlenecks and provide optimization recommendations, focusing on measurable improvements while maintaining code quality and readability.

## Steps

1. **Performance Analysis**
    - Identify slow algorithms and inefficient data structures
    - Find memory leaks and excessive allocations
    - Detect unnecessary computations and redundant operations
    - Analyze database queries and API calls
2. **Optimization Strategies**
    - Suggest algorithm improvements and better data structures
    - Recommend caching strategies where appropriate
    - Propose lazy loading and pagination solutions
    - Identify opportunities for parallel processing
3. **Implementation**
    - Provide optimized code with explanations
    - Include performance impact estimates
    - Suggest profiling and monitoring approaches
    - Consider trade-offs between performance and maintainability

## MCP Tool Reference

### Database Performance Analysis

```typescript
// Check for slow queries
CallMcpTool({ server: "user-Supabase (local)", toolName: "execute_sql", arguments: {
  query: "SELECT query, calls, mean_time, total_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10"
}})

// Check missing indexes
CallMcpTool({ server: "user-Supabase (local)", toolName: "execute_sql", arguments: {
  query: "SELECT relname, seq_scan, idx_scan FROM pg_stat_user_tables WHERE seq_scan > idx_scan ORDER BY seq_scan DESC LIMIT 10"
}})

// Get postgres logs for query issues
CallMcpTool({ server: "user-Supabase (local)", toolName: "get_logs", arguments: { service: "postgres" } })
```

## Optimize Performance Checklist

- [ ] Identified slow algorithms and inefficient data structures
- [ ] Found memory leaks and excessive allocations
- [ ] Detected unnecessary computations and redundant operations
- [ ] Analyzed database queries and API calls
- [ ] Suggested algorithm improvements and better data structures
- [ ] Recommended caching strategies where appropriate
- [ ] Provided optimized code with explanations
- [ ] Included performance impact estimates
- [ ] Considered trade-offs between performance and maintainability
