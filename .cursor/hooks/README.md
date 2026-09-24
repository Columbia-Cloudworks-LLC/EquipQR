# Linux editor hooks

`.cursor/hooks.json` invokes `workflow.sh` for migration guards, changelog reminders,
lint, type checking, related tests, and local type generation. Python hooks run
with `python3`. The editor must execute inside Linux/WSL with the project toolchain.

The lint hook fails closed on invalid JSON and failed tooling. The shared catalog
checks TypeScript, Markdown, Bash with ShellCheck, and Actions with actionlint.
Fallow is project-only. Type generation preserves the existing file if Supabase
fails or its output lacks the expected TypeScript anchors.

Run `npm run test:linux` for offline hook and workflow contract checks.
