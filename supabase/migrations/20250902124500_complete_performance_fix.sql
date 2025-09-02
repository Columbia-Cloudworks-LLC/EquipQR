-- Complete Performance Fix Migration
-- Addresses all remaining auth RLS initialization plan issues and multiple permissive policies
-- Generated: 2025-01-02

BEGIN;

-- =============================================================================
-- PART 1: Fix Remaining Auth RLS Initialization Plan Issues
-- Replace auth.uid(), auth.email(), auth.role() with cached versions
-- =============================================================================

-- Billing Events policies
DROP POLICY IF EXISTS "Admins can view billing events" ON "public"."billing_events";
CREATE POLICY "Admins can view billing events" ON "public"."billing_events" 
  FOR SELECT USING (
    "organization_id" IN (
      SELECT "organization_members"."organization_id"
      FROM "public"."organization_members"
      WHERE "organization_members"."user_id" = (select "auth"."uid"()) 
      AND "organization_members"."role" = ANY (ARRAY['owner'::text, 'admin'::text]) 
      AND "organization_members"."status" = 'active'::text
    )
  );

DROP POLICY IF EXISTS "System only billing_events inserts" ON "public"."billing_events";
CREATE POLICY "System only billing_events inserts" ON "public"."billing_events" 
  FOR INSERT WITH CHECK ((select "auth"."role"()) = 'service_role'::text);

-- Billing Exemptions policies
DROP POLICY IF EXISTS "Prevent unauthorized exemption deletes" ON "public"."billing_exemptions";
CREATE POLICY "Prevent unauthorized exemption deletes" ON "public"."billing_exemptions" 
  FOR DELETE USING ((select "auth"."role"()) = 'service_role'::text);

DROP POLICY IF EXISTS "org_admins_view_exemptions" ON "public"."billing_exemptions";
CREATE POLICY "org_admins_view_exemptions" ON "public"."billing_exemptions" 
  FOR SELECT USING ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

DROP POLICY IF EXISTS "secure_system_insert_exemptions" ON "public"."billing_exemptions";
CREATE POLICY "secure_system_insert_exemptions" ON "public"."billing_exemptions" 
  FOR INSERT WITH CHECK ((select "auth"."role"()) = 'service_role'::text);

DROP POLICY IF EXISTS "secure_system_update_exemptions" ON "public"."billing_exemptions";
CREATE POLICY "secure_system_update_exemptions" ON "public"."billing_exemptions" 
  FOR UPDATE USING ((select "auth"."role"()) = 'service_role'::text);

-- Billing Usage policies
DROP POLICY IF EXISTS "view_org_usage" ON "public"."billing_usage";
CREATE POLICY "view_org_usage" ON "public"."billing_usage" 
  FOR SELECT USING ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

-- Customer tables policies
DROP POLICY IF EXISTS "customer_contacts_admins_select" ON "public"."customer_contacts";
CREATE POLICY "customer_contacts_admins_select" ON "public"."customer_contacts" 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "public"."customers" "c"
      WHERE "c"."id" = "customer_contacts"."customer_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "c"."organization_id")
    )
  );

DROP POLICY IF EXISTS "customer_contacts_admins_insert" ON "public"."customer_contacts";
CREATE POLICY "customer_contacts_admins_insert" ON "public"."customer_contacts" 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."customers" "c"
      WHERE "c"."id" = "customer_contacts"."customer_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "c"."organization_id")
    )
  );

DROP POLICY IF EXISTS "customer_contacts_admins_update" ON "public"."customer_contacts";
CREATE POLICY "customer_contacts_admins_update" ON "public"."customer_contacts" 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "public"."customers" "c"
      WHERE "c"."id" = "customer_contacts"."customer_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "c"."organization_id")
    )
  );

DROP POLICY IF EXISTS "customer_sites_admins_select" ON "public"."customer_sites";
CREATE POLICY "customer_sites_admins_select" ON "public"."customer_sites" 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "public"."customers" "c"
      WHERE "c"."id" = "customer_sites"."customer_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "c"."organization_id")
    )
  );

DROP POLICY IF EXISTS "customer_sites_admins_insert" ON "public"."customer_sites";
CREATE POLICY "customer_sites_admins_insert" ON "public"."customer_sites" 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."customers" "c"
      WHERE "c"."id" = "customer_sites"."customer_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "c"."organization_id")
    )
  );

DROP POLICY IF EXISTS "customer_sites_admins_update" ON "public"."customer_sites";
CREATE POLICY "customer_sites_admins_update" ON "public"."customer_sites" 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "public"."customers" "c"
      WHERE "c"."id" = "customer_sites"."customer_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "c"."organization_id")
    )
  );

DROP POLICY IF EXISTS "customers_admins_select" ON "public"."customers";
CREATE POLICY "customers_admins_select" ON "public"."customers" 
  FOR SELECT USING ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

DROP POLICY IF EXISTS "customers_admins_insert" ON "public"."customers";
CREATE POLICY "customers_admins_insert" ON "public"."customers" 
  FOR INSERT WITH CHECK ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

DROP POLICY IF EXISTS "customers_admins_update" ON "public"."customers";
CREATE POLICY "customers_admins_update" ON "public"."customers" 
  FOR UPDATE USING ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

-- Equipment Working Hours History policies
DROP POLICY IF EXISTS "Admins can delete working hours history" ON "public"."equipment_working_hours_history";
CREATE POLICY "Admins can delete working hours history" ON "public"."equipment_working_hours_history" 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "public"."equipment" "e"
      WHERE "e"."id" = "equipment_working_hours_history"."equipment_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "e"."organization_id")
    )
  );

DROP POLICY IF EXISTS "Admins can update working hours history" ON "public"."equipment_working_hours_history";
CREATE POLICY "Admins can update working hours history" ON "public"."equipment_working_hours_history" 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "public"."equipment" "e"
      WHERE "e"."id" = "equipment_working_hours_history"."equipment_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "e"."organization_id")
    )
  );

DROP POLICY IF EXISTS "Users can create working hours history for accessible equipment" ON "public"."equipment_working_hours_history";
CREATE POLICY "Users can create working hours history for accessible equipment" ON "public"."equipment_working_hours_history" 
  FOR INSERT WITH CHECK (
    "updated_by" = (select "auth"."uid"()) 
    AND EXISTS (
      SELECT 1 FROM "public"."equipment" "e"
      WHERE "e"."id" = "equipment_working_hours_history"."equipment_id" 
      AND ("public"."is_org_admin"((select "auth"."uid"()), "e"."organization_id") 
           OR ("public"."is_org_member"((select "auth"."uid"()), "e"."organization_id") 
               AND "e"."team_id" IS NOT NULL 
               AND "e"."team_id" IN (
                 SELECT "tm"."team_id" FROM "public"."team_members" "tm"
                 WHERE "tm"."user_id" = (select "auth"."uid"())
               )
              )
          )
    )
  );

DROP POLICY IF EXISTS "Users can view working hours history for accessible equipment" ON "public"."equipment_working_hours_history";
CREATE POLICY "Users can view working hours history for accessible equipment" ON "public"."equipment_working_hours_history" 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "public"."equipment" "e"
      WHERE "e"."id" = "equipment_working_hours_history"."equipment_id" 
      AND ("public"."is_org_admin"((select "auth"."uid"()), "e"."organization_id") 
           OR ("public"."is_org_member"((select "auth"."uid"()), "e"."organization_id") 
               AND "e"."team_id" IS NOT NULL 
               AND "e"."team_id" IN (
                 SELECT "tm"."team_id" FROM "public"."team_members" "tm"
                 WHERE "tm"."user_id" = (select "auth"."uid"())
               )
              )
          )
    )
  );

-- Geocoded Locations policies
DROP POLICY IF EXISTS "geocoded_locations_select_org_members" ON "public"."geocoded_locations";
CREATE POLICY "geocoded_locations_select_org_members" ON "public"."geocoded_locations" 
  FOR SELECT USING ("public"."check_org_access_secure"((select "auth"."uid"()), "organization_id"));

DROP POLICY IF EXISTS "geocoded_locations_service_insert" ON "public"."geocoded_locations";
CREATE POLICY "geocoded_locations_service_insert" ON "public"."geocoded_locations" 
  FOR INSERT WITH CHECK ((select "auth"."role"()) = 'service_role'::text);

DROP POLICY IF EXISTS "geocoded_locations_service_update" ON "public"."geocoded_locations";
CREATE POLICY "geocoded_locations_service_update" ON "public"."geocoded_locations" 
  FOR UPDATE USING ((select "auth"."role"()) = 'service_role'::text);

-- Invitation Performance Logs policies
DROP POLICY IF EXISTS "service_role_only_performance_logs" ON "public"."invitation_performance_logs";
CREATE POLICY "service_role_only_performance_logs" ON "public"."invitation_performance_logs" 
  FOR ALL WITH CHECK ((select "auth"."role"()) = 'service_role'::text);

-- Member Removal Audit policies
DROP POLICY IF EXISTS "Org admins can view removal audit" ON "public"."member_removal_audit";
CREATE POLICY "Org admins can view removal audit" ON "public"."member_removal_audit" 
  FOR SELECT USING ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

-- Notes table policies (accesses organization through equipment)
DROP POLICY IF EXISTS "notes_select_organization_members" ON "public"."notes";
CREATE POLICY "notes_select_organization_members" ON "public"."notes" 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "public"."equipment" "e"
      WHERE "e"."id" = "notes"."equipment_id" 
      AND "public"."is_org_member"((select "auth"."uid"()), "e"."organization_id")
    )
  );

DROP POLICY IF EXISTS "notes_insert_organization_members" ON "public"."notes";
CREATE POLICY "notes_insert_organization_members" ON "public"."notes" 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."equipment" "e"
      WHERE "e"."id" = "notes"."equipment_id" 
      AND "public"."is_org_member"((select "auth"."uid"()), "e"."organization_id")
    )
  );

DROP POLICY IF EXISTS "notes_update_own" ON "public"."notes";
CREATE POLICY "notes_update_own" ON "public"."notes" 
  FOR UPDATE USING ("author_id" = (select "auth"."uid"()));

DROP POLICY IF EXISTS "notes_delete_own_or_admin" ON "public"."notes";
CREATE POLICY "notes_delete_own_or_admin" ON "public"."notes" 
  FOR DELETE USING (
    "author_id" = (select "auth"."uid"()) 
    OR EXISTS (
      SELECT 1 FROM "public"."equipment" "e"
      WHERE "e"."id" = "notes"."equipment_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "e"."organization_id")
    )
  );

-- Notification Preferences policies
DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON "public"."notification_preferences";
CREATE POLICY "Users can manage their own notification preferences" ON "public"."notification_preferences" 
  FOR ALL USING ("user_id" = (select "auth"."uid"()));

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON "public"."notifications";
CREATE POLICY "Users can view their own notifications" ON "public"."notifications" 
  FOR SELECT USING ("user_id" = (select "auth"."uid"()));

DROP POLICY IF EXISTS "Users can update their own notifications" ON "public"."notifications";
CREATE POLICY "Users can update their own notifications" ON "public"."notifications" 
  FOR UPDATE USING ("user_id" = (select "auth"."uid"()));

DROP POLICY IF EXISTS "service_role_only_create_notifications" ON "public"."notifications";
CREATE POLICY "service_role_only_create_notifications" ON "public"."notifications" 
  FOR INSERT WITH CHECK ((select "auth"."role"()) = 'service_role'::text);

-- Organization Invitations policies (remaining ones)
DROP POLICY IF EXISTS "users_create_invitations" ON "public"."organization_invitations";
CREATE POLICY "users_create_invitations" ON "public"."organization_invitations" 
  FOR INSERT WITH CHECK ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

DROP POLICY IF EXISTS "users_delete_own_invitations" ON "public"."organization_invitations";
CREATE POLICY "users_delete_own_invitations" ON "public"."organization_invitations" 
  FOR DELETE USING (
    -- Users can delete invitations sent to their email
    "email" = (select "auth"."email"())
  );

-- Organization Slots policies
DROP POLICY IF EXISTS "Restrict slots viewing to active org members" ON "public"."organization_slots";
CREATE POLICY "Restrict slots viewing to active org members" ON "public"."organization_slots" 
  FOR SELECT USING ("public"."is_org_member"((select "auth"."uid"()), "organization_id"));

DROP POLICY IF EXISTS "org_admins_manage_slots" ON "public"."organization_slots";
CREATE POLICY "org_admins_manage_slots" ON "public"."organization_slots" 
  FOR ALL USING ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

-- Organization Subscriptions policies
DROP POLICY IF EXISTS "view_org_subscriptions" ON "public"."organization_subscriptions";
CREATE POLICY "view_org_subscriptions" ON "public"."organization_subscriptions" 
  FOR SELECT USING ("public"."is_org_member"((select "auth"."uid"()), "organization_id"));

DROP POLICY IF EXISTS "admins_manage_subscriptions" ON "public"."organization_subscriptions";
CREATE POLICY "admins_manage_subscriptions" ON "public"."organization_subscriptions" 
  FOR ALL USING ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

-- PM Checklist Templates policies
DROP POLICY IF EXISTS "authenticated_can_read_global_templates" ON "public"."pm_checklist_templates";
CREATE POLICY "authenticated_can_read_global_templates" ON "public"."pm_checklist_templates" 
  FOR SELECT USING ("organization_id" IS NULL AND (select "auth"."uid"()) IS NOT NULL);

DROP POLICY IF EXISTS "deny delete protected" ON "public"."pm_checklist_templates";
CREATE POLICY "deny delete protected" ON "public"."pm_checklist_templates" 
  FOR DELETE USING ("is_protected" = false);

DROP POLICY IF EXISTS "manage org templates" ON "public"."pm_checklist_templates";
CREATE POLICY "manage org templates" ON "public"."pm_checklist_templates" 
  FOR ALL USING ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

DROP POLICY IF EXISTS "members_can_read_org_templates" ON "public"."pm_checklist_templates";
CREATE POLICY "members_can_read_org_templates" ON "public"."pm_checklist_templates" 
  FOR SELECT USING ("public"."is_org_member"((select "auth"."uid"()), "organization_id"));

-- PM Status History policies
DROP POLICY IF EXISTS "Admins can insert PM history" ON "public"."pm_status_history";
CREATE POLICY "Admins can insert PM history" ON "public"."pm_status_history" 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."preventative_maintenance" "pm"
      WHERE "pm"."id" = "pm_status_history"."pm_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "pm"."organization_id")
    ) 
    AND "changed_by" = (select "auth"."uid"())
  );

DROP POLICY IF EXISTS "Admins can insert PM status history" ON "public"."pm_status_history";
CREATE POLICY "Admins can insert PM status history" ON "public"."pm_status_history" 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."preventative_maintenance" "pm"
      WHERE "pm"."id" = "pm_status_history"."pm_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "pm"."organization_id")
    ) 
    AND "changed_by" = (select "auth"."uid"())
  );

DROP POLICY IF EXISTS "Users can view PM history for their organization" ON "public"."pm_status_history";
CREATE POLICY "Users can view PM history for their organization" ON "public"."pm_status_history" 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "public"."preventative_maintenance" "pm"
      WHERE "pm"."id" = "pm_status_history"."pm_id" 
      AND "public"."is_org_member"((select "auth"."uid"()), "pm"."organization_id")
    )
  );

DROP POLICY IF EXISTS "Users can view PM status history for their organization" ON "public"."pm_status_history";
CREATE POLICY "Users can view PM status history for their organization" ON "public"."pm_status_history" 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "public"."preventative_maintenance" "pm"
      WHERE "pm"."id" = "pm_status_history"."pm_id" 
      AND "public"."is_org_member"((select "auth"."uid"()), "pm"."organization_id")
    )
  );

-- Preventative Maintenance policies
DROP POLICY IF EXISTS "Admins can create historical PM" ON "public"."preventative_maintenance";
CREATE POLICY "Admins can create historical PM" ON "public"."preventative_maintenance" 
  FOR INSERT WITH CHECK (
    "is_historical" = true 
    AND "public"."is_org_admin"((select "auth"."uid"()), "organization_id")
  );

DROP POLICY IF EXISTS "Admins can update historical PM" ON "public"."preventative_maintenance";
CREATE POLICY "Admins can update historical PM" ON "public"."preventative_maintenance" 
  FOR UPDATE USING (
    "is_historical" = true 
    AND "public"."is_org_admin"((select "auth"."uid"()), "organization_id")
  );

DROP POLICY IF EXISTS "Users can create PM for their organization" ON "public"."preventative_maintenance";
CREATE POLICY "Users can create PM for their organization" ON "public"."preventative_maintenance" 
  FOR INSERT WITH CHECK ("public"."is_org_member"((select "auth"."uid"()), "organization_id"));

DROP POLICY IF EXISTS "Users can update PM for their organization" ON "public"."preventative_maintenance";
CREATE POLICY "Users can update PM for their organization" ON "public"."preventative_maintenance" 
  FOR UPDATE USING ("public"."is_org_member"((select "auth"."uid"()), "organization_id"));

DROP POLICY IF EXISTS "Users can view PM for their organization" ON "public"."preventative_maintenance";
CREATE POLICY "Users can view PM for their organization" ON "public"."preventative_maintenance" 
  FOR SELECT USING ("public"."is_org_member"((select "auth"."uid"()), "organization_id"));

-- Scans table policies (accesses organization through equipment)
DROP POLICY IF EXISTS "scans_select_organization_members" ON "public"."scans";
CREATE POLICY "scans_select_organization_members" ON "public"."scans" 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "public"."equipment" "e"
      WHERE "e"."id" = "scans"."equipment_id" 
      AND "public"."is_org_member"((select "auth"."uid"()), "e"."organization_id")
    )
  );

DROP POLICY IF EXISTS "scans_insert_organization_members" ON "public"."scans";
CREATE POLICY "scans_insert_organization_members" ON "public"."scans" 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."equipment" "e"
      WHERE "e"."id" = "scans"."equipment_id" 
      AND "public"."is_org_member"((select "auth"."uid"()), "e"."organization_id")
    )
  );

DROP POLICY IF EXISTS "scans_update_own" ON "public"."scans";
CREATE POLICY "scans_update_own" ON "public"."scans" 
  FOR UPDATE USING ("scanned_by" = (select "auth"."uid"()));

DROP POLICY IF EXISTS "scans_delete_admins" ON "public"."scans";
CREATE POLICY "scans_delete_admins" ON "public"."scans" 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "public"."equipment" "e"
      WHERE "e"."id" = "scans"."equipment_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "e"."organization_id")
    )
  );

-- Slot Purchases policies
DROP POLICY IF EXISTS "Restrict purchases viewing to active org members" ON "public"."slot_purchases";
CREATE POLICY "Restrict purchases viewing to active org members" ON "public"."slot_purchases" 
  FOR SELECT USING ("public"."is_org_member"((select "auth"."uid"()), "organization_id"));

DROP POLICY IF EXISTS "org_admins_manage_purchases" ON "public"."slot_purchases";
CREATE POLICY "org_admins_manage_purchases" ON "public"."slot_purchases" 
  FOR ALL USING ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

-- Stripe Event Logs policies
DROP POLICY IF EXISTS "service_role_manage_stripe_logs" ON "public"."stripe_event_logs";
CREATE POLICY "service_role_manage_stripe_logs" ON "public"."stripe_event_logs" 
  FOR ALL USING ((select "auth"."role"()) = 'service_role'::text);

-- Subscribers policies
DROP POLICY IF EXISTS "authenticated_users_own_data_only" ON "public"."subscribers";
CREATE POLICY "authenticated_users_own_data_only" ON "public"."subscribers" 
  FOR SELECT USING ("user_id" = (select "auth"."uid"()));

DROP POLICY IF EXISTS "authenticated_users_update_own_data" ON "public"."subscribers";
CREATE POLICY "authenticated_users_update_own_data" ON "public"."subscribers" 
  FOR UPDATE USING ("user_id" = (select "auth"."uid"()));

DROP POLICY IF EXISTS "edge_functions_manage_subscriptions" ON "public"."subscribers";
CREATE POLICY "edge_functions_manage_subscriptions" ON "public"."subscribers" 
  FOR ALL USING ((select "auth"."role"()) = 'service_role'::text);

-- Team Members policies
DROP POLICY IF EXISTS "admins_manage_team_members" ON "public"."team_members";
CREATE POLICY "admins_manage_team_members" ON "public"."team_members" 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "public"."teams" "t"
      WHERE "t"."id" = "team_members"."team_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "t"."organization_id")
    )
  );

DROP POLICY IF EXISTS "members_view_team_members" ON "public"."team_members";
CREATE POLICY "members_view_team_members" ON "public"."team_members" 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "public"."teams" "t"
      WHERE "t"."id" = "team_members"."team_id" 
      AND "public"."is_org_member"((select "auth"."uid"()), "t"."organization_id")
    )
  );

-- Teams policies
DROP POLICY IF EXISTS "admins_delete_teams" ON "public"."teams";
CREATE POLICY "admins_delete_teams" ON "public"."teams" 
  FOR DELETE USING ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

DROP POLICY IF EXISTS "admins_manage_teams" ON "public"."teams";
CREATE POLICY "admins_manage_teams" ON "public"."teams" 
  FOR ALL USING ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

DROP POLICY IF EXISTS "admins_update_teams" ON "public"."teams";
CREATE POLICY "admins_update_teams" ON "public"."teams" 
  FOR UPDATE USING ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

DROP POLICY IF EXISTS "members_view_teams" ON "public"."teams";
CREATE POLICY "members_view_teams" ON "public"."teams" 
  FOR SELECT USING ("public"."is_org_member"((select "auth"."uid"()), "organization_id"));

-- User License Subscriptions policies
DROP POLICY IF EXISTS "Restrict license subscription deletes" ON "public"."user_license_subscriptions";
CREATE POLICY "Restrict license subscription deletes" ON "public"."user_license_subscriptions" 
  FOR DELETE USING ((select "auth"."role"()) = 'service_role'::text);

DROP POLICY IF EXISTS "org_admins_manage_license_subs" ON "public"."user_license_subscriptions";
CREATE POLICY "org_admins_manage_license_subs" ON "public"."user_license_subscriptions" 
  FOR ALL USING ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

DROP POLICY IF EXISTS "org_members_view_license_subs" ON "public"."user_license_subscriptions";
CREATE POLICY "org_members_view_license_subs" ON "public"."user_license_subscriptions" 
  FOR SELECT USING ("public"."is_org_member"((select "auth"."uid"()), "organization_id"));

-- Webhook Events policies
DROP POLICY IF EXISTS "service_role_delete_webhook_events" ON "public"."webhook_events";
CREATE POLICY "service_role_delete_webhook_events" ON "public"."webhook_events" 
  FOR DELETE USING ((select "auth"."role"()) = 'service_role'::text);

DROP POLICY IF EXISTS "service_role_insert_webhook_events" ON "public"."webhook_events";
CREATE POLICY "service_role_insert_webhook_events" ON "public"."webhook_events" 
  FOR INSERT WITH CHECK ((select "auth"."role"()) = 'service_role'::text);

DROP POLICY IF EXISTS "service_role_select_webhook_events" ON "public"."webhook_events";
CREATE POLICY "service_role_select_webhook_events" ON "public"."webhook_events" 
  FOR SELECT USING ((select "auth"."role"()) = 'service_role'::text);

DROP POLICY IF EXISTS "service_role_update_webhook_events" ON "public"."webhook_events";
CREATE POLICY "service_role_update_webhook_events" ON "public"."webhook_events" 
  FOR UPDATE USING ((select "auth"."role"()) = 'service_role'::text);

-- Work Order Costs policies (accesses organization through work_order)
DROP POLICY IF EXISTS "admins_manage_all_costs" ON "public"."work_order_costs";
CREATE POLICY "admins_manage_all_costs" ON "public"."work_order_costs" 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "public"."work_orders" "wo"
      WHERE "wo"."id" = "work_order_costs"."work_order_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "wo"."organization_id")
    )
  );

DROP POLICY IF EXISTS "members_view_costs" ON "public"."work_order_costs";
CREATE POLICY "members_view_costs" ON "public"."work_order_costs" 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "public"."work_orders" "wo"
      WHERE "wo"."id" = "work_order_costs"."work_order_id" 
      AND "public"."is_org_member"((select "auth"."uid"()), "wo"."organization_id")
    )
  );

DROP POLICY IF EXISTS "users_manage_own_costs" ON "public"."work_order_costs";
CREATE POLICY "users_manage_own_costs" ON "public"."work_order_costs" 
  FOR ALL USING ("created_by" = (select "auth"."uid"()));

-- Work Order Images policies
DROP POLICY IF EXISTS "Users can delete their own work order images" ON "public"."work_order_images";
CREATE POLICY "Users can delete their own work order images" ON "public"."work_order_images" 
  FOR DELETE USING ("uploaded_by" = (select "auth"."uid"()));

DROP POLICY IF EXISTS "Users can upload work order images" ON "public"."work_order_images";
CREATE POLICY "Users can upload work order images" ON "public"."work_order_images" 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."work_orders" "wo"
      WHERE "wo"."id" = "work_order_images"."work_order_id" 
      AND "public"."is_org_member"((select "auth"."uid"()), "wo"."organization_id")
    )
  );

DROP POLICY IF EXISTS "Users can view work order images" ON "public"."work_order_images";
CREATE POLICY "Users can view work order images" ON "public"."work_order_images" 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "public"."work_orders" "wo"
      WHERE "wo"."id" = "work_order_images"."work_order_id" 
      AND "public"."is_org_member"((select "auth"."uid"()), "wo"."organization_id")
    )
  );

-- Work Order Notes policies
DROP POLICY IF EXISTS "work_order_notes_delete_own" ON "public"."work_order_notes";
CREATE POLICY "work_order_notes_delete_own" ON "public"."work_order_notes" 
  FOR DELETE USING ("author_id" = (select "auth"."uid"()));

DROP POLICY IF EXISTS "work_order_notes_insert_organization_members" ON "public"."work_order_notes";
CREATE POLICY "work_order_notes_insert_organization_members" ON "public"."work_order_notes" 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."work_orders" "wo"
      WHERE "wo"."id" = "work_order_notes"."work_order_id" 
      AND "public"."is_org_member"((select "auth"."uid"()), "wo"."organization_id")
    )
  );

DROP POLICY IF EXISTS "work_order_notes_select_organization_members" ON "public"."work_order_notes";
CREATE POLICY "work_order_notes_select_organization_members" ON "public"."work_order_notes" 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "public"."work_orders" "wo"
      WHERE "wo"."id" = "work_order_notes"."work_order_id" 
      AND "public"."is_org_member"((select "auth"."uid"()), "wo"."organization_id")
    )
  );

DROP POLICY IF EXISTS "work_order_notes_update_own" ON "public"."work_order_notes";
CREATE POLICY "work_order_notes_update_own" ON "public"."work_order_notes" 
  FOR UPDATE USING ("author_id" = (select "auth"."uid"()));

-- Work Order Status History policies
DROP POLICY IF EXISTS "Admins can insert work order history" ON "public"."work_order_status_history";
CREATE POLICY "Admins can insert work order history" ON "public"."work_order_status_history" 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."work_orders" "wo"
      WHERE "wo"."id" = "work_order_status_history"."work_order_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "wo"."organization_id")
    ) 
    AND "changed_by" = (select "auth"."uid"())
  );

DROP POLICY IF EXISTS "Users can view work order history for their organization" ON "public"."work_order_status_history";
CREATE POLICY "Users can view work order history for their organization" ON "public"."work_order_status_history" 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "public"."work_orders" "wo"
      WHERE "wo"."id" = "work_order_status_history"."work_order_id" 
      AND "public"."is_org_member"((select "auth"."uid"()), "wo"."organization_id")
    )
  );

-- Notification Settings policies (only if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification_settings') THEN
    EXECUTE 'DROP POLICY IF EXISTS "notification_settings_user_policy" ON "public"."notification_settings"';
    EXECUTE 'CREATE POLICY "notification_settings_user_policy" ON "public"."notification_settings" FOR ALL USING ("user_id" = (select "auth"."uid"()))';
  END IF;
END $$;

-- =============================================================================
-- PART 2: Consolidate Remaining Multiple Permissive Policies
-- =============================================================================

-- Equipment table: Consolidate overlapping policies
DROP POLICY IF EXISTS "admins_delete_equipment" ON "public"."equipment";
DROP POLICY IF EXISTS "admins_manage_equipment" ON "public"."equipment";
CREATE POLICY "equipment_admin_access" ON "public"."equipment" 
  FOR ALL USING ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

DROP POLICY IF EXISTS "team_members_view_equipment" ON "public"."equipment";
DROP POLICY IF EXISTS "team_members_create_equipment" ON "public"."equipment";
CREATE POLICY "equipment_member_access" ON "public"."equipment" 
  FOR ALL USING ("public"."is_org_member"((select "auth"."uid"()), "organization_id"));

-- Organization Slots: Consolidate overlapping SELECT policies
DROP POLICY IF EXISTS "Restrict slots viewing to active org members" ON "public"."organization_slots";
DROP POLICY IF EXISTS "org_admins_manage_slots" ON "public"."organization_slots";
CREATE POLICY "organization_slots_access" ON "public"."organization_slots" 
  FOR ALL USING ("public"."is_org_member"((select "auth"."uid"()), "organization_id"));

-- Organization Subscriptions: Consolidate overlapping SELECT policies
DROP POLICY IF EXISTS "admins_manage_subscriptions" ON "public"."organization_subscriptions";
DROP POLICY IF EXISTS "view_org_subscriptions" ON "public"."organization_subscriptions";
CREATE POLICY "organization_subscriptions_select" ON "public"."organization_subscriptions" 
  FOR SELECT USING ("public"."is_org_member"((select "auth"."uid"()), "organization_id"));

CREATE POLICY "organization_subscriptions_admin_insert" ON "public"."organization_subscriptions" 
  FOR INSERT WITH CHECK ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

CREATE POLICY "organization_subscriptions_admin_update" ON "public"."organization_subscriptions" 
  FOR UPDATE USING ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

CREATE POLICY "organization_subscriptions_admin_delete" ON "public"."organization_subscriptions" 
  FOR DELETE USING ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

-- Organizations: Consolidate overlapping SELECT policies
DROP POLICY IF EXISTS "invited_users_can_view_org_details" ON "public"."organizations";
DROP POLICY IF EXISTS "orgs_members_can_view" ON "public"."organizations";
DROP POLICY IF EXISTS "orgs_select_members" ON "public"."organizations";
CREATE POLICY "organizations_select" ON "public"."organizations" 
  FOR SELECT USING (
    -- Members can view their org
    "public"."is_org_member"((select "auth"."uid"()), "id")
    OR
    -- Invited users can view org details
    EXISTS (
      SELECT 1 FROM "public"."organization_invitations" 
      WHERE "organization_id" = "organizations"."id" 
      AND "email" = (select "auth"."email"()) 
      AND "status" = 'pending'
    )
  );

-- PM Checklist Templates: Consolidate overlapping policies
DROP POLICY IF EXISTS "deny delete protected" ON "public"."pm_checklist_templates";
DROP POLICY IF EXISTS "manage org templates" ON "public"."pm_checklist_templates";
CREATE POLICY "pm_templates_admin_manage" ON "public"."pm_checklist_templates" 
  FOR ALL USING (
    "public"."is_org_admin"((select "auth"."uid"()), "organization_id")
    AND ("is_protected" = false OR "organization_id" IS NOT NULL)
  );

DROP POLICY IF EXISTS "authenticated_can_read_global_templates" ON "public"."pm_checklist_templates";
DROP POLICY IF EXISTS "members_can_read_org_templates" ON "public"."pm_checklist_templates";
CREATE POLICY "pm_templates_read_access" ON "public"."pm_checklist_templates" 
  FOR SELECT USING (
    -- Global templates for authenticated users
    ("organization_id" IS NULL AND (select "auth"."uid"()) IS NOT NULL)
    OR
    -- Org templates for members
    "public"."is_org_member"((select "auth"."uid"()), "organization_id")
  );

-- PM Status History: Consolidate duplicate INSERT policies
DROP POLICY IF EXISTS "Admins can insert PM history" ON "public"."pm_status_history";
DROP POLICY IF EXISTS "Admins can insert PM status history" ON "public"."pm_status_history";
CREATE POLICY "pm_status_history_admin_insert" ON "public"."pm_status_history" 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."preventative_maintenance" "pm"
      WHERE "pm"."id" = "pm_status_history"."pm_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "pm"."organization_id")
    ) 
    AND "changed_by" = (select "auth"."uid"())
  );

-- PM Status History: Consolidate duplicate SELECT policies
DROP POLICY IF EXISTS "Users can view PM history for their organization" ON "public"."pm_status_history";
DROP POLICY IF EXISTS "Users can view PM status history for their organization" ON "public"."pm_status_history";
CREATE POLICY "pm_status_history_member_select" ON "public"."pm_status_history" 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "public"."preventative_maintenance" "pm"
      WHERE "pm"."id" = "pm_status_history"."pm_id" 
      AND "public"."is_org_member"((select "auth"."uid"()), "pm"."organization_id")
    )
  );

-- Preventative Maintenance: Consolidate overlapping INSERT policies
DROP POLICY IF EXISTS "Admins can create historical PM" ON "public"."preventative_maintenance";
DROP POLICY IF EXISTS "Users can create PM for their organization" ON "public"."preventative_maintenance";
CREATE POLICY "preventative_maintenance_insert" ON "public"."preventative_maintenance" 
  FOR INSERT WITH CHECK (
    -- Admins can create historical PM
    (
      "is_historical" = true 
      AND "public"."is_org_admin"((select "auth"."uid"()), "organization_id")
    )
    OR
    -- Members can create regular PM
    (
      ("is_historical" = false OR "is_historical" IS NULL)
      AND "public"."is_org_member"((select "auth"."uid"()), "organization_id")
    )
  );

-- Preventative Maintenance: Consolidate overlapping UPDATE policies
DROP POLICY IF EXISTS "Admins can update historical PM" ON "public"."preventative_maintenance";
DROP POLICY IF EXISTS "Users can update PM for their organization" ON "public"."preventative_maintenance";
CREATE POLICY "preventative_maintenance_update" ON "public"."preventative_maintenance" 
  FOR UPDATE USING (
    -- Admins can update historical PM
    (
      "is_historical" = true 
      AND "public"."is_org_admin"((select "auth"."uid"()), "organization_id")
    )
    OR
    -- Members can update regular PM
    (
      ("is_historical" = false OR "is_historical" IS NULL)
      AND "public"."is_org_member"((select "auth"."uid"()), "organization_id")
    )
  );

-- Profiles: Consolidate overlapping SELECT policies
DROP POLICY IF EXISTS "org_members_view_member_profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "users_view_own_profile" ON "public"."profiles";
CREATE POLICY "profiles_select" ON "public"."profiles" 
  FOR SELECT USING (
    -- Users can view their own profile
    "id" = (select "auth"."uid"())
    OR
    -- Org members can view other member profiles
    EXISTS (
      SELECT 1 FROM "public"."organization_members" "om1"
      JOIN "public"."organization_members" "om2" ON "om1"."organization_id" = "om2"."organization_id"
      WHERE "om1"."user_id" = (select "auth"."uid"()) 
      AND "om2"."user_id" = "profiles"."id"
      AND "om1"."status" = 'active' 
      AND "om2"."status" = 'active'
    )
  );

-- Slot Purchases: Consolidate overlapping SELECT policies
DROP POLICY IF EXISTS "Restrict purchases viewing to active org members" ON "public"."slot_purchases";
DROP POLICY IF EXISTS "org_admins_manage_purchases" ON "public"."slot_purchases";
CREATE POLICY "slot_purchases_select" ON "public"."slot_purchases" 
  FOR SELECT USING ("public"."is_org_member"((select "auth"."uid"()), "organization_id"));

CREATE POLICY "slot_purchases_admin_insert" ON "public"."slot_purchases" 
  FOR INSERT WITH CHECK ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

CREATE POLICY "slot_purchases_admin_update" ON "public"."slot_purchases" 
  FOR UPDATE USING ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

CREATE POLICY "slot_purchases_admin_delete" ON "public"."slot_purchases" 
  FOR DELETE USING ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

-- Stripe Event Logs: Consolidate all service role policies
DROP POLICY IF EXISTS "deny_user_access_stripe_logs" ON "public"."stripe_event_logs";
DROP POLICY IF EXISTS "service_role_manage_stripe_logs" ON "public"."stripe_event_logs";
CREATE POLICY "stripe_event_logs_service_only" ON "public"."stripe_event_logs" 
  FOR ALL USING ((select "auth"."role"()) = 'service_role'::text);

-- Subscribers: Consolidate overlapping policies
DROP POLICY IF EXISTS "authenticated_users_own_data_only" ON "public"."subscribers";
DROP POLICY IF EXISTS "edge_functions_manage_subscriptions" ON "public"."subscribers";
CREATE POLICY "subscribers_select" ON "public"."subscribers" 
  FOR SELECT USING (
    "user_id" = (select "auth"."uid"()) 
    OR (select "auth"."role"()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "authenticated_users_update_own_data" ON "public"."subscribers";
CREATE POLICY "subscribers_update" ON "public"."subscribers" 
  FOR UPDATE USING (
    "user_id" = (select "auth"."uid"()) 
    OR (select "auth"."role"()) = 'service_role'::text
  );

CREATE POLICY "subscribers_insert" ON "public"."subscribers" 
  FOR INSERT WITH CHECK ((select "auth"."role"()) = 'service_role'::text);

CREATE POLICY "subscribers_delete" ON "public"."subscribers" 
  FOR DELETE USING ((select "auth"."role"()) = 'service_role'::text);

-- Team Members: Consolidate overlapping SELECT policies
DROP POLICY IF EXISTS "admins_manage_team_members" ON "public"."team_members";
DROP POLICY IF EXISTS "members_view_team_members" ON "public"."team_members";
CREATE POLICY "team_members_select" ON "public"."team_members" 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "public"."teams" "t"
      WHERE "t"."id" = "team_members"."team_id" 
      AND "public"."is_org_member"((select "auth"."uid"()), "t"."organization_id")
    )
  );

CREATE POLICY "team_members_admin_insert" ON "public"."team_members" 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."teams" "t"
      WHERE "t"."id" = "team_members"."team_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "t"."organization_id")
    )
  );

CREATE POLICY "team_members_admin_update" ON "public"."team_members" 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "public"."teams" "t"
      WHERE "t"."id" = "team_members"."team_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "t"."organization_id")
    )
  );

CREATE POLICY "team_members_admin_delete" ON "public"."team_members" 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "public"."teams" "t"
      WHERE "t"."id" = "team_members"."team_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "t"."organization_id")
    )
  );

-- User License Subscriptions: Consolidate overlapping policies
DROP POLICY IF EXISTS "Restrict license subscription deletes" ON "public"."user_license_subscriptions";
DROP POLICY IF EXISTS "org_admins_manage_license_subs" ON "public"."user_license_subscriptions";
CREATE POLICY "user_license_subscriptions_admin_manage" ON "public"."user_license_subscriptions" 
  FOR ALL USING ("public"."is_org_admin"((select "auth"."uid"()), "organization_id"));

DROP POLICY IF EXISTS "org_members_view_license_subs" ON "public"."user_license_subscriptions";
CREATE POLICY "user_license_subscriptions_member_select" ON "public"."user_license_subscriptions" 
  FOR SELECT USING ("public"."is_org_member"((select "auth"."uid"()), "organization_id"));

-- Work Order Costs: Consolidate overlapping policies (accesses org through work_order)
DROP POLICY IF EXISTS "admins_manage_all_costs" ON "public"."work_order_costs";
DROP POLICY IF EXISTS "members_view_costs" ON "public"."work_order_costs";
DROP POLICY IF EXISTS "users_manage_own_costs" ON "public"."work_order_costs";

CREATE POLICY "work_order_costs_select" ON "public"."work_order_costs" 
  FOR SELECT USING (
    -- Members can view costs in their org
    EXISTS (
      SELECT 1 FROM "public"."work_orders" "wo"
      WHERE "wo"."id" = "work_order_costs"."work_order_id" 
      AND "public"."is_org_member"((select "auth"."uid"()), "wo"."organization_id")
    )
    OR
    -- Users can view their own costs
    "created_by" = (select "auth"."uid"())
  );

CREATE POLICY "work_order_costs_insert" ON "public"."work_order_costs" 
  FOR INSERT WITH CHECK (
    -- Admins can manage all costs
    EXISTS (
      SELECT 1 FROM "public"."work_orders" "wo"
      WHERE "wo"."id" = "work_order_costs"."work_order_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "wo"."organization_id")
    )
    OR
    -- Users can manage their own costs
    "created_by" = (select "auth"."uid"())
  );

CREATE POLICY "work_order_costs_update" ON "public"."work_order_costs" 
  FOR UPDATE USING (
    -- Admins can manage all costs
    EXISTS (
      SELECT 1 FROM "public"."work_orders" "wo"
      WHERE "wo"."id" = "work_order_costs"."work_order_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "wo"."organization_id")
    )
    OR
    -- Users can manage their own costs
    "created_by" = (select "auth"."uid"())
  );

CREATE POLICY "work_order_costs_delete" ON "public"."work_order_costs" 
  FOR DELETE USING (
    -- Admins can delete all costs
    EXISTS (
      SELECT 1 FROM "public"."work_orders" "wo"
      WHERE "wo"."id" = "work_order_costs"."work_order_id" 
      AND "public"."is_org_admin"((select "auth"."uid"()), "wo"."organization_id")
    )
    OR
    -- Users can delete their own costs
    "created_by" = (select "auth"."uid"())
  );

-- =============================================================================
-- PART 3: Add Performance Comments for New Policies
-- =============================================================================

COMMENT ON POLICY "equipment_admin_access" ON "public"."equipment" 
IS 'Consolidated admin policy for all equipment operations. Uses cached auth.uid() for performance.';

COMMENT ON POLICY "equipment_member_access" ON "public"."equipment" 
IS 'Consolidated member policy for equipment access. Uses cached auth.uid() for performance.';

COMMENT ON POLICY "pm_templates_admin_manage" ON "public"."pm_checklist_templates" 
IS 'Consolidated admin management policy with protected template checks. Uses cached auth.uid() for performance.';

COMMENT ON POLICY "pm_templates_read_access" ON "public"."pm_checklist_templates" 
IS 'Consolidated read access for global and org templates. Uses cached auth.uid() for performance.';

COMMENT ON POLICY "work_order_costs_select" ON "public"."work_order_costs" 
IS 'Consolidated select policy: members view org costs, users view own costs. Uses cached auth.uid() for performance.';

COMMENT ON POLICY "stripe_event_logs_service_only" ON "public"."stripe_event_logs" 
IS 'Consolidated service role only policy for all stripe log operations. Uses cached auth.role() for performance.';

-- =============================================================================
-- PART 4: Refresh Statistics
-- =============================================================================

-- Update table statistics for better query planning
ANALYZE "public"."billing_events";
ANALYZE "public"."billing_exemptions";
ANALYZE "public"."billing_usage";
ANALYZE "public"."customer_contacts";
ANALYZE "public"."customer_sites";
ANALYZE "public"."customers";
ANALYZE "public"."equipment_working_hours_history";
ANALYZE "public"."geocoded_locations";
ANALYZE "public"."invitation_performance_logs";
ANALYZE "public"."member_removal_audit";
ANALYZE "public"."notes";
ANALYZE "public"."notification_preferences";
ANALYZE "public"."notifications";
ANALYZE "public"."organization_slots";
ANALYZE "public"."organization_subscriptions";
ANALYZE "public"."pm_checklist_templates";
ANALYZE "public"."pm_status_history";
ANALYZE "public"."preventative_maintenance";
ANALYZE "public"."scans";
ANALYZE "public"."slot_purchases";
ANALYZE "public"."stripe_event_logs";
ANALYZE "public"."subscribers";
ANALYZE "public"."team_members";
ANALYZE "public"."teams";
ANALYZE "public"."user_license_subscriptions";
ANALYZE "public"."webhook_events";
ANALYZE "public"."work_order_costs";
ANALYZE "public"."work_order_images";
ANALYZE "public"."work_order_notes";
ANALYZE "public"."work_order_status_history";
-- ANALYZE "public"."notification_settings"; -- Table may not exist in all environments

COMMIT;
