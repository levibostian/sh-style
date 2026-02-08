#!/usr/bin/env -S deno run --allow-env

/**
 * Main entrypoint for the log CLI tool.
 * Supports both subcommands and render from stdin.
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
