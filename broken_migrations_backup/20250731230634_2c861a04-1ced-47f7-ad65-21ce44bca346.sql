-- Fix the create_historical_work_order_with_pm function to properly handle PM checklists
CREATE OR REPLACE FUNCTION public.create_historical_work_order_with_pm(
    p_organization_id uuid, 
    p_equipment_id uuid, 
    p_title text, 
    p_description text, 
    p_priority work_order_priority, 
    p_status work_order_status, 
    p_historical_start_date timestamp with time zone, 
    p_historical_notes text DEFAULT NULL::text, 
    p_assignee_id uuid DEFAULT NULL::uuid, 
    p_team_id uuid DEFAULT NULL::uuid, 
    p_due_date timestamp with time zone DEFAULT NULL::timestamp with time zone, 
    p_completed_date timestamp with time zone DEFAULT NULL::timestamp with time zone, 
    p_has_pm boolean DEFAULT false, 
    p_pm_status text DEFAULT 'pending'::text, 
    p_pm_completion_date timestamp with time zone DEFAULT NULL::timestamp with time zone, 
    p_pm_notes text DEFAULT NULL::text, 
    p_pm_checklist_data jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    work_order_id UUID;
    pm_id UUID;
    result JSONB;
    default_checklist JSONB;
BEGIN
    -- Check if user is admin
    IF NOT is_org_admin(auth.uid(), p_organization_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;
    
    -- Create historical work order with has_pm field
    INSERT INTO work_orders (
        organization_id,
        equipment_id,
        title,
        description,
        priority,
        status,
        assignee_id,
        team_id,
        due_date,
        completed_date,
        has_pm,  -- ADD THIS FIELD
        is_historical,
        historical_start_date,
        historical_notes,
        created_by_admin,
        created_by,
        created_date
    ) VALUES (
        p_organization_id,
        p_equipment_id,
        p_title,
        p_description,
        p_priority,
        p_status,
        p_assignee_id,
        p_team_id,
        p_due_date,
        p_completed_date,
        p_has_pm,  -- SET THE VALUE
        true,
        p_historical_start_date,
        p_historical_notes,
        auth.uid(),
        auth.uid(),
        p_historical_start_date
    ) RETURNING id INTO work_order_id;
    
    -- Create PM if requested
    IF p_has_pm THEN
        -- Use default forklift checklist if no checklist data provided or empty
        IF p_pm_checklist_data IS NULL OR jsonb_array_length(p_pm_checklist_data) = 0 THEN
            -- Default forklift PM checklist
            default_checklist := '[
                {"id": "visual_001", "title": "Mast and Forks", "description": "Check mast for damage, cracks, or bent components. Inspect forks for cracks, bends, or excessive wear.", "condition": "good", "required": true, "section": "Visual Inspection", "completed": false},
                {"id": "visual_002", "title": "Hydraulic System", "description": "Check for hydraulic fluid leaks around cylinders, hoses, and fittings.", "condition": "good", "required": true, "section": "Visual Inspection", "completed": false},
                {"id": "visual_003", "title": "Tires and Wheels", "description": "Inspect tires for wear, cuts, or embedded objects. Check wheel bolts for tightness.", "condition": "good", "required": true, "section": "Visual Inspection", "completed": false},
                {"id": "visual_004", "title": "Overhead Guard", "description": "Check overhead guard for damage, cracks, or loose bolts.", "condition": "good", "required": true, "section": "Visual Inspection", "completed": false},
                {"id": "visual_005", "title": "Load Backrest", "description": "Inspect load backrest for damage and proper attachment.", "condition": "good", "required": true, "section": "Visual Inspection", "completed": false},
                {"id": "engine_001", "title": "Engine Oil Level", "description": "Check engine oil level and top off if necessary. Look for leaks.", "condition": "good", "required": true, "section": "Engine Compartment", "completed": false},
                {"id": "engine_002", "title": "Coolant Level", "description": "Check radiator coolant level and condition. Look for leaks.", "condition": "good", "required": true, "section": "Engine Compartment", "completed": false},
                {"id": "engine_003", "title": "Air Filter", "description": "Inspect air filter for dirt and debris. Replace if necessary.", "condition": "good", "required": true, "section": "Engine Compartment", "completed": false},
                {"id": "engine_004", "title": "Belt Condition", "description": "Check drive belts for proper tension, cracks, or fraying.", "condition": "good", "required": true, "section": "Engine Compartment", "completed": false},
                {"id": "engine_005", "title": "Battery", "description": "Check battery terminals for corrosion and ensure secure connections.", "condition": "good", "required": true, "section": "Engine Compartment", "completed": false},
                {"id": "electrical_001", "title": "Warning Lights", "description": "Test all warning lights and indicators on the dashboard.", "condition": "good", "required": true, "section": "Electrical Inspection", "completed": false},
                {"id": "electrical_002", "title": "Horn", "description": "Test horn operation for proper sound and function.", "condition": "good", "required": true, "section": "Electrical Inspection", "completed": false},
                {"id": "electrical_003", "title": "Work Lights", "description": "Test all work lights for proper operation.", "condition": "good", "required": true, "section": "Electrical Inspection", "completed": false},
                {"id": "operational_001", "title": "Steering", "description": "Test steering for smooth operation and proper response.", "condition": "good", "required": true, "section": "Operational Check", "completed": false},
                {"id": "operational_002", "title": "Brakes", "description": "Test service and parking brake operation.", "condition": "good", "required": true, "section": "Operational Check", "completed": false},
                {"id": "operational_003", "title": "Hydraulic Functions", "description": "Test lift, lower, tilt, and side shift functions for smooth operation.", "condition": "good", "required": true, "section": "Operational Check", "completed": false},
                {"id": "operational_004", "title": "Transmission", "description": "Test forward and reverse operation for smooth engagement.", "condition": "good", "required": true, "section": "Operational Check", "completed": false},
                {"id": "safety_001", "title": "Seat Belt", "description": "Check seat belt for proper operation and condition.", "condition": "good", "required": true, "section": "Safety Features", "completed": false},
                {"id": "safety_002", "title": "Dead Man Switch", "description": "Test operator presence system and dead man switch.", "condition": "good", "required": true, "section": "Safety Features", "completed": false},
                {"id": "safety_003", "title": "Load Capacity Plate", "description": "Verify load capacity plate is visible and legible.", "condition": "good", "required": true, "section": "Safety Features", "completed": false}
            ]'::jsonb;
        ELSE
            default_checklist := p_pm_checklist_data;
        END IF;
        
        INSERT INTO preventative_maintenance (
            work_order_id,
            equipment_id,
            organization_id,
            status,
            completed_at,
            completed_by,
            notes,
            checklist_data,
            is_historical,
            historical_completion_date,
            historical_notes,
            created_by
        ) VALUES (
            work_order_id,
            p_equipment_id,
            p_organization_id,
            p_pm_status,
            CASE WHEN p_pm_status = 'completed' THEN COALESCE(p_pm_completion_date, p_completed_date) ELSE NULL END,
            CASE WHEN p_pm_status = 'completed' THEN auth.uid() ELSE NULL END,
            p_pm_notes,
            default_checklist,  -- Use the checklist (default or provided)
            true,
            p_pm_completion_date,
            CONCAT('Historical PM - ', p_pm_notes),
            auth.uid()
        ) RETURNING id INTO pm_id;
    END IF;
    
    -- Create status history entry
    INSERT INTO work_order_status_history (
        work_order_id,
        old_status,
        new_status,
        changed_by,
        reason,
        is_historical_creation,
        metadata
    ) VALUES (
        work_order_id,
        NULL,
        p_status,
        auth.uid(),
        'Historical work order created',
        true,
        jsonb_build_object(
            'historical_start_date', p_historical_start_date,
            'has_pm', p_has_pm,
            'pm_id', pm_id
        )
    );
    
    result := jsonb_build_object(
        'success', true,
        'work_order_id', work_order_id,
        'pm_id', pm_id,
        'has_pm', p_has_pm
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false, 
        'error', 'Failed to create historical work order: ' || SQLERRM
    );
END;
$function$;