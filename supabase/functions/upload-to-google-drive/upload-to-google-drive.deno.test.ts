/**
 * Deno unit tests for Google Drive upload pure helpers.
 */
import { assertEquals } from "jsr:@std/assert@1";
import { decodeBase64Content, isDecodedSizeAllowed } from "./gdrive-decode.ts";
import {
  estimateDecodedSize,
  MAX_FILE_SIZE_BYTES,
  sanitizeFilename,
} from "./gdrive-validation.ts";

Deno.test("sanitizeFilename strips unsafe characters and preserves extension", () => {
  assertEquals(sanitizeFilename("  report..final  .pdf  "), "report_final_.pdf");
  assertEquals(sanitizeFilename("../../../etc/passwd"), "_etc_passwd");
  assertEquals(sanitizeFilename(""), "uploaded-file");
});

Deno.test("estimateDecodedSize approximates base64 payload size", () => {
  const payload = btoa("hello");
  assertEquals(estimateDecodedSize(payload), 6);
});

Deno.test("decodeBase64Content round-trips simple payloads", () => {
  const original = "EquipQR upload";
  const encoded = btoa(original);
  const decoded = decodeBase64Content(encoded);
  assertEquals(new TextDecoder().decode(decoded), original);
});

Deno.test("isDecodedSizeAllowed rejects payloads at or above max size", () => {
  const underLimit = "A".repeat(Math.floor((MAX_FILE_SIZE_BYTES * 4) / 3) - 4);
  const atLimit = "A".repeat(Math.ceil((MAX_FILE_SIZE_BYTES * 4) / 3));
  assertEquals(isDecodedSizeAllowed(underLimit), true);
  assertEquals(isDecodedSizeAllowed(atLimit), false);
});
