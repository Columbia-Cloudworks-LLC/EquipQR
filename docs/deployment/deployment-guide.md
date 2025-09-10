
# EquipQR Deployment and Configuration Guide

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
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

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
