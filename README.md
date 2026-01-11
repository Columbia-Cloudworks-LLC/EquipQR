<div align="center">

# <a href="https://equipqr.app">EquipQR</a>™

<a href="https://equipqr.app"><img src="public/icons/EquipQR-Icon-Purple-Medium.png" alt="EquipQR™ Logo" width="150" /></a>

## 🚜 Fleet Equipment Management Platform 🚧

![Version](https://img.shields.io/badge/version-1.7.12-blue?style=for-the-badge)

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

## 📚 Documentation

Detailed documentation is located in the [`/docs`](./docs/README.md) directory:

* **🚀 Getting Started**: [Setup Guide](./docs/technical/setup.md) & [Developer Onboarding](./docs/getting-started/developer-onboarding.md)
* **🏗️ Architecture**: [System Architecture](./docs/technical/architecture.md) & [Database Schema](./docs/technical/architecture.md#database-schema)
* **📘 Guides**: [Workflows](./docs/guides/workflows.md) & [Permissions](./docs/guides/permissions.md)
* **⚙️ Operations**: [Deployment](./docs/ops/deployment.md), [Migrations](./docs/ops/migrations.md) & [Local Supabase Development](./docs/ops/local-supabase-development.md)

## 🛠️ Quick Start

1. **Clone & Install**

    ```bash
    git clone https://github.com/Columbia-Cloudworks-LLC/EquipQR
    cd equipqr && npm i
    ```

2. **Configure Environment**
    Copy the example environment file and configure your Supabase credentials.

    ```bash
    cp .env.example .env
    ```

    > See [Setup Guide](./docs/technical/setup.md) for required API keys.

3. **Run Development Server**

    ```bash
    npm run dev
    ```

## 🧪 Testing

```bash
npm run test          # Run unit tests
npm run test:coverage # Run with coverage report

```

## 📄 License

Copyright © 2025 <a href="https://columbiacloudworks.com">Columbia Cloudworks LLC</a>. All rights reserved.
