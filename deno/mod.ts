/**
 * @module
 * Cross-runtime wrapper for sh-style — a plain-text design system for CLI and CI output.
 *
 * This module downloads the compiled Go binary from GitHub Releases on first use,
 * caches it at ~/.cache/sh-style/<version>/, and executes it as a subprocess,
 * providing the same library API across Deno, Node.js, and Bun.
 *
 * **Important**: You must call and await `createLogger()` once before using any
 * top-level functions. This ensures the binary is downloaded and cached.
 *
 * @example
 * ```ts
 * import { createLogger, title, phase, done } from "@levibostian/sh-style";
 *
 * await createLogger(); // download/verify binary once
 *
 * title("My Build Script");
 * phase("Setup");
 * done("Complete!");
 * ```
 */

import { CurrentOS, CurrentArchitecture } from "@cross/runtime"
import { getAllEnv, getEnv } from "@cross/env"
import { exists } from "@cross/fs/stat"
import { writeFile } from "@cross/fs/io"
import { mkdir, chmod } from "@cross/fs/ops"
import versionJson from "./version.json" with { type: "json" }
const BINARY_VERSION = versionJson.version

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GITHUB_REPO = "levibostian/sh-style"

// ---------------------------------------------------------------------------
// Module-level binary path (set once by createLogger)
// ---------------------------------------------------------------------------

let resolvedBinaryPath: string | undefined

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
// Binary resolution
// ---------------------------------------------------------------------------

/**
 * Returns the GitHub release asset name for the current platform.
 * Asset names follow the pattern: bin-<arch>-<OS>[.exe]
 * e.g. bin-aarch64-Darwin, bin-x86_64-Linux, bin-x86_64-Windows.exe
 */
function getAssetName(): string {
  const os = CurrentOS // "windows" | "linux" | "macos"
  const arch = CurrentArchitecture // "x86_64" | "arm64" | "x86" | "arm"

  let releaseOs: string
  let releaseArch: string

  switch (os) {
    case "macos":
      releaseOs = "Darwin"
      break
    case "linux":
      releaseOs = "Linux"
      break
    case "windows":
      releaseOs = "Windows"
      break
    default:
      throw new Error(`Unsupported OS: ${os}`)
  }

  switch (arch) {
    case "x86_64":
      releaseArch = "x86_64"
      break
    case "arm64":
      releaseArch = "aarch64"
      break
    default:
      throw new Error(`Unsupported architecture: ${arch}`)
  }

  const ext = os === "windows" ? ".exe" : ""
  return `bin-${releaseArch}-${releaseOs}${ext}`
}

/**
 * Returns the local cache path for the binary.
 * Cache location: ~/.cache/sh-style/<version>/<assetName>
 * The version can be overridden by the BINARY_VERSION env var (used in tests to point at a local build).
 */
function getCachePath(assetName: string): string {
  const home = getEnv("HOME")
  if (!home) {
    throw new Error("HOME environment variable is not set")
  }
  // Allow env var override so tests can inject a locally built binary (e.g. BINARY_VERSION=dev)
  const version = getEnv("BINARY_VERSION") || BINARY_VERSION
  const cacheDir = `${home}/.cache/sh-style/${version}`
  return `${cacheDir}/${assetName}`
}

/**
 * Ensures the binary exists in cache, downloading it from GitHub Releases if needed.
 * Returns the path to the cached binary.
 */
async function ensureBinary(): Promise<string> {
  const assetName = getAssetName()
  const cachePath = getCachePath(assetName)

  if (await exists(cachePath)) {
    return cachePath
  }

  const cacheDir = cachePath.substring(0, cachePath.lastIndexOf("/"))
  await mkdir(cacheDir, { recursive: true })

  const version = getEnv("BINARY_VERSION") || BINARY_VERSION
  const url = `https://github.com/${GITHUB_REPO}/releases/download/${version}/${assetName}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `Failed to download sh-style binary from ${url}: HTTP ${response.status} ${response.statusText}`,
    )
  }

  const data = await response.arrayBuffer()
  await writeFile(cachePath, new Uint8Array(data))
  await chmod(cachePath, 0o755)

  return cachePath
}

// ---------------------------------------------------------------------------
// Subprocess execution (synchronous per-runtime)
// ---------------------------------------------------------------------------

function runLogSync(binPath: string, args: string[], env: Record<string, string>): string {
  const baseEnv = getAllEnv()
  const allEnv: Record<string, string> = {}

  // Filter out undefined values from getAllEnv()
  for (const [key, value] of Object.entries(baseEnv)) {
    if (value !== undefined) {
      allEnv[key] = value
    }
  }

  // Override with custom env vars
  Object.assign(allEnv, env)

  // @ts-ignore: Deno global
  if (typeof Deno !== "undefined") {
    // @ts-ignore: Deno.Command
    const result = new Deno.Command(binPath, {
      args,
      env: allEnv,
      stdout: "piped",
      stderr: "piped",
    }).outputSync()
    return new TextDecoder().decode(result.stdout).replace(/\n$/, "")
  }
  // @ts-ignore: Bun global
  else if (typeof Bun !== "undefined") {
    // @ts-ignore: Bun.spawnSync
    const result = Bun.spawnSync([binPath, ...args], {
      env: allEnv,
      stdout: "pipe",
      stderr: "pipe",
    })
    return result.stdout.toString().replace(/\n$/, "")
  }
  // @ts-ignore: process global
  else if (typeof process !== "undefined") {
    // @ts-ignore: require
    const { spawnSync } = require("child_process")
    const result = spawnSync(binPath, args, {
      env: allEnv,
      encoding: "utf-8",
    })
    if (result.error) {
      throw result.error
    }
    return (result.stdout || "").replace(/\n$/, "")
  } else {
    throw new Error("Unsupported runtime")
  }
}

// ---------------------------------------------------------------------------
// Logger factory
// ---------------------------------------------------------------------------

/**
 * Initialise sh-style: ensures the binary is downloaded and cached, then
 * returns a configured logger instance.
 *
 * **This must be awaited once before calling any top-level functions.**
 * You may discard the returned value if you only use the top-level functions.
 *
 * @param config Optional configuration for width and output target.
 * @returns A LoggerInstance with synchronous methods for every sh-style element.
 *
 * @example
 * ```ts
 * await createLogger(); // initialise (download binary if needed)
 *
 * title("My Build Script");
 * phase("Setup");
 * done("Complete!");
 * ```
 */
export async function createLogger(config?: LoggerConfig): Promise<LoggerInstance> {
  resolvedBinaryPath = await ensureBinary()

  const logger: Logger = config?.logger ?? console
  const env: Record<string, string> = {}
  if (config?.width !== undefined) {
    env["DOC_WIDTH"] = String(config.width)
  }

  function exec(args: string[]): void {
    if (!resolvedBinaryPath) {
      throw new Error("sh-style: binary not ready. Await createLogger() before using logger functions.")
    }
    const output = runLogSync(resolvedBinaryPath, args, env)
    if (output) {
      logger.log(output)
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
// Top-level sync convenience functions
// ---------------------------------------------------------------------------

/**
 * Returns the module-level binary path, throwing a clear error if
 * createLogger() has not been awaited yet.
 */
function getBinaryPath(): string {
  if (!resolvedBinaryPath) {
    throw new Error("sh-style: binary not ready. Await createLogger() before using logger functions.")
  }
  return resolvedBinaryPath
}

function execDefault(args: string[]): void {
  const output = runLogSync(getBinaryPath(), args, {})
  if (output) {
    console.log(output)
  }
}

export const title = (text: string): void => execDefault(["title", text])
export const phase = (text: string): void => execDefault(["phase", text])
export const step = (text: string): void => execDefault(["step", text])
export const note = (text: string): void => execDefault(["note", text])
export const why = (text: string): void => execDefault(["why", text])
export const plan = (text: string): void => execDefault(["plan", text])
export const ok = (text: string): void => execDefault(["ok", text])
export const done = (text: string): void => execDefault(["done", text])
export const cmd = (text: string): void => execDefault(["cmd", text])
export const warn = (text: string, details?: string[]): void => {
  const args = ["warn", text]
  if (details) {
    for (const d of details) {
      args.push("--detail", d)
    }
  }
  execDefault(args)
}
export const error = (lines: string[]): void => execDefault(["error", ...lines])
export const kv = (label: string, entries: [string, string][]): void => {
  const args = ["kv", label]
  for (const [k, v] of entries) {
    args.push(`${k}=${v}`)
  }
  execDefault(args)
}
export const list = (label: string, items: string[]): void => execDefault(["list", label, ...items])

export default createLogger
