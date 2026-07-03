import { assertEquals } from "jsr:@std/assert@1";
import {
  isWorkOrderEquipmentAccessible,
  __workOrderExportAuthTestables,
} from "./work-order-export-auth.ts";

Deno.test("SCOPED_TEAM_ROLES includes requestor and viewer only", () => {
  assertEquals(__workOrderExportAuthTestables.SCOPED_TEAM_ROLES, ["requestor", "viewer"]);
});

Deno.test("isWorkOrderEquipmentAccessible allows admin any equipment", () => {
  assertEquals(
    isWorkOrderEquipmentAccessible({ mode: "admin" }, "eq-1"),
    true,
  );
});

Deno.test("isWorkOrderEquipmentAccessible denies scoped when equipment missing", () => {
  assertEquals(
    isWorkOrderEquipmentAccessible({ mode: "scoped", equipmentIds: ["eq-1"] }, null),
    false,
  );
});

Deno.test("isWorkOrderEquipmentAccessible checks scoped equipment list", () => {
  const access = { mode: "scoped" as const, equipmentIds: ["eq-1", "eq-2"] };
  assertEquals(isWorkOrderEquipmentAccessible(access, "eq-1"), true);
  assertEquals(isWorkOrderEquipmentAccessible(access, "eq-3"), false);
});
