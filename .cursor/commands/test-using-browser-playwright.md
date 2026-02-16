# Playwright MCP Testing Context

Use this context when testing the EquipQR application with Playwright MCP tools.

## Application Overview

EquipQR is an equipment management and work order tracking application built with React, TypeScript, and Supabase. It supports multi-tenancy with organization-based access control.

## Development (Local) Server

- **Base URL**: `http://localhost:8080`
- Ensure the dev server is running before testing: `npm run dev`

## Preview (Staging) Server

- **Base URL**: `<https://preview.equipqr.app>
- This site is automatically updated from the latest commit on the preview branch. This uses a custom "staging" environment on Vercel.

## Production Server

- **Base URL**: `<https://equipqr.app>
- Vercel deploys to the preview environment automatically from the latest commit to the main branch. Preview deployments are manually promoted to Production.

## Available Playwright MCP Tools

Use the `user-playwright` MCP server with `CallMcpTool`. Key tools:

| Tool | Purpose |
| ------ | --------- |
| `browser_navigate` | Navigate to a URL (`{ "url": "http://localhost:8080" }`) |
| `browser_snapshot` | Capture accessibility snapshot (best for understanding page state) |
| `browser_take_screenshot` | Take visual screenshot |
| `browser_click` | Click element (`{ "element": "description", "ref": "element-ref" }`) |
| `browser_type` | Type text (`{ "element": "description", "ref": "ref", "text": "value" }`) |
| `browser_fill_form` | Fill multiple form fields at once |
| `browser_press_key` | Press keyboard keys |
| `browser_wait_for` | Wait for elements/conditions |
| `browser_console_messages` | Check console for errors |
| `browser_network_requests` | Monitor network activity |
| `browser_close` | Close browser when done |

## Application Routes

### Public Routes (No Auth Required)

| Route | Description |
| ------- | ------------- |
| `/` | Landing page (redirects to dashboard if authenticated) |
| `/auth` | Sign in / Sign up page |
| `/auth?tab=signin` | Sign in tab |
| `/auth?tab=signup` | Sign up tab |
| `/support` | Public support page |
| `/terms-of-service` | Terms of Service |
| `/privacy-policy` | Privacy Policy |
| `/solutions/repair-shops` | Repair shops solution page |

### Protected Routes (Auth Required)

All protected routes are under `/dashboard/*`:

| Route | Description |
| ------- | ------------- |
| `/dashboard` | Main dashboard with stats, recent equipment, work orders |
| `/dashboard/equipment` | Equipment list with filters, search, grid/list views |
| `/dashboard/equipment/:equipmentId` | Equipment details with tabs (Details, Notes, Images, Parts, Work Orders) |
| `/dashboard/work-orders` | Work orders list with status filters |
| `/dashboard/work-orders/:workOrderId` | Work order details |
| `/dashboard/teams` | Teams management |
| `/dashboard/teams/:teamId` | Team details |
| `/dashboard/fleet-map` | Fleet map view |
| `/dashboard/organization` | Organization settings |
| `/dashboard/pm-templates` | Preventative maintenance templates |
| `/dashboard/pm-templates/:templateId` | PM template details |
| `/dashboard/inventory` | Inventory list |
| `/dashboard/inventory/:itemId` | Inventory item details |
| `/dashboard/part-lookup` | Part lookup search |
| `/dashboard/alternate-groups` | Alternate parts groups |
| `/dashboard/reports` | Reports and exports |
| `/dashboard/notifications` | User notifications |
| `/dashboard/settings` | User settings |
| `/dashboard/scanner` | QR code scanner |
| `/dashboard/audit-log` | Audit log viewer |

## Authentication Flow

### Sign In Form Structure

The sign-in page (`/auth`) contains:

- **Tabs**: "Sign In" and "Sign Up" tabs
- **Email field**: `id="signin-email"`, `type="email"`
- **Password field**: `id="signin-password"`, `type="password"`
- **Submit button**: "Sign In" button
- **Google OAuth**: "Continue with Google" button

### Testing Authentication

1. Navigate to `http://localhost:8080/auth`
2. Take a snapshot to get element refs
3. Fill email and password fields
4. Click the Sign In button
5. Wait for redirect to `/dashboard`

## Common Testing Workflows

### 1. Basic Navigation Test

```plaintext
1. browser_navigate → http://localhost:8080
2. browser_snapshot → verify landing page loaded
3. browser_click → "Sign In" or navigate to /auth
4. browser_snapshot → verify auth page
```

### 2. Authentication Test

```plaintext
1. browser_navigate → http://localhost:8080/auth
2. browser_snapshot → get form element refs
3. browser_type → email field with test email
4. browser_type → password field with test password
5. browser_click → Sign In button
6. browser_wait_for → dashboard to load
7. browser_snapshot → verify dashboard content
```

### 3. Equipment Management Test

```plaintext
1. (after auth) browser_navigate → http://localhost:8080/dashboard/equipment
2. browser_snapshot → verify equipment list
3. browser_click → "Add Equipment" button (if exists)
4. browser_fill_form → equipment details
5. browser_click → submit
6. browser_snapshot → verify equipment created
```

### 4. Work Order Test

```plaintext
1. (after auth) browser_navigate → http://localhost:8080/dashboard/work-orders
2. browser_snapshot → verify work orders list
3. browser_click → "Create Work Order" or existing work order
4. browser_snapshot → verify form/details
```

## UI Component Patterns

### Common Element Selectors

- **Buttons**: Look for `button` elements with descriptive text
- **Form inputs**: Use `id` attributes (e.g., `signin-email`, `signin-password`)
- **Navigation**: Sidebar links, top bar elements
- **Tabs**: `TabsTrigger` elements with tab names
- **Cards**: Equipment cards, stat cards in dashboard
- **Dialogs**: Modal dialogs for forms and confirmations

### Layout Structure

- **Sidebar**: Left sidebar with navigation links (collapsible)
- **TopBar**: Header with organization switcher, notifications, user menu
- **Main content**: Central content area
- **Footer**: Legal links footer

## Tips for Effective Testing

1. **Always take a snapshot first** to understand the page structure and get element refs
2. **Check console messages** (`browser_console_messages`) for JavaScript errors
3. **Monitor network requests** (`browser_network_requests`) for API failures
4. **Use wait_for** after actions that trigger navigation or data loading
5. **Close the browser** (`browser_close`) when testing is complete

## Test Data Considerations

- The app uses Supabase for backend; test data depends on your local/dev database
- Multi-tenancy means data is scoped to organizations
- Some features require specific user roles (owner, admin, member)

## Error Handling

Common issues to check:

- Authentication failures → check credentials, Supabase connection
- Empty states → no data in database for current organization
- Loading states → Suspense boundaries, skeleton loaders
- RLS errors → Row Level Security policy violations in console

## Example MCP Tool Calls

### Navigate to Auth Page

```json
{
  "server": "user-playwright",
  "toolName": "browser_navigate",
  "arguments": { "url": "http://localhost:8080/auth" }
}
```

### Take Snapshot

```json
{
  "server": "user-playwright",
  "toolName": "browser_snapshot",
  "arguments": {}
}
```

### Click Element

```json
{
  "server": "user-playwright",
  "toolName": "browser_click",
  "arguments": {
    "element": "Sign In button",
    "ref": "button[ref-from-snapshot]"
  }
}
```

### Type in Field

```json
{
  "server": "user-playwright",
  "toolName": "browser_type",
  "arguments": {
    "element": "Email input field",
    "ref": "textbox[ref-from-snapshot]",
    "text": "test@example.com"
  }
}
```

### Fill Form

```json
{
  "server": "user-playwright",
  "toolName": "browser_fill_form",
  "arguments": {
    "fields": [
      { "name": "Email", "type": "textbox", "ref": "email-ref", "value": "test@example.com" },
      { "name": "Password", "type": "textbox", "ref": "password-ref", "value": "password123" }
    ]
  }
}
```
