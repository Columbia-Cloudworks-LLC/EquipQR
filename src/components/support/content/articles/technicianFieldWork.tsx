import type { SupportArticle } from "../types";

const technicianArticles: SupportArticle[] = [
  {
    id: "scan-equipment-qr",
    title: "Scan an equipment QR code from your phone",
    summary:
      "Use your phone's built-in camera app to open an equipment record in EquipQR with the correct organization already selected.",
    category: "technician-field-work",
    personas: ["technician", "requestor"],
    lastReviewed: "2026-05-01",
    intro: (
      <p>
        EquipQR QR codes are plain URLs — no extra app required. Your phone's
        camera opens the record directly in the browser or the EquipQR app if
        it is installed.
      </p>
    ),
    steps: [
      {
        title: "Open your camera app",
        description:
          "Hold the phone about a hand's width from the QR code. iOS and Android automatically recognize QR codes — no third-party scanner needed.",
        screenshot: {
          src: "/docs/support/technician-field-work/scan-equipment-qr/step-01-camera.png",
          alt: "Mobile camera viewfinder framing an EquipQR sticker on a piece of equipment",
          viewport: "mobile",
        },
      },
      {
        title: "Tap the notification banner",
        description: (
          <>
            The camera shows a link like{" "}
            <code>https://equipqr.app/qr/equipment/&lt;id&gt;</code>. Tap it
            to open the equipment record.
          </>
        ),
      },
      {
        title: "Sign in if prompted",
        description:
          "If you are not already logged in, EquipQR asks you to sign in first. After authentication the app returns you to the equipment you scanned.",
        note: "If you belong to more than one organization, EquipQR automatically switches you to the organization that owns the scanned equipment.",
      },
      {
        title: "Verify the equipment header",
        description:
          "Check the equipment name, make/model, and serial number match the machine you are standing in front of before acting.",
        screenshot: {
          src: "/docs/support/technician-field-work/scan-equipment-qr/step-04-equipment-header.png",
          alt: "Mobile equipment detail page showing name, model, and serial number",
          viewport: "mobile",
        },
      },
    ],
    related: [
      { id: "create-work-order-from-equipment", label: "Create a work order from equipment" },
      { id: "submit-request-as-requestor", label: "Submit a work request as a Requestor" },
    ],
  },
  {
    id: "create-work-order-from-equipment",
    title: "Create a work order from equipment",
    summary:
      "Start a new work order directly from an equipment record so it is pre-linked to the correct machine and team.",
    category: "technician-field-work",
    personas: ["technician", "manager"],
    requirement:
      "Must be a Manager or Technician on the team that owns the equipment.",
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Open the equipment record",
        description:
          "Scan the QR code or pick the machine from the Equipment list.",
      },
      {
        title: "Open the Work Orders tab",
        description:
          "Scroll or tap the Work Orders tab on the equipment page to see the job history.",
        screenshot: {
          src: "/docs/support/technician-field-work/create-work-order-from-equipment/step-02-wo-tab.png",
          alt: "Equipment detail page with the Work Orders tab selected",
          viewport: "mobile",
        },
      },
      {
        title: "Click Create Work Order",
        description:
          'If no work orders exist yet, the button reads "Create First Work Order". Either way, the form opens with the equipment pre-selected and locked.',
      },
      {
        title: "Fill in title, priority, and description",
        description: (
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Title</strong> — a descriptive summary like "Hydraulic
              leak on left cylinder".
            </li>
            <li>
              <strong>Priority</strong> — Low, Medium, High, or Critical based
              on safety and downtime impact.
            </li>
            <li>
              <strong>Description</strong> — what you observed, what you want
              someone to do, and any access notes.
            </li>
          </ul>
        ),
      },
      {
        title: "Save the work order",
        description:
          'Click Create Work Order. The new record appears in the team queue with Submitted status.',
      },
    ],
    related: [
      { id: "update-work-order-status", label: "Update work order status" },
      { id: "add-notes-and-photos", label: "Add notes and photos to a work order" },
    ],
  },
  {
    id: "update-work-order-status",
    title: "Update work order status",
    summary:
      "Move a work order through Submitted → Accepted → Assigned → In Progress → Completed with the right permission checks.",
    category: "technician-field-work",
    personas: ["technician", "manager"],
    lastReviewed: "2026-05-01",
    intro: (
      <p>
        Work orders follow a predictable lifecycle so everyone can see what is
        actually happening in the shop. Only valid next statuses are shown on
        the action buttons, so you cannot accidentally skip a state.
      </p>
    ),
    steps: [
      {
        title: "Open the work order details page",
        description:
          "Tap a work order from the list, from equipment, or from your dashboard to get to the detail view.",
      },
      {
        title: "Use the status action button",
        description: (
          <>
            The top-right status card shows the current status plus only the
            valid next actions — e.g. <strong>Accept</strong>,{" "}
            <strong>Assign</strong>, <strong>Start Work</strong>,{" "}
            <strong>Put On Hold</strong>, <strong>Complete</strong>, or{" "}
            <strong>Cancel</strong>.
          </>
        ),
        screenshot: {
          src: "/docs/support/technician-field-work/update-work-order-status/step-02-status-actions.png",
          alt: "Work order details status action buttons on mobile",
          viewport: "mobile",
        },
      },
      {
        title: "Who can change what",
        description: (
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Managers, Admins, and Owners</strong> can change status
              on any team work order.
            </li>
            <li>
              <strong>Technicians</strong> can move their own assigned work
              orders between In Progress, On Hold, and Completed.
            </li>
            <li>
              <strong>Requestors</strong> cannot change status after
              submission.
            </li>
          </ul>
        ),
      },
      {
        title: "Mark it Complete when the work is done",
        description:
          'Completion captures the close-out date automatically. If you are waiting on parts, use "Put On Hold" instead so the job does not register as overdue.',
      },
    ],
    related: [
      { id: "work-order-lifecycle", label: "Work order lifecycle reference" },
      { id: "add-notes-and-photos", label: "Add notes and photos to a work order" },
    ],
  },
  {
    id: "add-notes-and-photos",
    title: "Add notes and photos to a work order",
    summary:
      "Document what you found, what you did, and attach before/during/after photos — all visible in the equipment's image gallery.",
    category: "technician-field-work",
    personas: ["technician", "manager"],
    lastReviewed: "2026-05-01",
    intro: (
      <p>
        Notes and photos are the audit trail for every work order. Images you
        upload on a work order also appear in the equipment's Images tab, so
        the next technician can see the previous condition.
      </p>
    ),
    steps: [
      {
        title: "Open the work order",
        description:
          "Scroll down to the Notes section under the work order details.",
      },
      {
        title: "Fill in note details",
        description: (
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Note content</strong> — what you found, what you did, and
              any important observations.
            </li>
            <li>
              <strong>Hours worked</strong> — time spent on this session.
            </li>
            <li>
              <strong>Private note</strong> — toggle on for internal-only
              observations. Customers (Requestors and Viewers) cannot see
              private notes.
            </li>
          </ul>
        ),
      },
      {
        title: "Attach images",
        description: (
          <>
            In the Images (Optional) section, tap <strong>Choose Files</strong>{" "}
            and pick one or more photos. You can upload up to 10 images per
            note. Supported formats: JPG, PNG, GIF, WebP. Maximum 10 MB per
            file.
          </>
        ),
        screenshot: {
          src: "/docs/support/technician-field-work/add-notes-and-photos/step-03-upload-images.png",
          alt: "Work order notes section with image upload selector open on mobile",
          viewport: "mobile",
        },
      },
      {
        title: "Save the note",
        description:
          "Tap Add Note (or Upload X Images when photos are attached) to save. The note appears immediately in the Notes & Updates list.",
        note: "If an upload fails, check the file size and your network. Supabase retries briefly but will surface a clear error if the upload cannot complete.",
      },
    ],
    related: [
      { id: "set-equipment-display-image", label: "Set the equipment display image" },
      { id: "pm-checklist", label: "Complete a PM checklist" },
    ],
  },
  {
    id: "pm-checklist",
    title: "Complete a PM checklist",
    summary:
      "Tick off preventative maintenance items, mark exceptions, and attach evidence photos to the ones that need follow-up.",
    category: "technician-field-work",
    personas: ["technician", "manager"],
    requirement:
      "The work order must have been created with a PM template attached.",
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Open the work order with the PM checklist",
        description:
          "From Work Orders, pick the PM-enabled job assigned to you. The PM Checklist section renders below the work order details.",
      },
      {
        title: "Tap Set All to OK for everything in good shape",
        description:
          "The Set All to OK button quickly marks every item as acceptable so you only have to focus on the exceptions.",
        screenshot: {
          src: "/docs/support/technician-field-work/pm-checklist/step-02-set-all-ok.png",
          alt: "PM checklist with Set All to OK button highlighted",
          viewport: "mobile",
        },
      },
      {
        title: "Flag exceptions",
        description: (
          <>
            For each item that needs attention, change the status (Needs
            Attention, Critical, etc.), add a short note explaining the issue,
            and attach a photo showing the problem. Exceptions drive the
            follow-up work that managers triage.
          </>
        ),
      },
      {
        title: "Save progress",
        description:
          "Changes auto-save as you go; you can also tap Save Changes manually. Come back later to finish if you get interrupted — the checklist keeps state per item.",
      },
    ],
    related: [
      { id: "add-notes-and-photos", label: "Add notes and photos to a work order" },
      { id: "work-order-lifecycle", label: "Work order lifecycle reference" },
    ],
  },
  {
    id: "consume-inventory-on-wo",
    title: "Consume inventory parts on a work order",
    summary:
      "Record the parts you used on a repair so stock drops automatically and the cost flows into the invoice.",
    category: "technician-field-work",
    personas: ["technician", "manager"],
    requirement: "Must be Manager, Technician, or an assigned Parts Manager.",
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Open the work order's Parts & Costs section",
        description:
          "Scroll to the Costs section in the work order details and tap Add Item.",
      },
      {
        title: "Search for the part",
        description:
          "Type the part name, SKU, or a cross-reference number. Alternate groups surface equivalent parts in the same search.",
      },
      {
        title: "Enter the quantity used",
        description:
          "EquipQR deducts that quantity from stock on hand and records the unit cost in the work order's total.",
        note: "If the part drops below its low-stock threshold, Parts Managers and Admins receive a low-stock alert.",
      },
      {
        title: "Save",
        description:
          "The item appears on the work order cost line. The inventory item's transaction history now has an entry tied to this work order.",
      },
    ],
    related: [
      { id: "add-inventory-item", label: "Add an inventory item" },
      { id: "part-lookup-search", label: "Find a part using part lookup" },
    ],
  },
];

export default technicianArticles;
