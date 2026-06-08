/**
 * Pure builders for single work order Google Doc packets.
 */

import { formatDate, formatTimestamp, getConditionText } from "./export-formatters.ts";
import { parsePMChecklistData } from "./pm-checklist-parse.ts";
import type { SingleWorkOrderGoogleDocFetchResult } from "./work-order-google-docs-single-fetch.ts";

// ============================================
// Types
// ============================================

export interface PhotoEvidenceEntry {
  imageUrl: string | null;
  mimeType: string | null;
  fileName: string;
  noteId: string | null;
  noteContent: string;
  noteAuthorName: string;
  noteCreatedAt: string;
  canInlineImage: boolean;
}

export interface ActivityEntry {
  date: string;
  authorName: string;
  content: string;
  hoursWorked: number;
  photoCount: number;
}

export interface CostEntry {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  fromInventory: boolean;
  addedBy: string;
  dateAdded: string;
}

export interface TimelineEntry {
  previousStatus: string;
  newStatus: string;
  changedAt: string;
  changedBy: string;
  reason: string;
}

export interface PMChecklistEntry {
  section: string;
  itemTitle: string;
  condition: number | null;
  conditionText: string;
  required: boolean;
  notes: string;
}

export interface QuickFactEntry {
  label: string;
  value: string;
}

export interface SingleWorkOrderGoogleDocData {
  organization: { name: string; logoUrl: string | null };
  team: { name: string | null; imageUrl: string | null };
  customer: { name: string | null };
  equipment: {
    name: string | null;
    manufacturer: string | null;
    model: string | null;
    serialNumber: string | null;
    location: string | null;
  };
  workOrder: {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    createdDate: string;
    dueDate: string | null;
    completedDate: string | null;
    assigneeName: string | null;
  };
  quickFacts: QuickFactEntry[];
  activityEntries: ActivityEntry[];
  costs: CostEntry[];
  pmChecklist: PMChecklistEntry[];
  pmStatus: string | null;
  pmGeneralNotes: string | null;
  timeline: TimelineEntry[];
  photoHighlights: PhotoEvidenceEntry[];
  photoEvidence: PhotoEvidenceEntry[];
  generatedAt: string;
}

const INLINEABLE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif'];

// ============================================
// Pure Functions (exported for testing)
// ============================================

/**
 * Builds photo evidence entries from public notes and images.
 * Only images whose note_id matches a public note are included.
 * Each image produces its own entry with note content repeated.
 */
export function buildPhotoEvidenceFromNotesAndImages(
  publicNotes: Array<{ id: string; content: string; author_name: string; created_at: string }>,
  images: Array<{ file_url: string | null; mime_type: string | null; file_name: string; note_id: string | null }>,
): PhotoEvidenceEntry[] {
  const publicNoteIds = new Set(publicNotes.map(n => n.id));
  const noteMap = new Map(publicNotes.map(n => [n.id, n]));

  return images
    .filter(img => img.note_id !== null && publicNoteIds.has(img.note_id))
    .map(img => {
      const note = noteMap.get(img.note_id!)!;
      return {
        imageUrl: img.file_url,
        mimeType: img.mime_type,
        fileName: img.file_name,
        noteId: img.note_id,
        noteContent: note.content,
        noteAuthorName: note.author_name,
        noteCreatedAt: note.created_at,
        canInlineImage: INLINEABLE_MIME_TYPES.includes(img.mime_type ?? ''),
      };
    });
}

/**
 * Builds the quick-facts array from work order and related entity data.
 */
export function buildQuickFacts(data: {
  status: string;
  priority: string;
  assigneeName: string | null;
  teamName: string | null;
  dueDate: string | null;
  equipmentName: string | null;
  customerName: string | null;
  location: string | null;
}): QuickFactEntry[] {
  return [
    { label: 'Status', value: data.status },
    { label: 'Priority', value: data.priority },
    { label: 'Assignee', value: data.assigneeName || 'Unassigned' },
    { label: 'Team', value: data.teamName || 'Unassigned' },
    { label: 'Due Date', value: data.dueDate || 'N/A' },
    { label: 'Equipment', value: data.equipmentName || 'N/A' },
    { label: 'Customer', value: data.customerName || 'N/A' },
    { label: 'Location', value: data.location || 'N/A' },
  ];
}

export function buildSingleWorkOrderGoogleDocDataFromFetch(
  fetched: SingleWorkOrderGoogleDocFetchResult,
  generatedAt: string = new Date().toISOString(),
): SingleWorkOrderGoogleDocData {
  const { workOrder, organization, teamData, equipmentData, customerName } = fetched;

  // 7–8. Build photo evidence (filters to public-note-linked images, sets canInlineImage)
  const photoEvidence = buildPhotoEvidenceFromNotesAndImages(
    fetched.notesWithNames.map(n => ({
      id: n.id,
      content: n.content,
      author_name: n.author_name,
      created_at: n.created_at,
    })),
    fetched.images.map(img => ({
      file_url: img.file_url,
      mime_type: img.mime_type,
      file_name: img.file_name,
      note_id: img.note_id,
    })),
  );

  // 9. Build activity entries from public notes
  const noteImageCounts = new Map<string, number>();
  for (const img of fetched.images) {
    if (img.note_id) {
      noteImageCounts.set(img.note_id, (noteImageCounts.get(img.note_id) || 0) + 1);
    }
  }

  const activityEntries: ActivityEntry[] = fetched.notesWithNames.map(note => ({
    date: formatTimestamp(note.created_at),
    authorName: note.author_name,
    content: note.content,
    hoursWorked: note.hours_worked || 0,
    photoCount: noteImageCounts.get(note.id) || 0,
  }));

  const costs: CostEntry[] = fetched.rawCosts.map(c => ({
    description: c.description,
    quantity: c.quantity,
    unitPrice: c.unit_price_cents / 100,
    totalPrice: (c.total_price_cents || c.quantity * c.unit_price_cents) / 100,
    fromInventory: !!c.inventory_item_id,
    addedBy: fetched.costCreatorMap.get(c.created_by) || 'Unknown',
    dateAdded: formatDate(c.created_at),
  }));

  const timeline: TimelineEntry[] = fetched.historyData.map(h => ({
    previousStatus: h.old_status?.replace(/_/g, ' ').toUpperCase() || 'CREATED',
    newStatus: h.new_status.replace(/_/g, ' ').toUpperCase(),
    changedAt: formatTimestamp(h.changed_at),
    changedBy: h.profiles?.name || 'System',
    reason: h.reason || '',
  }));

  let pmChecklist: PMChecklistEntry[] = [];
  let pmStatus: string | null = null;
  let pmGeneralNotes: string | null = null;

  if (fetched.pmData) {
    pmStatus = fetched.pmData.status;
    pmGeneralNotes = fetched.pmData.notes;

    if (fetched.pmData.checklist_data) {
      const { items: checklistItems } = parsePMChecklistData(
        fetched.pmData.checklist_data,
        { workOrderId: workOrder.id },
      );

      pmChecklist = checklistItems.map(item => ({
        section: item.section,
        itemTitle: item.title,
        condition: item.condition,
        conditionText: getConditionText(item.condition),
        required: item.required,
        notes: item.notes || '',
      }));
    }
  }

  const quickFacts = buildQuickFacts({
    status: workOrder.status.replace(/_/g, ' ').toUpperCase(),
    priority: workOrder.priority.toUpperCase(),
    assigneeName: workOrder.assignee_name,
    teamName: teamData.name,
    dueDate: formatDate(workOrder.due_date) || null,
    equipmentName: equipmentData.name,
    customerName,
    location: equipmentData.location,
  });

  const photoHighlights = photoEvidence.slice(0, 3);

  return {
    organization: {
      name: organization?.name || 'Unknown',
      logoUrl: organization?.logo || null,
    },
    team: teamData,
    customer: { name: customerName },
    equipment: equipmentData,
    workOrder: {
      id: workOrder.id,
      title: workOrder.title,
      description: workOrder.description,
      status: workOrder.status.replace(/_/g, ' ').toUpperCase(),
      priority: workOrder.priority.toUpperCase(),
      createdDate: formatDate(workOrder.created_date),
      dueDate: formatDate(workOrder.due_date) || null,
      completedDate: formatDate(workOrder.completed_date) || null,
      assigneeName: workOrder.assignee_name,
    },
    quickFacts,
    activityEntries,
    costs,
    pmChecklist,
    pmStatus,
    pmGeneralNotes,
    timeline,
    photoHighlights,
    photoEvidence,
    generatedAt,
  };
}
