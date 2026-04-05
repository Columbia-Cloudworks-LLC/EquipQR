import { assertEquals } from "jsr:@std/assert@1";
import { buildExecutivePacketRequests } from "./work-order-google-docs-packet.ts";
import type { SingleWorkOrderGoogleDocData } from "./work-order-google-docs-single-data.ts";

function makeMockData(overrides?: Partial<SingleWorkOrderGoogleDocData>): SingleWorkOrderGoogleDocData {
  return {
    organization: { name: "CW Rentals", logoUrl: null },
    team: { name: "Alpha Team", imageUrl: null },
    customer: { name: "Acme Corp" },
    equipment: { name: "Excavator", manufacturer: "CAT", model: "320", serialNumber: "SN-001", location: "Site A" },
    workOrder: {
      id: "wo-1",
      title: "Fix hydraulic line",
      description: "Leaking hydraulic line on boom arm",
      status: "IN PROGRESS",
      priority: "HIGH",
      createdDate: "2026-01-15",
      dueDate: "2026-01-20",
      completedDate: null,
      assigneeName: "Jane Doe",
    },
    quickFacts: [
      { label: "Status", value: "IN PROGRESS" },
      { label: "Priority", value: "HIGH" },
    ],
    activityEntries: [
      { date: "2026-01-15T10:00:00Z", authorName: "Jane Doe", content: "Started repair", hoursWorked: 2, photoCount: 1 },
    ],
    costs: [
      { description: "Hydraulic hose", quantity: 1, unitPrice: 45.0, totalPrice: 45.0, fromInventory: true, addedBy: "Jane Doe", dateAdded: "2026-01-15" },
    ],
    pmChecklist: [],
    pmStatus: null,
    pmGeneralNotes: null,
    timeline: [
      { previousStatus: "SUBMITTED", newStatus: "IN PROGRESS", changedAt: "2026-01-15T09:00:00Z", changedBy: "Jane Doe", reason: "" },
    ],
    photoHighlights: [],
    photoEvidence: [],
    generatedAt: "2026-01-15T12:00:00Z",
    ...overrides,
  };
}

Deno.test("buildExecutivePacketRequests places sections in correct order without photos", () => {
  const result = buildExecutivePacketRequests(makeMockData());

  assertEquals(result.sectionOrder, [
    "Header",
    "QuickFacts",
    "OpeningSummary",
    "LaborActivity",
    "MaterialsAndCosts",
    "Timeline",
  ]);
  assertEquals(result.evidencePageCount, 0);
  assertEquals(result.warnings.length, 0);
});

Deno.test("buildExecutivePacketRequests places Photo Highlights before Labor Activity and Photo Evidence at the end", () => {
  const photoEntry = {
    imageUrl: "https://storage.example.com/photo.jpg",
    mimeType: "image/jpeg",
    fileName: "photo.jpg",
    noteId: "note-1",
    noteContent: "Damage photo",
    noteAuthorName: "Jane",
    noteCreatedAt: "2026-01-15T10:00:00Z",
    canInlineImage: true,
  };

  const result = buildExecutivePacketRequests(makeMockData({
    photoHighlights: [photoEntry],
    photoEvidence: [photoEntry],
    activityEntries: [
      { date: "2026-01-15T10:00:00Z", authorName: "Jane", content: "Repair", hoursWorked: 1, photoCount: 1 },
    ],
  }));

  const highlightsIdx = result.sectionOrder.indexOf("PhotoHighlights");
  const laborIdx = result.sectionOrder.indexOf("LaborActivity");
  const evidenceIdx = result.sectionOrder.indexOf("PhotoEvidence");

  assertEquals(highlightsIdx < laborIdx, true, "PhotoHighlights should come before LaborActivity");
  assertEquals(evidenceIdx, result.sectionOrder.length - 1, "PhotoEvidence should be last");
});

Deno.test("buildExecutivePacketRequests emits one evidence page per photo", () => {
  const photos = [
    {
      imageUrl: "https://storage.example.com/a.jpg",
      mimeType: "image/jpeg",
      fileName: "a.jpg",
      noteId: "note-1",
      noteContent: "Photo A",
      noteAuthorName: "Jane",
      noteCreatedAt: "2026-01-15T10:00:00Z",
      canInlineImage: true,
    },
    {
      imageUrl: "https://storage.example.com/b.jpg",
      mimeType: "image/jpeg",
      fileName: "b.jpg",
      noteId: "note-1",
      noteContent: "Photo A",
      noteAuthorName: "Jane",
      noteCreatedAt: "2026-01-15T10:00:00Z",
      canInlineImage: true,
    },
  ];

  const result = buildExecutivePacketRequests(makeMockData({
    photoEvidence: photos,
    photoHighlights: photos.slice(0, 1),
  }));

  assertEquals(result.evidencePageCount, 2);
});

Deno.test("buildExecutivePacketRequests adds warning for unsupported image format", () => {
  const photo = {
    imageUrl: "https://storage.example.com/photo.webp",
    mimeType: "image/webp",
    fileName: "photo.webp",
    noteId: "note-1",
    noteContent: "WebP photo",
    noteAuthorName: "Jane",
    noteCreatedAt: "2026-01-15T10:00:00Z",
    canInlineImage: false,
  };

  const result = buildExecutivePacketRequests(makeMockData({
    photoEvidence: [photo],
  }));

  assertEquals(result.evidencePageCount, 1);
  assertEquals(result.warnings.length, 1);
  assertEquals(result.warnings[0].includes("unsupported format"), true);
});

Deno.test("buildExecutivePacketRequests omits empty sections", () => {
  const result = buildExecutivePacketRequests(makeMockData({
    activityEntries: [],
    costs: [],
    timeline: [],
    pmChecklist: [],
  }));

  assertEquals(result.sectionOrder.includes("LaborActivity"), false);
  assertEquals(result.sectionOrder.includes("MaterialsAndCosts"), false);
  assertEquals(result.sectionOrder.includes("Timeline"), false);
  assertEquals(result.sectionOrder.includes("PMChecklist"), false);
});
