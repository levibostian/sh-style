/**
 * @module
 * Cross-runtime wrapper for sh-style — a plain-text design system for CLI and CI output.
 *
 * This module bundles the compiled Go binary as base64 strings, extracts the
 * appropriate binary for the current OS/architecture to the OS cache directory,
 * and executes it as a subprocess — providing the same library API across
 * Deno, Node.js, and Bun.
 *
 * Architecture at this moment:
 * - The goal of this entire project is that there is a CLI and then a collection of wrappers created for various languages/runtimes. So this code is meant to be small and simply focused around a great public API and then running the CLI under the hood.
 * - Ideally, we don't need a lot of runtime permissions for Deno. jsr does allow you to include binary files which requires you to use syntax:
 * `import _binMac64 from "./bin/log-darwin-amd64" with { type: "bytes" };`
 * Which forces Deno to download the binary from jsr. Deno only downloads files that it imports. But, jsr does not allow you to use this syntax until: https://github.com/denoland/deno/issues/29904 has been resolved.
 * - I looked into compiling the Go code to webassembly and then running it in Deno using the WebAssembly APIs. But Deno currently doesn't implement the "node:wasi" module so we can't run it in Deno. https://github.com/denoland/deno/pull/32413 is trying to add this feature in.
 */

import { getAllEnv } from "@cross/env"
import process from "node:process"
import bins from "./bin/bin.ts"
import * as fs from "node:fs"
import { spawnSync } from "node:child_process"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A minimal logger interface (subset of Console). */
export type Logger = Pick<Console, "log">

/** Configuration for creating a logger instance. */
export interface LoggerConfig {
  /** Output width in columns. Defaults to DOC_WIDTH env var or 72. */
  width?: number
  /** Where output is sent. Defaults to console. */
  logger?: Logger
}

/** A logger instance with methods for every sh-style element. */
export interface LoggerInstance {
  title(text: string): void
  phase(text: string): void
  step(text: string): void
  msg(text: string): void
  note(text: string): void
  why(text: string): void
  plan(text: string): void
  ok(text: string): void
  done(text: string): void
  cmd(text: string): void
  warn(text: string, details?: string[]): void
  error(lines: string[]): void
  kv(label: string, entries: [string, string][]): void
  list(label: string, items: string[]): void
}

// ---------------------------------------------------------------------------
// Cache directory resolution
// ---------------------------------------------------------------------------

// Use a cache directory so we don't have to extract the binary on every run.
// We have the ability to write it once and then reuse it for performance gains.
function getCacheDir(): string {
  const platform = process.platform
  if (platform === "darwin") {
    const home = process.env["HOME"] ?? "/tmp"
    return `${home}/Library/Caches/sh-style`
  } else if (platform === "win32") {
    const localAppData = process.env["LOCALAPPDATA"] ?? process.env["TEMP"] ?? "C:\\Temp"
    return `${localAppData}\\sh-style`
  } else {
    const home = process.env["HOME"] ?? "/tmp"
    return `${home}/.cache/sh-style`
  }
}

// ---------------------------------------------------------------------------
// Binary extraction
// ---------------------------------------------------------------------------

/** Module-level cache so we only resolve the path once per process. */
let cachedBinPath: string | undefined

function getBinaryPath(): string {
  if (cachedBinPath !== undefined) {
    return cachedBinPath
  }

  const platform = process.platform // "darwin" | "linux" | "win32"
  const arch = process.arch // "x64" | "arm64" | "ia32" | ...

  let goOs: string
  switch (platform) {
    case "darwin":
      goOs = "darwin"
      break
    case "linux":
      goOs = "linux"
      break
    case "win32":
      goOs = "windows"
      break
    default:
      throw new Error(`Unsupported OS: ${platform}`)
  }

  let goArch: string
  switch (arch) {
    case "x64":
      goArch = "amd64"
      break
    case "arm64":
      goArch = "arm64"
      break
    default:
      throw new Error(`Unsupported architecture: ${arch}`)
  }

  const ext = goOs === "windows" ? ".exe" : ""
  const binName = `log-${goOs}-${goArch}${ext}`

  const base64 = bins[binName]
  if (!base64) {
    throw new Error(`No embedded binary found for ${binName}`)
  }

  const cacheDir = getCacheDir()
  const sep = goOs === "windows" ? "\\" : "/"
  const binPath = `${cacheDir}${sep}${binName}`

  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true })
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    fs.writeFileSync(binPath, bytes, { encoding: "utf8", mode: 0o755 })
  }

  cachedBinPath = binPath

  return binPath
}

// ---------------------------------------------------------------------------
// Subprocess execution
// ---------------------------------------------------------------------------

function runLogSync(args: string[], env: Record<string, string>): string {
  const binPath = getBinaryPath()

  const result = spawnSync(binPath, args, {
    env,
    encoding: "utf-8",
  })
  if (result.error) {
    throw result.error
  }
  return (result.stdout || "").replace(/\n$/, "")
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
  const logger: Logger = config?.logger ?? console
  const env: Record<string, string> = {}
  if (config?.width !== undefined) {
    env["DOC_WIDTH"] = String(config.width)
  }

  function exec(args: string[]): void {
    const output = runLogSync(args, env)
    if (output) {
      logger.log(output)
    }
  }

  return {
    title: (text: string) => exec(["title", text]),
    phase: (text: string) => exec(["phase", text]),
    step: (text: string) => exec(["step", text]),
    msg: (text: string) => exec(["msg", text]),
    note: (text: string) => exec(["note", text]),
    why: (text: string) => exec(["why", text]),
    plan: (text: string) => exec(["plan", text]),
    ok: (text: string) => exec(["ok", text]),
    done: (text: string) => exec(["done", text]),
    cmd: (text: string) => exec(["cmd", text]),
    warn: (text: string, details?: string[]) => {
      const args = ["warn", text]
      if (details) {
        for (const d of details) {
          args.push("--detail", d)
        }
      }
      exec(args)
    },
    error: (lines: string[]) => exec(["error", ...lines]),
    kv: (label: string, entries: [string, string][]) => {
      const args = ["kv", label]
      for (const [k, v] of entries) {
        args.push(`${k}=${v}`)
      }
      exec(args)
    },
    list: (label: string, items: string[]) => exec(["list", label, ...items]),
  }
}

// ---------------------------------------------------------------------------
// Default logger + convenience exports
// ---------------------------------------------------------------------------

const defaultLogger = createLogger()

export const title = (text: string): void => defaultLogger.title(text)
export const phase = (text: string): void => defaultLogger.phase(text)
export const step = (text: string): void => defaultLogger.step(text)
export const msg = (text: string): void => defaultLogger.msg(text)
export const note = (text: string): void => defaultLogger.note(text)
export const why = (text: string): void => defaultLogger.why(text)
export const plan = (text: string): void => defaultLogger.plan(text)
export const ok = (text: string): void => defaultLogger.ok(text)
export const done = (text: string): void => defaultLogger.done(text)
export const cmd = (text: string): void => defaultLogger.cmd(text)
export const warn = (text: string, details?: string[]): void => defaultLogger.warn(text, details)
export const error = (lines: string[]): void => defaultLogger.error(lines)
export const kv = (label: string, entries: [string, string][]): void => defaultLogger.kv(label, entries)
export const list = (label: string, items: string[]): void => defaultLogger.list(label, items)

export default createLogger
