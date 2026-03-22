# AGENTS.md

Guidance for coding agents working in this repository.

## Project Snapshot

- This project is written in Go. 
- The Go library in the repo root is where all the logic for this project is written. 
- The CLI binary in `cli/` is a thin wrapper around the Go library
- The Deno wrapper in `deno/` is a thin wrapper around the CLI binary

## Quick Command Reference

- Build local binary: `make build`
  This produces all the necessary artifacts for the local environment. 
- Build all binaries: `make build-all`
  Similar to `make build` but produces all artifacts for all platforms. 
- Full tests: `IS_AGENT=true make test`
  This runs the full test suite, including root and wrapper tests, with a clean cache.

## Testing and Golden Files

This project consists of two different kinds of tests. 
1. Unit tests for the Go library. If the logic of the Go library changes, these tests should be updated.
2. Wrapper tests for the CLI and Deno wrappers. If the Elements Spec is ever updated, these tests should be updated
   to test the new expected output.