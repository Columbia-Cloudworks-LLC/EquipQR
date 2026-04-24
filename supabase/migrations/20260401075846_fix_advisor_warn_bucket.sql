BEGIN;

DROP INDEX IF EXISTS public.idx_work_orders_org_status;

DROP POLICY IF EXISTS invitation_performance_logs_service_only ON public.invitation_performance_logs;
DROP POLICY IF EXISTS preventative_maintenance_select ON public.preventative_maintenance;
DROP POLICY IF EXISTS organization_members_select_secure ON public.organization_members;
DROP POLICY IF EXISTS equipment_notes_delete_own ON public.equipment_notes;
DROP POLICY IF EXISTS equipment_notes_update_own ON public.equipment_notes;
DROP POLICY IF EXISTS work_order_costs_delete ON public.work_order_costs;
DROP POLICY IF EXISTS work_order_costs_insert ON public.work_order_costs;
DROP POLICY IF EXISTS work_order_costs_select ON public.work_order_costs;
DROP POLICY IF EXISTS work_order_costs_update ON public.work_order_costs;

DROP POLICY IF EXISTS org_admins_manage_dsr_events ON public.dsr_request_events;
DROP POLICY IF EXISTS users_view_own_dsr_events ON public.dsr_request_events;
CREATE POLICY dsr_request_events_select ON public.dsr_request_events
  FOR SELECT TO authenticated
  USING (
    dsr_request_id IN (
      SELECT id FROM public.dsr_requests WHERE user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.dsr_requests dr
      JOIN public.organization_members om ON om.organization_id = dr.organization_id
      WHERE dr.id = dsr_request_events.dsr_request_id
        AND om.user_id = (select auth.uid())
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS org_admins_manage_dsr_requests ON public.dsr_requests;
DROP POLICY IF EXISTS users_view_own_dsr_requests ON public.dsr_requests;
CREATE POLICY dsr_requests_select ON public.dsr_requests
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = dsr_requests.organization_id
          AND om.user_id = (select auth.uid())
          AND om.status = 'active'
          AND om.role IN ('owner', 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "Admins can view org export history" ON public.export_request_log;
DROP POLICY IF EXISTS "Users can view own export history" ON public.export_request_log;
CREATE POLICY export_request_log_select ON public.export_request_log
  FOR SELECT TO authenticated
  USING (
    (user_id = (select auth.uid()) AND is_org_member((select auth.uid()), organization_id))
    OR EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = export_request_log.organization_id
        AND organization_members.user_id = (select auth.uid())
        AND organization_members.role IN ('owner', 'admin')
        AND organization_members.status = 'active'
    )
  );

DROP POLICY IF EXISTS org_admins_view_transfer_requests ON public.ownership_transfer_requests;
DROP POLICY IF EXISTS service_role_manage_transfer_requests ON public.ownership_transfer_requests;
DROP POLICY IF EXISTS users_view_own_transfer_requests ON public.ownership_transfer_requests;
CREATE POLICY ownership_transfer_requests_select ON public.ownership_transfer_requests
  FOR SELECT TO authenticated
  USING (
    (select auth.role()) = 'service_role'
    OR to_user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = ownership_transfer_requests.organization_id
        AND om.user_id = (select auth.uid())
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );
CREATE POLICY ownership_transfer_requests_service_insert ON public.ownership_transfer_requests
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.role()) = 'service_role');
CREATE POLICY ownership_transfer_requests_service_update ON public.ownership_transfer_requests
  FOR UPDATE TO authenticated
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');
CREATE POLICY ownership_transfer_requests_service_delete ON public.ownership_transfer_requests
  FOR DELETE TO authenticated
  USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS org_admins_view_departure_queue ON public.user_departure_queue;
DROP POLICY IF EXISTS service_role_manage_departure_queue ON public.user_departure_queue;
CREATE POLICY user_departure_queue_select ON public.user_departure_queue
  FOR SELECT TO authenticated
  USING (
    (select auth.role()) = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = user_departure_queue.organization_id
        AND om.user_id = (select auth.uid())
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );
CREATE POLICY user_departure_queue_service_insert ON public.user_departure_queue
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.role()) = 'service_role');
CREATE POLICY user_departure_queue_service_update ON public.user_departure_queue
  FOR UPDATE TO authenticated
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');
CREATE POLICY user_departure_queue_service_delete ON public.user_departure_queue
  FOR DELETE TO authenticated
  USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS service_role_manage_workspace_merge_requests ON public.workspace_personal_org_merge_requests;
DROP POLICY IF EXISTS workspace_merge_admins_view_requests ON public.workspace_personal_org_merge_requests;
DROP POLICY IF EXISTS workspace_merge_user_view_own_requests ON public.workspace_personal_org_merge_requests;
CREATE POLICY workspace_merge_requests_select ON public.workspace_personal_org_merge_requests
  FOR SELECT TO authenticated
  USING (
    (select auth.role()) = 'service_role'
    OR requested_for_user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = workspace_personal_org_merge_requests.workspace_org_id
        AND om.user_id = (select auth.uid())
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );
CREATE POLICY workspace_merge_requests_service_insert ON public.workspace_personal_org_merge_requests
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.role()) = 'service_role');
CREATE POLICY workspace_merge_requests_service_update ON public.workspace_personal_org_merge_requests
  FOR UPDATE TO authenticated
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');
CREATE POLICY workspace_merge_requests_service_delete ON public.workspace_personal_org_merge_requests
  FOR DELETE TO authenticated
  USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS users_receive_own_notifications ON realtime.messages;
CREATE POLICY users_receive_own_notifications ON realtime.messages
  FOR SELECT TO authenticated
  USING (realtime.topic() = ('notifications:user:' || ((select auth.uid()))::text));
DROP POLICY IF EXISTS users_receive_own_ticket_updates ON realtime.messages;
CREATE POLICY users_receive_own_ticket_updates ON realtime.messages
  FOR SELECT TO authenticated
  USING (realtime.topic() = ('tickets:user:' || ((select auth.uid()))::text));

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT TO public
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Authorized users can insert removal audit" ON public.member_removal_audit;
CREATE POLICY "Authorized users can insert removal audit" ON public.member_removal_audit
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = member_removal_audit.organization_id
        AND om.user_id = (select auth.uid())
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS work_order_equipment_select_policy ON public.work_order_equipment;
CREATE POLICY work_order_equipment_select_policy ON public.work_order_equipment
  FOR SELECT TO public
  USING (
    work_order_id IN (
      SELECT work_orders.id FROM public.work_orders
      WHERE work_orders.organization_id IN (
        SELECT organization_members.organization_id FROM public.organization_members
        WHERE organization_members.user_id = (select auth.uid())
          AND organization_members.status = 'active'
      )
    )
  );
DROP POLICY IF EXISTS work_order_equipment_insert_policy ON public.work_order_equipment;
CREATE POLICY work_order_equipment_insert_policy ON public.work_order_equipment
  FOR INSERT TO public
  WITH CHECK (
    work_order_id IN (
      SELECT work_orders.id FROM public.work_orders
      WHERE work_orders.organization_id IN (
        SELECT organization_members.organization_id FROM public.organization_members
        WHERE organization_members.user_id = (select auth.uid())
          AND organization_members.status = 'active'
      )
    )
  );
DROP POLICY IF EXISTS work_order_equipment_update_policy ON public.work_order_equipment;
CREATE POLICY work_order_equipment_update_policy ON public.work_order_equipment
  FOR UPDATE TO public
  USING (
    work_order_id IN (
      SELECT work_orders.id FROM public.work_orders
      WHERE work_orders.organization_id IN (
        SELECT organization_members.organization_id FROM public.organization_members
        WHERE organization_members.user_id = (select auth.uid())
          AND organization_members.status = 'active'
      )
    )
  );
DROP POLICY IF EXISTS work_order_equipment_delete_policy ON public.work_order_equipment;
CREATE POLICY work_order_equipment_delete_policy ON public.work_order_equipment
  FOR DELETE TO public
  USING (
    work_order_id IN (
      SELECT work_orders.id FROM public.work_orders
      WHERE work_orders.organization_id IN (
        SELECT organization_members.organization_id FROM public.organization_members
        WHERE organization_members.user_id = (select auth.uid())
          AND organization_members.status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS inventory_items_organization_isolation ON public.inventory_items;
CREATE POLICY inventory_items_organization_isolation ON public.inventory_items
  FOR ALL TO public
  USING (
    organization_id IN (
      SELECT organization_members.organization_id FROM public.organization_members
      WHERE organization_members.user_id = (select auth.uid())
        AND organization_members.status = 'active'
    )
  );

DROP POLICY IF EXISTS inventory_transactions_organization_isolation ON public.inventory_transactions;
CREATE POLICY inventory_transactions_organization_isolation ON public.inventory_transactions
  FOR SELECT TO public
  USING (
    organization_id IN (
      SELECT organization_members.organization_id FROM public.organization_members
      WHERE organization_members.user_id = (select auth.uid())
        AND organization_members.status = 'active'
    )
  );

DROP POLICY IF EXISTS equipment_part_compatibility_organization_isolation ON public.equipment_part_compatibility;
CREATE POLICY equipment_part_compatibility_organization_isolation ON public.equipment_part_compatibility
  FOR ALL TO public
  USING (
    equipment_id IN (
      SELECT e.id FROM public.equipment e
      JOIN public.organization_members om ON e.organization_id = om.organization_id
      WHERE om.user_id = (select auth.uid())
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS part_compatibility_rules_org_isolation ON public.part_compatibility_rules;
CREATE POLICY part_compatibility_rules_org_isolation ON public.part_compatibility_rules
  FOR ALL TO public
  USING (
    inventory_item_id IN (
      SELECT inventory_items.id FROM public.inventory_items
      WHERE inventory_items.organization_id IN (
        SELECT organization_members.organization_id FROM public.organization_members
        WHERE organization_members.user_id = (select auth.uid())
          AND organization_members.status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS pm_template_compat_rules_select ON public.pm_template_compatibility_rules;
CREATE POLICY pm_template_compat_rules_select ON public.pm_template_compatibility_rules
  FOR SELECT TO public
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = (select auth.uid())
        AND om.status = 'active'
    )
  );
DROP POLICY IF EXISTS pm_template_compat_rules_insert ON public.pm_template_compatibility_rules;
CREATE POLICY pm_template_compat_rules_insert ON public.pm_template_compatibility_rules
  FOR INSERT TO public
  WITH CHECK (
    (organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = (select auth.uid())
        AND om.status = 'active'
    ))
    AND (pm_template_id IN (
      SELECT pm_checklist_templates.id FROM public.pm_checklist_templates
      WHERE pm_checklist_templates.organization_id IS NULL
        OR pm_checklist_templates.organization_id IN (
          SELECT om.organization_id FROM public.organization_members om
          WHERE om.user_id = (select auth.uid())
            AND om.status = 'active'
        )
    ))
  );
DROP POLICY IF EXISTS pm_template_compat_rules_update ON public.pm_template_compatibility_rules;
CREATE POLICY pm_template_compat_rules_update ON public.pm_template_compatibility_rules
  FOR UPDATE TO public
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = (select auth.uid())
        AND om.status = 'active'
    )
  );
DROP POLICY IF EXISTS pm_template_compat_rules_delete ON public.pm_template_compatibility_rules;
CREATE POLICY pm_template_compat_rules_delete ON public.pm_template_compatibility_rules
  FOR DELETE TO public
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = (select auth.uid())
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS part_alternate_groups_org_isolation ON public.part_alternate_groups;
CREATE POLICY part_alternate_groups_org_isolation ON public.part_alternate_groups
  FOR ALL TO public
  USING (
    organization_id IN (
      SELECT organization_members.organization_id FROM public.organization_members
      WHERE organization_members.user_id = (select auth.uid())
        AND organization_members.status = 'active'
    )
  );

DROP POLICY IF EXISTS part_identifiers_org_isolation ON public.part_identifiers;
CREATE POLICY part_identifiers_org_isolation ON public.part_identifiers
  FOR ALL TO public
  USING (
    organization_id IN (
      SELECT organization_members.organization_id FROM public.organization_members
      WHERE organization_members.user_id = (select auth.uid())
        AND organization_members.status = 'active'
    )
  );

DROP POLICY IF EXISTS part_alternate_group_members_org_isolation ON public.part_alternate_group_members;
CREATE POLICY part_alternate_group_members_org_isolation ON public.part_alternate_group_members
  FOR ALL TO public
  USING (
    group_id IN (
      SELECT part_alternate_groups.id FROM public.part_alternate_groups
      WHERE part_alternate_groups.organization_id IN (
        SELECT organization_members.organization_id FROM public.organization_members
        WHERE organization_members.user_id = (select auth.uid())
          AND organization_members.status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS parts_managers_select_policy ON public.parts_managers;
CREATE POLICY parts_managers_select_policy ON public.parts_managers
  FOR SELECT TO public
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = (select auth.uid())
        AND om.status = 'active'
    )
  );
DROP POLICY IF EXISTS parts_managers_insert_policy ON public.parts_managers;
CREATE POLICY parts_managers_insert_policy ON public.parts_managers
  FOR INSERT TO public
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = (select auth.uid())
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );
DROP POLICY IF EXISTS parts_managers_delete_policy ON public.parts_managers;
CREATE POLICY parts_managers_delete_policy ON public.parts_managers
  FOR DELETE TO public
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = (select auth.uid())
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS workspace_domains_select_member ON public.workspace_domains;
CREATE POLICY workspace_domains_select_member ON public.workspace_domains
  FOR SELECT TO public
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = (select auth.uid())
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS google_workspace_oauth_sessions_insert ON public.google_workspace_oauth_sessions;
CREATE POLICY google_workspace_oauth_sessions_insert ON public.google_workspace_oauth_sessions
  FOR INSERT TO public
  WITH CHECK (
    user_id = (select auth.uid())
    AND (
      organization_id IS NULL
      OR organization_id IN (
        SELECT om.organization_id FROM public.organization_members om
        WHERE om.user_id = (select auth.uid())
          AND om.role IN ('owner', 'admin')
          AND om.status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS google_workspace_directory_users_select_admin ON public.google_workspace_directory_users;
CREATE POLICY google_workspace_directory_users_select_admin ON public.google_workspace_directory_users
  FOR SELECT TO public
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = (select auth.uid())
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS organization_member_claims_select_admin ON public.organization_member_claims;
CREATE POLICY organization_member_claims_select_admin ON public.organization_member_claims
  FOR SELECT TO public
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = (select auth.uid())
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );
DROP POLICY IF EXISTS organization_member_claims_insert_admin ON public.organization_member_claims;
CREATE POLICY organization_member_claims_insert_admin ON public.organization_member_claims
  FOR INSERT TO public
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = (select auth.uid())
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );
DROP POLICY IF EXISTS organization_member_claims_update_admin ON public.organization_member_claims;
CREATE POLICY organization_member_claims_update_admin ON public.organization_member_claims
  FOR UPDATE TO public
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = (select auth.uid())
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS organization_role_grants_pending_select_admin ON public.organization_role_grants_pending;
CREATE POLICY organization_role_grants_pending_select_admin ON public.organization_role_grants_pending
  FOR SELECT TO public
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = (select auth.uid())
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );
DROP POLICY IF EXISTS organization_role_grants_pending_insert_admin ON public.organization_role_grants_pending;
CREATE POLICY organization_role_grants_pending_insert_admin ON public.organization_role_grants_pending
  FOR INSERT TO public
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = (select auth.uid())
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );
DROP POLICY IF EXISTS organization_role_grants_pending_update_admin ON public.organization_role_grants_pending;
CREATE POLICY organization_role_grants_pending_update_admin ON public.organization_role_grants_pending
  FOR UPDATE TO public
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = (select auth.uid())
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS personal_organizations_select_own ON public.personal_organizations;
CREATE POLICY personal_organizations_select_own ON public.personal_organizations
  FOR SELECT TO public
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS users_manage_own_push_subscriptions ON public.push_subscriptions;
CREATE POLICY users_manage_own_push_subscriptions ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;
CREATE POLICY "Users can view their own tickets" ON public.tickets
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view comments on their own tickets" ON public.ticket_comments;
CREATE POLICY "Users can view comments on their own tickets" ON public.ticket_comments
  FOR SELECT TO authenticated
  USING (
    ticket_id IN (
      SELECT tickets.id FROM public.tickets
      WHERE tickets.user_id = (select auth.uid())
    )
  );

COMMIT;
