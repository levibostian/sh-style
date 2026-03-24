package shstyle_test

import (
	"os"
	"os/exec"
	"strings"
	"testing"
)

var binaryPath string = "./log"

// runCommand executes the CLI binary with args and returns stdout.
func runCommand(t *testing.T, args ...string) string {
	t.Helper()
	cmd := exec.Command(binaryPath, args...)
	out, err := cmd.Output()
	if err != nil {
		t.Fatalf("command failed: %v", err)
	}
	return string(out)
}

// runRender executes the CLI in render mode with JSONL piped to stdin.
func runRender(t *testing.T, jsonlInput string) string {
	t.Helper()
	cmd := exec.Command(binaryPath, "render")
	cmd.Stdin = strings.NewReader(jsonlInput)
	out, err := cmd.Output()
	if err != nil {
		t.Fatalf("render command failed: %v", err)
	}
	return string(out)
}

// runCommandWithError executes the CLI and returns stdout, stderr, and exit code.
func runCommandWithError(t *testing.T, args ...string) (stdout, stderr string, code int) {
	t.Helper()
	cmd := exec.Command(binaryPath, args...)
	var stdoutBuf, stderrBuf strings.Builder
	cmd.Stdout = &stdoutBuf
	cmd.Stderr = &stderrBuf
	err := cmd.Run()
	code = 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			code = exitErr.ExitCode()
		} else {
			t.Fatalf("command execution failed: %v", err)
		}
	}
	return stdoutBuf.String(), stderrBuf.String(), code
}

// assertEqual is a test helper that compares two strings and reports differences.
func assertEqual(t *testing.T, got, want string) {
	t.Helper()
	if got != want {
		t.Errorf("output mismatch:\n--- GOT ---\n%s\n--- WANT ---\n%s", got, want)
	}
}

// assertContains checks that got contains the substring want.
func assertContains(t *testing.T, got, want string) {
	t.Helper()
	if !strings.Contains(got, want) {
		t.Errorf("expected output to contain %q, got:\n%s", want, got)
	}
}

// --- Render mode tests ---

func TestGoldenRenderFixture(t *testing.T) {
	jsonl, err := os.ReadFile("tests/fixtures/happy.jsonl")
	if err != nil {
		t.Fatalf("failed to read fixture: %v", err)
	}
	expected, err := os.ReadFile("tests/fixtures/happy.out")
	if err != nil {
		t.Fatalf("failed to read expected output: %v", err)
	}
	output := runRender(t, string(jsonl))
	assertEqual(t, output, string(expected))
}

func TestRenderModeWithJSONL(t *testing.T) {
	testJsonl := strings.Join([]string{
		`{"command":"title","lines":["Test Pipeline"]}`,
		`{"command":"phase","lines":["Build"]}`,
		`{"command":"ok","lines":["completed"]}`,
	}, "\n")

	output := runRender(t, testJsonl)

	expected := strings.Join([]string{
		"========================================================================",
		"                             Test Pipeline",
		"========================================================================",
		" ",
		"------------------------------------------------------------------------",
		"## Build",
		"------------------------------------------------------------------------",
		" ",
		"OK: completed",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestRenderModeEmptyLinesSkipped(t *testing.T) {
	testJsonl := strings.Join([]string{
		`{"command":"title","lines":["Test"]}`,
		" ",
		"   ",
		`{"command":"ok","lines":["done"]}`,
	}, "\n")

	output := runRender(t, testJsonl)

	expected := strings.Join([]string{
		"========================================================================",
		"                                  Test",
		"========================================================================",
		" ",
		"OK: done",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestRenderModeInvalidJSONIgnored(t *testing.T) {
	testJsonl := strings.Join([]string{
		`{"command":"title","lines":["Valid"]}`,
		"not-valid-json",
		`{"command":"ok","lines":["done"]}`,
	}, "\n")

	output := runRender(t, testJsonl)

	expected := strings.Join([]string{
		"========================================================================",
		"                                 Valid",
		"========================================================================",
		" ",
		"OK: done",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestRenderModeMissingFieldsIgnored(t *testing.T) {
	testJsonl := strings.Join([]string{
		`{"command":"title","lines":["Valid"]}`,
		`{"command":"phase"}`,
		`{"lines":["text"]}`,
		`{"command":"ok","lines":[]}`,
		`{"command":"step","lines":["Valid Step"]}`,
	}, "\n")

	output := runRender(t, testJsonl)

	expected := strings.Join([]string{
		"========================================================================",
		"                                 Valid",
		"========================================================================",
		" ",
		"----------",
		"### Valid Step",
		"----------",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestRenderModeNonStringLinesIgnored(t *testing.T) {
	testJsonl := strings.Join([]string{
		`{"command":"title","lines":["Valid"]}`,
		`{"command":"error","lines":["line1", 123, "line3"]}`,
		`{"command":"ok","lines":["done"]}`,
	}, "\n")

	output := runRender(t, testJsonl)

	expected := strings.Join([]string{
		"========================================================================",
		"                                 Valid",
		"========================================================================",
		" ",
		"OK: done",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestRenderModeUnknownCommandIgnored(t *testing.T) {
	testJsonl := strings.Join([]string{
		`{"command":"title","lines":["Valid"]}`,
		`{"command":"unknown-type","lines":["text"]}`,
		`{"command":"ok","lines":["done"]}`,
	}, "\n")

	output := runRender(t, testJsonl)

	expected := strings.Join([]string{
		"========================================================================",
		"                                 Valid",
		"========================================================================",
		" ",
		"OK: done",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestRenderModeWarnWithDetails(t *testing.T) {
	testJsonl := `{"command":"warn","lines":["Warning message","detail 1","detail 2"]}`
	output := runRender(t, testJsonl)

	expected := strings.Join([]string{
		"!!! WARNING: Warning message",
		"    detail 1",
		"    detail 2",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestRenderModeWarnWithoutDetails(t *testing.T) {
	testJsonl := `{"command":"warn","lines":["Warning message"]}`
	output := runRender(t, testJsonl)

	expected := strings.Join([]string{
		"!!! WARNING: Warning message",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestRenderModeKvInvalidPairsSkipped(t *testing.T) {
	testJsonl := `{"command":"kv","lines":["LABEL","key1: value1","invalid-no-colon","key2: value2"]}`
	output := runRender(t, testJsonl)

	expected := strings.Join([]string{
		"LABEL:",
		"  key1: value1",
		"  key2: value2",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestRenderModeList(t *testing.T) {
	testJsonl := `{"command":"list","lines":["FILES","main.ts","lib.ts","test.ts"]}`
	output := runRender(t, testJsonl)

	expected := strings.Join([]string{
		"FILES:",
		"  - main.ts",
		"  - lib.ts",
		"  - test.ts",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestRenderModeAllLabeledCommands(t *testing.T) {
	testJsonl := strings.Join([]string{
		`{"command":"note","lines":["Note text"]}`,
		`{"command":"why","lines":["Why text"]}`,
		`{"command":"plan","lines":["Plan text"]}`,
		`{"command":"done","lines":["Done text"]}`,
	}, "\n")

	output := runRender(t, testJsonl)

	expected := strings.Join([]string{
		"NOTE: Note text",
		" ",
		"WHY: Why text",
		" ",
		"PLAN: Plan text",
		" ",
		"DONE: Done text",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestRenderModeCmd(t *testing.T) {
	testJsonl := `{"command":"cmd","lines":["npm test"]}`
	output := runRender(t, testJsonl)
	assertEqual(t, output, "  $ npm test\n")
}

func TestRenderModeError(t *testing.T) {
	testJsonl := `{"command":"error","lines":["Failed","Reason 1","Reason 2"]}`
	output := runRender(t, testJsonl)

	expected := strings.Join([]string{
		"+----------------------------------------------------------------------+",
		"| ERROR: Failed                                                        |",
		"| Reason 1                                                             |",
		"| Reason 2                                                             |",
		"+----------------------------------------------------------------------+",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

// --- Individual CLI command tests ---

func TestCLITitle(t *testing.T) {
	output := runCommand(t, "title", "Test Title")
	expected := strings.Join([]string{
		"========================================================================",
		"                               Test Title",
		"========================================================================",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestCLIPhase(t *testing.T) {
	output := runCommand(t, "phase", "Setup Phase")
	expected := strings.Join([]string{
		"------------------------------------------------------------------------",
		"## Setup Phase",
		"------------------------------------------------------------------------",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestCLIStep(t *testing.T) {
	output := runCommand(t, "step", "Install dependencies")
	expected := strings.Join([]string{
		"----------",
		"### Install dependencies",
		"----------",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestCLICmd(t *testing.T) {
	output := runCommand(t, "cmd", "npm install")
	assertEqual(t, output, "  $ npm install\n")
}

func TestCLIOk(t *testing.T) {
	output := runCommand(t, "ok", "build completed")
	assertEqual(t, output, "OK: build completed\n \n")
}

func TestCLINote(t *testing.T) {
	output := runCommand(t, "note", "Starting build process")
	assertEqual(t, output, "NOTE: Starting build process\n \n")
}

func TestCLIWarnWithDetails(t *testing.T) {
	output := runCommand(t, "warn", "tests skipped", "--detail", "SKIP_TESTS=1")
	expected := strings.Join([]string{
		"!!! WARNING: tests skipped",
		"    SKIP_TESTS=1",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestCLIErrorMultipleLines(t *testing.T) {
	output := runCommand(t, "error", "Failed to deploy", "Connection timeout", "Retry limit exceeded")
	expected := strings.Join([]string{
		"+----------------------------------------------------------------------+",
		"| ERROR: Failed to deploy                                              |",
		"| Connection timeout                                                   |",
		"| Retry limit exceeded                                                 |",
		"+----------------------------------------------------------------------+",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestCLIKv(t *testing.T) {
	output := runCommand(t, "kv", "ENV", "node=20.11.1", "os=ubuntu-22.04")
	expected := strings.Join([]string{
		"ENV:",
		"  node: 20.11.1",
		"  os: ubuntu-22.04",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestCLIList(t *testing.T) {
	output := runCommand(t, "list", "FILES", "main.ts", "lib.ts", "test.ts")
	expected := strings.Join([]string{
		"FILES:",
		"  - main.ts",
		"  - lib.ts",
		"  - test.ts",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestCLIWhy(t *testing.T) {
	output := runCommand(t, "why", "Need to validate input")
	assertEqual(t, output, "WHY: Need to validate input\n \n")
}

func TestCLIPlan(t *testing.T) {
	output := runCommand(t, "plan", "Deploy to staging first")
	assertEqual(t, output, "PLAN: Deploy to staging first\n \n")
}

func TestCLIDone(t *testing.T) {
	output := runCommand(t, "done", "Migration completed")
	assertEqual(t, output, "DONE: Migration completed\n \n")
}

func TestCLIWarnWithoutDetails(t *testing.T) {
	output := runCommand(t, "warn", "Deprecation warning")
	expected := strings.Join([]string{
		"!!! WARNING: Deprecation warning",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestCLIWarnMultipleDetails(t *testing.T) {
	output := runCommand(t, "warn", "Configuration issues", "--detail", "Missing API key", "--detail", "Invalid timeout")
	expected := strings.Join([]string{
		"!!! WARNING: Configuration issues",
		"    Missing API key",
		"    Invalid timeout",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestCLIErrorSingleLine(t *testing.T) {
	output := runCommand(t, "error", "Build failed")
	expected := strings.Join([]string{
		"+----------------------------------------------------------------------+",
		"| ERROR: Build failed                                                  |",
		"+----------------------------------------------------------------------+",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestCLIKvEmptyValue(t *testing.T) {
	output := runCommand(t, "kv", "CONFIG", "key=")
	expected := strings.Join([]string{
		"CONFIG:",
		"  key: ",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestCLIKvValueContainingEquals(t *testing.T) {
	output := runCommand(t, "kv", "VARS", "equation=x=y+1")
	expected := strings.Join([]string{
		"VARS:",
		"  equation: x=y+1",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

func TestCLIListNoItems(t *testing.T) {
	output := runCommand(t, "list", "EMPTY")
	assertEqual(t, output, "EMPTY:\n \n")
}

func TestCLIListSingleItem(t *testing.T) {
	output := runCommand(t, "list", "SINGLE", "item.txt")
	expected := strings.Join([]string{
		"SINGLE:",
		"  - item.txt",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}

// --- CLI error handling tests ---

func TestCLINoArgsShowsHelp(t *testing.T) {
	stdout, _, code := runCommandWithError(t)
	if code != 0 {
		t.Errorf("expected exit code 0, got %d", code)
	}
	assertContains(t, stdout, "log - Plain-text CI typography tool")
	assertContains(t, stdout, "USAGE:")
	assertContains(t, stdout, "COMMANDS:")
}

func TestCLIHelpFlagShowsHelp(t *testing.T) {
	stdout, _, code := runCommandWithError(t, "help")
	if code != 0 {
		t.Errorf("expected exit code 0, got %d", code)
	}
	assertContains(t, stdout, "log - Plain-text CI typography tool")
	assertContains(t, stdout, "EXAMPLES:")
}

func TestCLIDashDashHelpShowsHelp(t *testing.T) {
	stdout, _, code := runCommandWithError(t, "--help")
	if code != 0 {
		t.Errorf("expected exit code 0, got %d", code)
	}
	assertContains(t, stdout, "log - Plain-text CI typography tool")
}

func TestCLIDashHShowsHelp(t *testing.T) {
	stdout, _, code := runCommandWithError(t, "-h")
	if code != 0 {
		t.Errorf("expected exit code 0, got %d", code)
	}
	assertContains(t, stdout, "log - Plain-text CI typography tool")
}

func TestCLIUnknownCommand(t *testing.T) {
	_, stderr, code := runCommandWithError(t, "invalid-command")
	if code != 1 {
		t.Errorf("expected exit code 1, got %d", code)
	}
	assertContains(t, stderr, "Unknown command: invalid-command")
	assertContains(t, stderr, `Run "log help" for usage information`)
}

func TestCLIWarnWithoutMessage(t *testing.T) {
	_, stderr, code := runCommandWithError(t, "warn")
	if code != 1 {
		t.Errorf("expected exit code 1, got %d", code)
	}
	assertContains(t, stderr, "Error: warn command requires a message")
}

func TestCLIWarnOnlyDetailFlags(t *testing.T) {
	_, stderr, code := runCommandWithError(t, "warn", "--detail", "some detail")
	if code != 1 {
		t.Errorf("expected exit code 1, got %d", code)
	}
	assertContains(t, stderr, "Error: warn command requires a message")
}

func TestCLIWarnDetailWithoutArgument(t *testing.T) {
	_, stderr, code := runCommandWithError(t, "warn", "message", "--detail")
	if code != 1 {
		t.Errorf("expected exit code 1, got %d", code)
	}
	assertContains(t, stderr, "Error: --detail flag requires an argument")
}

func TestCLIErrorWithoutLines(t *testing.T) {
	_, stderr, code := runCommandWithError(t, "error")
	if code != 1 {
		t.Errorf("expected exit code 1, got %d", code)
	}
	assertContains(t, stderr, "Error: error command requires at least one line")
}

func TestCLIKvWithoutLabel(t *testing.T) {
	_, stderr, code := runCommandWithError(t, "kv")
	if code != 1 {
		t.Errorf("expected exit code 1, got %d", code)
	}
	assertContains(t, stderr, "Error: kv command requires a label")
}

func TestCLIKvInvalidPairNoEquals(t *testing.T) {
	_, stderr, code := runCommandWithError(t, "kv", "LABEL", "invalid-pair")
	if code != 1 {
		t.Errorf("expected exit code 1, got %d", code)
	}
	assertContains(t, stderr, "Error: invalid key=value pair: invalid-pair")
}

func TestCLIKvInvalidPairEqualsAtStart(t *testing.T) {
	_, stderr, code := runCommandWithError(t, "kv", "LABEL", "=value")
	if code != 1 {
		t.Errorf("expected exit code 1, got %d", code)
	}
	assertContains(t, stderr, "Error: invalid key=value pair: =value")
}

func TestCLIListWithoutLabel(t *testing.T) {
	_, stderr, code := runCommandWithError(t, "list")
	if code != 1 {
		t.Errorf("expected exit code 1, got %d", code)
	}
	assertContains(t, stderr, "Error: list command requires a label")
}

func TestCLIMsg(t *testing.T) {
	output := runCommand(t, "msg", "Hello, world!")
	assertEqual(t, output, "Hello, world!\n \n")
}

func TestCLIMsgMultiWord(t *testing.T) {
	output := runCommand(t, "msg", "This", "is", "a", "plain", "message.")
	assertEqual(t, output, "This is a plain message.\n \n")
}

func TestRenderModeMsg(t *testing.T) {
	testJsonl := `{"command":"msg","lines":["Plain paragraph text."]}`
	output := runRender(t, testJsonl)
	assertEqual(t, output, "Plain paragraph text.\n \n")
}

func TestRenderModeMsgWraps(t *testing.T) {
	// A message that exceeds 72 chars should wrap
	testJsonl := `{"command":"msg","lines":["This is a fairly long plain message that should wrap because it exceeds the configured width of seventy-two characters."]}`
	output := runRender(t, testJsonl)
	expected := strings.Join([]string{
		"This is a fairly long plain message that should wrap because it exceeds",
		"the configured width of seventy-two characters.",
		" ",
		"",
	}, "\n")
	assertEqual(t, output, expected)
}
