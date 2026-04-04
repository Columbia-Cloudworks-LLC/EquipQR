import type {
  SingleWorkOrderGoogleDocData,
  PhotoEvidenceEntry,
  QuickFactEntry,
} from "./work-order-google-docs-single-data.ts";

export interface PacketBuildResult {
  requests: Array<Record<string, unknown>>;
  warnings: string[];
  sectionOrder: string[];
  evidencePageCount: number;
}

/**
 * Builds Google Docs API batchUpdate requests for the executive packet layout.
 *
 * The document is built in two passes:
 * 1. Content pass: insert all text, tables, page breaks, and images
 * 2. Format pass: apply styling (bold, font size, colors) to ranges
 *
 * Content is appended sequentially using endOfSegmentLocation so we don't
 * need to track absolute indices during insertion.
 */
export function buildExecutivePacketRequests(
  data: SingleWorkOrderGoogleDocData,
): PacketBuildResult {
  const warnings: string[] = [];
  const contentRequests: Array<Record<string, unknown>> = [];
  const formatRequests: Array<Record<string, unknown>> = [];
  const sectionOrder: string[] = [];
  let evidencePageCount = 0;

  let cursor = 1;

  function insertText(text: string, bold = false, fontSize?: number) {
    contentRequests.push({
      insertText: {
        text,
        endOfSegmentLocation: { segmentId: "" },
      },
    });
    const start = cursor;
    cursor += text.length;
    if (bold || fontSize) {
      const textStyle: Record<string, unknown> = {};
      if (bold) textStyle.bold = true;
      if (fontSize) textStyle.fontSize = { magnitude: fontSize, unit: "PT" };
      formatRequests.push({
        updateTextStyle: {
          range: { startIndex: start, endIndex: cursor },
          textStyle,
          fields: [bold ? "bold" : "", fontSize ? "fontSize" : ""].filter(Boolean).join(","),
        },
      });
    }
  }

  function insertPageBreak() {
    contentRequests.push({
      insertPageBreak: {
        endOfSegmentLocation: { segmentId: "" },
      },
    });
    cursor += 2;
  }

  // --- HEADER BAND ---
  sectionOrder.push("Header");

  insertText(`${data.organization.name}\n`, true, 20);
  insertText("Internal Work Order Packet\n", false, 14);
  insertText(`${data.workOrder.title}\n`, true, 16);
  insertText(`Generated: ${data.generatedAt.split("T")[0]}\n\n`, false, 10);

  if (data.organization.logoUrl) {
    try {
      contentRequests.push({
        insertInlineImage: {
          uri: data.organization.logoUrl,
          location: { index: 1 },
          objectSize: {
            height: { magnitude: 50, unit: "PT" },
            width: { magnitude: 150, unit: "PT" },
          },
        },
      });
      cursor += 1;
    } catch {
      warnings.push("Organization logo could not be inserted.");
    }
  }

  // --- QUICK FACTS ---
  sectionOrder.push("QuickFacts");
  insertText("Quick Facts\n", true, 14);
  for (const fact of data.quickFacts) {
    insertText(`${fact.label}: `, true);
    insertText(`${fact.value}\n`);
  }
  insertText("\n");

  // --- OPENING SUMMARY ---
  sectionOrder.push("OpeningSummary");
  insertText("Summary\n", true, 14);
  if (data.workOrder.description) {
    insertText(`${data.workOrder.description}\n\n`);
  }
  if (data.equipment.name) {
    insertText("Equipment: ", true);
    insertText(`${data.equipment.name}`);
    if (data.equipment.manufacturer || data.equipment.model) {
      insertText(` (${[data.equipment.manufacturer, data.equipment.model].filter(Boolean).join(" ")})`);
    }
    insertText("\n");
    if (data.equipment.serialNumber) {
      insertText("Serial Number: ", true);
      insertText(`${data.equipment.serialNumber}\n`);
    }
    if (data.equipment.location) {
      insertText("Location: ", true);
      insertText(`${data.equipment.location}\n`);
    }
  }
  insertText("\n");

  // --- PHOTO HIGHLIGHTS ---
  if (data.photoHighlights.length > 0) {
    sectionOrder.push("PhotoHighlights");
    insertText("Photo Highlights\n", true, 14);
    insertText(`${data.photoHighlights.length} photo(s) attached. See Photo Evidence appendix for full details.\n\n`);

    for (const photo of data.photoHighlights) {
      if (photo.canInlineImage && photo.imageUrl) {
        contentRequests.push({
          insertInlineImage: {
            uri: photo.imageUrl,
            endOfSegmentLocation: { segmentId: "" },
            objectSize: {
              height: { magnitude: 120, unit: "PT" },
              width: { magnitude: 160, unit: "PT" },
            },
          },
        });
        cursor += 1;
      }
    }
    insertText("\n");
  }

  // --- LABOR ACTIVITY ---
  if (data.activityEntries.length > 0) {
    sectionOrder.push("LaborActivity");
    insertText("Labor Activity\n", true, 14);
    for (const entry of data.activityEntries) {
      insertText(`${entry.date} — ${entry.authorName}`, true);
      if (entry.hoursWorked > 0) {
        insertText(` (${entry.hoursWorked}h)`);
      }
      insertText("\n");
      insertText(`${entry.content}\n`);
      if (entry.photoCount > 0) {
        insertText(`📷 ${entry.photoCount} photo(s) attached\n`);
      }
      insertText("\n");
    }
  }

  // --- MATERIALS & COSTS ---
  if (data.costs.length > 0) {
    sectionOrder.push("MaterialsAndCosts");
    insertText("Materials & Costs\n", true, 14);
    insertText("Description | Qty | Unit Price | Total | Inventory | Added By | Date\n", true);
    for (const cost of data.costs) {
      insertText(
        `${cost.description} | ${cost.quantity} | $${cost.unitPrice.toFixed(2)} | $${cost.totalPrice.toFixed(2)} | ${cost.fromInventory ? "Yes" : "No"} | ${cost.addedBy} | ${cost.dateAdded}\n`,
      );
    }
    const totalCost = data.costs.reduce((sum, c) => sum + c.totalPrice, 0);
    insertText(`Total: $${totalCost.toFixed(2)}\n\n`, true);
  }

  // --- PM CHECKLIST ---
  if (data.pmChecklist.length > 0) {
    sectionOrder.push("PMChecklist");
    insertText("PM Checklist\n", true, 14);
    if (data.pmStatus) {
      insertText(`Status: ${data.pmStatus.replace(/_/g, " ").toUpperCase()}\n`, true);
    }
    if (data.pmGeneralNotes) {
      insertText(`Notes: ${data.pmGeneralNotes}\n`);
    }
    insertText("\n");
    let currentSection = "";
    for (const item of data.pmChecklist) {
      if (item.section !== currentSection) {
        currentSection = item.section;
        insertText(`${currentSection}\n`, true, 12);
      }
      insertText(`  ${item.itemTitle}: ${item.conditionText}`);
      if (item.required) insertText(" (Required)");
      insertText("\n");
      if (item.notes) {
        insertText(`    ${item.notes}\n`);
      }
    }
    insertText("\n");
  }

  // --- TIMELINE ---
  if (data.timeline.length > 0) {
    sectionOrder.push("Timeline");
    insertText("Timeline\n", true, 14);
    for (const event of data.timeline) {
      insertText(`${event.changedAt} `, true);
      insertText(`${event.previousStatus} → ${event.newStatus}`);
      insertText(` by ${event.changedBy}`);
      if (event.reason) insertText(` — ${event.reason}`);
      insertText("\n");
    }
    insertText("\n");
  }

  // --- PHOTO EVIDENCE APPENDIX ---
  if (data.photoEvidence.length > 0) {
    sectionOrder.push("PhotoEvidence");
    insertPageBreak();
    insertText("Photo Evidence\n", true, 16);
    insertText("Each photo is shown with its related activity note for standalone evidence review.\n\n");

    for (const photo of data.photoEvidence) {
      insertPageBreak();
      evidencePageCount++;

      insertText(`${photo.noteAuthorName} — ${photo.noteCreatedAt}\n`, true, 11);
      insertText(`${photo.noteContent}\n\n`);
      insertText(`File: ${photo.fileName}\n`);

      if (photo.canInlineImage && photo.imageUrl) {
        contentRequests.push({
          insertInlineImage: {
            uri: photo.imageUrl,
            endOfSegmentLocation: { segmentId: "" },
            objectSize: {
              height: { magnitude: 500, unit: "PT" },
              width: { magnitude: 468, unit: "PT" },
            },
          },
        });
        cursor += 1;
      } else {
        insertText("\n[Photo could not be rendered inline");
        if (photo.mimeType) insertText(` — format: ${photo.mimeType}`);
        insertText("]\n");
        if (!photo.imageUrl) {
          warnings.push(`Evidence page for "${photo.fileName}": image URL is missing.`);
        } else {
          warnings.push(`Evidence page for "${photo.fileName}": unsupported format (${photo.mimeType}).`);
        }
      }
      insertText("\n");
    }
  }

  const requests = [...contentRequests, ...formatRequests];

  return { requests, warnings, sectionOrder, evidencePageCount };
}
