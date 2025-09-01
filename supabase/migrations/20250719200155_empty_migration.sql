
-- Add logo and background_color columns to organizations table
ALTER TABLE public.organizations 
ADD COLUMN logo TEXT,
ADD COLUMN background_color TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.logo IS 'URL or path to organization logo image';
COMMENT ON COLUMN public.organizations.background_color IS 'Hex color code for organization branding (e.g., #ff0000)';
