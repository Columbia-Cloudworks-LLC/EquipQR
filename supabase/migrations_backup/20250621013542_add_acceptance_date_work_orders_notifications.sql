
-- Add acceptance_date column to work_orders table
ALTER TABLE work_orders ADD COLUMN acceptance_date timestamp with time zone;

-- Create notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('work_order_request', 'work_order_accepted', 'work_order_assigned', 'work_order_completed', 'general')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create work_order_notes table
CREATE TABLE work_order_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL,
  hours_worked numeric(5,2) DEFAULT 0,
  is_private boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create work_order_images table
CREATE TABLE work_order_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add updated_at triggers for new tables
CREATE TRIGGER handle_updated_at_notifications
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

CREATE TRIGGER handle_updated_at_work_order_notes
  BEFORE UPDATE ON work_order_notes
  FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

-- Enable RLS on new tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_images ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- RLS policies for work_order_notes
CREATE POLICY "Users can view work order notes"
  ON work_order_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_id 
        AND wo.organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
    )
    AND (NOT is_private OR author_id = auth.uid())
  );

CREATE POLICY "Users can create work order notes"
  ON work_order_notes FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_id 
        AND wo.organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
    )
  );

CREATE POLICY "Users can update their own work order notes"
  ON work_order_notes FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own work order notes"
  ON work_order_notes FOR DELETE
  USING (author_id = auth.uid());

-- RLS policies for work_order_images
CREATE POLICY "Users can view work order images"
  ON work_order_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_id 
        AND wo.organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
    )
  );

CREATE POLICY "Users can upload work order images"
  ON work_order_images FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_id 
        AND wo.organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
    )
  );

CREATE POLICY "Users can delete their own work order images"
  ON work_order_images FOR DELETE
  USING (uploaded_by = auth.uid());

-- Create storage bucket for work order images
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-order-images', 'work-order-images', true);

-- Storage policies for work order images bucket
CREATE POLICY "Users can view work order images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'work-order-images');

CREATE POLICY "Authenticated users can upload work order images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'work-order-images'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own work order images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'work-order-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own work order images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'work-order-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
