import { assertEquals } from "jsr:@std/assert@1";
import {
  buildPhotoEvidenceFromNotesAndImages,
  buildQuickFacts,
} from "./work-order-google-docs-single-data.ts";

// ---------------------------------------------------------------------------
// buildPhotoEvidenceFromNotesAndImages – private note filtering
// ---------------------------------------------------------------------------

Deno.test("buildPhotoEvidenceFromNotesAndImages excludes images linked to private notes", () => {
  const publicNotes = [
    { id: "note-1", content: "Public note content", author_name: "Alice", created_at: "2026-01-15T10:30:00Z" },
  ];
  const images = [
    { file_url: "https://storage.example.com/public.jpg", mime_type: "image/jpeg", file_name: "public.jpg", note_id: "note-1" },
    { file_url: "https://storage.example.com/private.jpg", mime_type: "image/jpeg", file_name: "private.jpg", note_id: "note-private" },
    { file_url: "https://storage.example.com/orphan.jpg", mime_type: "image/jpeg", file_name: "orphan.jpg", note_id: null },
  ];

  const result = buildPhotoEvidenceFromNotesAndImages(publicNotes, images);

  assertEquals(result.length, 1);
  assertEquals(result[0].fileName, "public.jpg");
  assertEquals(result[0].noteContent, "Public note content");
  assertEquals(result[0].noteAuthorName, "Alice");
});

// ---------------------------------------------------------------------------
// buildPhotoEvidenceFromNotesAndImages – WebP canInlineImage
// ---------------------------------------------------------------------------

Deno.test("buildPhotoEvidenceFromNotesAndImages marks WebP images as canInlineImage false", () => {
  const publicNotes = [
    { id: "note-1", content: "Note with mixed formats", author_name: "Bob", created_at: "2026-01-15T10:30:00Z" },
  ];
  const images = [
    { file_url: "https://storage.example.com/photo.webp", mime_type: "image/webp", file_name: "photo.webp", note_id: "note-1" },
    { file_url: "https://storage.example.com/photo.png", mime_type: "image/png", file_name: "photo.png", note_id: "note-1" },
    { file_url: "https://storage.example.com/photo.jpg", mime_type: "image/jpeg", file_name: "photo.jpg", note_id: "note-1" },
    { file_url: "https://storage.example.com/photo.gif", mime_type: "image/gif", file_name: "photo.gif", note_id: "note-1" },
  ];

  const result = buildPhotoEvidenceFromNotesAndImages(publicNotes, images);

  assertEquals(result.length, 4);
  assertEquals(result[0].canInlineImage, false, "WebP should not be inlineable");
  assertEquals(result[1].canInlineImage, true, "PNG should be inlineable");
  assertEquals(result[2].canInlineImage, true, "JPEG should be inlineable");
  assertEquals(result[3].canInlineImage, true, "GIF should be inlineable");
});

// ---------------------------------------------------------------------------
// buildPhotoEvidenceFromNotesAndImages – note content repeats per image
// ---------------------------------------------------------------------------

Deno.test("buildPhotoEvidenceFromNotesAndImages repeats note content for each image on the same note", () => {
  const publicNotes = [
    { id: "note-1", content: "Shared context for all photos", author_name: "Charlie", created_at: "2026-02-01T14:00:00Z" },
  ];
  const images = [
    { file_url: "https://storage.example.com/a.jpg", mime_type: "image/jpeg", file_name: "a.jpg", note_id: "note-1" },
    { file_url: "https://storage.example.com/b.jpg", mime_type: "image/jpeg", file_name: "b.jpg", note_id: "note-1" },
    { file_url: "https://storage.example.com/c.jpg", mime_type: "image/jpeg", file_name: "c.jpg", note_id: "note-1" },
  ];

  const result = buildPhotoEvidenceFromNotesAndImages(publicNotes, images);

  assertEquals(result.length, 3);
  for (const entry of result) {
    assertEquals(entry.noteContent, "Shared context for all photos");
    assertEquals(entry.noteAuthorName, "Charlie");
    assertEquals(entry.noteCreatedAt, "2026-02-01T14:00:00Z");
    assertEquals(entry.noteId, "note-1");
  }
  assertEquals(result[0].fileName, "a.jpg");
  assertEquals(result[1].fileName, "b.jpg");
  assertEquals(result[2].fileName, "c.jpg");
});

// ---------------------------------------------------------------------------
// buildQuickFacts – all expected fields present
// ---------------------------------------------------------------------------

Deno.test("buildQuickFacts includes all expected fields", () => {
  const result = buildQuickFacts({
    status: "IN PROGRESS",
    priority: "HIGH",
    assigneeName: "Jane Doe",
    teamName: "Alpha Team",
    dueDate: "2026-06-01",
    equipmentName: "CAT 320 Excavator",
    customerName: "Acme Corp",
    location: "Job Site A",
  });

  assertEquals(result.length, 8);

  const expectedLabels = [
    "Status", "Priority", "Assignee", "Team",
    "Due Date", "Equipment", "Customer", "Location",
  ];
  const labels = result.map(f => f.label);
  assertEquals(labels, expectedLabels);

  assertEquals(result[0].value, "IN PROGRESS");
  assertEquals(result[1].value, "HIGH");
  assertEquals(result[2].value, "Jane Doe");
  assertEquals(result[3].value, "Alpha Team");
  assertEquals(result[4].value, "2026-06-01");
  assertEquals(result[5].value, "CAT 320 Excavator");
  assertEquals(result[6].value, "Acme Corp");
  assertEquals(result[7].value, "Job Site A");

  // Verify fallbacks for null values
  const withNulls = buildQuickFacts({
    status: "OPEN",
    priority: "LOW",
    assigneeName: null,
    teamName: null,
    dueDate: null,
    equipmentName: null,
    customerName: null,
    location: null,
  });

  assertEquals(withNulls[2].value, "Unassigned");
  assertEquals(withNulls[3].value, "Unassigned");
  assertEquals(withNulls[4].value, "N/A");
  assertEquals(withNulls[5].value, "N/A");
  assertEquals(withNulls[6].value, "N/A");
  assertEquals(withNulls[7].value, "N/A");
});
