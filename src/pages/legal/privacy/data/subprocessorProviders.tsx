import { ExternalLink } from '@/components/ui/external-link';
import type { PolicyListItem } from '@/components/legal/PolicyList';

export interface SubprocessorProvider {
  title: string;
  items: PolicyListItem[];
}

export const subprocessorProviders: SubprocessorProvider[] = [
  {
    title: "4.1 Supabase (Supabase Inc.)",
    items: [
                {
                  label: 'Purpose:',
                  content:
                    'Cloud database (PostgreSQL), user authentication, file storage, real-time data subscriptions, and serverless edge functions.',
                },
                {
                  label: 'Data sent to Supabase:',
                  content:
                    'All application data described in Sections 2 and 3, user credentials for authentication, and uploaded files (images, photos).',
                },
                {
                  label: 'Data received from Supabase:',
                  content:
                    'Database query results, authentication tokens (JWTs), real-time event updates, and file download URLs.',
                },
                {
                  label: 'Data stored in EquipQR via Supabase:',
                  content:
                    'All application data is persisted in Supabase-managed PostgreSQL databases. Uploaded files are stored in Supabase Storage (S3-compatible).',
                },
                {
                  label: 'Data residency:',
                  content: (
                    <>
                      AWS, United States regions. Supabase maintains SOC 2 Type II compliance. See{' '}
                      <ExternalLink href="https://supabase.com/security" className="hover:text-foreground">
                        supabase.com/security
                      </ExternalLink>{' '}
                      for details.
                    </>
                  ),
                },
              ],
  },
  {
    title: "4.2 Google Maps Platform (Google LLC)",
    items: [
                {
                  label: 'Purpose:',
                  content:
                    'Fleet map visualization, address autocomplete, and converting addresses to geographic coordinates (geocoding).',
                },
                {
                  label: 'Data sent to Google:',
                  content:
                    'Address search queries (text typed into autocomplete fields) and address strings submitted for geocoding. No user identity, email, or account information is sent to Google Maps APIs.',
                },
                {
                  label: 'Data received from Google:',
                  content:
                    'Place predictions (autocomplete suggestions), formatted addresses, address components, and latitude/longitude coordinates.',
                },
                {
                  label: 'Data stored in EquipQR:',
                  content:
                    'Geocoded results (address-to-coordinate mappings) are cached in our database to reduce redundant API calls and improve performance. Equipment and team location coordinates derived from geocoding are stored as part of those records.',
                },
              ],
  },
  {
    title: "4.3 hCaptcha (Intuition Machines, Inc.)",
    items: [
                {
                  label: 'Purpose:',
                  content: 'Bot and abuse protection on account signup forms.',
                },
                {
                  label: 'Data sent to hCaptcha:',
                  content: (
                    <>
                      The CAPTCHA response token generated in your browser, plus the originating page URL.
                      hCaptcha may also collect your IP address and browser characteristics as part of its
                      challenge evaluation per its own{' '}
                      <ExternalLink href="https://www.hcaptcha.com/privacy" className="hover:text-foreground">
                        privacy policy
                      </ExternalLink>
                      .
                    </>
                  ),
                },
                {
                  label: 'Data received from hCaptcha:',
                  content: 'A pass/fail verification result.',
                },
                {
                  label: 'Data stored in EquipQR:',
                  content:
                    'None. The verification is stateless and the token is discarded immediately after validation.',
                },
              ],
  },
  {
    title: "4.4 Resend (Resend Inc.)",
    items: [
                {
                  label: 'Purpose:',
                  content: 'Transactional email delivery for organization membership invitations.',
                },
                {
                  label: 'Data sent to Resend:',
                  content: (
                    <>
                      The recipient&apos;s email address, the organization name, the inviter&apos;s name, the
                      invited role, an optional personal message, and the invitation acceptance link.
                    </>
                  ),
                },
                {
                  label: 'Data received from Resend:',
                  content: 'A delivery confirmation and message ID.',
                },
                {
                  label: 'Data stored in EquipQR:',
                  content: 'None. Resend is used solely for email delivery and we do not store Resend-specific data.',
                },
              ],
  },
  {
    title: "4.5 Vercel (Vercel Inc.)",
    items: [
                {
                  label: 'Purpose:',
                  content: 'Hosting and content delivery network (CDN) for the EquipQR frontend web application.',
                },
                {
                  label: 'Data sent to Vercel:',
                  content:
                    'Standard HTTP requests from your browser when you access EquipQR (URL, headers, IP address).',
                },
                {
                  label: 'Data received from Vercel:',
                  content: 'The application assets (HTML, CSS, JavaScript) that power the EquipQR interface.',
                },
                {
                  label: 'Data stored in EquipQR:',
                  content: 'None. Vercel is a hosting platform only.',
                },
                {
                  label: 'Note:',
                  content: (
                    <>
                      Vercel may collect standard web server access logs (IP address, user agent, timestamps)
                      under its own{' '}
                      <ExternalLink href="https://vercel.com/legal/privacy-policy" className="hover:text-foreground">
                        privacy policy
                      </ExternalLink>
                      .
                    </>
                  ),
                },
              ],
  },
  {
    title: "4.6 Stripe (Stripe, Inc.) — Deprecated",
    items: [
                {
                  label: 'Purpose:',
                  content:
                    'Payment processing. This integration is currently disabled and no new data is sent to Stripe.',
                },
                {
                  label: 'Data previously sent to Stripe:',
                  content: 'Organization billing identity and subscription plan selections.',
                },
                {
                  label: 'Data stored in EquipQR:',
                  content:
                    'Historical Stripe customer IDs and subscription IDs remain in organization records for accounting continuity. No payment card numbers or bank account details were ever stored in EquipQR — those were handled entirely by Stripe.',
                },
              ],
  },
  {
    title: "4.7 QuickBooks Online (Intuit Inc.) — Optional Integration",
    items: [
                {
                  label: 'Purpose:',
                  content:
                    'Export work order invoices to QuickBooks and synchronize customer lists between EquipQR teams and QuickBooks customers.',
                },
                {
                  label: 'Activation:',
                  content:
                    'Only active when an organization administrator explicitly connects their QuickBooks account via OAuth.',
                },
                {
                  label: 'Data sent to QuickBooks:',
                  content:
                    'OAuth authorization requests, work order cost and labor data for invoice creation, and customer search queries.',
                },
                {
                  label: 'Data received from QuickBooks:',
                  content:
                    'OAuth tokens (access and refresh), the QuickBooks company ID (realm ID), customer lists (names and IDs), and invoice confirmation numbers.',
                },
                {
                  label: 'Data stored in EquipQR:',
                  content:
                    'OAuth tokens (encrypted at rest using AES with a server-side encryption key), team-to-QuickBooks-customer mappings, and an export audit log (invoice IDs, export status, timestamps).',
                },
              ],
  },
  {
    title: "4.8 Google Workspace (Google LLC) — Optional Integration",
    items: [
                {
                  label: 'Purpose:',
                  content:
                    'Synchronize your Google Workspace directory users with EquipQR memberships, export work order data to Google Sheets, and upload PDF reports to Google Drive.',
                },
                {
                  label: 'Activation:',
                  content:
                    'Only active when an organization administrator explicitly connects their Google Workspace account via OAuth.',
                },
                {
                  label: 'Data sent to Google:',
                  content:
                    'OAuth authorization requests, directory user listing requests (Admin SDK), spreadsheet creation requests (Sheets API), and file upload requests (Drive API).',
                },
                {
                  label: 'Data received from Google:',
                  content:
                    'OAuth tokens (access and refresh), directory user details (name, email, suspended status), spreadsheet and file IDs, and web view links.',
                },
                {
                  label: 'Data stored in EquipQR:',
                  content:
                    'OAuth tokens (encrypted at rest using AES with a server-side encryption key), directory user records (name, email, suspended status), domain verification records, and OAuth session metadata.',
                },
                {
                  label: 'OAuth scopes requested:',
                  content: (
                    <>
                      <code>admin.directory.user.readonly</code> (directory sync), <code>spreadsheets</code>{' '}
                      (Sheets export), <code>drive.file</code> (Drive uploads — limited to files created by
                      EquipQR).
                    </>
                  ),
                },
              ],
  },
  {
    title: "4.9 GitHub (GitHub, Inc.)",
    items: [
                {
                  label: 'Purpose:',
                  content:
                    'Synchronize in-app bug reports with our internal issue tracker so our development team can resolve issues efficiently.',
                },
                {
                  label: 'Data sent to GitHub:',
                  content:
                    'A sanitized version of the bug report title and description. Personally identifiable information (email addresses and phone numbers) is automatically redacted before submission. Anonymized session diagnostics (see Section 2) are attached for debugging purposes.',
                },
                {
                  label: 'Data received from GitHub:',
                  content: 'The issue number, status updates (open/closed), and developer comments.',
                },
                {
                  label: 'Data stored in EquipQR:',
                  content:
                    'The GitHub issue number, current issue status, and synced developer comments (displayed to the reporting user within the app).',
                },
              ],
  },
  {
    title: "4.10 Web Push Services (Browser Vendors)",
    items: [
                {
                  label: 'Purpose:',
                  content:
                    'Delivering push notifications to your device when you are not actively using EquipQR (e.g., work order assignments, status changes).',
                },
                {
                  label: 'Data sent to browser push services:',
                  content:
                    'Notification title, body text, and an action URL. The push payload is encrypted end-to-end using the VAPID (Voluntary Application Server Identification) protocol. The specific push service depends on your browser (e.g., Firebase Cloud Messaging for Chrome, Apple Push Notification Service for Safari).',
                },
                {
                  label: 'Data stored in EquipQR:',
                  content:
                    'Your push subscription endpoint URL, encryption keys (required by the Web Push protocol), and browser user agent string.',
                },
              ],
  },];
