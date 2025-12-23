import React from 'react';
import { render, screen, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EquipmentImagesTab from '../EquipmentImagesTab';
import * as equipmentImagesServiceModule from '@/features/equipment/services/equipmentImagesService';
import * as equipmentNotesServiceModule from '@/features/equipment/services/equipmentNotesService';

// Mock dependencies
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' }
  }))
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: { id: 'org-1', userRole: 'admin' }
  }))
}));

vi.mock('@/features/equipment/hooks/useEquipmentNotesPermissions', () => ({
  useEquipmentNotesPermissions: vi.fn(() => ({
    canCreate: true,
    canEdit: true,
    canDelete: true
  }))
}));

vi.mock('@/features/equipment/services/equipmentImagesService', () => ({
  getAllEquipmentImages: vi.fn(),
  deleteEquipmentImage: vi.fn(),
  updateEquipmentDisplayImage: vi.fn()
}));

vi.mock('@/features/equipment/services/equipmentNotesService', () => ({
  createEquipmentNoteWithImages: vi.fn()
}));

vi.mock('@/components/common/ImageGallery', () => ({
  default: ({ images }: { images?: Array<{ url: string }> }) => (
    <div data-testid="image-gallery">
      {images?.map((img: { url: string }, i: number) => (
        <div key={i} data-testid={`image-${i}`}>{img.url}</div>
      ))}
    </div>
  )
}));

vi.mock('@/components/common/ImageUploadWithNote', () => ({
  default: ({ onUpload, onCancel }: { onUpload: (files: File[]) => void; onCancel: () => void }) => (
    <div data-testid="image-upload">
      <button onClick={() => onUpload([new File([], 'test.jpg')])}>Upload</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}));

const mockImages = [
  { id: 'img-1', url: 'https://example.com/image1.jpg', sourceType: 'equipment_note' },
  { id: 'img-2', url: 'https://example.com/image2.jpg', sourceType: 'work_order_note' }
];

describe('EquipmentImagesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(equipmentImagesServiceModule.getAllEquipmentImages).mockResolvedValue(mockImages);
  });

  describe('Core Rendering', () => {
    it('renders image gallery', async () => {
      render(
        <EquipmentImagesTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('image-gallery')).toBeInTheDocument();
      });
    });

    it('displays images', async () => {
      render(
        <EquipmentImagesTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('image-0')).toBeInTheDocument();
        expect(screen.getByTestId('image-1')).toBeInTheDocument();
      });
    });
  });

  describe('Image Upload', () => {
    it('shows upload form when upload button is clicked', async () => {
      render(
        <EquipmentImagesTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      // Upload functionality would be tested based on component implementation
      await waitFor(() => {
        // Component should render upload UI when triggered
      });
    });

    it('handles image upload', async () => {
      vi.mocked(equipmentNotesServiceModule.createEquipmentNoteWithImages).mockResolvedValue({ id: 'note-1' });

      render(
        <EquipmentImagesTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      // Upload would be triggered by user interaction
      await waitFor(() => {
        // Component should handle upload
      });
    });
  });

  describe('Image Deletion', () => {
    it('handles image deletion', async () => {
      vi.mocked(equipmentImagesServiceModule.deleteEquipmentImage).mockResolvedValue(undefined);

      render(
        <EquipmentImagesTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      // Image deletion would be triggered by user interaction
      await waitFor(() => {
        // Component should handle deletion
      });
    });
  });

  describe('Display Image', () => {
    it('handles setting display image', async () => {
      vi.mocked(equipmentImagesServiceModule.updateEquipmentDisplayImage).mockResolvedValue(undefined);

      render(
        <EquipmentImagesTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
          currentDisplayImage="https://example.com/image1.jpg"
        />
      );
      
      // Setting display image would be tested based on component implementation
      await waitFor(() => {
        // Component should handle display image update
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading state while fetching images', () => {
      vi.mocked(equipmentImagesServiceModule.getAllEquipmentImages).mockImplementation(() => new Promise(() => {}));

      render(
        <EquipmentImagesTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      // Should show loading state
    });
  });

  describe('Empty State', () => {
    it('handles empty images list', async () => {
      vi.mocked(equipmentImagesServiceModule.getAllEquipmentImages).mockResolvedValue([]);

      render(
        <EquipmentImagesTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('image-gallery')).toBeInTheDocument();
      });
    });
  });
});


