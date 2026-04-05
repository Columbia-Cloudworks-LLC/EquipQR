/**
 * Single Work Order Google Doc Data Module
 *
 * Assembles all data needed for one polished single-work-order
 * Google Doc packet (branded header, quick facts, activity,
 * costs, PM checklist, timeline, and photo evidence appendix).
 */

import { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

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

// ============================================
// Helpers (inlined for module self-containment)
// ============================================

function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toISOString().split('T')[0];
  } catch {
    return dateString;
  }
}

function formatTimestamp(dateString: string | null): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toISOString();
  } catch {
    return dateString;
  }
}

function getConditionText(condition: number | null): string {
  if (condition === null) return 'Not Rated';
  switch (condition) {
    case 1: return 'OK';
    case 2: return 'Adjusted';
    case 3: return 'Recommend Repairs';
    case 4: return 'Requires Immediate Repairs';
    case 5: return 'Unsafe Condition Present';
    default: return 'Unknown';
  }
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

// ============================================
// Main Builder
// ============================================

export async function buildSingleWorkOrderGoogleDocData(
  supabase: SupabaseClient,
  organizationId: string,
  workOrderId: string,
): Promise<SingleWorkOrderGoogleDocData> {
  // 1. Fetch the work order and verify it belongs to the org
  const { data: workOrder, error: woError } = await supabase
    .from('work_orders')
    .select(`
      id, title, description, status, priority,
      created_date, due_date, completed_date,
      assignee_name, has_pm, team_id, equipment_id
    `)
    .eq('id', workOrderId)
    .eq('organization_id', organizationId)
    .single();

  if (woError || !workOrder) {
    throw new Error(
      `Work order not found or does not belong to organization: ${woError?.message ?? 'not found'}`,
    );
  }

  // 2. Fetch org row for name and logo
  const { data: org } = await supabase
    .from('organizations')
    .select('name, logo')
    .eq('id', organizationId)
    .single();

  // 3. If work order has team_id, fetch team name and image_url
  // Defense in depth: teams table has organization_id, so we add explicit filter
  let teamData: { name: string | null; imageUrl: string | null } = { name: null, imageUrl: null };
  if (workOrder.team_id) {
    const { data: team } = await supabase
      .from('teams')
      .select('name, image_url')
      .eq('id', workOrder.team_id)
      .eq('organization_id', organizationId)
      .single();
    if (team) {
      teamData = { name: team.name, imageUrl: team.image_url };
    }
  }

  // 4. If work order has equipment_id, fetch equipment details AND customer name
  let equipmentData = {
    name: null as string | null,
    manufacturer: null as string | null,
    model: null as string | null,
    serialNumber: null as string | null,
    location: null as string | null,
  };
  let customerName: string | null = null;

  if (workOrder.equipment_id) {
    const { data: equipment } = await supabase
      .from('equipment')
      .select('name, manufacturer, model, serial_number, location, customer_id')
      .eq('id', workOrder.equipment_id)
      .eq('organization_id', organizationId)
      .single();

    if (equipment) {
      equipmentData = {
        name: equipment.name,
        manufacturer: equipment.manufacturer,
        model: equipment.model,
        serialNumber: equipment.serial_number,
        location: equipment.location,
      };
      if (equipment.customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('name')
          .eq('id', equipment.customer_id)
          .eq('organization_id', organizationId)
          .single();
        customerName = customer?.name ?? null;
      }
    }
  }

  // 5. Fetch public notes ordered by created_at ASC
  // Defense in depth: work_order_notes does not have organization_id column.
  // Security ensured by: workOrderId already validated against organization_id above,
  // and RLS policies on work_order_notes enforce access through work_order ownership.
  const { data: publicNotes } = await supabase
    .from('work_order_notes')
    .select('id, work_order_id, content, created_at, author_id, hours_worked, is_private, author_name')
    .eq('work_order_id', workOrderId)
    .eq('is_private', false)
    .order('created_at', { ascending: true });

  const notes = publicNotes || [];

  // Resolve author names from profiles for notes missing author_name
  const authorIdsNeedingLookup = [...new Set(
    notes.filter(n => !n.author_name).map(n => n.author_id),
  )];
  let authorMap = new Map<string, string>();
  if (authorIdsNeedingLookup.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', authorIdsNeedingLookup);
    authorMap = new Map((profiles || []).map((p: { id: string; name: string }) => [p.id, p.name]));
  }

  const notesWithNames = notes.map(n => ({
    ...n,
    author_name: n.author_name || authorMap.get(n.author_id) || 'Unknown',
  }));

  // 6. Fetch ALL work_order_images for the work order
  // Defense in depth: work_order_images does not have organization_id column.
  // Security ensured by: workOrderId already validated against organization_id above,
  // and RLS policies on work_order_images enforce access through work_order ownership.
  const { data: allImages } = await supabase
    .from('work_order_images')
    .select('id, work_order_id, note_id, file_name, file_url, mime_type')
    .eq('work_order_id', workOrderId);

  const images = allImages || [];

  // 7–8. Build photo evidence (filters to public-note-linked images, sets canInlineImage)
  const photoEvidence = buildPhotoEvidenceFromNotesAndImages(
    notesWithNames.map(n => ({
      id: n.id,
      content: n.content,
      author_name: n.author_name,
      created_at: n.created_at,
    })),
    images.map(img => ({
      file_url: img.file_url,
      mime_type: img.mime_type,
      file_name: img.file_name,
      note_id: img.note_id,
    })),
  );

  // 9. Build activity entries from public notes
  const noteImageCounts = new Map<string, number>();
  for (const img of images) {
    if (img.note_id) {
      noteImageCounts.set(img.note_id, (noteImageCounts.get(img.note_id) || 0) + 1);
    }
  }

  const activityEntries: ActivityEntry[] = notesWithNames.map(note => ({
    date: formatTimestamp(note.created_at),
    authorName: note.author_name,
    content: note.content,
    hoursWorked: note.hours_worked || 0,
    photoCount: noteImageCounts.get(note.id) || 0,
  }));

  // 10. Build costs from work_order_costs with creator names
  // Defense in depth: work_order_costs does not have organization_id column.
  // Security ensured by: workOrderId already validated against organization_id above,
  // and RLS policies on work_order_costs enforce access through work_order ownership.
  const { data: costData } = await supabase
    .from('work_order_costs')
    .select('id, description, quantity, unit_price_cents, total_price_cents, inventory_item_id, created_at, created_by')
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: true });

  const rawCosts = costData || [];
  const costCreatorIds = [...new Set(rawCosts.map(c => c.created_by))];
  let costCreatorMap = new Map<string, string>();
  if (costCreatorIds.length > 0) {
    const { data: costProfiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', costCreatorIds);
    costCreatorMap = new Map(
      (costProfiles || []).map((p: { id: string; name: string }) => [p.id, p.name]),
    );
  }

  const costs: CostEntry[] = rawCosts.map(c => ({
    description: c.description,
    quantity: c.quantity,
    unitPrice: c.unit_price_cents / 100,
    totalPrice: (c.total_price_cents || c.quantity * c.unit_price_cents) / 100,
    fromInventory: !!c.inventory_item_id,
    addedBy: costCreatorMap.get(c.created_by) || 'Unknown',
    dateAdded: formatDate(c.created_at),
  }));

  // 11. Build timeline from work_order_status_history with changer names
  // Defense in depth: work_order_status_history does not have organization_id column.
  // Security ensured by: workOrderId already validated against organization_id above,
  // and RLS policies on work_order_status_history enforce access through work_order ownership.
  const { data: historyData } = await supabase
    .from('work_order_status_history')
    .select(`
      old_status, new_status, changed_at, reason,
      profiles:changed_by ( name )
    `)
    .eq('work_order_id', workOrderId)
    .order('changed_at', { ascending: true });

  const timeline: TimelineEntry[] = (historyData || []).map(h => {
    const profiles = h.profiles as unknown as { name: string } | null;
    return {
      previousStatus: h.old_status?.replace(/_/g, ' ').toUpperCase() || 'CREATED',
      newStatus: h.new_status.replace(/_/g, ' ').toUpperCase(),
      changedAt: formatTimestamp(h.changed_at),
      changedBy: profiles?.name || 'System',
      reason: h.reason || '',
    };
  });

  // 12. Build PM checklist data (same parsing as existing export module)
  let pmChecklist: PMChecklistEntry[] = [];
  let pmStatus: string | null = null;
  let pmGeneralNotes: string | null = null;

  if (workOrder.has_pm) {
    // Defense in depth: preventative_maintenance has organization_id, so we add explicit filter
    const { data: pmData } = await supabase
      .from('preventative_maintenance')
      .select('status, completed_at, notes, checklist_data')
      .eq('work_order_id', workOrderId)
      .eq('organization_id', organizationId)
      .single();

    if (pmData) {
      pmStatus = pmData.status;
      pmGeneralNotes = pmData.notes;

      if (pmData.checklist_data) {
        let checklistItems: Array<{
          section: string;
          title: string;
          condition: number | null;
          required: boolean;
          notes?: string;
        }> = [];

        const rawData = pmData.checklist_data;
        try {
          if (typeof rawData === 'string') {
            checklistItems = JSON.parse(rawData);
          } else if (Array.isArray(rawData)) {
            checklistItems = rawData;
          }
        } catch (error) {
          console.error('Error parsing PM checklist data', {
            workOrderId,
            errorMessage: error instanceof Error ? error.message : String(error),
          });
        }

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
  }

  // 13. Build quickFacts array
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

  // 14. photoHighlights = first 3 photos from photoEvidence
  const photoHighlights = photoEvidence.slice(0, 3);

  return {
    organization: {
      name: org?.name || 'Unknown',
      logoUrl: org?.logo || null,
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
    generatedAt: new Date().toISOString(),
  };
}

export const __testables = { buildSingleWorkOrderGoogleDocData };
