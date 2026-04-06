<div align="center">

# <a href="https://equipqr.app">EquipQR</a>™

<a href="https://equipqr.app"><img src="public/icons/EquipQR-Icon-Purple-Medium.png" alt="EquipQR™ Logo" width="150" /></a>

## 🚜 Fleet Equipment Management Platform 🚧

![Version](https://img.shields.io/badge/version-2.9.0-blue?style=for-the-badge)

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-%2344a833.svg?style=for-the-badge&logo=vitest&logoColor=white)

![License](https://img.shields.io/badge/license-Proprietary-lightgrey?style=for-the-badge)

</div>

---

## 🚀 Overview

**EquipQR™** is a comprehensive fleet equipment management platform built for speed and reliability. It features QR code integration for instant equipment access, robust work order management, and real-time fleet visualization.

## ✨ Key Features

* **📱 Equipment Tracking**: Instant access via QR codes.
* **📋 Work Orders**: Create, assign, and track maintenance tasks.
* **🗺️ Fleet Map**: Interactive location tracking with Google Maps.
* **👥 Team Management**: Role-based access and team organization.
* **⚡ Real-time**: Live updates via Supabase Realtime.
* **🛡️ Privacy Requests (CCPA/CPRA)**: Public `/privacy-request` intake, DSR case workflow, and retention-safe evidence tracking.
* **🔒 Sensitive PI Controls**: User-level "Limit sensitive personal information" setting respected in scan/location flows.

## 📚 Documentation

Detailed documentation is located in the [`/docs`](./docs/README.md) directory:

* **🚀 Getting Started**: [Setup Guide](./docs/technical/setup.md) & [Developer Onboarding](./docs/getting-started/developer-onboarding.md)
* **🏗️ Architecture**: [System Architecture](./docs/technical/architecture.md) & [Database Schema](./docs/technical/architecture.md#database-schema)
* **📘 Guides**: [Workflows](./docs/guides/workflows.md) & [Permissions](./docs/guides/permissions.md)
* **⚙️ Operations**: [Deployment](./docs/ops/deployment.md), [Migrations](./docs/ops/migrations.md), [Local Supabase Development](./docs/ops/local-supabase-development.md), [DSR Compliance Runbook](./docs/ops/dsr-compliance-runbook.md) & [Disaster Recovery](./docs/ops/disaster-recovery.md)

## ✅ Prerequisites (Accounts & Services)

EquipQR uses external services. For exact environment variables and where they’re used, see [`.env.example`](./.env.example) (source of truth) and the [Setup Guide](./docs/technical/setup.md).

**Required (to run the core app):**

* **Supabase**: Create a project (URL + anon key) and configure Supabase Auth (email/password; optionally Google).

**Optional (feature-dependent):**

* **Resend**: Invitation emails (`RESEND_API_KEY`).
* **Google sign-in (Supabase Auth provider)**: Google OAuth app + provider config in Supabase.
* **Google Workspace integration**: Google Cloud OAuth client + Admin SDK API enabled (directory sync).
* **Google Picker (for Google Docs destination selection)**: Browser API key + Google Cloud project number, using the same OAuth web client as Google Workspace (`VITE_GOOGLE_PICKER_API_KEY`, `VITE_GOOGLE_PICKER_APP_ID`, `VITE_GOOGLE_WORKSPACE_CLIENT_ID`) in the same Google Cloud project. Do not create a separate Picker OAuth client (`VITE_GOOGLE_PICKER_CLIENT_ID` is not used).
* **QuickBooks Online**: Intuit developer app + OAuth credentials (feature-flagged).
* **Google Maps**: Fleet Map feature.
* **hCaptcha**: Bot protection on signup.
* **hCaptcha (privacy requests)**: Bot protection for `/privacy-request` when `VITE_HCAPTCHA_SITEKEY` and `HCAPTCHA_SECRET_KEY` are configured.
* **Web Push**: VAPID keys for push notifications.

## 🛠️ Quick Start

1. **Clone & Install**

    ```bash
    git clone https://github.com/Columbia-Cloudworks-LLC/EquipQR
    cd equipqr && npm i
    ```

    > Note: This repo intentionally installs `xlsx` from `cdn.sheetjs.com` (not npm registry). Ensure your CI and network policy allow access to that host during `npm install`.

2. **Configure Environment**
    Preferred: if you have access, use 1Password CLI + `.\dev-start.bat` so env files are synced automatically.

    ```powershell
    op --version
    .\dev-start.bat                    # full stack (Supabase + functions + Vite)
    ```

    Manual fallback:

    ```bash
    cp .env.example .env
    ```

    > See [Setup Guide](./docs/technical/setup.md) for required API keys.

3. **Run Development Server**

    ```powershell
    .\dev-start.bat
    ```

### Git Worktrees (Cursor-friendly)

When working from a git worktree, copy env files from your canonical checkout:

```powershell
.\scripts\bootstrap-worktree-env.ps1 -SourcePath "<canonical-repo-path>"
```

Add `-InstallDependencies` to run `npm ci` as part of bootstrap.

## 🧪 Testing

```bash
npm run test          # Run unit tests
npm run test:coverage # Run with coverage report

```

## 📄 License

Copyright © 2025 <a href="https://columbiacloudworks.com">Columbia Cloudworks LLC</a>. All rights reserved.
