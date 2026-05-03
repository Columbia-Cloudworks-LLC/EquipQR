import type { SupportArticle } from "../types";

const workOrderArticles: SupportArticle[] = [
  {
    id: "work-order-lifecycle",
    title: "Work order lifecycle reference",
    summary:
      "The complete status flow and who is allowed to move a work order between each state.",
    category: "work-orders",
    personas: ["manager", "admin", "owner", "technician"],
    lastReviewed: "2026-05-01",
    intro: (
      <p>
        Every work order moves through the same lifecycle. The detail page only
        shows valid next-status buttons, so the permission rules below are
        enforced in both the UI and the database.
      </p>
    ),
    steps: [
      {
        title: "Status flow",
        description: (
          <ol className="list-decimal list-inside space-y-1">
            <li><strong>Submitted</strong> — created, not yet reviewed.</li>
            <li><strong>Accepted</strong> — reviewed and approved for scheduling.</li>
            <li><strong>Assigned</strong> — handed to a specific technician or team.</li>
            <li><strong>In Progress</strong> — work has started.</li>
            <li><strong>On Hold</strong> — paused (waiting on parts, customer, or access).</li>
            <li><strong>Completed</strong> — work finished and documented.</li>
            <li><strong>Cancelled</strong> — terminal state if the work is no longer needed.</li>
          </ol>
        ),
      },
      {
        title: "Who can change what",
        description: (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded-md">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2">Transition</th>
                  <th className="p-2">Allowed roles</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-2">Submitted → Accepted</td>
                  <td className="p-2">Manager, Admin, Owner</td>
                </tr>
                <tr>
                  <td className="p-2">Accepted → Assigned</td>
                  <td className="p-2">Manager, Admin, Owner</td>
                </tr>
                <tr>
                  <td className="p-2">Assigned → In Progress</td>
                  <td className="p-2">Manager+ or assigned Technician</td>
                </tr>
                <tr>
                  <td className="p-2">In Progress → Completed</td>
                  <td className="p-2">Manager+ or assigned Technician</td>
                </tr>
                <tr>
                  <td className="p-2">Any → On Hold</td>
                  <td className="p-2">Manager+ or assigned Technician</td>
                </tr>
                <tr>
                  <td className="p-2">Any → Cancelled</td>
                  <td className="p-2">Manager, Admin, Owner</td>
                </tr>
              </tbody>
            </table>
          </div>
        ),
      },
      {
        title: "Cancelled vs Completed",
        description:
          "Completed captures a close-out date automatically, which powers reporting and overdue calculations. Cancelled is a terminal state that leaves the work order in history without counting as finished work.",
      },
    ],
    related: [
      { id: "assign-work-order", label: "Assign a work order" },
      { id: "triage-submitted-requests", label: "Triage submitted work requests" },
    ],
  },
  {
    id: "triage-submitted-requests",
    title: "Triage submitted work requests",
    summary:
      "How Managers handle incoming Requestor submissions: review, accept or reject, schedule, and assign.",
    category: "work-orders",
    personas: ["manager", "admin", "owner"],
    lastReviewed: "2026-05-01",
    intro: (
      <p>
        Requestor submissions arrive in the team's work queue with a status of
        <strong> Submitted</strong>. Managers decide what happens next: accept,
        schedule, and assign, or cancel with a reason.
      </p>
    ),
    steps: [
      {
        title: "Open Work Orders",
        description:
          "Use the sidebar or mobile bottom nav to open the Work Orders page. Filter by Submitted status to see the queue.",
      },
      {
        title: "Review each request",
        description:
          "Open the request to see the Requestor's description, photos, and the equipment it refers to. Verify the work actually belongs to your team.",
      },
      {
        title: "Accept or cancel",
        description: (
          <>
            Click <strong>Accept</strong> to advance the work order to the
            Accepted state. Use <strong>Cancel</strong> if the request is not
            actionable and add a short reason so the Requestor has context.
          </>
        ),
      },
      {
        title: "Set priority and due date",
        description:
          "Priority and due date drive the technician's daily queue and the overdue metrics on the dashboard.",
      },
      {
        title: "Assign a technician or team",
        description:
          "Pick an individual from the assignee dropdown, a team, or both. Individual assignment takes precedence for status updates.",
        screenshot: {
          src: "/docs/support/work-orders/triage-submitted-requests/step-05-assign.png",
          alt: "Manager assigning a work order to a technician",
          viewport: "desktop",
        },
      },
    ],
    related: [
      { id: "assign-work-order", label: "Assign a work order" },
      { id: "submit-request-as-requestor", label: "Submit a work request as a Requestor" },
    ],
  },
  {
    id: "assign-work-order",
    title: "Assign a work order",
    summary:
      "Assign a work order to an individual, a team, or both, and understand how assignment drives notifications and dashboards.",
    category: "work-orders",
    personas: ["manager", "admin", "owner"],
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Open the work order",
        description:
          "From the Work Orders list or equipment page, open the details view for the job you are assigning.",
      },
      {
        title: "Choose an assignee",
        description:
          'Open the "Assigned to" control and pick a technician. Individual assignment surfaces the work order in the assignee\'s My Work Orders view.',
      },
      {
        title: "Pick a team (optional)",
        description:
          'Optionally assign a team so every member can see the work order. When both are set, the individual assignee is the primary owner for status updates.',
      },
      {
        title: "Advance the status",
        description:
          'Set the work order to Assigned once an individual owns it. Leaving it in Accepted is fine for shared team work, but Assigned makes it clearer on dashboards.',
      },
    ],
    related: [
      { id: "work-order-lifecycle", label: "Work order lifecycle reference" },
      { id: "triage-submitted-requests", label: "Triage submitted work requests" },
    ],
  },
  {
    id: "reports-overview",
    title: "Read the Reports page",
    summary:
      "Open the Reports page to see throughput, backlog, and overdue work across your teams.",
    category: "work-orders",
    personas: ["manager", "admin", "owner"],
    lastReviewed: "2026-05-01",
    intro: (
      <p>
        Reports pulls directly from your work order lifecycle. It is the fastest
        way to see how the shop is performing without building your own SQL.
      </p>
    ),
    steps: [
      {
        title: "Open Reports",
        description:
          "From the sidebar under Operations, click Reports. The default view is the current month across every team you have access to.",
      },
      {
        title: "Filter by team and date range",
        description:
          "Narrow the report to a specific team, customer, or date range using the filters at the top. Filters compose — you can combine team, status, and date.",
      },
      {
        title: "Review throughput and overdue counts",
        description:
          "The summary cards show completed work orders, open work orders, and the overdue count. Open a card to drill into the underlying work orders.",
      },
      {
        title: "Export if you need to share",
        description:
          "Use the export action to download the current filtered view. Exports are helpful for board reviews and customer-facing monthly summaries.",
      },
    ],
    related: [
      { id: "work-order-lifecycle", label: "Work order lifecycle reference" },
    ],
  },
  {
    id: "submit-request-as-requestor",
    title: "Submit a work request as a Requestor",
    summary:
      "Equipment owners or trusted customers can scan the QR code on a machine and send a work request straight to the right team.",
    category: "work-orders",
    personas: ["requestor"],
    requirement:
      "You must have been added to the equipment's team as a Requestor.",
    lastReviewed: "2026-05-01",
    intro: (
      <p>
        The Requestor role is designed for the person who owns or is
        responsible for a machine. Instead of calling the shop, you scan the
        QR code and submit a request in under a minute.
      </p>
    ),
    steps: [
      {
        title: "Scan the equipment QR code",
        description:
          "Point your phone's camera at the QR sticker on the equipment and tap the banner to open EquipQR.",
      },
      {
        title: "Tap Submit Request",
        description:
          "Instead of a read-only record, you see a Submit Request form pre-filled with the equipment you scanned.",
        screenshot: {
          src: "/docs/support/work-orders/submit-request-as-requestor/step-02-submit-request.png",
          alt: "Requestor view of an equipment page showing the Submit Request form",
          viewport: "mobile",
        },
      },
      {
        title: "Describe the issue",
        description:
          "Title, priority, and description are required. Add photos if they help explain the problem.",
      },
      {
        title: "Submit",
        description:
          'The request appears in the team queue with a status of Submitted. You will see it under "My Work Orders" and can read updates as the manager assigns and completes it.',
        note: "As a Requestor, you cannot edit a work order after submitting it. Contact the team's manager if you need to add information.",
      },
    ],
    related: [
      { id: "triage-submitted-requests", label: "Triage submitted work requests" },
      { id: "role-overview", label: "Role overview for EquipQR" },
    ],
  },
];

export default workOrderArticles;
