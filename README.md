# sh-style

Simple design system for CLIs and CI tools. 

When you make a CLI tool, especially one that runs on CI or outputs to a log file, it can be challenging to make the output be human-readable, easy to scan at a glance, and structured enough that users can quickly find the information they need. This is especially true when color and rich formatting options are not available. This tool aims to solve all of these problems with a simple set of design elements that can be combined to create beautiful, readable output.

## Getting started 

A well-formed program should generally follow this structure:

1) **Document Header** (TITLE)  
2) **One short intro** (NOTE / PLAN) — what this run will do  
3) **Phases** (H1 sections) in order  
4) Inside each phase: repeated **Steps** (H2 + commands + result)  
5) Optional: **Artifacts**, **Metrics**, **Debug**  
6) **Summary** + **Footer** (DONE)

### Example

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

### Enable toolchain
$ corepack enable
$ node --version
$ pnpm --version
OK: toolchain ready

### Install dependencies
$ pnpm install --frozen-lockfile
OK: dependencies installed

------------------------------------------------------------------------
## Build
------------------------------------------------------------------------
PLAN: Produce production-ready output in `dist/`.

### Compile TypeScript
$ pnpm run build
OK: build finished in 18s

### Bundle server
$ pnpm run bundle
OK: bundle created

ARTIFACTS:
  - dist/server.js
  - dist/server.js.map

------------------------------------------------------------------------
## Test
------------------------------------------------------------------------
### Unit tests
$ pnpm test
OK: unit tests passed

### Integration tests
$ pnpm run test:integration
!!! WARNING: integration tests skipped
    detail: INTEGRATION=0

------------------------------------------------------------------------
## Deploy (dry run)
------------------------------------------------------------------------
NOTE: Validate deploy commands without publishing changes.

### Validate deploy script
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

