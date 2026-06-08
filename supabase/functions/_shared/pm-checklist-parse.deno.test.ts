import { assertEquals } from "jsr:@std/assert@1";
import { parsePMChecklistData } from "./pm-checklist-parse.ts";

Deno.test("parsePMChecklistData parses JSON string checklist data", () => {
  const raw = JSON.stringify([
    {
      section: "Engine",
      title: "Oil level",
      condition: 1,
      required: true,
      notes: "Looks good",
    },
  ]);

  const result = parsePMChecklistData(raw);

  assertEquals(result.error, null);
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].section, "Engine");
  assertEquals(result.items[0].title, "Oil level");
  assertEquals(result.items[0].condition, 1);
  assertEquals(result.items[0].required, true);
  assertEquals(result.items[0].notes, "Looks good");
});

Deno.test("parsePMChecklistData accepts array checklist data", () => {
  const raw = [
    {
      section: "Hydraulics",
      title: "Hose inspection",
      condition: 3,
      required: false,
    },
  ];

  const result = parsePMChecklistData(raw);

  assertEquals(result.error, null);
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].section, "Hydraulics");
  assertEquals(result.items[0].title, "Hose inspection");
  assertEquals(result.items[0].condition, 3);
  assertEquals(result.items[0].required, false);
});

Deno.test("parsePMChecklistData returns parse error for invalid JSON", () => {
  const result = parsePMChecklistData("{not-json");

  assertEquals(result.items, []);
  assertEquals(result.error instanceof Error, true);
});

Deno.test("parsePMChecklistData returns empty items for nullish data", () => {
  const result = parsePMChecklistData(null);

  assertEquals(result.error, null);
  assertEquals(result.items, []);
});
