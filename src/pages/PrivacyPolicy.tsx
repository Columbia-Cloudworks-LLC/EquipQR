import { Link } from 'react-router-dom';
import { ExternalLink } from '@/components/ui/external-link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSEO } from '@/components/seo/PageSEO';

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <PageSEO
        title="Privacy Policy"
        description="EquipQR's comprehensive privacy policy. Learn exactly what data we collect, which service providers process it, how we protect it, and what rights you have."
        path="/privacy-policy"
      />
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Last updated: February 10, 2026
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* ---------------------------------------------------------------- */}
        {/* Section 1 — Introduction                                         */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>1. Introduction</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              EquipQR™ (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), developed and operated by{' '}
              <ExternalLink href="https://columbiacloudworks.com" className="hover:text-foreground">
                Columbia Cloudworks LLC
              </ExternalLink>
              , is committed to protecting the privacy of every person and organization that uses our
              fleet equipment management platform. This Privacy Policy explains in plain language what
              information we collect, why we collect it, which external service providers process it,
              how we protect it, and what rights you have.
            </p>
            <p>
              This policy applies to all users of the EquipQR web application located at{' '}
              <ExternalLink href="https://equipqr.app" className="hover:text-foreground">
                equipqr.app
              </ExternalLink>
              , including the QR-code scanning experience, all API endpoints, and any
              associated mobile or progressive web app functionality.
            </p>
            <p>
              Your use of the Service is also governed by our{' '}
              <Link to="/terms-of-service" className="underline">
                Terms of Service
              </Link>
              . Capitalized terms not defined in this policy have the meanings given in the Terms.
            </p>
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Section 2 — Individual-Level Data Collection                     */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>2. Information We Collect — Individual User Level</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              When you create an account or interact with EquipQR, we collect information tied to you
              personally. The table below lists every category of individual-level data and exactly
              what is collected.
            </p>

            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th className="whitespace-nowrap">Category</th>
                    <th>Data Points Collected</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="whitespace-nowrap font-medium">Account Registration</td>
                    <td>
                      Full name, email address, and password. Your password is cryptographically
                      hashed by our authentication provider (Supabase Auth) before storage &mdash; we
                      never store or have access to your plaintext password.
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap font-medium">Google Sign-In (optional)</td>
                    <td>
                      If you choose to sign in with Google, we receive your Google profile name and
                      email address. We do not receive your Google password or access any other Google
                      account data unless you separately enable the Google Workspace integration
                      (see Section 4).
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap font-medium">Profile Settings</td>
                    <td>
                      Display name and an email privacy preference (a toggle that controls whether
                      other organization members can see your email address).
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap font-medium">Authentication Sessions</td>
                    <td>
                      JSON Web Tokens (JWT) and refresh tokens, managed by Supabase Auth and stored
                      in your browser. These tokens are used solely to keep you logged in and are not
                      shared with third parties.
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap font-medium">QR Code Scans</td>
                    <td>
                      Each time you scan an EquipQR code, we record the scan timestamp and your user
                      identity. <strong>GPS coordinates are collected only if your organization
                      administrator has enabled location collection.</strong> If location collection is
                      disabled, no geographic data is captured or stored from scans.
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap font-medium">Bug Reports</td>
                    <td>
                      When you submit an in-app bug report, we collect the title and description you
                      provide plus anonymized session diagnostics: application version, browser and
                      operating system, screen dimensions, timezone, online/offline status, and basic
                      performance metrics (page load time). These diagnostics are specifically designed
                      to exclude personally identifiable information &mdash; no names, emails, or
                      organization names are included.
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap font-medium">Push Notification Subscriptions</td>
                    <td>
                      If you opt in to push notifications, we store your browser push endpoint URL,
                      encryption keys (required by the Web Push protocol), and your browser user agent
                      string.
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap font-medium">CAPTCHA Verification</td>
                    <td>
                      During signup, hCaptcha generates a one-time verification token. This token is
                      sent to hCaptcha&apos;s servers for verification and then discarded &mdash; it is
                      never stored in EquipQR.
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap font-medium">Notification Preferences</td>
                    <td>
                      Your choices about which notification categories you want to receive (e.g.,
                      work order updates, equipment alerts, invitation emails, push notifications).
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Section 3 — Organization-Level Data Collection                   */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>3. Information We Collect — Organization Level</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              Organizations that use EquipQR store business data within the platform. This data
              belongs to the organization and is isolated from other organizations through strict
              database-level security controls (Row Level Security). The table below details every
              category of organization-level data.
            </p>

            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th className="whitespace-nowrap">Category</th>
                    <th>Data Points Collected</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="whitespace-nowrap font-medium">Organization Profile</td>
                    <td>
                      Organization name, subscription plan (free or premium), logo image, brand
                      background color, and feature configuration flags (e.g., fleet map enabled,
                      customers feature enabled, scan location collection enabled).
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap font-medium">Equipment Records</td>
                    <td>
                      Equipment name, manufacturer, model, serial number, status (active /
                      maintenance / inactive), installation date, warranty expiration date, last
                      maintenance date, free-form notes, custom key-value attributes, photos,
                      GPS coordinates (both from QR scans and manual assignment), assigned address
                      fields (street, city, state, country), and a complete location change history
                      with source attribution (scan, manual, team sync, or QuickBooks).
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap font-medium">Work Orders</td>
                    <td>
                      Title, description, priority, status, assigned technician, creator identity,
                      due date, estimated hours, labor entries (date, technician, hours, notes),
                      cost line items (description, quantity, unit price), photos and attachments,
                      notes, preventive maintenance checklists, and completion timestamps.
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap font-medium">Teams</td>
                    <td>
                      Team name, description, physical address and GPS coordinates, and member roster
                      with role assignments (manager, technician, or viewer).
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap font-medium">Inventory</td>
                    <td>
                      Item name, description, SKU, external ID, quantity on hand, low-stock
                      threshold, default unit cost, storage location, item image, and a full
                      transaction history (usage, restock, adjustment records with quantities,
                      dates, and the user who made the change).
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap font-medium">Customers</td>
                    <td>
                      Customer name and active/inactive status. Customers may be linked to teams and
                      equipment for organizational tracking purposes.
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap font-medium">Memberships &amp; Invitations</td>
                    <td>
                      Member email address, organization-level role (owner, admin, or member), join
                      date, and membership status. Invitations include the invitee email, invited
                      role, invitation token, optional personal message, and expiration date.
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap font-medium">File Uploads</td>
                    <td>
                      Images and photos attached to work orders and equipment notes. For each file we
                      store: the original filename, file size, MIME type, an optional description,
                      and the identity of the user who uploaded it.
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap font-medium">Audit Trail</td>
                    <td>
                      An append-only, immutable log of every create, update, and delete action
                      performed on equipment, work orders, inventory items, preventive maintenance
                      records, organization memberships, team memberships, and teams. Each log entry
                      records the actor&apos;s identity (user ID, name, email), timestamp, entity
                      affected, and the specific fields that changed (old and new values). This log
                      is maintained for compliance and accountability purposes (including OSHA, DOT,
                      and ISO standards).
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap font-medium">In-App Notifications</td>
                    <td>
                      Notification titles, messages, type (e.g., work order assigned, ownership
                      transfer request), and read/unread status.
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap font-medium">Preventive Maintenance Templates</td>
                    <td>
                      Checklist template names, descriptions, and structured checklist item data
                      created by organization members for reuse across work orders.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Section 4 — External Service Providers (Subprocessors)           */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>4. External Service Providers (Subprocessors)</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              We use the following third-party service providers to operate EquipQR. For each
              provider we disclose the purpose, what data flows to them, what data flows back, and
              what (if anything) is stored in EquipQR as a result. Optional integrations are clearly
              marked and are only activated when an organization administrator explicitly connects
              them.
            </p>

            {/* 4.1 Supabase */}
            <h3>4.1 Supabase (Supabase Inc.)</h3>
            <ul>
              <li>
                <strong>Purpose:</strong> Cloud database (PostgreSQL), user authentication, file
                storage, real-time data subscriptions, and serverless edge functions.
              </li>
              <li>
                <strong>Data sent to Supabase:</strong> All application data described in Sections 2
                and 3, user credentials for authentication, and uploaded files (images, photos).
              </li>
              <li>
                <strong>Data received from Supabase:</strong> Database query results, authentication
                tokens (JWTs), real-time event updates, and file download URLs.
              </li>
              <li>
                <strong>Data stored in EquipQR via Supabase:</strong> All application data is
                persisted in Supabase-managed PostgreSQL databases. Uploaded files are stored in
                Supabase Storage (S3-compatible).
              </li>
              <li>
                <strong>Data residency:</strong> AWS, United States regions. Supabase maintains SOC 2
                Type II compliance. See{' '}
                <ExternalLink href="https://supabase.com/security" className="hover:text-foreground">
                  supabase.com/security
                </ExternalLink>{' '}
                for details.
              </li>
            </ul>

            {/* 4.2 Google Maps */}
            <h3>4.2 Google Maps Platform (Google LLC)</h3>
            <ul>
              <li>
                <strong>Purpose:</strong> Fleet map visualization, address autocomplete, and
                converting addresses to geographic coordinates (geocoding).
              </li>
              <li>
                <strong>Data sent to Google:</strong> Address search queries (text typed into
                autocomplete fields) and address strings submitted for geocoding. No user identity,
                email, or account information is sent to Google Maps APIs.
              </li>
              <li>
                <strong>Data received from Google:</strong> Place predictions (autocomplete
                suggestions), formatted addresses, address components, and latitude/longitude
                coordinates.
              </li>
              <li>
                <strong>Data stored in EquipQR:</strong> Geocoded results (address-to-coordinate
                mappings) are cached in our database to reduce redundant API calls and improve
                performance. Equipment and team location coordinates derived from geocoding are
                stored as part of those records.
              </li>
            </ul>

            {/* 4.3 hCaptcha */}
            <h3>4.3 hCaptcha (Intuition Machines, Inc.)</h3>
            <ul>
              <li>
                <strong>Purpose:</strong> Bot and abuse protection on account signup forms.
              </li>
              <li>
                <strong>Data sent to hCaptcha:</strong> The CAPTCHA response token generated in your
                browser, plus the originating page URL. hCaptcha may also collect your IP address and
                browser characteristics as part of its challenge evaluation per its own{' '}
                <ExternalLink href="https://www.hcaptcha.com/privacy" className="hover:text-foreground">
                  privacy policy
                </ExternalLink>
                .
              </li>
              <li>
                <strong>Data received from hCaptcha:</strong> A pass/fail verification result.
              </li>
              <li>
                <strong>Data stored in EquipQR:</strong> None. The verification is stateless and the
                token is discarded immediately after validation.
              </li>
            </ul>

            {/* 4.4 Resend */}
            <h3>4.4 Resend (Resend Inc.)</h3>
            <ul>
              <li>
                <strong>Purpose:</strong> Transactional email delivery for organization membership
                invitations.
              </li>
              <li>
                <strong>Data sent to Resend:</strong> The recipient&apos;s email address, the
                organization name, the inviter&apos;s name, the invited role, an optional personal
                message, and the invitation acceptance link.
              </li>
              <li>
                <strong>Data received from Resend:</strong> A delivery confirmation and message ID.
              </li>
              <li>
                <strong>Data stored in EquipQR:</strong> None. Resend is used solely for email
                delivery and we do not store Resend-specific data.
              </li>
            </ul>

            {/* 4.5 Vercel */}
            <h3>4.5 Vercel (Vercel Inc.)</h3>
            <ul>
              <li>
                <strong>Purpose:</strong> Hosting and content delivery network (CDN) for the EquipQR
                frontend web application.
              </li>
              <li>
                <strong>Data sent to Vercel:</strong> Standard HTTP requests from your browser when
                you access EquipQR (URL, headers, IP address).
              </li>
              <li>
                <strong>Data received from Vercel:</strong> The application assets (HTML, CSS,
                JavaScript) that power the EquipQR interface.
              </li>
              <li>
                <strong>Data stored in EquipQR:</strong> None. Vercel is a hosting platform only.
              </li>
              <li>
                <strong>Note:</strong> Vercel may collect standard web server access logs (IP
                address, user agent, timestamps) under its own{' '}
                <ExternalLink href="https://vercel.com/legal/privacy-policy" className="hover:text-foreground">
                  privacy policy
                </ExternalLink>
                .
              </li>
            </ul>

            {/* 4.6 Stripe (Deprecated) */}
            <h3>4.6 Stripe (Stripe, Inc.) &mdash; Deprecated</h3>
            <ul>
              <li>
                <strong>Purpose:</strong> Payment processing. This integration is currently disabled
                and no new data is sent to Stripe.
              </li>
              <li>
                <strong>Data previously sent to Stripe:</strong> Organization billing identity and
                subscription plan selections.
              </li>
              <li>
                <strong>Data stored in EquipQR:</strong> Historical Stripe customer IDs and
                subscription IDs remain in organization records for accounting continuity. No
                payment card numbers or bank account details were ever stored in EquipQR &mdash;
                those were handled entirely by Stripe.
              </li>
            </ul>

            {/* 4.7 QuickBooks Online */}
            <h3>4.7 QuickBooks Online (Intuit Inc.) &mdash; Optional Integration</h3>
            <ul>
              <li>
                <strong>Purpose:</strong> Export work order invoices to QuickBooks and synchronize
                customer lists between EquipQR teams and QuickBooks customers.
              </li>
              <li>
                <strong>Activation:</strong> Only active when an organization administrator
                explicitly connects their QuickBooks account via OAuth.
              </li>
              <li>
                <strong>Data sent to QuickBooks:</strong> OAuth authorization requests, work order
                cost and labor data for invoice creation, customer search queries, and optionally
                PDF attachments of work orders.
              </li>
              <li>
                <strong>Data received from QuickBooks:</strong> OAuth tokens (access and refresh),
                the QuickBooks company ID (realm ID), customer lists (names and IDs), and invoice
                confirmation numbers.
              </li>
              <li>
                <strong>Data stored in EquipQR:</strong> OAuth tokens (encrypted at rest using
                AES with a server-side encryption key), team-to-QuickBooks-customer mappings, and
                an export audit log (invoice IDs, export status, timestamps).
              </li>
            </ul>

            {/* 4.8 Google Workspace */}
            <h3>4.8 Google Workspace (Google LLC) &mdash; Optional Integration</h3>
            <ul>
              <li>
                <strong>Purpose:</strong> Synchronize your Google Workspace directory users with
                EquipQR memberships, export work order data to Google Sheets, and upload PDF
                reports to Google Drive.
              </li>
              <li>
                <strong>Activation:</strong> Only active when an organization administrator
                explicitly connects their Google Workspace account via OAuth.
              </li>
              <li>
                <strong>Data sent to Google:</strong> OAuth authorization requests, directory user
                listing requests (Admin SDK), spreadsheet creation requests (Sheets API), and
                file upload requests (Drive API).
              </li>
              <li>
                <strong>Data received from Google:</strong> OAuth tokens (access and refresh),
                directory user details (name, email, suspended status), spreadsheet and file IDs,
                and web view links.
              </li>
              <li>
                <strong>Data stored in EquipQR:</strong> OAuth tokens (encrypted at rest using AES
                with a server-side encryption key), directory user records (name, email, suspended
                status), domain verification records, and OAuth session metadata.
              </li>
              <li>
                <strong>OAuth scopes requested:</strong>{' '}
                <code>admin.directory.user.readonly</code> (directory sync),{' '}
                <code>spreadsheets</code> (Sheets export),{' '}
                <code>drive.file</code> (Drive uploads &mdash; limited to files created by
                EquipQR).
              </li>
            </ul>

            {/* 4.9 GitHub */}
            <h3>4.9 GitHub (GitHub, Inc.)</h3>
            <ul>
              <li>
                <strong>Purpose:</strong> Synchronize in-app bug reports with our internal issue
                tracker so our development team can resolve issues efficiently.
              </li>
              <li>
                <strong>Data sent to GitHub:</strong> A sanitized version of the bug report title
                and description. Personally identifiable information (email addresses and phone
                numbers) is automatically redacted before submission. Anonymized session diagnostics
                (see Section 2) are attached for debugging purposes.
              </li>
              <li>
                <strong>Data received from GitHub:</strong> The issue number, status updates
                (open/closed), and developer comments.
              </li>
              <li>
                <strong>Data stored in EquipQR:</strong> The GitHub issue number, current issue
                status, and synced developer comments (displayed to the reporting user within the
                app).
              </li>
            </ul>

            {/* 4.10 Web Push */}
            <h3>4.10 Web Push Services (Browser Vendors)</h3>
            <ul>
              <li>
                <strong>Purpose:</strong> Delivering push notifications to your device when you are
                not actively using EquipQR (e.g., work order assignments, status changes).
              </li>
              <li>
                <strong>Data sent to browser push services:</strong> Notification title, body text,
                and an action URL. The push payload is encrypted end-to-end using the VAPID
                (Voluntary Application Server Identification) protocol. The specific push service
                depends on your browser (e.g., Firebase Cloud Messaging for Chrome, Apple Push
                Notification Service for Safari).
              </li>
              <li>
                <strong>Data stored in EquipQR:</strong> Your push subscription endpoint URL,
                encryption keys (required by the Web Push protocol), and browser user agent string.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Section 5 — Cookies, Local Storage, and Session Data             */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>5. Cookies, Local Storage, and Session Data</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              EquipQR uses minimal browser storage, exclusively for application functionality. We do
              not use any third-party tracking cookies, advertising pixels, or browser
              fingerprinting techniques.
            </p>

            <h3>Cookies</h3>
            <p>
              We set one functional cookie:
            </p>
            <ul>
              <li>
                <strong><code>sidebar:state</code></strong> &mdash; Remembers whether the navigation
                sidebar is expanded or collapsed. Expires after 7 days. This cookie contains no
                personal information and is not shared with any third party.
              </li>
            </ul>

            <h3>Local Storage</h3>
            <p>
              We use your browser&apos;s localStorage for application state only:
            </p>
            <ul>
              <li>
                <strong>Organization preference</strong> &mdash; Remembers which organization you
                last selected (if you belong to multiple).
              </li>
              <li>
                <strong>Dashboard layout</strong> &mdash; Saves your preferred dashboard card
                arrangement.
              </li>
              <li>
                <strong>Work timer state</strong> &mdash; Persists an in-progress labor timer so it
                survives page refreshes.
              </li>
              <li>
                <strong>Admin grant throttling</strong> &mdash; Prevents redundant permission
                lookups within a short window.
              </li>
            </ul>
            <p>
              None of this data is sent to any server or third party. It remains in your browser
              and can be cleared at any time through your browser settings.
            </p>

            <h3>Session Storage</h3>
            <p>
              We use sessionStorage for one purpose: storing a pending redirect URL when a QR code
              scan requires you to log in first. This value is cleared automatically after use or
              when the browser tab is closed.
            </p>

            <h3>Authentication Session</h3>
            <p>
              Supabase Auth stores a JWT access token and refresh token in your browser. These
              tokens are used solely to authenticate your requests to EquipQR and are managed
              entirely by the Supabase Auth SDK. They are not accessible to third-party scripts.
            </p>
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Section 6 — How We Use Your Information                          */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>6. How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              We use the information described above for the following specific purposes:
            </p>
            <ul>
              <li>
                <strong>Providing the Service:</strong> To operate, maintain, and deliver the core
                EquipQR features &mdash; equipment tracking, work order management, team
                collaboration, inventory management, QR code scanning, and fleet map visualization.
              </li>
              <li>
                <strong>Authentication and access control:</strong> To verify your identity, manage
                your session, and enforce role-based permissions within your organization and teams.
              </li>
              <li>
                <strong>Notifications:</strong> To send you in-app notifications, push notifications
                (if you opted in), and transactional emails (such as organization invitations) about
                activity relevant to you.
              </li>
              <li>
                <strong>Integration fulfillment:</strong> To export data to QuickBooks or Google
                Workspace when your organization has explicitly connected those services.
              </li>
              <li>
                <strong>Bug resolution:</strong> To diagnose and resolve issues you report through
                the in-app bug reporting feature.
              </li>
              <li>
                <strong>Compliance and audit:</strong> To maintain the immutable audit trail that
                helps your organization meet regulatory requirements (e.g., OSHA, DOT, ISO).
              </li>
              <li>
                <strong>Security and abuse prevention:</strong> To detect and prevent unauthorized
                access, bot abuse (via hCaptcha), and fraudulent activity.
              </li>
              <li>
                <strong>Service improvement:</strong> To analyze aggregate, de-identified usage
                patterns to improve platform reliability and user experience. We do not use
                third-party analytics services.
              </li>
              <li>
                <strong>Legal obligations:</strong> To comply with applicable laws, regulations,
                legal processes, or enforceable governmental requests.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Section 7 — How We Share Your Information                        */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>7. How We Share Your Information</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              We do not sell your personal information. We share data only in the following
              circumstances:
            </p>
            <ul>
              <li>
                <strong>Subprocessors listed in Section 4:</strong> We share data with the
                third-party service providers described above, strictly for the purposes stated.
                Each provider processes data only as necessary to deliver their specific service to
                EquipQR.
              </li>
              <li>
                <strong>Within your organization:</strong> Other members of your organization can
                see your name, role, and (unless you have enabled the email privacy setting) your
                email address. Organization owners and administrators can always see member email
                addresses for management purposes.
              </li>
              <li>
                <strong>Optional integrations (with your organization&apos;s consent):</strong> When
                an organization administrator connects QuickBooks Online or Google Workspace,
                relevant organization data is shared with those services as described in Section 4.
                Individual users cannot trigger these integrations.
              </li>
              <li>
                <strong>Legal compliance:</strong> We may disclose your information if required by
                law or in response to a valid legal request, such as a subpoena, court order, or
                government inquiry.
              </li>
              <li>
                <strong>Business transfers:</strong> In the event of a merger, acquisition, or sale
                of all or a portion of our assets, your information may be transferred as part of
                that transaction. We will notify affected users before their data is subject to a
                different privacy policy.
              </li>
              <li>
                <strong>With your consent:</strong> We may share your information with third parties
                when we have your explicit consent to do so.
              </li>
            </ul>
            <p>
              We do not share data with advertising networks, data brokers, or any parties for
              marketing purposes.
            </p>
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Section 8 — Data Security                                        */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>8. Data Security</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              We implement multiple layers of technical and organizational security measures to
              protect your data:
            </p>
            <ul>
              <li>
                <strong>Encryption in transit:</strong> All data transmitted between your browser and
                EquipQR is encrypted using TLS (HTTPS). We enforce HTTP Strict Transport Security
                (HSTS) with a one-year max-age, including subdomains, with preload.
              </li>
              <li>
                <strong>Encryption at rest:</strong> All database data is encrypted at rest by
                Supabase-managed PostgreSQL (AES-256). Uploaded files in Supabase Storage are
                similarly encrypted at rest.
              </li>
              <li>
                <strong>OAuth token encryption:</strong> QuickBooks and Google Workspace OAuth tokens
                are additionally encrypted using AES with a dedicated server-side encryption key
                before storage in the database.
              </li>
              <li>
                <strong>Multi-tenant isolation:</strong> PostgreSQL Row Level Security (RLS) policies
                enforce strict data isolation between organizations at the database level. Every
                query is automatically scoped to the requesting user&apos;s organization.
              </li>
              <li>
                <strong>Content Security Policy (CSP):</strong> Strict CSP headers limit which
                external resources the application can load, mitigating cross-site scripting (XSS)
                attacks.
              </li>
              <li>
                <strong>Additional HTTP security headers:</strong> <code>X-Frame-Options: DENY</code>{' '}
                (prevents clickjacking), <code>X-Content-Type-Options: nosniff</code>,{' '}
                <code>Referrer-Policy: strict-origin-when-cross-origin</code>, and a{' '}
                <code>Permissions-Policy</code> that restricts access to camera and microphone APIs.
              </li>
              <li>
                <strong>Bot protection:</strong> hCaptcha protects signup forms against automated
                abuse.
              </li>
              <li>
                <strong>Rate limiting:</strong> Sensitive operations (geocoding, bug report
                submission, data exports) are rate-limited to prevent abuse.
              </li>
              <li>
                <strong>Input validation:</strong> All user input is validated on both the client
                (using Zod schemas) and the server to prevent injection and malformed data.
              </li>
              <li>
                <strong>PII redaction:</strong> Bug reports sent to GitHub are automatically scanned
                and have email addresses and phone numbers redacted before submission.
              </li>
              <li>
                <strong>Webhook verification:</strong> Inbound webhooks (e.g., from GitHub) are
                verified using HMAC-SHA256 signatures to ensure authenticity.
              </li>
              <li>
                <strong>Regular security audits:</strong> We run automated dependency vulnerability
                scanning (npm audit) and static code analysis (CodeQL) as part of our continuous
                integration pipeline.
              </li>
            </ul>
            <p>
              No method of electronic transmission or storage is 100% secure. While we strive to
              protect your information, we cannot guarantee absolute security. For more on our
              security posture and availability commitments, see the{' '}
              <Link to="/terms-of-service" className="underline">
                Terms of Service
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Section 9 — Data Retention, Export, and Deletion                  */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>9. Data Retention, Export, and Deletion</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              We retain your information for as long as necessary to fulfill the purposes described
              in this Privacy Policy and to comply with our legal obligations.
            </p>
            <ul>
              <li>
                <strong>Active accounts:</strong> Your data is retained for the duration of your
                account and your organization&apos;s active subscription.
              </li>
              <li>
                <strong>Post-termination export window:</strong> Upon termination or expiration of
                your subscription, you may export your Customer Data for{' '}
                <strong>30 days</strong>. After that window, we may delete or de-identify Customer
                Data from active systems.
              </li>
              <li>
                <strong>Audit trail:</strong> Audit log records may be retained for longer periods as
                required by applicable regulations or for legitimate business record-keeping.
              </li>
              <li>
                <strong>Backup retention:</strong> Database backups managed by Supabase may retain
                data for a limited period per Supabase&apos;s infrastructure policies, after which
                they are automatically purged.
              </li>
              <li>
                <strong>Legal holds:</strong> We may retain data beyond the normal retention period
                where required by law or for the establishment, exercise, or defense of legal
                claims.
              </li>
            </ul>
            <p>
              For full details on data export and deletion procedures, see the{' '}
              <Link to="/terms-of-service" className="underline">
                Terms of Service
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Section 10 — Your Rights                                         */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>10. Your Rights and Choices</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              Depending on your jurisdiction, you may have some or all of the following rights
              regarding your personal information:
            </p>
            <ul>
              <li>
                <strong>Access:</strong> Request a copy of the personal data we hold about you.
              </li>
              <li>
                <strong>Correction:</strong> Request that we correct inaccurate or incomplete
                personal data. You can update your display name directly in your profile settings.
              </li>
              <li>
                <strong>Deletion:</strong> Request that we delete your personal data, subject to
                legal retention requirements.
              </li>
              <li>
                <strong>Data portability:</strong> Request your data in a structured,
                machine-readable format.
              </li>
              <li>
                <strong>Restriction:</strong> Request that we restrict processing of your personal
                data under certain conditions.
              </li>
              <li>
                <strong>Objection:</strong> Object to our processing of your personal data where we
                rely on legitimate interests.
              </li>
            </ul>

            <h3>Controls Available to You</h3>
            <ul>
              <li>
                <strong>Email privacy:</strong> You can toggle your email visibility in your profile
                settings. When enabled, other organization members (except owners and administrators)
                will not see your email address.
              </li>
              <li>
                <strong>Push notifications:</strong> You can opt in or out of push notifications at
                any time through your notification preferences or your browser settings.
              </li>
              <li>
                <strong>Notification preferences:</strong> You can customize which categories of
                notifications you receive (work orders, equipment alerts, invitations, etc.).
              </li>
            </ul>

            <h3>Controls Available to Organization Administrators</h3>
            <ul>
              <li>
                <strong>GPS location collection:</strong> Organization administrators can enable or
                disable GPS location collection from QR code scans at any time via organization
                settings. When disabled, no location data is captured from scans.
              </li>
              <li>
                <strong>Optional integrations:</strong> Organization administrators control whether
                QuickBooks Online and Google Workspace integrations are connected or disconnected.
              </li>
            </ul>

            <h3>Data Processing Agreements</h3>
            <p>
              If your organization requires a Data Processing Agreement (DPA) for regulatory
              compliance (e.g., GDPR), you can request our standard DPA at any time by contacting
              us. We will provide it for review and execution.
            </p>

            <p>
              To exercise any of these rights, please contact us using the information in Section 14.
              We will respond to verified requests within 30 days (or sooner as required by
              applicable law).
            </p>
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Section 11 — Children's Privacy                                  */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>11. Children&apos;s Privacy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              EquipQR is a business-to-business platform designed for use by organizations and their
              employees. Our Service is not directed to individuals under the age of 16, and we do
              not knowingly collect personal information from children. If we become aware that we
              have inadvertently collected data from a child under 16, we will take steps to delete
              that information promptly. If you believe a child has provided us with personal data,
              please contact us immediately.
            </p>
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Section 12 — International Data Transfers                        */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>12. International Data Transfers</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              EquipQR is operated from the United States. Your data is processed and stored in the
              United States through our infrastructure providers (Supabase on AWS and Vercel). If you
              access EquipQR from outside the United States, please be aware that your information
              will be transferred to, stored, and processed in the United States, where data
              protection laws may differ from those in your jurisdiction.
            </p>
            <p>
              By using the Service, you consent to the transfer of your information to the United
              States. If your organization requires specific transfer mechanisms (such as Standard
              Contractual Clauses), please contact us to discuss available options.
            </p>
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Section 13 — Changes to This Policy                              */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>13. Changes to This Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices,
              technologies, legal requirements, or for other operational reasons. When we make
              changes:
            </p>
            <ul>
              <li>
                We will update the &quot;Last updated&quot; date at the top of this page.
              </li>
              <li>
                For material changes that affect how your personal data is collected or used, we will
                notify you via an in-app notification or email to the address associated with your
                account, at least 30 days before the changes take effect.
              </li>
              <li>
                The updated policy will be posted on this page. Your continued use of the Service
                after the effective date constitutes your acceptance of the updated policy.
              </li>
            </ul>
            <p>
              We encourage you to review this Privacy Policy periodically.
            </p>
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Section 14 — Contact Us                                          */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>14. Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              If you have any questions about this Privacy Policy, want to exercise your data rights,
              or have concerns about our data practices, please contact us:
            </p>
            <ul>
              <li>
                <strong>Email:</strong>{' '}
                <ExternalLink href="mailto:nicholas.king@columbiacloudworks.com" className="hover:text-foreground">
                  nicholas.king@columbiacloudworks.com
                </ExternalLink>
              </li>
              <li>
                <strong>Website:</strong>{' '}
                <ExternalLink href="https://equipqr.app" className="hover:text-foreground">
                  equipqr.app
                </ExternalLink>
              </li>
              <li>
                <strong>Company:</strong>{' '}
                <ExternalLink href="https://columbiacloudworks.com" className="hover:text-foreground">
                  Columbia Cloudworks LLC
                </ExternalLink>
              </li>
              <li>
                <strong>Address:</strong> Contact us for business address information
              </li>
            </ul>
            <p>
              We aim to respond to all privacy-related inquiries within 30 days.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
