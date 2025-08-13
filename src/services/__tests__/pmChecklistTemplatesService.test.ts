import { vi, describe, it, expect, beforeEach } from 'vitest';
import { 
  pmChecklistTemplatesService,
  generateSectionsSummary, 
  templateToSummary,
  type PMTemplate 
} from '../pmChecklistTemplatesService';

// Create configurable mock functions
let mockOr: ReturnType<typeof vi.fn>;
let mockSingle: ReturnType<typeof vi.fn>;
let mockEq: ReturnType<typeof vi.fn>;

// Mock Supabase client with simpler structure
vi.mock('@/integrations/supabase/client', () => {
  const createMockChain = () => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn(() => mockEq?.() || Promise.resolve({ data: null, error: null })),
    or: vi.fn(() => mockOr?.() || Promise.resolve({ data: [], error: null })),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    nullsFirst: vi.fn().mockReturnThis(),
    single: vi.fn(() => mockSingle?.() || Promise.resolve({ data: null, error: null }))
  });

  return {
    supabase: {
      from: vi.fn(() => createMockChain())
    }
  };
});

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: () => 'mock-id-123'
}));

const mockChecklistItem = {
  id: 'item-1',
  title: 'Check Oil',
  description: 'Check engine oil level',
  section: 'Engine',
  condition: null,
  required: true,
  notes: ''
};

const mockTemplate: PMTemplate = {
  id: 'template-1',
  organization_id: 'org-1',
  name: 'Test Template',
  description: 'Test description',
  is_protected: false,
  template_data: [mockChecklistItem],
  created_by: 'user-1',
  updated_by: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

describe('pmChecklistTemplatesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock functions
    mockOr = vi.fn().mockResolvedValue({ data: [], error: null });
    mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
  });

  describe('listTemplates', () => {
    it('fetches templates for organization', async () => {
      mockOr.mockResolvedValue({ data: [mockTemplate], error: null });
      
      const result = await pmChecklistTemplatesService.listTemplates('org-1');
      expect(result).toEqual([mockTemplate]);
    });

    it('handles database errors', async () => {
      mockOr.mockResolvedValue({ data: null, error: new Error('Database error') });
      
      await expect(pmChecklistTemplatesService.listTemplates('org-1')).rejects.toThrow('Database error');
    });
  });

  describe('getTemplate', () => {
    it('fetches template by ID', async () => {
      mockSingle.mockResolvedValue({ data: mockTemplate, error: null });
      
      const result = await pmChecklistTemplatesService.getTemplate('template-1');
      expect(result).toEqual(mockTemplate);
    });

    it('returns null when template not found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      
      const result = await pmChecklistTemplatesService.getTemplate('non-existent');
      expect(result).toBeNull();
    });

    it('throws on database error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: new Error('Database error') });
      
      await expect(pmChecklistTemplatesService.getTemplate('template-1')).rejects.toThrow('Database error');
    });
  });

  describe('createTemplate', () => {
    it('creates a new template', async () => {
      mockSingle.mockResolvedValue({ data: mockTemplate, error: null });
      
      const result = await pmChecklistTemplatesService.createTemplate({
        organizationId: 'org-1',
        name: 'Test Template',
        description: 'Test description',
        template_data: [mockChecklistItem],
        created_by: 'user-1'
      });
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('updateTemplate', () => {
    it('updates existing template', async () => {
      const updates = {
        name: 'Updated Template',
        description: 'Updated description'
      };
      const updatedTemplate = { ...mockTemplate, ...updates, updated_by: 'user-1' };
      
      mockSingle.mockResolvedValue({ data: updatedTemplate, error: null });

      const result = await pmChecklistTemplatesService.updateTemplate('template-1', { ...updates, updated_by: 'user-1' });
      expect(result).toEqual(updatedTemplate);
    });
  });

  describe('deleteTemplate', () => {
    it('deletes template by ID', async () => {
      mockEq.mockResolvedValue({ data: null, error: null });

      await expect(pmChecklistTemplatesService.deleteTemplate('template-1')).resolves.toBeUndefined();
    });
  });
});

describe('Helper Functions', () => {
  describe('generateSectionsSummary', () => {
    it('counts items by section', () => {
      const templateData = [
        { id: '1', section: 'Engine', title: 'Item 1', description: '', condition: null, required: false, notes: '' },
        { id: '2', section: 'Engine', title: 'Item 2', description: '', condition: null, required: false, notes: '' },
        { id: '3', section: 'Safety', title: 'Item 3', description: '', condition: null, required: false, notes: '' }
      ];

      const result = generateSectionsSummary(templateData);

      expect(result).toEqual([
        { name: 'Engine', count: 2 },
        { name: 'Safety', count: 1 }
      ]);
    });
  });

  describe('templateToSummary', () => {
    it('converts template to summary format', () => {
      const result = templateToSummary(mockTemplate);

      expect(result).toEqual({
        id: 'template-1',
        name: 'Test Template',
        description: 'Test description',
        is_protected: false,
        organization_id: 'org-1',
        sections: [{ name: 'Engine', count: 1 }],
        itemCount: 1
      });
    });

    it('handles string JSON template_data', () => {
      const templateWithStringData = {
        ...mockTemplate,
        template_data: JSON.stringify([mockChecklistItem])
      } as unknown as PMTemplate;

      const result = templateToSummary(templateWithStringData);

      expect(result.itemCount).toBe(1);
      expect(result.sections).toEqual([{ name: 'Engine', count: 1 }]);
    });

    it('handles malformed template_data', () => {
      const templateWithMalformedData = {
        ...mockTemplate,
        template_data: 'invalid json'
      } as unknown as PMTemplate;

      const result = templateToSummary(templateWithMalformedData);

      expect(result.itemCount).toBe(0);
      expect(result.sections).toEqual([]);
    });
  });
});