-- EquipQR RLS reference baseline (read-only documentation artifact)
-- Source: production Supabase project ymxkzronkhwxzcdcbnwq
-- Generated (UTC): 2026-06-02T13:25:49Z
-- Regenerate: .\scripts\export-schema-baseline.ps1
-- Do NOT apply this file directly; use supabase/migrations for changes.

-- =============================================================================
-- TABLE RLS POSTURE (public, storage, auth)
-- =============================================================================

-- schema_name | table_name | rls_enabled | rls_forced
-- auth | audit_log_entries | true | false
-- auth | custom_oauth_providers | false | false
-- auth | flow_state | true | false
-- auth | identities | true | false
-- auth | instances | true | false
-- auth | mfa_amr_claims | true | false
-- auth | mfa_challenges | true | false
-- auth | mfa_factors | true | false
-- auth | oauth_authorizations | false | false
-- auth | oauth_client_states | false | false
-- auth | oauth_clients | false | false
-- auth | oauth_consents | false | false
-- auth | one_time_tokens | true | false
-- auth | refresh_tokens | true | false
-- auth | saml_providers | true | false
-- auth | saml_relay_states | true | false
-- auth | schema_migrations | true | false
-- auth | sessions | true | false
-- auth | sso_domains | true | false
-- auth | sso_providers | true | false
-- auth | users | true | false
-- auth | webauthn_challenges | false | false
-- auth | webauthn_credentials | false | false
-- public | audit_log | true | false
-- public | customer_contacts | true | false
-- public | customer_sites | true | false
-- public | customers | true | false
-- public | dsr_request_events | true | false
-- public | dsr_requests | true | false
-- public | equipment | true | false
-- public | equipment_location_history | true | false
-- public | equipment_note_images | true | false
-- public | equipment_notes | true | false
-- public | equipment_part_compatibility | true | false
-- public | equipment_status_history | true | false
-- public | equipment_working_hours_history | true | false
-- public | export_request_log | true | false
-- public | external_customer_contacts | true | false
-- public | geocoded_locations | true | false
-- public | google_workspace_credentials | true | false
-- public | google_workspace_directory_users | true | false
-- public | google_workspace_oauth_sessions | true | false
-- public | inventory_item_images | true | false
-- public | inventory_items | true | false
-- public | inventory_transactions | true | false
-- public | invitation_performance_logs | true | false
-- public | member_removal_audit | true | false
-- public | notes | true | false
-- public | notification_preferences | true | false
-- public | notification_settings | true | false
-- public | notifications | true | false
-- public | organization_google_export_destinations | true | false
-- public | organization_invitations | true | false
-- public | organization_member_claims | true | false
-- public | organization_members | true | false
-- public | organization_role_grants_pending | true | false
-- public | organizations | true | false
-- public | ownership_transfer_requests | true | false
-- public | part_alternate_group_members | true | false
-- public | part_alternate_groups | true | false
-- public | part_compatibility_rules | true | false
-- public | part_identifiers | true | false
-- public | parts_managers | true | false
-- public | personal_organizations | true | false
-- public | pm_checklist_templates | true | false
-- public | pm_status_history | true | false
-- public | pm_template_compatibility_rules | true | false
-- public | preventative_maintenance | true | false
-- public | profiles | true | false
-- public | push_subscriptions | true | false
-- public | quickbooks_credentials | true | false
-- public | quickbooks_export_logs | true | false
-- public | quickbooks_invoice_status_events | true | false
-- public | quickbooks_oauth_sessions | true | false
-- public | quickbooks_team_customers | true | false
-- public | record_export_artifacts | true | false
-- public | scan_follow_up_events | true | false
-- public | scans | true | false
-- public | team_members | true | false
-- public | teams | true | false
-- public | terms_acceptances | true | false
-- public | ticket_comments | true | false
-- public | tickets | true | false
-- public | user_dashboard_preferences | true | false
-- public | user_departure_queue | true | false
-- public | webhook_events | true | false
-- public | work_order_costs | true | false
-- public | work_order_equipment | true | false
-- public | work_order_images | true | false
-- public | work_order_notes | true | false
-- public | work_order_status_history | true | false
-- public | work_orders | true | false
-- public | workspace_domains | true | false
-- public | workspace_personal_org_merge_requests | true | false
-- storage | buckets | true | false
-- storage | buckets_analytics | true | false
-- storage | buckets_vectors | true | false
-- storage | migrations | true | false
-- storage | objects | true | false
-- storage | s3_multipart_uploads | true | false
-- storage | s3_multipart_uploads_parts | true | false
-- storage | vector_indexes | true | false

-- =============================================================================
-- POLICIES (public, storage, auth)
-- =============================================================================

-- [public.audit_log] System can insert audit logs (INSERT) roles=[{authenticated}] PERMISSIVE
-- WITH CHECK:
--   false

-- [public.audit_log] Users can view audit logs for their organizations (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   (organization_id IN ( SELECT om.organization_id
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text))))

-- [public.customer_contacts] customer_contacts_admins_insert (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (EXISTS ( SELECT 1
--      FROM customers c
--     WHERE ((c.id = customer_contacts.customer_id) AND is_org_admin(( SELECT auth.uid() AS uid), c.organization_id))))

-- [public.customer_contacts] customer_contacts_admins_select (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM customers c
--     WHERE ((c.id = customer_contacts.customer_id) AND is_org_admin(( SELECT auth.uid() AS uid), c.organization_id))))

-- [public.customer_contacts] customer_contacts_admins_update (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM customers c
--     WHERE ((c.id = customer_contacts.customer_id) AND is_org_admin(( SELECT auth.uid() AS uid), c.organization_id))))

-- [public.customer_sites] customer_sites_admins_insert (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (EXISTS ( SELECT 1
--      FROM customers c
--     WHERE ((c.id = customer_sites.customer_id) AND is_org_admin(( SELECT auth.uid() AS uid), c.organization_id))))

-- [public.customer_sites] customer_sites_admins_select (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM customers c
--     WHERE ((c.id = customer_sites.customer_id) AND is_org_admin(( SELECT auth.uid() AS uid), c.organization_id))))

-- [public.customer_sites] customer_sites_admins_update (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM customers c
--     WHERE ((c.id = customer_sites.customer_id) AND is_org_admin(( SELECT auth.uid() AS uid), c.organization_id))))

-- [public.customers] customers_admins_insert (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   is_org_admin(( SELECT auth.uid() AS uid), organization_id)

-- [public.customers] customers_admins_update (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   is_org_admin(( SELECT auth.uid() AS uid), organization_id)

-- [public.customers] customers_members_select (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   is_org_member(( SELECT auth.uid() AS uid), organization_id)

-- [public.dsr_request_events] dsr_request_events_select (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((dsr_request_id IN ( SELECT dsr_requests.id
--      FROM dsr_requests
--     WHERE (dsr_requests.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
--      FROM (dsr_requests dr
--        JOIN organization_members om ON ((om.organization_id = dr.organization_id)))
--     WHERE ((dr.id = dsr_request_events.dsr_request_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))))

-- [public.dsr_request_events] service_role_manage_dsr_events (ALL) roles=[{service_role}] PERMISSIVE
-- USING:
--   true
-- WITH CHECK:
--   true

-- [public.dsr_requests] dsr_requests_select (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((user_id = ( SELECT auth.uid() AS uid)) OR ((organization_id IS NOT NULL) AND (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.organization_id = dsr_requests.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])))))))

-- [public.dsr_requests] service_role_manage_dsr_requests (ALL) roles=[{service_role}] PERMISSIVE
-- USING:
--   true
-- WITH CHECK:
--   true

-- [public.equipment] equipment_access_consolidated (ALL) roles=[{public}] PERMISSIVE
-- USING:
--   (is_org_admin(( SELECT auth.uid() AS uid), organization_id) OR is_org_member(( SELECT auth.uid() AS uid), organization_id))

-- [public.equipment] equipment_admin_access (ALL) roles=[{public}] PERMISSIVE
-- USING:
--   is_org_admin(( SELECT auth.uid() AS uid), organization_id)

-- [public.equipment] equipment_member_select (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   is_org_member(( SELECT auth.uid() AS uid), organization_id)

-- [public.equipment] equipment_member_update (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   is_org_member(( SELECT auth.uid() AS uid), organization_id)

-- [public.equipment] equipment_team_manager_delete (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM team_members tm
--     WHERE ((tm.user_id = ( SELECT auth.uid() AS uid)) AND (tm.team_id = equipment.team_id) AND (tm.role = 'manager'::team_member_role))))

-- [public.equipment] team_members_create_equipment (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (is_org_admin(( SELECT auth.uid() AS uid), organization_id) OR (is_org_member(( SELECT auth.uid() AS uid), organization_id) AND (team_id IS NOT NULL) AND (EXISTS ( SELECT 1
--      FROM team_members tm
--     WHERE ((tm.user_id = ( SELECT auth.uid() AS uid)) AND (tm.team_id = equipment.team_id) AND (tm.role = ANY (ARRAY['manager'::team_member_role, 'technician'::team_member_role])))))))

-- [public.equipment_location_history] equipment_location_history_select (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM (equipment e
--        JOIN organization_members om ON ((om.organization_id = e.organization_id)))
--     WHERE ((e.id = equipment_location_history.equipment_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text))))

-- [public.equipment_location_history] equipment_location_history_service_insert (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   false

-- [public.equipment_note_images] equipment_note_images_delete (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   ((uploaded_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
--      FROM (equipment_notes en
--        JOIN equipment e ON ((e.id = en.equipment_id)))
--     WHERE ((en.id = equipment_note_images.equipment_note_id) AND is_org_admin(( SELECT auth.uid() AS uid), e.organization_id)))))

-- [public.equipment_note_images] equipment_note_images_insert (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (EXISTS ( SELECT 1
--      FROM (equipment_notes en
--        JOIN equipment e ON ((e.id = en.equipment_id)))
--     WHERE ((en.id = equipment_note_images.equipment_note_id) AND is_org_member(( SELECT auth.uid() AS uid), e.organization_id))))

-- [public.equipment_note_images] equipment_note_images_select (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM (equipment_notes en
--        JOIN equipment e ON ((e.id = en.equipment_id)))
--     WHERE ((en.id = equipment_note_images.equipment_note_id) AND is_org_member(( SELECT auth.uid() AS uid), e.organization_id))))

-- [public.equipment_note_images] Users can upload images to their notes (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (EXISTS ( SELECT 1
--      FROM (equipment_notes en
--        JOIN equipment e ON ((e.id = en.equipment_id)))
--     WHERE ((en.id = equipment_note_images.equipment_note_id) AND is_org_member(( SELECT auth.uid() AS uid), e.organization_id))))

-- [public.equipment_note_images] Users can view images for accessible notes (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM (equipment_notes en
--        JOIN equipment e ON ((e.id = en.equipment_id)))
--     WHERE ((en.id = equipment_note_images.equipment_note_id) AND is_org_member(( SELECT auth.uid() AS uid), e.organization_id))))

-- [public.equipment_notes] equipment_notes_delete (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   ((EXISTS ( SELECT 1
--      FROM equipment e
--     WHERE ((e.id = equipment_notes.equipment_id) AND is_org_admin(( SELECT auth.uid() AS uid), e.organization_id)))) OR (author_id = ( SELECT auth.uid() AS uid)))

-- [public.equipment_notes] equipment_notes_insert (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (EXISTS ( SELECT 1
--      FROM equipment e
--     WHERE ((e.id = equipment_notes.equipment_id) AND is_org_member(( SELECT auth.uid() AS uid), e.organization_id))))

-- [public.equipment_notes] equipment_notes_select (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   ((EXISTS ( SELECT 1
--      FROM equipment e
--     WHERE ((e.id = equipment_notes.equipment_id) AND is_org_member(( SELECT auth.uid() AS uid), e.organization_id)))) OR (author_id = ( SELECT auth.uid() AS uid)))

-- [public.equipment_notes] equipment_notes_update (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   (author_id = ( SELECT auth.uid() AS uid))

-- [public.equipment_part_compatibility] equipment_part_compatibility_organization_isolation (ALL) roles=[{public}] PERMISSIVE
-- USING:
--   (equipment_id IN ( SELECT e.id
--      FROM (equipment e
--        JOIN organization_members om ON ((e.organization_id = om.organization_id)))
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text))))

-- [public.equipment_status_history] esh_select_org_member (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM equipment e
--     WHERE ((e.id = equipment_status_history.equipment_id) AND is_org_member(auth.uid(), e.organization_id))))

-- [public.equipment_working_hours_history] Admins can delete working hours history (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM equipment e
--     WHERE ((e.id = equipment_working_hours_history.equipment_id) AND is_org_admin(( SELECT auth.uid() AS uid), e.organization_id))))

-- [public.equipment_working_hours_history] Admins can update working hours history (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM equipment e
--     WHERE ((e.id = equipment_working_hours_history.equipment_id) AND is_org_admin(( SELECT auth.uid() AS uid), e.organization_id))))

-- [public.equipment_working_hours_history] Users can create working hours history for accessible equipment (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   ((updated_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
--      FROM equipment e
--     WHERE ((e.id = equipment_working_hours_history.equipment_id) AND (is_org_admin(( SELECT auth.uid() AS uid), e.organization_id) OR (is_org_member(( SELECT auth.uid() AS uid), e.organization_id) AND (e.team_id IS NOT NULL) AND (e.team_id IN ( SELECT tm.team_id
--              FROM team_members tm
--             WHERE (tm.user_id = ( SELECT auth.uid() AS uid))))))))))

-- [public.equipment_working_hours_history] Users can view working hours history for accessible equipment (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM equipment e
--     WHERE ((e.id = equipment_working_hours_history.equipment_id) AND (is_org_admin(( SELECT auth.uid() AS uid), e.organization_id) OR (is_org_member(( SELECT auth.uid() AS uid), e.organization_id) AND (e.team_id IS NOT NULL) AND (e.team_id IN ( SELECT tm.team_id
--              FROM team_members tm
--             WHERE (tm.user_id = ( SELECT auth.uid() AS uid)))))))))

-- [public.export_request_log] export_request_log_select (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   (((user_id = ( SELECT auth.uid() AS uid)) AND is_org_member(( SELECT auth.uid() AS uid), organization_id)) OR (EXISTS ( SELECT 1
--      FROM organization_members
--     WHERE ((organization_members.organization_id = export_request_log.organization_id) AND (organization_members.user_id = ( SELECT auth.uid() AS uid)) AND (organization_members.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (organization_members.status = 'active'::text)))))

-- [public.export_request_log] Service role can manage export logs (ALL) roles=[{service_role}] PERMISSIVE
-- USING:
--   true
-- WITH CHECK:
--   true

-- [public.external_customer_contacts] external_customer_contacts_delete (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM customers c
--     WHERE ((c.id = external_customer_contacts.customer_id) AND is_org_admin(( SELECT auth.uid() AS uid), c.organization_id))))

-- [public.external_customer_contacts] external_customer_contacts_insert (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (EXISTS ( SELECT 1
--      FROM customers c
--     WHERE ((c.id = external_customer_contacts.customer_id) AND is_org_admin(( SELECT auth.uid() AS uid), c.organization_id))))

-- [public.external_customer_contacts] external_customer_contacts_select (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM customers c
--     WHERE ((c.id = external_customer_contacts.customer_id) AND is_org_member(( SELECT auth.uid() AS uid), c.organization_id))))

-- [public.external_customer_contacts] external_customer_contacts_update (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM customers c
--     WHERE ((c.id = external_customer_contacts.customer_id) AND is_org_admin(( SELECT auth.uid() AS uid), c.organization_id))))
-- WITH CHECK:
--   (EXISTS ( SELECT 1
--      FROM customers c
--     WHERE ((c.id = external_customer_contacts.customer_id) AND is_org_admin(( SELECT auth.uid() AS uid), c.organization_id))))

-- [public.geocoded_locations] geocoded_locations_select_org_members (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   check_org_access_secure(( SELECT auth.uid() AS uid), organization_id)

-- [public.geocoded_locations] geocoded_locations_service_insert (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (( SELECT auth.role() AS role) = 'service_role'::text)

-- [public.geocoded_locations] geocoded_locations_service_update (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   (( SELECT auth.role() AS role) = 'service_role'::text)

-- [public.google_workspace_credentials] google_workspace_credentials_delete_deny (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   false

-- [public.google_workspace_credentials] google_workspace_credentials_insert_deny (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   false

-- [public.google_workspace_credentials] google_workspace_credentials_select_deny (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   false

-- [public.google_workspace_credentials] google_workspace_credentials_update_deny (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   false
-- WITH CHECK:
--   false

-- [public.google_workspace_directory_users] google_workspace_directory_users_select_admin (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (organization_id IN ( SELECT om.organization_id
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text))))

-- [public.google_workspace_oauth_sessions] google_workspace_oauth_sessions_delete_deny (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   false

-- [public.google_workspace_oauth_sessions] google_workspace_oauth_sessions_insert (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   ((user_id = ( SELECT auth.uid() AS uid)) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT om.organization_id
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text))))))

-- [public.google_workspace_oauth_sessions] google_workspace_oauth_sessions_select_deny (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   false

-- [public.google_workspace_oauth_sessions] google_workspace_oauth_sessions_update_deny (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   false
-- WITH CHECK:
--   false

-- [public.inventory_item_images] inventory_item_images_delete (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   ((uploaded_by = ( SELECT auth.uid() AS uid)) OR is_org_admin(( SELECT auth.uid() AS uid), organization_id))

-- [public.inventory_item_images] inventory_item_images_insert (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   ((uploaded_by = ( SELECT auth.uid() AS uid)) AND is_org_member(( SELECT auth.uid() AS uid), organization_id))

-- [public.inventory_item_images] inventory_item_images_select (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   is_org_member(( SELECT auth.uid() AS uid), organization_id)

-- [public.inventory_items] inventory_items_organization_isolation (ALL) roles=[{public}] PERMISSIVE
-- USING:
--   (organization_id IN ( SELECT organization_members.organization_id
--      FROM organization_members
--     WHERE ((organization_members.user_id = ( SELECT auth.uid() AS uid)) AND (organization_members.status = 'active'::text))))

-- [public.inventory_transactions] inventory_transactions_organization_isolation (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (organization_id IN ( SELECT organization_members.organization_id
--      FROM organization_members
--     WHERE ((organization_members.user_id = ( SELECT auth.uid() AS uid)) AND (organization_members.status = 'active'::text))))

-- [public.invitation_performance_logs] no_user_access_performance_logs (ALL) roles=[{public}] PERMISSIVE
-- USING:
--   false

-- [public.invitation_performance_logs] service_role_only_performance_logs (ALL) roles=[{public}] PERMISSIVE
-- USING:
--   (( SELECT auth.role() AS role) = 'service_role'::text)
-- WITH CHECK:
--   (( SELECT auth.role() AS role) = 'service_role'::text)

-- [public.member_removal_audit] Authorized users can insert removal audit (INSERT) roles=[{authenticated}] PERMISSIVE
-- WITH CHECK:
--   (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.organization_id = member_removal_audit.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text))))

-- [public.member_removal_audit] Org admins can view removal audit (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   is_org_admin(( SELECT auth.uid() AS uid), organization_id)

-- [public.member_removal_audit] Service role can insert removal audit (INSERT) roles=[{service_role}] PERMISSIVE
-- WITH CHECK:
--   true

-- [public.notes] notes_delete_own_or_admin (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   ((author_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
--      FROM equipment e
--     WHERE ((e.id = notes.equipment_id) AND is_org_admin(( SELECT auth.uid() AS uid), e.organization_id)))))

-- [public.notes] notes_insert_organization_members (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (EXISTS ( SELECT 1
--      FROM equipment e
--     WHERE ((e.id = notes.equipment_id) AND is_org_member(( SELECT auth.uid() AS uid), e.organization_id))))

-- [public.notes] notes_select_organization_members (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM equipment e
--     WHERE ((e.id = notes.equipment_id) AND is_org_member(( SELECT auth.uid() AS uid), e.organization_id))))

-- [public.notes] notes_update_own (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   ((author_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
--      FROM equipment e
--     WHERE ((e.id = notes.equipment_id) AND is_org_member(( SELECT auth.uid() AS uid), e.organization_id)))))

-- [public.notification_preferences] Users can manage their own notification preferences (ALL) roles=[{public}] PERMISSIVE
-- USING:
--   (user_id = ( SELECT auth.uid() AS uid))

-- [public.notification_settings] notification_settings_user_policy (ALL) roles=[{public}] PERMISSIVE
-- USING:
--   (user_id = ( SELECT auth.uid() AS uid))

-- [public.notifications] service_role_only_create_notifications (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (( SELECT auth.role() AS role) = 'service_role'::text)

-- [public.notifications] Users can update their own notifications (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   (user_id = ( SELECT auth.uid() AS uid))

-- [public.notifications] Users can view their own notifications (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (user_id = ( SELECT auth.uid() AS uid))

-- [public.organization_google_export_destinations] google_export_destinations_delete (DELETE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.organization_id = organization_google_export_destinations.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])))))

-- [public.organization_google_export_destinations] google_export_destinations_insert (INSERT) roles=[{authenticated}] PERMISSIVE
-- WITH CHECK:
--   (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.organization_id = organization_google_export_destinations.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])))))

-- [public.organization_google_export_destinations] google_export_destinations_select (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.organization_id = organization_google_export_destinations.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])))))

-- [public.organization_google_export_destinations] google_export_destinations_update (UPDATE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.organization_id = organization_google_export_destinations.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])))))
-- WITH CHECK:
--   (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.organization_id = organization_google_export_destinations.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])))))

-- [public.organization_invitations] organization_invitations_select (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   ((email = ( SELECT auth.email() AS email)) OR is_org_member(( SELECT auth.uid() AS uid), organization_id))

-- [public.organization_invitations] organization_invitations_update (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   ((email = ( SELECT auth.email() AS email)) OR (invited_by = ( SELECT auth.uid() AS uid)) OR is_org_admin(( SELECT auth.uid() AS uid), organization_id))
-- WITH CHECK:
--   ((email = ( SELECT auth.email() AS email)) OR (invited_by = ( SELECT auth.uid() AS uid)) OR is_org_admin(( SELECT auth.uid() AS uid), organization_id))

-- [public.organization_invitations] users_create_invitations (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   is_org_admin(( SELECT auth.uid() AS uid), organization_id)

-- [public.organization_invitations] users_delete_own_invitations (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   (email = ( SELECT auth.email() AS email))

-- [public.organization_member_claims] organization_member_claims_insert_admin (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (organization_id IN ( SELECT om.organization_id
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text))))

-- [public.organization_member_claims] organization_member_claims_select_admin (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (organization_id IN ( SELECT om.organization_id
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text))))

-- [public.organization_member_claims] organization_member_claims_update_admin (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   (organization_id IN ( SELECT om.organization_id
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text))))

-- [public.organization_members] organization_members_delete (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.organization_id = organization_members.organization_id) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text))))

-- [public.organization_members] organization_members_delete_safe (DELETE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   user_is_org_admin(organization_id)

-- [public.organization_members] organization_members_insert (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.organization_id = organization_members.organization_id) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text))))

-- [public.organization_members] organization_members_insert_safe (INSERT) roles=[{authenticated}] PERMISSIVE
-- WITH CHECK:
--   user_is_org_admin(organization_id)

-- [public.organization_members] organization_members_select_safe (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((user_id = ( SELECT auth.uid() AS uid)) OR user_is_org_member(organization_id))

-- [public.organization_members] organization_members_update (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.organization_id = organization_members.organization_id) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text))))

-- [public.organization_members] organization_members_update_safe (UPDATE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   user_is_org_admin(organization_id)

-- [public.organization_role_grants_pending] organization_role_grants_pending_insert_admin (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (organization_id IN ( SELECT om.organization_id
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text))))

-- [public.organization_role_grants_pending] organization_role_grants_pending_select_admin (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (organization_id IN ( SELECT om.organization_id
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text))))

-- [public.organization_role_grants_pending] organization_role_grants_pending_update_admin (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   (organization_id IN ( SELECT om.organization_id
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text))))

-- [public.organizations] organizations_select (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (is_org_member(( SELECT auth.uid() AS uid), id) OR (EXISTS ( SELECT 1
--      FROM organization_invitations
--     WHERE ((organization_invitations.organization_id = organizations.id) AND (organization_invitations.email = ( SELECT auth.email() AS email)) AND (organization_invitations.status = 'pending'::text)))))

-- [public.organizations] orgs_update_admins (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   is_org_admin(( SELECT auth.uid() AS uid), id)

-- [public.ownership_transfer_requests] ownership_transfer_requests_select (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((( SELECT auth.role() AS role) = 'service_role'::text) OR (to_user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.organization_id = ownership_transfer_requests.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text)))))

-- [public.ownership_transfer_requests] ownership_transfer_requests_service_delete (DELETE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   (( SELECT auth.role() AS role) = 'service_role'::text)

-- [public.ownership_transfer_requests] ownership_transfer_requests_service_insert (INSERT) roles=[{authenticated}] PERMISSIVE
-- WITH CHECK:
--   (( SELECT auth.role() AS role) = 'service_role'::text)

-- [public.ownership_transfer_requests] ownership_transfer_requests_service_update (UPDATE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   (( SELECT auth.role() AS role) = 'service_role'::text)
-- WITH CHECK:
--   (( SELECT auth.role() AS role) = 'service_role'::text)

-- [public.part_alternate_group_members] part_alternate_group_members_org_isolation (ALL) roles=[{public}] PERMISSIVE
-- USING:
--   (group_id IN ( SELECT part_alternate_groups.id
--      FROM part_alternate_groups
--     WHERE (part_alternate_groups.organization_id IN ( SELECT organization_members.organization_id
--              FROM organization_members
--             WHERE ((organization_members.user_id = ( SELECT auth.uid() AS uid)) AND (organization_members.status = 'active'::text))))))

-- [public.part_alternate_groups] part_alternate_groups_org_isolation (ALL) roles=[{public}] PERMISSIVE
-- USING:
--   (organization_id IN ( SELECT organization_members.organization_id
--      FROM organization_members
--     WHERE ((organization_members.user_id = ( SELECT auth.uid() AS uid)) AND (organization_members.status = 'active'::text))))

-- [public.part_compatibility_rules] part_compatibility_rules_org_isolation (ALL) roles=[{public}] PERMISSIVE
-- USING:
--   (inventory_item_id IN ( SELECT inventory_items.id
--      FROM inventory_items
--     WHERE (inventory_items.organization_id IN ( SELECT organization_members.organization_id
--              FROM organization_members
--             WHERE ((organization_members.user_id = ( SELECT auth.uid() AS uid)) AND (organization_members.status = 'active'::text))))))

-- [public.part_identifiers] part_identifiers_org_isolation (ALL) roles=[{public}] PERMISSIVE
-- USING:
--   (organization_id IN ( SELECT organization_members.organization_id
--      FROM organization_members
--     WHERE ((organization_members.user_id = ( SELECT auth.uid() AS uid)) AND (organization_members.status = 'active'::text))))

-- [public.parts_managers] parts_managers_delete_policy (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   (organization_id IN ( SELECT om.organization_id
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])))))

-- [public.parts_managers] parts_managers_insert_policy (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (organization_id IN ( SELECT om.organization_id
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])))))

-- [public.parts_managers] parts_managers_select_policy (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (organization_id IN ( SELECT om.organization_id
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text))))

-- [public.personal_organizations] personal_organizations_delete_deny (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   false

-- [public.personal_organizations] personal_organizations_insert_deny (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   false

-- [public.personal_organizations] personal_organizations_select_own (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (user_id = ( SELECT auth.uid() AS uid))

-- [public.personal_organizations] personal_organizations_update_deny (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   false
-- WITH CHECK:
--   false

-- [public.pm_checklist_templates] pm_checklist_templates_admin_insert (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   is_org_admin(( SELECT auth.uid() AS uid), organization_id)

-- [public.pm_checklist_templates] pm_checklist_templates_admin_update (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   is_org_admin(( SELECT auth.uid() AS uid), organization_id)

-- [public.pm_checklist_templates] pm_checklist_templates_delete_consolidated (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   (is_org_admin(( SELECT auth.uid() AS uid), organization_id) AND (is_protected = false))

-- [public.pm_checklist_templates] pm_checklist_templates_select_consolidated (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (((organization_id IS NULL) AND (( SELECT auth.uid() AS uid) IS NOT NULL)) OR is_org_member(( SELECT auth.uid() AS uid), organization_id) OR is_org_admin(( SELECT auth.uid() AS uid), organization_id))

-- [public.pm_checklist_templates] pm_templates_admin_manage (ALL) roles=[{public}] PERMISSIVE
-- USING:
--   (is_org_admin(( SELECT auth.uid() AS uid), organization_id) AND ((is_protected = false) OR (organization_id IS NOT NULL)))

-- [public.pm_checklist_templates] pm_templates_read_access (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (((organization_id IS NULL) AND (( SELECT auth.uid() AS uid) IS NOT NULL)) OR is_org_member(( SELECT auth.uid() AS uid), organization_id))

-- [public.pm_status_history] pm_status_history_admin_insert (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   ((EXISTS ( SELECT 1
--      FROM preventative_maintenance pm
--     WHERE ((pm.id = pm_status_history.pm_id) AND is_org_admin(( SELECT auth.uid() AS uid), pm.organization_id)))) AND (changed_by = ( SELECT auth.uid() AS uid)))

-- [public.pm_status_history] pm_status_history_member_select (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM preventative_maintenance pm
--     WHERE ((pm.id = pm_status_history.pm_id) AND is_org_member(( SELECT auth.uid() AS uid), pm.organization_id))))

-- [public.pm_status_history] pm_status_history_select_consolidated (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM preventative_maintenance pm
--     WHERE ((pm.id = pm_status_history.pm_id) AND is_org_member(( SELECT auth.uid() AS uid), pm.organization_id))))

-- [public.pm_template_compatibility_rules] pm_template_compat_rules_delete (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   (organization_id IN ( SELECT om.organization_id
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text))))

-- [public.pm_template_compatibility_rules] pm_template_compat_rules_insert (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   ((organization_id IN ( SELECT om.organization_id
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text)))) AND (pm_template_id IN ( SELECT pm_checklist_templates.id
--      FROM pm_checklist_templates
--     WHERE ((pm_checklist_templates.organization_id IS NULL) OR (pm_checklist_templates.organization_id IN ( SELECT om.organization_id
--              FROM organization_members om
--             WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text))))))))

-- [public.pm_template_compatibility_rules] pm_template_compat_rules_select (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (organization_id IN ( SELECT om.organization_id
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text))))

-- [public.pm_template_compatibility_rules] pm_template_compat_rules_update (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   (organization_id IN ( SELECT om.organization_id
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text))))

-- [public.preventative_maintenance] preventative_maintenance_insert_consolidated (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (((is_historical = true) AND is_org_admin(( SELECT auth.uid() AS uid), organization_id)) OR is_org_member(( SELECT auth.uid() AS uid), organization_id))

-- [public.preventative_maintenance] preventative_maintenance_select_consolidated (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   is_org_member(( SELECT auth.uid() AS uid), organization_id)

-- [public.preventative_maintenance] preventative_maintenance_update_consolidated (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   (((is_historical = true) AND is_org_admin(( SELECT auth.uid() AS uid), organization_id)) OR is_org_member(( SELECT auth.uid() AS uid), organization_id))

-- [public.profiles] profiles_insert_optimized (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (id = ( SELECT auth.uid() AS uid))

-- [public.profiles] profiles_select (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   ((id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
--      FROM (organization_members om1
--        JOIN organization_members om2 ON ((om1.organization_id = om2.organization_id)))
--     WHERE ((om1.user_id = ( SELECT auth.uid() AS uid)) AND (om2.user_id = profiles.id) AND (om1.status = 'active'::text) AND (om2.status = 'active'::text)))))

-- [public.profiles] profiles_update_optimized (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   (id = ( SELECT auth.uid() AS uid))

-- [public.push_subscriptions] service_role_full_access_push_subscriptions (ALL) roles=[{service_role}] PERMISSIVE
-- USING:
--   true
-- WITH CHECK:
--   true

-- [public.push_subscriptions] users_manage_own_push_subscriptions (ALL) roles=[{authenticated}] PERMISSIVE
-- USING:
--   (user_id = ( SELECT auth.uid() AS uid))
-- WITH CHECK:
--   (user_id = ( SELECT auth.uid() AS uid))

-- [public.quickbooks_credentials] quickbooks_credentials_delete_policy (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.organization_id = quickbooks_credentials.organization_id) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text))))

-- [public.quickbooks_credentials] quickbooks_credentials_insert_policy (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.organization_id = quickbooks_credentials.organization_id) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text))))

-- [public.quickbooks_credentials] quickbooks_credentials_select_policy (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.organization_id = quickbooks_credentials.organization_id) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text))))

-- [public.quickbooks_credentials] quickbooks_credentials_update_policy (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.organization_id = quickbooks_credentials.organization_id) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text))))
-- WITH CHECK:
--   (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.organization_id = quickbooks_credentials.organization_id) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text))))

-- [public.quickbooks_export_logs] quickbooks_export_logs_insert_policy (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   can_user_manage_quickbooks(( SELECT auth.uid() AS uid), organization_id)

-- [public.quickbooks_export_logs] quickbooks_export_logs_select_policy (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   can_user_manage_quickbooks(( SELECT auth.uid() AS uid), organization_id)

-- [public.quickbooks_export_logs] quickbooks_export_logs_update_policy (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   can_user_manage_quickbooks(( SELECT auth.uid() AS uid), organization_id)
-- WITH CHECK:
--   can_user_manage_quickbooks(( SELECT auth.uid() AS uid), organization_id)

-- [public.quickbooks_invoice_status_events] quickbooks_invoice_status_events_no_user_insert (INSERT) roles=[{authenticated}] PERMISSIVE
-- WITH CHECK:
--   false

-- [public.quickbooks_invoice_status_events] quickbooks_invoice_status_events_no_user_update (UPDATE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   false
-- WITH CHECK:
--   false

-- [public.quickbooks_invoice_status_events] quickbooks_invoice_status_events_select_admins (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.organization_id = quickbooks_invoice_status_events.organization_id) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text))))

-- [public.quickbooks_invoice_status_events] quickbooks_invoice_status_events_service_role_all (ALL) roles=[{service_role}] PERMISSIVE
-- USING:
--   true
-- WITH CHECK:
--   true

-- [public.quickbooks_oauth_sessions] quickbooks_oauth_sessions_insert_policy (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   ((user_id = ( SELECT auth.uid() AS uid)) AND (organization_id IN ( SELECT om.organization_id
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text)))))

-- [public.quickbooks_oauth_sessions] quickbooks_oauth_sessions_select_policy (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (user_id = ( SELECT auth.uid() AS uid))

-- [public.quickbooks_team_customers] quickbooks_team_customers_delete_policy (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   can_user_manage_quickbooks(( SELECT auth.uid() AS uid), organization_id)

-- [public.quickbooks_team_customers] quickbooks_team_customers_insert_policy (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   can_user_manage_quickbooks(( SELECT auth.uid() AS uid), organization_id)

-- [public.quickbooks_team_customers] quickbooks_team_customers_select_policy (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   can_user_manage_quickbooks(( SELECT auth.uid() AS uid), organization_id)

-- [public.quickbooks_team_customers] quickbooks_team_customers_update_policy (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   can_user_manage_quickbooks(( SELECT auth.uid() AS uid), organization_id)
-- WITH CHECK:
--   can_user_manage_quickbooks(( SELECT auth.uid() AS uid), organization_id)

-- [public.record_export_artifacts] record_export_artifacts_delete (DELETE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.organization_id = record_export_artifacts.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])))))

-- [public.record_export_artifacts] record_export_artifacts_insert (INSERT) roles=[{authenticated}] PERMISSIVE
-- WITH CHECK:
--   (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.organization_id = record_export_artifacts.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])))))

-- [public.record_export_artifacts] record_export_artifacts_select (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.organization_id = record_export_artifacts.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text))))

-- [public.record_export_artifacts] record_export_artifacts_service (ALL) roles=[{service_role}] PERMISSIVE
-- USING:
--   true
-- WITH CHECK:
--   true

-- [public.record_export_artifacts] record_export_artifacts_update (UPDATE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.organization_id = record_export_artifacts.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])))))
-- WITH CHECK:
--   (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.organization_id = record_export_artifacts.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])))))

-- [public.scan_follow_up_events] scan_follow_up_events_insert_organization_members (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   ((performed_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
--      FROM (equipment e
--        JOIN organization_members om ON ((om.organization_id = e.organization_id)))
--     WHERE ((e.id = scan_follow_up_events.equipment_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text)))) AND (EXISTS ( SELECT 1
--      FROM scans s
--     WHERE ((s.id = scan_follow_up_events.scan_id) AND (s.equipment_id = scan_follow_up_events.equipment_id)))))

-- [public.scan_follow_up_events] scan_follow_up_events_select_organization_members (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM (equipment e
--        JOIN organization_members om ON ((om.organization_id = e.organization_id)))
--     WHERE ((e.id = scan_follow_up_events.equipment_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text))))

-- [public.scans] scans_delete_admins (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM equipment e
--     WHERE ((e.id = scans.equipment_id) AND is_org_admin(( SELECT auth.uid() AS uid), e.organization_id))))

-- [public.scans] scans_insert_organization_members (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (EXISTS ( SELECT 1
--      FROM equipment e
--     WHERE ((e.id = scans.equipment_id) AND is_org_member(( SELECT auth.uid() AS uid), e.organization_id))))

-- [public.scans] scans_select_organization_members (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM equipment e
--     WHERE ((e.id = scans.equipment_id) AND is_org_member(( SELECT auth.uid() AS uid), e.organization_id))))

-- [public.scans] scans_update_own (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   ((scanned_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
--      FROM equipment e
--     WHERE ((e.id = scans.equipment_id) AND is_org_member(( SELECT auth.uid() AS uid), e.organization_id)))))

-- [public.team_members] team_members_admin_delete (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM teams t
--     WHERE ((t.id = team_members.team_id) AND is_org_admin(( SELECT auth.uid() AS uid), t.organization_id))))

-- [public.team_members] team_members_admin_insert (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (EXISTS ( SELECT 1
--      FROM teams t
--     WHERE ((t.id = team_members.team_id) AND is_org_admin(( SELECT auth.uid() AS uid), t.organization_id))))

-- [public.team_members] team_members_admin_update (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM teams t
--     WHERE ((t.id = team_members.team_id) AND is_org_admin(( SELECT auth.uid() AS uid), t.organization_id))))

-- [public.team_members] team_members_select (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM teams t
--     WHERE ((t.id = team_members.team_id) AND is_org_member(( SELECT auth.uid() AS uid), t.organization_id))))

-- [public.teams] admins_delete_teams (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   is_org_admin(( SELECT auth.uid() AS uid), organization_id)

-- [public.teams] admins_manage_teams (ALL) roles=[{public}] PERMISSIVE
-- USING:
--   is_org_admin(( SELECT auth.uid() AS uid), organization_id)

-- [public.teams] admins_update_teams (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   is_org_admin(( SELECT auth.uid() AS uid), organization_id)

-- [public.teams] members_view_teams (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   is_org_member(( SELECT auth.uid() AS uid), organization_id)

-- [public.teams] teams_admin_delete (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   is_org_admin(( SELECT auth.uid() AS uid), organization_id)

-- [public.teams] teams_admin_insert (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   is_org_admin(( SELECT auth.uid() AS uid), organization_id)

-- [public.teams] teams_admin_update (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   is_org_admin(( SELECT auth.uid() AS uid), organization_id)

-- [public.teams] teams_select_consolidated (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (is_org_member(( SELECT auth.uid() AS uid), organization_id) OR is_org_admin(( SELECT auth.uid() AS uid), organization_id))

-- [public.terms_acceptances] terms_acceptances_select_own (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   (user_id = ( SELECT auth.uid() AS uid))

-- [public.ticket_comments] service_role_can_insert_ticket_comments (INSERT) roles=[{service_role}] PERMISSIVE
-- WITH CHECK:
--   true

-- [public.ticket_comments] service_role_can_update_ticket_comments (UPDATE) roles=[{service_role}] PERMISSIVE
-- USING:
--   true

-- [public.ticket_comments] Users can view comments on their own tickets (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   (ticket_id IN ( SELECT tickets.id
--      FROM tickets
--     WHERE (tickets.user_id = ( SELECT auth.uid() AS uid))))

-- [public.tickets] service_role_can_insert_tickets (INSERT) roles=[{service_role}] PERMISSIVE
-- WITH CHECK:
--   true

-- [public.tickets] service_role_can_update_tickets (UPDATE) roles=[{service_role}] PERMISSIVE
-- USING:
--   true

-- [public.tickets] Users can view their own tickets (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   (user_id = ( SELECT auth.uid() AS uid))

-- [public.user_dashboard_preferences] dashboard_preferences_delete_own_org (DELETE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((user_id = ( SELECT auth.uid() AS uid)) AND is_org_member(( SELECT auth.uid() AS uid), organization_id))

-- [public.user_dashboard_preferences] dashboard_preferences_insert_own_org (INSERT) roles=[{authenticated}] PERMISSIVE
-- WITH CHECK:
--   ((user_id = ( SELECT auth.uid() AS uid)) AND is_org_member(( SELECT auth.uid() AS uid), organization_id))

-- [public.user_dashboard_preferences] dashboard_preferences_select_own_org (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((user_id = ( SELECT auth.uid() AS uid)) AND is_org_member(( SELECT auth.uid() AS uid), organization_id))

-- [public.user_dashboard_preferences] dashboard_preferences_update_own_org (UPDATE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((user_id = ( SELECT auth.uid() AS uid)) AND is_org_member(( SELECT auth.uid() AS uid), organization_id))
-- WITH CHECK:
--   ((user_id = ( SELECT auth.uid() AS uid)) AND is_org_member(( SELECT auth.uid() AS uid), organization_id))

-- [public.user_departure_queue] user_departure_queue_select (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((( SELECT auth.role() AS role) = 'service_role'::text) OR (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.organization_id = user_departure_queue.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text)))))

-- [public.user_departure_queue] user_departure_queue_service_delete (DELETE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   (( SELECT auth.role() AS role) = 'service_role'::text)

-- [public.user_departure_queue] user_departure_queue_service_insert (INSERT) roles=[{authenticated}] PERMISSIVE
-- WITH CHECK:
--   (( SELECT auth.role() AS role) = 'service_role'::text)

-- [public.user_departure_queue] user_departure_queue_service_update (UPDATE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   (( SELECT auth.role() AS role) = 'service_role'::text)
-- WITH CHECK:
--   (( SELECT auth.role() AS role) = 'service_role'::text)

-- [public.webhook_events] service_role_delete_webhook_events (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   (( SELECT auth.role() AS role) = 'service_role'::text)

-- [public.webhook_events] service_role_insert_webhook_events (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (( SELECT auth.role() AS role) = 'service_role'::text)

-- [public.webhook_events] service_role_select_webhook_events (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (( SELECT auth.role() AS role) = 'service_role'::text)

-- [public.webhook_events] service_role_update_webhook_events (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   (( SELECT auth.role() AS role) = 'service_role'::text)

-- [public.work_order_costs] work_order_costs_delete_consolidated (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   ((EXISTS ( SELECT 1
--      FROM work_orders wo
--     WHERE ((wo.id = work_order_costs.work_order_id) AND is_org_admin(( SELECT auth.uid() AS uid), wo.organization_id)))) OR (created_by = ( SELECT auth.uid() AS uid)))

-- [public.work_order_costs] work_order_costs_insert_consolidated (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   ((EXISTS ( SELECT 1
--      FROM work_orders wo
--     WHERE ((wo.id = work_order_costs.work_order_id) AND is_org_admin(( SELECT auth.uid() AS uid), wo.organization_id)))) OR (created_by = ( SELECT auth.uid() AS uid)))

-- [public.work_order_costs] work_order_costs_select_consolidated (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM work_orders wo
--     WHERE ((wo.id = work_order_costs.work_order_id) AND (is_org_member(( SELECT auth.uid() AS uid), wo.organization_id) OR is_org_admin(( SELECT auth.uid() AS uid), wo.organization_id)))))

-- [public.work_order_costs] work_order_costs_update_consolidated (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   ((EXISTS ( SELECT 1
--      FROM work_orders wo
--     WHERE ((wo.id = work_order_costs.work_order_id) AND is_org_admin(( SELECT auth.uid() AS uid), wo.organization_id)))) OR (created_by = ( SELECT auth.uid() AS uid)))

-- [public.work_order_equipment] work_order_equipment_delete_policy (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   (work_order_id IN ( SELECT work_orders.id
--      FROM work_orders
--     WHERE (work_orders.organization_id IN ( SELECT organization_members.organization_id
--              FROM organization_members
--             WHERE ((organization_members.user_id = ( SELECT auth.uid() AS uid)) AND (organization_members.status = 'active'::text))))))

-- [public.work_order_equipment] work_order_equipment_insert_policy (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (work_order_id IN ( SELECT work_orders.id
--      FROM work_orders
--     WHERE (work_orders.organization_id IN ( SELECT organization_members.organization_id
--              FROM organization_members
--             WHERE ((organization_members.user_id = ( SELECT auth.uid() AS uid)) AND (organization_members.status = 'active'::text))))))

-- [public.work_order_equipment] work_order_equipment_select_policy (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (work_order_id IN ( SELECT work_orders.id
--      FROM work_orders
--     WHERE (work_orders.organization_id IN ( SELECT organization_members.organization_id
--              FROM organization_members
--             WHERE ((organization_members.user_id = ( SELECT auth.uid() AS uid)) AND (organization_members.status = 'active'::text))))))

-- [public.work_order_equipment] work_order_equipment_update_policy (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   (work_order_id IN ( SELECT work_orders.id
--      FROM work_orders
--     WHERE (work_orders.organization_id IN ( SELECT organization_members.organization_id
--              FROM organization_members
--             WHERE ((organization_members.user_id = ( SELECT auth.uid() AS uid)) AND (organization_members.status = 'active'::text))))))

-- [public.work_order_images] Users can upload work order images (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (EXISTS ( SELECT 1
--      FROM work_orders wo
--     WHERE ((wo.id = work_order_images.work_order_id) AND is_org_member(( SELECT auth.uid() AS uid), wo.organization_id))))

-- [public.work_order_images] Users can view work order images (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM work_orders wo
--     WHERE ((wo.id = work_order_images.work_order_id) AND is_org_member(( SELECT auth.uid() AS uid), wo.organization_id))))

-- [public.work_order_images] work_order_images_delete_own (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   ((uploaded_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
--      FROM work_orders wo
--     WHERE ((wo.id = work_order_images.work_order_id) AND is_org_member(( SELECT auth.uid() AS uid), wo.organization_id)))))

-- [public.work_order_notes] work_order_notes_delete_own (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   ((author_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
--      FROM work_orders wo
--     WHERE ((wo.id = work_order_notes.work_order_id) AND is_org_member(( SELECT auth.uid() AS uid), wo.organization_id)))))

-- [public.work_order_notes] work_order_notes_insert_organization_members (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (EXISTS ( SELECT 1
--      FROM work_orders wo
--     WHERE ((wo.id = work_order_notes.work_order_id) AND is_org_member(( SELECT auth.uid() AS uid), wo.organization_id))))

-- [public.work_order_notes] work_order_notes_select_organization_members (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM work_orders wo
--     WHERE ((wo.id = work_order_notes.work_order_id) AND is_org_member(( SELECT auth.uid() AS uid), wo.organization_id))))

-- [public.work_order_notes] work_order_notes_update_own (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   ((author_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
--      FROM work_orders wo
--     WHERE ((wo.id = work_order_notes.work_order_id) AND is_org_member(( SELECT auth.uid() AS uid), wo.organization_id)))))

-- [public.work_order_status_history] Admins can insert work order history (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   ((EXISTS ( SELECT 1
--      FROM work_orders wo
--     WHERE ((wo.id = work_order_status_history.work_order_id) AND is_org_admin(( SELECT auth.uid() AS uid), wo.organization_id)))) AND (changed_by = ( SELECT auth.uid() AS uid)))

-- [public.work_order_status_history] Users can view work order history for their organization (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (EXISTS ( SELECT 1
--      FROM work_orders wo
--     WHERE ((wo.id = work_order_status_history.work_order_id) AND is_org_member(( SELECT auth.uid() AS uid), wo.organization_id))))

-- [public.work_orders] Admins can create historical work orders (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   ((is_historical = true) AND is_org_admin(( SELECT auth.uid() AS uid), organization_id) AND (created_by_admin = ( SELECT auth.uid() AS uid)))

-- [public.work_orders] Admins can delete work orders (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   (organization_id IN ( SELECT organization_members.organization_id
--      FROM organization_members
--     WHERE ((organization_members.user_id = ( SELECT auth.uid() AS uid)) AND (organization_members.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (organization_members.status = 'active'::text))))

-- [public.work_orders] Admins can update historical work orders (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   ((is_historical = true) AND is_org_admin(( SELECT auth.uid() AS uid), organization_id))

-- [public.work_orders] admins_delete_work_orders (DELETE) roles=[{public}] PERMISSIVE
-- USING:
--   is_org_admin(( SELECT auth.uid() AS uid), organization_id)

-- [public.work_orders] members_access_work_orders (ALL) roles=[{public}] PERMISSIVE
-- USING:
--   is_org_member(( SELECT auth.uid() AS uid), organization_id)

-- [public.work_orders] Users can create work orders in their organization (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   is_org_member(( SELECT auth.uid() AS uid), organization_id)

-- [public.work_orders] Users can update work orders in their organization (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   is_org_member(( SELECT auth.uid() AS uid), organization_id)

-- [public.work_orders] Users can view work orders in their organization (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   is_org_member(( SELECT auth.uid() AS uid), organization_id)

-- [public.work_orders] work_orders_insert_consolidated (INSERT) roles=[{public}] PERMISSIVE
-- WITH CHECK:
--   (((is_historical = true) AND is_org_admin(( SELECT auth.uid() AS uid), organization_id) AND (created_by_admin = ( SELECT auth.uid() AS uid))) OR is_org_member(( SELECT auth.uid() AS uid), organization_id))

-- [public.work_orders] work_orders_select_consolidated (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   is_org_member(( SELECT auth.uid() AS uid), organization_id)

-- [public.work_orders] work_orders_update_consolidated (UPDATE) roles=[{public}] PERMISSIVE
-- USING:
--   (((is_historical = true) AND is_org_admin(( SELECT auth.uid() AS uid), organization_id)) OR is_org_member(( SELECT auth.uid() AS uid), organization_id))

-- [public.workspace_domains] workspace_domains_select_member (SELECT) roles=[{public}] PERMISSIVE
-- USING:
--   (organization_id IN ( SELECT om.organization_id
--      FROM organization_members om
--     WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.status = 'active'::text))))

-- [public.workspace_personal_org_merge_requests] workspace_merge_requests_select (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((( SELECT auth.role() AS role) = 'service_role'::text) OR (requested_for_user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
--      FROM organization_members om
--     WHERE ((om.organization_id = workspace_personal_org_merge_requests.workspace_org_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text)))))

-- [public.workspace_personal_org_merge_requests] workspace_merge_requests_service_delete (DELETE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   (( SELECT auth.role() AS role) = 'service_role'::text)

-- [public.workspace_personal_org_merge_requests] workspace_merge_requests_service_insert (INSERT) roles=[{authenticated}] PERMISSIVE
-- WITH CHECK:
--   (( SELECT auth.role() AS role) = 'service_role'::text)

-- [public.workspace_personal_org_merge_requests] workspace_merge_requests_service_update (UPDATE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   (( SELECT auth.role() AS role) = 'service_role'::text)
-- WITH CHECK:
--   (( SELECT auth.role() AS role) = 'service_role'::text)

-- [storage.objects] equip_note_images_delete (DELETE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((bucket_id = 'equipment-note-images'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))

-- [storage.objects] equip_note_images_insert (INSERT) roles=[{authenticated}] PERMISSIVE
-- WITH CHECK:
--   ((bucket_id = 'equipment-note-images'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))

-- [storage.objects] equip_note_images_select (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((bucket_id = 'equipment-note-images'::text) AND ((storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) AND (EXISTS ( SELECT 1
--      FROM equipment e
--     WHERE ((e.id = ((storage.foldername(e.name))[2])::uuid) AND is_org_member(( SELECT auth.uid() AS uid), e.organization_id)))))

-- [storage.objects] equip_note_images_update (UPDATE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((bucket_id = 'equipment-note-images'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))
-- WITH CHECK:
--   ((bucket_id = 'equipment-note-images'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))

-- [storage.objects] inventory_images_delete (DELETE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((bucket_id = 'inventory-item-images'::text) AND ((storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) AND is_org_member(( SELECT auth.uid() AS uid), ((storage.foldername(name))[1])::uuid))

-- [storage.objects] inventory_images_insert (INSERT) roles=[{authenticated}] PERMISSIVE
-- WITH CHECK:
--   ((bucket_id = 'inventory-item-images'::text) AND ((storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) AND is_org_member(( SELECT auth.uid() AS uid), ((storage.foldername(name))[1])::uuid))

-- [storage.objects] inventory_images_select (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((bucket_id = 'inventory-item-images'::text) AND ((storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) AND is_org_member(( SELECT auth.uid() AS uid), ((storage.foldername(name))[1])::uuid))

-- [storage.objects] inventory_images_update (UPDATE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((bucket_id = 'inventory-item-images'::text) AND ((storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) AND is_org_member(( SELECT auth.uid() AS uid), ((storage.foldername(name))[1])::uuid))
-- WITH CHECK:
--   ((bucket_id = 'inventory-item-images'::text) AND ((storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) AND is_org_member(( SELECT auth.uid() AS uid), ((storage.foldername(name))[1])::uuid))

-- [storage.objects] landing_page_images_select (SELECT) roles=[{anon,authenticated}] PERMISSIVE
-- USING:
--   (bucket_id = 'landing-page-images'::text)

-- [storage.objects] landing_page_videos_select (SELECT) roles=[{anon,authenticated}] PERMISSIVE
-- USING:
--   (bucket_id = 'landing-page-videos'::text)

-- [storage.objects] org_logos_delete (DELETE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((bucket_id = 'organization-logos'::text) AND is_org_member(( SELECT auth.uid() AS uid), ((storage.foldername(name))[1])::uuid))

-- [storage.objects] org_logos_insert (INSERT) roles=[{authenticated}] PERMISSIVE
-- WITH CHECK:
--   ((bucket_id = 'organization-logos'::text) AND is_org_member(( SELECT auth.uid() AS uid), ((storage.foldername(name))[1])::uuid))

-- [storage.objects] org_logos_select (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   (bucket_id = 'organization-logos'::text)

-- [storage.objects] org_logos_update (UPDATE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((bucket_id = 'organization-logos'::text) AND is_org_member(( SELECT auth.uid() AS uid), ((storage.foldername(name))[1])::uuid))
-- WITH CHECK:
--   ((bucket_id = 'organization-logos'::text) AND is_org_member(( SELECT auth.uid() AS uid), ((storage.foldername(name))[1])::uuid))

-- [storage.objects] team_images_delete (DELETE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((bucket_id = 'team-images'::text) AND ((storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) AND is_org_member(( SELECT auth.uid() AS uid), ((storage.foldername(name))[1])::uuid))

-- [storage.objects] team_images_insert (INSERT) roles=[{authenticated}] PERMISSIVE
-- WITH CHECK:
--   ((bucket_id = 'team-images'::text) AND ((storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) AND is_org_member(( SELECT auth.uid() AS uid), ((storage.foldername(name))[1])::uuid))

-- [storage.objects] team_images_select (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((bucket_id = 'team-images'::text) AND ((storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) AND is_org_member(( SELECT auth.uid() AS uid), ((storage.foldername(name))[1])::uuid))

-- [storage.objects] team_images_update (UPDATE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((bucket_id = 'team-images'::text) AND ((storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) AND is_org_member(( SELECT auth.uid() AS uid), ((storage.foldername(name))[1])::uuid))
-- WITH CHECK:
--   ((bucket_id = 'team-images'::text) AND ((storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) AND is_org_member(( SELECT auth.uid() AS uid), ((storage.foldername(name))[1])::uuid))

-- [storage.objects] user_avatars_delete (DELETE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((bucket_id = 'user-avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))

-- [storage.objects] user_avatars_insert (INSERT) roles=[{authenticated}] PERMISSIVE
-- WITH CHECK:
--   ((bucket_id = 'user-avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))

-- [storage.objects] user_avatars_select (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((bucket_id = 'user-avatars'::text) AND (EXISTS ( SELECT 1
--      FROM (organization_members om_self
--        JOIN organization_members om_peer ON ((om_self.organization_id = om_peer.organization_id)))
--     WHERE ((om_self.user_id = ( SELECT auth.uid() AS uid)) AND (om_self.status = 'active'::text) AND (om_peer.status = 'active'::text) AND ((om_peer.user_id)::text = (storage.foldername(objects.name))[1])))))

-- [storage.objects] user_avatars_update (UPDATE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((bucket_id = 'user-avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))
-- WITH CHECK:
--   ((bucket_id = 'user-avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))

-- [storage.objects] work_order_images_delete (DELETE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((bucket_id = 'work-order-images'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))

-- [storage.objects] work_order_images_insert (INSERT) roles=[{authenticated}] PERMISSIVE
-- WITH CHECK:
--   ((bucket_id = 'work-order-images'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))

-- [storage.objects] work_order_images_select (SELECT) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((bucket_id = 'work-order-images'::text) AND ((storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) AND (EXISTS ( SELECT 1
--      FROM work_orders wo
--     WHERE ((wo.id = ((storage.foldername(objects.name))[2])::uuid) AND is_org_member(( SELECT auth.uid() AS uid), wo.organization_id)))))

-- [storage.objects] work_order_images_update (UPDATE) roles=[{authenticated}] PERMISSIVE
-- USING:
--   ((bucket_id = 'work-order-images'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))
-- WITH CHECK:
--   ((bucket_id = 'work-order-images'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))

