import type { SupportArticle } from "../types";

const startHereArticles: SupportArticle[] = [
  {
    id: "welcome-to-equipqr",
    title: "Welcome to EquipQR",
    summary:
      "A 60-second overview of what EquipQR does and where each team role spends their time.",
    category: "start-here",
    personas: ["all"],
    lastReviewed: "2026-05-01",
    intro: (
      <p>
        EquipQR is a multi-tenant fleet equipment management platform for field
        technicians, shop managers, and the customers who own the equipment.
        The platform pairs each piece of equipment with a durable QR code so
        anyone with permission can scan it and get straight to the record,
        work orders, and maintenance history.
      </p>
    ),
    steps: [
      {
        title: "Set up your organization",
        description: (
          <>
            Create your organization, invite teammates, and choose who should be
            an <strong>Owner</strong> or <strong>Admin</strong>. Everyone else
            starts as a <strong>Member</strong> until they are added to a team.
          </>
        ),
      },
      {
        title: "Build your fleet",
        description:
          "Add each piece of equipment, assign it to the team that services it, and print the QR code so technicians can scan it in the field.",
      },
      {
        title: "Stock your inventory",
        description:
          "Load the parts you consume on work orders. Low-stock thresholds and alternate part groups keep technicians moving when a first-choice part is unavailable.",
      },
      {
        title: "Run work orders",
        description:
          "Technicians pick up work orders, add notes and photos, consume inventory, and mark the job complete. Managers triage incoming requests and close the loop with customers.",
      },
    ],
    outro: (
      <p className="text-sm text-muted-foreground">
        The rest of the support library walks through each of those pieces in
        detail. If you are in a hurry, jump to the category that matches your
        role from the Start Here, Technician Field Work, or Admin & Integrations
        section.
      </p>
    ),
    related: [
      { id: "navigation-tour", label: "Find your way around the app" },
      { id: "invite-team-members", label: "Invite your team" },
      { id: "role-overview", label: "Role overview for EquipQR" },
    ],
  },
  {
    id: "navigation-tour",
    title: "Find your way around the app",
    summary:
      "A fast tour of the sidebar, top bar, mobile bottom nav, and where admin-only surfaces live.",
    category: "start-here",
    personas: ["all"],
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Sidebar groups (desktop and tablet)",
        description: (
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Fleet</strong> — Equipment, Fleet Map, Inventory, Part Lookup, Part Alternates.</li>
            <li><strong>Operations</strong> — Dashboard, Work Orders, PM Templates (admin-only), Reports.</li>
            <li><strong>Infrastructure</strong> — Teams, Organization, Integrations.</li>
            <li><strong>Audit</strong> — Audit Log and DSR Cockpit (admin-only).</li>
          </ul>
        ),
        screenshot: {
          src: "/docs/support/start-here/navigation-tour/step-01-sidebar.png",
          alt: "EquipQR sidebar showing Fleet, Operations, Infrastructure, and Audit groups",
          viewport: "desktop",
        },
      },
      {
        title: "Mobile bottom navigation",
        description:
          "On phones, the bottom nav shows the four most-used destinations for field technicians: Dashboard, Equipment, Inventory, and Work Orders. Tap the menu icon for everything else.",
        screenshot: {
          src: "/docs/support/start-here/navigation-tour/step-02-bottom-nav.png",
          alt: "Mobile bottom navigation bar with Dashboard, Equipment, Inventory, Work Orders tabs",
          viewport: "mobile",
        },
      },
      {
        title: "Top bar and user menu",
        description: (
          <>
            The top bar shows your current organization, notifications, and your
            user menu. Support lives under the <strong>user menu (avatar
            top-right) → Support</strong>.
          </>
        ),
      },
      {
        title: "Admin-only surfaces are hidden by default",
        description:
          "If you do not see PM Templates, Audit Log, or DSR Cockpit in the sidebar, your account is not an Organization Owner or Admin. Ask an admin to grant access if you need it.",
      },
    ],
    related: [
      { id: "role-overview", label: "Role overview for EquipQR" },
      { id: "system-status", label: "Check system status" },
    ],
  },
  {
    id: "invite-team-members",
    title: "Invite your team",
    summary:
      "Send organization invitations so new users can log in, then add them to the teams whose equipment they service.",
    category: "start-here",
    personas: ["admin", "owner"],
    requirement: "Organization Owner or Admin.",
    lastReviewed: "2026-05-01",
    intro: (
      <p>
        EquipQR uses a two-step onboarding: first users join your
        <strong> organization</strong>, then you add them to a <strong>team</strong>.
        Members cannot see equipment until they belong to a team.
      </p>
    ),
    steps: [
      {
        title: "Open Organization → Members",
        description: (
          <>
            From the sidebar go to <strong>Organization</strong>, then select
            the <strong>Members</strong> tab.
          </>
        ),
        screenshot: {
          src: "/docs/support/start-here/invite-team-members/step-01-members-tab.png",
          alt: "Organization members tab with Invite Member button",
          viewport: "desktop",
        },
      },
      {
        title: "Click Invite Member",
        description:
          "Enter the person's work email address. Double-check the address — invitations are valid for 7 days and bounces are common on personal inboxes.",
      },
      {
        title: "Pick the organization role",
        description: (
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Admin</strong> — manage members, teams, equipment, and
              integrations across the whole organization.
            </li>
            <li>
              <strong>Member</strong> — a staff account that inherits access
              from the teams it joins. Members cannot see any equipment until
              they are added to a team.
            </li>
          </ul>
        ),
      },
      {
        title: "Add the user to a team",
        description: (
          <>
            Go to <strong>Teams</strong>, open the team that services the
            equipment this person will work on, and click <strong>Add
            Member</strong>. Choose the team role that matches their
            responsibilities (Manager, Technician, Requestor, or Viewer).
          </>
        ),
        screenshot: {
          src: "/docs/support/start-here/invite-team-members/step-04-team-add-member.png",
          alt: "Team detail page with Add Member dialog open",
          viewport: "desktop",
        },
      },
      {
        title: "Tell your teammate what to expect",
        description: (
          <div className="space-y-2">
            <p>Their invitation email comes from:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>
                <strong>Sender:</strong> EquipQR &lt;invite@equipqr.app&gt;
              </li>
              <li>
                <strong>Subject:</strong> "You're invited to join [Your
                Organization] on EquipQR"
              </li>
              <li>
                <strong>Link expires:</strong> 7 days after it is sent.
              </li>
            </ul>
          </div>
        ),
        note: "If the invite does not arrive in 5-10 minutes, ask them to check spam before you resend.",
      },
    ],
    related: [
      { id: "role-overview", label: "Role overview for EquipQR" },
      { id: "add-team-member", label: "Add or remove team members" },
    ],
  },
  {
    id: "role-overview",
    title: "Role overview for EquipQR",
    summary:
      "A plain-language cheat sheet of the two role tiers (organization and team) and what each role can do.",
    category: "start-here",
    personas: ["all"],
    lastReviewed: "2026-05-01",
    intro: (
      <p>
        EquipQR has two role tiers. The <strong>organization</strong> tier
        decides who can manage your company account. The <strong>team</strong>
        {" "}tier decides who can act on the equipment inside that team.
      </p>
    ),
    steps: [
      {
        title: "Organization roles (your staff)",
        description: (
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Owner</strong> — full control of the organization,
              including transferring ownership and deleting the organization.
            </li>
            <li>
              <strong>Admin</strong> — day-to-day administration: invite members,
              create teams, connect integrations, and manage organization
              settings.
            </li>
            <li>
              <strong>Member</strong> — baseline staff account with access
              scoped to the teams they belong to.
            </li>
          </ul>
        ),
      },
      {
        title: "Team roles (scoped to one team)",
        description: (
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Manager</strong> — team leadership. Assigns work orders,
              adds/removes members, and manages equipment that belongs to the
              team.
            </li>
            <li>
              <strong>Technician</strong> — internal staff. Executes work
              orders, updates status, logs notes/photos, and uses inventory.
            </li>
            <li>
              <strong>Requestor</strong> — trusted customer or equipment owner.
              Scans a QR code and submits a work request, but cannot edit work
              orders after submission.
            </li>
            <li>
              <strong>Viewer</strong> — read-only access to the team's
              equipment and work orders.
            </li>
          </ul>
        ),
      },
      {
        title: "Use the right seat for the right person",
        description: (
          <>
            A user can hold different team roles on different teams. For
            example, a shop foreman might be a <strong>Manager</strong> on
            their own team and a <strong>Technician</strong> on a partner
            shop's team.
          </>
        ),
      },
    ],
    related: [
      { id: "team-role-matrix", label: "Team role capabilities in detail" },
      { id: "apex-example-hierarchy", label: "Example: Apex Repair Services" },
    ],
  },
];

export default startHereArticles;
