import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  resolveDriveCreateParentId,
  sanitizeDriveFolderName,
} from "./google-drive-folder-management.ts";

Deno.test("sanitizeDriveFolderName strips unsafe characters", () => {
  assertEquals(sanitizeDriveFolderName("  Ops/Field\\Team  "), "Ops - Field - Team");
  assertEquals(sanitizeDriveFolderName("   "), "Unnamed");
});

Deno.test("resolveDriveCreateParentId maps shared drive root to drive id", () => {
  assertEquals(resolveDriveCreateParentId("root", "drive-123"), "drive-123");
  assertEquals(resolveDriveCreateParentId("folder-abc", "drive-123"), "folder-abc");
});
