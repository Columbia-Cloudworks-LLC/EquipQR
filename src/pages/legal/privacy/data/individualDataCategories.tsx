import type { PrivacyDataCategoryRow } from '@/components/legal/PrivacyDataCategoryTable';

export const individualDataCategories: PrivacyDataCategoryRow[] = [
  {
    category: 'Account Registration',
    dataPoints:
      'Full name, email address, and password. Your password is cryptographically hashed by our authentication provider (Supabase Auth) before storage — we never store or have access to your plaintext password.',
  },
  {
    category: 'Google Sign-In (optional)',
    dataPoints:
      'If you choose to sign in with Google, we receive your Google profile name and email address. We do not receive your Google password or access any other Google account data unless you separately enable the Google Workspace integration (see Section 4).',
  },
  {
    category: 'Profile Settings',
    dataPoints:
      'Display name and an email privacy preference (a toggle that controls whether other organization members can see your email address).',
  },
  {
    category: 'Authentication Sessions',
    dataPoints:
      'JSON Web Tokens (JWT) and refresh tokens, managed by Supabase Auth and stored in your browser. These tokens are used solely to keep you logged in and are not shared with third parties.',
  },
  {
    category: 'QR Code Scans',
    dataPoints: (
      <>
        Each time you scan an EquipQR code, we record the scan timestamp and your user identity.{' '}
        <strong>
          GPS coordinates are collected only if your organization administrator has enabled location
          collection.
        </strong>{' '}
        If location collection is disabled, no geographic data is captured or stored from scans.
      </>
    ),
  },
  {
    category: 'Bug Reports',
    dataPoints:
      'When you submit an in-app bug report, we collect the title and description you provide plus anonymized session diagnostics: application version, browser and operating system, screen dimensions, timezone, online/offline status, and basic performance metrics (page load time). These diagnostics are specifically designed to exclude personally identifiable information — no names, emails, or organization names are included.',
  },
  {
    category: 'Push Notification Subscriptions',
    dataPoints:
      'If you opt in to push notifications, we store your browser push endpoint URL, encryption keys (required by the Web Push protocol), and your browser user agent string.',
  },
  {
    category: 'CAPTCHA Verification',
    dataPoints:
      "During signup, hCaptcha generates a one-time verification token. This token is sent to hCaptcha's servers for verification and then discarded — it is never stored in EquipQR.",
  },
  {
    category: 'Notification Preferences',
    dataPoints:
      'Your choices about which notification categories you want to receive (e.g., work order updates, equipment alerts, invitation emails, push notifications).',
  },
];
