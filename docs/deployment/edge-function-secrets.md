# Edge Function Secrets Configuration

This document describes the environment variables/secrets required for edge functions to work properly.

## Required Secrets for Billing Exemptions Features

The following secrets must be configured in your Supabase project for the billing exemptions admin dashboard to work:

### SUPER_ADMIN_ORG_ID

- **Value**: `dabce056-c0d8-46dd-b173-a3c0084f3133` (Columbia Cloudworks organization)
- **Required by**: 
  - `list-organizations-admin` edge function
  - `manage-billing-exemptions` edge function
- **Purpose**: Identifies which organization has super admin privileges to manage billing exemptions for all organizations

## How to Set Supabase Edge Function Secrets

### Method 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Edge Functions**
3. Under "Function Secrets", click **Add secret**
4. Add the following secret:
   - Name: `SUPER_ADMIN_ORG_ID`
   - Value: `dabce056-c0d8-46dd-b173-a3c0084f3133`
5. Click **Save**
6. Redeploy the affected edge functions for the changes to take effect

### Method 2: Using Supabase CLI

```bash
# Set the secret
npx supabase secrets set SUPER_ADMIN_ORG_ID=dabce056-c0d8-46dd-b173-a3c0084f3133

# Verify it was set
npx supabase secrets list

# Redeploy affected functions
npx supabase functions deploy list-organizations-admin
npx supabase functions deploy manage-billing-exemptions
```

## Verifying the Configuration

After setting the secret and redeploying:

1. Log in as a user with owner/admin role in the Columbia Cloudworks organization
2. Navigate to the Billing Exemptions Admin page
3. You should see the list of organizations and exemptions without 500 errors

## Troubleshooting

### Edge Functions Still Returning 500 Errors

1. **Check if secret is set**: Use `npx supabase secrets list` or check the Supabase dashboard
2. **Redeploy functions**: Secrets are only loaded when functions are deployed/redeployed
3. **Check logs**: Use `npx supabase functions logs list-organizations-admin` to see detailed error messages
4. **Verify user permissions**: Ensure the logged-in user is an owner or admin in the Columbia Cloudworks organization

### Frontend Shows "Access Denied"

1. **Check frontend env variable**: Ensure `VITE_SUPER_ADMIN_ORG_ID` is set in your `.env.local` file
2. **Restart dev server**: After changing `.env.local`, restart your development server
3. **Switch organization**: Make sure you're viewing the app while switched to the Columbia Cloudworks organization
4. **Check user role**: User must have owner or admin role in Columbia Cloudworks

## Related Files

- Frontend environment: `.env.local`
- Edge function shared code: `supabase/functions/_shared/admin-validation.ts`
- Frontend hook: `src/hooks/useSuperAdminAccess.ts`
- Edge functions:
  - `supabase/functions/list-organizations-admin/index.ts`
  - `supabase/functions/manage-billing-exemptions/index.ts`

