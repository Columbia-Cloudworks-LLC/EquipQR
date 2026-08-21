/**
 * IDE-only ambient types for Deno tests in this folder.
 * Deno resolves `jsr:` and `Deno.test` at runtime; the workspace TypeScript
 * language service does not unless these declarations are in its project.
 */

declare namespace Deno {
  function test(name: string, fn: () => void | Promise<void>): void;
  function test(t: {
    name: string;
    fn: () => void | Promise<void>;
    ignore?: boolean;
    only?: boolean;
  }): void;

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
  export function assertThrows(
    fn: () => unknown,
    errorClassOrMsg?: unknown,
    msgIncludesOrMsg?: string,
    msg?: string,
  ): unknown;
  export function assertStrictEquals<T>(
    actual: T,
    expected: T,
    msg?: string,
  ): void;
}
