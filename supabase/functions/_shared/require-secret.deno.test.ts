import { assert, assertEquals, assertStrictEquals, assertThrows } from "jsr:@std/assert@1";
import {
  MissingSecretError,
  optionalSecret,
  requireSecret,
} from "./require-secret.ts";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Captures all `console.error` and `console.log` calls during `fn`,
 * returning every captured argument list. Restores the originals on exit.
 */
function captureConsole(
  fn: () => void,
): { error: unknown[][]; log: unknown[][] } {
  const originalError = console.error;
  const originalLog = console.log;
  const error: unknown[][] = [];
  const log: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    error.push(args);
  };
  console.log = (...args: unknown[]) => {
    log.push(args);
  };
  try {
    fn();
  } finally {
    console.error = originalError;
    console.log = originalLog;
  }
  return { error, log };
}

/**
 * Set + restore Deno.env values in a single try/finally so a failing
 * assertion never leaks env state into the next test.
 */
function withEnv(
  values: Record<string, string | null>,
  fn: () => void,
): void {
  const previous: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(values)) {
    previous[k] = Deno.env.get(k);
    if (v === null) Deno.env.delete(k);
    else Deno.env.set(k, v);
  }
  try {
    fn();
  } finally {
    for (const [k, prev] of Object.entries(previous)) {
      if (prev === undefined) Deno.env.delete(k);
      else Deno.env.set(k, prev);
    }
  }
}

// =============================================================================
// requireSecret
// =============================================================================

Deno.test("requireSecret returns the canonical value when set", () => {
  withEnv({ TEST_REQUIRE_SECRET: "abc123" }, () => {
    const value = requireSecret("TEST_REQUIRE_SECRET", { functionName: "test-fn" });
    assertEquals(value, "abc123");
  });
});

Deno.test("requireSecret falls back to legacy aliases in priority order", () => {
  withEnv(
    {
      TEST_REQUIRE_SECRET: null,
      TEST_REQUIRE_SECRET_LEGACY_A: null,
      TEST_REQUIRE_SECRET_LEGACY_B: "legacyB",
    },
    () => {
      const value = requireSecret("TEST_REQUIRE_SECRET", {
        functionName: "test-fn",
        legacyAliases: ["TEST_REQUIRE_SECRET_LEGACY_A", "TEST_REQUIRE_SECRET_LEGACY_B"],
      });
      assertEquals(value, "legacyB");
    },
  );
});

Deno.test("requireSecret prefers the canonical value over legacy aliases", () => {
  withEnv(
    {
      TEST_REQUIRE_SECRET: "primary",
      TEST_REQUIRE_SECRET_LEGACY_A: "legacy",
    },
    () => {
      const value = requireSecret("TEST_REQUIRE_SECRET", {
        functionName: "test-fn",
        legacyAliases: ["TEST_REQUIRE_SECRET_LEGACY_A"],
      });
      assertEquals(value, "primary");
    },
  );
});

Deno.test("requireSecret throws MissingSecretError when nothing resolves", () => {
  withEnv(
    {
      TEST_REQUIRE_SECRET: null,
      TEST_REQUIRE_SECRET_LEGACY_A: null,
    },
    () => {
      const { error } = captureConsole(() => {
        const err = assertThrows(
          () =>
            requireSecret("TEST_REQUIRE_SECRET", {
              functionName: "test-fn",
              legacyAliases: ["TEST_REQUIRE_SECRET_LEGACY_A"],
            }),
          MissingSecretError,
        );
        assertEquals(err.secretName, "TEST_REQUIRE_SECRET");
        assertEquals(err.functionName, "test-fn");
        assertEquals(err.legacyAliasesChecked, ["TEST_REQUIRE_SECRET_LEGACY_A"]);
      });

      // Exactly one structured log line, on console.error
      assertEquals(error.length, 1);
      const [arg] = error[0];
      assertEquals(typeof arg, "string");
      const parsed = JSON.parse(arg as string);
      assertEquals(parsed.code, "MISSING_REQUIRED_SECRET");
      assertEquals(parsed.level, "error");
      assertEquals(parsed.function, "test-fn");
      assertEquals(parsed.secret, "TEST_REQUIRE_SECRET");
      assertEquals(parsed.legacyAliasesChecked, ["TEST_REQUIRE_SECRET_LEGACY_A"]);
      assert(typeof parsed.timestamp === "string", "timestamp must be ISO string");
    },
  );
});

Deno.test("requireSecret never logs the value, even partially", () => {
  // Use a sentinel value with distinctive substrings so any leak would be obvious.
  const sentinel = "SECRETVALUEDONOTLOG_SECRETVALUEDONOTLOG";
  withEnv(
    {
      TEST_REQUIRE_SECRET: sentinel,
    },
    () => {
      const { error, log } = captureConsole(() => {
        const value = requireSecret("TEST_REQUIRE_SECRET", { functionName: "test-fn" });
        assertEquals(value, sentinel);
      });
      // No logs at all on the success path.
      assertEquals(error.length, 0);
      assertEquals(log.length, 0);
    },
  );

  // Also ensure the failure path never logs the value (because none is read).
  withEnv({ TEST_REQUIRE_SECRET: null }, () => {
    const { error } = captureConsole(() => {
      assertThrows(
        () => requireSecret("TEST_REQUIRE_SECRET", { functionName: "test-fn" }),
        MissingSecretError,
      );
    });
    const serialized = JSON.stringify(error);
    assert(
      !serialized.includes(sentinel) && !serialized.includes("SECRETVALUE"),
      "structured log line must never include the secret value",
    );
  });
});

Deno.test("requireSecret treats empty string as absent", () => {
  withEnv(
    {
      TEST_REQUIRE_SECRET: "",
      TEST_REQUIRE_SECRET_LEGACY_A: "fallback-value",
    },
    () => {
      // Empty string should NOT count — falls through to alias.
      const value = requireSecret("TEST_REQUIRE_SECRET", {
        functionName: "test-fn",
        legacyAliases: ["TEST_REQUIRE_SECRET_LEGACY_A"],
      });
      assertEquals(value, "fallback-value");
    },
  );
});

// =============================================================================
// optionalSecret
// =============================================================================

Deno.test("optionalSecret returns the value when set", () => {
  withEnv({ TEST_OPTIONAL_SECRET: "abc" }, () => {
    assertEquals(optionalSecret("TEST_OPTIONAL_SECRET"), "abc");
  });
});

Deno.test("optionalSecret returns null when absent (no log)", () => {
  withEnv({ TEST_OPTIONAL_SECRET: null }, () => {
    const { error, log } = captureConsole(() => {
      assertStrictEquals(optionalSecret("TEST_OPTIONAL_SECRET"), null);
    });
    // optionalSecret must never log — missing optional config is not an error.
    assertEquals(error.length, 0);
    assertEquals(log.length, 0);
  });
});

Deno.test("optionalSecret falls back to legacy aliases", () => {
  withEnv(
    {
      TEST_OPTIONAL_SECRET: null,
      TEST_OPTIONAL_SECRET_LEGACY: "legacy-value",
    },
    () => {
      const value = optionalSecret("TEST_OPTIONAL_SECRET", {
        legacyAliases: ["TEST_OPTIONAL_SECRET_LEGACY"],
      });
      assertEquals(value, "legacy-value");
    },
  );
});
