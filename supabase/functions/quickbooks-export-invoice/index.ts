// Using Deno.serve (built-in)
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  QBO_API_BASE,
  QBO_DEFAULT_LABOR_RATE_CENTS,
  QBO_DEFAULT_TRUCK_SUPPLIES_FEE_CENTS,
  QBO_ENVIRONMENT,
  QBO_INVOICE_CUSTOM_FIELD_DEFINITION_IDS,
  QBO_INVOICE_ITEM_NAMES,
  QBO_TOKEN_URL,
  getIntuitTid,
  withMinorVersion,
} from "../_shared/quickbooks-config.ts";


const logStep = (step: string, details?: Record<string, unknown>) => {
  const safeDetails = details ? { ...details } : undefined;
  if (safeDetails) {
    delete safeDetails.access_token;
    delete safeDetails.refresh_token;
  }
  const detailsStr = safeDetails ? ` - ${JSON.stringify(safeDetails)}` : '';
  console.log(`[QUICKBOOKS-EXPORT-INVOICE] ${step}${detailsStr}`);
};

// getIntuitTid imported from _shared/quickbooks-config.ts

/**
 * Extracts the client IP address from request headers.
 * Checks x-forwarded-for (first IP in comma-separated list) and x-real-ip.
 * Returns null if no IP address is found.
 */
const getClientIpAddress = (req: Request): string | null => {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
         req.headers.get("x-real-ip") || 
         null;
};

// QuickBooks API endpoints and environment imported from _shared/quickbooks-config.ts
// QBO_API_BASE, QBO_ENVIRONMENT, QBO_TOKEN_URL, withMinorVersion

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
  equipment_working_hours_at_creation: number | null;
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
  id?: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number | null;
  inventory_item_id?: string | null;
}

interface WorkOrderNote {
  id?: string;
  content: string;
  hours_worked?: number | null;
  machine_hours?: number | null;
  is_private: boolean;
  author_name: string | null;
  created_at: string;
}

interface WorkOrderStatusEvent {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  reason: string | null;
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
    DetailType: "SalesItemLineDetail";
    Description?: string;
    SalesItemLineDetail: {
      ItemRef: { value: string; name?: string };
      Qty?: number;
      UnitPrice?: number;
    };
  }>;
  CustomField?: Array<{
    DefinitionId: string;
    Name?: string;
    Type?: "StringType";
    StringValue: string;
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
  
  const tokenResponse = await fetch(QBO_TOKEN_URL, {
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

function buildPrivateNote(
  workOrder: WorkOrderData,
  notes: WorkOrderNote[],
  costs: WorkOrderCost[],
): string {
  const lines: string[] = [];
  
  lines.push(`EquipQR Work Order ID: ${workOrder.id}`);
  lines.push(`Created: ${new Date(workOrder.created_date).toLocaleDateString('en-US')}`);
  if (workOrder.due_date) {
    lines.push(`Due: ${new Date(workOrder.due_date).toLocaleDateString('en-US')}`);
  }
  if (workOrder.completed_date) {
    lines.push(`Completed: ${new Date(workOrder.completed_date).toLocaleDateString('en-US')}`);
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

const getCostAmountCents = (cost: WorkOrderCost): number =>
  cost.total_price_cents ?? cost.unit_price_cents * cost.quantity;

const isTruckSuppliesCost = (cost: WorkOrderCost): boolean =>
  /truck supplies|truck fee|travel fee|service fee|trip fee/i.test(cost.description);

const isLaborCost = (cost: WorkOrderCost): boolean =>
  /labor|labour|hour|technician|service time/i.test(cost.description);

const formatTimelineTimestamp = (value: string): string => {
  const iso = new Date(value).toISOString();
  return `${iso.slice(0, 16)}z`;
};

const formatStatus = (status: string): string =>
  status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

/**
 * Escapes a value for safe embedding inside a single-quoted QuickBooks Query
 * Language string literal.  QBO uses `'` as the string delimiter and `\` as
 * the escape character, so those are the only characters we need to neutralize
 * to defeat query-language injection.  We deliberately do NOT strip other
 * characters (e.g. `:`, `&`, `(`, `)`) because doing so causes the lookup
 * value to differ from the value we use when creating the item, which results
 * in duplicate Item records on every export.
 *
 * Control characters and embedded newlines are still removed so the rendered
 * query stays on a single line.
 */
const escapeQuickBooksQueryValue = (value: string): string => {
  const stripped = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return stripped.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
};

function buildCustomerTimelineLines(
  statusEvents: WorkOrderStatusEvent[],
  notes: WorkOrderNote[],
): string[] {
  const timelineLines: Array<{ timestamp: string; text: string }> = [];

  statusEvents.forEach((event) => {
    const summary = event.reason
      ? `Status changed to ${formatStatus(event.new_status)} - ${event.reason}`
      : `Status changed to ${formatStatus(event.new_status)}`;
    timelineLines.push({ timestamp: event.changed_at, text: summary });
  });

  notes
    .filter((note) => !note.is_private)
    .forEach((note) => {
      timelineLines.push({ timestamp: note.created_at, text: note.content });
    });

  return timelineLines
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((entry) => `${formatTimelineTimestamp(entry.timestamp)} - [${entry.text}]`);
}

function buildCustomerMemo(
  workOrder: WorkOrderData,
  notes: WorkOrderNote[],
  statusEvents: WorkOrderStatusEvent[],
): string {
  const publicNotes = notes.filter((note) => !note.is_private);
  const latestPublicResolution = publicNotes.length > 0
    ? publicNotes[publicNotes.length - 1].content
    : "Resolved per work order completion.";

  const header = [
    `Initial request: ${workOrder.description || workOrder.title}.`,
    `Resolution: ${latestPublicResolution}`,
  ].join("\n");

  const timeline = buildCustomerTimelineLines(statusEvents, notes);
  if (timeline.length === 0) {
    return header;
  }

  return `${header}\n\n${timeline.join("\n")}`.slice(0, 3900);
}

function getMachineHoursCustomFieldValue(
  workOrder: WorkOrderData,
  notes: WorkOrderNote[],
): string {
  const intakeHours = workOrder.equipment_working_hours_at_creation;
  const checkoutEntry = [...notes]
    .reverse()
    .find((note) => note.machine_hours !== null && note.machine_hours !== undefined);
  const checkoutHours = checkoutEntry?.machine_hours ?? null;

  if (intakeHours !== null && checkoutHours !== null) {
    return `Intake ${intakeHours} / Checkout ${checkoutHours}`;
  }
  if (intakeHours !== null) {
    return `Intake ${intakeHours}`;
  }
  if (checkoutHours !== null) {
    return `Checkout ${checkoutHours}`;
  }
  return "N/A";
}

function buildInvoiceCustomFields(
  workOrder: WorkOrderData,
  notes: WorkOrderNote[],
): NonNullable<QuickBooksInvoice["CustomField"]> {
  const makeModelValue = [workOrder.equipment?.manufacturer, workOrder.equipment?.model]
    .filter(Boolean)
    .join(" ")
    .trim() || workOrder.equipment?.name || "N/A";

  return [
    {
      DefinitionId: QBO_INVOICE_CUSTOM_FIELD_DEFINITION_IDS.makeModel,
      Type: "StringType",
      Name: "Make/Model",
      StringValue: makeModelValue,
    },
    {
      DefinitionId: QBO_INVOICE_CUSTOM_FIELD_DEFINITION_IDS.serial,
      Type: "StringType",
      Name: "Serial",
      StringValue: workOrder.equipment?.serial_number || "N/A",
    },
    {
      DefinitionId: QBO_INVOICE_CUSTOM_FIELD_DEFINITION_IDS.machineHours,
      Type: "StringType",
      Name: "Machine Hours",
      StringValue: getMachineHoursCustomFieldValue(workOrder, notes),
    },
  ];
}

/**
 * Get an existing service item or create one for invoicing.
 */
async function getOrCreateServiceItem(
  accessToken: string,
  realmId: string,
  itemName: string,
): Promise<{ value: string; name: string }> {
  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Accept": "application/json",
    "Content-Type": "application/json",
  };

  const escapedItemName = escapeQuickBooksQueryValue(itemName);
  const specificQuery = `SELECT * FROM Item WHERE Name = '${escapedItemName}' AND Type = 'Service' AND Active = true`;
  const specificUrl = withMinorVersion(`${QBO_API_BASE}/v3/company/${realmId}/query?query=${encodeURIComponent(specificQuery)}`);
  const specificResponse = await fetch(specificUrl, { method: "GET", headers });
  
  if (specificResponse.ok) {
    const data = await specificResponse.json();
    // Check for Fault in 200 OK response
    if (data.Fault) {
      logStep("Fault in item query response", { fault: JSON.stringify(data.Fault).substring(0, 300) });
    } else if (data.QueryResponse?.Item?.[0]) {
      logStep("Found service item", { id: data.QueryResponse.Item[0].Id, itemName });
      return { 
        value: data.QueryResponse.Item[0].Id, 
        name: data.QueryResponse.Item[0].Name 
      };
    }
  } else if (specificResponse.status === 401 || specificResponse.status === 403 || specificResponse.status >= 500) {
    throw new Error(`QuickBooks item query failed with status ${specificResponse.status}`);
  }

  logStep("Service item not found, creating", { itemName });
  
  const accountQuery = `SELECT * FROM Account WHERE AccountType = 'Income' AND Active = true MAXRESULTS 1`;
  const accountUrl = withMinorVersion(`${QBO_API_BASE}/v3/company/${realmId}/query?query=${encodeURIComponent(accountQuery)}`);
  const accountResponse = await fetch(accountUrl, { method: "GET", headers });
  
  if (!accountResponse.ok) {
    throw new Error(`Failed to query income accounts: ${accountResponse.status} ${accountResponse.statusText}`);
  }
  
  const accountData = await accountResponse.json();
  // Check for Fault in 200 OK response
  if (accountData.Fault) {
    throw new Error(`QuickBooks account query Fault: ${JSON.stringify(accountData.Fault).substring(0, 300)}`);
  }
  const incomeAccount = accountData.QueryResponse?.Account?.[0];
  
  if (!incomeAccount) {
    throw new Error("No income account found in QuickBooks");
  }

  const createUrl = withMinorVersion(`${QBO_API_BASE}/v3/company/${realmId}/item`);
  const newItem = {
    Name: itemName,
    Type: "Service",
    IncomeAccountRef: {
      value: incomeAccount.Id,
      name: incomeAccount.Name
    },
    Description: `Auto-created service item for ${itemName}`
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
  
  // Check for Fault in 200 OK response
  if (createdItem.Fault) {
    throw new Error(`QuickBooks create item Fault: ${JSON.stringify(createdItem.Fault).substring(0, 300)}`);
  }

  if (!createdItem?.Item?.Id) {
    throw new Error("QuickBooks returned invalid item structure after creation");
  }

  logStep("Successfully created service item", { id: createdItem.Item.Id, itemName });
  
  return { 
    value: createdItem.Item.Id, 
    name: createdItem.Item.Name 
  };
}

async function buildInvoiceLines(
  accessToken: string,
  realmId: string,
  costs: WorkOrderCost[],
  notes: WorkOrderNote[],
): Promise<QuickBooksInvoice["Line"]> {
  const partCosts = costs.filter((cost) => (cost.inventory_item_id ?? null) !== null);
  const truckCosts = costs.filter(isTruckSuppliesCost);
  const laborCandidateCosts = costs.filter(
    (cost) => !partCosts.includes(cost) && !truckCosts.includes(cost),
  );

  const loggedHours = notes.reduce((sum, note) => sum + (note.hours_worked ?? 0), 0);

  // When time logs exist, only costs whose description matches the labor regex
  // are folded into the labor line.  The remaining non-part/non-truck costs
  // (e.g. "Disposal fee", "Environmental") still need to be billed — we emit
  // them as a single "Other" line below so the invoice total matches the work
  // order total.  When no time logs exist, every non-part/non-truck cost is
  // treated as labor (legacy behavior).
  const laborMatchedCosts = loggedHours > 0
    ? laborCandidateCosts.filter(isLaborCost)
    : laborCandidateCosts;
  const otherCosts = loggedHours > 0
    ? laborCandidateCosts.filter((cost) => !isLaborCost(cost))
    : [];

  const laborCostsCents = laborMatchedCosts.reduce(
    (sum, cost) => sum + getCostAmountCents(cost),
    0,
  );
  const otherCostsCents = otherCosts.reduce(
    (sum, cost) => sum + getCostAmountCents(cost),
    0,
  );
  const laborUnitRateCents = loggedHours > 0
    ? (
      QBO_DEFAULT_LABOR_RATE_CENTS > 0
        ? QBO_DEFAULT_LABOR_RATE_CENTS
        : Math.round(laborCostsCents / loggedHours)
    )
    : 0;
  const laborTotalCents = loggedHours > 0
    ? Math.max(0, Math.round(loggedHours * laborUnitRateCents))
    : laborCostsCents;

  const truckSuppliesSumCents = truckCosts.reduce(
    (sum, cost) => sum + getCostAmountCents(cost),
    0,
  );
  const truckSuppliesCents = truckCosts.length > 0
    ? truckSuppliesSumCents
    : QBO_DEFAULT_TRUCK_SUPPLIES_FEE_CENTS;

  const lines: QuickBooksInvoice["Line"] = [];

  if (laborTotalCents > 0) {
    const laborItem = await getOrCreateServiceItem(
      accessToken,
      realmId,
      QBO_INVOICE_ITEM_NAMES.labor,
    );
    lines.push({
      Amount: laborTotalCents / 100,
      DetailType: "SalesItemLineDetail",
      Description: `Labor (${loggedHours.toFixed(2)} hrs)`,
      SalesItemLineDetail: {
        ItemRef: laborItem,
        Qty: Number(loggedHours.toFixed(2)),
        UnitPrice: laborUnitRateCents / 100,
      },
    });
  }

  for (const part of partCosts) {
    const partAmountCents = getCostAmountCents(part);
    if (partAmountCents <= 0) continue;
    const partItemName = `${QBO_INVOICE_ITEM_NAMES.partsPrefix}: ${part.description}`.slice(0, 100);
    const partItem = await getOrCreateServiceItem(accessToken, realmId, partItemName);
    lines.push({
      Amount: partAmountCents / 100,
      DetailType: "SalesItemLineDetail",
      Description: part.description,
      SalesItemLineDetail: {
        ItemRef: partItem,
        Qty: part.quantity,
        UnitPrice: part.unit_price_cents / 100,
      },
    });
  }

  if (otherCostsCents > 0) {
    const otherItem = await getOrCreateServiceItem(
      accessToken,
      realmId,
      QBO_INVOICE_ITEM_NAMES.other,
    );
    for (const cost of otherCosts) {
      const otherAmountCents = getCostAmountCents(cost);
      if (otherAmountCents <= 0) continue;
      lines.push({
        Amount: otherAmountCents / 100,
        DetailType: "SalesItemLineDetail",
        Description: cost.description,
        SalesItemLineDetail: {
          ItemRef: otherItem,
          Qty: cost.quantity,
          UnitPrice: cost.unit_price_cents / 100,
        },
      });
    }
  }

  if (truckSuppliesCents > 0) {
    const truckSuppliesItem = await getOrCreateServiceItem(
      accessToken,
      realmId,
      QBO_INVOICE_ITEM_NAMES.truckSupplies,
    );
    lines.push({
      Amount: truckSuppliesCents / 100,
      DetailType: "SalesItemLineDetail",
      Description: "Truck Supplies",
      SalesItemLineDetail: {
        ItemRef: truckSuppliesItem,
        Qty: 1,
        UnitPrice: truckSuppliesCents / 100,
      },
    });
  }

  return lines;
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

    if (workOrder.equipment?.team?.name) {
      addText(`Customer: ${workOrder.equipment.team.name}`, fontSize);
    }

    addText(`Created: ${new Date(workOrder.created_date).toLocaleDateString('en-US')}`, fontSize);
    if (workOrder.completed_date) {
      addText(`Completed: ${new Date(workOrder.completed_date).toLocaleDateString('en-US')}`, fontSize);
    }

    yPosition -= 5;

    // Description
    if (workOrder.description) {
      addText('Description:', fontSize, true);
      addText(workOrder.description, fontSize);
      yPosition -= 5;
    }

    // Public Notes (customer-facing: date only, no author attribution)
    if (publicNotes.length > 0) {
      addText('Notes:', fontSize, true);
      publicNotes.forEach(note => {
        const noteDate = new Date(note.created_at).toLocaleDateString('en-US');
        addText(`- ${note.content} (${noteDate})`, fontSize);
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
    const queryUrl = withMinorVersion(`${QBO_API_BASE}/v3/company/${realmId}/query?query=${encodeURIComponent(`SELECT * FROM Attachable WHERE AttachableRef.EntityRef.type = 'Invoice' AND AttachableRef.EntityRef.value = '${invoiceId}'`)}`);
    
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
    const deleteUrl = withMinorVersion(`${QBO_API_BASE}/v3/company/${realmId}/attachable?operation=delete`);
    
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
 * Result of PDF attachment operation
 */
interface PdfAttachmentResult {
  success: boolean;
  attachmentId?: string;
  intuitTid?: string | null;
  error?: string;
}

/**
 * Upload PDF as attachment to QuickBooks invoice using multipart/form-data
 * 
 * QuickBooks requires file uploads to use the /upload endpoint with multipart/form-data.
 * The JSON-based /attachable endpoint doesn't support FileData for actual file content.
 */
async function attachPDFToInvoice(
  accessToken: string,
  realmId: string,
  invoiceId: string,
  pdfBytes: Uint8Array,
  fileName: string
): Promise<PdfAttachmentResult> {
  try {
    logStep("Uploading PDF attachment via multipart upload", { invoiceId, fileName, size: pdfBytes.length });

    // Build the metadata JSON for the attachment
    const metadata = {
      FileName: fileName,
      ContentType: "application/pdf",
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

    const metadataJson = JSON.stringify(metadata);

    // Use FormData to build a proper multipart/form-data request with raw binary.
    // Previous implementation sent base64-encoded text with Content-Transfer-Encoding
    // headers (an email MIME concept), which QuickBooks does not interpret — the PDF
    // content was stored as corrupt base64 text rather than actual binary PDF data.
    const formData = new FormData();
    formData.append(
      'file_metadata_01',
      new Blob([metadataJson], { type: 'application/json' }),
      'metadata.json'
    );
    formData.append(
      'file_content_01',
      new Blob([pdfBytes], { type: 'application/pdf' }),
      fileName
    );

    // Use the /upload endpoint which properly handles file uploads
    const uploadUrl = withMinorVersion(`${QBO_API_BASE}/v3/company/${realmId}/upload`);
    
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
        // Note: Do NOT set Content-Type manually — fetch() auto-sets it with
        // the correct multipart boundary when using FormData as the body.
      },
      body: formData,
    });

    const intuitTid = getIntuitTid(response);

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Attachment upload failed", { error: errorText, intuit_tid: intuitTid, status: response.status });
      return {
        success: false,
        intuitTid,
        error: `Upload failed (${response.status}): ${errorText.substring(0, 200)}`,
      };
    }

    const result = await response.json();
    const attachmentId = result.AttachableResponse?.[0]?.Attachable?.Id;
    
    // Validate that QuickBooks actually returned an attachment ID.
    // Previously, success was declared solely on HTTP 200 status, but QBO can
    // return 200 with an unexpected response structure (e.g., empty AttachableResponse)
    // resulting in a "successful" upload with no actual attachment.
    if (!attachmentId) {
      logStep("Attachment upload returned 200 but no attachment ID in response", {
        intuit_tid: intuitTid,
        response_body: JSON.stringify(result).substring(0, 500),
      });
      return {
        success: false,
        intuitTid,
        error: 'Upload returned 200 but no attachment ID in response',
      };
    }

    logStep("PDF attachment uploaded successfully", { attachmentId, intuit_tid: intuitTid });
    
    return {
      success: true,
      attachmentId,
      intuitTid,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR uploading PDF attachment", { error: errorMessage });
    console.error("Attachment upload error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

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

    // Get user's organization memberships where they have admin/owner role
    // This is used to filter the work order query for multi-tenancy enforcement
    const { data: userMemberships, error: membershipQueryError } = await supabaseClient
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['owner', 'admin']);

    if (membershipQueryError) {
      logStep("Error fetching user memberships", { error: membershipQueryError.message });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to verify user permissions" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userOrgIds = (userMemberships || []).map(m => m.organization_id);
    
    if (userOrgIds.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "You must be an admin or owner to export invoices" 
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load work order with equipment (which contains team_id and team info)
    // Note: Team association comes from the equipment, NOT directly from the work order
    // Multi-tenancy failsafe: filter by user's admin/owner organization memberships
    // This ensures users can only export work orders from organizations where they have admin rights
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
      .in('organization_id', userOrgIds)
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

    // Verify user has QuickBooks management permission
    const { data: qbPermission, error: qbPermError } = await supabaseClient
      .rpc('can_user_manage_quickbooks', {
        p_user_id: user.id,
        p_organization_id: workOrder.organization_id
      });

    if (qbPermError) {
      logStep("Error checking QuickBooks permission", { error: qbPermError.message });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to verify user permissions" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!qbPermission) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "You do not have permission to export invoices to QuickBooks" 
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
        error: `Work order's equipment must be assigned to a team to export to QuickBooks (Work Order ID: ${work_order_id})` 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve QB customer ID: prefer team → customer account, fall back to legacy mapping
    let resolvedQBCustomerId: string | null = null;
    let resolvedDisplayName: string | null = null;

    const { data: teamRow, error: teamError } = await supabaseClient
      .from('teams')
      .select('customer_id')
      .eq('id', equipmentTeamId)
      .eq('organization_id', workOrder.organization_id)
      .single();

    if (teamError) {
      logStep('Error resolving team for QB customer', {
        work_order_id,
        equipmentTeamId,
        organization_id: workOrder.organization_id,
        error: teamError.message,
        code: teamError.code,
      });
    }

    if (teamRow?.customer_id) {
      const { data: customerAccount } = await supabaseClient
        .from('customers')
        .select('quickbooks_customer_id, name')
        .eq('id', teamRow.customer_id)
        .eq('organization_id', workOrder.organization_id)
        .single();

      if (customerAccount?.quickbooks_customer_id) {
        resolvedQBCustomerId = customerAccount.quickbooks_customer_id;
        resolvedDisplayName = customerAccount.name;
      }
    }

    // Fallback to legacy mapping table
    if (!resolvedQBCustomerId) {
      const { data: legacyMapping } = await supabaseClient
        .from('quickbooks_team_customers')
        .select('quickbooks_customer_id, display_name')
        .eq('organization_id', workOrder.organization_id)
        .eq('team_id', equipmentTeamId)
        .single();

      if (legacyMapping) {
        resolvedQBCustomerId = legacyMapping.quickbooks_customer_id;
        resolvedDisplayName = legacyMapping.display_name;
      }
    }

    if (!resolvedQBCustomerId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Team does not have a QuickBooks customer mapping. Please map the team to a QuickBooks customer first." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerMapping: TeamCustomerMapping = {
      quickbooks_customer_id: resolvedQBCustomerId,
      display_name: resolvedDisplayName ?? 'Unknown',
    };

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
      .select('id, description, quantity, unit_price_cents, total_price_cents, inventory_item_id')
      .eq('work_order_id', work_order_id);

    // Load work order notes
    const { data: notes } = await supabaseClient
      .from('work_order_notes')
      .select('id, content, is_private, author_name, created_at, hours_worked, machine_hours')
      .eq('work_order_id', work_order_id)
      .order('created_at', { ascending: true });

    const { data: statusHistory } = await supabaseClient
      .from('work_order_status_history')
      .select('id, old_status, new_status, changed_at, reason, work_orders!inner(organization_id)')
      .eq('work_order_id', work_order_id)
      .eq('work_orders.organization_id', workOrder.organization_id)
      .order('changed_at', { ascending: true });

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

    const invoiceLines = await buildInvoiceLines(
      accessToken,
      credentials.realm_id,
      (costs || []) as WorkOrderCost[],
      (notes || []) as WorkOrderNote[],
    );
    if (invoiceLines.length === 0) {
      throw new Error("No billable line items were found for this work order.");
    }
    const privateNote = buildPrivateNote(
      workOrder as WorkOrderData,
      (notes || []) as WorkOrderNote[],
      (costs || []) as WorkOrderCost[],
    );
    const customerMemo = buildCustomerMemo(
      workOrder as WorkOrderData,
      (notes || []) as WorkOrderNote[],
      (statusHistory || []) as WorkOrderStatusEvent[],
    );
    const customFields = buildInvoiceCustomFields(
      workOrder as WorkOrderData,
      (notes || []) as WorkOrderNote[],
    );

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
    let intuitTid: string | null = null;
    let pdfAttachmentStatus: 'success' | 'failed' | 'skipped' | 'disabled' = ENABLE_PDF_ATTACHMENT ? 'skipped' : 'disabled';
    let pdfAttachmentError: string | null = null;
    let pdfAttachmentIntuitTid: string | null = null;

    logStep("PDF attachment feature", { enabled: ENABLE_PDF_ATTACHMENT, environment: QBO_ENVIRONMENT });

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
        const getInvoiceUrl = withMinorVersion(`${QBO_API_BASE}/v3/company/${credentials.realm_id}/invoice/${existingExport.quickbooks_invoice_id}`);
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
        // Check for Fault in 200 OK response (QBO best practice)
        if (existingInvoiceData.Fault) {
          const faultMsg = JSON.stringify(existingInvoiceData.Fault).substring(0, 300);
          logStep("Fault in invoice read response", { fault: faultMsg });
          throw new Error(`Failed to read existing invoice: ${faultMsg}`);
        }
        const existingInvoice = existingInvoiceData.Invoice;

        // Build updated invoice
        const updatedInvoice: QuickBooksInvoice = {
          Id: existingInvoice.Id,
          SyncToken: existingInvoice.SyncToken,
          CustomerRef: { value: customerMapping.quickbooks_customer_id },
          Line: invoiceLines,
          CustomField: customFields,
          PrivateNote: privateNote,
          CustomerMemo: { value: customerMemo },
        };

        const updateUrl = withMinorVersion(`${QBO_API_BASE}/v3/company/${credentials.realm_id}/invoice`);
        const updateResponse = await fetch(updateUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedInvoice),
        });

        // Capture intuit_tid from response headers for troubleshooting
        intuitTid = getIntuitTid(updateResponse);

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          logStep("Invoice update failed", { error: errorText, intuit_tid: intuitTid });
          throw new Error("Failed to update invoice in QuickBooks");
        }

        const updateResult = await updateResponse.json();
        // Check for Fault in 200 OK response (QBO best practice)
        if (updateResult.Fault) {
          const faultMsg = JSON.stringify(updateResult.Fault).substring(0, 300);
          logStep("Fault in invoice update response", { fault: faultMsg, intuit_tid: intuitTid });
          throw new Error(`Invoice update Fault: ${faultMsg}`);
        }
        invoiceId = updateResult.Invoice.Id;
        invoiceNumber = updateResult.Invoice.DocNumber;
        isUpdate = true;
        
        logStep("Invoice updated", { invoiceId, invoiceNumber, intuit_tid: intuitTid });

        // Audit log: Track invoice update for compliance
        try {
          const { error: auditError } = await supabaseClient.rpc('log_invoice_export_audit', {
            p_organization_id: workOrder.organization_id,
            p_work_order_id: work_order_id,
            p_action: 'UPDATE',
            p_quickbooks_invoice_id: invoiceId,
            p_quickbooks_invoice_number: invoiceNumber,
            p_realm_id: credentials.realm_id,
            p_ip_address: getClientIpAddress(req),
            p_actor_id: user.id
          });
          
          if (auditError) {
            // Log audit error but don't fail the export
            logStep("Warning: Audit logging failed", { 
              error: auditError.message 
            });
          }
        } catch (auditError) {
          // Log unexpected exceptions (network/runtime errors)
          logStep("Warning: Audit logging failed with exception", { 
            error: auditError instanceof Error ? auditError.message : String(auditError) 
          });
        }

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
                  const getAttachUrl = `${QBO_API_BASE}/v3/company/${credentials.realm_id}/attachable/${attachment.Id}`;
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
            const attachResult = await attachPDFToInvoice(
              accessToken,
              credentials.realm_id,
              invoiceId,
              pdfBytes,
              pdfFileName
            );

            // Track attachment result
            if (attachResult.success) {
              pdfAttachmentStatus = 'success';
              pdfAttachmentIntuitTid = attachResult.intuitTid || null;
            } else {
              pdfAttachmentStatus = 'failed';
              pdfAttachmentError = attachResult.error || 'Unknown error';
              pdfAttachmentIntuitTid = attachResult.intuitTid || null;
              logStep("PDF attachment failed (invoice still updated)", { error: pdfAttachmentError });
            }
          } catch (pdfError) {
            // Log error but don't fail the entire export
            const errorMessage = pdfError instanceof Error ? pdfError.message : String(pdfError);
            pdfAttachmentStatus = 'failed';
            pdfAttachmentError = errorMessage;
            logStep("ERROR: PDF attachment failed (invoice still updated)", { error: errorMessage });
            console.error("PDF attachment error:", pdfError);
            // Continue - invoice export succeeded even if PDF attachment failed
          }
        }

      } else {
        // Create new invoice
        // Generate invoice number from work order ID
        // Format: WO-XXXXXXXX (uses the first 8 characters of the work order UUID, uppercase)
        // This ensures uniqueness since work order IDs are UUIDs
        // QuickBooks requires this when "Custom transaction numbers" is enabled in company settings
        const generatedDocNumber = `WO-${work_order_id.substring(0, 8).toUpperCase()}`;
        logStep("Creating new invoice", { docNumber: generatedDocNumber });

        const newInvoice: QuickBooksInvoice = {
          DocNumber: generatedDocNumber,
          CustomerRef: { value: customerMapping.quickbooks_customer_id },
          Line: invoiceLines,
          CustomField: customFields,
          PrivateNote: privateNote,
          CustomerMemo: { value: customerMemo },
          TxnDate: new Date().toISOString().split('T')[0],
        };

        if (workOrder.due_date) {
          newInvoice.DueDate = workOrder.due_date.split('T')[0];
        }

        const createUrl = withMinorVersion(`${QBO_API_BASE}/v3/company/${credentials.realm_id}/invoice`);
        const createResponse = await fetch(createUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newInvoice),
        });

        // Capture intuit_tid from response headers for troubleshooting
        intuitTid = getIntuitTid(createResponse);

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          logStep("Invoice creation failed", { error: errorText, intuit_tid: intuitTid });
          throw new Error("Failed to create invoice in QuickBooks");
        }

        const createResult = await createResponse.json();
        // Check for Fault in 200 OK response (QBO best practice)
        if (createResult.Fault) {
          const faultMsg = JSON.stringify(createResult.Fault).substring(0, 300);
          logStep("Fault in invoice create response", { fault: faultMsg, intuit_tid: intuitTid });
          throw new Error(`Invoice create Fault: ${faultMsg}`);
        }
        invoiceId = createResult.Invoice.Id;
        invoiceNumber = createResult.Invoice.DocNumber;
        
        logStep("Invoice created", { invoiceId, invoiceNumber, intuit_tid: intuitTid });

        // Audit log: Track invoice creation for compliance
        try {
          const { error: auditError } = await supabaseClient.rpc('log_invoice_export_audit', {
            p_organization_id: workOrder.organization_id,
            p_work_order_id: work_order_id,
            p_action: 'CREATE',
            p_quickbooks_invoice_id: invoiceId,
            p_quickbooks_invoice_number: invoiceNumber,
            p_realm_id: credentials.realm_id,
            p_ip_address: getClientIpAddress(req),
            p_actor_id: user.id
          });
          
          if (auditError) {
            // Log audit error but don't fail the export
            logStep("Warning: Audit logging failed", { 
              error: auditError.message 
            });
          }
        } catch (auditError) {
          // Log unexpected exceptions (network/runtime errors)
          logStep("Warning: Audit logging failed with exception", { 
            error: auditError instanceof Error ? auditError.message : String(auditError) 
          });
        }

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
            const attachResult = await attachPDFToInvoice(
              accessToken,
              credentials.realm_id,
              invoiceId,
              pdfBytes,
              pdfFileName
            );

            // Track attachment result
            if (attachResult.success) {
              pdfAttachmentStatus = 'success';
              pdfAttachmentIntuitTid = attachResult.intuitTid || null;
            } else {
              pdfAttachmentStatus = 'failed';
              pdfAttachmentError = attachResult.error || 'Unknown error';
              pdfAttachmentIntuitTid = attachResult.intuitTid || null;
              logStep("PDF attachment failed (invoice still created)", { error: pdfAttachmentError });
            }
          } catch (pdfError) {
            // Log error but don't fail the entire export
            const errorMessage = pdfError instanceof Error ? pdfError.message : String(pdfError);
            pdfAttachmentStatus = 'failed';
            pdfAttachmentError = errorMessage;
            logStep("ERROR: PDF attachment failed (invoice still created)", { error: errorMessage });
            console.error("PDF attachment error:", pdfError);
            // Continue - invoice export succeeded even if PDF attachment failed
          }
        }
      }

      // Update log entry with success (including all tracking fields)
      if (logEntry?.id) {
        await supabaseClient
          .from('quickbooks_export_logs')
          .update({
            quickbooks_invoice_id: invoiceId,
            quickbooks_invoice_number: invoiceNumber,
            quickbooks_environment: QBO_ENVIRONMENT,
            status: 'success',
            exported_at: new Date().toISOString(),
            intuit_tid: intuitTid,
            pdf_attachment_status: pdfAttachmentStatus,
            pdf_attachment_error: pdfAttachmentError,
            pdf_attachment_intuit_tid: pdfAttachmentIntuitTid,
          })
          .eq('id', logEntry.id);
      }

      logStep("Invoice exported successfully", { 
        invoiceId, 
        invoiceNumber, 
        isUpdate, 
        intuit_tid: intuitTid,
        pdfAttachmentStatus,
        environment: QBO_ENVIRONMENT
      });

      return new Response(JSON.stringify({ 
        success: true, 
        invoice_id: invoiceId,
        invoice_number: invoiceNumber,
        is_update: isUpdate,
        environment: QBO_ENVIRONMENT,
        pdf_attached: pdfAttachmentStatus === 'success',
        message: isUpdate 
          ? `Invoice ${invoiceNumber} updated successfully` 
          : `Invoice ${invoiceNumber} created successfully`
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (exportError) {
      // Update log entry with error (including all tracking fields)
      if (logEntry?.id) {
        const errorMessage = exportError instanceof Error ? exportError.message : String(exportError);
        await supabaseClient
          .from('quickbooks_export_logs')
          .update({
            status: 'error',
            error_message: errorMessage.substring(0, 1000),
            intuit_tid: intuitTid,
            quickbooks_environment: QBO_ENVIRONMENT,
            pdf_attachment_status: pdfAttachmentStatus,
            pdf_attachment_error: pdfAttachmentError,
            pdf_attachment_intuit_tid: pdfAttachmentIntuitTid,
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
