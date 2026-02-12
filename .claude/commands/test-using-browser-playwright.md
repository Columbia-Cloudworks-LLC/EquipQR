Use this context when testing the EquipQR application with Playwright MCP tools.

$ARGUMENTS

## Application Overview

EquipQR is an equipment management and work order tracking application built with React, TypeScript, and Supabase. Multi-tenancy with organization-based access control.

## Servers

- **Local**: `http://localhost:8080` (run `npm run dev` first)
- **Preview**: `https://preview.equipqr.app` (auto-deployed from `preview` branch)
- **Production**: `https://equipqr.app` (promoted from preview)

## Application Routes

### Public (No Auth)

| Route | Description |
|---|---|
| `/` | Landing page (redirects to dashboard if authenticated) |
| `/auth` | Sign in / Sign up |
| `/support` | Public support page |
| `/terms-of-service` | Terms of Service |
| `/privacy-policy` | Privacy Policy |

### Protected (Auth Required — `/dashboard/*`)

| Route | Description |
|---|---|
| `/dashboard` | Main dashboard with stats |
| `/dashboard/equipment` | Equipment list with filters, search |
| `/dashboard/equipment/:id` | Equipment details (Details, Notes, Images, Parts, Work Orders tabs) |
| `/dashboard/work-orders` | Work orders list with status filters |
| `/dashboard/work-orders/:id` | Work order details |
| `/dashboard/teams` | Teams management |
| `/dashboard/fleet-map` | Fleet map view |
| `/dashboard/organization` | Organization settings |
| `/dashboard/pm-templates` | PM templates |
| `/dashboard/inventory` | Inventory list |
| `/dashboard/reports` | Reports and exports |
| `/dashboard/scanner` | QR code scanner |
| `/dashboard/audit-log` | Audit log viewer |

## Authentication

- Sign-in page at `/auth` has Email/Password fields and Google OAuth
- Email field: `id="signin-email"`, Password field: `id="signin-password"`
- After sign-in, redirects to `/dashboard`

## Common Testing Workflows

### Offline Queue Test
1. Navigate to dashboard after auth
2. Go offline (use CDP network emulation or `window.dispatchEvent(new Event('offline'))`)
3. Create equipment/work orders while offline
4. Verify offline indicators and queued items in localStorage
5. Go back online
6. Verify sync completion

### Responsive Testing
Test at: iPhone SE (375x667), iPad Mini (768x1024), Desktop (1920x1080)

## Layout Structure

- **Sidebar**: Left nav (collapsible on mobile)
- **TopBar**: Org switcher, notifications, user menu
- **Main content**: Central area
- **Footer**: Legal links

## Tips

1. Always take a snapshot first to understand page structure
2. Check console messages for JavaScript errors
3. Monitor network requests for API failures
4. Use short incremental waits (1-3s) with snapshot checks
5. Set up dialog handlers BEFORE triggering actions
