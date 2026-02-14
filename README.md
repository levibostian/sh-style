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
- **[Deno Library](#getting-started-deno-library)** - Import and use sh-style directly in your Deno code

## Getting Started: CLI Tool

A Deno CLI tool implementing the sh-style design system for plain-text CI typography.

### Installation

#### Run with Deno

```bash
deno run -A jsr:@levibostian/sh-style title "hello"
```

#### Build binary

```bash
deno task build
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

## Getting Started: Deno Library

Use sh-style directly in your Deno code with two available patterns:

1. **Simple functions** - Import and call functions directly (recommended for most use cases)
2. **Factory pattern** - Create a configured logger for custom width or output destination

### Installation

```typescript
// Import from JSR
import { title, phase, step, done } from "jsr:@levibostian/sh-style";

// Or for factory pattern
import { createLogger } from "jsr:@levibostian/sh-style";
```

For local development:
```typescript
import { title, done } from "../main.ts";
```

### Using Simple Functions

Import and call functions directly. All functions automatically output to console.

```typescript
import { title, phase, step, cmd, ok, done } from "jsr:@levibostian/sh-style";

title("My Build Script");
phase("Setup");
step("Installing dependencies");
cmd("npm install");
ok("Dependencies installed");
done("Setup complete!");
```

#### Headers

```typescript
title(text: string)      // Document title (centered, double rules)
phase(text: string)      // H1 section (full-width rules)
step(text: string)       // H2 subsection (short rules)
```

#### Messages

```typescript
note(text: string)       // NOTE: message
why(text: string)        // WHY: message
plan(text: string)       // PLAN: message
ok(text: string)         // OK: message
done(text: string)       // DONE: message
```

#### Commands

```typescript
cmd(text: string)        // Display shell command with $ prefix
```

#### Warnings & Errors

```typescript
warn(text: string, ...details: string[])  // Warning with optional details
error(...lines: string[])                  // Error box with multiple lines
```

#### Structured Data

```typescript
kv(label: string, ...pairs: string[])   // Key-value block (ENV, SUMMARY, etc.)
list(label: string, ...items: string[]) // List block (ARTIFACTS, FILES, etc.)
```

### Using Factory Pattern

Create a configured logger instance when you need custom width or custom output destination.

```typescript
import { createLogger } from "jsr:@levibostian/sh-style";

const log = createLogger();

log.title("My Build Script");
log.phase("Setup");
log.done("Complete!");
```

**Custom Width:**

```typescript
const log = createLogger({ width: 50 });
log.title("Narrow Output");
```

**Custom Logger:**

Pass a custom logger that implements the standard `Logger` interface (`Pick<Console, "log">`):

```typescript
const log = createLogger({
  logger: {
    log: (msg: string) => {
      // Send to file, network, or any other destination
      Deno.writeTextFileSync("/var/log/build.log", msg + "\n", { append: true });
    }
  }
});

log.title("Logging to file");
log.done("Build complete!");
```

Any object with a `log` method (including the built-in `console`) can be used as a logger.

### Configuration

Set the fixed width for rules and boxes using the `DOC_WIDTH` environment variable (default: 72):

```typescript
Deno.env.set("DOC_WIDTH", "80");
title("Wider output");
```

Or use the factory pattern with explicit width:

```typescript
const log = createLogger({ width: 80 });
log.title("Wider output");
```

### Features

- **No truncation** - all text is wrapped, never cut off
- **Character preservation** - including repeated spaces
- **Deterministic output** - suitable for snapshot testing
- **Fixed-width output** - configurable via `DOC_WIDTH` or factory options
- **Automatic spacing** - elements add appropriate whitespace automatically
- **Flexible output** - console, file, network, or any custom destination

### Example Usage

**Simple build script:**
```typescript
import { title, phase, step, cmd, ok, list } from "jsr:@levibostian/sh-style";

title("BUILD PIPELINE");

phase("Setup");
cmd("npm install");
ok("dependencies installed");

phase("Build");
step("Compile TypeScript");
cmd("npm run build");
ok("build completed in 12s");

step("Bundle application");
cmd("npm run bundle");
ok("bundle created");

list("ARTIFACTS", "dist/app.js", "dist/app.css");
```

**Error handling:**
```typescript
import { error } from "jsr:@levibostian/sh-style";

try {
  // ... some operation
} catch (e) {
  error("Tests failed", `error: ${e.message}`, "run npm test for details");
  Deno.exit(1);
}
```

**Multiple output destinations:**
```typescript
import { createLogger } from "jsr:@levibostian/sh-style";

const consoleLog = createLogger();
const fileLog = createLogger({
  logger: { 
    log: (msg) => Deno.writeTextFileSync("build.log", msg + "\n", { append: true }) 
  }
});

consoleLog.title("Console Output");
fileLog.title("File Output");
```

### Implementation Details

- Built with Deno 2
- No external dependencies (except Deno std for tests)
- Implements exact ELEMENTS-SPEC.md formatting rules
- Dual-mode architecture:
  - **CLI mode**: Direct subcommands or JSONL rendering via stdin
  - **Library mode**: Direct function imports or factory pattern for custom config
- Wrapping algorithm:
  - Preserves all characters exactly
  - Prefers whitespace breaks
  - Hard-breaks long tokens if needed
  - Handles explicit newlines as forced breaks
- Exit codes: 0 (success), 1 (error)

## Development 

Install deno (optionally run `asdf install` to install it). See commands in `deno.json` for build and test scripts.

### Architecture

```
main.ts             # CLI entrypoint & library exports
src/
  commands.ts       # Command types & JSONL parsing
  render.ts         # Rendering functions for all elements
  wrap.ts           # Text wrapping & formatting utilities
  cli.ts            # Argument parsing & subcommand mapping
tests/
  cli.test.ts          # CLI argument parsing tests
  commands.test.ts     # Command type tests
  integration.test.ts  # E2E CLI & JSONL tests
  lib.test.ts          # Library API tests
  render.test.ts       # Rendering function tests
  wrap.test.ts         # Text wrapping utility tests
  fixtures/
    happy.jsonl        # Example JSONL input
    happy.out          # Expected output
```

## License

MIT (see LICENSE file in repository root)
