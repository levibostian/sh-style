/**
 * Unit tests for wrap.ts utilities.
 * These tests demonstrate the behavior and spec of each wrapping function.
 */

import { assertEquals, assertThrows } from "@std/assert";
import {
  centerLine,
  getDocWidth,
  padRight,
  rule,
  wrapPreserve,
} from "../src/wrap.ts";

// =============================================================================
// getDocWidth() - Environment variable handling
// =============================================================================

Deno.test("getDocWidth - returns 72 when DOC_WIDTH not set", () => {
  // Clear any existing DOC_WIDTH
  const original = Deno.env.get("DOC_WIDTH");
  Deno.env.delete("DOC_WIDTH");

  const width = getDocWidth();
  assertEquals(width, 72);

  // Restore
  if (original) Deno.env.set("DOC_WIDTH", original);
});

Deno.test("getDocWidth - uses DOC_WIDTH when set to valid value", () => {
  const original = Deno.env.get("DOC_WIDTH");
  
  Deno.env.set("DOC_WIDTH", "80");
  assertEquals(getDocWidth(), 80);

  Deno.env.set("DOC_WIDTH", "120");
  assertEquals(getDocWidth(), 120);

  // Restore
  if (original) {
    Deno.env.set("DOC_WIDTH", original);
  } else {
    Deno.env.delete("DOC_WIDTH");
  }
});

Deno.test("getDocWidth - returns 72 for invalid values", () => {
  const original = Deno.env.get("DOC_WIDTH");

  // Too small (< 40)
  Deno.env.set("DOC_WIDTH", "30");
  assertEquals(getDocWidth(), 72);

  // Zero
  Deno.env.set("DOC_WIDTH", "0");
  assertEquals(getDocWidth(), 72);

  // Negative
  Deno.env.set("DOC_WIDTH", "-10");
  assertEquals(getDocWidth(), 72);

  // Not a number
  Deno.env.set("DOC_WIDTH", "invalid");
  assertEquals(getDocWidth(), 72);

  // Restore
  if (original) {
    Deno.env.set("DOC_WIDTH", original);
  } else {
    Deno.env.delete("DOC_WIDTH");
  }
});

// =============================================================================
// wrapPreserve() - Text wrapping with character preservation
// =============================================================================

Deno.test("wrapPreserve - handles empty string", () => {
  // Empty string should return array with single empty string
  const given = "";
  
  assertEquals(wrapPreserve(given, 72), [""]);
});

Deno.test("wrapPreserve - returns single line for short text", () => {
  // Text shorter than width stays on one line
  const given = "Hello, world!";
  
  assertEquals(wrapPreserve(given, 72), ["Hello, world!"]);
});

Deno.test("wrapPreserve - wraps long text at word boundaries", () => {
  // Text is 73 chars, width is 40
  const given = "This is a long line that needs to be wrapped at word boundaries properly";

  // Should wrap at spaces, preserving all text
  assertEquals(wrapPreserve(given, 40), [
    "This is a long line that needs to be",
    "wrapped at word boundaries properly",
  ]);
});

Deno.test("wrapPreserve - preserves explicit newlines", () => {
  // Explicit \n creates forced breaks
  const given = "First line\nSecond line\nThird line";
  
  assertEquals(wrapPreserve(given, 72), [
    "First line",
    "Second line",
    "Third line",
  ]);
});

Deno.test("wrapPreserve - handles empty lines from consecutive newlines", () => {
  // Consecutive newlines create empty lines
  const given = "Line 1\n\nLine 3";
  
  assertEquals(wrapPreserve(given, 72), [
    "Line 1",
    "",
    "Line 3",
  ]);
});

Deno.test("wrapPreserve - hard-breaks long words that exceed width", () => {
  // Single word (34 chars) with no spaces to break at, width is 20
  const given = "supercalifragilisticexpialidocious";
  
  // Should hard-break the word into chunks
  assertEquals(wrapPreserve(given, 20), [
    "supercalifragilistic",
    "expialidocious",
  ]);
});

Deno.test("wrapPreserve - preserves multiple spaces exactly", () => {
  // Multiple consecutive spaces should be preserved
  const given = "Word1  with   multiple    spaces";
  
  assertEquals(wrapPreserve(given, 72), ["Word1  with   multiple    spaces"]);
});

Deno.test("wrapPreserve - wraps at exactly width when next char is space", () => {
  // Text is exactly width (40 As), followed by space, then more text
  const given = "A".repeat(40) + " more text here";
  
  // Should break at the space, not include it
  assertEquals(wrapPreserve(given, 40), [
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "more text here",
  ]);
});

Deno.test("wrapPreserve - throws error for non-positive width", () => {
  assertThrows(
    () => wrapPreserve("text", 0),
    Error,
    "Width must be positive"
  );
  
  assertThrows(
    () => wrapPreserve("text", -5),
    Error,
    "Width must be positive"
  );
});

Deno.test("wrapPreserve - handles text with tabs", () => {
  // Tabs should be preserved as-is
  const given = "Word1\twith\ttabs\tbetween";
  
  assertEquals(wrapPreserve(given, 72), ["Word1\twith\ttabs\tbetween"]);
});

Deno.test("wrapPreserve - complex example with forced breaks and wrapping", () => {
  // Mix of explicit newlines and text that needs wrapping
  const given = "Short line\nThis is a very long line that definitely needs to be wrapped because it exceeds the width limit\nAnother short line";
  
  // First line stays, second line wraps into multiple, third line stays
  assertEquals(wrapPreserve(given, 40), [
    "Short line",
    "This is a very long line that definitely",
    "needs to be wrapped because it exceeds",
    "the width limit",
    "Another short line",
  ]);
});

// =============================================================================
// centerLine() - Center text within width
// =============================================================================

Deno.test("centerLine - centers short text", () => {
  // "Hello" (5 chars) in width 20: 15 padding, 7 on left (floor(15/2))
  const given = "Hello";
  
  assertEquals(centerLine(given, 20), "       Hello");
});

Deno.test("centerLine - handles even and odd padding", () => {
  // Even padding: "Hi" in width 10 = 8 padding, 4 left
  const given = "Hi";
  
  assertEquals(centerLine(given, 10), "    Hi");
  
  // Odd padding: "Hi" in width 11 = 9 padding, 4 left (floor(9/2))
  assertEquals(centerLine(given, 11), "    Hi");
});

Deno.test("centerLine - returns text as-is if already >= width", () => {
  // Text longer than width returns unchanged (no truncation)
  const given = "This is a long line";
  
  assertEquals(centerLine(given, 10), "This is a long line");
});

Deno.test("centerLine - handles empty string", () => {
  // Empty string gets centered as padding: floor(20/2) = 10 spaces
  const given = "";
  
  assertEquals(centerLine(given, 20), "          ");
});

Deno.test("centerLine - centers exactly at width", () => {
  // Text exactly at width needs no padding
  const given = "X".repeat(20);
  
  assertEquals(centerLine(given, 20), "XXXXXXXXXXXXXXXXXXXX");
});

// =============================================================================
// rule() - Horizontal rule generation
// =============================================================================

Deno.test("rule - creates horizontal rule with single char", () => {
  // Creates 72 equal signs
  const given = "=";
  
  assertEquals(rule(given, 72), "========================================================================");
});

Deno.test("rule - works with different characters", () => {
  // Different characters create different rules
  assertEquals(rule("-", 10), "----------");
  assertEquals(rule("*", 5), "*****");
  assertEquals(rule("#", 3), "###");
});

Deno.test("rule - handles zero width", () => {
  // Zero width returns empty string
  const given = "=";
  
  assertEquals(rule(given, 0), "");
});

Deno.test("rule - works with multi-char strings (repeats the whole string)", () => {
  // Repeats entire string: "=-" repeated 4 times = 8 chars total
  const given = "=-";
  
  assertEquals(rule(given, 4), "=-=-=-=-");
});

// =============================================================================
// padRight() - Right padding
// =============================================================================

Deno.test("padRight - pads short text to width", () => {
  // "Hello" (5 chars) padded to 20: adds 15 spaces
  const given = "Hello";
  
  assertEquals(padRight(given, 20), "Hello               ");
});

Deno.test("padRight - returns text as-is if already >= width", () => {
  // Text longer than width returns unchanged (no truncation)
  const given = "This is a very long line";
  
  assertEquals(padRight(given, 10), "This is a very long line");
});

Deno.test("padRight - handles empty string", () => {
  // Empty string padded to 10: all spaces
  const given = "";
  
  assertEquals(padRight(given, 10), "          ");
});

Deno.test("padRight - handles exact width", () => {
  // Text exactly at width needs no padding
  const given = "X".repeat(20);
  
  assertEquals(padRight(given, 20), "XXXXXXXXXXXXXXXXXXXX");
});

Deno.test("padRight - pads with correct number of spaces", () => {
  // "ABC" (3 chars) padded to 5: adds 2 spaces
  const given = "ABC";
  
  assertEquals(padRight(given, 5), "ABC  ");
});

