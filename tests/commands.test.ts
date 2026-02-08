/**
 * Unit tests for internal rendering functions and edge cases.
 * Tests unexposed edge cases by directly importing internal functions.
 */

import { assertEquals } from "@std/assert";

// Note: wrapWithPrefix is not exported, so we test through public API
// by creating scenarios that exercise the uncovered branches

Deno.test("Render - non-object parseCommand input", async () => {
  const { parseCommand } = await import("../src/commands.ts");
  
  // Test with null object (typeof null is "object" but we check === null)
  assertEquals(parseCommand("null", 1), null);
  
  // Test with non-object types
  assertEquals(parseCommand('"string"', 1), null);
  assertEquals(parseCommand("123", 1), null);
  assertEquals(parseCommand("true", 1), null);
});

Deno.test("Render - parseCommand with null in JSON", async () => {
  const { parseCommand } = await import("../src/commands.ts");
  
  // JSON parsing works but validation should catch null
  const result = parseCommand('{"command": null, "lines": ["test"]}', 1);
  assertEquals(result, null);
});

Deno.test("Render - parseCommand with array instead of object", async () => {
  const { parseCommand } = await import("../src/commands.ts");
  
  // Array is typeof "object" but should be rejected
  const result = parseCommand('[{"command": "test"}]', 1);
  assertEquals(result, null);
});

Deno.test("Commands - parseCommand validates object is not null", async () => {
  const { parseCommand } = await import("../src/commands.ts");
  
  // The specific line: if (typeof obj !== "object" || obj === null)
  // We've tested typeof !== "object" with primitives
  // Now test obj === null case explicitly
  assertEquals(parseCommand("null", 1), null);
});
