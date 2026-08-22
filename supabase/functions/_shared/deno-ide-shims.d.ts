/**
 * IDE-only ambient types for `_shared` Edge Function helpers.
 * Deno resolves `npm:` / `jsr:` / HTTPS specifiers and `Deno.*` at runtime;
 * the workspace TypeScript language service does not unless these
 * declarations are in its project.
 */

declare namespace Deno {
  function test(name: string, fn: () => void | Promise<void>): void;
  function test(t: {
    name: string;
    fn: () => void | Promise<void>;
    ignore?: boolean;
    only?: boolean;
    permissions?: {
      env?: boolean | string[];
      net?: boolean | string[];
      read?: boolean | string[];
      write?: boolean | string[];
    };
  }): void;

  function serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): void;

  const env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
  };
}

declare module "jsr:@std/assert@1" {
  export function assert(expr: unknown, msg?: string): asserts expr;
  export function assertEquals(
    actual: unknown,
    expected: unknown,
    msg?: string,
  ): void;
  export function assertExists<T>(
    actual: T,
    msg?: string,
  ): asserts actual is NonNullable<T>;
  export function assertMatch(
    actual: string,
    expected: RegExp,
    msg?: string,
  ): void;
  export function assertRejects(
    fn: () => Promise<unknown>,
    errorClassOrMsg?: unknown,
    msgIncludesOrMsg?: string,
    msg?: string,
  ): Promise<unknown>;
  export function assertThrows<E = unknown>(
    fn: () => unknown,
    errorClassOrMsg?: new (...args: never[]) => E,
    msgIncludesOrMsg?: string,
    msg?: string,
  ): E;
  export function assertStrictEquals<T>(
    actual: T,
    expected: T,
    msg?: string,
  ): void;
}

declare module "https://deno.land/std@0.224.0/assert/mod.ts" {
  export {
    assert,
    assertEquals,
    assertExists,
    assertMatch,
    assertRejects,
    assertThrows,
    assertStrictEquals,
  } from "jsr:@std/assert@1";
}

declare module "npm:@supabase/supabase-js@2.45.0" {
  export * from "@supabase/supabase-js";
}

declare module "https://esm.sh/zod@4.4.3" {
  export * from "zod";
}
