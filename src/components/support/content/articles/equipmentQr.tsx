import type { SupportArticle } from "../types";

const equipmentArticles: SupportArticle[] = [
  {
    id: "add-equipment",
    title: "Add a piece of equipment",
    summary:
      "Create an equipment record, assign it to a team, and set its initial status and location.",
    category: "equipment-qr",
    personas: ["admin", "owner", "manager", "technician"],
    requirement:
      "Owners and Admins can add any equipment. Managers and Technicians can add equipment to teams they belong to.",
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Navigate to Equipment",
        description:
          "From the sidebar, select Equipment. The list shows every machine you have access to across your teams.",
        screenshot: {
          src: "/docs/support/equipment-qr/add-equipment/step-01-equipment-list.png",
          alt: "Equipment list page with Create Equipment button",
          viewport: "desktop",
        },
      },
      {
        title: "Click Create Equipment",
        description:
          "The form opens with the organization pre-selected. For bulk imports, use the Bulk Equipment page instead.",
      },
      {
        title: "Fill in basic information",
        description: (
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Name</strong> — descriptive, e.g. "Excavator #42".</li>
            <li><strong>Make and Model</strong> — e.g. Caterpillar 336F.</li>
            <li><strong>Serial Number</strong> — important for warranty and parts lookup.</li>
          </ul>
        ),
      },
      {
        title: "Assign it to a team",
        description: (
          <>
            Pick the team that services this machine. Team assignment decides
            who can see, edit, and run work orders against it. Only Owners and
            Admins can create equipment without a team assignment.
          </>
        ),
      },
      {
        title: "Set status and location",
        description:
          'Choose an initial status (Available, Offline, etc.) and a physical location. Location can be an address, lat/long, or a stored shop location.',
      },
      {
        title: "Save",
        description:
          "Click Create Equipment. You land on the new equipment's detail page, ready to generate and print its QR code.",
      },
    ],
    related: [
      { id: "print-equipment-qr", label: "Generate and print an equipment QR code" },
      { id: "set-equipment-display-image", label: "Set the equipment display image" },
    ],
  },
  {
    id: "print-equipment-qr",
    title: "Generate and print an equipment QR code",
    summary:
      "Produce a durable sticker that resolves to the equipment record when scanned.",
    category: "equipment-qr",
    personas: ["admin", "owner", "manager", "technician"],
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Open the equipment record",
        description:
          "Pick the machine from Equipment, or scan its existing QR code.",
      },
      {
        title: "Open the QR code view",
        description:
          "Tap the QR icon in the equipment header. EquipQR renders the QR code full-size so you can print or download it.",
      },
      {
        title: "Print or download",
        description:
          "Use Print for on-demand stickers from a workshop printer, or Download to generate sheets of labels in bulk.",
        note: "Laminate outdoor stickers or use a weatherproof label stock; the QR still works even when slightly scratched.",
      },
      {
        title: "Attach to the machine",
        description:
          "Pick a location that technicians can reach safely without removing panels. Near the operator cab or on an access door works well for most machines.",
      },
    ],
    related: [
      { id: "scan-equipment-qr", label: "Scan an equipment QR code from your phone" },
    ],
  },
  {
    id: "set-equipment-display-image",
    title: "Set the equipment display image",
    summary:
      "Pick the headline photo that appears on equipment cards and lists, from any image uploaded through work orders or notes.",
    category: "equipment-qr",
    personas: ["manager", "technician", "admin", "owner"],
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Open the equipment record",
        description: "Navigate to the equipment you want to update.",
      },
      {
        title: "Open the Images tab",
        description:
          "The Images tab aggregates every photo uploaded via work orders or equipment notes.",
        screenshot: {
          src: "/docs/support/equipment-qr/set-equipment-display-image/step-02-images-tab.png",
          alt: "Equipment Images tab with multiple photos",
          viewport: "desktop",
        },
      },
      {
        title: "Pick the best photo",
        description:
          "Choose an image that shows the whole machine in good lighting. Avoid close-ups of damage — use those as work order notes instead.",
      },
      {
        title: "Click Set as Display Image",
        description:
          "Confirm the selection. The equipment card on the Equipment list and the fleet map now uses this image as its thumbnail.",
      },
    ],
    related: [
      { id: "add-notes-and-photos", label: "Add notes and photos to a work order" },
    ],
  },
  {
    id: "bulk-import-equipment",
    title: "Bulk edit equipment",
    summary:
      "Update many existing equipment records in one grid instead of opening each record one at a time.",
    category: "equipment-qr",
    personas: ["admin", "owner"],
    requirement: "Must be Organization Owner or Admin.",
    lastReviewed: "2026-05-02",
    steps: [
      {
        title: "Open Equipment → Bulk Equipment",
        description:
          "From the Equipment list, use the Bulk button (or navigate directly to /dashboard/equipment/bulk).",
      },
      {
        title: "Select rows to edit",
        description:
          "Use the row checkboxes to choose which equipment records you want to change. You can search and sort first to narrow the list.",
      },
      {
        title: "Edit cells in the grid",
        description:
          "Click a cell to change fields such as name, status, location, or team assignment. Edits stay local until you commit.",
      },
      {
        title: "Commit your changes",
        description:
          "Use Commit (or the equivalent action in the bulk toolbar) to save all edited rows. Validation runs before anything is written.",
        note: "Net-new equipment is added from Add Equipment on the list; bulk equipment is for editing existing rows.",
      },
    ],
    related: [
      { id: "add-equipment", label: "Add a piece of equipment" },
      { id: "print-equipment-qr", label: "Generate and print an equipment QR code" },
    ],
  },
  {
    id: "fleet-map-basics",
    title: "Use the fleet map",
    summary:
      "Open the fleet map, understand clustering, and click through to equipment records.",
    category: "equipment-qr",
    personas: ["manager", "admin", "owner"],
    lastReviewed: "2026-05-01",
    intro: (
      <p>
        The fleet map shows every piece of equipment with a location. It is
        most useful for dispatch and for seeing which pieces are at a specific
        job site.
      </p>
    ),
    steps: [
      {
        title: "Open the fleet map",
        description:
          "From the sidebar, pick Fleet Map. The map loads with every geocoded equipment pin.",
        screenshot: {
          src: "/docs/support/equipment-qr/fleet-map-basics/step-01-fleet-map.png",
          alt: "Fleet map with clustered equipment pins",
          viewport: "desktop",
        },
      },
      {
        title: "Zoom to see clusters",
        description:
          "Nearby machines cluster into grouped pins. Click a cluster to zoom in; individual pins expand with equipment name and status.",
      },
      {
        title: "Click a pin to open the record",
        description:
          "A pin popup shows the equipment name, status, and a shortcut to the detail page. Use this to start a work order or check maintenance history.",
      },
      {
        title: "Update missing locations from equipment records",
        description:
          "If a piece of equipment is missing from the map, open its record and add a location in the Location section.",
      },
    ],
    related: [
      { id: "add-equipment", label: "Add a piece of equipment" },
    ],
  },
];

export default equipmentArticles;
