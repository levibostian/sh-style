/**
 * Unit tests for render edge cases and error handling.
 * Covers edge cases in src/render.ts.
 */

import { assertEquals, assertThrows } from "@std/assert";
import { renderCommand, renderWarn, renderKv, renderList, renderError } from "../src/render.ts";
import type { Command } from "../src/commands.ts";

Deno.test("Render - empty text with labeled command", () => {
  const command: Command = { type: "note", text: "" };
  const output = renderCommand(command, 72);
  
  assertEquals(output, "NOTE: \n\n");
});

Deno.test("Render - empty text with phase command", () => {
  const command: Command = { type: "phase", text: "" };
  const output = renderCommand(command, 72);
  
  assertEquals(output, [
    "------------------------------------------------------------------------",
    "## ",
    "------------------------------------------------------------------------",
    "",
    "",
  ].join("\n"));
});

Deno.test("Render - empty text with step command", () => {
  const command: Command = { type: "step", text: "" };
  const output = renderCommand(command, 72);
  
  assertEquals(output, [
    "----------",
    "### ",
    "----------",
    "",
    "",
  ].join("\n"));
});

Deno.test("Render - empty text with cmd command", () => {
  const command: Command = { type: "cmd", text: "" };
  const output = renderCommand(command, 72);
  
  assertEquals(output, "  $ \n");
});

Deno.test("Render - empty text with title command", () => {
  const command: Command = { type: "title", text: "" };
  const output = renderCommand(command, 72);
  
  // Empty string gets centered as just spaces (36 on each side)
  assertEquals(output, [
    "========================================================================",
    "========================================================================",
    "                                    ",
    "========================================================================",
    "========================================================================",
    "",
    "",
  ].join("\n"));
});

Deno.test("Render - warn with empty details array", () => {
  const output = renderWarn("Warning message", [], 72);
  
  // Empty details array is treated as no details
  assertEquals(output, [
    "!!! WARNING: Warning message",
    "",
    "",
  ].join("\n"));
});

Deno.test("Render - warn with undefined details", () => {
  const output = renderWarn("Warning message", undefined, 72);
  
  assertEquals(output, [
    "!!! WARNING: Warning message",
    "",
    "",
  ].join("\n"));
});

Deno.test("Render - kv with empty entries array", () => {
  const output = renderKv("LABEL", [], 72);
  
  assertEquals(output, "LABEL:\n\n");
});

Deno.test("Render - kv with long key and value", () => {
  const longKey = "very_long_key_name_here";
  const longValue = "This is a very long value that will definitely need to be wrapped across multiple lines to fit within the width constraint";
  
  const output = renderKv("LABEL", [[longKey, longValue]], 72);
  
  // Should wrap the value with proper continuation alignment
  // Verify output contains the key
  assertEquals(output.includes(longKey), true);
  assertEquals(output.includes(longValue.substring(0, 20)), true);
});

Deno.test("Render - list with empty items array", () => {
  const output = renderList("LABEL", [], 72);
  
  assertEquals(output, "LABEL:\n\n");
});

Deno.test("Render - list with very long item", () => {
  const longItem = "This is a very long list item that will need to wrap across multiple lines because it exceeds the available width";
  
  const output = renderList("ITEMS", [longItem], 72);
  
  // Should wrap with continuation indentation
  const lines = output.split("\n");
  assertEquals(lines[0], "ITEMS:");
  assertEquals(lines[1].substring(0, 4), "  - ");
});

Deno.test("Render - error with empty line", () => {
  const output = renderError([""], 72);
  
  // Should still create a box
  const lines = output.split("\n");
  assertEquals(lines[0].charAt(0), "+");
  assertEquals(lines[lines.length - 3].charAt(0), "+");
});

Deno.test("Render - error with line containing newline", () => {
  const output = renderError(["First line\nSecond line"], 72);
  
  // Should split on newline
  const lines = output.split("\n");
  assertEquals(lines[1].includes("ERROR: First line"), true);
  assertEquals(lines[2].includes("Second line"), true);
});

Deno.test("Render - prefix too long error for very small width", () => {
  assertThrows(
    () => {
      const command: Command = { type: "note", text: "test" };
      renderCommand(command, 5); // Too small for "NOTE: " prefix
    },
    Error,
    "Prefix too long for given width"
  );
});

Deno.test("Render - warn detail wrapping with continuation prefix narrower than first", () => {
  // This tests the contWidth < firstWidth branch
  const command: Command = { 
    type: "warn", 
    text: "Short",
    details: ["This is a very long detail line that will definitely need wrapping to test the continuation prefix handling in the wrapWithPrefix function"]
  };
  
  const output = renderCommand(command, 72);
  const lines = output.split("\n");
  
  // Should have warning line and wrapped detail lines
  assertEquals(lines[0], "!!! WARNING: Short");
  assertEquals(lines[1].startsWith("    "), true); // Detail starts with 4 spaces
});

Deno.test("Render - all command types for exhaustiveness", () => {
  // Test that all command types are handled
  const commandTypes: Command[] = [
    { type: "title", text: "Test" },
    { type: "phase", text: "Test" },
    { type: "step", text: "Test" },
    { type: "note", text: "Test" },
    { type: "why", text: "Test" },
    { type: "plan", text: "Test" },
    { type: "ok", text: "Test" },
    { type: "done", text: "Test" },
    { type: "cmd", text: "Test" },
    { type: "warn", text: "Test", details: undefined },
    { type: "error", lines: ["Test"] },
    { type: "kv", label: "Test", entries: [] },
    { type: "list", label: "Test", items: [] },
  ];

  for (const cmd of commandTypes) {
    // Should not throw for any command type
    const output = renderCommand(cmd, 72);
    assertEquals(typeof output, "string");
  }
});
