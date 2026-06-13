import { assertEquals } from "jsr:@std/assert@1";
import { __gwSyncReconcileTestables } from "./gw-sync-reconcile.ts";

const { isReconcileRpcSchemaDriftError } = __gwSyncReconcileTestables;

Deno.test("isReconcileRpcSchemaDriftError detects missing RPC in schema cache", () => {
  assertEquals(
    isReconcileRpcSchemaDriftError(
      "Could not find the function public.reconcile_google_workspace_directory(p_organization_id, p_sync_started_at) in the schema cache",
    ),
    true,
  );
});

Deno.test("isReconcileRpcSchemaDriftError ignores unrelated reconcile failures", () => {
  assertEquals(
    isReconcileRpcSchemaDriftError("organization_id is required"),
    false,
  );
});
