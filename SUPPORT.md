# Support

Get help with **EquipQR™** — the fleet equipment management platform from Columbia Cloudworks LLC.

## Overview

EquipQR™ helps organizations track equipment, manage work orders, and coordinate maintenance teams. This document explains how to get support, where to report issues, and where to find answers.

---

## Getting Help

### 1. Check the documentation first

Many questions are answered in the project docs:

| Need | Resource |
| ---- | -------- |
| **Setup & configuration** | [Setup Guide](docs/technical/setup.md) |
| **Something’s broken** | [Troubleshooting Guide](docs/getting-started/troubleshooting.md) |
| **Developer onboarding** | [Developer Onboarding](docs/getting-started/developer-onboarding.md) |
| **Architecture & API** | [Architecture](docs/technical/architecture.md), [API Reference](docs/technical/api-reference.md) |
| **Deployment & ops** | [Deployment](docs/ops/deployment.md), [Migrations](docs/ops/migrations.md), [CI/CD](docs/ops/ci-cd-pipeline.md) |
| **Full doc index** | [Documentation README](docs/README.md) |

### 2. Run quick diagnostics

If the app won’t start or behaves oddly, run:

```bash
npm run type-check
npm run lint
npm run test
npm run build
```

See the [Troubleshooting Guide](docs/getting-started/troubleshooting.md) for environment checks, Supabase connection issues, and common errors.

---

## Reporting Issues

We use **GitHub Issues** for bugs, feature requests, and general questions.

### Before you report

1. **Search existing issues** to avoid duplicates.
2. **Use the latest version** (check the app footer or `package.json`).
3. **Skim the docs** above — your answer may already be there.

### How to report

- **Bugs**: [Open an issue](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/new) with a clear summary, steps to reproduce, expected vs actual behavior, and your environment (browser/OS, EquipQR version, role).
- **Feature requests**: Same link; describe the use case, proposed solution, and who it helps.
- **Questions**: Open an issue and add the `question` label, or use [GitHub Discussions](https://github.com/Columbia-Cloudworks-LLC/EquipQR/discussions) if you prefer.

Detailed templates and labels (e.g. `bug`, `enhancement`, `documentation`) are in [CONTRIBUTING.md – Reporting Issues](CONTRIBUTING.md#reporting-issues).

---

## Customer support

If you’re an **EquipQR customer** (e.g. production or pilot) and need direct support:

- **Email:** [nicholas.king@columbiacloudworks.com](mailto:nicholas.king@columbiacloudworks.com)

Please include:

- Your organization name  
- Short description of the issue or request  
- Any error messages or screenshots  
- Urgency (e.g. critical, high, normal, low)

---

## Contributing

To contribute code or docs:

- Read [CONTRIBUTING.md](CONTRIBUTING.md) for branching, PRs, and coding guidelines.
- Use [GitHub Pull Requests](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pulls) for changes.

---

## External resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**EquipQR™** · [Columbia Cloudworks LLC](https://columbiacloudworks.com) · [Repository](https://github.com/Columbia-Cloudworks-LLC/EquipQR)
