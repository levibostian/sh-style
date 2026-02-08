/**
 * Tests for CLI error handling and edge cases.
 * Covers validation and error paths in src/cli.ts.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";

/**
 * Helper: Run a CLI command and capture both stdout and stderr.
 */
async function runCommandWithError(...args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  const command = new Deno.Command("deno", {
    args: ["run", "--allow-env", "main.ts", ...args],
    stdout: "piped",
    stderr: "piped",
  });

  const { stdout, stderr, code } = await command.output();
  return {
    stdout: new TextDecoder().decode(stdout),
    stderr: new TextDecoder().decode(stderr),
    code,
  };
}

Deno.test("CLI errors - no arguments shows help", async () => {
  const result = await runCommandWithError();
  
  assertEquals(result.code, 0);
  assertStringIncludes(result.stdout, "log - Plain-text CI typography tool");
  assertStringIncludes(result.stdout, "USAGE:");
  assertStringIncludes(result.stdout, "COMMANDS:");
});

Deno.test("CLI errors - help flag shows help", async () => {
  const result = await runCommandWithError("help");
  
  assertEquals(result.code, 0);
  assertStringIncludes(result.stdout, "log - Plain-text CI typography tool");
  assertStringIncludes(result.stdout, "EXAMPLES:");
});

Deno.test("CLI errors - --help flag shows help", async () => {
  const result = await runCommandWithError("--help");
  
  assertEquals(result.code, 0);
  assertStringIncludes(result.stdout, "log - Plain-text CI typography tool");
});

Deno.test("CLI errors - -h flag shows help", async () => {
  const result = await runCommandWithError("-h");
  
  assertEquals(result.code, 0);
  assertStringIncludes(result.stdout, "log - Plain-text CI typography tool");
});

Deno.test("CLI errors - unknown command", async () => {
  const result = await runCommandWithError("invalid-command");
  
  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "Unknown command: invalid-command");
  assertStringIncludes(result.stderr, 'Run "log help" for usage information');
});

Deno.test("CLI errors - warn without message", async () => {
  const result = await runCommandWithError("warn");
  
  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "Error: warn command requires a message");
});

Deno.test("CLI errors - warn with only --detail flags", async () => {
  const result = await runCommandWithError("warn", "--detail", "some detail");
  
  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "Error: warn command requires a message");
});

Deno.test("CLI errors - warn --detail without argument", async () => {
  const result = await runCommandWithError("warn", "message", "--detail");
  
  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "Error: --detail flag requires an argument");
});

Deno.test("CLI errors - error without lines", async () => {
  const result = await runCommandWithError("error");
  
  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "Error: error command requires at least one line");
});

Deno.test("CLI errors - kv without label", async () => {
  const result = await runCommandWithError("kv");
  
  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "Error: kv command requires a label");
});

Deno.test("CLI errors - kv with invalid key=value pair (no equals)", async () => {
  const result = await runCommandWithError("kv", "LABEL", "invalid-pair");
  
  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "Error: invalid key=value pair: invalid-pair");
});

Deno.test("CLI errors - kv with invalid key=value pair (equals at start)", async () => {
  const result = await runCommandWithError("kv", "LABEL", "=value");
  
  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "Error: invalid key=value pair: =value");
});

Deno.test("CLI errors - list without label", async () => {
  const result = await runCommandWithError("list");
  
  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "Error: list command requires a label");
});
