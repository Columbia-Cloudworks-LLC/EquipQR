# Local Supabase Development Guide

This guide covers setting up your local environment to work with Supabase, including cloning production data, working on edge functions, and ensuring migrations stay synchronized.

## Prerequisites

### Required Software

- **Node.js** (v22.x recommended, v20.x supported) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) - We use npm exclusively
- **Docker** - Required for local Supabase instance ([Download here](https://www.docker.com/products/docker-desktop))
- **Git** - [Download here](https://git-scm.com/)

### Supabase CLI Installation

**⚠️ IMPORTANT: Supabase CLI should NOT be installed globally.**

The Supabase CLI is included as a dev dependency in this project. After running `npm ci`, you can use it via `npx`:

```bash
# Install project dependencies (includes Supabase CLI)
npm ci

# Verify Supabase CLI is available
npx supabase --version
```

**Why not global installation?**
- Global installation via `npm install -g supabase` is not supported by Supabase
- Using `npx supabase` ensures you're using the version specified in the project
- Prevents version conflicts between different projects
- Ensures all team members use the same CLI version

## Step-by-Step Local Setup

> **⚠️ IMPORTANT: This is now the standard workflow for database development.**
> 
> All database development should be done locally first, then deployed to production. This setup guide will get you started with local Supabase development.

### Step 1: Install Dependencies

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd equipqr

# Install all dependencies including Supabase CLI
npm ci
```

### Step 2: Link to Remote Supabase Project

Link your local environment to the production project:

```bash
# Login to Supabase
npx supabase login

# Link to your production project (project ID from config.toml)
npx supabase link --project-ref ymxkzronkhwxzcdcbnwq
```

This syncs your local `supabase/config.toml` with the remote project configuration.

### Step 3: Pull Migrations from Production (Initial Sync Only)

Pull all migrations to ensure your local migrations match production:

```bash
# Pull migrations from remote (for initial setup)
npx supabase db pull

# Verify migrations are in sync
npx supabase migration list
```

**Important**: 
- This step is primarily for **initial setup** to sync existing migrations from production
- After initial setup, you'll develop new migrations locally first
- After pulling, verify migrations match production using the validation script:

```bash
node scripts/supabase-fix-migrations.mjs
```

### Step 4: Pull Edge Functions from Production

Pull edge functions to get the latest versions:

```bash
# Pull all edge functions
npx supabase functions pull

# Or pull specific function
npx supabase functions pull quickbooks-oauth-callback
```

### Step 5: Start Local Supabase Instance

Start a local Supabase instance (PostgreSQL, PostgREST, Auth, Storage, Edge Functions):

```bash
# Start local Supabase (includes database, API, auth, storage, and edge functions)
npx supabase start
```

This will:
- Start PostgreSQL on port `54322`
- Start PostgREST API on port `54321`
- Start Auth service
- Start Storage service
- Start Edge Functions runtime

**Note**: First run downloads Docker images and may take a few minutes.

**Get local credentials**:
```bash
# View local Supabase status and credentials
npx supabase status
```

### Step 6: Set Up Local Environment Variables

Create a `.env.local` file for local Supabase development:

```bash
# Copy example environment file
cp .env.example .env.local
```

Edit `.env.local` with local Supabase credentials (from `npx supabase status` output):

```env
# Local Supabase URLs (from 'supabase start' output)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<local-anon-key-from-supabase-start-output>

# For edge functions that need service role
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key-from-supabase-start-output>
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<local-anon-key>

# QuickBooks (use sandbox credentials for local dev)
INTUIT_CLIENT_ID=<your-sandbox-client-id>
INTUIT_CLIENT_SECRET=<your-sandbox-client-secret>
QUICKBOOKS_SANDBOX=true
PRODUCTION_URL=http://localhost:8080
# CRITICAL: Must match VITE_QB_OAUTH_REDIRECT_BASE_URL in client .env
QB_OAUTH_REDIRECT_BASE_URL=http://localhost:54321

# Google Workspace Integration (if testing locally)
GOOGLE_OAUTH_CLIENT_ID=<your-google-oauth-client-id>
GOOGLE_OAUTH_CLIENT_SECRET=<your-google-oauth-client-secret>
GW_OAUTH_REDIRECT_BASE_URL=http://localhost:54321
TOKEN_ENCRYPTION_KEY=<generate-with-openssl-rand-base64-32>
KDF_SALT=<generate-unique-salt-with-openssl-rand-base64-32>

# Other required secrets
RESEND_API_KEY=<your-resend-key>
HCAPTCHA_SECRET_KEY=<your-hcaptcha-secret>
```

> **📋 Full Reference**: See `env.example` in the project root for a complete list of all environment variables with descriptions and file references.

## Working on Edge Functions Locally

### Starting the Edge Functions Server

For QuickBooks edge functions (or any edge function):

```bash
# Serve all functions locally
npx supabase functions serve

# Or serve specific function
npx supabase functions serve quickbooks-oauth-callback

# With hot reload and environment variables
npx supabase functions serve --env-file .env.local
```

### Testing Edge Functions Locally

1. **Functions run at**: `http://localhost:54321/functions/v1/<function-name>`
2. **Use local anon key** for authenticated requests
3. **Check logs** in the terminal where you're running `supabase functions serve`

**Example: Test QuickBooks OAuth callback**:
```bash
curl -X POST http://localhost:54321/functions/v1/quickbooks-oauth-callback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <local-anon-key>" \
  -d '{"code": "test", "state": "test"}'
```

### Development Workflow for Edge Functions

1. **Create a feature branch**:
```bash
git checkout -b feature/quickbooks-edge-function-update
```

2. **Make changes to edge functions**:
   - Edit files in `supabase/functions/quickbooks-oauth-callback/`
   - Test locally using `npx supabase functions serve`
   - Verify functionality before committing

3. **Test thoroughly**:
   - Test all code paths
   - Verify error handling
   - Check logs for issues

4. **Before committing**:
   - Ensure migrations are in sync (see the "Migration Management" section below)
   - Verify no migrations were accidentally modified
   - Run validation scripts

## Migration Management

> **⚠️ IMPORTANT: Local-First Development**
> 
> **All database migrations must be developed and tested locally before deploying to production.**
> 
> The standard workflow is:
> 1. **Create migration locally**
> 2. **Test locally** with `npx supabase db reset`
> 3. **Deploy to production** only after successful local testing

### Creating New Migrations

**Standard workflow for creating new migrations:**

1. **Create the migration file**:
   ```bash
   npx supabase migration new your_migration_name
   ```

2. **Write your migration SQL** in the generated file in `supabase/migrations/`

3. **Test locally** (REQUIRED before production deployment):
   ```bash
   # Reset local database and apply all migrations (including your new one)
   npx supabase db reset
   
   # Verify schema matches expectations
   npx supabase db diff
   ```

4. **Deploy to production** (only after local testing succeeds):
   ```bash
   npx supabase db push --linked
   ```

### Verifying Migrations Before Committing

**CRITICAL**: Before committing, verify migrations match production:

```bash
# Check migration filenames are valid
node scripts/supabase-fix-migrations.mjs

# Verify no migrations were accidentally modified
git diff supabase/migrations/

# Check for missing migrations
node scripts/check-missing-migrations.mjs
```

### Migration Safety Rules

1. **Never modify existing migration files**:
   - If a migration is already in production, do NOT change it
   - Create a new migration to fix issues

2. **If you accidentally modified a migration**:
```bash
# Checkout the original version from main/master
git checkout main -- supabase/migrations/<migration-file>

# Or reset all migrations to match main
git checkout main -- supabase/migrations/
```

3. **Production is the source of truth**:
   - Always check production migrations before making changes
   - Use Supabase MCP tools or Dashboard to verify production state
   - Local files must match production timestamps exactly

## Testing Before Committing

### 1. Test Edge Function Locally

```bash
# Start local Supabase
npx supabase start

# Serve functions
npx supabase functions serve --env-file .env.local

# Test your function (use Postman, curl, or your app)
```

### 2. Test Database Changes (if any)

```bash
# Reset local DB and apply all migrations
npx supabase db reset

# Verify schema matches expectations
npx supabase db diff
```

### 3. Verify Migrations Match Production

```bash
# Check for missing migrations
node scripts/check-missing-migrations.mjs

# Validate migration filenames
node scripts/supabase-fix-migrations.mjs
```

## Commit Workflow

### Only Commit When Confirmed Working

1. **Stage only the files you want**:
```bash
# Stage edge function changes
git add supabase/functions/quickbooks-oauth-callback/

# Stage new migrations (if any)
git add supabase/migrations/<new-migration-if-any>

# Review what you're committing
git status
```

2. **Commit**:
```bash
git commit -m "feat: update QuickBooks edge function"
```

3. **Push**:
```bash
git push origin feature/quickbooks-edge-function-update
```

## Deploying Edge Functions

After testing locally and confirming everything works:

```bash
# Deploy specific function
npx supabase functions deploy quickbooks-oauth-callback

# Or deploy all functions
npx supabase functions deploy

# Deploy with secrets (set in Supabase Dashboard)
# Secrets must be configured separately in Dashboard > Edge Functions > Secrets
```

## Syncing Migrations After Deployment

After deploying migrations to production:

1. **Pull latest migrations**:
```bash
npx supabase db pull
```

2. **Verify sync**:
```bash
node scripts/check-missing-migrations.mjs
node scripts/supabase-fix-migrations.mjs
```

## Best Practices Summary

### 1. Develop and Test Locally First (PRIMARY WORKFLOW)

**This is the standard workflow for all database development:**

```bash
# Start local Supabase instance
npx supabase start

# Create and test migrations locally
npx supabase migration new your_migration_name
npx supabase db reset  # Test the migration

# Test edge functions locally
npx supabase functions serve --env-file .env.local
```

**Key principle**: All database changes must be tested locally with `npx supabase db reset` before deploying to production.

### 2. Sync with Production (Initial Setup Only)

**Pull from production for initial setup or to sync existing migrations:**

```bash
# Pull migrations from production (for initial sync or to get latest changes)
npx supabase db pull
npx supabase functions pull
```

**Note**: This is primarily for initial setup or when syncing changes made by other developers. Your daily workflow should be local-first.

### 3. Never Modify Existing Migrations

- Check `git log` to see if a migration was already deployed
- Use `node scripts/check-missing-migrations.mjs` to verify
- Production is the source of truth for migration timestamps
- If a migration is already in production, create a new migration to fix issues

### 4. Use Validation Scripts

```bash
# Before every commit
node scripts/supabase-fix-migrations.mjs

# Check for missing migrations
node scripts/check-missing-migrations.mjs
```

### 5. Deploy to Production Only After Local Testing

**Only deploy after successful local testing:**

```bash
# Deploy migrations to production (after local testing succeeds)
npx supabase db push --linked

# Deploy edge functions to production
npx supabase functions deploy
```

## Troubleshooting

### Migrations Out of Sync

```bash
# 1. Check what's in production (use Supabase MCP tools or Dashboard)
# 2. Pull from production
npx supabase db pull

# 3. If local has extra migrations not in production, check if they were deployed
# 4. If production has migrations not in local, they will be pulled by db pull
# 5. Never rename migrations that are already in production
```

### Edge Functions Won't Start

```bash
# Check Supabase is running
npx supabase status

# Restart Supabase
npx supabase stop
npx supabase start

# Check function logs
npx supabase functions serve --debug
```

### Docker Issues

If Docker is not running or having issues:

```bash
# Check Docker status
docker ps

# Restart Docker Desktop
# Then restart Supabase
npx supabase stop
npx supabase start
```

### Port Conflicts

If ports 54321 or 54322 are already in use:

```bash
# Stop Supabase
npx supabase stop

# Check what's using the ports
# Windows: netstat -ano | findstr :54321
# Mac/Linux: lsof -i :54321

# Stop conflicting services or change Supabase ports in config.toml
```

## Common Commands Reference

```bash
# Supabase CLI commands (always use npx)
npx supabase --version              # Check version
npx supabase login                   # Login to Supabase
npx supabase link --project-ref <id> # Link to project
npx supabase start                   # Start local instance
npx supabase stop                    # Stop local instance
npx supabase status                  # Check status
npx supabase db pull                 # Pull migrations
npx supabase db push                 # Push migrations
npx supabase db reset                # Reset local database
npx supabase migration list          # List migrations
npx supabase migration new <name>    # Create new migration
npx supabase functions serve         # Serve functions locally
npx supabase functions deploy <name> # Deploy function
npx supabase functions pull          # Pull functions from remote
npx supabase gen types typescript --local > src/integrations/supabase/types.ts  # Generate types

# Validation scripts
node scripts/supabase-fix-migrations.mjs      # Validate migration filenames
node scripts/check-missing-migrations.mjs    # Check for missing migrations
```

## Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli/introduction)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Edge Functions Development](https://supabase.com/docs/guides/functions/local-development)
- [Database Migrations Guide](./migrations.md)

This workflow ensures your migrations stay in sync with production and allows you to test edge functions locally before committing changes.

