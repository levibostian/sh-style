package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	shstyle "github.com/levibostian/sh-style"
)

// Command represents a parsed CLI command.
type Command struct {
	Type    string
	Text    string
	Details []string    // warn only
	Lines   []string    // error only
	Label   string      // kv/list
	Entries [][2]string // kv only
	Items   []string    // list only
}

// jsonCommand is the raw JSONL input structure.
type jsonCommand struct {
	Command string        `json:"command"`
	Lines   []interface{} `json:"lines"`
}

// ParseCommand parses a JSONL line into a Command.
// Returns nil if the input is invalid or the command is unknown.
func ParseCommand(jsonStr string) *Command {
	var raw json.RawMessage
	if err := json.Unmarshal([]byte(jsonStr), &raw); err != nil {
		return nil
	}

	// Must be an object, not array/string/number/etc
	var obj map[string]interface{}
	if err := json.Unmarshal(raw, &obj); err != nil {
		return nil
	}

	// command must be a string
	cmdVal, ok := obj["command"]
	if !ok {
		return nil
	}
	cmdStr, ok := cmdVal.(string)
	if !ok {
		return nil
	}

	// lines must be an array
	linesVal, ok := obj["lines"]
	if !ok {
		return nil
	}
	linesArr, ok := linesVal.([]interface{})
	if !ok {
		return nil
	}
	if len(linesArr) == 0 {
		return nil
	}

	// All lines must be strings
	var lines []string
	for _, l := range linesArr {
		s, ok := l.(string)
		if !ok {
			return nil
		}
		lines = append(lines, s)
	}

	switch cmdStr {
	case "title", "phase", "step", "note", "why", "plan", "ok", "done", "cmd", "msg":
		return &Command{Type: cmdStr, Text: lines[0]}
	case "warn":
		cmd := &Command{Type: "warn", Text: lines[0]}
		if len(lines) > 1 {
			cmd.Details = lines[1:]
		}
		return cmd
	case "error":
		return &Command{Type: "error", Lines: lines}
	case "list":
		return &Command{Type: "list", Label: lines[0], Items: lines[1:]}
	case "kv":
		cmd := &Command{Type: "kv", Label: lines[0]}
		for _, line := range lines[1:] {
			idx := strings.Index(line, ":")
			if idx < 0 {
				continue // skip invalid entries (no colon)
			}
			key := strings.TrimSpace(line[:idx])
			value := strings.TrimSpace(line[idx+1:])
			cmd.Entries = append(cmd.Entries, [2]string{key, value})
		}
		return cmd
	default:
		return nil
	}
}

// RenderCommand dispatches rendering for any command type.
func RenderCommand(cmd *Command, width int) string {
	switch cmd.Type {
	case "title":
		return shstyle.RenderTitle(cmd.Text, width)
	case "phase":
		return shstyle.RenderPhase(cmd.Text, width)
	case "step":
		return shstyle.RenderStep(cmd.Text, width)
	case "note":
		return shstyle.RenderLabeled("NOTE", cmd.Text, width)
	case "why":
		return shstyle.RenderLabeled("WHY", cmd.Text, width)
	case "plan":
		return shstyle.RenderLabeled("PLAN", cmd.Text, width)
	case "ok":
		return shstyle.RenderLabeled("OK", cmd.Text, width)
	case "done":
		return shstyle.RenderLabeled("DONE", cmd.Text, width)
	case "cmd":
		return shstyle.RenderCmd(cmd.Text, width)
	case "warn":
		return shstyle.RenderWarn(cmd.Text, cmd.Details, width)
	case "error":
		return shstyle.RenderError(cmd.Lines, width)
	case "kv":
		return shstyle.RenderKv(cmd.Label, cmd.Entries, width)
	case "list":
		return shstyle.RenderList(cmd.Label, cmd.Items, width)
	case "msg":
		return shstyle.RenderMsg(cmd.Text, width)
	default:
		return ""
	}
}

// ParseArgs parses CLI arguments and returns a Command.
// It handles help output and exits directly for help/unknown commands.
func ParseArgs(args []string) *Command {
	if len(args) == 0 {
		PrintHelp()
		os.Exit(0)
	}

	command := args[0]
	rest := args[1:]

	switch command {
	case "help", "--help", "-h":
		PrintHelp()
		os.Exit(0)
	case "render":
		// Signal to main that render mode should be used
		return &Command{Type: "render"}
	case "title", "phase", "step", "note", "why", "plan", "ok", "done", "cmd", "msg":
		return &Command{Type: command, Text: strings.Join(rest, " ")}
	case "warn":
		return parseWarn(rest)
	case "error":
		return parseError(rest)
	case "kv":
		return parseKv(rest)
	case "list":
		return parseList(rest)
	default:
		fmt.Fprintf(os.Stderr, "Unknown command: %s\n", command)
		fmt.Fprintln(os.Stderr, "Run \"log help\" for usage information.")
		os.Exit(1)
	}
	return nil
}

func parseWarn(args []string) *Command {
	var textParts []string
	var details []string

	for i := 0; i < len(args); i++ {
		if args[i] == "--detail" {
			if i+1 >= len(args) {
				fmt.Fprintln(os.Stderr, "Error: --detail flag requires an argument")
				os.Exit(1)
			}
			i++
			details = append(details, args[i])
		} else {
			textParts = append(textParts, args[i])
		}
	}

	text := strings.Join(textParts, " ")
	if text == "" {
		fmt.Fprintln(os.Stderr, "Error: warn command requires a message")
		os.Exit(1)
	}

	cmd := &Command{Type: "warn", Text: text}
	if len(details) > 0 {
		cmd.Details = details
	}
	return cmd
}

func parseError(args []string) *Command {
	if len(args) == 0 {
		fmt.Fprintln(os.Stderr, "Error: error command requires at least one line")
		os.Exit(1)
	}
	return &Command{Type: "error", Lines: args}
}

func parseKv(args []string) *Command {
	if len(args) < 1 {
		fmt.Fprintln(os.Stderr, "Error: kv command requires a label")
		os.Exit(1)
	}

	label := args[0]
	var entries [][2]string

	for _, arg := range args[1:] {
		idx := strings.Index(arg, "=")
		if idx < 0 || idx == 0 {
			fmt.Fprintf(os.Stderr, "Error: invalid key=value pair: %s\n", arg)
			os.Exit(1)
		}
		key := arg[:idx]
		value := arg[idx+1:]
		entries = append(entries, [2]string{key, value})
	}

	return &Command{Type: "kv", Label: label, Entries: entries}
}

func parseList(args []string) *Command {
	if len(args) < 1 {
		fmt.Fprintln(os.Stderr, "Error: list command requires a label")
		os.Exit(1)
	}

	return &Command{Type: "list", Label: args[0], Items: args[1:]}
}

// PrintHelp prints the CLI help text to stdout.
func PrintHelp() {
	help := `log - Plain-text CI typography tool

USAGE:
  log <command> [arguments]

COMMANDS:
  title <text>                     Top-level banner
  phase <text>                     Major section heading
  step  <text>                     Sub-section heading
  msg   <text>                     Plain paragraph (no prefix)
  note  <text>                     Informational note (NOTE: prefix)
  why   <text>                     Rationale note (WHY: prefix)
  plan  <text>                     Plan note (PLAN: prefix)
  ok    <text>                     Success note (OK: prefix)
  done  <text>                     Completion note (DONE: prefix)
  cmd   <text>                     Command echo ($ prefix)
  warn  <text> [--detail <text>]   Warning with optional details
  error <line> [<line> ...]        Error box (multi-line)
  kv    <label> [key=value ...]    Key-value pairs
  list  <label> [item ...]         Bullet list
  render                           Render JSONL from stdin
  help                             Show this help

ENVIRONMENT:
  DOC_WIDTH    Output width (default: 72, minimum: 40)

EXAMPLES:
  log title "Deploy Pipeline"
  log phase "Build"
  log msg "This is a plain paragraph with no prefix."
  log cmd "npm install"
  log ok "build complete"
  log warn "flaky test" --detail "test_login timed out"
  log error "build failed" "exit code 1"
  log kv ENV node=20.11.1 pnpm=9.1.0
  log list ARTIFACTS dist/app.js dist/app.css
  cat build.jsonl | log render`
	fmt.Println(help)
}
