import { assertEquals } from "jsr:@std/assert@1";
import {
  buildAllRows,
  calculateDaysOpen,
  formatDate,
  formatDateTime,
  getConditionText,
  summaryRowToArray,
  truncateId,
} from "./work-orders-export-data.ts";
import type { WorkOrdersWithData } from "./work-orders-export-fetch.ts";

Deno.test("formatDate returns ISO date portion", () => {
  assertEquals(formatDate("2026-03-15T14:30:00Z"), "2026-03-15");
  assertEquals(formatDate(null), "");
});

Deno.test("formatDateTime returns space-separated timestamp", () => {
  assertEquals(formatDateTime("2026-03-15T14:30:00Z"), "2026-03-15 14:30:00");
  assertEquals(formatDateTime(null), "");
});

Deno.test("getConditionText maps PM condition codes", () => {
  assertEquals(getConditionText(null), "Not Rated");
  assertEquals(getConditionText(1), "OK");
  assertEquals(getConditionText(5), "Unsafe Condition Present");
  assertEquals(getConditionText(99), "Unknown");
});

Deno.test("truncateId shortens long UUIDs", () => {
  assertEquals(truncateId("abcd1234"), "abcd1234");
  assertEquals(truncateId("12345678-1234-1234-1234-123456789abc"), "1234...9abc");
});

Deno.test("calculateDaysOpen counts days between created and completed", () => {
  assertEquals(calculateDaysOpen("2026-01-01T00:00:00Z", "2026-01-11T00:00:00Z"), 10);
});

Deno.test("buildAllRows produces summary and PM rows from fetched data", () => {
  const data: WorkOrdersWithData = {
    workOrders: [{
      id: "wo-12345678-1234-1234-1234-123456789abc",
      title: "PM Service",
      description: "Quarterly inspection",
      status: "in_progress",
      priority: "high",
      created_date: "2026-01-01T00:00:00Z",
      due_date: "2026-01-15T00:00:00Z",
      completed_date: null,
      assignee_name: "Alex Tech",
      has_pm: true,
      team_id: "team-1",
      equipment_id: "eq-1",
    }],
    notes: [],
    costs: [],
    pmData: [{
      work_order_id: "wo-12345678-1234-1234-1234-123456789abc",
      status: "completed",
      completed_at: "2026-01-10T12:00:00Z",
      notes: "All checks passed",
      checklist_data: [
        {
          section: "Engine",
          title: "Oil level",
          condition: 1,
          required: true,
          notes: "OK",
        },
      ],
    }],
    history: [],
    equipmentMap: new Map([["eq-1", {
      id: "eq-1",
      name: "Excavator A",
      customer_id: "cust-1",
      customer_name: "Acme Corp",
      manufacturer: "CAT",
      model: "320",
      serial_number: "SN-100",
      location: "Yard 1",
      status: "active",
    }]]),
    teamMap: new Map([["team-1", "Field Team"]]),
  };

  const rows = buildAllRows(data);

  assertEquals(rows.summaryRows.length, 1);
  assertEquals(rows.summaryRows[0].title, "PM Service");
  assertEquals(rows.summaryRows[0].status, "IN PROGRESS");
  assertEquals(rows.summaryRows[0].team, "Field Team");
  assertEquals(rows.pmRows.length, 1);
  assertEquals(rows.pmRows[0].section, "Engine");
  assertEquals(rows.pmRows[0].conditionText, "OK");
});

Deno.test("buildAllRows adds parse error PM row for invalid checklist JSON", () => {
  const data: WorkOrdersWithData = {
    workOrders: [{
      id: "wo-1",
      title: "Broken PM",
      description: "",
      status: "open",
      priority: "low",
      created_date: "2026-01-01T00:00:00Z",
      due_date: null,
      completed_date: null,
      assignee_name: null,
      has_pm: true,
      team_id: null,
      equipment_id: null,
    }],
    notes: [],
    costs: [],
    pmData: [{
      work_order_id: "wo-1",
      status: "in_progress",
      completed_at: null,
      notes: "General note",
      checklist_data: "{invalid",
    }],
    history: [],
    equipmentMap: new Map(),
    teamMap: new Map(),
  };

  const rows = buildAllRows(data);

  assertEquals(rows.pmRows.length, 1);
  assertEquals(rows.pmRows[0].section, "PARSE ERROR");
  assertEquals(rows.pmRows[0].itemTitle, "Unable to parse checklist data");
});

Deno.test("summaryRowToArray maps row fields to spreadsheet cells", () => {
  const cells = summaryRowToArray({
    workOrderId: "wo-1",
    title: "Test WO",
    description: "Desc",
    customerName: "Acme",
    equipmentName: "EQ",
    equipmentSerialNumber: "SN",
    equipmentLocation: "Site",
    status: "OPEN",
    priority: "HIGH",
    createdDate: "2026-01-01",
    dueDate: "2026-01-15",
    completedDate: "",
    daysOpen: 5,
    totalLaborHours: 2.5,
    totalMaterialCost: 100,
    pmStatus: "N/A",
    assignee: "Alex",
    team: "Alpha",
  });

  assertEquals(cells[0], "wo-1");
  assertEquals(cells[1], "Test WO");
  assertEquals(cells[13], 2.5);
  assertEquals(cells[16], "Alex");
});
