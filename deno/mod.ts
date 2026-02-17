/**
 * @module
 * Cross-runtime wrapper for sh-style — a plain-text design system for CLI and CI output.
 *
 * This module bundles the compiled Go binary and executes it as a subprocess,
 * providing the same library API across Deno, Node.js, and Bun.
 */

import { CurrentOS, CurrentArchitecture } from "@cross/runtime";
import { getAllEnv } from "@cross/env";
import process from "node:process"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A minimal logger interface (subset of Console). */
export type Logger = Pick<Console, "log">;

/** Configuration for creating a logger instance. */
export interface LoggerConfig {
  /** Output width in columns. Defaults to DOC_WIDTH env var or 72. */
  width?: number;
  /** Where output is sent. Defaults to console. */
  logger?: Logger;
}

/** A logger instance with methods for every sh-style element. */
export interface LoggerInstance {
  title(text: string): void;
  phase(text: string): void;
  step(text: string): void;
  note(text: string): void;
  why(text: string): void;
  plan(text: string): void;
  ok(text: string): void;
  done(text: string): void;
  cmd(text: string): void;
  warn(text: string, details?: string[]): void;
  error(lines: string[]): void;
  kv(label: string, entries: [string, string][]): void;
  list(label: string, items: string[]): void;
}

// ---------------------------------------------------------------------------
// Binary resolution
// ---------------------------------------------------------------------------

function getBinaryPath(): string {
  const os = CurrentOS; // "windows" | "linux" | "macos"
  const arch = CurrentArchitecture; // "x86_64" | "arm64" | "x86" | "arm"

  let goOs: string;
  let goArch: string;

  switch (os) {
    case "macos":
      goOs = "darwin";
      break;
    case "linux":
      goOs = "linux";
      break;
    case "windows":
      goOs = "windows";
      break;
    default:
      throw new Error(`Unsupported OS: ${os}`);
  }

  switch (arch) {
    case "x86_64":
      goArch = "amd64";
      break;
    case "arm64":
      goArch = "arm64";
      break;
    default:
      throw new Error(`Unsupported architecture: ${arch}`);
  }

  const ext = os === "windows" ? ".exe" : "";
  const binName = `log-${goOs}-${goArch}${ext}`;
  
  // Use URL resolution to get the binary path relative to this module
  let binPath = new URL(`./bin/${binName}`, import.meta.url).pathname;
  
  // On Windows, pathname includes a leading slash before the drive letter
  // Remove it: /C:/foo/bar -> C:/foo/bar
  if (/^\/[A-Za-z]:/.test(binPath)) {
    binPath = binPath.slice(1);
  }
  
  return binPath;
}

// ---------------------------------------------------------------------------
// Subprocess execution
// ---------------------------------------------------------------------------

function runLogSync(args: string[], env: Record<string, string>): string {
  const binPath = getBinaryPath();
  const baseEnv = getAllEnv();
  const allEnv: Record<string, string> = {};
  
  // Filter out undefined values from getAllEnv()
  for (const [key, value] of Object.entries(baseEnv)) {
    if (value !== undefined) {
      allEnv[key] = value;
    }
  }
  
  // Override with custom env vars
  Object.assign(allEnv, env);

  // Runtime-specific synchronous command execution
  // @ts-ignore: Deno global
  if (typeof Deno !== 'undefined') {
    // Deno runtime
    // @ts-ignore: Deno.Command
    const result = new Deno.Command(binPath, {
      args,
      env: allEnv,
      stdout: "piped",
      stderr: "piped",
    }).outputSync();
    return new TextDecoder().decode(result.stdout).replace(/\n$/, "");
  } 
  // @ts-ignore: Bun global
  else if (typeof Bun !== 'undefined') {
    // Bun runtime
    // @ts-ignore: Bun.spawnSync
    const result = Bun.spawnSync([binPath, ...args], {
      env: allEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    return result.stdout.toString().replace(/\n$/, "");
  } 
  // @ts-ignore: process global
  else if (typeof process !== 'undefined') {
    // Node.js runtime
    // Dynamic import for Node.js child_process
    // @ts-ignore: require
    const { spawnSync } = require('child_process');
    const result = spawnSync(binPath, args, {
      env: allEnv,
      encoding: 'utf-8',
    });
    if (result.error) {
      throw result.error;
    }
    return (result.stdout || '').replace(/\n$/, "");
  } else {
    throw new Error('Unsupported runtime');
  }
}

// ---------------------------------------------------------------------------
// Logger factory
// ---------------------------------------------------------------------------

/**
 * Create a logger instance that executes the `log` CLI binary under the hood.
 *
 * @param config Optional configuration for width and output target.
 * @returns A LoggerInstance with methods for every sh-style element.
 */
export function createLogger(config?: LoggerConfig): LoggerInstance {
  const logger: Logger = config?.logger ?? console;
  const env: Record<string, string> = {};
  if (config?.width !== undefined) {
    env["DOC_WIDTH"] = String(config.width);
  }

  function exec(args: string[]): void {
    const output = runLogSync(args, env);
    if (output) {
      logger.log(output);
    }
  }

  return {
    title: (text: string) => exec(["title", text]),
    phase: (text: string) => exec(["phase", text]),
    step: (text: string) => exec(["step", text]),
    note: (text: string) => exec(["note", text]),
    why: (text: string) => exec(["why", text]),
    plan: (text: string) => exec(["plan", text]),
    ok: (text: string) => exec(["ok", text]),
    done: (text: string) => exec(["done", text]),
    cmd: (text: string) => exec(["cmd", text]),
    warn: (text: string, details?: string[]) => {
      const args = ["warn", text];
      if (details) {
        for (const d of details) {
          args.push("--detail", d);
        }
      }
      exec(args);
    },
    error: (lines: string[]) => exec(["error", ...lines]),
    kv: (label: string, entries: [string, string][]) => {
      const args = ["kv", label];
      for (const [k, v] of entries) {
        args.push(`${k}=${v}`);
      }
      exec(args);
    },
    list: (label: string, items: string[]) => exec(["list", label, ...items]),
  };
}

// ---------------------------------------------------------------------------
// Default logger + convenience exports
// ---------------------------------------------------------------------------

const defaultLogger = createLogger();

export const title = (text: string): void => defaultLogger.title(text);
export const phase = (text: string): void => defaultLogger.phase(text);
export const step = (text: string): void => defaultLogger.step(text);
export const note = (text: string): void => defaultLogger.note(text);
export const why = (text: string): void => defaultLogger.why(text);
export const plan = (text: string): void => defaultLogger.plan(text);
export const ok = (text: string): void => defaultLogger.ok(text);
export const done = (text: string): void => defaultLogger.done(text);
export const cmd = (text: string): void => defaultLogger.cmd(text);
export const warn = (text: string, details?: string[]): void =>
  defaultLogger.warn(text, details);
export const error = (lines: string[]): void => defaultLogger.error(lines);
export const kv = (label: string, entries: [string, string][]): void =>
  defaultLogger.kv(label, entries);
export const list = (label: string, items: string[]): void =>
  defaultLogger.list(label, items);

export default createLogger;
