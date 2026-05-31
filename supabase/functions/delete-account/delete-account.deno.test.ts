import { assertEquals } from "jsr:@std/assert@1";
import { __testables } from "./index.ts";

Deno.test("normalizeEmail lowercases and trims", () => {
  assertEquals(__testables.normalizeEmail("  User@Example.COM "), "user@example.com");
});

Deno.test("CONFIRMATION_PHRASE matches product copy", () => {
  assertEquals(__testables.CONFIRMATION_PHRASE, "DELETE MY ACCOUNT");
});

Deno.test("removeStoragePathsInChunks groups by bucket", async () => {
  const removedCalls: Array<{ bucket: string; paths: string[] }> = [];
  const admin = {
    storage: {
      from(bucket: string) {
        return {
          remove(paths: string[]) {
            removedCalls.push({ bucket, paths });
            return Promise.resolve({ error: null });
          },
        };
      },
    },
  } as unknown as Parameters<typeof __testables.removeStoragePathsInChunks>[0];

  const result = await __testables.removeStoragePathsInChunks(admin, [
    { bucket: "user-avatars", path: "u1/a.jpg" },
    { bucket: "user-avatars", path: "u1/b.jpg" },
  ]);

  assertEquals(result.removed, 2);
  assertEquals(result.failures.length, 0);
  assertEquals(removedCalls.length, 1);
  assertEquals(removedCalls[0]?.bucket, "user-avatars");
});
