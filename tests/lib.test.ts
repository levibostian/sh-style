/**
 * Tests for library functions (top-level exports).
 * Tests call actual library functions and capture stdout without mocking.
 */

import { assertEquals } from "@std/assert";

/**
 * Helper: Run a library function and capture its stdout.
 * Creates a temp file with the code, runs it as a subprocess, and returns stdout.
 */
async function runLibFunction(code: string, env?: Record<string, string>): Promise<string> {
  const projectRoot = Deno.cwd();
  const tempFile = await Deno.makeTempFile({ suffix: ".ts" });
  
  // Replace relative imports with absolute paths
  const absoluteCode = code.replace(/from "\.\/main\.ts"/g, `from "${projectRoot}/main.ts"`);
  await Deno.writeTextFile(tempFile, absoluteCode);
  
  const command = new Deno.Command("deno", {
    args: ["run", "--allow-env", tempFile],
    stdout: "piped",
    stderr: "piped",
    env: env || {},
  });

  const { stdout } = await command.output();
  await Deno.remove(tempFile);
  
  return new TextDecoder().decode(stdout);
}

Deno.test("lib.title() outputs centered title with double rules", async () => {
  const output = await runLibFunction(`
    import { title } from "./main.ts";
    title("Hello World");
  `);
  
  assertEquals(output, [
    "========================================================================",
    "========================================================================",
    "                              Hello World",
    "========================================================================",
    "========================================================================",
    "",
    "",
    "",
  ].join("\n"));
});

Deno.test("lib.phase() outputs H1 section with full-width rules", async () => {
  const output = await runLibFunction(`
    import { phase } from "./main.ts";
    phase("Setup");
  `);
  
  assertEquals(output, [
    "------------------------------------------------------------------------",
    "## Setup",
    "------------------------------------------------------------------------",
    "",
    "",
    "",
  ].join("\n"));
});

Deno.test("lib.step() outputs H2 subsection with short rules", async () => {
  const output = await runLibFunction(`
    import { step } from "./main.ts";
    step("Install dependencies");
  `);
  
  assertEquals(output, [
    "----------",
    "### Install dependencies",
    "----------",
    "",
    "",
    "",
  ].join("\n"));
});

Deno.test("lib.note() outputs NOTE: prefix", async () => {
  const output = await runLibFunction(`
    import { note } from "./main.ts";
    note("Starting process");
  `);
  
  assertEquals(output, [
    "NOTE: Starting process",
    "",
    "",
    "",
  ].join("\n"));
});

Deno.test("lib.why() outputs WHY: prefix", async () => {
  const output = await runLibFunction(`
    import { why } from "./main.ts";
    why("Better performance");
  `);
  
  assertEquals(output, [
    "WHY: Better performance",
    "",
    "",
    "",
  ].join("\n"));
});

Deno.test("lib.plan() outputs PLAN: prefix", async () => {
  const output = await runLibFunction(`
    import { plan } from "./main.ts";
    plan("Build and deploy");
  `);
  
  assertEquals(output, [
    "PLAN: Build and deploy",
    "",
    "",
    "",
  ].join("\n"));
});

Deno.test("lib.ok() outputs OK: prefix", async () => {
  const output = await runLibFunction(`
    import { ok } from "./main.ts";
    ok("tests passed");
  `);
  
  assertEquals(output, [
    "OK: tests passed",
    "",
    "",
    "",
  ].join("\n"));
});

Deno.test("lib.done() outputs DONE: prefix", async () => {
  const output = await runLibFunction(`
    import { done } from "./main.ts";
    done("build complete");
  `);
  
  assertEquals(output, [
    "DONE: build complete",
    "",
    "",
    "",
  ].join("\n"));
});

Deno.test("lib.cmd() outputs shell command with $ prefix", async () => {
  const output = await runLibFunction(`
    import { cmd } from "./main.ts";
    cmd("npm install");
  `);
  
  assertEquals(output, [
    "  $ npm install",
    "",
    "",
  ].join("\n"));
});

Deno.test("lib.warn() outputs warning with border", async () => {
  const output = await runLibFunction(`
    import { warn } from "./main.ts";
    warn("Something might be wrong");
  `);
  
  assertEquals(output, [
    "!!! WARNING: Something might be wrong",
    "",
    "",
    "",
  ].join("\n"));
});

Deno.test("lib.warn() with details outputs additional lines", async () => {
  const output = await runLibFunction(`
    import { warn } from "./main.ts";
    warn("Low disk space", ["Only 5% remaining", "Consider cleanup"]);
  `);
  
  assertEquals(output, [
    "!!! WARNING: Low disk space",
    "    Only 5% remaining",
    "    Consider cleanup",
    "",
    "",
    "",
  ].join("\n"));
});

Deno.test("lib.error() outputs error box with multiple lines", async () => {
  const output = await runLibFunction(`
    import { error } from "./main.ts";
    error(["Build failed", "Exit code: 1", "Run npm test for details"]);
  `);
  
  assertEquals(output, [
    "+----------------------------------------------------------------------+",
    "| ERROR: Build failed                                                  |",
    "| Exit code: 1                                                         |",
    "| Run npm test for details                                             |",
    "+----------------------------------------------------------------------+",
    "",
    "",
    "",
  ].join("\n"));
});

Deno.test("lib.kv() outputs key-value block", async () => {
  const output = await runLibFunction(`
    import { kv } from "./main.ts";
    kv("ENV", [["node", "20.11.1"], ["os", "ubuntu-22.04"]]);
  `);
  
  assertEquals(output, [
    "ENV:",
    "  node: 20.11.1",
    "  os: ubuntu-22.04",
    "",
    "",
    "",
  ].join("\n"));
});

Deno.test("lib.list() outputs list block", async () => {
  const output = await runLibFunction(`
    import { list } from "./main.ts";
    list("ARTIFACTS", ["dist/app.js", "dist/app.css"]);
  `);
  
  assertEquals(output, [
    "ARTIFACTS:",
    "  - dist/app.js",
    "  - dist/app.css",
    "",
    "",
    "",
  ].join("\n"));
});

Deno.test("lib functions use DOC_WIDTH environment variable", async () => {
  const output = await runLibFunction(`
    import { title } from "./main.ts";
    title("Test");
  `, { DOC_WIDTH: "40" });
  
  assertEquals(output, [
    "========================================",
    "========================================",
    "                  Test",
    "========================================",
    "========================================",
    "",
    "",
    "",
  ].join("\n"));
});

Deno.test("lib functions work with unicode and special characters", async () => {
  const output = await runLibFunction(`
    import { note } from "./main.ts";
    note("Testing 日本語 and émojis 🎉");
  `);
  
  assertEquals(output, [
    "NOTE: Testing 日本語 and émojis 🎉",
    "",
    "",
    "",
  ].join("\n"));
});

Deno.test("lib functions handle long text with wrapping", async () => {
  const output = await runLibFunction(`
    import { note } from "./main.ts";
    note("This is a very long message that should wrap because it exceeds the default width of 72 characters for the document");
  `);
  
  assertEquals(output, [
    "NOTE: This is a very long message that should wrap because it exceeds",
    "      the default width of 72 characters for the document",
    "",
    "",
    "",
  ].join("\n"));
});

Deno.test("lib functions handle empty strings gracefully", async () => {
  const output = await runLibFunction(`
    import { note } from "./main.ts";
    note("");
  `);
  
  assertEquals(output, [
    "NOTE: ",
    "",
    "",
    "",
  ].join("\n"));
});

Deno.test("lib.kv() handles empty pairs list", async () => {
  const output = await runLibFunction(`
    import { kv } from "./main.ts";
    kv("EMPTY", []);
  `);
  
  assertEquals(output, [
    "EMPTY:",
    "",
    "",
    "",
  ].join("\n"));
});

Deno.test("lib.list() handles empty items list", async () => {
  const output = await runLibFunction(`
    import { list } from "./main.ts";
    list("EMPTY", []);
  `);
  
  assertEquals(output, [
    "EMPTY:",
    "",
    "",
    "",
  ].join("\n"));
});
