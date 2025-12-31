import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

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

// Feature flag for PDF attachments
const ENABLE_PDF_ATTACHMENT = Deno.env.get("ENABLE_QB_PDF_ATTACHMENT") === "true";

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
    team_id: string | null;
    team?: {
      name: string;
    };
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

interface WorkOrderImage {
  id: string;
  file_name: string;
  file_url: string;
  description: string | null;
  note_id: string | null;
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
 * Get an existing service item or create a new one for invoicing.
 * Priority: "EquipQR Services" → any active Service item → create new.
 */
async function getServiceItem(
  accessToken: string,
  realmId: string
): Promise<{ value: string; name: string }> {
  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Accept": "application/json",
    "Content-Type": "application/json"
  };

  // Try "EquipQR Services" item
  const specificQuery = `SELECT * FROM Item WHERE Name = 'EquipQR Services' AND Type = 'Service' AND Active = true`;
  const specificUrl = `${QUICKBOOKS_API_BASE}/v3/company/${realmId}/query?query=${encodeURIComponent(specificQuery)}`;
  const specificResponse = await fetch(specificUrl, { method: "GET", headers });
  
  if (specificResponse.ok) {
    const data = await specificResponse.json();
    if (data.QueryResponse?.Item?.[0]) {
      logStep("Found EquipQR Services item", { id: data.QueryResponse.Item[0].Id });
      return { 
        value: data.QueryResponse.Item[0].Id, 
        name: data.QueryResponse.Item[0].Name 
      };
    }
  } else if (specificResponse.status === 401 || specificResponse.status === 403 || specificResponse.status >= 500) {
    throw new Error(`QuickBooks item query failed with status ${specificResponse.status}`);
  }

  // Fallback to any active Service item
  const genericQuery = `SELECT * FROM Item WHERE Type = 'Service' AND Active = true MAXRESULTS 1`;
  const genericUrl = `${QUICKBOOKS_API_BASE}/v3/company/${realmId}/query?query=${encodeURIComponent(genericQuery)}`;
  const genericResponse = await fetch(genericUrl, { method: "GET", headers });
  
  if (genericResponse.ok) {
    const data = await genericResponse.json();
    if (data.QueryResponse?.Item?.[0]) {
      logStep("Found generic service item", { 
        id: data.QueryResponse.Item[0].Id, 
        name: data.QueryResponse.Item[0].Name 
      });
      return { 
        value: data.QueryResponse.Item[0].Id, 
        name: data.QueryResponse.Item[0].Name 
      };
    }
  } else if (genericResponse.status === 401 || genericResponse.status === 403 || genericResponse.status >= 500) {
    throw new Error(`QuickBooks generic item query failed with status ${genericResponse.status}`);
  }

  // Create new "EquipQR Services" item
  logStep("No service items found, creating EquipQR Services item");
  
  const accountQuery = `SELECT * FROM Account WHERE AccountType = 'Income' AND Active = true MAXRESULTS 1`;
  const accountUrl = `${QUICKBOOKS_API_BASE}/v3/company/${realmId}/query?query=${encodeURIComponent(accountQuery)}`;
  const accountResponse = await fetch(accountUrl, { method: "GET", headers });
  
  if (!accountResponse.ok) {
    throw new Error(`Failed to query income accounts: ${accountResponse.status} ${accountResponse.statusText}`);
  }
  
  const accountData = await accountResponse.json();
  const incomeAccount = accountData.QueryResponse?.Account?.[0];
  
  if (!incomeAccount) {
    throw new Error("No income account found in QuickBooks");
  }

  const createUrl = `${QUICKBOOKS_API_BASE}/v3/company/${realmId}/item`;
  const newItem = {
    Name: "EquipQR Services",
    Type: "Service",
    IncomeAccountRef: {
      value: incomeAccount.Id,
      name: incomeAccount.Name
    },
    Description: "General services for EquipQR Work Orders"
  };

  const createResponse = await fetch(createUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(newItem)
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create service item: ${createResponse.status} - ${errorText}`);
  }

  const createdItem = await createResponse.json();
  
  if (!createdItem?.Item?.Id) {
    throw new Error("QuickBooks returned invalid item structure after creation");
  }

  logStep("Successfully created EquipQR Services item", { id: createdItem.Item.Id });
  
  return { 
    value: createdItem.Item.Id, 
    name: createdItem.Item.Name 
  };
}

/**
 * Generate a PDF for the work order with public information only
 */
async function generateWorkOrderPDF(
  workOrder: WorkOrderData,
  publicNotes: WorkOrderNote[],
  publicImages: WorkOrderImage[],
  supabaseClient: any
): Promise<Uint8Array> {
  try {
    logStep("Generating work order PDF");

    const pdfDoc = await PDFDocument.create();
    let currentPage = pdfDoc.addPage([612, 792]); // US Letter size
    const { width, height } = currentPage.getSize();
    
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let yPosition = height - 50;
    const margin = 50;
    const lineHeight = 14;
    const fontSize = 11;
    const titleFontSize = 16;
    const maxWidth = width - (margin * 2);

    // Helper to add text with word wrapping
    const addText = (text: string, size: number = fontSize, bold: boolean = false, x: number = margin) => {
      const font = bold ? helveticaBoldFont : helveticaFont;
      
      // Check if we need a new page
      if (yPosition < 50) {
        currentPage = pdfDoc.addPage([612, 792]);
        yPosition = height - 50;
      }
      
      let page = currentPage; // Use local reference for current page

      // Split by newlines first
      const paragraphs = text.split('\n');
      
      for (const paragraph of paragraphs) {
        if (paragraph.trim() === '') {
          yPosition -= lineHeight;
          continue;
        }

        // Simple word wrapping for long lines
        const words = paragraph.split(' ');
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const textWidth = font.widthOfTextAtSize(testLine, size);
          
          if (textWidth > maxWidth && currentLine) {
            // Check for new page before drawing
            if (yPosition < 50) {
              currentPage = pdfDoc.addPage([612, 792]);
              page = currentPage;
              yPosition = height - 50;
            }
            
            // Draw current line and start new line
            page.drawText(currentLine, {
              x,
              y: yPosition,
              size,
              font,
            });
            yPosition -= lineHeight;
            
            // Check for new page after drawing
            if (yPosition < 50) {
              currentPage = pdfDoc.addPage([612, 792]);
              page = currentPage;
              yPosition = height - 50;
            }
            
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        
        // Draw remaining line
        if (currentLine) {
          // Check for new page before drawing
          if (yPosition < 50) {
            currentPage = pdfDoc.addPage([612, 792]);
            page = currentPage;
            yPosition = height - 50;
          }
          
          page.drawText(currentLine, {
            x,
            y: yPosition,
            size,
            font,
          });
          yPosition -= lineHeight;
          
          // Check for new page after drawing
          if (yPosition < 50) {
            currentPage = pdfDoc.addPage([612, 792]);
            page = currentPage;
            yPosition = height - 50;
          }
        }
      }
    };

    // Title
    addText('WORK ORDER DETAILS', titleFontSize, true);
    yPosition -= 5;

    // Work Order Information
    addText(`Title: ${workOrder.title}`, fontSize, true);
    addText(`Status: ${workOrder.status}`, fontSize);
    addText(`Priority: ${workOrder.priority}`, fontSize);
    
    if (workOrder.equipment) {
      addText(`Equipment: ${workOrder.equipment.name}`, fontSize);
      addText(`Model: ${workOrder.equipment.manufacturer} ${workOrder.equipment.model}`, fontSize);
      if (workOrder.equipment.serial_number) {
        addText(`Serial Number: ${workOrder.equipment.serial_number}`, fontSize);
      }
    }

    if (workOrder.equipment?.team) {
      addText(`Customer: ${workOrder.equipment.team.name}`, fontSize);
    }

    addText(`Created: ${new Date(workOrder.created_date).toLocaleDateString()}`, fontSize);
    if (workOrder.completed_date) {
      addText(`Completed: ${new Date(workOrder.completed_date).toLocaleDateString()}`, fontSize);
    }

    yPosition -= 5;

    // Description
    if (workOrder.description) {
      addText('Description:', fontSize, true);
      addText(workOrder.description, fontSize);
      yPosition -= 5;
    }

    // Public Notes
    if (publicNotes.length > 0) {
      addText('Notes:', fontSize, true);
      publicNotes.forEach(note => {
        const noteDate = new Date(note.created_at).toLocaleDateString();
        const author = note.author_name || 'Unknown';
        addText(`- ${note.content} (${author} - ${noteDate})`, fontSize);
      });
      yPosition -= 5;
    }

    // Public Images (just list them, embedding would require image processing)
    if (publicImages.length > 0) {
      addText('Images:', fontSize, true);
      publicImages.forEach(image => {
        const imageText = image.description 
          ? `${image.file_name}: ${image.description}`
          : image.file_name;
        addText(`- ${imageText}`, fontSize);
      });
    }

    // Footer on last page
    const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
    lastPage.drawText(`Generated on ${new Date().toLocaleString()}`, {
      x: margin,
      y: 30,
      size: 9,
      font: helveticaFont,
    });

    const pdfBytes = await pdfDoc.save();
    logStep("PDF generated successfully", { size: pdfBytes.length });
    return pdfBytes;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR generating PDF", { error: errorMessage });
    console.error("PDF generation error:", error);
    throw new Error(`Failed to generate PDF: ${errorMessage}`);
  }
}

/**
 * Get existing attachments for an invoice
 */
async function getInvoiceAttachments(
  accessToken: string,
  realmId: string,
  invoiceId: string
): Promise<Array<{ Id: string; FileName?: string }>> {
  try {
    const queryUrl = `${QUICKBOOKS_API_BASE}/v3/company/${realmId}/query?query=${encodeURIComponent(`SELECT * FROM Attachable WHERE AttachableRef.EntityRef.type = 'Invoice' AND AttachableRef.EntityRef.value = '${invoiceId}'`)}`;
    
    const response = await fetch(queryUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.QueryResponse?.Attachable) {
        return data.QueryResponse.Attachable;
      }
    }
    return [];
  } catch (error) {
    logStep("Error fetching attachments", { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Delete an attachment
 */
async function deleteAttachment(
  accessToken: string,
  realmId: string,
  attachmentId: string,
  syncToken: string
): Promise<void> {
  try {
    const deleteUrl = `${QUICKBOOKS_API_BASE}/v3/company/${realmId}/attachable?operation=delete`;
    
    const response = await fetch(deleteUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Id: attachmentId,
        SyncToken: syncToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete attachment: ${errorText}`);
    }
  } catch (error) {
    logStep("Error deleting attachment", { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Upload PDF as attachment to QuickBooks invoice
 */
async function attachPDFToInvoice(
  accessToken: string,
  realmId: string,
  invoiceId: string,
  pdfBytes: Uint8Array,
  fileName: string
): Promise<void> {
  try {
    logStep("Uploading PDF attachment", { invoiceId, fileName, size: pdfBytes.length });

    // Convert PDF bytes to base64 (Deno-compatible)
    // Use Uint8Array to string conversion that works in Deno
    let binaryString = '';
    for (let i = 0; i < pdfBytes.length; i++) {
      binaryString += String.fromCharCode(pdfBytes[i]);
    }
    const base64Pdf = btoa(binaryString);

    // Create attachment object - QuickBooks Attachable API format
    const attachment = {
      FileName: fileName,
      ContentType: "application/pdf",
      FileData: base64Pdf, // Base64 encoded PDF content
      AttachableRef: [
        {
          EntityRef: {
            type: "Invoice",
            value: invoiceId,
          },
        },
      ],
      IncludeOnSend: true,
    };

    const attachUrl = `${QUICKBOOKS_API_BASE}/v3/company/${realmId}/attachable`;
    const response = await fetch(attachUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(attachment),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Attachment upload failed", { error: errorText });
      throw new Error(`Failed to upload PDF attachment: ${errorText}`);
    }

    const result = await response.json();
    logStep("PDF attachment uploaded successfully", { attachmentId: result.Attachable?.Id });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR uploading PDF attachment", { error: errorMessage });
    console.error("Attachment upload error:", error);
    throw new Error(`Failed to attach PDF to invoice: ${errorMessage}`);
  }
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

    // Load work order with equipment (which contains team_id and team info)
    // Note: Team association comes from the equipment, NOT directly from the work order
    const { data: workOrder, error: woError } = await supabaseClient
      .from('work_orders')
      .select(`
        *,
        equipment:equipment_id (
          name, 
          manufacturer, 
          model, 
          serial_number,
          team_id,
          team:team_id (name)
        )
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

    // Derive team_id from equipment (the correct source of truth for team association)
    const equipmentTeamId = workOrder.equipment?.team_id;
    
    // Check if equipment has a team assigned
    if (!equipmentTeamId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Equipment must be assigned to a team to export to QuickBooks" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: customerMapping, error: mappingError } = await supabaseClient
      .from('quickbooks_team_customers')
      .select('quickbooks_customer_id, display_name')
      .eq('organization_id', workOrder.organization_id)
      .eq('team_id', equipmentTeamId)
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

    // Load work order images (for PDF generation)
    // We need note IDs to filter images, so fetch notes with IDs
    const { data: notesWithIds } = await supabaseClient
      .from('work_order_notes')
      .select('id, is_private')
      .eq('work_order_id', work_order_id);

    const privateNoteIds = new Set(
      (notesWithIds || [])
        .filter(note => note.is_private)
        .map(note => note.id)
    );

    const { data: allImages } = await supabaseClient
      .from('work_order_images')
      .select('id, file_name, file_url, description, note_id, created_at')
      .eq('work_order_id', work_order_id)
      .order('created_at', { ascending: true });

    // Filter to only public images (not associated with private notes)
    const publicImages: WorkOrderImage[] = (allImages || [])
      .filter(img => {
        // Include image if it's not associated with a note, or if the note is public
        return !img.note_id || !privateNoteIds.has(img.note_id);
      })
      .map(img => ({
        id: img.id,
        file_name: img.file_name,
        file_url: img.file_url,
        description: img.description,
        note_id: img.note_id,
        created_at: img.created_at,
      }));

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
          logStep("Invoice update failed", { error: errorText });
          throw new Error("Failed to update invoice in QuickBooks");
        }

        const updateResult = await updateResponse.json();
        invoiceId = updateResult.Invoice.Id;
        invoiceNumber = updateResult.Invoice.DocNumber;
        isUpdate = true;

        // Handle PDF attachment if enabled
        if (ENABLE_PDF_ATTACHMENT) {
          try {
            // Get public notes only
            const publicNotes = (notes || []).filter(note => !note.is_private);
            
            // Generate PDF
            const pdfBytes = await generateWorkOrderPDF(
              workOrder as WorkOrderData,
              publicNotes,
              publicImages,
              supabaseClient
            );

            // Remove existing PDF attachments for this invoice
            const existingAttachments = await getInvoiceAttachments(
              accessToken,
              credentials.realm_id,
              invoiceId
            );

            // Find and remove existing PDF attachments
            for (const attachment of existingAttachments) {
              if (attachment.FileName?.endsWith('.pdf') || attachment.FileName?.includes('Work-Order')) {
                try {
                  // Get attachment details to get SyncToken
                  const getAttachUrl = `${QUICKBOOKS_API_BASE}/v3/company/${credentials.realm_id}/attachable/${attachment.Id}`;
                  const getAttachResponse = await fetch(getAttachUrl, {
                    method: "GET",
                    headers: {
                      "Authorization": `Bearer ${accessToken}`,
                      "Accept": "application/json",
                    },
                  });

                  if (getAttachResponse.ok) {
                    const attachData = await getAttachResponse.json();
                    if (attachData.Attachable?.SyncToken) {
                      await deleteAttachment(
                        accessToken,
                        credentials.realm_id,
                        attachment.Id,
                        attachData.Attachable.SyncToken
                      );
                      logStep("Removed existing PDF attachment", { attachmentId: attachment.Id });
                    }
                  }
                } catch (deleteError) {
                  logStep("Warning: Could not delete existing attachment", { 
                    error: deleteError instanceof Error ? deleteError.message : String(deleteError) 
                  });
                  // Continue even if deletion fails
                }
              }
            }

            // Upload new PDF attachment
            const pdfFileName = `Work-Order-${workOrder.title.replace(/[^a-z0-9]/gi, '-')}-${invoiceNumber || 'Draft'}.pdf`;
            await attachPDFToInvoice(
              accessToken,
              credentials.realm_id,
              invoiceId,
              pdfBytes,
              pdfFileName
            );
          } catch (pdfError) {
            // Log error but don't fail the entire export
            const errorMessage = pdfError instanceof Error ? pdfError.message : String(pdfError);
            logStep("ERROR: PDF attachment failed (invoice still created)", { error: errorMessage });
            console.error("PDF attachment error:", pdfError);
            // Continue - invoice export succeeded even if PDF attachment failed
          }
        }

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
          logStep("Invoice creation failed", { error: errorText });
          throw new Error("Failed to create invoice in QuickBooks");
        }

        const createResult = await createResponse.json();
        invoiceId = createResult.Invoice.Id;
        invoiceNumber = createResult.Invoice.DocNumber;

        // Handle PDF attachment if enabled
        if (ENABLE_PDF_ATTACHMENT) {
          try {
            // Get public notes only
            const publicNotes = (notes || []).filter(note => !note.is_private);
            
            // Generate PDF
            const pdfBytes = await generateWorkOrderPDF(
              workOrder as WorkOrderData,
              publicNotes,
              publicImages,
              supabaseClient
            );

            // Upload PDF attachment
            const pdfFileName = `Work-Order-${workOrder.title.replace(/[^a-z0-9]/gi, '-')}-${invoiceNumber}.pdf`;
            await attachPDFToInvoice(
              accessToken,
              credentials.realm_id,
              invoiceId,
              pdfBytes,
              pdfFileName
            );
          } catch (pdfError) {
            // Log error but don't fail the entire export
            const errorMessage = pdfError instanceof Error ? pdfError.message : String(pdfError);
            logStep("ERROR: PDF attachment failed (invoice still created)", { error: errorMessage });
            console.error("PDF attachment error:", pdfError);
            // Continue - invoice export succeeded even if PDF attachment failed
          }
        }
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
    // Log detailed error server-side only - never expose to client
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    // Return generic error message to user to prevent information leakage
    return new Response(JSON.stringify({ 
      success: false, 
      error: "An error occurred while exporting invoice. Please try again or contact support."
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
