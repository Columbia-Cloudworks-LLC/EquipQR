<div align="center">

# <a href=https://equipqr.app>EquipQR</a>™

<a href="https://equipqr.app"><img src="public/eqr-icons/EquipQR-Icon-Purple-Medium.png" alt="EquipQR™ Logo" width="200" /></a>

## 🚜 Fleet Equipment Management Platform 🚧

A comprehensive fleet equipment management platform built with React, TypeScript, and modern web technologies.

</div>

## 🚀 Features

- **Equipment Tracking**: QR code integration for quick equipment access
- **Work Order Management**: Create, assign, and track maintenance work orders
- **Team Management**: Organize teams and assign responsibilities
- **Fleet Visualization**: Interactive maps for equipment location tracking
- **Real-time Updates**: Live tracking and notifications

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Auth, Database, Storage)
- **State Management**: TanStack Query
- **Testing**: Vitest, React Testing Library
- **CI/CD**: GitHub Actions

## 📋 Prerequisites

- **Node.js** 18.x or 20.x - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) - We use npm exclusively (no yarn/pnpm/bun)
- **Supabase account and project** - [Sign up here](https://supabase.com/)
- **Modern browser** with ES2020+ support

## 🏗️ Installation

1. Clone the repository:
```bash
git clone https://github.com/Columbia-Cloudworks-LLC/EquipQR
cd equipqr
```

2. Install dependencies:
```bash
npm i
```

3. Set up environment variables:

Create a `.env` file in the project root with the following variables:

```env
# ============================================
# REQUIRED - Supabase Configuration
# ============================================
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# ============================================
# OPTIONAL - External Service Integrations
# ============================================
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# ============================================
# OPTIONAL - Application Configuration
# ============================================
VITE_PRODUCTION_URL=https://your-domain.com
VITE_APP_VERSION=1.0.0
VITE_ENABLE_DEVTOOLS=false
```

### Environment Variables Reference

| Variable | Required | Purpose | Where to Get |
|----------|----------|---------|--------------|
| `VITE_SUPABASE_URL` | ✅ Yes | Your Supabase project URL | [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | ✅ Yes | Supabase anonymous/public key | [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API |
| `VITE_GOOGLE_MAPS_API_KEY` | ⚠️ Optional | Google Maps API key for fleet map | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `VITE_PRODUCTION_URL` | ⚠️ Optional | Production URL for OAuth redirects | Your deployed application URL |
| `VITE_APP_VERSION` | ⚠️ Optional | Application version (displayed in footer) | Any version string (e.g., "1.0.0") |
| `VITE_ENABLE_DEVTOOLS` | ⚠️ Optional | Enable development tools | `true` or `false` (default: false) |

> **Note**: All `VITE_*` variables are exposed to the client-side application. Never commit actual API keys to version control.

4. Start the development server:
```bash
npm run dev
```

## 🔌 External API Requirements

EquipQR™ integrates with several external services to provide full functionality. While Supabase is required, other services are optional depending on which features you want to enable.

> **Note**: EquipQR™ is completely free to use. There are no billing or subscription features.


### Google Maps (Optional - Required for Fleet Map)

Google Maps API enables fleet equipment location visualization and geocoding.

**Setup Steps:**
1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable the following APIs:
   - Maps JavaScript API
   - Geocoding API
3. Create credentials (API Key) from [API Credentials](https://console.cloud.google.com/apis/credentials)
4. Add `VITE_GOOGLE_MAPS_API_KEY` to your `.env` file (client-side)
5. Add `GOOGLE_MAPS_API_KEY` to Supabase Edge Functions secrets (server-side)

**Required for:**
- Fleet map visualization
- Equipment location tracking
- Address geocoding

### Resend (Optional - Required for Email Invitations)

Resend handles transactional emails for organization invitations.

**Setup Steps:**
1. Create an account at [resend.com](https://resend.com)
2. Get your API key from the [Resend Dashboard](https://resend.com/api-keys)
3. Verify your sending domain
4. Add `RESEND_API_KEY` to Supabase Edge Functions secrets

**Required for:**
- Organization member invitations
- Invitation email notifications

### hCaptcha (Optional - Bot Protection)

hCaptcha provides optional bot protection for forms.

**Setup Steps:**
1. Create an account at [hcaptcha.com](https://www.hcaptcha.com)
2. Get your secret key from the hCaptcha dashboard
3. Add `HCAPTCHA_SECRET_KEY` to Supabase Edge Functions secrets

**Required for:**
- Enhanced security on public forms (if enabled)

## 🗄️ Supabase Project Setup

Complete Supabase configuration is required for EquipQR™ to function. Follow these steps to set up your Supabase project.

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Choose your organization and set project details
4. Save your project URL and anon key for the `.env` file

### 2. Authentication Configuration

**Enable Email/Password Authentication:**
1. Navigate to Authentication → Providers
2. Enable "Email" provider
3. Configure email templates (optional but recommended)

**Configure Google OAuth (Optional):**
1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Set authorized redirect URIs:
   - `https://your-project-id.supabase.co/auth/v1/callback`
3. In Supabase: Authentication → Providers → Google
4. Enable Google provider and add Client ID and Client Secret
5. Configure authorized redirect URLs in your application settings

**Set Up Redirect URLs:**
1. Go to Authentication → URL Configuration
2. Add your site URL: `https://your-domain.com`
3. Add redirect URLs:
   - `http://localhost:8080/**` (for local development)
   - `https://your-domain.com/**` (for production)

### 3. Database Setup

**Apply Migrations:**
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
npx supabase login

# Link your project
npx supabase link --project-ref your-project-ref

# Apply migrations
npx supabase db push
```

**Run Seed Data (Optional):**
```bash
# Run seed file if you want sample data
npx supabase db reset
```

**Verify Row Level Security (RLS):**
- All tables should have RLS enabled
- Check policies in Database → Policies
- Migrations in `supabase/migrations/` include RLS policies

### 4. Edge Functions Secrets

Configure required secrets for Supabase Edge Functions:

1. Go to Settings → Edge Functions → Secrets
2. Add the following secrets:

| Secret Name | Required | Purpose |
|-------------|----------|---------|
| `GOOGLE_MAPS_API_KEY` | For maps | Google Maps server-side API key |
| `RESEND_API_KEY` | For emails | Resend API key for sending emails |
| `HCAPTCHA_SECRET_KEY` | Optional | hCaptcha verification secret |
| `PRODUCTION_URL` | Recommended | Your production application URL |

**Add secrets via CLI:**
```bash
npx supabase secrets set GOOGLE_MAPS_API_KEY=AIza...
npx supabase secrets set RESEND_API_KEY=re_...
npx supabase secrets set HCAPTCHA_SECRET_KEY=your_key...
```

### 5. Storage Configuration

The application uses Supabase Storage for image uploads. You must create these buckets for the application to function properly.

**Create Storage Buckets:**
1. Navigate to Storage in Supabase Dashboard
2. Create the following buckets (exact names are required):
   - `equipment-note-images` - For equipment note attachments
   - `work-order-images` - For work order image attachments

**Configure Bucket Policies:**

For **equipment-note-images** bucket:
```sql
-- Allow authenticated users to upload equipment note images
CREATE POLICY "Users can upload equipment note images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'equipment-note-images' AND
  auth.uid() IN (
    SELECT user_id FROM organization_members WHERE status = 'active'
  )
);

-- Allow authenticated users to read equipment note images
CREATE POLICY "Users can view equipment note images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'equipment-note-images');

-- Allow users to delete their own equipment note images
CREATE POLICY "Users can delete equipment note images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'equipment-note-images' AND
  auth.uid() IN (
    SELECT user_id FROM organization_members WHERE status = 'active'
  )
);
```

For **work-order-images** bucket:
```sql
-- Allow authenticated users to upload work order images
CREATE POLICY "Users can upload work order images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work-order-images' AND
  auth.uid() IN (
    SELECT user_id FROM organization_members WHERE status = 'active'
  )
);

-- Allow authenticated users to read work order images
CREATE POLICY "Users can view work order images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'work-order-images');

-- Allow users to delete work order images
CREATE POLICY "Users can delete work order images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'work-order-images' AND
  auth.uid() IN (
    SELECT user_id FROM organization_members WHERE status = 'active'
  )
);
```

> **Important**: The bucket names must match exactly as shown above. The application code specifically references `equipment-note-images` and `work-order-images`. Using different names will cause image upload and deletion operations to fail.

> **Note**: Organization logos are stored as URLs in the database, not in a separate storage bucket. They can be external URLs or uploaded to one of the existing buckets.


## 🎨 App Branding

EquipQR™ includes branding assets for use in the application and communications.

**Logo Locations:**
- **App Icons**: `public/icons/`
  - `EquipQR-Icon-Purple-{Size}.png` - Purple logo variant (preferred branding, works on any background)
    - Available sizes: Small, Medium, Large
  - `EquipQR-White-{Size}.png` - White logo variant (transparent background)
    - Available sizes: Small, Medium, Large
  - `EquipQR-Black-{Size}.png` - Black logo variant (transparent background)
    - Available sizes: Small, Medium, Large
  - `EquipQR-Grey-{Size}.png` - Grey/grayscale logo variant (transparent background)
    - Available sizes: Small, Medium, Large
  - `Columbia-Cloudworks-Icon-{Size}.png` - Columbia Cloudworks branding
    - Available sizes: Small, Medium, Large

- **Legacy Icons**: `public/eqr-icons/` (deprecated, use `public/icons/` instead)
- **Full Logos**: `public/eqr-logo/`
  - `black.png` - Full black logo with text
  - `transparent.png` - Logo with transparent background
  - `grayscale.png` - Grayscale full logo
  - `inverse.png` - Inverse full logo

**Usage:**
- The `Logo` component automatically selects the appropriate icon based on `variant` and `size` props
- Default variant uses purple logo (preferred branding)
- Email invitations use purple medium logo
- Organization branding can be customized per tenant
- Logos are served from the `/public` directory
- All logos have transparent backgrounds

**Icon Variants:**
- **Purple** (default): Preferred branding that works on any background color
- **White**: Best for dark backgrounds
- **Black**: Best for light backgrounds
- **Grey/Grayscale**: Neutral option

**Icon Sizes:**
- **Small**: Used for compact spaces (e.g., headers, sidebars)
- **Medium**: Standard size for most use cases
- **Large**: Used for prominent displays (e.g., hero sections, auth pages)

**Customization:**
To use custom branding, replace the images in the `public/icons/` directory while maintaining the same filenames and dimensions.

## 🧪 Testing

Run the test suite:
```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

### Test Coverage

The project maintains a minimum test coverage threshold of 70% across:
- Lines
- Functions  
- Branches
- Statements

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:coverage` - Run tests with coverage

### Code Quality

The project uses:
- **ESLint** for code linting
- **TypeScript** for type safety
- **Vitest** for unit testing
- **React Testing Library** for component testing

## 🚀 CI/CD

The project includes GitHub Actions workflows for:

### Pull Request Testing (`pr-tests.yml`)
- **Multi-Node Testing**: Tests against Node.js 18.x and 20.x
- **Code Quality**: ESLint and TypeScript checks
- **Test Coverage**: Runs tests with coverage reporting
- **Security Audits**: Checks for package vulnerabilities
- **Build Validation**: Ensures the application builds successfully
- **Quality Gates**: Enforces coverage thresholds and build size limits

### Workflow Triggers
- Pull requests to `main` or `develop` branches
- Direct pushes to `main` or `develop` branches

### Required GitHub Secrets
Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

**Optional Secrets** (if using these features):
- `VITE_GOOGLE_MAPS_API_KEY` - For fleet map

> **Note**: Supabase Edge Function secrets should be configured directly in Supabase Dashboard, not GitHub. See the [Supabase Project Setup](#%EF%B8%8F-supabase-project-setup) section for details.

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── equipment/      # Equipment-specific components
│   ├── work-orders/    # Work order components
│   └── teams/          # Team management components
├── pages/              # Main application pages
├── hooks/              # Custom React hooks
├── services/           # API service layers
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
└── test/               # Test utilities and setup
```

## 🔒 Security

- Row Level Security (RLS) policies for data isolation
- Authentication via Supabase Auth
- Input validation with Zod schemas
- Regular security audits in CI pipeline

## 📖 Documentation

See the [Documentation Index](./docs/README.md) for the complete documentation structure.

### Quick Links

**Technical Documentation:**
- [Setup Guide](./docs/technical/setup.md) - Developer setup, environment configuration, and troubleshooting
- [Architecture](./docs/technical/architecture.md) - System architecture and database schema
- [Standards](./docs/technical/standards.md) - Coding standards and UI system guide
- [API Reference](./docs/technical/api-reference.md) - Complete API documentation

**User Guides:**
- [Workflows](./docs/guides/workflows.md) - Work order workflows and image upload processes
- [Permissions](./docs/guides/permissions.md) - Roles and permissions system

**Operations:**
- [Deployment](./docs/ops/deployment.md) - Complete deployment guide
- [Migrations](./docs/ops/migrations.md) - ⚠️ **CRITICAL** Database migration guide
- [Migration Rules Quick Reference](./docs/ops/migration-rules-quick-reference.md) - Quick reference

### Development Workflow
- [Agents Guide](./.cursor/agents.md) - Multi-agent development workflow

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and add tests
4. Ensure all tests pass: `npm run test`
5. Run the linter: `npm run lint`
6. Commit your changes: `git commit -m 'Add your feature'`
7. Push to the branch: `git push origin feature/your-feature`
8. Open a pull request

### Pull Request Guidelines

- All tests must pass
- Code coverage must meet the 70% threshold
- No high-severity security vulnerabilities
- Build size must not exceed 10MB
- Follow the existing code style and conventions

## 📄 License

Copyright © 2024 Columbia Cloudworks LLC. All rights reserved.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the troubleshooting guide

## 🎯 Roadmap

- [ ] Mobile app integration
- [ ] Advanced analytics dashboard
- [ ] IoT sensor integration
- [ ] Predictive maintenance algorithms
- [ ] API integrations with external ERP systems