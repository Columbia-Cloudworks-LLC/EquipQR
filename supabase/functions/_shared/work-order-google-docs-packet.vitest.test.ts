import { describe, expect, it } from 'vitest';
import { buildExecutivePacketRequests } from './work-order-google-docs-packet';

describe('buildExecutivePacketRequests', () => {
  it('uses the Docs API page break request shape for evidence sections', () => {
    const result = buildExecutivePacketRequests({
      organization: { name: 'CW Rentals', logoUrl: null },
      team: { name: 'Alpha Team', imageUrl: null },
      customer: { name: 'Acme Corp' },
      equipment: {
        name: 'Excavator',
        manufacturer: 'CAT',
        model: '320',
        serialNumber: 'SN-001',
        location: 'Site A',
      },
      workOrder: {
        id: 'wo-1',
        title: 'Fix hydraulic line',
        description: 'Leaking hydraulic line on boom arm',
        status: 'COMPLETED',
        priority: 'HIGH',
        createdDate: '2026-01-15',
        dueDate: '2026-01-20',
        completedDate: '2026-01-21',
        assigneeName: 'Jane Doe',
      },
      quickFacts: [
        { label: 'Status', value: 'COMPLETED' },
        { label: 'Priority', value: 'HIGH' },
      ],
      activityEntries: [],
      costs: [],
      pmChecklist: [],
      pmStatus: null,
      pmGeneralNotes: null,
      timeline: [],
      photoHighlights: [],
      photoEvidence: [
        {
          imageUrl: 'https://storage.example.com/photo.jpg',
          mimeType: 'image/jpeg',
          fileName: 'photo.jpg',
          noteId: 'note-1',
          noteContent: 'Damage photo',
          noteAuthorName: 'Jane Doe',
          noteCreatedAt: '2026-01-15T10:00:00Z',
          canInlineImage: true,
        },
      ],
      generatedAt: '2026-01-15T12:00:00Z',
    });

    const pageBreakRequests = result.requests.filter((request) =>
      'insertPageBreak' in request || 'insertPageBreakRequest' in request
    );

    expect(pageBreakRequests.length).toBeGreaterThan(0);
    expect(pageBreakRequests.every((request) => 'insertPageBreakRequest' in request)).toBe(true);
    expect(pageBreakRequests.some((request) => 'insertPageBreak' in request)).toBe(false);
  });
});
