/**
 * Rendering functions for all command types.
 * Implements exact formatting from ELEMENTS-SPEC.md.
 */

import { centerLine, padRight, rule, wrapPreserve } from "./wrap.ts";
import type { Command } from "./commands.ts";

/**
 * Render a title event.
 * Format: 2 = rules, centered wrapped text, 2 = rules
 */
export function renderTitle(text: string, width: number): string {
  const topRule = rule("=", width);
  const bottomRule = rule("=", width);

  const wrapped = wrapPreserve(text, width);
  const centered = wrapped.map((line) => centerLine(line, width));

  const lines = [
    topRule,
    topRule,
    ...centered,
    bottomRule,
    bottomRule,
  ];

  return lines.join("\n") + "\n\n";
}

/**
 * Render a phase (H1 section) event.
 * Format: - rule, ## prefix (3-space continuation), - rule, trailing blank
 */
export function renderPhase(text: string, width: number): string {
  const topRule = rule("-", width);
  const bottomRule = rule("-", width);

  const prefix = "## ";
  const continuationPrefix = "   "; // 3 spaces

  const formatted = wrapWithPrefix(text, prefix, continuationPrefix, width);
  const lines = [topRule, ...formatted, bottomRule];

  return lines.join("\n") + "\n\n";
}

/**
 * Render a step (H2 subsection) event.
 * Format: 10-dash rules, ### prefix (4-space continuation), trailing blank
 */
export function renderStep(text: string, width: number): string {
  const topRule = "----------"; // 10 dashes
  const bottomRule = "----------"; // 10 dashes
  
  const prefix = "### ";
  const continuationPrefix = "    "; // 4 spaces

  const formatted = wrapWithPrefix(text, prefix, continuationPrefix, width);
  const lines = [topRule, ...formatted, bottomRule];
  
  return lines.join("\n") + "\n\n";
}

/**
 * Render a labeled message (NOTE, WHY, PLAN, OK, DONE).
 * Format: LABEL: prefix (space-aligned continuation), trailing blank
 */
export function renderLabeled(label: string, text: string, width: number): string {
  const prefix = `${label}: `;
  const continuationPrefix = " ".repeat(prefix.length);

  const lines = wrapWithPrefix(text, prefix, continuationPrefix, width);
  return lines.join("\n") + "\n\n";
}

/**
 * Render a command event.
 * Format: 2 spaces + $ + 1 space prefix, 4-space continuation
 */
export function renderCmd(text: string, width: number): string {
  const prefix = "  $ "; // 2 spaces + dollar + 1 space
  const continuationPrefix = "    "; // 4 spaces

  const lines = wrapWithPrefix(text, prefix, continuationPrefix, width);
  return lines.join("\n") + "\n";
}

/**
 * Render a warning event.
 * Format: !!! WARNING: prefix (space-aligned continuation)
 *         detail lines with 4-space prefix and continuation, trailing blank
 */
export function renderWarn(
  text: string,
  details: string[] | undefined,
  width: number,
): string {
  const prefix = "!!! WARNING: ";
  const continuationPrefix = " ".repeat(prefix.length);

  const lines = wrapWithPrefix(text, prefix, continuationPrefix, width);

  // Add detail lines
  if (details && details.length > 0) {
    const detailPrefix = "    "; // 4 spaces
    const detailContinuationPrefix = "    "; // 4 spaces

    for (const detail of details) {
      const detailLines = wrapWithPrefix(
        detail,
        detailPrefix,
        detailContinuationPrefix,
        width,
      );
      lines.push(...detailLines);
    }
  }

  return lines.join("\n") + "\n\n";
}

/**
 * Render an error event (boxed).
 * Format: box with + corners, | sides, inner width = WIDTH-4, trailing blank
 * Automatically prepends "ERROR: " to the first line
 */
export function renderError(lines: string[], width: number): string {
  const innerWidth = width - 4;
  const topBottom = "+" + "-".repeat(width - 2) + "+";

  const result: string[] = [topBottom];

  // Process lines and prepend "ERROR: " to first line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Split on forced breaks, then wrap each segment
    const segments = line.split("\n");
    for (let j = 0; j < segments.length; j++) {
      const segment = segments[j];
      
      // Prepend "ERROR: " to the very first segment only
      const textToWrap = (i === 0 && j === 0) ? "ERROR: " + segment : segment;
      
      const wrapped = wrapPreserve(textToWrap, innerWidth);
      for (const w of wrapped) {
        const padded = padRight(w, innerWidth);
        result.push("| " + padded + " |");
      }
    }
  }

  result.push(topBottom);
  return result.join("\n") + "\n\n";
}

/**
 * Render a key-value block event.
 * Format: LABEL:
 *           key: value (wrapped with aligned continuation), trailing blank
 */
export function renderKv(
  label: string,
  entries: [string, string][],
  width: number,
): string {
  const lines: string[] = [label + ":"];

  for (const [key, value] of entries) {
    const prefix = "  " + key + ": ";
    const continuationPrefix = " ".repeat(prefix.length);

    const valueLines = wrapWithPrefix(value, prefix, continuationPrefix, width);
    lines.push(...valueLines);
  }

  return lines.join("\n") + "\n\n";
}

/**
 * Render a list block event.
 * Format: LABEL:
 *           - item (wrapped with aligned continuation), trailing blank
 */
export function renderList(
  label: string,
  items: string[],
  width: number,
): string {
  const lines: string[] = [label + ":"];

  const prefix = "  - ";
  const continuationPrefix = "    "; // 4 spaces

  for (const item of items) {
    const itemLines = wrapWithPrefix(item, prefix, continuationPrefix, width);
    lines.push(...itemLines);
  }

  return lines.join("\n") + "\n\n";
}

/**
 * Main dispatcher: render any command.
 */
export function renderCommand(command: Command, width: number): string {
  switch (command.type) {
    case "title":
      return renderTitle(command.text, width);
    case "phase":
      return renderPhase(command.text, width);
    case "step":
      return renderStep(command.text, width);
    case "note":
      return renderLabeled("NOTE", command.text, width);
    case "why":
      return renderLabeled("WHY", command.text, width);
    case "plan":
      return renderLabeled("PLAN", command.text, width);
    case "ok":
      return renderLabeled("OK", command.text, width);
    case "done":
      return renderLabeled("DONE", command.text, width);
    case "cmd":
      return renderCmd(command.text, width);
    case "warn":
      return renderWarn(command.text, command.details, width);
    case "error":
      return renderError(command.lines, width);
    case "kv":
      return renderKv(command.label, command.entries, width);
    case "list":
      return renderList(command.label, command.items, width);
    default: {
      const _exhaustive: never = command;
      throw new Error(`Unknown command type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

/**
 * Helper: wrap text with a first-line prefix and continuation prefix.
 * Returns an array of fully prefixed lines.
 *
 * Algorithm:
 * 1. Take as much text as fits in firstWidth for the first line
 * 2. Wrap the remainder to contWidth for continuation lines
 */
function wrapWithPrefix(
  text: string,
  firstPrefix: string,
  contPrefix: string,
  width: number,
): string[] {
  const firstWidth = width - firstPrefix.length;
  const contWidth = width - contPrefix.length;

  if (firstWidth <= 0 || contWidth <= 0) {
    throw new Error("Prefix too long for given width");
  }

  if (text === "") {
    return [firstPrefix];
  }

  const result: string[] = [];

  // Wrap entire text first to handle forced line breaks
  const allWrapped = wrapPreserve(text, firstWidth);

  if (allWrapped.length === 0) {
    return [firstPrefix];
  }

  // First line
  result.push(firstPrefix + allWrapped[0]);

  // Continuation lines: may need re-wrapping if contWidth < firstWidth
  if (contWidth < firstWidth) {
    // Need to re-wrap continuation lines
    for (let i = 1; i < allWrapped.length; i++) {
      const rewrapped = wrapPreserve(allWrapped[i], contWidth);
      for (const line of rewrapped) {
        result.push(contPrefix + line);
      }
    }
  } else {
    // contWidth >= firstWidth, no re-wrapping needed
    for (let i = 1; i < allWrapped.length; i++) {
      result.push(contPrefix + allWrapped[i]);
    }
  }

  return result;
}
