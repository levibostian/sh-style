package tests

import (
	"os"
	"os/exec"
	"testing"
)

var (
	expectedOutput []byte
)

// TestMain runs once before all tests to set up shared resources
func TestMain(m *testing.M) {
	var err error

	// Read the expected output file once
	expectedOutput, err = os.ReadFile("expected-output.txt")
	if err != nil {
		panic("failed to read expected-output.txt: " + err.Error())
	}

	// Run all tests
	code := m.Run()

	// Cleanup
	os.Exit(code)
}

// TestCLIWrapper tests that the CLI wrapper produces expected output
func TestCLIWrapper(t *testing.T) {
	cmd := exec.Command("bash", "scripts/test-cli.sh", "../log")
	output, err := cmd.Output()
	if err != nil {
		t.Fatalf("test-cli.sh failed: %v", err)
	}

	if string(output) != string(expectedOutput) {
		t.Errorf("CLI wrapper output does not match expected-output.txt")
		t.Logf("Expected length: %d bytes", len(expectedOutput))
		t.Logf("Got length: %d bytes", len(output))

		// Show first difference
		minLen := len(output)
		if len(expectedOutput) < minLen {
			minLen = len(expectedOutput)
		}
		for i := 0; i < minLen; i++ {
			if output[i] != expectedOutput[i] {
				t.Logf("First difference at byte %d:", i)
				t.Logf("  Expected: %q", expectedOutput[max(0, i-20):min(len(expectedOutput), i+20)])
				t.Logf("  Got:      %q", output[max(0, i-20):min(len(output), i+20)])
				break
			}
		}
	}
}

// TestGoWrapper tests that the Go wrapper produces expected output
func TestGoWrapper(t *testing.T) {
	cmd := exec.Command("go", "run", "scripts/test-go.go")
	output, err := cmd.Output()
	if err != nil {
		t.Fatalf("test-go.go failed: %v", err)
	}

	if string(output) != string(expectedOutput) {
		t.Errorf("Go wrapper output does not match expected-output.txt")
		t.Logf("Expected length: %d bytes", len(expectedOutput))
		t.Logf("Got length: %d bytes", len(output))

		// Show first difference
		minLen := len(output)
		if len(expectedOutput) < minLen {
			minLen = len(expectedOutput)
		}
		for i := 0; i < minLen; i++ {
			if output[i] != expectedOutput[i] {
				t.Logf("First difference at byte %d:", i)
				t.Logf("  Expected: %q", expectedOutput[max(0, i-20):min(len(expectedOutput), i+20)])
				t.Logf("  Got:      %q", output[max(0, i-20):min(len(output), i+20)])
				break
			}
		}
	}
}

// TestDenoWrapper tests that the Deno wrapper produces expected output
func TestDenoWrapper(t *testing.T) {
	cmd := exec.Command("deno", "run", "--allow-all", "--config=../deno/deno.json", "scripts/test-deno.ts")
	output, err := cmd.Output()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			t.Fatalf("test-deno.ts failed: %v\nStderr: %s", err, exitErr.Stderr)
		}
		t.Fatalf("test-deno.ts failed: %v", err)
	}

	if string(output) != string(expectedOutput) {
		t.Errorf("Deno wrapper output does not match expected-output.txt")
		t.Logf("Expected length: %d bytes", len(expectedOutput))
		t.Logf("Got length: %d bytes", len(output))

		// Show first difference
		minLen := len(output)
		if len(expectedOutput) < minLen {
			minLen = len(expectedOutput)
		}
		for i := 0; i < minLen; i++ {
			if output[i] != expectedOutput[i] {
				t.Logf("First difference at byte %d:", i)
				t.Logf("  Expected: %q", expectedOutput[max(0, i-20):min(len(expectedOutput), i+20)])
				t.Logf("  Got:      %q", output[max(0, i-20):min(len(output), i+20)])
				break
			}
		}
	}
}
