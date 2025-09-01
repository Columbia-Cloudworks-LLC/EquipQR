
-- Create equipment_notes table to replace the existing notes table functionality
CREATE TABLE public.equipment_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  content text NOT NULL,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_private boolean NOT NULL DEFAULT false,
  hours_worked numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_modified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  last_modified_at timestamp with time zone DEFAULT now()
);

-- Create equipment_note_images table for image attachments
CREATE TABLE public.equipment_note_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_note_id uuid NOT NULL REFERENCES equipment_notes(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  description text,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on equipment_notes
ALTER TABLE public.equipment_notes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on equipment_note_images
ALTER TABLE public.equipment_note_images ENABLE ROW LEVEL SECURITY;

-- RLS policies for equipment_notes
CREATE POLICY "Users can view equipment notes in their organization" 
  ON public.equipment_notes 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM equipment e
      WHERE e.id = equipment_notes.equipment_id 
        AND e.organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
    )
    AND (NOT is_private OR author_id = auth.uid())
  );

CREATE POLICY "Users can create equipment notes in their organization" 
  ON public.equipment_notes 
  FOR INSERT 
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM equipment e
      WHERE e.id = equipment_notes.equipment_id 
        AND e.organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
    )
  );

CREATE POLICY "Users can update their own equipment notes" 
  ON public.equipment_notes 
  FOR UPDATE 
  USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own equipment notes" 
  ON public.equipment_notes 
  FOR DELETE 
  USING (author_id = auth.uid());

-- RLS policies for equipment_note_images
CREATE POLICY "Users can view images for accessible notes" 
  ON public.equipment_note_images 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM equipment_notes en
      JOIN equipment e ON e.id = en.equipment_id
      WHERE en.id = equipment_note_images.equipment_note_id
        AND e.organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
        AND (NOT en.is_private OR en.author_id = auth.uid())
    )
  );

CREATE POLICY "Users can upload images to their notes" 
  ON public.equipment_note_images 
  FOR INSERT 
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM equipment_notes en
      JOIN equipment e ON e.id = en.equipment_id
      WHERE en.id = equipment_note_images.equipment_note_id
        AND e.organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
    )
  );

CREATE POLICY "Users can delete images they uploaded" 
  ON public.equipment_note_images 
  FOR DELETE 
  USING (uploaded_by = auth.uid());

-- Create storage bucket for equipment note images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('equipment-note-images', 'equipment-note-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for equipment note images
CREATE POLICY "Authenticated users can upload equipment note images"
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'equipment-note-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can view equipment note images"
ON storage.objects FOR SELECT 
USING (bucket_id = 'equipment-note-images');

CREATE POLICY "Users can delete their own equipment note images"
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'equipment-note-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add updated_at trigger for equipment_notes
CREATE TRIGGER handle_updated_at_equipment_notes
    BEFORE UPDATE ON public.equipment_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
