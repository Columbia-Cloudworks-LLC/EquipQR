# Cursor Hooks

These hooks are Windows-specific and require PowerShell. They will not work on Unix-like systems (Linux, macOS) unless PowerShell Core is installed.

**Note:** This project's primary development platform is Windows. The hooks are designed for Windows development environments using PowerShell.

## Available Hooks

- `sync-types.ps1` - Syncs TypeScript types after file edits
- `run-tests.ps1` - Runs tests after file edits
- `guard-migrations.ps1` - Guards against reading migration files incorrectly
- `changelog-stop.ps1` - At the end of completed agent sessions, asks the agent to update `CHANGELOG.md` when relevant repo changes were made without a changelog entry
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

### Windows: keeping hook windows hidden

Cursor (a GUI process) spawns hook child processes without `CREATE_NO_WINDOW`,
so console-subsystem children can briefly flash a window that steals focus.
To keep hooks invisible, follow these conventions in `hooks.json` and any
script you add:

1. **PowerShell launcher** — always use:
   `powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File ...`
   The `-WindowStyle Hidden` flag suppresses the console window even if one is allocated.
2. **Python launcher** — use `pythonw` (the windowless interpreter) instead of `python`.
   Cursor pipes stdin/stdout, so `pythonw` reads/writes them correctly.
3. **Inside .ps1 scripts** — never wrap subprocesses in `cmd /c "npx ..."` or
   `cmd /c "git ..."`. Invoke executables directly with the call operator:
   `& npx.cmd vitest related $filePath --run` or `& git status --porcelain=v1`.
   This avoids spawning a transient `cmd.exe` console window.
