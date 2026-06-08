import { assert, assertEquals } from "jsr:@std/assert@1";
import { __testables } from "./index.ts";

const {
  coerceMetadataObject,
  parseTicketRequestBody,
  validateTitleAndDescription,
  sanitizeForMarkdown,
  redactPII,
  sanitizeMetadata,
  insertTicketWithRetry,
  MIN_TITLE_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_DESCRIPTION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} = __testables;

Deno.test("coerceMetadataObject accepts omitted/null and rejects non-objects", () => {
  assertEquals(coerceMetadataObject(undefined), {});
  assertEquals(coerceMetadataObject(null), {});
  assertEquals(coerceMetadataObject({ appVersion: "1.0.0" }), { appVersion: "1.0.0" });
  assertEquals(coerceMetadataObject("bad"), null);
});

Deno.test("parseTicketRequestBody rejects invalid metadata and short title", async () => {
  const invalidMetadata = parseTicketRequestBody({
    title: "Valid title",
    description: "Valid description text",
    metadata: "bad" as unknown as Record<string, unknown>,
  });
  assertEquals(invalidMetadata.ok, false);
  if (!invalidMetadata.ok) {
    assertEquals(invalidMetadata.response.status, 400);
  }

  const shortTitle = parseTicketRequestBody({
    title: "abc",
    description: "Valid description text",
  });
  assertEquals(shortTitle.ok, false);
  if (!shortTitle.ok) {
    assertEquals(shortTitle.response.status, 400);
  }
});

Deno.test("validateTitleAndDescription enforces bounds", () => {
  const tooShort = validateTitleAndDescription("abc", "1234567890");
  assertEquals(tooShort.ok, false);

  const valid = validateTitleAndDescription(
    "Valid title",
    "Valid description text"
  );
  assertEquals(valid.ok, true);
  if (valid.ok) {
    assertEquals(valid.payload.trimmedTitle, "Valid title");
    assertEquals(valid.payload.trimmedDescription, "Valid description text");
  }

  const longTitle = "x".repeat(MAX_TITLE_LENGTH + 1);
  const tooLong = validateTitleAndDescription(longTitle, "1234567890");
  assertEquals(tooLong.ok, false);
});

Deno.test("sanitizeForMarkdown and redactPII remove unsafe content", () => {
  const sanitized = sanitizeForMarkdown("Hello @admin | [link](https://example.com)");
  assert(!sanitized.includes("@admin"));
  assert(sanitized.includes("\\|"));

  const redacted = redactPII("Contact me at user@example.com or 555-123-4567");
  assert(redacted.includes("[email redacted]"));
  assert(redacted.includes("[phone redacted]"));
});

Deno.test("sanitizeMetadata whitelists known fields", () => {
  const metadata = sanitizeMetadata({
    appVersion: "3.8.1",
    userAgent: "Mozilla/5.0",
    currentUrl: "https://equipqr.app/dashboard?token=secret",
    featureFlags: { billingEnabled: true, quickbooksEnabled: false, unknown: true },
    recentErrors: ["Error one", "Error two"],
    performanceMetrics: { pageLoadTime: 1200, memoryUsage: 64 },
  });

  assertEquals(metadata.appVersion, "3.8.1");
  assertEquals(metadata.featureFlags, {
    billingEnabled: true,
    quickbooksEnabled: false,
  });
  assertEquals(metadata.recentErrors.length, 2);
  assertEquals(metadata.performanceMetrics.pageLoadTime, 1200);
});

Deno.test("insertTicketWithRetry treats unique-violation as success", async () => {
  const adminClient = {
    from(table: string) {
      assertEquals(table, "tickets");
      let call = 0;
      return {
        insert() {
          call += 1;
          return {
            select() {
              return {
                async single() {
                  if (call === 1) {
                    return {
                      data: null,
                      error: { code: "23505", message: "duplicate key" },
                    };
                  }
                  return { data: null, error: { message: "unexpected" } };
                },
              };
            },
          };
        },
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return { data: { id: "ticket-existing" } };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as Parameters<typeof insertTicketWithRetry>[0];

  const result = await insertTicketWithRetry(adminClient, {
    userId: "user-1",
    trimmedTitle: "Valid title",
    trimmedDescription: "Valid description text",
    sanitizedMetadata: sanitizeMetadata({}),
    githubIssue: { number: 42, html_url: "https://github.com/example/issues/42" },
  });

  assertEquals(result.ticket, { id: "ticket-existing" });
});
