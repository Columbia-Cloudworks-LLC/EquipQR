# Developer setup

The supported developer environment is Ubuntu 24.04, either directly or through
WSL2. Keep the repository under `~/projects/EquipQR` on the Linux filesystem.
Use Bash for setup and developer orchestration. Do not add PowerShell wrappers,
Windows Node, Docker Desktop, or Windows credential-store dependencies.

Follow [Linux development](../ops/linux-development.md) for installation, stack
lifecycle, Codex configuration, service URLs, and the hosted backend exception.

```bash
sudo bash dev/linux/install-system.sh
sudo bash dev/linux/install-docker.sh
# Open a new Linux session after adding yourself to the docker group.
bash dev/linux/setup.sh
source dev/linux/env.sh
npm run dev
```

The system installer uses Ubuntu packages. The project installer pins Node,
installs both npm lockfiles, and downloads the matching Playwright Chromium and
its system libraries. Installing browser system libraries may require sudo.
Run project dependency installation as the development user, not root.

For agent commands without an interactive shell, use
`bash dev/linux/run.sh npm run type-check` (or any other Linux command).
For a terminal, run `source dev/linux/env.sh` once. This selects the same pinned
Node version used by the launcher and preserves cloud proxy configuration.

| Task | Linux command |
| --- | --- |
| Start app, docs, and backend | `npm run dev` |
| Health check | `npm run dev:status` |
| Stop managed services | `npm run dev:stop` |
| Reset disposable local database | `npm run dev:reset` |
| Install locked dependencies | `npm run ci:install` (stop the stack first) |
| Static type check | `npm run type-check` |
| Unit/component tests | `npm run test:unit` / `npm run test:component` |
| Browser smoke | `npm run test:e2e` |
| Full browser regression with local reset | `npm run test:e2e:local-full` |
| Database tests | `npm run test:db` |
| Create migration | `npm run db:migration:new -- migration_name` |
| App/docs builds | `npm run build` / `npm run docs:build` |
| Core verification sequence | `bash dev/linux/verify.sh` |

The fixture regression suites require the disposable local backend. They must
not run against a shared hosted database. Codex cloud can run static checks,
unit/component tests, builds, and explicitly scoped browser checks against the
approved development backend; database changes require local container testing.

The Windows convenience launcher is `dev/equipqr.bat`. It invokes the same Linux
startup command and opens the app in a browser after startup succeeds. It contains
no dependency installation, database configuration, or application logic.
