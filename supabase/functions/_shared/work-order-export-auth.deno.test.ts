import { assertEquals } from "jsr:@std/assert@1";
import {
  isWorkOrderExportAccessible,
  __workOrderExportAuthTestables,
} from "./work-order-export-auth.ts";

Deno.test("SCOPED_TEAM_ROLES includes requestor and viewer only", () => {
  assertEquals(__workOrderExportAuthTestables.SCOPED_TEAM_ROLES, ["requestor", "viewer"]);
});

Deno.test("isWorkOrderExportAccessible allows admin any equipment", () => {
  assertEquals(
    isWorkOrderExportAccessible({ mode: "admin" }, "team-1", "eq-1"),
    true,
  );
});

Deno.test("isWorkOrderExportAccessible denies scoped when equipment missing", () => {
  assertEquals(
    isWorkOrderExportAccessible({ mode: "scoped", teamIds: ["team-1"] }, "team-1", null),
    false,
  );
});

Deno.test("isWorkOrderExportAccessible checks scoped team membership", () => {
  const access = { mode: "scoped" as const, teamIds: ["team-1", "team-2"] };
  assertEquals(isWorkOrderExportAccessible(access, "team-1", "eq-1"), true);
  assertEquals(isWorkOrderExportAccessible(access, "team-3", "eq-1"), false);
});
