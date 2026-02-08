# sh-style

Simple design system for CLIs and CI tools.

When you make a CLI tool, especially one that runs on CI or outputs to a log file, it can be challenging to make the output be human-readable, easy to scan at a glance, and structured enough that users can quickly find the information they need. This is especially true when color and rich formatting options are not available. This tool aims to solve all of these problems with a simple set of design elements that can be combined to create beautiful, readable output.

## Using the `log` CLI Tool

A Deno 2 CLI tool implementing the sh-style design system for plain-text CI typography.

### Installation

#### Run with Deno

```bash
deno run --allow-env main.ts title "Hello World"
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

## Architecture

```
main.ts             # CLI entrypoint, handles both modes
src/
  commands.ts       # Command types & JSONL parsing
  render.ts         # Rendering functions for all elements
  wrap.ts           # Text wrapping & formatting utilities
  cli.ts            # Argument parsing & subcommand mapping
tests/
  integration_test.ts  # E2E tests for CLI commands & JSONL rendering
  wrap_test.ts         # Unit tests for text wrapping utilities
  fixtures/            # Test fixtures
    happy.jsonl        # Example JSONL input
    happy.out          # Expected output
  example.sh           # Example usage script
```

### Implementation Details

- Built with Deno 2
- No external dependencies (except Deno std for tests)
- Implements exact ELEMENTS-SPEC.md formatting rules
- Wrapping algorithm:
  - Preserves all characters exactly
  - Prefers whitespace breaks
  - Hard-breaks long tokens if needed
  - Handles explicit newlines as forced breaks
- Exit codes: 0 (success), 1 (error)

## Testing

Run the test suite:

```bash
deno task test      # Run all tests (39 tests total)
deno test --allow-env --allow-read --allow-write --allow-run  # Run tests directly
```

**Test structure:**
- `tests/integration_test.ts` - 8 end-to-end tests for CLI commands and JSONL rendering
- `tests/wrap_test.ts` - 31 unit tests for text wrapping utilities

Test with the provided fixture:

```bash
deno run --allow-env main.ts render < tests/fixtures/happy.jsonl
```

Run the example script:

```bash
./tests/example.sh
```

## Exit Codes

- `0` - Success
- `1` - Error (unknown command, missing args, or invalid input)

## Documentation

- **ELEMENTS-SPEC.md** - Complete typography specification for all elements
- Run `log help` or `log --help` for command reference

## License

MIT (see LICENSE file in repository root)
