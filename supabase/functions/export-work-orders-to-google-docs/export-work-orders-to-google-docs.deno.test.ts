import { assertEquals } from "jsr:@std/assert@1";
import { __testables } from "./index.ts";
import { GOOGLE_SCOPES } from "../_shared/google-workspace-token.ts";

type DocsExportTestables = typeof __testables & {
  hasRequiredDocsExportScopes?: (scopes: string | null | undefined) => boolean;
};

Deno.test("hasRequiredDocsExportScopes returns false when the documents scope is missing", () => {
  const helper = (__testables as DocsExportTestables).hasRequiredDocsExportScopes;

  assertEquals(typeof helper, "function");
  assertEquals(
    helper?.([
      GOOGLE_SCOPES.DRIVE_FILE,
      GOOGLE_SCOPES.DRIVE_READONLY,
    ].join(" ")),
    false,
  );
});

Deno.test("hasRequiredDocsExportScopes returns true when Drive and Docs scopes are present", () => {
  const helper = (__testables as DocsExportTestables).hasRequiredDocsExportScopes;

  assertEquals(typeof helper, "function");
  assertEquals(
    helper?.([
      GOOGLE_SCOPES.DRIVE_FILE,
      GOOGLE_SCOPES.DOCUMENTS,
    ].join(" ")),
    true,
  );
});
