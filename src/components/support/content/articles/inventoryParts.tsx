import type { SupportArticle } from "../types";

const inventoryArticles: SupportArticle[] = [
  {
    id: "add-inventory-item",
    title: "Add an inventory item",
    summary:
      "Create a new part with stock levels, compatibility rules, and a QR code so technicians can scan it from a bin.",
    category: "inventory-parts",
    personas: ["admin", "owner", "manager"],
    requirement: "Must be Owner, Admin, or an assigned Parts Manager.",
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Open Inventory",
        description:
          "Pick Inventory from the sidebar. The list shows everything across your organization, filterable by team.",
      },
      {
        title: "Click Add Item",
        description:
          "The form opens with required and optional fields. For importing dozens or hundreds of parts at once, use Bulk Inventory.",
        screenshot: {
          src: "/docs/support/inventory-parts/add-inventory-item/step-02-add-item.png",
          alt: "Inventory list page with Add Item button in the header",
          viewport: "desktop",
        },
      },
      {
        title: "Fill in basic information",
        description: (
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Name</strong> — descriptive, e.g. "Oil Filter - CAT 320".</li>
            <li><strong>SKU</strong> — your internal part number.</li>
            <li><strong>External ID</strong> — manufacturer barcode or UPC for scanning.</li>
            <li><strong>Description</strong> — optional details that help field staff identify the part.</li>
          </ul>
        ),
      },
      {
        title: "Set stock levels",
        description: (
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Quantity on Hand</strong> — current stock count.</li>
            <li><strong>Low Stock Threshold</strong> — EquipQR alerts Parts Managers when stock drops to or below this number.</li>
            <li><strong>Default Unit Cost</strong> — used to populate work order costs.</li>
            <li><strong>Location</strong> — where the part lives (e.g. "Shelf A-3").</li>
          </ul>
        ),
      },
      {
        title: "Save and print the QR code",
        description:
          "Save the item. From its detail page, tap the QR icon to print a label for the bin so technicians can scan it on the way to the job.",
      },
    ],
    related: [
      { id: "adjust-inventory-quantity", label: "Adjust inventory quantity" },
      { id: "parts-managers-setup", label: "Delegate inventory to Parts Managers" },
    ],
  },
  {
    id: "adjust-inventory-quantity",
    title: "Adjust inventory quantity",
    summary:
      "Add or take stock, record a reason, and review the transaction history.",
    category: "inventory-parts",
    personas: ["manager", "admin", "owner"],
    requirement: "Must be Owner, Admin, or an assigned Parts Manager.",
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Open the item detail page",
        description:
          "From Inventory, click an item to view its detail page. The current stock is shown in the header.",
      },
      {
        title: "Click Adjust Quantity",
        description:
          "The adjustment dialog opens with quick +1 / -1 buttons for spot adjustments.",
      },
      {
        title: "Add or take stock",
        description: (
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Add 1 / Take 1</strong> — quick single-unit adjustment.</li>
            <li><strong>Add More / Take More</strong> — enter a custom quantity.</li>
            <li><strong>Reason</strong> — optional note for the audit trail.</li>
          </ul>
        ),
      },
      {
        title: "Review the transaction history",
        description:
          "Switch to the Transaction History tab to see every adjustment with timestamp, user, quantity change, and reason. Work order consumption shows up here too.",
        note: "EquipQR never deletes stock adjustments. Correct a mistake by entering an offsetting adjustment with a clear reason.",
      },
    ],
    related: [
      { id: "add-inventory-item", label: "Add an inventory item" },
    ],
  },
  {
    id: "parts-managers-setup",
    title: "Delegate inventory to Parts Managers",
    summary:
      "Give trusted team members permission to create, edit, and adjust inventory without making them admins.",
    category: "inventory-parts",
    personas: ["admin", "owner"],
    requirement: "Must be Organization Owner or Admin.",
    lastReviewed: "2026-05-01",
    intro: (
      <p>
        By default, only Owners and Admins can create and edit inventory. Parts
        Managers let you promote specific team members so the shop keeps moving
        without opening up admin privileges.
      </p>
    ),
    steps: [
      {
        title: "Open Inventory → Parts Managers",
        description:
          "From Inventory, click the Parts Managers button next to Add Item.",
      },
      {
        title: "Click Add Manager",
        description:
          "A searchable picker opens. Find the member by name or email and select them. You can select multiple members at once.",
      },
      {
        title: "Confirm",
        description:
          "Click Add Managers. The selected members immediately gain create/edit/adjust permissions on inventory.",
      },
      {
        title: "Remove a Parts Manager when needed",
        description:
          "From the same Parts Managers panel, click the trash icon on a row and confirm. Access reverts to view-only.",
      },
    ],
    related: [
      { id: "add-inventory-item", label: "Add an inventory item" },
    ],
  },
  {
    id: "alternate-groups-setup",
    title: "Create an alternate part group",
    summary:
      "Define interchangeable parts so technicians can substitute when a primary part is out of stock.",
    category: "inventory-parts",
    personas: ["admin", "owner", "manager"],
    lastReviewed: "2026-05-01",
    intro: (
      <p>
        Alternate groups bundle parts that can substitute for each other — OEM
        and aftermarket filters, for example. Search by any part number in the
        group returns every current substitute.
      </p>
    ),
    steps: [
      {
        title: "Open Part Alternates",
        description:
          "From the sidebar under Fleet, click Part Alternates. Every group is shown with a verification badge (Unverified, Verified, Deprecated).",
      },
      {
        title: "Click New Group",
        description:
          "Give the group a descriptive name like 'Oil Filter - CAT D6T Compatible' and optionally add a short description.",
      },
      {
        title: "Add inventory items",
        description:
          "Open the group, click Add Item, and pick inventory items that can substitute. Mark one as the primary so it is highlighted in search.",
      },
      {
        title: "Add OEM and aftermarket part numbers",
        description:
          "Click Add Part Number to list OEM, aftermarket, manufacturer, and cross-reference codes. Part lookup matches any of them.",
      },
      {
        title: "Mark the group Verified",
        description:
          'Once you have checked the substitutes against the manufacturer or a verified cross-reference, edit the group and change its status to Verified. The badge turns green and technicians see the confidence level.',
        note: "Document how you verified in the Notes field — OEM cross-reference, field test, or service bulletin reference.",
      },
    ],
    related: [
      { id: "part-lookup-search", label: "Find a part using part lookup" },
    ],
  },
  {
    id: "bulk-import-inventory",
    title: "Bulk edit inventory",
    summary:
      "Update many existing inventory records in one grid instead of opening each item one at a time.",
    category: "inventory-parts",
    personas: ["admin", "owner"],
    requirement: "Must be Owner, Admin, or an assigned Parts Manager.",
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Open Inventory → Bulk Inventory",
        description:
          "From the Inventory list, use the Bulk button (or navigate directly to /dashboard/inventory/bulk).",
      },
      {
        title: "Select rows to edit",
        description:
          "Single-click rows to select them. Double-click a cell to edit values like name, SKU, location, quantity, threshold, or default unit cost.",
      },
      {
        title: "Apply changes across selected rows",
        description:
          "Use multi-select edits to apply the same value to multiple items at once, then review the highlighted dirty cells before saving.",
      },
      {
        title: "Commit and verify",
        description:
          "Click Commit to save all staged edits. If any row fails validation or update, Bulk Inventory reports failures so you can correct only those items.",
      },
    ],
    related: [
      { id: "add-inventory-item", label: "Add an inventory item" },
      { id: "alternate-groups-setup", label: "Create an alternate part group" },
    ],
  },
  {
    id: "part-lookup-search",
    title: "Find a part using part lookup",
    summary:
      "Search across inventory, alternate groups, and cross-reference numbers in one place.",
    category: "inventory-parts",
    personas: ["technician", "manager", "admin", "owner"],
    lastReviewed: "2026-05-01",
    steps: [
      {
        title: "Open Part Lookup",
        description:
          "From the sidebar under Fleet, click Part Lookup. The search bar accepts name, SKU, UPC, OEM, and any cross-reference number.",
      },
      {
        title: "Type the identifier you have",
        description:
          "Results surface matching inventory items, plus alternate groups that contain a matching part number.",
      },
      {
        title: "Pick the right match",
        description:
          "If an inventory item is in stock, open it to adjust quantity or consume it on a work order. If only an alternate group matches, open the group to see which stocked item substitutes.",
      },
    ],
    related: [
      { id: "alternate-groups-setup", label: "Create an alternate part group" },
      { id: "consume-inventory-on-wo", label: "Consume inventory parts on a work order" },
    ],
  },
];

export default inventoryArticles;
