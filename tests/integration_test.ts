/**
 * Integration tests for the log CLI tool.
 * Tests end-to-end rendering of JSONL to formatted output.
 */

import { assertEquals } from "@std/assert";

/**
 * Helper: Run a CLI command and return stdout.
 */
async function runCommand(...args: string[]): Promise<string> {
  const command = new Deno.Command("deno", {
    args: ["run", "--allow-env", "main.ts", ...args],
    stdout: "piped",
  });

  const { stdout } = await command.output();
  return new TextDecoder().decode(stdout);
}

/**
 * Helper: Run CLI in render mode with JSONL input.
 */
async function runRender(jsonlInput: string): Promise<string> {
  const command = new Deno.Command("deno", {
    args: ["run", "--allow-env", "main.ts", "render"],
    stdin: "piped",
    stdout: "piped",
  });

  const process = command.spawn();
  
  const writer = process.stdin.getWriter();
  await writer.write(new TextEncoder().encode(jsonlInput));
  await writer.close();

  const { stdout } = await process.output();
  return new TextDecoder().decode(stdout);
}

Deno.test("Golden test - render JSONL fixture matches expected output", async () => {
  // Read the JSONL input fixture
  const jsonlPath = "./tests/fixtures/happy.jsonl";
  const jsonlContent = await Deno.readTextFile(jsonlPath);

  // Run CLI in render mode with JSONL as stdin
  const actualOutput = await runRender(jsonlContent);

  // Read the expected output
  const expectedPath = "./tests/fixtures/happy.out";
  const expectedOutput = await Deno.readTextFile(expectedPath);

  // Compare actual output to expected output
  assertEquals(actualOutput, expectedOutput);
});

Deno.test("CLI integration - title command", async () => {
  const output = await runCommand("title", "Test Title");

  assertEquals(output, [
    "========================================================================",
    "========================================================================",
    "                               Test Title",
    "========================================================================",
    "========================================================================",
    "",
    "",
  ].join("\n"));
});

Deno.test("CLI integration - phase command", async () => {
  const output = await runCommand("phase", "Setup Phase");

  assertEquals(output, [
    "------------------------------------------------------------------------",
    "## Setup Phase",
    "------------------------------------------------------------------------",
    "",
    "",
  ].join("\n"));
});

Deno.test("CLI integration - step command", async () => {
  const output = await runCommand("step", "Install dependencies");

  assertEquals(output, [
    "----------",
    "### Install dependencies",
    "----------",
    "",
    "",
  ].join("\n"));
});

Deno.test("CLI integration - cmd command", async () => {
  const output = await runCommand("cmd", "npm install");

  assertEquals(output, "  $ npm install\n");
});

Deno.test("CLI integration - ok command", async () => {
  const output = await runCommand("ok", "build completed");

  assertEquals(output, "OK: build completed\n\n");
});

Deno.test("CLI integration - note command", async () => {
  const output = await runCommand("note", "Starting build process");

  assertEquals(output, "NOTE: Starting build process\n\n");
});

Deno.test("CLI integration - warn command", async () => {
  const output = await runCommand("warn", "tests skipped", "--detail", "SKIP_TESTS=1");

  assertEquals(output, [
    "!!! WARNING: tests skipped",
    "    SKIP_TESTS=1",
    "",
    "",
  ].join("\n"));
});

Deno.test("CLI integration - error command with multiple lines", async () => {
  const output = await runCommand("error", "Failed to deploy", "Connection timeout", "Retry limit exceeded");

  assertEquals(output, [
    "+----------------------------------------------------------------------+",
    "| ERROR: Failed to deploy                                              |",
    "| Connection timeout                                                   |",
    "| Retry limit exceeded                                                 |",
    "+----------------------------------------------------------------------+",
    "",
    "",
  ].join("\n"));
});

Deno.test("CLI integration - kv command", async () => {
  const output = await runCommand("kv", "ENV", "node=20.11.1", "os=ubuntu-22.04");

  assertEquals(output, [
    "ENV:",
    "  node: 20.11.1",
    "  os: ubuntu-22.04",
    "",
    "",
  ].join("\n"));
});

Deno.test("CLI integration - list command", async () => {
  const output = await runCommand("list", "FILES", "main.ts", "lib.ts", "test.ts");

  assertEquals(output, [
    "FILES:",
    "  - main.ts",
    "  - lib.ts",
    "  - test.ts",
    "",
    "",
  ].join("\n"));
});

Deno.test("CLI integration - render mode with JSONL", async () => {
  const testJsonl = [
    '{"command":"title","lines":["Test Pipeline"]}',
    '{"command":"phase","lines":["Build"]}',
    '{"command":"ok","lines":["completed"]}',
  ].join("\n");

  const output = await runRender(testJsonl);

  assertEquals(output, [
    "========================================================================",
    "========================================================================",
    "                             Test Pipeline",
    "========================================================================",
    "========================================================================",
    "",
    "------------------------------------------------------------------------",
    "## Build",
    "------------------------------------------------------------------------",
    "",
    "OK: completed",
    "",
    "",
  ].join("\n"));
});
