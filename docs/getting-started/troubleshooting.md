# EquipQR Troubleshooting Guide

## Overview

This guide provides solutions to common issues you may encounter while developing, deploying, or using EquipQR. Issues are organized by category with step-by-step resolution instructions.

## Quick Diagnostics

Run these commands to quickly identify common issues:

```bash
# Check environment variables
npm run env-check || echo "Environment check script not found"

# Verify dependencies
npm list --depth=0

# Check TypeScript
npm run type-check

# Test database connection
npm run db-check || echo "Database check script not found"

# Verify build
npm run build
```

## Environment & Configuration Issues

### Missing Environment Variables

**Symptoms:**
- Error: "Missing required Supabase environment variables"
- Application won't start
- Authentication failures

**Solution:**
```bash
# 1. Check if .env file exists
ls -la .env

# 2. If missing, copy from template
cp .env.example .env

# 3. Verify required variables are set
cat .env | grep -E "(VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY)"

# 4. Check for common issues
grep -E "your-|placeholder|example" .env
```

**Required Variables:**
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key
```

### Invalid Supabase Credentials

**Symptoms:**
- "Invalid API key" errors
- 401 Unauthorized responses
- Authentication not working

**Solution:**
1. **Verify URL Format:**
   ```bash
   # Should match: https://[project-ref].supabase.co
   echo $VITE_SUPABASE_URL
   ```

2. **Check API Key:**
   ```bash
   # Should start with "eyJ" (JWT format)
   echo $VITE_SUPABASE_ANON_KEY | cut -c1-3
   ```

3. **Test Connection:**
   ```javascript
   // Test in browser console
   fetch(process.env.VITE_SUPABASE_URL + '/rest/v1/', {
     headers: { 'apikey': process.env.VITE_SUPABASE_ANON_KEY }
   }).then(r => console.log(r.status));
   ```

### Port Already in Use

**Symptoms:**
- "Port 8080 is already in use"
- Development server won't start

**Solution:**
```bash
# Find process using port 8080
lsof -ti:8080

# Kill the process (replace PID with actual process ID)
kill -9 $(lsof -ti:8080)

# Or use a different port
npm run dev -- --port 3001
```

## Database & API Issues

### Row Level Security (RLS) Violations

**Symptoms:**
- "Row Level Security policy violation" errors
- Data not loading for authenticated users
- 403 Forbidden responses

**Diagnostic Steps:**
```sql
-- Check user authentication
SELECT auth.uid();

-- Check organization membership
SELECT * FROM organization_members 
WHERE user_id = auth.uid() AND status = 'active';

-- Test specific table access
SELECT * FROM equipment LIMIT 1;
```

**Common Solutions:**

1. **User Not in Organization:**
   ```sql
   -- Add user to organization (as admin)
   INSERT INTO organization_members (user_id, organization_id, role, status)
   VALUES (auth.uid(), 'your-org-id', 'member', 'active');
   ```

2. **Check Policy Functions:**
   ```sql
   -- Test helper functions
   SELECT is_org_member(auth.uid(), 'your-org-id');
   SELECT is_org_admin(auth.uid(), 'your-org-id');
   ```

### Database Connection Errors

**Symptoms:**
- "Connection refused" errors
- Timeout errors
- "Database not found"

**Solution:**
```bash
# 1. Check Supabase project status
npx supabase status

# 2. Verify project is running
curl -I $VITE_SUPABASE_URL/rest/v1/

# 3. Check network connectivity
ping your-project-ref.supabase.co

# 4. Reset local Supabase (if using local dev)
npx supabase stop
npx supabase start
```

### Migration Issues

**Symptoms:**
- "Migration failed" errors
- Schema out of sync
- Missing tables/columns

**Solution:**
```bash
# 1. Check migration status
npx supabase migration list

# 2. Reset local database
npx supabase db reset

# 3. Apply pending migrations
npx supabase db push

# 4. Regenerate types
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

## Authentication Issues

### Login Not Working

**Symptoms:**
- Login form doesn't respond
- "Invalid credentials" for valid users
- Redirect loops

**Diagnostic Steps:**
```javascript
// Check auth state in browser console
supabase.auth.getSession().then(console.log);

// Check auth configuration
console.log({
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 10) + '...'
});
```

**Solutions:**

1. **Clear Auth State:**
   ```javascript
   // In browser console
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

2. **Check Email Confirmation:**
   ```sql
   -- Check if user email is confirmed
   SELECT email, email_confirmed_at FROM auth.users 
   WHERE email = 'user@example.com';
   ```

3. **Reset Password:**
   ```javascript
   // Trigger password reset
   await supabase.auth.resetPasswordForEmail('user@example.com');
   ```

### Session Expires Immediately

**Symptoms:**
- User gets logged out immediately
- "Session expired" messages
- Infinite login loops

**Solution:**
```javascript
// Check session configuration in supabase client
export const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
```

## Build & Deployment Issues

### Build Failures

**Symptoms:**
- TypeScript compilation errors
- Missing dependencies
- Bundle size too large

**Solutions:**

1. **TypeScript Errors:**
   ```bash
   # Run type checking
   npm run type-check

   # Fix common issues
   # - Add missing imports
   # - Fix type definitions
   # - Remove unused variables
   ```

2. **Missing Dependencies:**
   ```bash
   # Clean install
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Bundle Size Issues:**
   ```bash
   # Analyze bundle
   npm run analyze

   # Check size limits
   npm run size-check
   ```

### Deployment Failures

**Symptoms:**
- Build succeeds locally but fails in CI/CD
- Environment variables not set
- Missing build artifacts

**Solutions:**

1. **Environment Variables:**
   ```bash
   # Check CI environment variables
   # Ensure all VITE_* variables are set in deployment platform
   ```

2. **Build Configuration:**
   ```json
   // Verify build scripts in package.json
   {
     "scripts": {
       "build": "vite build",
       "preview": "vite preview"
     }
   }
   ```

3. **Static File Serving:**
   ```javascript
   // For SPA routing, ensure server redirects all routes to index.html
   // Check vercel.json or netlify.toml configuration
   ```

## Performance Issues

### Slow Page Loading

**Symptoms:**
- Pages take long to load
- High memory usage
- Slow database queries

**Diagnostic Tools:**
```bash
# Check bundle size
npm run size-check

# Analyze performance
npm run build && npm run preview
# Open DevTools > Lighthouse
```

**Solutions:**

1. **Code Splitting:**
   ```javascript
   // Lazy load heavy components
   const HeavyComponent = lazy(() => import('./HeavyComponent'));
   ```

2. **Database Optimization:**
   ```sql
   -- Check slow queries in Supabase dashboard
   -- Add appropriate indexes
   -- Optimize RLS policies
   ```

3. **Image Optimization:**
   ```javascript
   // Use appropriate image formats and sizes
   // Implement lazy loading for images
   ```

### Memory Leaks

**Symptoms:**
- Browser becomes slow over time
- High memory usage in DevTools
- Application crashes

**Solutions:**

1. **Check for Subscription Leaks:**
   ```javascript
   useEffect(() => {
     const subscription = supabase
       .channel('changes')
       .on('postgres_changes', {}, handleChange)
       .subscribe();

     // Always cleanup
     return () => subscription.unsubscribe();
   }, []);
   ```

2. **Clean Up Event Listeners:**
   ```javascript
   useEffect(() => {
     const handleResize = () => {};
     window.addEventListener('resize', handleResize);
     
     return () => window.removeEventListener('resize', handleResize);
   }, []);
   ```

## Testing Issues

### Tests Failing

**Symptoms:**
- Tests pass locally but fail in CI
- Mock-related errors
- Timeout errors

**Solutions:**

1. **Environment Setup:**
   ```bash
   # Check test environment
   npm run test -- --reporter=verbose
   
   # Clear test cache
   npm run test -- --clearCache
   ```

2. **Mock Issues:**
   ```javascript
   // Ensure mocks are properly configured
   vi.mock('@/integrations/supabase/client', () => ({
     supabase: createMockSupabaseClient()
   }));
   ```

3. **Async Test Issues:**
   ```javascript
   // Use proper async/await patterns
   test('async operation', async () => {
     await waitFor(() => {
       expect(screen.getByText('Expected text')).toBeInTheDocument();
     });
   });
   ```

### Coverage Issues

**Symptoms:**
- Coverage below threshold
- Files not included in coverage
- Incorrect coverage reports

**Solutions:**

1. **Check Coverage Configuration:**
   ```javascript
   // vitest.config.ts
   coverage: {
     thresholds: {
       global: {
         lines: 70,
         branches: 70,
         functions: 70,
         statements: 70
       }
     }
   }
   ```

2. **Add Missing Tests:**
   ```bash
   # Find untested files
   npm run test:coverage -- --reporter=html
   # Open coverage/index.html
   ```

## Production Issues

### Application Not Loading

**Symptoms:**
- Blank page in production
- Console errors
- 404 errors for assets

**Solutions:**

1. **Check Build Output:**
   ```bash
   # Verify build completed successfully
   ls -la dist/
   
   # Check for index.html
   cat dist/index.html
   ```

2. **Verify Deployment Configuration:**
   ```javascript
   // Check base URL in vite.config.ts
   export default defineConfig({
     base: '/your-app-path/' // if deployed to subdirectory
   });
   ```

3. **Check Server Configuration:**
   ```nginx
   # Nginx example - ensure SPA routing works
   location / {
     try_files $uri $uri/ /index.html;
   }
   ```

### API Errors in Production

**Symptoms:**
- API calls fail in production
- CORS errors
- Authentication issues

**Solutions:**

1. **Verify Environment Variables:**
   ```bash
   # Check production environment variables
   # Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
   ```

2. **Check CORS Configuration:**
   ```sql
   -- In Supabase dashboard, check allowed origins
   -- Should include your production domain
   ```

3. **Verify SSL/HTTPS:**
   ```bash
   # Ensure all API calls use HTTPS
   # Check mixed content issues in browser console
   ```

## Debugging Tools & Commands

### Useful Commands

```bash
# Environment diagnostics
npm run type-check
npm run lint
npm run test:coverage
npm run size-check

# Database diagnostics
npx supabase status
npx supabase migration list
npx supabase logs

# Build diagnostics
npm run build
npm run preview
```

### Browser DevTools

1. **Network Tab:**
   - Check API requests/responses
   - Verify request headers
   - Look for failed requests

2. **Console:**
   - Check for JavaScript errors
   - View authentication state
   - Test API calls

3. **Application Tab:**
   - Check localStorage/sessionStorage
   - Verify service worker status
   - Check cookies

### Logging

```javascript
// Add debugging logs
console.log('Auth state:', await supabase.auth.getSession());
console.log('Environment:', {
  url: import.meta.env.VITE_SUPABASE_URL,
  mode: import.meta.env.MODE
});
```

## Getting Additional Help

### Documentation Resources

- **API Reference**: `docs/api-reference.md`
- **Developer Guide**: `docs/developer-onboarding.md`
- **Architecture**: `docs/architecture.md`
- **Agents Guide**: `../../.cursor/agents.md`

### Community Support

- **GitHub Issues**: Create detailed issue reports
- **Supabase Discord**: For database-related issues
- **Stack Overflow**: Tag questions with `supabase` and `react`

### Creating Bug Reports

When reporting issues, include:

1. **Environment Information:**
   ```bash
   npm version
   node --version
   cat package.json | grep version
   ```

2. **Error Messages:**
   - Full error stack traces
   - Browser console errors
   - Network request failures

3. **Reproduction Steps:**
   - Minimal code example
   - Steps to reproduce
   - Expected vs actual behavior

4. **System Information:**
   - Operating system
   - Browser version
   - Node.js version

This troubleshooting guide should help you resolve most common issues. If you encounter problems not covered here, please contribute by adding solutions to this guide.
