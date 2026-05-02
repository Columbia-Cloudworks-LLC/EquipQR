import type { SupportArticle } from "../types";

const teamsRolesArticles: SupportArticle[] = [
  {
    id: "organization-roles",
    title: "Organization roles in depth",
    summary:
      "What Owners, Admins, and Members can do at the organization level and where each role typically sits.",
    category: "teams-roles",
    personas: ["admin", "owner"],
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Owner",
        description: (
          <div className="space-y-2">
            <p>Full control of the organization.</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Delete the organization.</li>
              <li>Transfer ownership.</li>
              <li>Everything an Admin can do.</li>
            </ul>
          </div>
        ),
        note: "There is exactly one Owner per organization. Plan transfer of ownership before anyone with the Owner role leaves the company.",
      },
      {
        title: "Admin",
        description: (
          <div className="space-y-2">
            <p>Day-to-day administration.</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Invite and remove members.</li>
              <li>Create teams.</li>
              <li>Manage organization settings and integrations (including QuickBooks).</li>
              <li>Cannot delete the organization or change the Owner.</li>
            </ul>
          </div>
        ),
      },
      {
        title: "Member",
        description: (
          <div className="space-y-2">
            <p>Baseline staff account.</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Joins one or more teams as Manager, Technician, Requestor, or Viewer.</li>
              <li>Cannot see equipment until added to a team.</li>
              <li>No organization-wide administrative access.</li>
            </ul>
          </div>
        ),
      },
    ],
    related: [
      { id: "team-role-matrix", label: "Team role capabilities in detail" },
    ],
  },
  {
    id: "team-role-matrix",
    title: "Team role capabilities in detail",
    summary:
      "The four team roles — Manager, Technician, Requestor, Viewer — and what each can do inside a team.",
    category: "teams-roles",
    personas: ["all"],
    lastReviewed: "2026-05-01",
    intro: (
      <p>
        Every team has the same four roles, scoped to that team. A user can
        hold different team roles on different teams.
      </p>
    ),
    steps: [
      {
        title: "Manager",
        description: (
          <div className="space-y-2">
            <p><strong>Internal leadership.</strong></p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Add or remove team members.</li>
              <li>Assign work orders.</li>
              <li>Manage equipment records for the team.</li>
              <li>Move work orders through the full lifecycle.</li>
            </ul>
          </div>
        ),
      },
      {
        title: "Technician",
        description: (
          <div className="space-y-2">
            <p><strong>Internal staff executing the work.</strong></p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Update status on assigned work orders.</li>
              <li>Add notes, photos, and hours.</li>
              <li>Consume inventory parts.</li>
              <li>Cannot assign work to others or manage team membership.</li>
            </ul>
          </div>
        ),
      },
      {
        title: "Requestor",
        description: (
          <div className="space-y-2">
            <p><strong>Trusted customer or equipment owner.</strong></p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Scan equipment QR codes and submit new work requests.</li>
              <li>View their team's equipment and work orders.</li>
              <li>Cannot edit or cancel work orders after submission.</li>
            </ul>
          </div>
        ),
      },
      {
        title: "Viewer",
        description: (
          <div className="space-y-2">
            <p><strong>Read-only access.</strong></p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>View equipment details and work order history.</li>
              <li>Cannot create or modify anything.</li>
              <li>Useful for auditors, accountants, or customer staff who need visibility only.</li>
            </ul>
          </div>
        ),
      },
    ],
    related: [
      { id: "apex-example-hierarchy", label: "Example: Apex Repair Services" },
    ],
  },
  {
    id: "apex-example-hierarchy",
    title: 'Example: "Apex Repair Services"',
    summary:
      "A realistic customer example showing how a service provider maps customers to teams and which seats to give to whom.",
    category: "teams-roles",
    personas: ["all"],
    lastReviewed: "2026-05-01",
    intro: (
      <p>
        Apex Repair Services is a fictional multi-customer repair shop. They
        create one team per customer, add their own technicians to each team,
        and invite the customer's staff as Requestors and Viewers.
      </p>
    ),
    steps: [
      {
        title: "The organization",
        description: (
          <div className="space-y-2">
            <p>
              <strong>Apex Repair Services</strong> is the organization. Sarah
              is the <strong>Owner</strong> — she handles billing, high-level
              account settings, and is responsible for the whole account.
            </p>
          </div>
        ),
      },
      {
        title: "Team A: ABC Construction",
        description: (
          <div className="space-y-2">
            <p>ABC Construction is a customer. Their team contains:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li><strong>John</strong> — Apex Service Manager, Manager on this team.</li>
              <li><strong>Steve</strong> — Apex Technician on this team (and Team B).</li>
              <li><strong>Alice (ABC Employee)</strong> — Site Supervisor, Requestor on this team. She owns the equipment and submits requests.</li>
              <li><strong>Bob (ABC Employee)</strong> — Accountant, Viewer. He reads maintenance history for invoicing.</li>
            </ul>
          </div>
        ),
      },
      {
        title: "Team B: XYZ Logistics",
        description: (
          <div className="space-y-2">
            <p>XYZ Logistics is another customer. Their team contains:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li><strong>Steve</strong> — Apex Technician. Steve appears on multiple teams because he services equipment across customers.</li>
              <li><strong>Mike (XYZ Employee)</strong> — Fleet Manager, Requestor.</li>
            </ul>
          </div>
        ),
      },
      {
        title: "What this buys you",
        description: (
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>Apex staff see everything across customers (because they are in multiple teams).</li>
            <li>Each customer sees only their own equipment — one team, no cross-team leakage.</li>
            <li>QR scans from ABC's machines route to the ABC team queue with zero routing effort.</li>
          </ul>
        ),
      },
    ],
    related: [
      { id: "add-team-member", label: "Add or remove team members" },
    ],
  },
  {
    id: "add-team-member",
    title: "Add or remove team members",
    summary:
      "Invite existing organization members into a team, pick the right team role, and remove them when they move on.",
    category: "teams-roles",
    personas: ["manager", "admin", "owner"],
    requirement:
      "Organization Owners and Admins can manage any team. Team Managers can manage their own team.",
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Open the team",
        description:
          "From the sidebar, open Teams and click the team you want to modify.",
      },
      {
        title: "Click Add Member",
        description:
          "The picker lists every organization member who is not yet on the team.",
      },
      {
        title: "Pick the team role",
        description: (
          <>
            Choose <strong>Manager</strong>, <strong>Technician</strong>,{" "}
            <strong>Requestor</strong>, or <strong>Viewer</strong>. If the
            person is a customer, pick Requestor or Viewer; your own staff
            should be Manager or Technician.
          </>
        ),
      },
      {
        title: "Save",
        description:
          "The new member immediately sees the team's equipment and can perform the actions their role allows.",
      },
      {
        title: "Remove a member",
        description:
          "From the Members list on the team page, open the member's row and choose Remove. They lose access to the team's equipment immediately but stay in the organization.",
      },
    ],
    related: [
      { id: "team-role-matrix", label: "Team role capabilities in detail" },
      { id: "invite-team-members", label: "Invite your team" },
    ],
  },
  {
    id: "multi-team-questions",
    title: "Common questions about teams and roles",
    summary:
      "Quick answers to the most common questions about multi-team membership and customer access.",
    category: "teams-roles",
    personas: ["all"],
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Can a technician be in multiple teams?",
        description:
          "Yes. Internal technicians are usually added to every team whose equipment they service. Customers (Requestors, Viewers) should be on exactly one team.",
      },
      {
        title: "Can customers see each other's data?",
        description:
          "No. Team membership is fully isolated — a Requestor on Team A cannot see Team B's equipment or work orders, even if the same organization owns both teams.",
      },
      {
        title: "What happens if an organization Admin is also on a team?",
        description:
          "Their organization role overrides the team role when they act at the organization level. Within a team, their team role drives what they see first in that team's views.",
      },
      {
        title: "Who should be an Owner versus an Admin?",
        description:
          "Keep exactly one Owner for billing and legal actions. Every other administrator should be an Admin — that lets them do day-to-day work without risking account deletion.",
      },
    ],
  },
];

export default teamsRolesArticles;
