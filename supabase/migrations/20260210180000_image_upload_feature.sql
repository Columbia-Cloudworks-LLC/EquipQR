-- =============================================================================
-- Image Upload Feature Migration
-- Adds support for image uploads to organizations (logo), users (avatar),
-- teams (image), and inventory items (multi-image).
-- Fixes: https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/559
-- =============================================================================

-- ============================================================================
-- 1. SCHEMA CHANGES
-- ============================================================================

-- Add avatar_url to profiles
ALTER TABLE "public"."profiles"
  ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;

COMMENT ON COLUMN "public"."profiles"."avatar_url" IS 'Supabase Storage public URL for user avatar image';

-- Add image_url to teams
ALTER TABLE "public"."teams"
  ADD COLUMN IF NOT EXISTS "image_url" TEXT;

COMMENT ON COLUMN "public"."teams"."image_url" IS 'Supabase Storage public URL for team image';

-- ============================================================================
-- 2. NEW TABLE: inventory_item_images
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."inventory_item_images" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "inventory_item_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "file_url" text NOT NULL,
  "file_name" text NOT NULL,
  "file_size" integer,
  "mime_type" text,
  "uploaded_by" uuid NOT NULL,
  "uploaded_by_name" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_item_images_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_item_images_inventory_item_id_fkey"
    FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE,
  CONSTRAINT "inventory_item_images_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id"),
  CONSTRAINT "inventory_item_images_uploaded_by_fkey"
    FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_inventory_item_images_item_id"
  ON "public"."inventory_item_images" ("inventory_item_id");

CREATE INDEX IF NOT EXISTS "idx_inventory_item_images_org_id"
  ON "public"."inventory_item_images" ("organization_id");

CREATE INDEX IF NOT EXISTS "idx_inventory_item_images_uploaded_by"
  ON "public"."inventory_item_images" ("uploaded_by");

COMMENT ON TABLE "public"."inventory_item_images" IS 'Stores metadata for images uploaded to inventory items. Up to 5 images per item.';

-- ============================================================================
-- 3. RLS POLICIES FOR inventory_item_images
-- ============================================================================

ALTER TABLE "public"."inventory_item_images" ENABLE ROW LEVEL SECURITY;

-- SELECT: org members can read
CREATE POLICY "inventory_item_images_select" ON "public"."inventory_item_images"
  FOR SELECT USING (
    "public"."is_org_member"((SELECT "auth"."uid"()), "organization_id")
  );

-- INSERT: org members can insert (must set uploaded_by = self)
CREATE POLICY "inventory_item_images_insert" ON "public"."inventory_item_images"
  FOR INSERT WITH CHECK (
    "uploaded_by" = (SELECT "auth"."uid"())
    AND "public"."is_org_member"((SELECT "auth"."uid"()), "organization_id")
  );

-- DELETE: uploaders can delete their own, or org admins can delete any
CREATE POLICY "inventory_item_images_delete" ON "public"."inventory_item_images"
  FOR DELETE USING (
    "uploaded_by" = (SELECT "auth"."uid"())
    OR "public"."is_org_admin"((SELECT "auth"."uid"()), "organization_id")
  );

-- ============================================================================
-- 4. UPDATE STORAGE QUOTA FUNCTION: get_organization_storage_mb
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."get_organization_storage_mb"("org_id" uuid) RETURNS bigint
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  total_bytes BIGINT := 0;
BEGIN
  -- Sum all equipment note images
  SELECT COALESCE(SUM(eni.file_size), 0) INTO total_bytes
  FROM equipment_note_images eni
  JOIN equipment_notes en ON eni.equipment_note_id = en.id
  JOIN equipment e ON en.equipment_id = e.id
  WHERE e.organization_id = org_id;
  
  -- Add work order images
  SELECT total_bytes + COALESCE(SUM(woi.file_size), 0) INTO total_bytes
  FROM work_order_images woi
  WHERE woi.work_order_id IN (
    SELECT id FROM work_orders WHERE organization_id = org_id
  );

  -- Add inventory item images
  SELECT total_bytes + COALESCE(SUM(iii.file_size), 0) INTO total_bytes
  FROM inventory_item_images iii
  WHERE iii.organization_id = org_id;
  
  -- Convert bytes to MB
  RETURN ROUND(total_bytes / 1048576.0);
END;
$$;

COMMENT ON FUNCTION "public"."get_organization_storage_mb"("org_id" uuid) IS 'Calculate total storage used by an organization in MB. Returns storage from equipment_note_images, work_order_images, and inventory_item_images tables.';

-- ============================================================================
-- 5. UPDATE STORAGE TRIGGER FUNCTION: update_organization_storage
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."update_organization_storage"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  org_id UUID;
  new_storage_mb BIGINT;
BEGIN
  -- Determine organization_id based on trigger table
  IF TG_TABLE_NAME = 'equipment_note_images' THEN
    SELECT e.organization_id INTO org_id
    FROM equipment_notes en
    JOIN equipment e ON en.equipment_id = e.id
    WHERE en.id = (
      CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.equipment_note_id
        ELSE NEW.equipment_note_id
      END
    );
  ELSIF TG_TABLE_NAME = 'work_order_images' THEN
    SELECT organization_id INTO org_id
    FROM work_orders
    WHERE id = (
      CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.work_order_id
        ELSE NEW.work_order_id
      END
    );
  ELSIF TG_TABLE_NAME = 'inventory_item_images' THEN
    -- inventory_item_images has organization_id directly on the row
    IF TG_OP = 'DELETE' THEN
      org_id := OLD.organization_id;
    ELSE
      org_id := NEW.organization_id;
    END IF;
  END IF;
  
  IF org_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Recalculate storage
  new_storage_mb := get_organization_storage_mb(org_id);
  
  -- Update organizations table
  UPDATE organizations
  SET storage_used_mb = new_storage_mb
  WHERE id = org_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION "public"."update_organization_storage"() IS 'Automatically update organization storage when images are added/deleted. Handles equipment_note_images, work_order_images, and inventory_item_images.';

-- ============================================================================
-- 6. ADD STORAGE TRIGGER FOR inventory_item_images
-- ============================================================================

CREATE TRIGGER "inventory_item_images_storage_trigger"
  AFTER INSERT OR DELETE OR UPDATE ON "public"."inventory_item_images"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."update_organization_storage"();

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON TABLE "public"."inventory_item_images" TO "anon";
GRANT ALL ON TABLE "public"."inventory_item_images" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_item_images" TO "service_role";
