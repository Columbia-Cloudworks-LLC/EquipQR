
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEquipmentNotesWithImages,
  createEquipmentNoteWithImages,
  updateEquipmentNote,
  deleteEquipmentNote,
  uploadEquipmentNoteImage,
  deleteEquipmentNoteImage,
  updateEquipmentDisplayImage
} from '@/services/equipmentNotesService';
import { toast } from 'sonner';

export const useEquipmentNotes = (equipmentId: string, organizationId: string) => {
  return useQuery({
    queryKey: ['equipment-notes', equipmentId, organizationId],
    queryFn: () => getEquipmentNotesWithImages(equipmentId),
    enabled: !!equipmentId && !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCreateEquipmentNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      equipmentId: string;
      content: string;
      hoursWorked?: number;
      isPrivate?: boolean;
      images?: File[];
    }) => createEquipmentNoteWithImages(
      variables.equipmentId,
      variables.content,
      variables.hoursWorked || 0,
      variables.isPrivate || false,
      variables.images || []
    ),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.invalidateQueries({
          queryKey: ['equipment-notes', variables.equipmentId]
        });
        toast.success('Note added successfully');
      }
    },
    onError: (error) => {
      console.error('Error creating equipment note:', error);
      toast.error('Failed to add note');
    }
  });
};

export const useUpdateEquipmentNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, updateData }: { 
      noteId: string; 
      updateData: { content?: string; hoursWorked?: number; isPrivate?: boolean; }
    }) => updateEquipmentNote(noteId, updateData),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({
          queryKey: ['equipment-notes']
        });
        toast.success('Note updated successfully');
      }
    },
    onError: (error) => {
      console.error('Error updating equipment note:', error);
      toast.error('Failed to update note');
    }
  });
};

export const useDeleteEquipmentNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEquipmentNote,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['equipment-notes']
      });
      toast.success('Note deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting equipment note:', error);
      toast.error('Failed to delete note');
    }
  });
};

export const useUploadEquipmentNoteImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, file, description }: { noteId: string; file: File; description?: string }) =>
      uploadEquipmentNoteImage(noteId, file, description),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['equipment-notes']
      });
      toast.success('Image uploaded successfully');
    },
    onError: (error) => {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    }
  });
};

export const useDeleteEquipmentNoteImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEquipmentNoteImage,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['equipment-notes']
      });
      toast.success('Image deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  });
};

export const useSetEquipmentDisplayImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ equipmentId, imageUrl }: { equipmentId: string; imageUrl: string }) =>
      updateEquipmentDisplayImage(equipmentId, imageUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['equipment']
      });
      toast.success('Display image updated successfully');
    },
    onError: (error) => {
      console.error('Error setting display image:', error);
      toast.error('Failed to update display image');
    }
  });
};
