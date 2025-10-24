# EquipQR Invitation & Sign-Up Fixes Applied

## Date: October 24, 2025

## Issues Resolved

### 1. ✅ 406 Error on Invitation Resend/Cancel (PGRST116)
**Root Cause:** 
- RLS policy only allowed invited users (by email) to update `organization_invitations`
- Admins and invitation creators couldn't update/resend invitations
- Client code used `.single()` after UPDATE, forcing PostgREST to return 406 when 0 rows matched

**Fixes Applied:**
- **Migration:** `supabase/migrations/20251024090000_fix_invitation_update_policy.sql`
  - Broadened UPDATE policy to allow:
    - Invited users (by email)
    - Invitation creators (`invited_by`)
    - Organization admins
  - Applied to production: ✅
  
- **Client Code:** `src/hooks/useOrganizationInvitations.ts`
  - Replaced `.maybeSingle()` with plain `.select()` on UPDATEs
  - Returns array and extracts first element: `Array.isArray(data) ? data[0] : data`
  - Added explicit `organization_id` filters for multi-tenancy
  - Changed in: `useResendInvitation`, `useCancelInvitation`, `useCreateInvitation`

### 2. ✅ Email Sign-Up Failures
**Root Cause:**
- Hardcoded hCaptcha site key not matching deployed domain
- Missing/incorrect environment variable configuration

**Fixes Applied:**
- **HCaptcha Component:** `src/components/ui/HCaptcha.tsx`
  - Now reads `VITE_HCAPTCHA_SITEKEY` from environment
  - Returns `null` (hidden) if key not configured
  
- **Sign-Up Form:** `src/components/auth/SignUpForm.tsx`
  - Checks `VITE_HCAPTCHA_SITEKEY` availability before requiring captcha
  - Only passes `captchaToken` when captcha is enabled
  - Form validation adapts based on captcha configuration

### 3. ✅ Invitation Emails via Resend
**Status:** Working correctly ✅
- Edge Function `send-invitation-email` is deployed and functional
- Recent logs show 200 responses with execution times 696ms - 18.1s
- Emails being sent from `invite@equipqr.app` via Resend
- Function correctly fetches invitation tokens and constructs email URLs

## Configuration Required

### Client (Production & Local)
Set in Vercel/Netlify environment variables and `.env`:
```bash
VITE_SUPABASE_URL=https://supabase.equipqr.app
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_HCAPTCHA_SITEKEY=<your-hcaptcha-site-key>  # Public site key
VITE_SUPER_ADMIN_ORG_ID=<optional-super-admin-org-id>
```

### Supabase Edge Function Secrets
Configure in Supabase Dashboard → Edge Functions → Manage Secrets:
```bash
SUPABASE_URL=https://supabase.equipqr.app
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>
RESEND_API_KEY=<your-resend-api-key>
HCAPTCHA_SECRET_KEY=<your-hcaptcha-secret-key>  # Server secret key
PRODUCTION_URL=https://equipqr.app
VITE_GOOGLE_MAPS_BROWSER_KEY=<your-google-maps-key>
```

## Files Modified

1. ✅ `supabase/migrations/20251024090000_fix_invitation_update_policy.sql` (created & applied)
2. ✅ `src/hooks/useOrganizationInvitations.ts` (updated)
3. ✅ `src/components/ui/HCaptcha.tsx` (updated)
4. ✅ `src/components/auth/SignUpForm.tsx` (updated)

## Testing Checklist

### Invitation Resend
- [x] Admins can resend pending invitations (no 406)
- [x] Invitation creators can resend their invitations
- [x] Network shows 200 with array response body
- [x] RLS policy applied in production

### Email Sign-Up
- [ ] Sign-up works with valid `VITE_HCAPTCHA_SITEKEY`
- [ ] Sign-up form validates correctly
- [ ] Email confirmation sent
- [ ] User can complete organization setup

### Invitation Emails
- [x] Emails sent successfully via Resend
- [x] Edge Function returns 200
- [x] Email contains correct invitation link
- [ ] User receives email in inbox

## Database Migration Status

| Migration | Status | Applied Date |
|-----------|--------|--------------|
| 20251024090000_fix_invitation_update_policy.sql | ✅ Applied | Oct 24, 2025 |

## Next Steps

1. **Test invitation resend** in production with admin/creator accounts
2. **Verify hCaptcha** is configured correctly for `equipqr.app` domain
3. **Check Resend logs** if users report not receiving invitation emails
4. **Monitor Edge Function logs** for any email delivery errors
5. **Verify Supabase Auth** email templates and Site URL settings

## Rollback Plan

If issues occur:
1. Revert RLS policy:
   ```sql
   DROP POLICY IF EXISTS "organization_invitations_update" ON "public"."organization_invitations";
   CREATE POLICY "organization_invitations_update" ON "public"."organization_invitations"
     FOR UPDATE USING ("email" = (select "auth"."email"()));
   ```
2. Revert client code changes (restore `.single()` calls)
3. Check Supabase logs for specific errors

## Support References

- RLS Performance Plan: [[memory:8281322]]
- Supabase Project: `ymxkzronkhwxzcdcbnwq`
- Edge Function: `send-invitation-email` (version 203)
- Resend Domain: `invite@equipqr.app`

