import { assertEquals } from "jsr:@std/assert@1";
import {
  hashToken,
  normalizeTextValue,
  parseTemplateData,
  validateOperatorChecklistAnswers,
  validateOperatorInputFields,
  sanitizeOperatorChecklistAnswers,
} from "../_shared/operator-checklist-validation.ts";

Deno.test("parseTemplateData supports checklist items and data fields", () => {
  const parsed = parseTemplateData({
    checklistItems: [{ id: "a", title: "Brakes", required: true, section: "Safety" }],
    dataFields: [{ id: "f1", label: "Your name", source: "operator_input", inputType: "text", required: true }],
  });
  assertEquals(parsed.checklistItems.length, 1);
  assertEquals(parsed.dataFields.length, 1);
});

Deno.test("validateOperatorChecklistAnswers requires required items", () => {
  const items = [
    { id: "a", title: "Brakes", required: true, section: "Safety" },
    { id: "b", title: "Lights", required: false, section: "Safety" },
  ];
  const incomplete = validateOperatorChecklistAnswers(items, []);
  assertEquals(incomplete.isComplete, false);
  assertEquals(incomplete.requiredItemCount, 1);

  const complete = validateOperatorChecklistAnswers(items, [{ item_id: "a", passed: true }]);
  assertEquals(complete.isComplete, true);
  assertEquals(complete.answeredRequiredCount, 1);
});

Deno.test("validateOperatorInputFields requires configured operator fields", () => {
  const fields = [{
    id: "name",
    label: "Your name",
    source: "operator_input" as const,
    inputType: "text" as const,
    required: true,
  }];
  const incomplete = validateOperatorInputFields(fields, {});
  assertEquals(incomplete.isComplete, false);

  const complete = validateOperatorInputFields(fields, { name: "Jane" });
  assertEquals(complete.isComplete, true);
});

Deno.test("sanitizeOperatorChecklistAnswers drops unknown items and normalizes notes", () => {
  const items = [{ id: "a", title: "Brakes", required: true, section: "Safety" }];
  const sanitized = sanitizeOperatorChecklistAnswers(items, [
    { item_id: "a", passed: true, notes: "  ok  " },
    { item_id: "unknown", passed: true },
    { item_id: "a", passed: "yes" as unknown as boolean },
  ]);
  assertEquals(sanitized, [{ item_id: "a", passed: true, notes: "ok" }]);
});

Deno.test("normalizeTextValue trims and caps length", () => {
  assertEquals(normalizeTextValue("  Jane  ", 200), "Jane");
  assertEquals(normalizeTextValue("x".repeat(300), 200)?.length, 200);
});

Deno.test("hashToken is deterministic", async () => {
  const a = await hashToken("test-token");
  const b = await hashToken("test-token");
  assertEquals(a, b);
  assertEquals(a.length, 64);
});
