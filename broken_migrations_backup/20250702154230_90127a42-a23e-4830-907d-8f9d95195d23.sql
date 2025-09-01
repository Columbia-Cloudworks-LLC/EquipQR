
-- First, let's update the work_order_notes table to support image attachments
ALTER TABLE work_order_notes ADD COLUMN IF NOT EXISTS images_count INTEGER DEFAULT 0;

-- Update the equipment_notes table to support image attachments (if it doesn't already exist)
CREATE TABLE IF NOT EXISTS equipment_note_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_note_id UUID NOT NULL REFERENCES equipment_notes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  description TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for equipment_note_images
ALTER TABLE equipment_note_images ENABLE ROW LEVEL SECURITY;

-- Users can view images for accessible notes
CREATE POLICY "Users can view images for accessible notes" ON equipment_note_images
FOR SELECT USING (
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

-- Users can upload images to their notes
CREATE POLICY "Users can upload images to their notes" ON equipment_note_images
FOR INSERT WITH CHECK (
  uploaded_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM equipment_notes en
    JOIN equipment e ON e.id = en.equipment_id
    WHERE en.id = equipment_note_images.equipment_note_id
    AND e.organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
);

-- Users can delete images they uploaded
CREATE POLICY "Users can delete images they uploaded" ON equipment_note_images
FOR DELETE USING (uploaded_by = auth.uid());

-- Add display_image_url column to equipment table if it doesn't exist
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS display_image_url TEXT;

-- Create function to update equipment display image
CREATE OR REPLACE FUNCTION update_equipment_display_image()
RETURNS TRIGGER AS $$
BEGIN
  -- Update equipment display image to the latest uploaded image
  UPDATE equipment 
  SET display_image_url = NEW.file_url,
      updated_at = now()
  WHERE id = (
    SELECT en.equipment_id 
    FROM equipment_notes en 
    WHERE en.id = NEW.equipment_note_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update display image
DROP TRIGGER IF EXISTS trigger_update_equipment_display_image ON equipment_note_images;
CREATE TRIGGER trigger_update_equipment_display_image
  AFTER INSERT ON equipment_note_images
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_display_image();

-- Update work_order_images table to support better organization
ALTER TABLE work_order_images ADD COLUMN IF NOT EXISTS note_id UUID REFERENCES work_order_notes(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_equipment_note_images_note_id ON equipment_note_images(equipment_note_id);
CREATE INDEX IF NOT EXISTS idx_work_order_images_note_id ON work_order_images(note_id);
