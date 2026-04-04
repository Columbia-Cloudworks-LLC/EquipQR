import { assertEquals } from "jsr:@std/assert@1";
import { __testables } from "./index.ts";

// ---------------------------------------------------------------------------
// buildHealthResponse – healthy path
// ---------------------------------------------------------------------------

Deno.test("buildHealthResponse returns ok:true when db check passes", () => {
  const result = __testables.buildHealthResponse({
    ok: true,
    latency_ms: 12,
  });

  assertEquals(result.ok, true);
  assertEquals(result.service, "healthcheck");
  assertEquals(typeof result.checked_at, "string");
  assertEquals(result.checks.db.ok, true);
  assertEquals(result.checks.db.latency_ms, 12);
  assertEquals(result.checks.db.error_code, undefined);
});

// ---------------------------------------------------------------------------
// buildHealthResponse – unhealthy path
// ---------------------------------------------------------------------------

Deno.test("buildHealthResponse returns ok:false with error_code when db check fails", () => {
  const result = __testables.buildHealthResponse({
    ok: false,
    latency_ms: 5000,
    error_code: "timeout",
  });

  assertEquals(result.ok, false);
  assertEquals(result.service, "healthcheck");
  assertEquals(result.checks.db.ok, false);
  assertEquals(result.checks.db.error_code, "timeout");
});

Deno.test("buildHealthResponse returns ok:false for rpc_failed", () => {
  const result = __testables.buildHealthResponse({
    ok: false,
    latency_ms: 42,
    error_code: "rpc_failed",
  });

  assertEquals(result.ok, false);
  assertEquals(result.checks.db.error_code, "rpc_failed");
});

// ---------------------------------------------------------------------------
// Response shape stability – both healthy and unhealthy have same top-level keys
// ---------------------------------------------------------------------------

Deno.test("healthy and unhealthy responses share the same top-level keys", () => {
  const healthy = __testables.buildHealthResponse({ ok: true, latency_ms: 5 });
  const unhealthy = __testables.buildHealthResponse({
    ok: false,
    latency_ms: 99,
    error_code: "rpc_failed",
  });

  const healthyKeys = Object.keys(healthy).sort();
  const unhealthyKeys = Object.keys(unhealthy).sort();
  assertEquals(healthyKeys, unhealthyKeys);

  const healthyDbKeys = Object.keys(healthy.checks.db).sort();
  const unhealthyDbKeys = Object.keys(unhealthy.checks.db)
    .filter((k) => k !== "error_code")
    .sort();
  assertEquals(healthyDbKeys, unhealthyDbKeys);
});
