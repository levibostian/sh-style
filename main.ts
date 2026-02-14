#!/usr/bin/env -S deno run --allow-env

/**
 * Main entrypoint for the log CLI tool.
 * Supports both subcommands and render from stdin.
 * Also exports public functions for programmatic use.
 */

import { parseArgs } from "./src/cli.ts";
import { parseCommand } from "./src/commands.ts";
import { renderCommand } from "./src/render.ts";
import { getDocWidth } from "./src/wrap.ts";

async function main() {
  const args = Deno.args;

  // Get configured width
  const width = getDocWidth();

  // Check if user wants to run the render command. 
  if (args.length > 0 && args[0] === "render") {
    await renderMode(width);
    return;
  }

  // Otherwise, find out the subcommand and execute it. 
  const command = parseArgs(args);
  if (command === null) {
    // Help or version was printed, exit already handled
    return;
  }

  // Render and output
  const output = renderCommand(command, width);
  await Deno.stdout.write(new TextEncoder().encode(output));
}

/**
 * Render mode: read JSONL from stdin, render each command to stdout.
 */
async function renderMode(width: number) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  let lineNumber = 0;
  let buffer = "";

  // Read stdin in chunks. this is required because the OS may provide data in chunks
  // through stdin so we need to use a buffer to accumulate data until we have complete lines.
  // once we have a complete line, we can parse and render it.
  for await (const chunk of Deno.stdin.readable) {
    buffer += decoder.decode(chunk, { stream: true });

    // Process complete lines
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.substring(0, newlineIndex);
      buffer = buffer.substring(newlineIndex + 1);

      lineNumber++;

      // Skip empty lines
      if (line.trim() === "") {
        continue;
      }

      // Parse and render (skip invalid commands)
      const command = parseCommand(line, lineNumber);
      if (command !== null) {
        const output = renderCommand(command, width);
        await Deno.stdout.write(encoder.encode(output));
      }
    }
  }

  // Handle any remaining content in buffer (line without trailing newline)
  if (buffer.trim() !== "") {
    lineNumber++;
    const command = parseCommand(buffer, lineNumber);
    if (command !== null) {
      const output = renderCommand(command, width);
      await Deno.stdout.write(encoder.encode(output));
    }
  }
}

// Run main
if (import.meta.main) {
  main();
}

// ========================================================================
// PUBLIC API - Exported functions for programmatic use
// ========================================================================

/**
 * Logger interface compatible with console.log
 */
export type Logger = Pick<Console, "log">;

/**
 * Configuration options for creating a logger instance
 */
export interface LoggerConfig {
  /** Fixed width for rules and boxes (default: 72, or DOC_WIDTH env var) */
  width?: number;
  /** Custom logger (default: console) */
  logger?: Logger;
}

/**
 * Logger instance with all formatting methods
 */
export interface LoggerInstance {
  /** Render a title (centered, double-ruled) */
  title(text: string): void;
  /** Render a phase (H1 section heading) */
  phase(text: string): void;
  /** Render a step (H2 subsection heading) */
  step(text: string): void;
  /** Render a note message */
  note(text: string): void;
  /** Render a why message */
  why(text: string): void;
  /** Render a plan message */
  plan(text: string): void;
  /** Render an ok message */
  ok(text: string): void;
  /** Render a done message */
  done(text: string): void;
  /** Render a shell command (with $ prefix) */
  cmd(text: string): void;
  /** Render a warning with optional detail lines */
  warn(text: string, details?: string[]): void;
  /** Render an error box with multiple lines */
  error(lines: string[]): void;
  /** Render a key-value block */
  kv(label: string, entries: [string, string][]): void;
  /** Render a list block */
  list(label: string, items: string[]): void;
}

/**
 * Create a configured logger instance with all formatting methods.
 * 
 * @param config Optional configuration (width, logger)
 * @returns A logger instance with methods for all formatting commands
 * 
 * @example
 * ```typescript
 * // Use default console logger
 * const log = createLogger();
 * log.title("My Build");
 * log.phase("Setup");
 * log.done("Complete!");
 * 
 * // Configure custom width
 * const narrowLog = createLogger({ width: 50 });
 * narrowLog.title("Narrow Output");
 * 
 * // Use custom logger
 * const fileLog = createLogger({
 *   logger: {
 *     log: (msg) => Deno.writeTextFileSync("log.txt", msg + "\n", { append: true })
 *   }
 * });
 * fileLog.phase("Logged to file");
 * ```
 */
export function createLogger(config?: LoggerConfig): LoggerInstance {
  const width = config?.width ?? getDocWidth();
  const logger = config?.logger ?? console;

  return {
    title(text: string): void {
      const output = renderCommand({ type: "title", text }, width);
      logger.log(output);
    },

    phase(text: string): void {
      const output = renderCommand({ type: "phase", text }, width);
      logger.log(output);
    },

    step(text: string): void {
      const output = renderCommand({ type: "step", text }, width);
      logger.log(output);
    },

    note(text: string): void {
      const output = renderCommand({ type: "note", text }, width);
      logger.log(output);
    },

    why(text: string): void {
      const output = renderCommand({ type: "why", text }, width);
      logger.log(output);
    },

    plan(text: string): void {
      const output = renderCommand({ type: "plan", text }, width);
      logger.log(output);
    },

    ok(text: string): void {
      const output = renderCommand({ type: "ok", text }, width);
      logger.log(output);
    },

    done(text: string): void {
      const output = renderCommand({ type: "done", text }, width);
      logger.log(output);
    },

    cmd(text: string): void {
      const output = renderCommand({ type: "cmd", text }, width);
      logger.log(output);
    },

    warn(text: string, details?: string[]): void {
      const output = renderCommand({ type: "warn", text, details }, width);
      logger.log(output);
    },

    error(lines: string[]): void {
      const output = renderCommand({ type: "error", lines }, width);
      logger.log(output);
    },

    kv(label: string, entries: [string, string][]): void {
      const output = renderCommand({ type: "kv", label, entries }, width);
      logger.log(output);
    },

    list(label: string, items: string[]): void {
      const output = renderCommand({ type: "list", label, items }, width);
      logger.log(output);
    },
  };
}

// Export as default for convenience
export default createLogger;

// ========================================================================
// CONVENIENCE EXPORTS - Top-level functions with default configuration
// ========================================================================

/**
 * Default logger instance for convenience functions.
 * Uses default width (DOC_WIDTH env or 72) and console logger.
 */
const defaultLogger = createLogger();

/**
 * Render a title (centered, double-ruled) using default configuration
 */
export function title(text: string): void {
  defaultLogger.title(text);
}

/**
 * Render a phase (H1 section heading) using default configuration
 */
export function phase(text: string): void {
  defaultLogger.phase(text);
}

/**
 * Render a step (H2 subsection heading) using default configuration
 */
export function step(text: string): void {
  defaultLogger.step(text);
}

/**
 * Render a note message using default configuration
 */
export function note(text: string): void {
  defaultLogger.note(text);
}

/**
 * Render a why message using default configuration
 */
export function why(text: string): void {
  defaultLogger.why(text);
}

/**
 * Render a plan message using default configuration
 */
export function plan(text: string): void {
  defaultLogger.plan(text);
}

/**
 * Render an ok message using default configuration
 */
export function ok(text: string): void {
  defaultLogger.ok(text);
}

/**
 * Render a done message using default configuration
 */
export function done(text: string): void {
  defaultLogger.done(text);
}

/**
 * Render a shell command (with $ prefix) using default configuration
 */
export function cmd(text: string): void {
  defaultLogger.cmd(text);
}

/**
 * Render a warning with optional detail lines using default configuration
 */
export function warn(text: string, details?: string[]): void {
  defaultLogger.warn(text, details);
}

/**
 * Render an error box with multiple lines using default configuration
 */
export function error(lines: string[]): void {
  defaultLogger.error(lines);
}

/**
 * Render a key-value block using default configuration
 */
export function kv(label: string, entries: [string, string][]): void {
  defaultLogger.kv(label, entries);
}

/**
 * Render a list block using default configuration
 */
export function list(label: string, items: string[]): void {
  defaultLogger.list(label, items);
}
