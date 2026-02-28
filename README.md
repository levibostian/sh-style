# sh-style

Simple design system for CLIs and CI tools.

When you make a CLI tool, especially one that runs on CI or outputs to a log file, it can be challenging to make the output be human-readable, easy to scan at a glance, and structured enough that users can quickly find the information they need. This is especially true when color and rich formatting options are not available. This tool aims to solve all of these problems with a simple set of design elements that can be combined to create beautiful, readable output.

## Design System

A well-formed program should generally follow this structure:

1. **Document Header** (TITLE)
2. **One short intro** (NOTE / PLAN) — what this run will do
3. **Phases** (H1 sections) in order
4. Inside each phase: repeated **Steps** (H2 + commands + result)
5. Optional: **Artifacts**, **Metrics**, **Debug**
6. **Summary** + **Footer** (DONE)

### Example Output

```txt
========================================================================
========================================================================
                     RELEASE PIPELINE — payments-api
========================================================================
========================================================================

NOTE: Build the service, run tests, and publish artifacts for deployment.

------------------------------------------------------------------------
## Setup
------------------------------------------------------------------------

WHY: Ensure deterministic tooling and consistent dependencies in CI.

ENV:
  node: 20.11.1
  pnpm: 9.1.0
  os: ubuntu-22.04

----------
### Enable toolchain
----------

  $ corepack enable
  $ node --version
  $ pnpm --version
OK: toolchain ready

----------
### Install dependencies
----------

  $ pnpm install --frozen-lockfile
OK: dependencies installed

------------------------------------------------------------------------
## Build
------------------------------------------------------------------------

PLAN: Produce production-ready output in `dist/`.

----------
### Compile TypeScript
----------

  $ pnpm run build
OK: build finished in 18s

----------
### Bundle server
----------

  $ pnpm run bundle
OK: bundle created

ARTIFACTS:
  - dist/server.js
  - dist/server.js.map

------------------------------------------------------------------------
## Test
------------------------------------------------------------------------

----------
### Unit tests
----------

  $ pnpm test
OK: unit tests passed

----------
### Integration tests
----------

  $ pnpm run test:integration
!!! WARNING: integration tests skipped
    detail: INTEGRATION=0

------------------------------------------------------------------------
## Deploy (dry run)
------------------------------------------------------------------------

NOTE: Validate deploy commands without publishing changes.

----------
### Validate deploy script
----------

  $ ./scripts/deploy.sh --dry-run
OK: deploy validation passed

METRICS:
  setup_time: 22s
  build_time: 18s
  test_time: 41s
  total_time: 1m21s

DEBUG:
  git_sha: 1a2b3c4d
  branch: main
  runner: github-actions

SUMMARY:
  status: success
  duration: 1m21s
  artifacts: 2

DONE: RELEASE PIPELINE — payments-api
```

## Getting Started

Choose how you want to use sh-style:

- **[CLI Tool](#getting-started-cli-tool)** - Use the `log` command in your shell scripts and CI pipelines
- **[Deno, Bun, and Node.js Library](#getting-started-deno-bun-and-nodejs-library)** - Import and use sh-style directly in Deno, Node.js, or Bun
- **[Go Library](#getting-started-go-library)** - Import and use sh-style directly in your Go programs

## Getting Started: CLI Tool

A CLI tool implementing the sh-style design system for plain-text CI typography.

### Installation

#### Download binary

Download a pre-built binary from the [GitHub Releases](https://github.com/levibostian/sh-style/releases) page. Binaries are available for Linux (x86_64, aarch64), macOS (x86_64, aarch64), and Windows (x86_64).

#### Build from source

```bash
go build -o log .
./log title "Hello World"
```

#### Example output

```
========================================================================
========================================================================
                              Hello World
========================================================================
========================================================================
```

### Commands

The `log` CLI supports two modes:

1. **Direct subcommands** - Generate individual elements (e.g., `log phase "Setup"`)
2. **JSONL rendering** - Read structured events from stdin (`log render`)

#### Headers

```bash
log title <text...>      # Document title (centered, double rules)
log phase <text...>      # H1 section (full-width rules)
log step <text...>       # H2 subsection (short rules)
```

#### Messages

```bash
log note <text...>       # NOTE: message
log why <text...>        # WHY: message
log plan <text...>       # PLAN: message
log ok <text...>         # OK: message
log done <text...>       # DONE: message
```

#### Commands

```bash
log cmd <text...>        # Display shell command with $ prefix
```

#### Warnings & Errors

```bash
log warn <text...> [--detail <line>]...  # Warning with optional details
log error <line1> [line2]...             # Error box with multiple lines
```

#### Structured Data

```bash
log kv <LABEL> <key=value>...   # Key-value block (ENV, SUMMARY, etc.)
log list <LABEL> <item>...      # List block (ARTIFACTS, FILES, etc.)
```

#### JSONL Mode

Stream JSONL commands from stdin:

```bash
log render               # Read JSONL from stdin and render
```

Example:
```bash
echo '{"command":"title","lines":["Hello World"]}' | log render
cat events.jsonl | log render
```

**JSONL Format:** All commands use consistent structure with `command` and `lines` properties:

```jsonl
{"command":"title","lines":["My Title"]}
{"command":"phase","lines":["Setup"]}
{"command":"step","lines":["Install dependencies"]}
{"command":"note","lines":["Starting process..."]}
{"command":"cmd","lines":["npm install"]}
{"command":"ok","lines":["build completed"]}
{"command":"warn","lines":["Warning text","detail 1","detail 2"]}
{"command":"error","lines":["Error line 1","Error line 2"]}
{"command":"kv","lines":["ENV","node: 20.11.1","os: ubuntu-22.04"]}
{"command":"list","lines":["ARTIFACTS","dist/app.js","dist/app.map"]}
```

**Format rules:**
- Simple commands (`title`, `phase`, `step`, `note`, `why`, `plan`, `ok`, `done`, `cmd`): `lines[0]` is the text
- `warn`: `lines[0]` is warning text, `lines[1..]` are optional details
- `error`: `lines[0..]` are all error lines
- `kv`: `lines[0]` is label, `lines[1..]` are "key: value" pairs
- `list`: `lines[0]` is label, `lines[1..]` are items

### Configuration

Set the fixed width for rules and boxes using the `DOC_WIDTH` environment variable (default: 72):

```bash
export DOC_WIDTH=80
log title "Wider output"
```

### Features

- **No truncation** - all text is wrapped, never cut off
- **Character preservation** - including repeated spaces
- **Deterministic output** - suitable for snapshot testing
- **Streaming** - render events immediately as they arrive
- **Fixed-width output** - configurable via `DOC_WIDTH`
- **Automatic spacing** - elements add appropriate whitespace automatically

### Example Usage

**Simple build script:**
```bash
#!/bin/bash
log title "BUILD PIPELINE"

log phase "Setup"
log cmd "npm install"
log ok "dependencies installed"

log phase "Build"
log step "Compile TypeScript"
log cmd "npm run build"
log ok "build completed in 12s"

log step "Bundle application"
log cmd "npm run bundle"
log ok "bundle created"

log list ARTIFACTS dist/app.js dist/app.css
```

**Error handling:**
```bash
if ! npm test; then
  log error "Tests failed" "exit code: $?" "run npm test for details"
  exit 1
fi
```

**Using JSONL from another language:**
```bash
cat > build.jsonl << 'EOF'
{"command":"title","lines":["BUILD PIPELINE"]}
{"command":"phase","lines":["Setup"]}
{"command":"cmd","lines":["npm install"]}
{"command":"ok","lines":["dependencies installed"]}
EOF

cat build.jsonl | log render
```

## Getting Started: Deno, Bun, and Node.js Library

Use sh-style directly in your Deno, Node.js, or Bun code. This cross-runtime wrapper bundles the compiled Go binary and executes CLI commands under the hood, providing a clean TypeScript API that works across all major JavaScript runtimes.

See the [Deno, Bun, and Node.js Library documentation](deno/README.md) for installation, usage examples, and API reference.

## Getting Started: Go Library

Use sh-style directly in your Go programs by importing the root package. The library provides both a Logger interface for structured logging and standalone functions for quick one-off formatting.

### Installation

```bash
go get github.com/levibostian/sh-style
```

### Using the Logger Interface

Create a logger instance for structured output:

```go
package main

import (
    "github.com/levibostian/sh-style"
)

func main() {
    // Create a logger with width 72
    logger := shstyle.NewLogger(72)
    
    logger.Title("My Build Script")
    logger.Phase("Setup")
    logger.Step("Installing dependencies")
    logger.Cmd("go mod download")
    logger.Ok("Dependencies installed")
    logger.Done("Setup complete!")
}
```

**Create logger from environment:**

```go
// Uses DOC_WIDTH env var (defaults to 72)
logger := shstyle.NewLoggerFromEnv()
logger.Title("My Application")
```

**Custom width:**

```go
logger := shstyle.NewLogger(50)
logger.Title("Narrow Output")

// Or change width later
logger.SetWidth(80)
```

### Using Standalone Functions

For quick one-off formatting, use the standalone functions:

```go
package main

import (
    "github.com/levibostian/sh-style"
)

func main() {
    shstyle.Title("Quick Example")
    shstyle.Phase("One-off formatting")
    shstyle.Note("You can use standalone functions")
    shstyle.Done("Example complete!")
}
```

**With custom width:**

```go
shstyle.TitleWithWidth("Custom Width", 50)
shstyle.PhaseWithWidth("Narrow output", 50)
```

### API Reference

#### Headers

```go
logger.Title(text string)      // Document title (centered, double rules)
logger.Phase(text string)      // H1 section (full-width rules)
logger.Step(text string)       // H2 subsection (short rules)
```

#### Messages

```go
logger.Note(text string)       // NOTE: message
logger.Why(text string)        // WHY: message
logger.Plan(text string)       // PLAN: message
logger.Ok(text string)         // OK: message
logger.Done(text string)       // DONE: message
```

#### Commands

```go
logger.Cmd(text string)        // Display shell command with $ prefix
```

#### Warnings & Errors

```go
logger.Warn(text string, details ...string)    // Warning with optional details
logger.Error(lines ...string)                   // Error box with multiple lines
```

#### Structured Data

```go
logger.Kv(label string, entries [][2]string)   // Key-value block
logger.List(label string, items []string)       // List block
```

### Configuration

Set the fixed width for rules and boxes using the `DOC_WIDTH` environment variable (default: 72):

```go
import "os"

os.Setenv("DOC_WIDTH", "80")
logger := shstyle.NewLoggerFromEnv()
logger.Title("Wider output")
```

Or use explicit width:

```go
logger := shstyle.NewLogger(80)
logger.Title("Wider output")
```

### Features

- **No truncation** - all text is wrapped, never cut off
- **Character preservation** - including repeated spaces
- **Deterministic output** - suitable for snapshot testing
- **Fixed-width output** - configurable via `DOC_WIDTH` or constructor
- **Automatic spacing** - elements add appropriate whitespace automatically
- **Zero dependencies** - pure Go implementation

### Example Usage

**Build script:**
```go
package main

import (
    "github.com/levibostian/sh-style"
)

func main() {
    logger := shstyle.NewLogger(72)
    
    logger.Title("BUILD PIPELINE")
    
    logger.Phase("Setup")
    logger.Cmd("go mod download")
    logger.Ok("dependencies installed")
    
    logger.Phase("Build")
    logger.Step("Compile application")
    logger.Cmd("go build -o app .")
    logger.Ok("build completed")
    
    logger.List("Artifacts", []string{
        "app",
        "README.md",
        "LICENSE",
    })
}
```

**Environment variables:**
```go
logger.Kv("Build Environment", [][2]string{
    {"GOOS", "linux"},
    {"GOARCH", "amd64"},
    {"CGO_ENABLED", "0"},
})
```

**Error handling:**
```go
if err := runTests(); err != nil {
    shstyle.Error("Tests failed", err.Error(), "run go test for details")
    os.Exit(1)
}
```

**Warnings:**
```go
logger.Warn("Deprecated function used", 
    "Function 'OldAPI' is deprecated",
    "Use 'NewAPI' instead",
)
```

## Development 

Install Go (optionally run `mise install` to install it). 

### Build

Build the CLI for your current platform:
```bash
make build
```

Build binaries for all platforms (Linux, macOS, Windows × amd64/arm64):
```bash
make build-all
```

This compiles 6 binaries to `dist/` and copies them to `deno/bin/` for the Deno wrapper.

### Test

Run all tests:
```bash
make test
```

Or manually:
```bash
make build  # Required first
go test -v .
```

The test suite includes:
- **Render mode tests** - Test JSONL parsing and rendering
- **Wrapper tests** - Test CLI, Deno, and Go wrapper consistency
- **Error handling tests** - Test CLI argument validation

All wrapper tests compare against the golden output file at `tests/expected-output.txt`.

### Other Make Targets

- `make clean` - Remove all built binaries
- `make help` - Show all available targets

### Architecture

```
shstyle.go           # Public API - standalone functions
logger.go            # Logger type and methods
render.go            # Rendering functions for all elements
wrap.go              # Text wrapping & formatting utilities
cli/
  main.go            # CLI entrypoint
  commands.go        # CLI argument parsing & command types
tests/
  expected-output.txt # Single source of truth for wrapper output
  scripts/
    test-cli.sh      # CLI wrapper test script
    test-deno.ts     # Deno wrapper test script
    test-go.go       # Go wrapper test script
  fixtures/
    happy.jsonl      # Example JSONL input
    happy.out        # Expected output
deno/
  mod.ts             # Deno wrapper library (execs Go binary)
  deno.json          # JSR package config
  scripts/
    build-binaries.ts  # Cross-compile Go binaries for Deno wrapper
```

## License

MIT (see LICENSE file in repository root)
