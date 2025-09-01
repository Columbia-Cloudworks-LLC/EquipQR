-- Create the missing notes table that the first migration expects
-- This table is referenced by foreign key constraints in 20250617044539 migration

-- First create the missing handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the missing notes table
CREATE TABLE public.notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id uuid NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL,
  is_private boolean NOT NULL DEFAULT false,
  hours_worked numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_modified_by uuid,
  last_modified_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_notes_equipment_id ON public.notes(equipment_id);
CREATE INDEX idx_notes_author_id ON public.notes(author_id);
CREATE INDEX idx_notes_created_at ON public.notes(created_at);

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at_notes
    BEFORE UPDATE ON public.notes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.notes IS 'Equipment notes table for storing maintenance and operational notes';
COMMENT ON COLUMN public.notes.equipment_id IS 'Reference to the equipment this note belongs to';
COMMENT ON COLUMN public.notes.author_id IS 'Reference to the user who created this note';
COMMENT ON COLUMN public.notes.content IS 'The note content/text';
COMMENT ON COLUMN public.notes.is_private IS 'Whether this note is private (only visible to author)';
COMMENT ON COLUMN public.notes.hours_worked IS 'Hours worked associated with this note';
COMMENT ON COLUMN public.notes.last_modified_by IS 'User who last modified this note';
