import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  QBO_API_BASE_PRODUCTION,
  QBO_API_BASE_SANDBOX,
  resolveQboApiBase,
} from "./quickbooks-config.ts";

function clearQboEnv(): void {
  Deno.env.delete("QBO_API_BASE");
  Deno.env.delete("QBO_USE_SANDBOX");
}

Deno.test("resolveQboApiBase defaults to production", () => {
  clearQboEnv();
  assertEquals(resolveQboApiBase(), QBO_API_BASE_PRODUCTION);
});

Deno.test("resolveQboApiBase uses sandbox when QBO_USE_SANDBOX=true", () => {
  clearQboEnv();
  Deno.env.set("QBO_USE_SANDBOX", "true");
  try {
    assertEquals(resolveQboApiBase(), QBO_API_BASE_SANDBOX);
  } finally {
    Deno.env.delete("QBO_USE_SANDBOX");
  }
});

Deno.test("resolveQboApiBase honors QBO_API_BASE override", () => {
  clearQboEnv();
  Deno.env.set("QBO_API_BASE", "https://custom.example.com/");
  try {
    assertEquals(resolveQboApiBase(), "https://custom.example.com");
  } finally {
    Deno.env.delete("QBO_API_BASE");
  }
});
