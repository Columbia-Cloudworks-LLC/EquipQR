import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const safeDetails = details ? { ...details } : undefined;
  if (safeDetails) {
    delete safeDetails.access_token;
    delete safeDetails.refresh_token;
  }
  const detailsStr = safeDetails ? ` - ${JSON.stringify(safeDetails)}` : '';
  console.log(`[QUICKBOOKS-EXPORT-INVOICE] ${step}${detailsStr}`);
};

// QuickBooks API endpoints
const QUICKBOOKS_API_BASE_SANDBOX = "https://sandbox-quickbooks.api.intuit.com";
const QUICKBOOKS_API_BASE_PRODUCTION = "https://quickbooks.api.intuit.com";
const INTUIT_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

const QUICKBOOKS_API_BASE = Deno.env.get("QUICKBOOKS_SANDBOX") === "false" 
  ? QUICKBOOKS_API_BASE_PRODUCTION 
  : QUICKBOOKS_API_BASE_SANDBOX;

interface QuickBooksCredential {
  id: string;
  organization_id: string;
  realm_id: string;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
}

interface IntuitTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
}

interface WorkOrderData {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  team_id: string | null;
  equipment_id: string;
  organization_id: string;
  created_date: string;
  due_date: string | null;
  completed_date: string | null;
  has_pm: boolean;
  equipment?: {
    name: string;
    manufacturer: string;
    model: string;
    serial_number: string;
  };
  team?: {
    name: string;
  };
}

interface WorkOrderCost {
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
}

interface WorkOrderNote {
  content: string;
  is_private: boolean;
  author_name: string | null;
  created_at: string;
}

interface TeamCustomerMapping {
  quickbooks_customer_id: string;
  display_name: string;
}

interface QuickBooksInvoice {
  Id?: string;
  SyncToken?: string;
  CustomerRef: { value: string };
  Line: Array<{
    Amount: number;
    DetailType: string;
    Description?: string;
    SalesItemLineDetail?: {
      ItemRef: { value: string; name?: string };
      Qty?: number;
      UnitPrice?: number;
    };
  }>;
  PrivateNote?: string;
  CustomerMemo?: { value: string };
  DocNumber?: string;
  TxnDate?: string;
  DueDate?: string;
}

/**
 * Refresh the access token if needed
 */
async function refreshTokenIfNeeded(
  credential: QuickBooksCredential,
  supabaseClient: any,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const now = new Date();
  const accessTokenExpiresAt = new Date(credential.access_token_expires_at);
  
  if (accessTokenExpiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
    return credential.access_token;
  }

  logStep("Access token expired, refreshing...");

  const refreshTokenExpiresAt = new Date(credential.refresh_token_expires_at);
  if (refreshTokenExpiresAt <= now) {
    throw new Error("Refresh token has expired. Please reconnect QuickBooks.");
  }

  const tokenRequestBody = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: credential.refresh_token,
  });

  const basicAuth = btoa(`${clientId}:${clientSecret}`);
  
  const tokenResponse = await fetch(INTUIT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${basicAuth}`,
      "Accept": "application/json",
    },
    body: tokenRequestBody.toString(),
  });

  if (!tokenResponse.ok) {
    throw new Error("Failed to refresh QuickBooks access token");
  }

  const tokenData: IntuitTokenResponse = await tokenResponse.json();

  const newAccessExpiresAt = new Date(now.getTime() + tokenData.expires_in * 1000);
  const newRefreshExpiresAt = new Date(now.getTime() + tokenData.x_refresh_token_expires_in * 1000);

  await supabaseClient
    .from('quickbooks_credentials')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      access_token_expires_at: newAccessExpiresAt.toISOString(),
      refresh_token_expires_at: newRefreshExpiresAt.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', credential.id);

  return tokenData.access_token;
}

/**
 * Build invoice description from work order data
 */
function buildInvoiceDescription(
  workOrder: WorkOrderData,
  notes: WorkOrderNote[],
  costs: WorkOrderCost[]
): string {
  const lines: string[] = [];
  
  lines.push(`Work Order: ${workOrder.title}`);
  lines.push(`Status: ${workOrder.status}`);
  
  if (workOrder.equipment) {
    lines.push(`Equipment: ${workOrder.equipment.name}`);
    lines.push(`  Model: ${workOrder.equipment.manufacturer} ${workOrder.equipment.model}`);
    lines.push(`  Serial: ${workOrder.equipment.serial_number}`);
  }
  
  if (workOrder.description) {
    lines.push('');
    lines.push('Description:');
    lines.push(workOrder.description);
  }
  
  // Add public notes
  const publicNotes = notes.filter(n => !n.is_private);
  if (publicNotes.length > 0) {
    lines.push('');
    lines.push('Notes:');
    publicNotes.forEach(note => {
      lines.push(`- ${note.content} (${note.author_name || 'Unknown'} - ${new Date(note.created_at).toLocaleDateString()})`);
    });
  }
  
  return lines.join('\n');
}

/**
 * Build private note from private notes
 */
function buildPrivateNote(
  workOrder: WorkOrderData,
  notes: WorkOrderNote[],
  costs: WorkOrderCost[]
): string {
  const lines: string[] = [];
  
  lines.push(`EquipQR Work Order ID: ${workOrder.id}`);
  lines.push(`Created: ${new Date(workOrder.created_date).toLocaleDateString()}`);
  if (workOrder.due_date) {
    lines.push(`Due: ${new Date(workOrder.due_date).toLocaleDateString()}`);
  }
  if (workOrder.completed_date) {
    lines.push(`Completed: ${new Date(workOrder.completed_date).toLocaleDateString()}`);
  }
  
  // Add private notes
  const privateNotes = notes.filter(n => n.is_private);
  if (privateNotes.length > 0) {
    lines.push('');
    lines.push('Private Notes:');
    privateNotes.forEach(note => {
      lines.push(`- ${note.content} (${note.author_name || 'Unknown'})`);
    });
  }
  
  // Add cost breakdown
  if (costs.length > 0) {
    lines.push('');
    lines.push('Cost Breakdown:');
    costs.forEach(cost => {
      const unitPrice = (cost.unit_price_cents / 100).toFixed(2);
      const total = ((cost.total_price_cents || cost.unit_price_cents * cost.quantity) / 100).toFixed(2);
      lines.push(`- ${cost.description}: ${cost.quantity} x $${unitPrice} = $${total}`);
    });
  }
  
  // Truncate if too long (QuickBooks has a 4000 char limit for PrivateNote)
  let result = lines.join('\n');
  if (result.length > 3900) {
    result = result.substring(0, 3900) + '\n... (truncated)';
  }
  
  return result;
}

/**
 * Get or create a generic service item for invoicing
 */
async function getServiceItem(
  accessToken: string,
  realmId: string
): Promise<{ value: string; name: string }> {
  // Query for existing "Services" item
  const queryUrl = `${QUICKBOOKS_API_BASE}/v3/company/${realmId}/query?query=${encodeURIComponent("SELECT * FROM Item WHERE Type = 'Service' MAXRESULTS 1")}`;
  
  const response = await fetch(queryUrl, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
    },
  });

  if (response.ok) {
    const data = await response.json();
    if (data.QueryResponse?.Item?.[0]) {
      const item = data.QueryResponse.Item[0];
      return { value: item.Id, name: item.Name };
    }
  }

  // If no service item found, use a default value
  // Note: In production, you might want to create an item or use a configured one
  return { value: "1", name: "Services" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const clientId = Deno.env.get("INTUIT_CLIENT_ID");
    const clientSecret = Deno.env.get("INTUIT_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!clientId || !clientSecret) {
      throw new Error("QuickBooks OAuth is not configured");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration is missing");
    }

    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Unauthorized" 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Verify user
    const token = authHeader.substring(7).trim();
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Unauthorized" 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body = await req.json();
    const { work_order_id } = body;

    if (!work_order_id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "work_order_id is required" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Loading work order", { workOrderId: work_order_id });

    // Load work order with equipment and team
    const { data: workOrder, error: woError } = await supabaseClient
      .from('work_orders')
      .select(`
        *,
        equipment:equipment_id (name, manufacturer, model, serial_number),
        team:team_id (name)
      `)
      .eq('id', work_order_id)
      .single();

    if (woError || !workOrder) {
      logStep("Work order not found", { error: woError?.message });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Work order not found" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is admin/owner of the organization
    const { data: membership, error: membershipError } = await supabaseClient
      .from('organization_members')
      .select('role')
      .eq('organization_id', workOrder.organization_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (membershipError || !membership || !['owner', 'admin'].includes(membership.role)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "You must be an admin or owner to export invoices" 
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if team has a customer mapping
    if (!workOrder.team_id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Work order must be assigned to a team to export to QuickBooks" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: customerMapping, error: mappingError } = await supabaseClient
      .from('quickbooks_team_customers')
      .select('quickbooks_customer_id, display_name')
      .eq('organization_id', workOrder.organization_id)
      .eq('team_id', workOrder.team_id)
      .single();

    if (mappingError || !customerMapping) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Team does not have a QuickBooks customer mapping. Please map the team to a QuickBooks customer first." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Customer mapping found", { 
      customerId: customerMapping.quickbooks_customer_id,
      displayName: customerMapping.display_name 
    });

    // Get QuickBooks credentials
    const { data: credentials, error: credError } = await supabaseClient
      .from('quickbooks_credentials')
      .select('*')
      .eq('organization_id', workOrder.organization_id)
      .single();

    if (credError || !credentials) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "QuickBooks is not connected" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load work order costs
    const { data: costs } = await supabaseClient
      .from('work_order_costs')
      .select('description, quantity, unit_price_cents, total_price_cents')
      .eq('work_order_id', work_order_id);

    // Load work order notes
    const { data: notes } = await supabaseClient
      .from('work_order_notes')
      .select('content, is_private, author_name, created_at')
      .eq('work_order_id', work_order_id)
      .order('created_at', { ascending: true });

    // Get valid access token
    const accessToken = await refreshTokenIfNeeded(
      credentials,
      supabaseClient,
      clientId,
      clientSecret
    );

    // Calculate total amount from costs
    const totalAmountCents = (costs || []).reduce((sum, cost) => {
      return sum + (cost.total_price_cents || cost.unit_price_cents * cost.quantity);
    }, 0);
    const totalAmount = totalAmountCents / 100;

    // Get a service item for the invoice line
    const serviceItem = await getServiceItem(accessToken, credentials.realm_id);

    // Build invoice description and private note
    const description = buildInvoiceDescription(workOrder as WorkOrderData, notes || [], costs || []);
    const privateNote = buildPrivateNote(workOrder as WorkOrderData, notes || [], costs || []);

    // Check if this work order was already exported
    const { data: existingExport } = await supabaseClient
      .from('quickbooks_export_logs')
      .select('quickbooks_invoice_id')
      .eq('work_order_id', work_order_id)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let invoiceId: string | undefined;
    let invoiceNumber: string | undefined;
    let isUpdate = false;

    // Create log entry (pending)
    const { data: logEntry } = await supabaseClient
      .from('quickbooks_export_logs')
      .insert({
        organization_id: workOrder.organization_id,
        work_order_id: work_order_id,
        realm_id: credentials.realm_id,
        status: 'pending',
      })
      .select('id')
      .single();

    try {
      if (existingExport?.quickbooks_invoice_id) {
        // Update existing invoice
        logStep("Updating existing invoice", { invoiceId: existingExport.quickbooks_invoice_id });
        
        // First, get the current invoice to get its SyncToken
        const getInvoiceUrl = `${QUICKBOOKS_API_BASE}/v3/company/${credentials.realm_id}/invoice/${existingExport.quickbooks_invoice_id}`;
        const getResponse = await fetch(getInvoiceUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json",
          },
        });

        if (!getResponse.ok) {
          throw new Error("Failed to fetch existing invoice for update");
        }

        const existingInvoiceData = await getResponse.json();
        const existingInvoice = existingInvoiceData.Invoice;

        // Build updated invoice
        const updatedInvoice: QuickBooksInvoice = {
          Id: existingInvoice.Id,
          SyncToken: existingInvoice.SyncToken,
          CustomerRef: { value: customerMapping.quickbooks_customer_id },
          Line: [
            {
              Amount: totalAmount,
              DetailType: "SalesItemLineDetail",
              Description: description.substring(0, 4000), // QB limit
              SalesItemLineDetail: {
                ItemRef: serviceItem,
                Qty: 1,
                UnitPrice: totalAmount,
              },
            },
          ],
          PrivateNote: privateNote,
          CustomerMemo: { value: `Work Order: ${workOrder.title}` },
        };

        const updateUrl = `${QUICKBOOKS_API_BASE}/v3/company/${credentials.realm_id}/invoice`;
        const updateResponse = await fetch(updateUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedInvoice),
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error("Invoice update failed:", errorText);
          throw new Error("Failed to update invoice in QuickBooks");
        }

        const updateResult = await updateResponse.json();
        invoiceId = updateResult.Invoice.Id;
        invoiceNumber = updateResult.Invoice.DocNumber;
        isUpdate = true;

      } else {
        // Create new invoice
        logStep("Creating new invoice");

        const newInvoice: QuickBooksInvoice = {
          CustomerRef: { value: customerMapping.quickbooks_customer_id },
          Line: [
            {
              Amount: totalAmount,
              DetailType: "SalesItemLineDetail",
              Description: description.substring(0, 4000),
              SalesItemLineDetail: {
                ItemRef: serviceItem,
                Qty: 1,
                UnitPrice: totalAmount,
              },
            },
          ],
          PrivateNote: privateNote,
          CustomerMemo: { value: `Work Order: ${workOrder.title}` },
          TxnDate: new Date().toISOString().split('T')[0],
        };

        if (workOrder.due_date) {
          newInvoice.DueDate = workOrder.due_date.split('T')[0];
        }

        const createUrl = `${QUICKBOOKS_API_BASE}/v3/company/${credentials.realm_id}/invoice`;
        const createResponse = await fetch(createUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newInvoice),
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error("Invoice creation failed:", errorText);
          throw new Error("Failed to create invoice in QuickBooks");
        }

        const createResult = await createResponse.json();
        invoiceId = createResult.Invoice.Id;
        invoiceNumber = createResult.Invoice.DocNumber;
      }

      // Update log entry with success
      if (logEntry?.id) {
        await supabaseClient
          .from('quickbooks_export_logs')
          .update({
            quickbooks_invoice_id: invoiceId,
            status: 'success',
            exported_at: new Date().toISOString(),
          })
          .eq('id', logEntry.id);
      }

      logStep("Invoice exported successfully", { invoiceId, invoiceNumber, isUpdate });

      return new Response(JSON.stringify({ 
        success: true, 
        invoice_id: invoiceId,
        invoice_number: invoiceNumber,
        is_update: isUpdate,
        message: isUpdate 
          ? `Invoice ${invoiceNumber} updated successfully` 
          : `Invoice ${invoiceNumber} created successfully`
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (exportError) {
      // Update log entry with error
      if (logEntry?.id) {
        const errorMessage = exportError instanceof Error ? exportError.message : String(exportError);
        await supabaseClient
          .from('quickbooks_export_logs')
          .update({
            status: 'error',
            error_message: errorMessage.substring(0, 1000),
          })
          .eq('id', logEntry.id);
      }
      throw exportError;
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage.includes("QuickBooks") || errorMessage.includes("customer") 
        ? errorMessage 
        : "An error occurred while exporting invoice"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
