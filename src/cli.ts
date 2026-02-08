/**
 * CLI argument parsing and subcommand mapping to commands.
 * Implements Option A: direct subcommands.
 */

import type { Command } from "./commands.ts";

/**
 * Parse command-line arguments into a Command.
 * Returns null if the command is a special command (help, version).
 */
export function parseArgs(args: string[]): Command | null {
  if (args.length === 0) {
    printHelp();
    Deno.exit(0);
  }

  const command = args[0];
  const rest = args.slice(1);

  switch (command) {
    case "help":
    case "--help":
    case "-h":
      printHelp();
      Deno.exit(0);
      break;

    case "render":
      // This is handled separately in main.ts
      throw new Error("render command should be handled in main.ts");

    case "title":
      return { type: "title", text: rest.join(" ") };

    case "phase":
      return { type: "phase", text: rest.join(" ") };

    case "step":
      return { type: "step", text: rest.join(" ") };

    case "note":
      return { type: "note", text: rest.join(" ") };

    case "why":
      return { type: "why", text: rest.join(" ") };

    case "plan":
      return { type: "plan", text: rest.join(" ") };

    case "ok":
      return { type: "ok", text: rest.join(" ") };

    case "done":
      return { type: "done", text: rest.join(" ") };

    case "cmd":
      return { type: "cmd", text: rest.join(" ") };

    case "warn":
      return parseWarn(rest);

    case "error":
      return parseError(rest);

    case "kv":
      return parseKv(rest);

    case "list":
      return parseList(rest);

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "log help" for usage information.');
      Deno.exit(1);
  }
}

/**
 * Parse warn command: log warn <text...> [--detail <line>]...
 */
function parseWarn(args: string[]): Command {
  const details: string[] = [];
  const textParts: string[] = [];

  let i = 0;
  while (i < args.length) {
    if (args[i] === "--detail") {
      if (i + 1 >= args.length) {
        console.error("Error: --detail flag requires an argument");
        Deno.exit(1);
      }
      details.push(args[i + 1]);
      i += 2;
    } else {
      textParts.push(args[i]);
      i++;
    }
  }

  const text = textParts.join(" ");
  if (text === "") {
    console.error("Error: warn command requires a message");
    Deno.exit(1);
  }

  return {
    type: "warn",
    text,
    details: details.length > 0 ? details : undefined,
  };
}

/**
 * Parse error command: log error <line1> [line2] [line3] ...
 */
function parseError(args: string[]): Command {
  if (args.length === 0) {
    console.error("Error: error command requires at least one line");
    Deno.exit(1);
  }

  return { type: "error", lines: args };
}

/**
 * Parse kv command: log kv <LABEL> <key=value>...
 */
function parseKv(args: string[]): Command {
  if (args.length < 1) {
    console.error("Error: kv command requires a label");
    Deno.exit(1);
  }

  const label = args[0];
  const entries: [string, string][] = [];

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    const eqIndex = arg.indexOf("=");
    if (eqIndex === -1 || eqIndex === 0) {
      console.error(`Error: invalid key=value pair: ${arg}`);
      Deno.exit(1);
    }

    const key = arg.substring(0, eqIndex);
    const value = arg.substring(eqIndex + 1);
    entries.push([key, value]);
  }

  return { type: "kv", label, entries };
}

/**
 * Parse list command: log list <LABEL> <item>...
 */
function parseList(args: string[]): Command {
  if (args.length < 1) {
    console.error("Error: list command requires a label");
    Deno.exit(1);
  }

  const label = args[0];
  const items = args.slice(1);

  return { type: "list", label, items };
}

/**
 * Print help message.
 */
function printHelp(): void {
  const help = `
log - Plain-text CI typography tool

USAGE:
  log <command> [args...]

COMMANDS:
  render                Read JSONL from stdin, render to stdout

  title <text...>       Document title (centered, double-ruled)
  phase <text...>       H1 section heading
  step <text...>        H2 subsection heading

  note <text...>        NOTE: labeled message
  why <text...>         WHY: labeled message
  plan <text...>        PLAN: labeled message
  ok <text...>          OK: labeled message
  done <text...>        DONE: labeled message

  cmd <text...>         Shell command ($ prefix)

  warn <text...> [--detail <line>]...
                        Warning with optional detail lines

  error <line1> [line2] ...
                        Error box with multiple lines

  kv <LABEL> <key=value>...
                        Key-value block

  list <LABEL> <item>...
                        List block

  help                  Show this help message

ENVIRONMENT:
  DOC_WIDTH             Fixed width for rules and boxes (default: 72)

EXAMPLES:
  log title "BUILD & TEST"
  log phase "Setup"
  log cmd "npm install"
  log warn "tests skipped" --detail "SKIP_TESTS=1"
  log error "deploy failed" "exit code: 1"
  log kv ENV node=20.11.1 os=ubuntu-22.04

  echo '{"type":"title","text":"Hello"}' | log render
`.trim();

  console.log(help);
}
