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

// Render 

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

Deno.test("Render mode - empty lines are skipped", async () => {
  const testJsonl = [
    '{"command":"title","lines":["Test"]}',
    "",  // Empty line
    "   ",  // Whitespace-only line
    '{"command":"ok","lines":["done"]}',
  ].join("\n");

  const output = await runRender(testJsonl);

  assertEquals(output, [
    "========================================================================",
    "========================================================================",
    "                                  Test",
    "========================================================================",
    "========================================================================",
    "",
    "OK: done",
    "",
    "",
  ].join("\n"));
});

Deno.test("Render mode - invalid JSON is ignored", async () => {
  const testJsonl = [
    '{"command":"title","lines":["Valid"]}',
    "not-valid-json",
    '{"command":"ok","lines":["done"]}',
  ].join("\n");

  const output = await runRender(testJsonl);

  assertEquals(output, [
    "========================================================================",
    "========================================================================",
    "                                 Valid",
    "========================================================================",
    "========================================================================",
    "",
    "OK: done",
    "",
    "",
  ].join("\n"));
});

Deno.test("Render mode - missing required fields are ignored", async () => {
  const testJsonl = [
    '{"command":"title","lines":["Valid"]}',
    '{"command":"phase"}',  // Missing lines
    '{"lines":["text"]}',  // Missing command
    '{"command":"ok","lines":[]}',  // Empty lines array
    '{"command":"step","lines":["Valid Step"]}',
  ].join("\n");

  const output = await runRender(testJsonl);

  assertEquals(output, [
    "========================================================================",
    "========================================================================",
    "                                 Valid",
    "========================================================================",
    "========================================================================",
    "",
    "----------",
    "### Valid Step",
    "----------",
    "",
    "",
  ].join("\n"));
});

Deno.test("Render mode - non-string lines are ignored", async () => {
  const testJsonl = [
    '{"command":"title","lines":["Valid"]}',
    '{"command":"error","lines":["line1", 123, "line3"]}',  // Non-string line
    '{"command":"ok","lines":["done"]}',
  ].join("\n");

  const output = await runRender(testJsonl);

  // The error command with invalid lines should be skipped
  assertEquals(output, [
    "========================================================================",
    "========================================================================",
    "                                 Valid",
    "========================================================================",
    "========================================================================",
    "",
    "OK: done",
    "",
    "",
  ].join("\n"));
});

Deno.test("Render mode - unknown command type is ignored", async () => {
  const testJsonl = [
    '{"command":"title","lines":["Valid"]}',
    '{"command":"unknown-type","lines":["text"]}',
    '{"command":"ok","lines":["done"]}',
  ].join("\n");

  const output = await runRender(testJsonl);

  assertEquals(output, [
    "========================================================================",
    "========================================================================",
    "                                 Valid",
    "========================================================================",
    "========================================================================",
    "",
    "OK: done",
    "",
    "",
  ].join("\n"));
});

Deno.test("Render mode - warn with details from JSONL", async () => {
  const testJsonl = '{"command":"warn","lines":["Warning message","detail 1","detail 2"]}';

  const output = await runRender(testJsonl);

  assertEquals(output, [
    "!!! WARNING: Warning message",
    "    detail 1",
    "    detail 2",
    "",
    "",
  ].join("\n"));
});

Deno.test("Render mode - warn without details from JSONL", async () => {
  const testJsonl = '{"command":"warn","lines":["Warning message"]}';

  const output = await runRender(testJsonl);

  assertEquals(output, [
    "!!! WARNING: Warning message",
    "",
    "",
  ].join("\n"));
});

Deno.test("Render mode - kv with invalid pairs skipped", async () => {
  const testJsonl = '{"command":"kv","lines":["LABEL","key1: value1","invalid-no-colon","key2: value2"]}';

  const output = await runRender(testJsonl);

  // Invalid pair should be skipped
  assertEquals(output, [
    "LABEL:",
    "  key1: value1",
    "  key2: value2",
    "",
    "",
  ].join("\n"));
});

Deno.test("Render mode - list from JSONL", async () => {
  const testJsonl = '{"command":"list","lines":["FILES","main.ts","lib.ts","test.ts"]}';

  const output = await runRender(testJsonl);

  assertEquals(output, [
    "FILES:",
    "  - main.ts",
    "  - lib.ts",
    "  - test.ts",
    "",
    "",
  ].join("\n"));
});

Deno.test("Render mode - all labeled commands from JSONL", async () => {
  const testJsonl = [
    '{"command":"note","lines":["Note text"]}',
    '{"command":"why","lines":["Why text"]}',
    '{"command":"plan","lines":["Plan text"]}',
    '{"command":"done","lines":["Done text"]}',
  ].join("\n");

  const output = await runRender(testJsonl);

  assertEquals(output, [
    "NOTE: Note text",
    "",
    "WHY: Why text",
    "",
    "PLAN: Plan text",
    "",
    "DONE: Done text",
    "",
    "",
  ].join("\n"));
});

Deno.test("Render mode - cmd from JSONL", async () => {
  const testJsonl = '{"command":"cmd","lines":["npm test"]}';

  const output = await runRender(testJsonl);

  assertEquals(output, "  $ npm test\n");
});

Deno.test("Render mode - error from JSONL", async () => {
  const testJsonl = '{"command":"error","lines":["Failed","Reason 1","Reason 2"]}';

  const output = await runRender(testJsonl);

  assertEquals(output, [
    "+----------------------------------------------------------------------+",
    "| ERROR: Failed                                                        |",
    "| Reason 1                                                             |",
    "| Reason 2                                                             |",
    "+----------------------------------------------------------------------+",
    "",
    "",
  ].join("\n"));
});

// Individual command tests

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

Deno.test("CLI integration - why command", async () => {
  const output = await runCommand("why", "Need to validate input");

  assertEquals(output, "WHY: Need to validate input\n\n");
});

Deno.test("CLI integration - plan command", async () => {
  const output = await runCommand("plan", "Deploy to staging first");

  assertEquals(output, "PLAN: Deploy to staging first\n\n");
});

Deno.test("CLI integration - done command", async () => {
  const output = await runCommand("done", "Migration completed");

  assertEquals(output, "DONE: Migration completed\n\n");
});

Deno.test("CLI integration - warn without details", async () => {
  const output = await runCommand("warn", "Deprecation warning");

  assertEquals(output, [
    "!!! WARNING: Deprecation warning",
    "",
    "",
  ].join("\n"));
});

Deno.test("CLI integration - warn with multiple details", async () => {
  const output = await runCommand("warn", "Configuration issues", "--detail", "Missing API key", "--detail", "Invalid timeout");

  assertEquals(output, [
    "!!! WARNING: Configuration issues",
    "    Missing API key",
    "    Invalid timeout",
    "",
    "",
  ].join("\n"));
});

Deno.test("CLI integration - error with single line", async () => {
  const output = await runCommand("error", "Build failed");

  assertEquals(output, [
    "+----------------------------------------------------------------------+",
    "| ERROR: Build failed                                                  |",
    "+----------------------------------------------------------------------+",
    "",
    "",
  ].join("\n"));
});

Deno.test("CLI integration - kv with empty value", async () => {
  const output = await runCommand("kv", "CONFIG", "key=");

  assertEquals(output, [
    "CONFIG:",
    "  key: ",
    "",
    "",
  ].join("\n"));
});

Deno.test("CLI integration - kv with value containing equals", async () => {
  const output = await runCommand("kv", "VARS", "equation=x=y+1");

  assertEquals(output, [
    "VARS:",
    "  equation: x=y+1",
    "",
    "",
  ].join("\n"));
});

Deno.test("CLI integration - list with no items", async () => {
  const output = await runCommand("list", "EMPTY");

  assertEquals(output, "EMPTY:\n\n");
});

Deno.test("CLI integration - list with single item", async () => {
  const output = await runCommand("list", "SINGLE", "item.txt");

  assertEquals(output, [
    "SINGLE:",
    "  - item.txt",
    "",
    "",
  ].join("\n"));
});


