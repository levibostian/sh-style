# Wrapper Testing Framework

This directory contains a comprehensive testing framework for verifying that the CLI and all language wrappers (Go, Deno) produce identical output.

## Overview

The testing framework follows a single-source-of-truth approach:

1. **Expected Output** (`expected-output.txt`) - A single file containing the expected stdout for all wrappers
2. **Test Scripts** (`scripts/`) - One script per wrapper that generates output
3. **Test Runner** (`wrapper_test.go`) - Go tests that run each script and compare output

## Files

- `expected-output.txt` - The single source of truth for expected output
- `wrapper_test.go` - Go test file with test functions for each wrapper
- `scripts/test-cli.sh` - Bash script that exercises all CLI commands
- `scripts/test-deno.ts` - Deno/TypeScript script that exercises the Deno library
- `scripts/test-go.go` - Go program that exercises the Go library

## Running Tests

Run all wrapper tests:
```bash
go test -v ./tests/
```

Run individual tests:
```bash
go test -v -run TestCLIWrapper ./tests/
go test -v -run TestDenoWrapper ./tests/
go test -v -run TestGoWrapper ./tests/
```

## How It Works

Each test:
1. Builds necessary binaries (log CLI, Go test program)
2. Executes the appropriate test script from `scripts/`
3. Captures stdout
4. Compares it byte-for-byte with `expected-output.txt`
5. Reports any differences

The Deno test automatically skips if Deno is not installed.

## Adding New Features

When adding new commands or features:

1. Update all three test scripts in `scripts/` to include the new feature
2. Run the CLI test script to generate new output: `bash tests/scripts/test-cli.sh ./log > /tmp/new-output.txt`
3. Review the output and update `expected-output.txt` if correct
4. Run tests to verify all wrappers produce identical output: `go test -v ./tests/`

## Design Philosophy

This testing approach ensures:
- **Consistency**: All wrappers produce identical output
- **Maintainability**: One expected output file to update
- **Simplicity**: Test scripts are just sequences of function calls
- **Scalability**: Easy to add new language wrappers

## Adding a New Language Wrapper

To add a new language wrapper (e.g., Python, Ruby):

1. Create `scripts/test-<language>.<ext>` that calls all library functions in the same order
2. Add a new test function to `wrapper_test.go`:
   ```go
   func TestPythonWrapper(t *testing.T) {
       cmd := exec.Command("python", "scripts/test-python.py")
       output, err := cmd.Output()
       // ... compare with expectedOutput
   }
   ```
3. Run tests to verify output matches: `go test -v ./tests/`

That's it! The framework will automatically verify your new wrapper produces identical output.
