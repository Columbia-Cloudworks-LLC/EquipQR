#!/usr/bin/env npx tsx

/**
 * run-related.ts
 *
 * Given a list of modified source files, finds their corresponding
 * test files (.test.ts, .test.tsx, .spec.ts, .spec.tsx) and runs
 * only those tests via the project's custom test runner.
 *
 * Usage:
 *   npx tsx .cursor/skills/test-orchestrator/scripts/run-related.ts <file1> [file2] ...
 *
 * Examples:
 *   npx tsx .cursor/skills/test-orchestrator/scripts/run-related.ts src/hooks/useAuth.ts
 *   npx tsx .cursor/skills/test-orchestrator/scripts/run-related.ts src/utils/date.ts src/features/equipment/hooks/useEquipment.ts
 *
 * Exit codes:
 *   0 = all tests passed (or no test files found)
 *   1 = test failures or runtime error
 */

import { existsSync } from "fs";
import { spawn, execSync } from "child_process";
import path from "path";

const ROOT = path.resolve(import.meta.dirname ?? __dirname, "../../../..");
const TEST_RUNNER = path.join(ROOT, "scripts", "test-runner.mjs");
const IS_WINDOWS = process.platform === "win32";

// Extensions to try when searching for test counterparts
const TEST_SUFFIXES = [
  ".test.ts",
  ".test.tsx",
  ".spec.ts",
  ".spec.tsx",
] as const;

// Strip source extension (.ts, .tsx)
function stripExt(filePath: string): string {
  return filePath.replace(/\.(ts|tsx)$/, "");
}

/**
 * Resolve a source file to its test counterpart.
 *
 * Search order:
 *   1. __tests__/<basename>.test.ts(x) | .spec.ts(x)   (sibling __tests__ dir)
 *   2. <basename>.test.ts(x) | .spec.ts(x)             (co-located next to source)
 *   3. If the file IS already a test file, return it directly
 */
function findTestFile(sourceFile: string): string | null {
  const abs = path.resolve(ROOT, sourceFile);

  // If the file is already a test file, return it
  if (/\.(test|spec)\.(ts|tsx)$/.test(abs)) {
    return existsSync(abs) ? abs : null;
  }

  const dir = path.dirname(abs);
  const base = path.basename(stripExt(abs));

  // 1. Look in __tests__/ sibling directory
  for (const suffix of TEST_SUFFIXES) {
    const candidate = path.join(dir, "__tests__", `${base}${suffix}`);
    if (existsSync(candidate)) return candidate;
  }

  // 2. Look co-located next to source file
  for (const suffix of TEST_SUFFIXES) {
    const candidate = path.join(dir, `${base}${suffix}`);
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

/**
 * Convert an absolute path to a root-relative POSIX path for vitest.
 */
function toRelative(abs: string): string {
  return path.relative(ROOT, abs).replace(/\\/g, "/");
}

// ── Main ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: npx tsx run-related.ts <file1> [file2] ...");
    console.error("  Provide one or more source file paths (relative to project root).");
    process.exit(1);
  }

  // Deduplicate and resolve
  const seen = new Set<string>();
  const testFiles: string[] = [];
  const warnings: string[] = [];

  for (const raw of args) {
    // Normalize to forward slashes and strip leading ./ if present
    const normalized = raw.replace(/\\/g, "/").replace(/^\.\//, "");
    const test = findTestFile(normalized);

    if (test) {
      const rel = toRelative(test);
      if (!seen.has(rel)) {
        seen.add(rel);
        testFiles.push(rel);
      }
    } else {
      warnings.push(normalized);
    }
  }

  // Report warnings
  if (warnings.length > 0) {
    console.warn(`\n⚠ No test files found for:`);
    for (const w of warnings) {
      console.warn(`   ${w}`);
    }
  }

  if (testFiles.length === 0) {
    console.log("\n✅ No related test files to run.");
    process.exit(0);
  }

  console.log(`\n🧪 Running ${testFiles.length} related test file(s):`);
  for (const t of testFiles) {
    console.log(`   ${t}`);
  }
  console.log();

  // Spawn the project's test runner with the discovered test files
  const exitCode = await runTests(testFiles);
  process.exit(exitCode);
}

function runTests(testFiles: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(
      "node",
      [TEST_RUNNER, ...testFiles],
      {
        stdio: "inherit",
        cwd: ROOT,
        shell: IS_WINDOWS,
        env: process.env,
      }
    );

    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", (err) => {
      console.error("Failed to start test runner:", err.message);
      resolve(1);
    });
  });
}

main().catch((err) => {
  console.error("run-related.ts fatal error:", err);
  process.exit(1);
});
