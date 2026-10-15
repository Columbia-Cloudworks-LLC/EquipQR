import { assertEquals } from "jsr:@std/assert@1";
import { isDfyOperator, parseOperatorUserIds } from "./dfy-operator.ts";

const OP_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OP_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CONFIRMED = "2026-10-14T00:00:00Z";

Deno.test("parseOperatorUserIds: unset, empty, or blank allowlist yields nobody", () => {
  assertEquals(parseOperatorUserIds(undefined), []);
  assertEquals(parseOperatorUserIds(null), []);
  assertEquals(parseOperatorUserIds(""), []);
  assertEquals(parseOperatorUserIds(" , ,"), []);
});

Deno.test("parseOperatorUserIds: trims, lowercases, dedupes, drops malformed entries", () => {
  assertEquals(
    parseOperatorUserIds(` ${OP_A.toUpperCase()} ,${OP_B},not-a-uuid,${OP_A},*`),
    [OP_A, OP_B],
  );
});

Deno.test("isDfyOperator: empty allowlist denies everyone", () => {
  assertEquals(isDfyOperator({ id: OP_A, email_confirmed_at: CONFIRMED }, []), false);
});

Deno.test("isDfyOperator: allowlisted ID with confirmed email is an operator", () => {
  assertEquals(isDfyOperator({ id: OP_A, email_confirmed_at: CONFIRMED }, [OP_A, OP_B]), true);
});

Deno.test("isDfyOperator: unconfirmed email is denied even when allowlisted", () => {
  assertEquals(isDfyOperator({ id: OP_A, email_confirmed_at: undefined }, [OP_A]), false);
});

Deno.test("isDfyOperator: an ID not on the list is denied", () => {
  assertEquals(
    isDfyOperator({ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", email_confirmed_at: CONFIRMED }, [OP_A]),
    false,
  );
});

Deno.test("isDfyOperator: reads DFY_OPERATOR_USER_IDS by default and fails closed when unset", () => {
  const previous = Deno.env.get("DFY_OPERATOR_USER_IDS");
  try {
    Deno.env.delete("DFY_OPERATOR_USER_IDS");
    assertEquals(isDfyOperator({ id: OP_A, email_confirmed_at: CONFIRMED }), false);
    Deno.env.set("DFY_OPERATOR_USER_IDS", OP_A);
    assertEquals(isDfyOperator({ id: OP_A, email_confirmed_at: CONFIRMED }), true);
  } finally {
    if (previous === undefined) Deno.env.delete("DFY_OPERATOR_USER_IDS");
    else Deno.env.set("DFY_OPERATOR_USER_IDS", previous);
  }
});
