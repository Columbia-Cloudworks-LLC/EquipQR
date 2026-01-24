export interface WorkspaceMergeRequest {
  id: string;
  workspace_org_id: string;
  workspace_org_name: string;
  requested_by_user_id: string;
  requested_by_name: string;
  requested_for_user_id: string;
  requested_for_name: string;
  request_reason: string | null;
  created_at: string;
  expires_at: string;
  is_incoming: boolean;
}

export interface WorkspaceMergeActionResult {
  success: boolean;
  error?: string;
  message?: string;
  request_id?: string;
  migration_stats?: Record<string, number>;
}

export interface PersonalOrgMergePreview {
  success: boolean;
  error?: string;
  has_personal_org?: boolean;
  personal_org_id?: string;
  equipment_count?: number;
  work_orders_count?: number;
  pm_templates_count?: number;
  pm_records_count?: number;
  inventory_items_count?: number;
  customers_count?: number;
  teams_count?: number;
}
