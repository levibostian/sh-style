/**
 * Core text wrapping and formatting utilities.
 * Implements ELEMENTS-SPEC.md requirements:
 * - No truncation (ever)
 * - Preserve all characters exactly
 * - Only insert \n for wrapping
 * - Deterministic wrapping
 */

const DEFAULT_WIDTH = 72;

/**
 * Read and validate DOC_WIDTH from environment.
 * Falls back to DEFAULT_WIDTH if invalid or not set.
 */
export function getDocWidth(): number {
  const envWidth = Deno.env.get("DOC_WIDTH");
  if (!envWidth) {
    return DEFAULT_WIDTH;
  }

  const parsed = parseInt(envWidth, 10);
  if (isNaN(parsed) || parsed <= 0 || parsed < 40) {
    return DEFAULT_WIDTH;
  }

  return parsed;
}

/**
 * Wrap text preserving all characters, respecting forced breaks.
 * Algorithm:
 * 1. Split on \n first (forced breaks)
 * 2. For each segment, wrap to width:
 *    - Prefer breaking at whitespace
 *    - Hard-break long tokens if needed
 *    - Never drop characters
 * 3. Return array of lines, each <= width
 */
export function wrapPreserve(text: string, width: number): string[] {
  if (width <= 0) {
    throw new Error("Width must be positive");
  }

  // Handle empty string
  if (text === "") {
    return [""];
  }

  // Split on explicit newlines first (forced breaks)
  const segments = text.split("\n");
  const result: string[] = [];

  for (const segment of segments) {
    if (segment === "") {
      // Empty segment = empty line
      result.push("");
      continue;
    }

    // Wrap this segment
    const wrapped = wrapSegment(segment, width);
    result.push(...wrapped);
  }

  return result;
}

/**
 * Wrap a single segment (no newlines) into lines <= width.
 * Preserves all characters, prefers whitespace breaks, hard-breaks if needed.
 */
function wrapSegment(segment: string, width: number): string[] {
  const lines: string[] = [];
  let remaining = segment;

  while (remaining.length > 0) {
    if (remaining.length < width) {
      // Fits with room to spare
      lines.push(remaining);
      break;
    }

    // At or over width: find best break point
    // We want to take at most `width` characters
    let breakAt = width;
    let foundSpace = false;

    // If remaining length is exactly width, check if we want to wrap it anyway
    if (remaining.length === width) {
      // Check if there's a space in the middle we could break at
      // to make more balanced lines (for titles, etc.)
      // Actually, let's just check if position 66 has a space (heuristic for titles)
      // NO - this is too hacky. Let me think...
      // Actually, if exactly at width, we should take it
      lines.push(remaining);
      break;
    }

    // Over width - must wrap
    if (remaining[width] === " " || remaining[width] === "\t") {
      // Perfect: we can take exactly `width` chars and break at the space
      breakAt = width;
      foundSpace = true;
    } else {
      // Look backwards from width-1 for a space
      for (let i = width - 1; i > 0; i--) {
        const ch = remaining[i];
        if (ch === " " || ch === "\t") {
          breakAt = i;
          foundSpace = true;
          break;
        }
      }
    }

    // Take the line
    const line = remaining.substring(0, breakAt);
    lines.push(line);

    // Advance
    if (foundSpace) {
      // Skip the breaking whitespace character
      remaining = remaining.substring(breakAt + 1);
    } else {
      // Hard break: no whitespace found, just continue after breakAt
      remaining = remaining.substring(breakAt);
    }

    // Safety: ensure progress
    if (line === "" && remaining === segment) {
      throw new Error("Wrapping made no progress");
    }
  }

  return lines;
}

/**
 * Center a single line within width.
 * Adds left padding only; does not right-pad.
 * If line is longer than width, return as-is (wrapping should have been done earlier).
 */
export function centerLine(line: string, width: number): string {
  if (line.length >= width) {
    return line;
  }

  const totalPad = width - line.length;
  const leftPad = Math.floor(totalPad / 2);

  return " ".repeat(leftPad) + line;
}

/**
 * Create a horizontal rule: repeat character to width.
 */
export function rule(ch: string, width: number): string {
  return ch.repeat(width);
}

/**
 * Pad right to exact width (no truncation).
 */
export function padRight(line: string, width: number): string {
  if (line.length >= width) {
    return line;
  }
  return line + " ".repeat(width - line.length);
}
