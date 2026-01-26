# Access Control Policy

**Document Version:** 1.0  
**Last Updated:** January 26, 2026  
**Owner:** Columbia Cloudworks LLC

## Purpose

This document defines the Access Control Policy for EquipQR production systems, databases, and infrastructure. This policy ensures that only authorized personnel have access to production resources and that access is properly controlled, monitored, and audited.

## Scope

This policy applies to:
- Production database access
- Production application infrastructure
- Production environment configuration
- Source code repositories
- CI/CD pipelines
- Third-party service integrations

## Access Control Principles

### 1. Principle of Least Privilege

- Users are granted only the minimum access necessary to perform their job functions
- Access is reviewed regularly and revoked when no longer needed
- Temporary elevated access is granted only when necessary and revoked immediately after use

### 2. Separation of Duties

- Development, staging, and production environments are separated
- Production access is restricted to essential personnel only
- Code deployment requires separate approval from code development

### 3. Defense in Depth

- Multiple layers of security controls protect production resources
- Authentication, authorization, and audit logging work together
- No single point of failure in access control

## Production Database Access

### Write Access

**Only Columbia Cloudworks LLC owners have write access to the production database.**

This includes:
- Direct database modifications (INSERT, UPDATE, DELETE)
- Schema changes (ALTER TABLE, CREATE TABLE, etc.)
- Migration execution
- RLS policy modifications
- Function and trigger changes

### Read Access

Read access to production database is restricted to:
- Columbia Cloudworks LLC owners
- Authorized support personnel (read-only, for troubleshooting)
- Application service accounts (via RLS policies)

### Access Methods

1. **Supabase Dashboard**
   - Access via Supabase project dashboard
   - Requires Supabase account with project owner/admin role
   - All actions are logged in Supabase audit logs

2. **Database Migrations**
   - Migrations are applied via Supabase CLI or dashboard
   - All migrations are version-controlled in `supabase/migrations/`
   - Migration execution requires project owner approval

3. **Edge Functions**
   - Edge functions use service role key for privileged operations
   - Service role key is stored in Supabase secrets (not in code)
   - Edge function execution is logged

### Service Role Key

- The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security (RLS)
- **CRITICAL**: This key must never be:
  - Committed to version control
  - Exposed in client-side code
  - Shared via insecure channels
  - Stored in plain text
- Service role key is only used in:
  - Supabase Edge Functions (server-side only)
  - Authorized background jobs
  - System administration tasks

## Application Infrastructure Access

### Production Environment

- Production infrastructure is managed via:
  - Supabase Dashboard (database, auth, storage)
  - Vercel/Netlify (application hosting)
  - GitHub (source code)
- Access to production infrastructure requires:
  - Owner-level permissions on Supabase project
  - Admin access to hosting platform
  - Repository maintainer status on GitHub

### Environment Variables

- Production environment variables are stored in:
  - Supabase Edge Function secrets (server-side)
  - Hosting platform environment variables (build-time)
- Access to modify environment variables requires:
  - Project owner status
  - Approval from Columbia Cloudworks LLC owners

## Source Code Repository Access

### Write Access (Push/Merge)

- Write access to `main` and `preview` branches requires:
  - Repository maintainer status
  - Approval via Pull Request review process
  - Passing CI/CD checks

### Read Access

- Public repository: Read access is available to all
- Private repositories: Read access requires repository access permissions

## Third-Party Service Access

### QuickBooks Integration

- OAuth credentials are stored in `quickbooks_credentials` table
- Access is encrypted at rest
- Only organization admins can initiate OAuth connections
- Credentials are scoped per organization (tenant isolation)

### Google Workspace Integration

- OAuth credentials are stored in `google_workspace_credentials` table
- Access is encrypted at rest
- Only Google Workspace admins can initiate connections
- Credentials are scoped per organization (tenant isolation)

## Access Review and Audit

### Regular Reviews

- Production access is reviewed quarterly
- Access logs are reviewed monthly
- Unused access is revoked promptly

### Audit Logging

- All production database access is logged
- Edge function executions are logged
- Authentication events are logged
- Audit logs are retained for compliance (minimum 1 year)

### Monitoring

- Unusual access patterns are monitored
- Failed authentication attempts are logged
- Privilege escalations are alerted

## Access Request Process

### Requesting Access

1. Submit access request to Columbia Cloudworks LLC owners
2. Provide justification for access
3. Specify required access level (read-only vs. write)
4. Specify duration (permanent vs. temporary)

### Approval Process

1. Access request is reviewed by owners
2. Principle of least privilege is applied
3. Access is granted with appropriate scope
4. Access is documented

### Access Revocation

- Access is revoked when:
  - No longer needed for job function
  - Employee/contractor leaves
  - Security incident occurs
  - Quarterly review identifies unused access

## Incident Response

### Security Incidents

- Unauthorized access attempts are immediately investigated
- Affected accounts are suspended pending investigation
- Access logs are reviewed to determine scope
- Remediation steps are documented

### Breach Response

- If unauthorized access is confirmed:
  1. Affected systems are isolated
  2. Access is immediately revoked
  3. Incident is documented
  4. Affected parties are notified (as required by law)
  5. Remediation steps are implemented

## Compliance

This Access Control Policy supports compliance with:
- SOC 2 Type 1 requirements
- PCI DSS SAQ-A requirements
- General data protection regulations

## Policy Updates

This policy is reviewed and updated:
- Annually, or
- When significant changes occur to access control systems
- When compliance requirements change

## Contact

For questions about this policy or to request access:
- Contact: Columbia Cloudworks LLC owners
- Email: [Contact information in private documentation]

---

**Document Control:**
- This document is stored in `docs/ops/access-control-policy.md`
- Changes require approval from Columbia Cloudworks LLC owners
- Version history is maintained in git history
