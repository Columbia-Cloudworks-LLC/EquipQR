export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_name: string
          changes: Json
          created_at: string
          entity_id: string
          entity_name: string | null
          entity_type: string
          id: string
          metadata: Json | null
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_name?: string
          changes?: Json
          created_at?: string
          entity_id: string
          entity_name?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_name?: string
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          amount_change: number | null
          created_at: string
          effective_date: string
          event_data: Json | null
          event_type: string
          id: string
          organization_id: string
          processed: boolean | null
          user_id: string | null
        }
        Insert: {
          amount_change?: number | null
          created_at?: string
          effective_date?: string
          event_data?: Json | null
          event_type: string
          id?: string
          organization_id: string
          processed?: boolean | null
          user_id?: string | null
        }
        Update: {
          amount_change?: number | null
          created_at?: string
          effective_date?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          organization_id?: string
          processed?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_exemptions: {
        Row: {
          created_at: string
          exemption_type: string
          exemption_value: number
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          organization_id: string
          reason: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          exemption_type?: string
          exemption_value?: number
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          reason?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          exemption_type?: string
          exemption_value?: number
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_exemptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_usage: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          created_at: string
          id: string
          organization_id: string | null
          usage_type: string
          usage_value: number
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          id?: string
          organization_id?: string | null
          usage_type: string
          usage_value: number
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          usage_type?: string
          usage_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_contacts: {
        Row: {
          created_at: string
          customer_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["user_id"]
          },
        ]
      }
      customer_sites: {
        Row: {
          address: Json | null
          created_at: string
          customer_id: string
          id: string
          name: string | null
        }
        Insert: {
          address?: Json | null
          created_at?: string
          customer_id: string
          id?: string
          name?: string | null
        }
        Update: {
          address?: Json | null
          created_at?: string
          customer_id?: string
          id?: string
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_sites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor: {
        Row: {
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          regions: string[] | null
          website: string | null
        }
        Insert: {
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          regions?: string[] | null
          website?: string | null
        }
        Update: {
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          regions?: string[] | null
          website?: string | null
        }
        Relationships: []
      }
      distributor_listing: {
        Row: {
          distributor_id: string
          id: string
          part_id: string
          sku: string | null
        }
        Insert: {
          distributor_id: string
          id?: string
          part_id: string
          sku?: string | null
        }
        Update: {
          distributor_id?: string
          id?: string
          part_id?: string
          sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distributor_listing_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributor_listing_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "part"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          created_at: string
          custom_attributes: Json | null
          customer_id: string | null
          default_pm_template_id: string | null
          id: string
          image_url: string | null
          import_id: string | null
          installation_date: string
          last_known_location: Json | null
          last_maintenance: string | null
          last_maintenance_work_order_id: string | null
          location: string
          manufacturer: string
          model: string
          name: string
          notes: string | null
          organization_id: string
          serial_number: string
          status: Database["public"]["Enums"]["equipment_status"]
          team_id: string | null
          updated_at: string
          warranty_expiration: string | null
          working_hours: number | null
        }
        Insert: {
          created_at?: string
          custom_attributes?: Json | null
          customer_id?: string | null
          default_pm_template_id?: string | null
          id?: string
          image_url?: string | null
          import_id?: string | null
          installation_date: string
          last_known_location?: Json | null
          last_maintenance?: string | null
          last_maintenance_work_order_id?: string | null
          location: string
          manufacturer: string
          model: string
          name: string
          notes?: string | null
          organization_id: string
          serial_number: string
          status?: Database["public"]["Enums"]["equipment_status"]
          team_id?: string | null
          updated_at?: string
          warranty_expiration?: string | null
          working_hours?: number | null
        }
        Update: {
          created_at?: string
          custom_attributes?: Json | null
          customer_id?: string | null
          default_pm_template_id?: string | null
          id?: string
          image_url?: string | null
          import_id?: string | null
          installation_date?: string
          last_known_location?: Json | null
          last_maintenance?: string | null
          last_maintenance_work_order_id?: string | null
          location?: string
          manufacturer?: string
          model?: string
          name?: string
          notes?: string | null
          organization_id?: string
          serial_number?: string
          status?: Database["public"]["Enums"]["equipment_status"]
          team_id?: string | null
          updated_at?: string
          warranty_expiration?: string | null
          working_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_default_pm_template_id_fkey"
            columns: ["default_pm_template_id"]
            isOneToOne: false
            referencedRelation: "pm_checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_default_pm_template_id_fkey"
            columns: ["default_pm_template_id"]
            isOneToOne: false
            referencedRelation: "pm_templates_check"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_last_maintenance_work_order_id_fkey"
            columns: ["last_maintenance_work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_note_images: {
        Row: {
          created_at: string
          description: string | null
          equipment_note_id: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          uploaded_by: string
          uploaded_by_name: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          equipment_note_id: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          uploaded_by: string
          uploaded_by_name?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          equipment_note_id?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          uploaded_by?: string
          uploaded_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_note_images_equipment_note_id_fkey"
            columns: ["equipment_note_id"]
            isOneToOne: false
            referencedRelation: "equipment_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_note_images_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_note_images_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["user_id"]
          },
        ]
      }
      equipment_notes: {
        Row: {
          author_id: string
          author_name: string | null
          content: string
          created_at: string
          equipment_id: string
          hours_worked: number | null
          id: string
          is_private: boolean
          last_modified_at: string | null
          last_modified_by: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name?: string | null
          content: string
          created_at?: string
          equipment_id: string
          hours_worked?: number | null
          id?: string
          is_private?: boolean
          last_modified_at?: string | null
          last_modified_by?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name?: string | null
          content?: string
          created_at?: string
          equipment_id?: string
          hours_worked?: number | null
          id?: string
          is_private?: boolean
          last_modified_at?: string | null
          last_modified_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "equipment_notes_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_notes_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_notes_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["user_id"]
          },
        ]
      }
      equipment_part_compatibility: {
        Row: {
          equipment_id: string
          inventory_item_id: string
        }
        Insert: {
          equipment_id: string
          inventory_item_id: string
        }
        Update: {
          equipment_id?: string
          inventory_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_part_compatibility_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_part_compatibility_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_working_hours_history: {
        Row: {
          created_at: string
          equipment_id: string
          hours_added: number | null
          id: string
          new_hours: number
          notes: string | null
          old_hours: number | null
          update_source: string
          updated_by: string
          updated_by_name: string | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string
          equipment_id: string
          hours_added?: number | null
          id?: string
          new_hours: number
          notes?: string | null
          old_hours?: number | null
          update_source?: string
          updated_by: string
          updated_by_name?: string | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string
          equipment_id?: string
          hours_added?: number | null
          id?: string
          new_hours?: number
          notes?: string | null
          old_hours?: number | null
          update_source?: string
          updated_by?: string
          updated_by_name?: string | null
          work_order_id?: string | null
        }
        Relationships: []
      }
      export_request_log: {
        Row: {
          completed_at: string | null
          id: string
          organization_id: string
          report_type: string
          requested_at: string
          row_count: number
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          organization_id: string
          report_type: string
          requested_at?: string
          row_count?: number
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          organization_id?: string
          report_type?: string
          requested_at?: string
          row_count?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_request_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      geocoded_locations: {
        Row: {
          created_at: string
          formatted_address: string | null
          id: string
          input_text: string
          latitude: number
          longitude: number
          normalized_text: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          formatted_address?: string | null
          id?: string
          input_text: string
          latitude: number
          longitude: number
          normalized_text: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          formatted_address?: string | null
          id?: string
          input_text?: string
          latitude?: number
          longitude?: number
          normalized_text?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geocoded_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      google_workspace_credentials: {
        Row: {
          access_token_expires_at: string
          created_at: string
          customer_id: string | null
          domain: string
          id: string
          organization_id: string
          refresh_token: string
          scopes: string | null
          updated_at: string
        }
        Insert: {
          access_token_expires_at: string
          created_at?: string
          customer_id?: string | null
          domain: string
          id?: string
          organization_id: string
          refresh_token: string
          scopes?: string | null
          updated_at?: string
        }
        Update: {
          access_token_expires_at?: string
          created_at?: string
          customer_id?: string | null
          domain?: string
          id?: string
          organization_id?: string
          refresh_token?: string
          scopes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_workspace_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      google_workspace_directory_users: {
        Row: {
          created_at: string
          family_name: string | null
          full_name: string | null
          given_name: string | null
          google_user_id: string
          id: string
          last_synced_at: string | null
          org_unit_path: string | null
          organization_id: string
          primary_email: string
          suspended: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          family_name?: string | null
          full_name?: string | null
          given_name?: string | null
          google_user_id: string
          id?: string
          last_synced_at?: string | null
          org_unit_path?: string | null
          organization_id: string
          primary_email: string
          suspended?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          family_name?: string | null
          full_name?: string | null
          given_name?: string | null
          google_user_id?: string
          id?: string
          last_synced_at?: string | null
          org_unit_path?: string | null
          organization_id?: string
          primary_email?: string
          suspended?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_workspace_directory_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      google_workspace_oauth_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          nonce: string
          organization_id: string | null
          origin_url: string | null
          redirect_url: string | null
          session_token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          nonce: string
          organization_id?: string | null
          origin_url?: string | null
          redirect_url?: string | null
          session_token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          nonce?: string
          organization_id?: string | null
          origin_url?: string | null
          redirect_url?: string | null
          session_token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_workspace_oauth_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          created_at: string
          created_by: string
          default_unit_cost: number | null
          description: string | null
          external_id: string | null
          id: string
          image_url: string | null
          location: string | null
          low_stock_threshold: number
          name: string
          organization_id: string
          quantity_on_hand: number
          sku: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          default_unit_cost?: number | null
          description?: string | null
          external_id?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          low_stock_threshold?: number
          name: string
          organization_id: string
          quantity_on_hand?: number
          sku?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          default_unit_cost?: number | null
          description?: string | null
          external_id?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          low_stock_threshold?: number
          name?: string
          organization_id?: string
          quantity_on_hand?: number
          sku?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          change_amount: number
          created_at: string
          id: string
          inventory_item_id: string
          new_quantity: number
          notes: string | null
          organization_id: string
          previous_quantity: number
          transaction_type: Database["public"]["Enums"]["inventory_transaction_type"]
          user_id: string
          user_name: string | null
          work_order_id: string | null
        }
        Insert: {
          change_amount: number
          created_at?: string
          id?: string
          inventory_item_id: string
          new_quantity: number
          notes?: string | null
          organization_id: string
          previous_quantity: number
          transaction_type: Database["public"]["Enums"]["inventory_transaction_type"]
          user_id: string
          user_name?: string | null
          work_order_id?: string | null
        }
        Update: {
          change_amount?: number
          created_at?: string
          id?: string
          inventory_item_id?: string
          new_quantity?: number
          notes?: string | null
          organization_id?: string
          previous_quantity?: number
          transaction_type?: Database["public"]["Enums"]["inventory_transaction_type"]
          user_id?: string
          user_name?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_performance_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          execution_time_ms: number
          function_name: string
          id: string
          success: boolean
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          execution_time_ms: number
          function_name: string
          id?: string
          success: boolean
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number
          function_name?: string
          id?: string
          success?: boolean
        }
        Relationships: []
      }
      member_removal_audit: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          new_manager_id: string | null
          organization_id: string
          removal_reason: string | null
          removed_by: string
          removed_user_id: string
          removed_user_name: string
          removed_user_role: string
          teams_transferred: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_manager_id?: string | null
          organization_id: string
          removal_reason?: string | null
          removed_by: string
          removed_user_id: string
          removed_user_name: string
          removed_user_role: string
          teams_transferred?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_manager_id?: string | null
          organization_id?: string
          removal_reason?: string | null
          removed_by?: string
          removed_user_id?: string
          removed_user_name?: string
          removed_user_role?: string
          teams_transferred?: number | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          author_id: string
          author_name: string | null
          content: string
          created_at: string
          equipment_id: string
          id: string
          is_private: boolean
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name?: string | null
          content: string
          created_at?: string
          equipment_id: string
          id?: string
          is_private?: boolean
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name?: string | null
          content?: string
          created_at?: string
          equipment_id?: string
          id?: string
          is_private?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notes_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_billing: boolean | null
          email_equipment_alerts: boolean | null
          email_invitations: boolean | null
          email_work_orders: boolean | null
          id: string
          push_notifications: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_billing?: boolean | null
          email_equipment_alerts?: boolean | null
          email_invitations?: boolean | null
          email_work_orders?: boolean | null
          id?: string
          push_notifications?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_billing?: boolean | null
          email_equipment_alerts?: boolean | null
          email_invitations?: boolean | null
          email_work_orders?: boolean | null
          id?: string
          push_notifications?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          organization_id: string
          statuses: Json
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          organization_id: string
          statuses?: Json
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          organization_id?: string
          statuses?: Json
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_settings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_global: boolean
          message: string
          organization_id: string
          read: boolean
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_global?: boolean
          message: string
          organization_id: string
          read?: boolean
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_global?: boolean
          message?: string
          organization_id?: string
          read?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          declined_at: string | null
          email: string
          expired_at: string | null
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string
          message: string | null
          offers_account_creation: boolean | null
          organization_id: string
          role: string
          slot_purchase_id: string | null
          slot_reserved: boolean | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          declined_at?: string | null
          email: string
          expired_at?: string | null
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by: string
          message?: string | null
          offers_account_creation?: boolean | null
          organization_id: string
          role: string
          slot_purchase_id?: string | null
          slot_reserved?: boolean | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          declined_at?: string | null
          email?: string
          expired_at?: string | null
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string
          message?: string | null
          offers_account_creation?: boolean | null
          organization_id?: string
          role?: string
          slot_purchase_id?: string | null
          slot_reserved?: boolean | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_slot_purchase_id_fkey"
            columns: ["slot_purchase_id"]
            isOneToOne: false
            referencedRelation: "slot_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_member_claims: {
        Row: {
          claimed_at: string | null
          claimed_user_id: string | null
          created_at: string
          created_by: string
          email: string
          id: string
          organization_id: string
          source: string
          status: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_user_id?: string | null
          created_at?: string
          created_by: string
          email: string
          id?: string
          organization_id: string
          source?: string
          status?: string
        }
        Update: {
          claimed_at?: string | null
          claimed_user_id?: string | null
          created_at?: string
          created_by?: string
          email?: string
          id?: string
          organization_id?: string
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_member_claims_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          activated_slot_at: string | null
          can_manage_quickbooks: boolean
          id: string
          joined_date: string
          organization_id: string
          role: string
          slot_purchase_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          activated_slot_at?: string | null
          can_manage_quickbooks?: boolean
          id?: string
          joined_date?: string
          organization_id: string
          role?: string
          slot_purchase_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          activated_slot_at?: string | null
          can_manage_quickbooks?: boolean
          id?: string
          joined_date?: string
          organization_id?: string
          role?: string
          slot_purchase_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_slot_purchase_id_fkey"
            columns: ["slot_purchase_id"]
            isOneToOne: false
            referencedRelation: "slot_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["user_id"]
          },
        ]
      }
      organization_role_grants_pending: {
        Row: {
          applied_at: string | null
          applied_user_id: string | null
          created_at: string
          created_by: string
          desired_role: string
          email: string
          id: string
          organization_id: string
          revoked_at: string | null
          status: string
        }
        Insert: {
          applied_at?: string | null
          applied_user_id?: string | null
          created_at?: string
          created_by: string
          desired_role?: string
          email: string
          id?: string
          organization_id: string
          revoked_at?: string | null
          status?: string
        }
        Update: {
          applied_at?: string | null
          applied_user_id?: string | null
          created_at?: string
          created_by?: string
          desired_role?: string
          email?: string
          id?: string
          organization_id?: string
          revoked_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_role_grants_pending_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_slots: {
        Row: {
          amount_paid_cents: number
          auto_renew: boolean | null
          billing_period_end: string
          billing_period_start: string
          created_at: string
          id: string
          organization_id: string
          purchased_slots: number
          slot_type: string
          stripe_payment_intent_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          used_slots: number
        }
        Insert: {
          amount_paid_cents?: number
          auto_renew?: boolean | null
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          id?: string
          organization_id: string
          purchased_slots?: number
          slot_type?: string
          stripe_payment_intent_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          used_slots?: number
        }
        Update: {
          amount_paid_cents?: number
          auto_renew?: boolean | null
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          id?: string
          organization_id?: string
          purchased_slots?: number
          slot_type?: string
          stripe_payment_intent_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          used_slots?: number
        }
        Relationships: [
          {
            foreignKeyName: "organization_slots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_subscriptions: {
        Row: {
          billing_cycle: string
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          feature_type: string
          id: string
          organization_id: string | null
          quantity: number | null
          status: string
          stripe_subscription_id: string | null
          unit_price_cents: number
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          feature_type: string
          id?: string
          organization_id?: string | null
          quantity?: number | null
          status?: string
          stripe_subscription_id?: string | null
          unit_price_cents: number
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          feature_type?: string
          id?: string
          organization_id?: string | null
          quantity?: number | null
          status?: string
          stripe_subscription_id?: string | null
          unit_price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          background_color: string | null
          billable_members: number | null
          billing_cycle: string | null
          created_at: string
          customers_feature_enabled: boolean | null
          features: string[]
          fleet_map_enabled: boolean | null
          id: string
          last_billing_calculation: string | null
          logo: string | null
          max_members: number
          member_count: number
          name: string
          next_billing_date: string | null
          plan: Database["public"]["Enums"]["organization_plan"]
          storage_used_mb: number | null
          updated_at: string
        }
        Insert: {
          background_color?: string | null
          billable_members?: number | null
          billing_cycle?: string | null
          created_at?: string
          customers_feature_enabled?: boolean | null
          features?: string[]
          fleet_map_enabled?: boolean | null
          id?: string
          last_billing_calculation?: string | null
          logo?: string | null
          max_members?: number
          member_count?: number
          name: string
          next_billing_date?: string | null
          plan?: Database["public"]["Enums"]["organization_plan"]
          storage_used_mb?: number | null
          updated_at?: string
        }
        Update: {
          background_color?: string | null
          billable_members?: number | null
          billing_cycle?: string | null
          created_at?: string
          customers_feature_enabled?: boolean | null
          features?: string[]
          fleet_map_enabled?: boolean | null
          id?: string
          last_billing_calculation?: string | null
          logo?: string | null
          max_members?: number
          member_count?: number
          name?: string
          next_billing_date?: string | null
          plan?: Database["public"]["Enums"]["organization_plan"]
          storage_used_mb?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ownership_transfer_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          departing_owner_role: string | null
          expires_at: string
          from_user_id: string
          from_user_name: string
          id: string
          organization_id: string
          responded_at: string | null
          response_reason: string | null
          status: string
          to_user_id: string
          to_user_name: string
          transfer_reason: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          departing_owner_role?: string | null
          expires_at?: string
          from_user_id: string
          from_user_name: string
          id?: string
          organization_id: string
          responded_at?: string | null
          response_reason?: string | null
          status?: string
          to_user_id: string
          to_user_name: string
          transfer_reason?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          departing_owner_role?: string | null
          expires_at?: string
          from_user_id?: string
          from_user_name?: string
          id?: string
          organization_id?: string
          responded_at?: string | null
          response_reason?: string | null
          status?: string
          to_user_id?: string
          to_user_name?: string
          transfer_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ownership_transfer_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      part: {
        Row: {
          attributes: Json | null
          brand: string | null
          canonical_mpn: string
          category: string | null
          created_at: string | null
          description: string | null
          fitment: Json | null
          id: string
          synonyms: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          attributes?: Json | null
          brand?: string | null
          canonical_mpn: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          fitment?: Json | null
          id?: string
          synonyms?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          attributes?: Json | null
          brand?: string | null
          canonical_mpn?: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          fitment?: Json | null
          id?: string
          synonyms?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      part_alternate_group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          inventory_item_id: string | null
          is_primary: boolean
          notes: string | null
          part_identifier_id: string | null
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          inventory_item_id?: string | null
          is_primary?: boolean
          notes?: string | null
          part_identifier_id?: string | null
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          inventory_item_id?: string | null
          is_primary?: boolean
          notes?: string | null
          part_identifier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "part_alternate_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "part_alternate_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_alternate_group_members_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_alternate_group_members_part_identifier_id_fkey"
            columns: ["part_identifier_id"]
            isOneToOne: false
            referencedRelation: "part_identifiers"
            referencedColumns: ["id"]
          },
        ]
      }
      part_alternate_groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          evidence_url: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          status: Database["public"]["Enums"]["verification_status"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          evidence_url?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          evidence_url?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "part_alternate_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      part_compatibility_rules: {
        Row: {
          created_at: string
          created_by: string | null
          evidence_url: string | null
          id: string
          inventory_item_id: string
          manufacturer: string
          manufacturer_norm: string
          match_type: Database["public"]["Enums"]["model_match_type"]
          model: string | null
          model_norm: string | null
          model_pattern_norm: string | null
          model_pattern_raw: string | null
          notes: string | null
          status: Database["public"]["Enums"]["verification_status"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          evidence_url?: string | null
          id?: string
          inventory_item_id: string
          manufacturer: string
          manufacturer_norm: string
          match_type?: Database["public"]["Enums"]["model_match_type"]
          model?: string | null
          model_norm?: string | null
          model_pattern_norm?: string | null
          model_pattern_raw?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          evidence_url?: string | null
          id?: string
          inventory_item_id?: string
          manufacturer?: string
          manufacturer_norm?: string
          match_type?: Database["public"]["Enums"]["model_match_type"]
          model?: string | null
          model_norm?: string | null
          model_pattern_norm?: string | null
          model_pattern_raw?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "part_compatibility_rules_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      part_identifier: {
        Row: {
          id: string
          id_type: string | null
          normalized_value: string
          part_id: string
          value: string
        }
        Insert: {
          id?: string
          id_type?: string | null
          normalized_value: string
          part_id: string
          value: string
        }
        Update: {
          id?: string
          id_type?: string | null
          normalized_value?: string
          part_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_identifier_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "part"
            referencedColumns: ["id"]
          },
        ]
      }
      part_identifiers: {
        Row: {
          created_at: string
          created_by: string
          id: string
          identifier_type: Database["public"]["Enums"]["part_identifier_type"]
          inventory_item_id: string | null
          manufacturer: string | null
          norm_value: string
          notes: string | null
          organization_id: string
          raw_value: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          identifier_type: Database["public"]["Enums"]["part_identifier_type"]
          inventory_item_id?: string | null
          manufacturer?: string | null
          norm_value: string
          notes?: string | null
          organization_id: string
          raw_value: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          identifier_type?: Database["public"]["Enums"]["part_identifier_type"]
          inventory_item_id?: string | null
          manufacturer?: string | null
          norm_value?: string
          notes?: string | null
          organization_id?: string
          raw_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_identifiers_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_identifiers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      parts_managers: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          organization_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          organization_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parts_managers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_organizations: {
        Row: {
          created_at: string
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_checklist_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_protected: boolean
          name: string
          organization_id: string | null
          template_data: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_protected?: boolean
          name: string
          organization_id?: string | null
          template_data?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_protected?: boolean
          name?: string
          organization_id?: string | null
          template_data?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_checklist_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_checklist_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pm_checklist_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_checklist_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_checklist_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["user_id"]
          },
        ]
      }
      pm_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          created_at: string
          id: string
          metadata: Json | null
          new_status: string
          old_status: string | null
          pm_id: string
          reason: string | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_status: string
          old_status?: string | null
          pm_id: string
          reason?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_status?: string
          old_status?: string | null
          pm_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pm_status_history_pm_id_fkey"
            columns: ["pm_id"]
            isOneToOne: false
            referencedRelation: "preventative_maintenance"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_template_compatibility_rules: {
        Row: {
          created_at: string
          id: string
          manufacturer: string
          manufacturer_norm: string
          model: string | null
          model_norm: string | null
          organization_id: string
          pm_template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manufacturer: string
          manufacturer_norm: string
          model?: string | null
          model_norm?: string | null
          organization_id: string
          pm_template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manufacturer?: string
          manufacturer_norm?: string
          model?: string | null
          model_norm?: string | null
          organization_id?: string
          pm_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_template_compatibility_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_template_compatibility_rules_pm_template_id_fkey"
            columns: ["pm_template_id"]
            isOneToOne: false
            referencedRelation: "pm_checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_template_compatibility_rules_pm_template_id_fkey"
            columns: ["pm_template_id"]
            isOneToOne: false
            referencedRelation: "pm_templates_check"
            referencedColumns: ["id"]
          },
        ]
      }
      preventative_maintenance: {
        Row: {
          checklist_data: Json
          completed_at: string | null
          completed_by: string | null
          completed_by_name: string | null
          created_at: string
          created_by: string
          created_by_name: string | null
          equipment_id: string
          historical_completion_date: string | null
          historical_notes: string | null
          id: string
          is_historical: boolean
          notes: string | null
          organization_id: string
          status: string
          template_id: string | null
          updated_at: string
          work_order_id: string
        }
        Insert: {
          checklist_data?: Json
          completed_at?: string | null
          completed_by?: string | null
          completed_by_name?: string | null
          created_at?: string
          created_by: string
          created_by_name?: string | null
          equipment_id: string
          historical_completion_date?: string | null
          historical_notes?: string | null
          id?: string
          is_historical?: boolean
          notes?: string | null
          organization_id: string
          status?: string
          template_id?: string | null
          updated_at?: string
          work_order_id: string
        }
        Update: {
          checklist_data?: Json
          completed_at?: string | null
          completed_by?: string | null
          completed_by_name?: string | null
          created_at?: string
          created_by?: string
          created_by_name?: string | null
          equipment_id?: string
          historical_completion_date?: string | null
          historical_notes?: string | null
          id?: string
          is_historical?: boolean
          notes?: string | null
          organization_id?: string
          status?: string
          template_id?: string | null
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pm_equipment"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pm_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pm_work_order"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventative_maintenance_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pm_checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventative_maintenance_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pm_templates_check"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          email_private: boolean | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_private?: boolean | null
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          email_private?: boolean | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quickbooks_credentials: {
        Row: {
          access_token: string
          access_token_expires_at: string
          created_at: string
          id: string
          organization_id: string
          realm_id: string
          refresh_token: string
          refresh_token_expires_at: string
          scopes: string
          token_type: string
          updated_at: string
        }
        Insert: {
          access_token: string
          access_token_expires_at: string
          created_at?: string
          id?: string
          organization_id: string
          realm_id: string
          refresh_token: string
          refresh_token_expires_at: string
          scopes?: string
          token_type?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          access_token_expires_at?: string
          created_at?: string
          id?: string
          organization_id?: string
          realm_id?: string
          refresh_token?: string
          refresh_token_expires_at?: string
          scopes?: string
          token_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_export_logs: {
        Row: {
          created_at: string
          error_message: string | null
          exported_at: string | null
          id: string
          intuit_tid: string | null
          organization_id: string
          pdf_attachment_error: string | null
          pdf_attachment_intuit_tid: string | null
          pdf_attachment_status: string | null
          quickbooks_environment: string | null
          quickbooks_invoice_id: string | null
          quickbooks_invoice_number: string | null
          realm_id: string
          status: string
          updated_at: string
          work_order_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          exported_at?: string | null
          id?: string
          intuit_tid?: string | null
          organization_id: string
          pdf_attachment_error?: string | null
          pdf_attachment_intuit_tid?: string | null
          pdf_attachment_status?: string | null
          quickbooks_environment?: string | null
          quickbooks_invoice_id?: string | null
          quickbooks_invoice_number?: string | null
          realm_id: string
          status: string
          updated_at?: string
          work_order_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          exported_at?: string | null
          id?: string
          intuit_tid?: string | null
          organization_id?: string
          pdf_attachment_error?: string | null
          pdf_attachment_intuit_tid?: string | null
          pdf_attachment_status?: string | null
          quickbooks_environment?: string | null
          quickbooks_invoice_id?: string | null
          quickbooks_invoice_number?: string | null
          realm_id?: string
          status?: string
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_export_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quickbooks_export_logs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_oauth_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          nonce: string
          organization_id: string
          origin_url: string | null
          redirect_url: string | null
          session_token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          nonce: string
          organization_id: string
          origin_url?: string | null
          redirect_url?: string | null
          session_token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          nonce?: string
          organization_id?: string
          origin_url?: string | null
          redirect_url?: string | null
          session_token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_oauth_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_team_customers: {
        Row: {
          created_at: string
          display_name: string
          id: string
          organization_id: string
          quickbooks_customer_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          organization_id: string
          quickbooks_customer_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          organization_id?: string
          quickbooks_customer_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_team_customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quickbooks_team_customers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      scans: {
        Row: {
          equipment_id: string
          id: string
          location: string | null
          notes: string | null
          scanned_at: string
          scanned_by: string
          scanned_by_name: string | null
        }
        Insert: {
          equipment_id: string
          id?: string
          location?: string | null
          notes?: string | null
          scanned_at?: string
          scanned_by: string
          scanned_by_name?: string | null
        }
        Update: {
          equipment_id?: string
          id?: string
          location?: string | null
          notes?: string | null
          scanned_at?: string
          scanned_by?: string
          scanned_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scans_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["user_id"]
          },
        ]
      }
      slot_purchases: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          created_at: string
          id: string
          organization_id: string
          purchased_by: string
          quantity: number
          slot_type: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          total_amount_cents: number
          unit_price_cents: number
          updated_at: string
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          id?: string
          organization_id: string
          purchased_by: string
          quantity: number
          slot_type?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_amount_cents: number
          unit_price_cents?: number
          updated_at?: string
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          id?: string
          organization_id?: string
          purchased_by?: string
          quantity?: number
          slot_type?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_amount_cents?: number
          unit_price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slot_purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_purchases_purchased_by_fkey"
            columns: ["purchased_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_purchases_purchased_by_fkey"
            columns: ["purchased_by"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["user_id"]
          },
        ]
      }
      stripe_event_logs: {
        Row: {
          created_at: string
          event_id: string
          id: string
          payload: Json | null
          subscription_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          payload?: Json | null
          subscription_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          payload?: Json | null
          subscription_id?: string | null
          type?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          joined_date: string
          role: Database["public"]["Enums"]["team_member_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_date?: string
          role?: Database["public"]["Enums"]["team_member_role"]
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_date?: string
          role?: Database["public"]["Enums"]["team_member_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["user_id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          team_lead_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          team_lead_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          team_lead_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_team_lead_id_fkey"
            columns: ["team_lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_team_lead_id_fkey"
            columns: ["team_lead_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string
          description: string
          github_issue_number: number | null
          id: string
          metadata: Json | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          github_issue_number?: number | null
          id?: string
          metadata?: Json | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          github_issue_number?: number | null
          id?: string
          metadata?: Json | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_departure_queue: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          last_batch_at: string | null
          organization_id: string
          retry_count: number | null
          started_at: string | null
          status: string
          tables_to_process: Json
          user_email: string
          user_id: string
          user_name: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          last_batch_at?: string | null
          organization_id: string
          retry_count?: number | null
          started_at?: string | null
          status?: string
          tables_to_process?: Json
          user_email: string
          user_id: string
          user_name: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          last_batch_at?: string | null
          organization_id?: string
          retry_count?: number | null
          started_at?: string | null
          status?: string
          tables_to_process?: Json
          user_email?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_departure_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_license_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          organization_id: string
          quantity: number
          status: string
          stripe_customer_id: string
          stripe_price_id: string
          stripe_subscription_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end: string
          current_period_start: string
          id?: string
          organization_id: string
          quantity?: number
          status?: string
          stripe_customer_id: string
          stripe_price_id: string
          stripe_subscription_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          organization_id?: string
          quantity?: number
          status?: string
          stripe_customer_id?: string
          stripe_price_id?: string
          stripe_subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_license_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          event_id: string
          processed_at: string
        }
        Insert: {
          event_id: string
          processed_at?: string
        }
        Update: {
          event_id?: string
          processed_at?: string
        }
        Relationships: []
      }
      work_order_costs: {
        Row: {
          created_at: string
          created_by: string
          created_by_name: string | null
          description: string
          id: string
          inventory_item_id: string | null
          original_quantity: number | null
          quantity: number
          total_price_cents: number | null
          unit_price_cents: number
          updated_at: string
          work_order_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          created_by_name?: string | null
          description: string
          id?: string
          inventory_item_id?: string | null
          original_quantity?: number | null
          quantity?: number
          total_price_cents?: number | null
          unit_price_cents?: number
          updated_at?: string
          work_order_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          created_by_name?: string | null
          description?: string
          id?: string
          inventory_item_id?: string | null
          original_quantity?: number | null
          quantity?: number
          total_price_cents?: number | null
          unit_price_cents?: number
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_costs_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_costs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_equipment: {
        Row: {
          created_at: string
          equipment_id: string
          id: string
          is_primary: boolean
          work_order_id: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          id?: string
          is_primary?: boolean
          work_order_id: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          id?: string
          is_primary?: boolean
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_equipment_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_images: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          note_id: string | null
          uploaded_by: string
          uploaded_by_name: string | null
          work_order_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          note_id?: string | null
          uploaded_by: string
          uploaded_by_name?: string | null
          work_order_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          note_id?: string | null
          uploaded_by?: string
          uploaded_by_name?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_images_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "work_order_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_notes: {
        Row: {
          author_id: string
          author_name: string | null
          content: string
          created_at: string
          hours_worked: number | null
          id: string
          is_private: boolean
          updated_at: string
          work_order_id: string
        }
        Insert: {
          author_id: string
          author_name?: string | null
          content: string
          created_at?: string
          hours_worked?: number | null
          id?: string
          is_private?: boolean
          updated_at?: string
          work_order_id: string
        }
        Update: {
          author_id?: string
          author_name?: string | null
          content?: string
          created_at?: string
          hours_worked?: number | null
          id?: string
          is_private?: boolean
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_work_order_notes_author"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_work_order_notes_author"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["user_id"]
          },
        ]
      }
      work_order_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          changed_by_name: string | null
          created_at: string
          id: string
          is_historical_creation: boolean | null
          metadata: Json | null
          new_status: Database["public"]["Enums"]["work_order_status"]
          old_status: Database["public"]["Enums"]["work_order_status"] | null
          reason: string | null
          work_order_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          changed_by_name?: string | null
          created_at?: string
          id?: string
          is_historical_creation?: boolean | null
          metadata?: Json | null
          new_status: Database["public"]["Enums"]["work_order_status"]
          old_status?: Database["public"]["Enums"]["work_order_status"] | null
          reason?: string | null
          work_order_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          changed_by_name?: string | null
          created_at?: string
          id?: string
          is_historical_creation?: boolean | null
          metadata?: Json | null
          new_status?: Database["public"]["Enums"]["work_order_status"]
          old_status?: Database["public"]["Enums"]["work_order_status"] | null
          reason?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "work_order_status_history_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          acceptance_date: string | null
          assignee_id: string | null
          assignee_name: string | null
          completed_date: string | null
          created_by: string
          created_by_admin: string | null
          created_by_name: string | null
          created_date: string
          description: string
          due_date: string | null
          equipment_id: string
          equipment_working_hours_at_creation: number | null
          estimated_hours: number | null
          has_pm: boolean
          historical_notes: string | null
          historical_start_date: string | null
          id: string
          is_historical: boolean
          organization_id: string
          pm_required: boolean
          priority: Database["public"]["Enums"]["work_order_priority"]
          status: Database["public"]["Enums"]["work_order_status"]
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          acceptance_date?: string | null
          assignee_id?: string | null
          assignee_name?: string | null
          completed_date?: string | null
          created_by: string
          created_by_admin?: string | null
          created_by_name?: string | null
          created_date?: string
          description: string
          due_date?: string | null
          equipment_id: string
          equipment_working_hours_at_creation?: number | null
          estimated_hours?: number | null
          has_pm?: boolean
          historical_notes?: string | null
          historical_start_date?: string | null
          id?: string
          is_historical?: boolean
          organization_id: string
          pm_required?: boolean
          priority?: Database["public"]["Enums"]["work_order_priority"]
          status?: Database["public"]["Enums"]["work_order_status"]
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          acceptance_date?: string | null
          assignee_id?: string | null
          assignee_name?: string | null
          completed_date?: string | null
          created_by?: string
          created_by_admin?: string | null
          created_by_name?: string | null
          created_date?: string
          description?: string
          due_date?: string | null
          equipment_id?: string
          equipment_working_hours_at_creation?: number | null
          estimated_hours?: number | null
          has_pm?: boolean
          historical_notes?: string | null
          historical_start_date?: string | null
          id?: string
          is_historical?: boolean
          organization_id?: string
          pm_required?: boolean
          priority?: Database["public"]["Enums"]["work_order_priority"]
          status?: Database["public"]["Enums"]["work_order_status"]
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "work_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "work_orders_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_domains: {
        Row: {
          created_at: string
          domain: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          domain: string
          organization_id: string
        }
        Update: {
          created_at?: string
          domain?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_domains_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_personal_org_merge_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          request_reason: string | null
          requested_by_name: string
          requested_by_user_id: string
          requested_for_name: string
          requested_for_user_id: string
          responded_at: string | null
          response_reason: string | null
          status: string
          workspace_org_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          request_reason?: string | null
          requested_by_name: string
          requested_by_user_id: string
          requested_for_name: string
          requested_for_user_id: string
          responded_at?: string | null
          response_reason?: string | null
          status?: string
          workspace_org_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          request_reason?: string | null
          requested_by_name?: string
          requested_by_user_id?: string
          requested_for_name?: string
          requested_for_user_id?: string
          responded_at?: string | null
          response_reason?: string | null
          status?: string
          workspace_org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_personal_org_merge_requests_workspace_org_id_fkey"
            columns: ["workspace_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      pm_templates_check: {
        Row: {
          checklist_item_count: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string | null
          is_protected: boolean | null
          is_valid: boolean | null
          name: string | null
          organization_id: string | null
          template_data: Json | null
          updated_at: string | null
        }
        Insert: {
          checklist_item_count?: never
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          is_protected?: boolean | null
          is_valid?: never
          name?: string | null
          organization_id?: string | null
          template_data?: Json | null
          updated_at?: string | null
        }
        Update: {
          checklist_item_count?: never
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          is_protected?: boolean | null
          is_valid?: never
          name?: string | null
          organization_id?: string | null
          template_data?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_checklist_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_checklist_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pm_checklist_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_entitlements: {
        Row: {
          granted_at: string | null
          is_active: boolean | null
          plan: string | null
          subscription_end: string | null
          user_id: string | null
        }
        Insert: {
          granted_at?: never
          is_active?: never
          plan?: never
          subscription_end?: never
          user_id?: string | null
        }
        Update: {
          granted_at?: never
          is_active?: never
          plan?: never
          subscription_end?: never
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation_atomic: {
        Args: { p_invitation_token: string; p_user_id?: string }
        Returns: Json
      }
      adjust_inventory_quantity: {
        Args: {
          p_delta: number
          p_item_id: string
          p_reason: string
          p_work_order_id?: string
        }
        Returns: number
      }
      apply_pending_admin_grants_for_user: {
        Args: { p_user_id: string }
        Returns: number
      }
      auto_provision_workspace_organization: {
        Args: {
          p_domain: string
          p_organization_name: string
          p_user_id: string
        }
        Returns: {
          already_existed: boolean
          domain: string
          organization_id: string
        }[]
      }
      backfill_user_profile_and_org: {
        Args: { user_id_val: string }
        Returns: Json
      }
      billing_is_disabled: { Args: never; Returns: boolean }
      bulk_set_compatibility_rules: {
        Args: { p_item_id: string; p_organization_id: string; p_rules: Json }
        Returns: number
      }
      bulk_set_pm_template_rules: {
        Args: {
          p_organization_id: string
          p_rules: Json
          p_template_id: string
        }
        Returns: number
      }
      calculate_billable_members: { Args: { org_id: string }; Returns: number }
      calculate_organization_billing: {
        Args: { org_id: string }
        Returns: Json
      }
      can_manage_inventory: {
        Args: { p_organization_id: string; p_user_id?: string }
        Returns: boolean
      }
      can_manage_invitation_atomic: {
        Args: { invitation_id: string; user_uuid: string }
        Returns: boolean
      }
      can_manage_invitation_optimized: {
        Args: { invitation_id: string; user_uuid: string }
        Returns: boolean
      }
      can_manage_invitation_safe: {
        Args: { invitation_id: string; user_uuid: string }
        Returns: boolean
      }
      can_user_manage_quickbooks: {
        Args: { p_organization_id: string; p_user_id: string }
        Returns: boolean
      }
      cancel_ownership_transfer: {
        Args: { p_transfer_id: string }
        Returns: Json
      }
      check_admin_bypass_fixed: {
        Args: { org_id: string; user_uuid: string }
        Returns: boolean
      }
      check_admin_permission_safe: {
        Args: { org_id: string; user_uuid: string }
        Returns: boolean
      }
      check_admin_with_context: {
        Args: { bypass_context?: string; org_id: string; user_uuid: string }
        Returns: boolean
      }
      check_email_exists_in_auth: {
        Args: { p_email: string }
        Returns: boolean
      }
      check_export_rate_limit: {
        Args: { p_organization_id: string; p_user_id: string }
        Returns: boolean
      }
      check_member_bypass_fixed: {
        Args: { org_id: string; user_uuid: string }
        Returns: boolean
      }
      check_org_access_direct: {
        Args: { org_id: string; user_uuid: string }
        Returns: boolean
      }
      check_org_access_secure: {
        Args: { org_id: string; user_uuid: string }
        Returns: boolean
      }
      check_org_admin_secure: {
        Args: { org_id: string; user_uuid: string }
        Returns: boolean
      }
      check_storage_limit: {
        Args: {
          file_size_bytes: number
          max_storage_gb?: number
          org_id: string
        }
        Returns: Json
      }
      check_team_access_secure: {
        Args: { team_uuid: string; user_uuid: string }
        Returns: boolean
      }
      check_team_role_secure: {
        Args: { required_role: string; team_uuid: string; user_uuid: string }
        Returns: boolean
      }
      cleanup_expired_quickbooks_oauth_sessions: {
        Args: never
        Returns: number
      }
      cleanup_old_export_logs: { Args: never; Returns: number }
      cleanup_old_notifications: { Args: never; Returns: undefined }
      clear_rls_context: { Args: never; Returns: undefined }
      count_equipment_matching_pm_rules: {
        Args: { p_organization_id: string; p_rules: Json }
        Returns: number
      }
      count_equipment_matching_rules: {
        Args: { p_organization_id: string; p_rules: Json }
        Returns: number
      }
      create_google_workspace_oauth_session: {
        Args: {
          p_organization_id?: string
          p_origin_url?: string
          p_redirect_url?: string
        }
        Returns: {
          expires_at: string
          nonce: string
          session_token: string
        }[]
      }
      create_historical_work_order_with_pm: {
        Args: {
          p_assignee_id?: string
          p_completed_date?: string
          p_description: string
          p_due_date?: string
          p_equipment_id: string
          p_has_pm?: boolean
          p_historical_notes?: string
          p_historical_start_date: string
          p_organization_id: string
          p_pm_checklist_data?: Json
          p_pm_completion_date?: string
          p_pm_notes?: string
          p_pm_status?: string
          p_priority: Database["public"]["Enums"]["work_order_priority"]
          p_status: Database["public"]["Enums"]["work_order_status"]
          p_team_id?: string
          p_title: string
        }
        Returns: Json
      }
      create_invitation_atomic: {
        Args: {
          p_email: string
          p_invited_by?: string
          p_message?: string
          p_organization_id: string
          p_role: string
        }
        Returns: string
      }
      create_invitation_bypass: {
        Args: {
          p_email: string
          p_invited_by?: string
          p_message?: string
          p_organization_id: string
          p_role: string
        }
        Returns: string
      }
      create_invitation_bypass_optimized: {
        Args: {
          p_email: string
          p_invited_by?: string
          p_message?: string
          p_organization_id: string
          p_role: string
        }
        Returns: string
      }
      create_invitation_with_context: {
        Args: {
          p_email: string
          p_invited_by?: string
          p_message?: string
          p_organization_id: string
          p_role: string
        }
        Returns: string
      }
      create_quickbooks_oauth_session: {
        Args: {
          p_organization_id: string
          p_origin_url?: string
          p_redirect_url?: string
        }
        Returns: {
          expires_at: string
          nonce: string
          session_token: string
        }[]
      }
      create_work_order_notifications: {
        Args: {
          changed_by_user_id: string
          new_status: string
          work_order_uuid: string
        }
        Returns: undefined
      }
      create_workspace_organization_for_domain: {
        Args: { p_domain: string; p_organization_name: string }
        Returns: {
          domain: string
          organization_id: string
        }[]
      }
      delete_organization: {
        Args: {
          p_confirmation_name: string
          p_force?: boolean
          p_organization_id: string
        }
        Returns: Json
      }
      disconnect_google_workspace: {
        Args: { p_also_unclaim_domain?: boolean; p_organization_id: string }
        Returns: Json
      }
      disconnect_quickbooks: {
        Args: { p_organization_id: string; p_realm_id?: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      get_alternates_for_inventory_item: {
        Args: { p_inventory_item_id: string; p_organization_id: string }
        Returns: {
          default_unit_cost: number
          group_id: string
          group_name: string
          group_notes: string
          group_status: Database["public"]["Enums"]["verification_status"]
          group_verified: boolean
          identifier_id: string
          identifier_manufacturer: string
          identifier_type: Database["public"]["Enums"]["part_identifier_type"]
          identifier_value: string
          image_url: string
          inventory_item_id: string
          inventory_name: string
          inventory_sku: string
          is_in_stock: boolean
          is_low_stock: boolean
          is_primary: boolean
          is_source_item: boolean
          location: string
          low_stock_threshold: number
          quantity_on_hand: number
        }[]
      }
      get_alternates_for_part_number: {
        Args: { p_organization_id: string; p_part_number: string }
        Returns: {
          default_unit_cost: number
          group_id: string
          group_name: string
          group_notes: string
          group_status: Database["public"]["Enums"]["verification_status"]
          group_verified: boolean
          identifier_id: string
          identifier_manufacturer: string
          identifier_type: Database["public"]["Enums"]["part_identifier_type"]
          identifier_value: string
          image_url: string
          inventory_item_id: string
          inventory_name: string
          inventory_sku: string
          is_in_stock: boolean
          is_low_stock: boolean
          is_matching_input: boolean
          is_primary: boolean
          location: string
          low_stock_threshold: number
          quantity_on_hand: number
        }[]
      }
      get_audit_actor_info: {
        Args: never
        Returns: {
          actor_email: string
          actor_id: string
          actor_name: string
        }[]
      }
      get_compatible_parts_for_equipment: {
        Args: { p_equipment_ids: string[]; p_organization_id: string }
        Returns: {
          default_unit_cost: number
          external_id: string
          has_alternates: boolean
          image_url: string
          inventory_item_id: string
          location: string
          low_stock_threshold: number
          match_type: string
          name: string
          quantity_on_hand: number
          sku: string
        }[]
      }
      get_compatible_parts_for_make_model: {
        Args: {
          p_manufacturer: string
          p_model?: string
          p_organization_id: string
        }
        Returns: {
          default_unit_cost: number
          external_id: string
          image_url: string
          inventory_item_id: string
          is_in_stock: boolean
          is_verified: boolean
          location: string
          low_stock_threshold: number
          match_type: string
          name: string
          quantity_on_hand: number
          rule_match_type: Database["public"]["Enums"]["model_match_type"]
          rule_status: Database["public"]["Enums"]["verification_status"]
          sku: string
        }[]
      }
      get_current_billing_period: {
        Args: never
        Returns: {
          period_end: string
          period_start: string
        }[]
      }
      get_current_user_id: { Args: never; Returns: string }
      get_equipment_for_inventory_item_rules: {
        Args: { p_item_id: string; p_organization_id: string }
        Returns: {
          equipment_id: string
          location: string
          manufacturer: string
          matched_rule_id: string
          matched_rule_manufacturer: string
          matched_rule_match_type: Database["public"]["Enums"]["model_match_type"]
          matched_rule_model: string
          matched_rule_status: Database["public"]["Enums"]["verification_status"]
          model: string
          name: string
          serial_number: string
          status: string
        }[]
      }
      get_fleet_efficiency: {
        Args: { p_org_id: string; p_team_ids?: string[] }
        Returns: {
          active_work_orders_count: number
          equipment_count: number
          team_id: string
          team_name: string
        }[]
      }
      get_global_pm_template_names: {
        Args: never
        Returns: {
          name: string
        }[]
      }
      get_google_workspace_connection_status: {
        Args: { p_organization_id: string }
        Returns: {
          access_token_expires_at: string
          connected_at: string
          domain: string
          is_connected: boolean
          scopes: string
        }[]
      }
      get_invitation_by_token_secure: {
        Args: { p_token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          invited_by_name: string
          message: string
          organization_id: string
          organization_name: string
          role: string
          status: string
        }[]
      }
      get_invitations_atomic: {
        Args: { org_id: string; user_uuid: string }
        Returns: {
          accepted_at: string
          created_at: string
          declined_at: string
          email: string
          expired_at: string
          expires_at: string
          id: string
          message: string
          role: string
          slot_purchase_id: string
          slot_reserved: boolean
          status: string
        }[]
      }
      get_invitations_bypass_optimized: {
        Args: { org_id: string; user_uuid: string }
        Returns: {
          accepted_at: string
          created_at: string
          declined_at: string
          email: string
          expired_at: string
          expires_at: string
          id: string
          message: string
          role: string
          slot_purchase_id: string
          slot_reserved: boolean
          status: string
        }[]
      }
      get_latest_completed_pm: {
        Args: { equipment_uuid: string }
        Returns: {
          completed_at: string
          completed_by: string
          id: string
          work_order_id: string
          work_order_title: string
        }[]
      }
      get_matching_pm_templates: {
        Args: { p_equipment_id: string; p_organization_id: string }
        Returns: {
          is_protected: boolean
          match_type: string
          matched_manufacturer: string
          matched_model: string
          template_description: string
          template_id: string
          template_name: string
          template_organization_id: string
        }[]
      }
      get_member_profiles_secure: {
        Args: { org_id: string }
        Returns: {
          created_at: string
          email: string
          email_private: boolean
          id: string
          name: string
          updated_at: string
        }[]
      }
      get_organization_deletion_stats: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_organization_exemptions: {
        Args: { org_id: string }
        Returns: {
          exemption_type: string
          exemption_value: number
          expires_at: string
          reason: string
        }[]
      }
      get_organization_member_profile: {
        Args: { member_user_id: string }
        Returns: {
          created_at: string
          email: string
          email_private: boolean
          id: string
          name: string
          updated_at: string
        }[]
      }
      get_organization_premium_features: {
        Args: { org_id: string }
        Returns: Json
      }
      get_organization_slot_availability: {
        Args: { org_id: string }
        Returns: {
          available_slots: number
          current_period_end: string
          current_period_start: string
          total_purchased: number
          used_slots: number
        }[]
      }
      get_organization_slot_availability_with_exemptions: {
        Args: { org_id: string }
        Returns: {
          available_slots: number
          current_period_end: string
          current_period_start: string
          exempted_slots: number
          total_purchased: number
          used_slots: number
        }[]
      }
      get_organization_storage_mb: { Args: { org_id: string }; Returns: number }
      get_pending_transfer_requests: {
        Args: never
        Returns: {
          created_at: string
          expires_at: string
          from_user_id: string
          from_user_name: string
          id: string
          is_incoming: boolean
          organization_id: string
          organization_name: string
          to_user_id: string
          to_user_name: string
          transfer_reason: string
        }[]
      }
      get_pending_workspace_personal_org_merge_requests: {
        Args: never
        Returns: {
          created_at: string
          expires_at: string
          id: string
          is_incoming: boolean
          request_reason: string
          requested_by_name: string
          requested_by_user_id: string
          requested_for_name: string
          requested_for_user_id: string
          workspace_org_id: string
          workspace_org_name: string
        }[]
      }
      get_personal_org_merge_preview: {
        Args: { p_workspace_org_id: string }
        Returns: Json
      }
      get_quickbooks_connection_status: {
        Args: { p_organization_id: string }
        Returns: {
          access_token_expires_at: string
          connected_at: string
          is_access_token_valid: boolean
          is_connected: boolean
          is_refresh_token_valid: boolean
          realm_id: string
          refresh_token_expires_at: string
          scopes: string
        }[]
      }
      get_system_user_id: { Args: never; Returns: string }
      get_user_invitations_safe: {
        Args: { org_id: string; user_uuid: string }
        Returns: {
          accepted_at: string
          created_at: string
          declined_at: string
          email: string
          expired_at: string
          expires_at: string
          id: string
          message: string
          role: string
          slot_purchase_id: string
          slot_reserved: boolean
          status: string
        }[]
      }
      get_user_managed_teams: {
        Args: { user_uuid: string }
        Returns: {
          is_only_manager: boolean
          organization_id: string
          team_id: string
          team_name: string
        }[]
      }
      get_user_org_role_direct: {
        Args: { org_id: string; user_uuid: string }
        Returns: string
      }
      get_user_org_role_secure: {
        Args: { org_id: string; user_uuid: string }
        Returns: string
      }
      get_user_organization_membership: {
        Args: { user_uuid: string }
        Returns: {
          organization_id: string
          role: string
          status: string
        }[]
      }
      get_user_organizations: {
        Args: { user_uuid: string }
        Returns: {
          organization_id: string
        }[]
      }
      get_user_quickbooks_permission: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      get_user_team_memberships: {
        Args: { org_id: string; user_uuid: string }
        Returns: {
          joined_date: string
          role: string
          team_id: string
          team_name: string
        }[]
      }
      get_user_teams_for_notifications: {
        Args: { user_uuid: string }
        Returns: {
          has_access: boolean
          organization_id: string
          organization_name: string
          team_id: string
          team_name: string
          user_role: string
        }[]
      }
      get_workspace_onboarding_state: {
        Args: { p_user_id: string }
        Returns: {
          domain: string
          domain_status: string
          email: string
          is_workspace_connected: boolean
          workspace_org_id: string
        }[]
      }
      handle_invitation_account_creation: {
        Args: { p_invitation_id: string; p_user_id: string }
        Returns: Json
      }
      handle_team_manager_removal: {
        Args: { org_id: string; user_uuid: string }
        Returns: Json
      }
      initiate_ownership_transfer: {
        Args: {
          p_organization_id: string
          p_to_user_id: string
          p_transfer_reason?: string
        }
        Returns: Json
      }
      invoke_quickbooks_token_refresh: { Args: never; Returns: undefined }
      is_org_admin: {
        Args: { org_id: string; user_uuid: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { org_id: string; user_uuid: string }
        Returns: boolean
      }
      is_organization_admin: {
        Args: { org_id: string; user_uuid: string }
        Returns: boolean
      }
      is_organization_member: {
        Args: { org_id: string; user_uuid: string }
        Returns: boolean
      }
      is_parts_manager: {
        Args: { p_organization_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_user_google_oauth_verified: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      is_valid_work_order_assignee: {
        Args: {
          p_assignee_id: string
          p_equipment_id: string
          p_organization_id: string
        }
        Returns: boolean
      }
      leave_organization: { Args: { p_organization_id: string }; Returns: Json }
      leave_organization_safely: { Args: { org_id: string }; Returns: Json }
      list_pm_templates:
        | {
            Args: never
            Returns: {
              is_global: boolean
              item_count: number
              template_name: string
            }[]
          }
        | {
            Args: { org_id: string }
            Returns: {
              created_at: string
              created_by: string
              description: string
              id: string
              is_protected: boolean
              name: string
              organization_id: string
              template_data: Json
              updated_at: string
              updated_by: string
            }[]
          }
      log_audit_entry: {
        Args: {
          p_action: string
          p_changes: Json
          p_entity_id: string
          p_entity_name: string
          p_entity_type: string
          p_metadata?: Json
          p_organization_id: string
        }
        Returns: string
      }
      log_invitation_performance: {
        Args: {
          error_message?: string
          execution_time_ms: number
          function_name: string
          success: boolean
        }
        Returns: undefined
      }
      log_invoice_export_audit: {
        Args: {
          p_action: string
          p_actor_id?: string
          p_ip_address?: string
          p_organization_id: string
          p_quickbooks_invoice_id: string
          p_quickbooks_invoice_number: string
          p_realm_id: string
          p_work_order_id: string
        }
        Returns: string
      }
      migrate_personal_org_to_workspace_for_user: {
        Args: { p_user_id: string; p_workspace_org_id: string }
        Returns: Json
      }
      migrate_personal_orgs_to_workspace: {
        Args: { p_domain: string; p_workspace_org_id: string }
        Returns: Json
      }
      normalize_compatibility_pattern: {
        Args: {
          p_match_type: Database["public"]["Enums"]["model_match_type"]
          p_pattern: string
        }
        Returns: string
      }
      normalize_domain: { Args: { p_domain: string }; Returns: string }
      normalize_email: { Args: { p_email: string }; Returns: string }
      preserve_user_attribution: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      process_all_pending_departures: { Args: never; Returns: Json }
      process_departure_batch: {
        Args: { p_batch_size?: number; p_queue_id: string }
        Returns: Json
      }
      refresh_quickbooks_tokens_manual: {
        Args: never
        Returns: {
          credentials_count: number
          message: string
        }[]
      }
      release_reserved_slot: {
        Args: { invitation_id: string; org_id: string }
        Returns: undefined
      }
      remove_organization_member: {
        Args: {
          p_organization_id: string
          p_reason?: string
          p_user_id: string
        }
        Returns: Json
      }
      remove_organization_member_safely: {
        Args: { org_id: string; removed_by: string; user_uuid: string }
        Returns: Json
      }
      request_workspace_personal_org_merge: {
        Args: {
          p_reason?: string
          p_target_user_id: string
          p_workspace_org_id: string
        }
        Returns: Json
      }
      reserve_slot_for_invitation: {
        Args: { invitation_id: string; org_id: string }
        Returns: boolean
      }
      respond_to_ownership_transfer: {
        Args: {
          p_accept: boolean
          p_departing_owner_role?: string
          p_response_reason?: string
          p_transfer_id: string
        }
        Returns: Json
      }
      respond_to_workspace_personal_org_merge: {
        Args: {
          p_accept: boolean
          p_request_id: string
          p_response_reason?: string
        }
        Returns: Json
      }
      revert_pm_completion: {
        Args: { p_pm_id: string; p_reason?: string }
        Returns: Json
      }
      revert_work_order_status: {
        Args: { p_reason?: string; p_work_order_id: string }
        Returns: Json
      }
      select_google_workspace_members: {
        Args: {
          p_admin_emails?: string[]
          p_emails: string[]
          p_organization_id: string
        }
        Returns: Json
      }
      set_bypass_triggers: { Args: { bypass?: boolean }; Returns: undefined }
      set_rls_context: { Args: { context_name: string }; Returns: undefined }
      should_notify_user_for_work_order: {
        Args: {
          organization_uuid: string
          user_uuid: string
          work_order_status: string
          work_order_team_id: string
        }
        Returns: boolean
      }
      sync_stripe_subscription_slots: {
        Args: {
          org_id: string
          period_end: string
          period_start: string
          quantity: number
          subscription_id: string
        }
        Returns: undefined
      }
      trigger_departure_processing: { Args: never; Returns: Json }
      update_equipment_working_hours: {
        Args: {
          p_equipment_id: string
          p_new_hours: number
          p_notes?: string
          p_update_source?: string
          p_work_order_id?: string
        }
        Returns: Json
      }
      update_member_quickbooks_permission: {
        Args: {
          p_can_manage_quickbooks: boolean
          p_organization_id: string
          p_target_user_id: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      update_organization_billing_metrics: {
        Args: { org_id: string }
        Returns: undefined
      }
      user_has_access: { Args: { user_uuid: string }; Returns: boolean }
      user_is_org_admin: {
        Args: { check_user_id?: string; org_id: string }
        Returns: boolean
      }
      user_is_org_member: {
        Args: { check_user_id?: string; org_id: string }
        Returns: boolean
      }
      validate_google_workspace_oauth_session: {
        Args: { p_session_token: string }
        Returns: {
          is_valid: boolean
          nonce: string
          organization_id: string
          origin_url: string
          redirect_url: string
          user_id: string
        }[]
      }
      validate_invitation_for_account_creation: {
        Args: { p_invitation_id: string }
        Returns: Json
      }
      validate_quickbooks_oauth_session: {
        Args: { p_session_token: string }
        Returns: {
          is_valid: boolean
          nonce: string
          organization_id: string
          origin_url: string
          redirect_url: string
          user_id: string
        }[]
      }
    }
    Enums: {
      equipment_status: "active" | "maintenance" | "inactive"
      inventory_transaction_type:
        | "usage"
        | "restock"
        | "adjustment"
        | "initial"
        | "work_order"
      model_match_type: "any" | "exact" | "prefix" | "wildcard"
      organization_plan: "free" | "premium"
      part_identifier_type:
        | "oem"
        | "aftermarket"
        | "sku"
        | "mpn"
        | "upc"
        | "cross_ref"
      team_member_role:
        | "owner"
        | "manager"
        | "technician"
        | "requestor"
        | "viewer"
      verification_status: "unverified" | "verified" | "deprecated"
      work_order_priority: "low" | "medium" | "high"
      work_order_status:
        | "submitted"
        | "accepted"
        | "assigned"
        | "in_progress"
        | "on_hold"
        | "completed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      equipment_status: ["active", "maintenance", "inactive"],
      inventory_transaction_type: [
        "usage",
        "restock",
        "adjustment",
        "initial",
        "work_order",
      ],
      model_match_type: ["any", "exact", "prefix", "wildcard"],
      organization_plan: ["free", "premium"],
      part_identifier_type: [
        "oem",
        "aftermarket",
        "sku",
        "mpn",
        "upc",
        "cross_ref",
      ],
      team_member_role: [
        "owner",
        "manager",
        "technician",
        "requestor",
        "viewer",
      ],
      verification_status: ["unverified", "verified", "deprecated"],
      work_order_priority: ["low", "medium", "high"],
      work_order_status: [
        "submitted",
        "accepted",
        "assigned",
        "in_progress",
        "on_hold",
        "completed",
        "cancelled",
      ],
    },
  },
} as const

