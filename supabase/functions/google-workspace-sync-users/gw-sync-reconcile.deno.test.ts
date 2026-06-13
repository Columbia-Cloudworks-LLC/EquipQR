import { assertEquals } from "jsr:@std/assert@1";
import { __gwSyncReconcileTestables } from "./gw-sync-reconcile.ts";

const {
  isReconcileRpcSchemaDriftError,
  toReconcileRpcError,
  formatReconcileErrorForLog,
} = __gwSyncReconcileTestables;

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

Deno.test("toReconcileRpcError preserves PostgREST fields on a real Error", () => {
  const wrapped = toReconcileRpcError({
    message: "organization_id is required",
    code: "P0001",
    details: "constraint detail",
    hint: "check org id",
  });

  assertEquals(wrapped.message, "organization_id is required");
  assertEquals(wrapped.code, "P0001");
  assertEquals(wrapped.details, "constraint detail");
  assertEquals(wrapped.hint, "check org id");
  assertEquals(wrapped instanceof Error, true);
});

Deno.test("formatReconcileErrorForLog extracts message from non-Error RPC objects", () => {
  assertEquals(
    formatReconcileErrorForLog({ message: "organization_id is required", code: "P0001" }),
    {
      message: "organization_id is required",
      code: "P0001",
      details: undefined,
      hint: undefined,
    },
  );
});
