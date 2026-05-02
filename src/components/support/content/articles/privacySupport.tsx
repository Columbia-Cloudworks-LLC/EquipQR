import type { SupportArticle } from "../types";

const privacySupportArticles: SupportArticle[] = [
  {
    id: "report-an-issue",
    title: "Report a bug or issue",
    summary:
      "Submit a ticket directly from the dashboard — session diagnostics attach automatically, no personal info required.",
    category: "privacy-support",
    personas: ["all"],
    lastReviewed: "2026-05-01",
    dashboardOnly: true,
    intro: (
      <p>
        The Report an Issue button on this page creates a ticket that the
        EquipQR team sees immediately. Anonymized session diagnostics are
        attached automatically so we can reproduce most problems without you
        pasting logs.
      </p>
    ),
    steps: [
      {
        title: "Click Report an Issue",
        description: (
          <>
            It lives at the top of the Support page, in the Get Help card. The
            button is available to every signed-in user.
          </>
        ),
      },
      {
        title: "Write a clear title and steps",
        description: (
          <ul className="list-disc list-inside text-sm space-y-1">
            <li><strong>Title</strong> — the short headline that shows up in our ticket list.</li>
            <li><strong>Description</strong> — what you expected, what actually happened, and how to reproduce it.</li>
          </ul>
        ),
      },
      {
        title: "Submit",
        description:
          'Your ticket posts instantly. You see a confirmation toast, and the dialog closes.',
      },
      {
        title: "Track updates under My Reported Issues",
        description:
          'My Reported Issues shows status (Open / In Progress / Closed) and any team responses. Updates stream in live via Supabase Realtime — no refresh needed.',
        screenshot: {
          src: "/docs/support/privacy-support/report-an-issue/step-04-my-tickets.png",
          alt: "Support page My Reported Issues section with a ticket expanded",
          viewport: "desktop",
        },
      },
    ],
    outro: (
      <p className="text-sm text-muted-foreground">
        Session diagnostics include the app version, browser, current route,
        organization ID/plan, and error keys — but never your name, email,
        team membership details, or session tokens.
      </p>
    ),
    related: [
      { id: "track-my-tickets", label: "Track your reported issues" },
      { id: "system-status", label: "Check system status" },
    ],
  },
  {
    id: "track-my-tickets",
    title: "Track your reported issues",
    summary:
      "See ticket status and team responses under My Reported Issues on the dashboard Support page.",
    category: "privacy-support",
    personas: ["all"],
    lastReviewed: "2026-05-01",
    dashboardOnly: true,
    steps: [
      {
        title: "Open the Support page",
        description:
          "Support lives under the user menu (top right) → Support, or at /dashboard/support.",
      },
      {
        title: "Expand a ticket",
        description:
          "Tickets appear above the support library. Click a ticket to expand it and see the description, session diagnostics, and any team replies.",
      },
      {
        title: "Watch for live updates",
        description:
          "When the EquipQR team comments or closes the ticket, the row updates in real time. The status badge (Open / In Progress / Closed) mirrors GitHub.",
      },
    ],
    related: [
      { id: "report-an-issue", label: "Report a bug or issue" },
    ],
  },
  {
    id: "submit-privacy-request",
    title: "Submit a privacy request",
    summary:
      "Request access, correction, deletion, or opt-out of your data, even if you do not have a signed-in account.",
    category: "privacy-support",
    personas: ["all"],
    lastReviewed: "2026-05-01",
    intro: (
      <p>
        Privacy requests go through a dedicated intake at{" "}
        <code>/privacy-request</code>. Anyone can submit — you do not need to
        be signed in.
      </p>
    ),
    steps: [
      {
        title: "Open the privacy request form",
        description:
          "Go to https://equipqr.app/privacy-request (linked in the footer under 'Do Not Sell') or open /privacy-request inside the app.",
      },
      {
        title: "Fill in your details",
        description: (
          <ul className="list-disc list-inside text-sm space-y-1">
            <li><strong>Full name</strong> — so we can identify your records.</li>
            <li><strong>Email</strong> — for our response.</li>
            <li>
              <strong>Request type</strong> — Access, Correction, Deletion,
              Do Not Sell / Share, or Limit Use of Sensitive Personal
              Information.
            </li>
            <li><strong>Details</strong> — optional context to help us process the request faster.</li>
          </ul>
        ),
      },
      {
        title: "Complete the hCaptcha",
        description:
          'If the captcha appears, complete it before submitting. It prevents automated abuse of the intake endpoint.',
      },
      {
        title: "Submit and expect a response",
        description:
          'You see a success confirmation after submission. The EquipQR privacy operator reviews and acknowledges your request, then fulfils within the statutory window (typically 45 days, extendable to 90).',
      },
    ],
    related: [
      { id: "audit-log-basics", label: "Use the audit log" },
    ],
  },
  {
    id: "audit-log-basics",
    title: "Use the audit log",
    summary:
      "Admins and Owners can see who did what and when — useful for investigations and compliance evidence.",
    category: "privacy-support",
    personas: ["admin", "owner"],
    requirement: "Must be Organization Owner or Admin.",
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Open Audit Log",
        description:
          "From the sidebar under Audit, click Audit Log. The page lists every recorded event across the organization.",
      },
      {
        title: "Filter the view",
        description:
          "Filter by actor, action type, or date range. Use filters to narrow down a specific incident or to build compliance evidence.",
      },
      {
        title: "Open an event for detail",
        description:
          "Click any row to see the full event body, including who did it, what changed, and the related record.",
        note: "Audit events are immutable once written. You cannot delete or edit an entry, which is what makes the log useful as evidence.",
      },
    ],
    related: [
      { id: "dsr-cockpit-overview", label: "DSR cockpit for privacy operators" },
    ],
  },
  {
    id: "dsr-cockpit-overview",
    title: "DSR cockpit for privacy operators",
    summary:
      "Where Admins and Owners process data subject requests through verification, extension, completion, or denial.",
    category: "privacy-support",
    personas: ["admin", "owner"],
    requirement:
      "DSR Cockpit is restricted to Organization Owners and Admins.",
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Open DSR Cockpit",
        description:
          "From the sidebar under Audit, click DSR Cockpit. The queue shows every open request that needs action.",
      },
      {
        title: "Open a case",
        description:
          "Click a row to open its case. The timeline shows every state change, evidence export attempt, and consumer notice that went out.",
      },
      {
        title: "Take the next action",
        description: (
          <ul className="list-disc list-inside text-sm space-y-1">
            <li><strong>Verify</strong> — confirm the requester owns the data.</li>
            <li><strong>Extend</strong> — extend the deadline up to the statutory maximum.</li>
            <li><strong>Deny</strong> — close with a documented reason.</li>
            <li><strong>Complete</strong> — mark fulfilled after the data has been provided, corrected, or deleted.</li>
            <li><strong>Request Export / Retry Export</strong> — generate the evidence package.</li>
            <li><strong>Resend Notice</strong> — re-deliver the consumer notice.</li>
          </ul>
        ),
      },
      {
        title: "Non-admins get 404 or 403",
        description:
          "Members never see the DSR cockpit route. Cross-org requests 404 to avoid leaking that another organization even received a request.",
      },
    ],
    related: [
      { id: "submit-privacy-request", label: "Submit a privacy request" },
      { id: "audit-log-basics", label: "Use the audit log" },
    ],
  },
  {
    id: "system-status",
    title: "Check system status",
    summary:
      "External uptime and incident monitoring for EquipQR. Always check here first if something looks broken.",
    category: "privacy-support",
    personas: ["all"],
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Open status.equipqr.app",
        description: (
          <>
            Go to{" "}
            <a
              href="https://status.equipqr.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              status.equipqr.app
            </a>{" "}
            in any browser. You do not need to be signed in.
          </>
        ),
      },
      {
        title: "Check the current indicator",
        description:
          "Green means every monitored component is responding normally. Yellow or red means there is an active incident — click through for detail.",
      },
      {
        title: "Subscribe to notifications",
        description:
          "Use the Subscribe option on the status page to receive email updates when an incident opens or is resolved.",
      },
    ],
    related: [
      { id: "report-an-issue", label: "Report a bug or issue" },
    ],
  },
];

export default privacySupportArticles;
