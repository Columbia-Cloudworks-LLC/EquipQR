# Cursor Hooks

These hooks are Windows-specific and require PowerShell. They will not work on Unix-like systems (Linux, macOS) unless PowerShell Core is installed.

**Note:** This project's primary development platform is Windows. The hooks are designed for Windows development environments using PowerShell.

## Available Hooks

- `sync-types.ps1` - Syncs TypeScript types after file edits
- `run-tests.ps1` - Runs tests after file edits
- `guard-migrations.ps1` - Guards against reading migration files incorrectly
- `component-check.py` - Fuzzy-searches existing components before the agent creates a new one
- `strict-type-check.ps1` - Blocks edits that introduce explicit `: any` types in `.ts`/`.tsx` files and runs `tsc --noEmit`
- `secret-guardian.py` - Scans prompts and shell commands for hardcoded secrets (Stripe keys, Supabase service-role keys, QBO refresh tokens) and blocks the action if detected
- `architecture-guard.py` - Enforces layered-architecture import rules: blocks UI components from importing features (UI Purity), warns on cross-feature imports (Feature Isolation)

## Cross-Platform Support

These hooks use PowerShell syntax and are designed for Windows development environments. For cross-platform support, consider:

1. Installing PowerShell Core on Unix-like systems
2. Creating equivalent bash scripts for Unix-like systems
3. Using a cross-platform task runner like npm scripts

## Configuration

Hooks are configured in `.cursor/hooks.json`. The current configuration uses PowerShell commands that are Windows-specific.
