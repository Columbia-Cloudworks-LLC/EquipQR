# Linux development (WSL2 and Codex cloud)

Use the same Linux scripts for installation and stack lifecycle in both environments.
Windows only launches WSL; Node, Docker Engine, Supabase, Vite, and VitePress run in Linux.
Docker Desktop and Windows Node/PowerShell are not runtime dependencies.

**Validation on 2026-09-24:** the WSL2 stack passes startup, restart, login,
dashboard/equipment navigation, docs rendering, and the database-backed Edge health
check. The existing Codex cloud environment cannot run local containers: ordinary
network namespaces are denied, and an actual Docker 29.8.1 rootless trial fails at
`newuidmap: write to uid_map failed: Operation not permitted`. A Docker-capable
cloud host would be required for identical backend hosting. The approved exception
uses an existing non-production Supabase branch in Codex cloud; the frontend,
documentation, Node version, and lifecycle implementation remain the same.

After setup, run `bash dev/linux/dev.sh start` and `bash dev/linux/dev.sh status`.
Require all four health checks to pass: app, documentation, authentication, and
the database-backed Edge Function. Cloud capacity errors require a new environment
test; they do not establish whether the application setup works.

## First setup

Use Ubuntu 24.04. Keep the checkout on
the Linux filesystem, outside `/mnt/c` and OneDrive:

```bash
bash dev/linux/setup.sh
bash dev/linux/dev.sh start    # Idempotent; retain database data
bash dev/linux/dev.sh status   # Nonzero if any required service is unhealthy
bash dev/linux/dev.sh stop     # Stop managed processes and this Supabase stack
bash dev/linux/dev.sh reset    # Explicitly erase/reseed this local database
```

The same actions are accepted by `equipqr.bat`. Stop before reinstalling packages.
Logs and process records live in `tmp/linux-stack/`. Concurrent lifecycle commands
are rejected with exit code 75. Process identity includes Linux boot ID and process
start time, preventing stale PID records from killing unrelated processes.

| Service | URL |
| --- | --- |
| App | <http://localhost:8080> |
| Help center | <http://localhost:5174> |
| Supabase API | <http://localhost:54321> |
| Supabase Studio | <http://localhost:54323> |
| Local email inbox | <http://localhost:54324> |

The committed test accounts use `password123`; start with `owner@apex.test`.
The startup health check calls an Edge Function that queries the local database.
First startup and reset also upload the committed UUID-named equipment photos,
organization logos, and team images into local storage. Subsequent starts retain
those images; the legacy custom drop-folder media workflow is not run.
Ports must be available; the scripts do not terminate unrelated services or choose
different ports silently.

## Local configuration and external integrations

The launcher creates an ignored Supabase working directory with project ID
`equipqr-linux`, using the repository migrations, seeds, and functions. Production
configuration and linked project state are not modified. Database data persists in
Docker volumes. `reset` is the only command that deliberately clears it.

The core stack does not require production credentials, hosted Supabase branches,
or a 1Password login. Google sign-in is disabled in the generated configuration
when its development OAuth credentials are absent; test email/password login works.
Optional app configuration comes from `.env`, `.env.local`, and the process
environment. In local mode, the launcher overrides the browser's Supabase URL/key to use
the local stack. Edge integration settings may be supplied through
`supabase/functions/.env`; Supabase URL and keys are injected by the local CLI.
Keep these files ignored and source integration credentials according to
[agent secrets and access](agent-secrets-and-access.md).

For Google sign-in, supply `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and
`SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`. For Google Workspace, QuickBooks, Maps,
email, and other third-party services, use the relevant development credentials
and registered callback URLs. Startup does not claim those integrations work
without them. Restart the full stack after configuration changes.

## Codex cloud

Use `bash dev/linux/codex-setup.sh` as the environment setup command. It explicitly
selects hosted mode and installs the same locked dependencies and Chromium.
It does not start servers during setup. It persists the three non-secret backend
settings in ignored `.env.local`, so subsequent `dev.sh` commands work in task shells.
Start the app in the agent phase with `bash dev/linux/dev.sh start`.
Keep agent internet access enabled for dependency hosts and the exact development
backend hostname, allowing the HTTP methods needed by authentication and CRUD.
Select `preview` when starting a task and use the repository setup command above.
The installer selects the exact Node version from `.node-version`, even when the
cloud image initially supplies an older Node version. Use `bash dev/linux/run.sh`
before commands such as `npm test` to select that same runtime in fresh shells.
The launcher enables Node's environment-proxy and system-CA support, keeping
loopback addresses outside the proxy. This is required for outbound cloud HTTPS.

The approved backend is persistent development branch `preview-persistent-v2`,
project `uzvtxxvgjzstndbyrwxg`, at
<https://uzvtxxvgjzstndbyrwxg.supabase.co>. Its public browser key is intentionally
included in the cloud setup script. No production service-role key is needed.
The branch has its own existing test data and deployed functions; it is not an
automatic mirror of local seed data or local Edge Function changes.

Hosted mode requires `EQUIPQR_BACKEND=hosted`, `EQUIPQR_DEV_SUPABASE_URL`, and
`EQUIPQR_DEV_SUPABASE_ANON_KEY`. It refuses known production endpoints, never
resets the hosted database, and leaves the backend running on `stop`.
Use the development account's existing password for cloud login; `password123`
applies only to the locally seeded accounts. Optional `VITE_DEV_TEST_PASSWORD`
must contain only a disposable development password because Vite exposes it to
the browser. It is not populated by this setup.

Use version-controlled repository scripts in the Codex environment. Publish
changes through a verified PR into `preview` before using them in cloud tasks.
Keep the saved setup command free of embedded snapshots and branch overrides.

Codex runs setup in a separate shell. Setup exports do not configure later task
shells, and setup secrets are removed before the agent phase. Put only public
development configuration in environment variables or the ignored config file.
Do not keep setup secrets alive by starting detached servers during setup.
Audit the existing cloud environment's secret entries before reuse; their names
include credentials that are unnecessary for frontend development. Their values
have not been audited for production scope.

In the Windows Codex app, choose **WSL** for the agent execution environment and
for the integrated terminal, then restart the app. Open the Linux checkout,
`/home/viralarchitect/projects/EquipQR`. Merely invoking `wsl.exe` from a Windows
agent does not make the agent itself Linux-based. This task began with a Windows
PowerShell execution environment; changing the app setting is still outstanding.

Official references: [Codex Windows app](https://learn.chatgpt.com/docs/windows/windows-app),
[WSL](https://learn.chatgpt.com/docs/windows/wsl),
[cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environment),
and [cloud network access](https://learn.chatgpt.com/docs/cloud/internet-access).

Backend hosting is the approved parity exception. Schema migration, seed, and
Edge Function development should be tested against local WSL2 containers;
deploying such changes to the shared cloud development branch is a separate action.
Third-party integrations still require their development credentials and callbacks.

## Administrative workflows

See [Bash workflow commands](linux-workflows.md) for secret synchronization,
ITIL, PR feedback, editor hooks, browser integration credentials, and media uploads.
The [migration map](linux-script-migration.md) accounts for each retired script.
`npm run test:linux` enforces the single Windows entrypoint policy.
Setup also installs the native 1Password CLI and checksum-verified Deno 2.9.7.
Vendor authentication is separate from installing these tools.
