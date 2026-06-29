import { assert, assertEquals, assertMatch } from "jsr:@std/assert@1";
import { __testables } from "./index.ts";

const FAKE_CORRELATION_ID = "00000000-0000-4000-8000-000000000002";

function buildAnonPostRequest(): Request {
  return new Request("https://example.test/functions/v1/send-invitation-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      invitationId: "inv-1",
      email: "invitee@example.com",
      role: "member",
      organizationName: "Test Org",
      inviterName: "Admin User",
    }),
  });
}

function silenceConsole(fn: () => Promise<void>): Promise<void> {
  const origError = console.error;
  const origLog = console.log;
  console.error = () => {};
  console.log = () => {};
  return fn().finally(() => {
    console.error = origError;
    console.log = origLog;
  });
}

function captureConsole(fn: () => Promise<void>): Promise<string[]> {
  const origLog = console.log;
  const lines: string[] = [];
  console.log = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  return fn().finally(() => {
    console.log = origLog;
  }).then(() => lines);
}

async function withEnv(
  pairs: Record<string, string | undefined>,
  fn: () => Promise<void>,
): Promise<void> {
  const prior: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(pairs)) {
    prior[k] = Deno.env.get(k) ?? undefined;
    if (v === undefined) {
      Deno.env.delete(k);
    } else {
      Deno.env.set(k, v);
    }
  }
  try {
    await fn();
  } finally {
    for (const [k, v] of Object.entries(prior)) {
      if (v === undefined) {
        Deno.env.delete(k);
      } else {
        Deno.env.set(k, v);
      }
    }
  }
}

Deno.test({
  name:
    "ordering: missing RESEND_API_KEY returns 500 even with no auth header (secret loads BEFORE requireAuthenticatedPost)",
  permissions: { env: ["RESEND_API_KEY"] },
  fn: async () => {
    await withEnv(
      {
        RESEND_API_KEY: undefined,
      },
      async () => {
        await silenceConsole(async () => {
          const res = await __testables.handle(buildAnonPostRequest(), {
            correlationId: FAKE_CORRELATION_ID,
          });

          assertEquals(
            res.status,
            500,
            "Expected 500 because the missing required secret should be detected before auth runs.",
          );

          const body = await res.text();
          assert(
            !body.includes("RESEND_API_KEY"),
            "Response body must not leak the secret name.",
          );
        });
      },
    );
  },
});

const PLATFORM_FAKES = {
  SUPABASE_URL: "https://fake.supabase.test",
  SUPABASE_ANON_KEY: "fake-anon-key-for-test-only",
} as const;

Deno.test({
  name:
    "ordering: with RESEND_API_KEY present, no auth header returns 401 (auth runs AFTER the secret check)",
  permissions: { env: ["RESEND_API_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY"] },
  fn: async () => {
    await withEnv(
      {
        RESEND_API_KEY: "test-fake-not-a-real-key",
        ...PLATFORM_FAKES,
      },
      async () => {
        await silenceConsole(async () => {
          const res = await __testables.handle(buildAnonPostRequest(), {
            correlationId: FAKE_CORRELATION_ID,
          });

          assertEquals(
            res.status,
            401,
            "Expected 401 because auth should run after the required secret is confirmed present.",
          );
        });
      },
    );
  },
});

Deno.test("buildInvitationEmailSubject uses raw organization name (not HTML-escaped)", () => {
  const subject = __testables.buildInvitationEmailSubject("A&B Corp");
  assertEquals(subject, "You're invited to join A&B Corp on EquipQR™");
  assertEquals(subject.includes("&amp;"), false);
});

Deno.test({
  name: "deliverInvitationEmail returns 200 with emailId on successful Resend send",
  fn: async () => {
    const lines = await captureConsole(async () => {
      const res = await __testables.deliverInvitationEmail(
        {
          resendApiKey: "re_test",
          email: "invitee@example.com",
          organizationName: "Test Org",
          emailHtml: "<p>Hello</p>",
          invitationId: "inv-1",
        },
        async () => ({
          data: { id: "email-abc" },
          error: null,
        }),
      );

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body, { success: true, emailId: "email-abc" });
    });

    assert(lines.some((line) => line.includes("Email sent successfully")));
  },
});

Deno.test({
  name: "deliverInvitationEmail returns 500 and logs Resend API rejected send on Resend error",
  fn: async () => {
    const lines = await captureConsole(async () => {
      const res = await __testables.deliverInvitationEmail(
        {
          resendApiKey: "re_test",
          email: "invitee@example.com",
          organizationName: "Test Org",
          emailHtml: "<p>Hello</p>",
          invitationId: "inv-1",
        },
        async () => ({
          data: null,
          error: {
            name: "validation_error",
            message: "Invalid recipient",
          },
        }),
      );

      assertEquals(res.status, 500);
      const body = await res.text();
      assertEquals(body.includes("RESEND_API_KEY"), false);
    });

    const rejectionLog = lines.find((line) =>
      line.includes("Resend API rejected send")
    );
    assert(rejectionLog !== undefined);
    assert(rejectionLog!.includes("validation_error"));
    assert(rejectionLog!.includes("Invalid recipient"));
  },
});

Deno.test({
  name: "module does not import npm:resend (source uses native fetch helper)",
  permissions: { read: true },
  fn: () => {
    const source = Deno.readTextFileSync(
      new URL("./index.ts", import.meta.url),
    );
    assertMatch(source, /sendResendEmail/);
    assertEquals(source.includes("npm:resend"), false);
  },
});
