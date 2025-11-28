# Deployment Guide

This guide covers all aspects of deploying EquipQR, including build processes, hosting platforms, runner management, and versioning.

## Deployment Overview

EquipQR is designed as a modern single-page application (SPA) that can be deployed to various hosting platforms with minimal configuration.

## Build Process

### Development Build
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access application at http://localhost:5173
```

### Production Build
```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

### Build Optimization
The production build includes:
- **Code Splitting**: Automatic code splitting for optimal loading
- **Tree Shaking**: Remove unused code from final bundle
- **Asset Optimization**: Compress images, CSS, and JavaScript
- **Caching**: Long-term caching headers for static assets

## Environment Configuration

### Environment Variables
Create environment files for different deployment stages:

#### `.env.local` (Development)
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional Development Settings
VITE_APP_TITLE=EquipQR Development
VITE_ENABLE_DEVTOOLS=true
VITE_LOG_LEVEL=debug
```

#### `.env.production` (Production)
```env
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional Production Settings
VITE_APP_TITLE=EquipQR
VITE_ENABLE_DEVTOOLS=false
VITE_LOG_LEVEL=error
VITE_SENTRY_DSN=your-sentry-dsn

# Optional Service Integrations
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
VITE_GOOGLE_MAPS_API_KEY=your_maps_key
```

### Configuration Management
```typescript
// src/lib/config.ts
export const config = {
  app: {
    title: import.meta.env.VITE_APP_TITLE || 'EquipQR',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  services: {
    stripe: {
      publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    },
    maps: {
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    },
  },
  features: {
    enableDevTools: import.meta.env.VITE_ENABLE_DEVTOOLS === 'true',
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  },
};
```

## Hosting Platforms

### Lovable Hosting (Recommended)
EquipQR is optimized for Lovable's hosting platform:

1. **Click Publish**: Use the publish button in Lovable interface
2. **Custom Domain**: Configure custom domain in project settings
3. **SSL Certificate**: Automatic SSL certificate provisioning
4. **CDN**: Global content delivery network included

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel

# Production deployment
vercel --prod
```

#### `vercel.json` Configuration
The project includes a complete `vercel.json` configuration file with:
- **Build Configuration**: Uses Vite framework with `npm run build`
- **SPA Routing**: All routes rewritten to `/index.html` for React Router
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- **Performance Headers**: Long-term caching for static assets
- **Branch Deployment**: Automatic deployment for main and preview branches

#### Environment Variables Setup
Configure these environment variables in your Vercel project dashboard:

**Required:**
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

**Optional:**
- `VITE_APP_VERSION`: Application version (defaults to 'dev')
- `VITE_STRIPE_PUBLISHABLE_KEY`: Stripe integration key
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps API key

#### Branch Configuration
- **Production**: `main` branch deploys to `equipqr.app`
- **Preview**: `preview` branch deploys to `preview.equipqr.app`

### Netlify Deployment
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

#### `netlify.toml` Configuration
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### AWS S3 + CloudFront
```bash
# Build application
npm run build

# Sync to S3 bucket
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## Runner Management

### Quick Switch Between Runner Types

- Switch to self-hosted (Windows):
```powershell
pwsh -File scripts/switch-runner-type.ps1 -RunnerType self-hosted
```

- Switch to GitHub-hosted (Ubuntu):
```powershell
pwsh -File scripts/switch-runner-type.ps1 -RunnerType github-hosted
```

Then commit and push the workflow changes.

#### Notes
- Security scans remain on GitHub-hosted for isolation.
- Windows steps use PowerShell; Unix steps use Bash.
- Toggle by editing `USE_SELF_HOSTED` in workflows or using the script.

## Self-Hosted Runner Setup

### Overview

This guide explains the hybrid approach implemented for using your self-hosted GitHub Actions runner alongside GitHub-hosted runners for optimal performance and security.

### Current Configuration

#### **Hybrid Runner Strategy**

| Job | Runner Type | Reason |
|-----|-------------|--------|
| **lint-and-typecheck** | `self-hosted` | Fast linting and type checking |
| **test** | `self-hosted` | Faster test execution with Node.js matrix |
| **security** | `ubuntu-latest` | **Security isolation on GitHub-hosted** |
| **build** | `self-hosted` | Faster builds with better resources |
| **quality-gates** | `self-hosted` | Final checks and bundle analysis |
| **versioning** | `self-hosted` | Simple git operations |
| **deployment** | `self-hosted` | Notification and version tracking |

### Benefits of This Approach

#### **Performance Benefits**
- ⚡ **Faster Builds**: Your local machine likely has more CPU/RAM than GitHub's standard runners
- 🚀 **Reduced Queue Times**: No waiting for GitHub-hosted runners to become available
- 💾 **Better Caching**: Persistent cache between runs on your local machine
- 🔄 **Parallel Execution**: Multiple jobs can run simultaneously on your machine

#### **Cost Benefits**
- 💰 **No GitHub Actions Minutes**: Self-hosted jobs don't consume your GitHub Actions quota
- 📊 **Unlimited Usage**: No monthly limits on self-hosted runner usage

#### **Security Benefits**
- 🔒 **Security Isolation**: Critical security scans still run on GitHub-hosted runners
- 🛡️ **Controlled Environment**: You maintain full control over the runner environment

### Self-Hosted Runner Requirements

#### **Minimum System Requirements**
- **OS**: Windows 10/11 (based on your setup)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 50GB free space for builds and cache
- **CPU**: 4 cores minimum, 8 cores recommended

#### **Required Software**
- **Node.js**: Versions 18.x and 20.x
- **Git**: Latest version
- **PowerShell**: For Windows compatibility
- **Build Tools**: Visual Studio Build Tools (for native dependencies)

### Setup Instructions

#### **1. Install Required Software**

```powershell
# Install Node.js 18.x and 20.x using Node Version Manager (nvm-windows)
# Download from: https://github.com/coreybutler/nvm-windows

# Install Node.js 18.x
nvm install 18.20.4
nvm use 18.20.4

# Install Node.js 20.x
nvm install 20.11.1
nvm use 20.11.1

# Install Git (if not already installed)
winget install Git.Git

# Install Visual Studio Build Tools (for native dependencies)
winget install Microsoft.VisualStudio.2022.BuildTools
```

#### **2. Configure Runner Environment**

```powershell
# Set up npm cache location for better performance
npm config set cache "C:\npm-cache" --global

# Set up environment variables
[Environment]::SetEnvironmentVariable("NODE_OPTIONS", "--max-old-space-size=4096", "Machine")
[Environment]::SetEnvironmentVariable("CI", "true", "Machine")
```

#### **3. Runner Maintenance Script**

Create a maintenance script to keep your runner optimized:

```powershell
# Create runner-maintenance.ps1
@"
# GitHub Actions Runner Maintenance Script

Write-Host "🧹 Cleaning up GitHub Actions runner..."

# Clean up old workflow runs (keep last 10)
Get-ChildItem -Path "C:\action-runners\_work" -Directory | 
    Sort-Object CreationTime -Descending | 
    Select-Object -Skip 10 | 
    Remove-Item -Recurse -Force

# Clean up npm cache if it gets too large (>5GB)
$npmCacheSize = (Get-ChildItem -Path "C:\npm-cache" -Recurse | Measure-Object -Property Length -Sum).Sum / 1GB
if ($npmCacheSize -gt 5) {
    Write-Host "📦 NPM cache is $([math]::Round($npmCacheSize, 2))GB, cleaning up..."
    npm cache clean --force
}

# Clean up temp files
Get-ChildItem -Path $env:TEMP -Name "github-actions*" -Directory | 
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "✅ Runner maintenance completed!"
"@ | Out-File -FilePath "C:\action-runners\runner-maintenance.ps1" -Encoding UTF8
```

#### **4. Scheduled Maintenance**

Set up a Windows Task Scheduler task to run maintenance weekly:

```powershell
# Create scheduled task for weekly maintenance
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\action-runners\runner-maintenance.ps1"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 2AM
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -TaskName "GitHub Actions Runner Maintenance"
```

### Monitoring and Troubleshooting

#### **Runner Status Monitoring**

Create a simple monitoring script:

```powershell
# Create runner-status.ps1
@"
# GitHub Actions Runner Status Check

Write-Host "🔍 Checking GitHub Actions runner status..."

# Check if runner service is running
$runnerService = Get-Service -Name "actions.runner.*" -ErrorAction SilentlyContinue
if ($runnerService) {
    Write-Host "✅ Runner service status: $($runnerService.Status)"
} else {
    Write-Host "❌ Runner service not found"
}

# Check disk space
$disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
$freeSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 2)
$totalSpaceGB = [math]::Round($disk.Size / 1GB, 2)

Write-Host "💾 Disk space: $freeSpaceGB GB free of $totalSpaceGB GB total"

if ($freeSpaceGB -lt 10) {
    Write-Host "⚠️  Warning: Less than 10GB free space remaining"
}

# Check Node.js versions
Write-Host "📦 Node.js versions:"
node --version
npm --version

# Check recent workflow runs
$workflowRuns = Get-ChildItem -Path "C:\action-runners\_work" -Directory | 
    Sort-Object CreationTime -Descending | 
    Select-Object -First 5

Write-Host "📋 Recent workflow runs:"
$workflowRuns | ForEach-Object {
    Write-Host "  - $($_.Name) ($($_.CreationTime.ToString('yyyy-MM-dd HH:mm')))"
}
"@ | Out-File -FilePath "C:\action-runners\runner-status.ps1" -Encoding UTF8
```

#### **Common Issues and Solutions**

**Issue: Runner Not Picking Up Jobs**
```powershell
# Restart the runner service
Restart-Service -Name "actions.runner.*"

# Or restart the runner manually
cd C:\action-runners
.\run.cmd
```

**Issue: Out of Disk Space**
```powershell
# Clean up old workflow runs
Get-ChildItem -Path "C:\action-runners\_work" -Directory | 
    Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-7) } | 
    Remove-Item -Recurse -Force

# Clean npm cache
npm cache clean --force
```

**Issue: Node.js Version Conflicts**
```powershell
# Use nvm to switch Node.js versions
nvm use 20.11.1  # For most jobs
nvm use 18.20.4  # For Node.js 18.x matrix jobs
```

### Security Considerations

#### **Runner Security Best Practices**
1. **Keep Runner Updated**: Regularly update the runner software
2. **Monitor Access**: Only trusted repositories should use the runner
3. **Network Security**: Use firewall rules to restrict runner network access
4. **Regular Maintenance**: Clean up old builds and temporary files
5. **Backup Configuration**: Keep runner configuration backed up

#### **Environment Isolation**
- The runner has access to your local environment
- Keep sensitive data out of the runner directory
- Use GitHub Secrets for sensitive information
- Regularly audit runner logs

### Performance Optimization

#### **Cache Optimization**
```powershell
# Set up persistent npm cache
npm config set cache "C:\npm-cache" --global

# Set up build cache directory
[Environment]::SetEnvironmentVariable("BUILD_CACHE_DIR", "C:\build-cache", "Machine")
```

#### **Resource Monitoring**
```powershell
# Monitor CPU and memory usage during builds
Get-Process -Name "node" | Select-Object ProcessName, CPU, WorkingSet
```

### Expected Performance Improvements

With your self-hosted runner, you should see:

- **Build Time**: 30-50% faster builds
- **Test Execution**: 40-60% faster test runs
- **Queue Time**: Near-zero queue time for self-hosted jobs
- **Cache Performance**: 70-80% faster dependency installation

### Rollback Plan

If you need to revert to GitHub-hosted runners:

1. **Update workflow files**: Change `runs-on: self-hosted` back to `runs-on: ubuntu-latest`
2. **Remove runner**: Stop and remove the self-hosted runner service
3. **Clean up**: Remove the runner directory and configuration

## Versioning System

EquipQR uses an automated semantic versioning system where `package.json` is the single source of truth for the application version.

### How It Works

#### Version Format
- **Format**: `MAJOR.MINOR.PATCH` (e.g., `1.12.3`)
- **Tag Format**: `vMAJOR.MINOR.PATCH` (e.g., `v1.12.3`)
- **Source of Truth**: the `version` field in `package.json`

### Automatic Version Tagging

The versioning system is fully automated:

1. **Update version in `package.json`**:
   - Edit `package.json` and change the `version` field (e.g., `"1.2.3"`)
   - Commit and push to the `main` branch

2. **Auto-tagging workflow**:
   - The `version-tag.yml` workflow automatically triggers on push to `main` when `package.json` changes
   - Reads version from `package.json`
   - Checks if tag `v{version}` already exists
   - If tag doesn't exist, creates annotated git tag `v{version}` and pushes it
   - If tag exists, skips creation (no-op)

3. **Build integration**:
   - CI workflows read version directly from `package.json`
   - Exposes as `VITE_APP_VERSION` environment variable during build
   - App displays version in footer

### Semantic Versioning Guidelines

- **Major** (X.0.0): Breaking changes, major new features
- **Minor** (X.Y.0): New features, backward-compatible changes
- **Patch** (X.Y.Z): Bug fixes, minor improvements

### Workflow

#### To Release a New Version

1. Update `package.json` version field:
   ```json
   {
     "version": "1.2.3"
   }
   ```

2. Commit and push to `main`:
   ```bash
   git add package.json
   git commit -m "chore: bump version to 1.2.3"
   git push origin main
   ```

3. The auto-tagging workflow will:
   - Detect the version change
   - Create tag `v1.2.3` if it doesn't exist
   - Push the tag to the repository

### Local Development

For local development, the version will show as `dev` if no `VITE_APP_VERSION` is set. The build process reads from `package.json` as a fallback.

### Manual Tag Management

#### Rollback a Version

If you need to undo a version:

```bash
# Delete tag locally and remotely
git tag -d vX.Y.Z
git push origin --delete vX.Y.Z

# Revert package.json version change
git revert <commit-sha>
git push origin main
```

#### Emergency Manual Tag Creation

If the auto-tagging workflow fails, you can create a tag manually:

```bash
# Ensure package.json has the correct version
# Then create and push tag
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

### Troubleshooting

#### Tag not created after version change

- Check if workflow ran: Go to Actions tab and look for "Auto Version Tag" workflow
- Verify `package.json` was actually changed in the commit
- Check workflow logs for errors
- Ensure workflow has `contents: write` permission

#### Version not showing in deployed app

- Verify `package.json` has the correct version
- Check CI logs: Ensure version was read from `package.json` during build
- Verify `VITE_APP_VERSION` was set during build

#### Version in footer shows "dev"

- Expected in local development without `VITE_APP_VERSION` env var
- In production: Check that build read version from `package.json`

#### Duplicate tag error

- The workflow checks if a tag exists before creating it
- If you see this error, the tag already exists for that version
- Either use a different version number or delete the existing tag first

### Version Display

The version is displayed in the footer of all pages in the format: `© 2024 EquipQR v1.2.3 by COLUMBIA CLOUDWORKS LLC`

### Files Involved

- `package.json` - **Source of truth** for version number
- `.github/workflows/version-tag.yml` - Auto-tagging workflow (creates tags when version changes)
- `.github/workflows/ci.yml` - Reads version from `package.json` during build
- `.github/workflows/deploy.yml` - Reads version from `package.json` for deployment notifications
- `src/components/layout/LegalFooter.tsx` - Version display in UI
- `src/lib/version.ts` - Version constant with fallback chain (`VITE_APP_VERSION` → `package.json` → `"dev"`)
- `vite.config.ts` - Reads from `package.json` as fallback for `__APP_VERSION__` constant

## Performance Optimization

### Bundle Analysis
```bash
# Analyze bundle size
npm run build -- --analyze

# Or use bundle analyzer
npm install -g webpack-bundle-analyzer
npx webpack-bundle-analyzer dist/assets
```

### Performance Monitoring
```typescript
// src/lib/performance.ts
export const trackPerformance = () => {
  // Core Web Vitals
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  });
};

// Initialize in main.tsx
if (import.meta.env.PROD) {
  trackPerformance();
}
```

### Caching Strategy
```typescript
// Service Worker for caching (optional)
// src/sw.ts
const CACHE_NAME = 'equipqr-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});
```

## Security Configuration

### Content Security Policy
```html
<!-- Add to index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com; 
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
               font-src 'self' https://fonts.gstatic.com;
               img-src 'self' data: https: blob:;
               connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://maps.googleapis.com;">
```

### HTTPS Configuration
Ensure all deployments use HTTPS:
- **Development**: Use `https://localhost:5173` for local HTTPS
- **Production**: Configure SSL certificates on hosting platform
- **API Calls**: Ensure all API endpoints use HTTPS

## Database Integration

### Supabase Integration (Recommended)
EquipQR is designed to work with Supabase for backend functionality:

1. **Connect Supabase**: Use Lovable's native Supabase integration
2. **Database Setup**: Create tables for equipment, work orders, teams
3. **Authentication**: Configure Supabase Auth for user management
4. **Real-time Updates**: Enable real-time subscriptions for live data

### Supabase Configuration
EquipQR uses Supabase for all backend functionality. Ensure proper configuration:

```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
```

#### Database Migrations
Ensure database schema is properly migrated before deployment:
```bash
# Local development
supabase db push

# Production deployment
supabase db push --linked
```

## Monitoring and Logging

### Error Tracking
```typescript
// src/lib/error-tracking.ts
interface ErrorEvent {
  message: string;
  stack?: string;
  url: string;
  timestamp: Date;
  userAgent: string;
}

export const trackError = (error: Error, context?: Record<string, any>) => {
  const errorEvent: ErrorEvent = {
    message: error.message,
    stack: error.stack,
    url: window.location.href,
    timestamp: new Date(),
    userAgent: navigator.userAgent,
  };
  
  // Send to error tracking service
  console.error('Application Error:', errorEvent, context);
};
```

### Analytics Integration
```typescript
// src/lib/analytics.ts
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (config.features.enableAnalytics) {
    // Google Analytics 4
    gtag('event', eventName, properties);
    
    // Or custom analytics
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventName, properties, timestamp: Date.now() }),
    });
  }
};
```

## Maintenance and Updates

### Automated Deployments
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    - name: Install dependencies
      run: npm ci
    - name: Run tests
      run: npm test
    - name: Build application
      run: npm run build
    - name: Deploy to hosting
      run: npm run deploy
```

### Health Checks
```typescript
// src/lib/health-check.ts
export const performHealthCheck = async () => {
  const checks = [
    { name: 'API Connection', check: () => fetch('/api/health') },
    { name: 'Database', check: () => fetch('/api/db-health') },
    { name: 'Authentication', check: () => fetch('/api/auth/status') },
  ];
  
  const results = await Promise.allSettled(
    checks.map(async ({ name, check }) => {
      try {
        const response = await check();
        return { name, status: response.ok ? 'healthy' : 'unhealthy' };
      } catch (error) {
        return { name, status: 'error', error: error.message };
      }
    })
  );
  
  return results;
};
```

This deployment guide provides comprehensive instructions for deploying EquipQR to various platforms while maintaining optimal performance, security, and reliability.

