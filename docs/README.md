# EquipQR™ Documentation

Welcome to the comprehensive documentation for EquipQR™, a modern fleet equipment management platform. This documentation is organized into three main sections: Technical, Guides, and Operations.

## 📚 Documentation Structure

### 🚀 Getting Started

Start here for new developers:

- **[Developer Onboarding](./getting-started/developer-onboarding.md)** - Quick start guide (5-minute setup)
- **[Development Lifecycle](./getting-started/development-lifecycle.md)** - Cursor plugin-first + preview-first release workflow
- **[Troubleshooting](./getting-started/troubleshooting.md)** - Comprehensive troubleshooting guide

### 🔧 Technical Documentation

Technical documentation for developers and system architects:

- **[Setup Guide](./technical/setup.md)** - Detailed environment configuration reference
- **[Architecture](./technical/architecture.md)** - System architecture and database schema documentation
- **[Standards](./technical/standards.md)** - Coding standards and UI system guide
- **[Testing Guidelines](./technical/testing-guidelines.md)** - Test patterns and coverage expectations
- **[API Reference](./technical/api-reference.md)** - API documentation with examples

### 👋 For End Users

Day-to-day support for technicians, managers, admins, owners, and requestors
lives **inside the app**:

- **In-app Support Library** — open `/dashboard/support` while signed in, or
  `/support` for the public variant. It is the source of truth for
  step-by-step walkthroughs organized by role and workflow (Start Here,
  Technician Field Work, Work Orders, Equipment & QR Codes, Inventory & Parts,
  Teams & Roles, Admin & Integrations, Privacy & Support).
- **[Image Upload Quick Reference](./how-to/image-upload/quick-reference-card.md)** —
  printable cheat sheet for technicians in the field.
- **[Image Upload Technician Guide](./how-to/image-upload/technician-image-upload-guide.md)** —
  numbered-step guide with screenshots for the work-order-plus-photo flow.

### 📖 Reference Guides (developers & admins)

Technical reference for developers, admins, and support engineers who need the
full lifecycle and permission map:

- **[Workflows Reference](./guides/workflows.md)** — canonical work order
  lifecycle and status-transition rules.
- **[Permissions](./guides/permissions.md)** — full RBAC matrix.

### 🚀 Operations

Operational documentation for deployment and maintenance:

- **[CI/CD Pipeline](./ops/ci-cd-pipeline.md)** - Complete CI/CD pipeline documentation including GitHub Actions, Vercel, and Supabase integrations
- **[Deployment](./ops/deployment.md)** - Complete deployment guide including build, hosting, runners, and versioning
- **[Migrations](./ops/migrations.md)** - Database migration guide with critical rules
- **[Migration Rules Quick Reference](./ops/migration-rules-quick-reference.md)** - Quick reference for migration best practices
- **[Local Supabase Development](./ops/local-supabase-development.md)** - Complete guide for local Supabase setup, edge function development, and migration synchronization
- **[Disaster Recovery](./ops/disaster-recovery.md)** - Database backup and point-in-time recovery procedures

## 🎯 Quick Navigation

### For New Developers
1. Start with **[Developer Onboarding](./getting-started/developer-onboarding.md)** - 5-minute quick start
   - Preferred setup path: use 1Password CLI + `.\dev-start.bat` to auto-sync env files
2. Read **[Development Lifecycle](./getting-started/development-lifecycle.md)** - Understand how work moves from plan to production
3. Review [Architecture](./technical/architecture.md) - Understand system design
4. Read [Standards](./technical/standards.md) - Learn coding standards and UI patterns
5. See [Setup Guide](./technical/setup.md) for detailed configuration options
6. Check [Troubleshooting](./getting-started/troubleshooting.md) if you encounter issues

### For System Administrators
1. **READ FIRST**: [Migrations](./ops/migrations.md) - ⚠️ **CRITICAL** migration rules
2. Review [Deployment](./ops/deployment.md) - Multi-platform deployment
3. Understand [Architecture](./technical/architecture.md) - System design
4. Monitor [Workflows](./guides/workflows.md) - User processes

### For End Users
1. Open the in-app **Support Library** at `/dashboard/support` (or `/support` while
   signed out) — the authoritative source of step-by-step walkthroughs.
2. For field technicians, print the [Image Upload Quick Reference](./how-to/image-upload/quick-reference-card.md).
3. For RBAC questions, see [Permissions](./guides/permissions.md).

### For DevOps Engineers
1. **READ FIRST**: [Migrations](./ops/migrations.md) - ⚠️ **CRITICAL** migration rules
2. Study [CI/CD Pipeline](./ops/ci-cd-pipeline.md) - Complete pipeline documentation
3. Study [Deployment](./ops/deployment.md) - Complete deployment guide
4. Review [Disaster Recovery](./ops/disaster-recovery.md) - Backup and PITR procedures
5. Review [Architecture](./technical/architecture.md) - System architecture
6. Reference [Migration Rules Quick Reference](./ops/migration-rules-quick-reference.md) - Quick reference

## 📁 Additional Resources

### Archived Documentation
- **[Historical Fixes](./archive/historical-fixes/)** - Historical documentation of fixes and improvements

### PM Templates
- **[PM Checklists](./pm-templates/)** - Preventative maintenance checklist templates

### Root Cause Analysis
- **[RCA Documents](./rca/)** - Root cause analysis documents

## 🔍 Finding Information

### Search Tips
- Use Ctrl+F (Cmd+F) to search within documents
- Check the table of contents in each document
- Cross-references are provided between related topics

### Common Topics

#### Authentication & Security
- [Architecture - Security](./technical/architecture.md#security-architecture)
- [Permissions](./guides/permissions.md)
- [Setup - Troubleshooting](./technical/setup.md#troubleshooting-common-issues)

#### Database & Data Management
- [Architecture - Database Schema](./technical/architecture.md#database-schema)
- [Migrations](./ops/migrations.md) - Migration strategies
- [API Reference](./technical/api-reference.md) - Data access patterns

#### Development Workflow
- [Setup Guide](./technical/setup.md) - Getting started
- [Standards](./technical/standards.md) - Development patterns
- [Architecture - Component Patterns](./technical/architecture.md#component-design-patterns)

#### Deployment & DevOps
- [CI/CD Pipeline](./ops/ci-cd-pipeline.md) - GitHub Actions, Vercel, Supabase integrations
- [Deployment Guide](./ops/deployment.md) - Platform-specific deployment
- [Migrations](./ops/migrations.md) - Database migrations
- [Local Supabase Development](./ops/local-supabase-development.md) - Local development setup and edge function workflow
- [Disaster Recovery](./ops/disaster-recovery.md) - Database backup and PITR restoration
- [Architecture - Performance](./technical/architecture.md#performance-architecture)

#### Business Logic & Features
- [Workflows](./guides/workflows.md) - Work order and image upload processes
- [Permissions](./guides/permissions.md) - Access control

## 📋 Documentation Hierarchy (Sources of Truth)

To avoid redundancy and ensure consistency, each topic has a single **source of truth**. Other docs should summarize and link, not duplicate.

| Topic | Source of Truth | Derived/Summary Docs |
|-------|-----------------|---------------------|
| Developer setup | `getting-started/developer-onboarding.md` | `technical/setup.md` (detailed config only) |
| Troubleshooting | `getting-started/troubleshooting.md` | Remove troubleshooting from other docs, link here |
| Database migrations | `ops/migrations.md` | `ops/migration-rules-quick-reference.md` (checklist) |
| CI/CD pipeline | `ops/ci-cd-pipeline.md` | — |
| Deployment | `ops/deployment.md` | — |
| Coding standards | `technical/standards.md` | `.github/instructions/*.md` (reviewer checklists) |
| Testing | `technical/testing-guidelines.md` | — |

**For AI/reviewer checklists** (`.github/instructions/*`, `.github/copilot-instructions.md`):
- These are short checklists for code review, not comprehensive documentation
- They should reference the full docs above, not duplicate content

## 🤝 Contributing to Documentation

### Documentation Standards
- Use clear, concise language
- Include code examples where applicable
- Provide step-by-step instructions
- Add troubleshooting sections
- Include visual diagrams when helpful

### How to Contribute
1. **Identify gaps** - Missing information or outdated content
2. **Create/update documentation** - Follow existing format and style
3. **Test instructions** - Ensure all steps work correctly
4. **Submit changes** - Follow the standard PR process
5. **Update this index** - Add new documents to the navigation

## 📞 Getting Help

### Internal Resources
- **Documentation Issues**: Create GitHub issues for missing or incorrect docs
- **Technical Questions**: Use GitHub Discussions
- **Code Reviews**: Include documentation updates in PRs

### External Resources
- **Supabase Documentation**: [https://supabase.com/docs](https://supabase.com/docs)
- **React Documentation**: [https://react.dev](https://react.dev)
- **TypeScript Handbook**: [https://www.typescriptlang.org/docs](https://www.typescriptlang.org/docs)
- **Tailwind CSS**: [https://tailwindcss.com/docs](https://tailwindcss.com/docs)

---

**Last Updated**: January 2026  
**Maintained by**: EquipQR™ Development Team  
**Feedback**: Create GitHub issues for documentation improvements
