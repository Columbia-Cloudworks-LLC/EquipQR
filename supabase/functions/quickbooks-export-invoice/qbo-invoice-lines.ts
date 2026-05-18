/**
 * QuickBooks invoice sales lines, PM-facing descriptions, and private memo builder.
 * Split from index.ts so Deno unit tests can import testables without starting Deno.serve.
 */
import {
  QBO_API_BASE,
  QBO_INVOICE_ITEM_INCOME_ACCOUNT_NAME,
  QBO_INVOICE_ITEM_NAMES,
  resolveQboDefaultLaborRateCents,
  resolveQboInvoicePartsItemType,
  withMinorVersion,
} from "../_shared/quickbooks-config.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const safeDetails = details ? { ...details } : undefined;
  if (safeDetails) {
    delete safeDetails.access_token;
    delete safeDetails.refresh_token;
  }
  const detailsStr = safeDetails ? ` - ${JSON.stringify(safeDetails)}` : "";
  console.log(`[QUICKBOOKS-EXPORT-INVOICE] ${step}${detailsStr}`);
};

export interface WorkOrderData {
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

export interface WorkOrderCost {
  id?: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number | null;
  inventory_item_id?: string | null;
}

export interface WorkOrderNote {
  id?: string;
  content: string;
  hours_worked?: number | null;
  machine_hours?: number | null;
  is_private: boolean;
  author_name: string | null;
  created_at: string;
}

/** PM row loaded for invoice line descriptions (customer-facing only). */
export interface PreventativeMaintenanceInvoiceRow {
  id: string;
  checklist_data: unknown;
  notes: string | null;
  completed_by_name: string | null;
  pm_checklist_templates?: { name: string | null } | { name: string | null }[] | null;
}

export type InvoiceSalesLines = Array<{
  Amount: number;
  DetailType: "SalesItemLineDetail";
  Description?: string;
  SalesItemLineDetail: {
    ItemRef: { value: string; name?: string };
    Qty?: number;
    UnitPrice?: number;
    TaxCodeRef?: { value: string };
  };
}>;

export function buildPrivateNote(
  workOrder: WorkOrderData,
  notes: WorkOrderNote[],
  costs: WorkOrderCost[],
): string {
  const lines: string[] = [];

  lines.push(`EquipQR Work Order ID: ${workOrder.id}`);
  lines.push(`Created: ${new Date(workOrder.created_date).toLocaleDateString("en-US")}`);
  if (workOrder.due_date) {
    lines.push(`Due: ${new Date(workOrder.due_date).toLocaleDateString("en-US")}`);
  }
  if (workOrder.completed_date) {
    lines.push(`Completed: ${new Date(workOrder.completed_date).toLocaleDateString("en-US")}`);
  }

  const privateNotes = notes.filter((n) => n.is_private);
  if (privateNotes.length > 0) {
    lines.push("");
    lines.push("Private Notes:");
    privateNotes.forEach((note) => {
      lines.push(`- ${note.content} (${note.author_name || "Unknown"})`);
    });
  }

  if (costs.length > 0) {
    lines.push("");
    lines.push("Cost Breakdown:");
    costs.forEach((cost) => {
      const unitPrice = (cost.unit_price_cents / 100).toFixed(2);
      const total = ((cost.total_price_cents || cost.unit_price_cents * cost.quantity) / 100).toFixed(2);
      lines.push(`- ${cost.description}: ${cost.quantity} x $${unitPrice} = $${total}`);
    });
  }

  let result = lines.join("\n");
  if (result.length > 3900) {
    result = result.substring(0, 3900) + "\n... (truncated)";
  }

  return result;
}

const getCostAmountCents = (cost: WorkOrderCost): number =>
  cost.total_price_cents ?? cost.unit_price_cents * cost.quantity;

/**
 * Matches work-order UI: manual labor lines are "Labor" or "Labor - …" with no inventory link.
 * Inventory-sourced rows are never classified as labor for invoice bucketing.
 */
const isExplicitLaborCostRow = (cost: WorkOrderCost): boolean =>
  !(cost.inventory_item_id ?? null) &&
  /^Labor(\s|$|-)/i.test(cost.description.trim());

/**
 * Escapes a value for safe embedding inside a single-quoted QuickBooks Query Language string literal.
 */
export function escapeQuickBooksQueryValue(value: string): string {
  const stripped = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return stripped.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

type QboItemCreateType = "Service" | "NonInventory";

const INCOME_ACCOUNT_CONFIGURE_HINT =
  "Configure Edge Function secrets QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID or QBO_INVOICE_ITEM_INCOME_ACCOUNT_NAME " +
  "to point at an active Income account in QuickBooks Chart of Accounts.";

export async function resolveIncomeAccountRef(
  accessToken: string,
  realmId: string,
): Promise<{ value: string; name?: string }> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  // Read at call time so Deno tests can set QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID without re-importing modules.
  const configuredIncomeAccountId =
    Deno.env.get("QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID")?.trim() ?? "";

  if (configuredIncomeAccountId) {
    const url = withMinorVersion(
      `${QBO_API_BASE}/v3/company/${realmId}/account/${encodeURIComponent(configuredIncomeAccountId)}`,
    );
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) {
      const errorBody = await res.text();
      const bodySnippet = errorBody.length > 500 ? `${errorBody.slice(0, 500)}…` : errorBody;
      logStep("Configured income account Id lookup failed", {
        id: configuredIncomeAccountId,
        status: res.status,
        body_snippet: bodySnippet.substring(0, 300),
      });
      throw new Error(
        `QuickBooks Income account lookup failed for configured QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID (${configuredIncomeAccountId}) ` +
          `with HTTP ${res.status}: ${bodySnippet.substring(0, 400)}. ${INCOME_ACCOUNT_CONFIGURE_HINT}`,
      );
    }
    const data = await res.json();
    if (
      !data.Fault &&
      data.Account?.Id &&
      data.Account?.AccountType === "Income" &&
      data.Account?.Active !== false
    ) {
      logStep("Resolved income account by configured Id", { id: data.Account.Id });
      return { value: data.Account.Id, name: data.Account.Name };
    }
    logStep("Configured income account Id not usable (not an active Income account)", {
      id: data.Account?.Id,
      accountType: data.Account?.AccountType,
      active: data.Account?.Active,
      fault: data.Fault ? JSON.stringify(data.Fault).slice(0, 300) : undefined,
    });
    const faultSnippet = data.Fault ? JSON.stringify(data.Fault).substring(0, 400) : "";
    throw new Error(
      `Configured QBO_INVOICE_ITEM_INCOME_ACCOUNT_ID (${configuredIncomeAccountId}) did not resolve to an active Income account ` +
        `(accountType=${data.Account?.AccountType ?? "unknown"}, active=${data.Account?.Active ?? "unknown"}` +
        (faultSnippet ? `, fault=${faultSnippet}` : "") +
        `). ${INCOME_ACCOUNT_CONFIGURE_HINT}`,
    );
  }

  if (QBO_INVOICE_ITEM_INCOME_ACCOUNT_NAME) {
    const escaped = escapeQuickBooksQueryValue(QBO_INVOICE_ITEM_INCOME_ACCOUNT_NAME);
    const q = `SELECT * FROM Account WHERE Name = '${escaped}' AND AccountType = 'Income' AND Active = true`;
    const qUrl = withMinorVersion(
      `${QBO_API_BASE}/v3/company/${realmId}/query?query=${encodeURIComponent(q)}`,
    );
    const res = await fetch(qUrl, { method: "GET", headers });
    if (res.ok) {
      const data = await res.json();
      if (!data.Fault && data.QueryResponse?.Account?.[0]?.Id) {
        const acc = data.QueryResponse.Account[0];
        logStep("Resolved income account by configured Name", { id: acc.Id, name: acc.Name });
        return { value: acc.Id, name: acc.Name };
      }
    }
  }

  const fallbackQuery =
    `SELECT * FROM Account WHERE AccountType = 'Income' AND Active = true MAXRESULTS 1`;
  const accountUrl = withMinorVersion(
    `${QBO_API_BASE}/v3/company/${realmId}/query?query=${encodeURIComponent(fallbackQuery)}`,
  );
  const accountResponse = await fetch(accountUrl, { method: "GET", headers });

  if (!accountResponse.ok) {
    throw new Error(
      `Failed to query QuickBooks Income accounts (${accountResponse.status}). ${INCOME_ACCOUNT_CONFIGURE_HINT}`,
    );
  }

  const accountData = await accountResponse.json();
  if (accountData.Fault) {
    throw new Error(
      `QuickBooks account query Fault: ${JSON.stringify(accountData.Fault).substring(0, 300)}. ${INCOME_ACCOUNT_CONFIGURE_HINT}`,
    );
  }
  const incomeAccount = accountData.QueryResponse?.Account?.[0];

  if (!incomeAccount?.Id) {
    throw new Error(
      "No active Income account found in QuickBooks to attach auto-created invoice items. " +
        INCOME_ACCOUNT_CONFIGURE_HINT,
    );
  }

  return { value: incomeAccount.Id, name: incomeAccount.Name };
}

export async function getOrCreateSalesItem(
  accessToken: string,
  realmId: string,
  itemName: string,
  itemType: QboItemCreateType,
  /** Called lazily — only invoked when the item does not exist and must be created. */
  resolveIncomeRef: () => Promise<{ value: string; name?: string }>,
): Promise<{ value: string; name: string }> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const escapedItemName = escapeQuickBooksQueryValue(itemName);
  const specificQuery =
    `SELECT * FROM Item WHERE Name = '${escapedItemName}' AND Active = true`;
  const specificUrl = withMinorVersion(
    `${QBO_API_BASE}/v3/company/${realmId}/query?query=${encodeURIComponent(specificQuery)}`,
  );
  const specificResponse = await fetch(specificUrl, { method: "GET", headers });

  if (!specificResponse.ok) {
    const retryAfter = specificResponse.headers.get("Retry-After");
    const errorBody = await specificResponse.text();
    const bodySnippet = errorBody.length > 500 ? `${errorBody.slice(0, 500)}…` : errorBody;
    const retryPart = retryAfter ? `; Retry-After: ${retryAfter}` : "";
    logStep("QuickBooks item query failed", {
      status: specificResponse.status,
      retry_after: retryAfter ?? null,
      body_snippet: bodySnippet.substring(0, 300),
    });
    throw new Error(
      `QuickBooks item query failed with status ${specificResponse.status}${retryPart} — ${bodySnippet}`,
    );
  }

  const data = await specificResponse.json();
  if (data.Fault) {
    logStep("Fault in item query response", {
      fault: JSON.stringify(data.Fault).substring(0, 300),
    });
    throw new Error(
      `QuickBooks item query Fault: ${JSON.stringify(data.Fault).substring(0, 300)}`,
    );
  } else if (data.QueryResponse?.Item?.[0]) {
    logStep("Found existing QuickBooks item by name", {
      id: data.QueryResponse.Item[0].Id,
      itemName,
      type: data.QueryResponse.Item[0].Type,
    });
    return {
      value: data.QueryResponse.Item[0].Id,
      name: data.QueryResponse.Item[0].Name,
    };
  }

  logStep("QuickBooks item not found, creating", { itemName, itemType });

  const incomeAccountRef = await resolveIncomeRef();
  const createUrl = withMinorVersion(`${QBO_API_BASE}/v3/company/${realmId}/item`);
  const newItem: Record<string, unknown> = {
    Name: itemName,
    Type: itemType,
    IncomeAccountRef: {
      value: incomeAccountRef.value,
      ...(incomeAccountRef.name ? { name: incomeAccountRef.name } : {}),
    },
    Description: `Auto-created ${itemType.toLowerCase()} item for ${itemName}`,
  };

  const createResponse = await fetch(createUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(newItem),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create QuickBooks item: ${createResponse.status} - ${errorText}`);
  }

  const createdItem = await createResponse.json();

  if (createdItem.Fault) {
    throw new Error(
      `QuickBooks create item Fault: ${JSON.stringify(createdItem.Fault).substring(0, 300)}`,
    );
  }

  if (!createdItem?.Item?.Id) {
    throw new Error("QuickBooks returned invalid item structure after creation");
  }

  logStep("Successfully created QuickBooks item", {
    id: createdItem.Item.Id,
    itemName,
    itemType,
  });

  return {
    value: createdItem.Item.Id,
    name: createdItem.Item.Name,
  };
}

const MAX_PM_INVOICE_DESCRIPTION_CHARS = 3900;

function pmTemplateName(pm: PreventativeMaintenanceInvoiceRow | null): string | null {
  if (!pm?.pm_checklist_templates) return null;
  const t = pm.pm_checklist_templates;
  if (Array.isArray(t)) return t[0]?.name ?? null;
  return t.name ?? null;
}

function isPmConditionOk(condition: unknown): boolean {
  return condition === 1;
}

/** Builds PM + public-notes narrative for customer-visible invoice line descriptions. */
export function buildPMInvoiceDescription(
  pm: PreventativeMaintenanceInvoiceRow | null,
  publicNotes: string,
  fallbackTechnician: string,
): string {
  const lines: string[] = [];

  if (pm) {
    const checklistLabel = pmTemplateName(pm)?.trim() || "PM checklist";
    lines.push(`PM performed: ${checklistLabel}.`);

    const rawItems = pm.checklist_data;
    const items: Array<{
      section: string;
      title: string;
      notes?: string;
      description?: string;
      condition?: unknown;
    }> = Array.isArray(rawItems) ? rawItems : [];

    const hasRows = items.length > 0;
    const allOk = hasRows && items.every((it) => isPmConditionOk(it.condition));
    const tech = (pm.completed_by_name?.trim() || fallbackTechnician || "Technician").trim();

    if (hasRows && allOk) {
      lines.push(`All PM items were marked OK by ${tech}.`);
    } else if (hasRows) {
      lines.push(`PM items were reviewed by ${tech}; exceptions are listed below.`);
      const exceptions = items.filter((it) => !isPmConditionOk(it.condition));
      for (const ex of exceptions) {
        const header = `${ex.section} | ${ex.title}`;
        const noteBlock = (ex.notes?.trim() || ex.description?.trim() || "").trim();
        // Compliance: each exception row is `{Section} | {Check}\r\n{Comment}` when a comment exists.
        lines.push(noteBlock ? `${header}\r\n${noteBlock}` : header);
      }
    } else {
      lines.push(`PM checklist was completed by ${tech}; no checklist rows were recorded.`);
    }

    const pmNotes = pm.notes?.trim();
    if (pmNotes) {
      lines.push(pmNotes);
    }
  }

  const pub = publicNotes.trim();
  if (pub) {
    lines.push("Public notes:");
    lines.push(pub);
  }

  let result = lines.filter(Boolean).join("\n");
  if (result.length > MAX_PM_INVOICE_DESCRIPTION_CHARS) {
    result = result.slice(0, MAX_PM_INVOICE_DESCRIPTION_CHARS - 20) + "\n... (truncated)";
  }
  return result;
}

type InvoicePrimaryTarget = "labor" | "parts";

/** Hard cap for any single QuickBooks Line.Description field. */
const MAX_QBO_LINE_DESCRIPTION_CHARS = 3975;

function capLineDescription(desc: string): string {
  if (desc.length <= MAX_QBO_LINE_DESCRIPTION_CHARS) return desc;
  return desc.slice(0, MAX_QBO_LINE_DESCRIPTION_CHARS - 20) + "\n... (truncated)";
}

export async function buildInvoiceLines(
  accessToken: string,
  realmId: string,
  costs: WorkOrderCost[],
  notes: WorkOrderNote[],
  ctx: {
    workOrder: WorkOrderData;
    pm: PreventativeMaintenanceInvoiceRow | null;
    publicNotesText: string;
  },
): Promise<InvoiceSalesLines> {
  void ctx.workOrder;
  const laborMatchedCosts = costs.filter(isExplicitLaborCostRow);
  const partCosts = costs.filter((cost) => !isExplicitLaborCostRow(cost));

  const loggedHours = notes.reduce((sum, note) => sum + (note.hours_worked ?? 0), 0);

  // Same rounded/clamped quantity as QuickBooks Qty for descriptions and default-rate billing.
  const laborQty = loggedHours > 0
    ? Math.max(0.01, Number(loggedHours.toFixed(2)))
    : 1;

  const laborCostsCents = laborMatchedCosts.reduce(
    (sum, cost) => sum + getCostAmountCents(cost),
    0,
  );
  const laborCostsOnlyCents = Math.max(0, laborCostsCents);
  // Prefer aggregated labor cost rows when present. When hours are logged but no
  // labor cost amount exists, bill using configured default rate (cents/hour).
  const defaultLaborRateCents = resolveQboDefaultLaborRateCents();
  let laborTotalCents = laborCostsOnlyCents;
  if (
    loggedHours > 0 &&
    laborCostsOnlyCents === 0 &&
    defaultLaborRateCents > 0
  ) {
    laborTotalCents = Math.max(
      0,
      Math.round(laborQty * defaultLaborRateCents),
    );
  }

  const partsTotalCents = partCosts.reduce((sum, cost) => {
    const cents = getCostAmountCents(cost);
    return sum + (cents > 0 ? cents : 0);
  }, 0);

  const fallbackTechnician =
    [...notes].filter((n) => !n.is_private).slice(-1)[0]?.author_name?.trim() ||
    [...notes].slice(-1)[0]?.author_name?.trim() ||
    "Technician";

  const pmPublicDesc = buildPMInvoiceDescription(
    ctx.pm,
    ctx.publicNotesText,
    fallbackTechnician,
  );

  let primary: InvoicePrimaryTarget | null = null;
  if (laborTotalCents > 0) primary = "labor";
  else if (partsTotalCents > 0) primary = "parts";

  // Return early before any QBO network calls when the work order has no billable lines.
  if (primary === null) {
    return [];
  }

  const lazyIncomeRef = (() => {
    let cached: Promise<{ value: string; name?: string }> | null = null;
    return () => {
      if (!cached) cached = resolveIncomeAccountRef(accessToken, realmId);
      return cached;
    };
  })();
  const partsItemType = resolveQboInvoicePartsItemType();

  const lines: InvoiceSalesLines = [];

  const laborShortDescription = loggedHours > 0
    ? `Labor (${laborQty.toFixed(2)} hrs)`
    : "Labor";

  if (laborTotalCents > 0) {
    const laborItem = await getOrCreateSalesItem(
      accessToken,
      realmId,
      QBO_INVOICE_ITEM_NAMES.labor,
      "Service",
      lazyIncomeRef,
    );
    const laborUnit = (laborTotalCents / 100) / laborQty;
    const laborDescRaw =
      primary === "labor" && pmPublicDesc.trim().length > 0
        ? `${pmPublicDesc.trim()}\n\n${laborShortDescription}`
        : laborShortDescription;
    const laborDesc = capLineDescription(laborDescRaw);

    lines.push({
      Amount: laborTotalCents / 100,
      DetailType: "SalesItemLineDetail",
      Description: laborDesc,
      SalesItemLineDetail: {
        ItemRef: laborItem,
        Qty: laborQty,
        UnitPrice: laborUnit,
      },
    });
  }

  if (partsTotalCents > 0) {
    const partsItem = await getOrCreateSalesItem(
      accessToken,
      realmId,
      QBO_INVOICE_ITEM_NAMES.parts,
      partsItemType,
      lazyIncomeRef,
    );
    const partsDescRaw =
      primary === "parts" && pmPublicDesc.trim().length > 0
        ? `${pmPublicDesc.trim()}\n\nParts`
        : "Parts";
    const partsDesc = capLineDescription(partsDescRaw);

    lines.push({
      Amount: partsTotalCents / 100,
      DetailType: "SalesItemLineDetail",
      Description: partsDesc,
      SalesItemLineDetail: {
        ItemRef: partsItem,
        Qty: 1,
        UnitPrice: partsTotalCents / 100,
      },
    });
  }

  return lines;
}

export const __testables = {
  escapeQuickBooksQueryValue,
  buildPMInvoiceDescription,
  buildPrivateNote,
  buildInvoiceLines,
  resolveIncomeAccountRef,
  getOrCreateSalesItem,
};
