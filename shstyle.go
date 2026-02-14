// Package shstyle provides a plain-text design system for CLI and CI output.
//
// This package wraps the sh-style rendering functions for direct use in Go programs.
// It provides both a Logger interface for structured logging and standalone functions
// for quick one-off formatting.
//
// Example usage:
//
//	import "github.com/levibostian/sh-style"
//
//	// Using the Logger interface
//	logger := shstyle.NewLogger(72)
//	logger.Title("My Application")
//	logger.Phase("Building project")
//	logger.Step("Installing dependencies")
//
//	// Using standalone functions
//	shstyle.Title("Quick Title")
//	shstyle.Note("This is a note")
package shstyle

import (
	"fmt"
	"os"
	"strconv"
)

// ----------------------------------------------------------------------------
// Standalone convenience functions
// ----------------------------------------------------------------------------

// getDefaultWidth returns the width from DOC_WIDTH env var or 72.
func getDefaultWidth() int {
	if width := os.Getenv("DOC_WIDTH"); width != "" {
		if w, err := strconv.Atoi(width); err == nil && w > 0 {
			return w
		}
	}
	return 72
}

// Title renders a title block with the default width.
func Title(text string) {
	fmt.Print(RenderTitle(text, getDefaultWidth()))
}

// TitleWithWidth renders a title block with the specified width.
func TitleWithWidth(text string, width int) {
	fmt.Print(RenderTitle(text, width))
}

// Phase renders a phase header with the default width.
func Phase(text string) {
	fmt.Print(RenderPhase(text, getDefaultWidth()))
}

// PhaseWithWidth renders a phase header with the specified width.
func PhaseWithWidth(text string, width int) {
	fmt.Print(RenderPhase(text, width))
}

// Step renders a step header with the default width.
func Step(text string) {
	fmt.Print(RenderStep(text, getDefaultWidth()))
}

// StepWithWidth renders a step header with the specified width.
func StepWithWidth(text string, width int) {
	fmt.Print(RenderStep(text, width))
}

// Note renders a labeled note line with the default width.
func Note(text string) {
	fmt.Print(RenderLabeled("NOTE", text, getDefaultWidth()))
}

// NoteWithWidth renders a labeled note line with the specified width.
func NoteWithWidth(text string, width int) {
	fmt.Print(RenderLabeled("NOTE", text, width))
}

// Why renders a labeled why line with the default width.
func Why(text string) {
	fmt.Print(RenderLabeled("WHY", text, getDefaultWidth()))
}

// WhyWithWidth renders a labeled why line with the specified width.
func WhyWithWidth(text string, width int) {
	fmt.Print(RenderLabeled("WHY", text, width))
}

// Plan renders a labeled plan line with the default width.
func Plan(text string) {
	fmt.Print(RenderLabeled("PLAN", text, getDefaultWidth()))
}

// PlanWithWidth renders a labeled plan line with the specified width.
func PlanWithWidth(text string, width int) {
	fmt.Print(RenderLabeled("PLAN", text, width))
}

// Ok renders a labeled ok line with the default width.
func Ok(text string) {
	fmt.Print(RenderLabeled("OK", text, getDefaultWidth()))
}

// OkWithWidth renders a labeled ok line with the specified width.
func OkWithWidth(text string, width int) {
	fmt.Print(RenderLabeled("OK", text, width))
}

// Done renders a labeled done line with the default width.
func Done(text string) {
	fmt.Print(RenderLabeled("DONE", text, getDefaultWidth()))
}

// DoneWithWidth renders a labeled done line with the specified width.
func DoneWithWidth(text string, width int) {
	fmt.Print(RenderLabeled("DONE", text, width))
}

// Cmd renders a command line with $ prefix and the default width.
func Cmd(text string) {
	fmt.Print(RenderCmd(text, getDefaultWidth()))
}

// CmdWithWidth renders a command line with $ prefix and the specified width.
func CmdWithWidth(text string, width int) {
	fmt.Print(RenderCmd(text, width))
}

// Warn renders a warning with optional detail lines and the default width.
func Warn(text string, details ...string) {
	fmt.Print(RenderWarn(text, details, getDefaultWidth()))
}

// WarnWithWidth renders a warning with optional detail lines and the specified width.
func WarnWithWidth(text string, width int, details ...string) {
	fmt.Print(RenderWarn(text, details, width))
}

// Error renders error lines in a box with the default width.
func Error(lines ...string) {
	fmt.Print(RenderError(lines, getDefaultWidth()))
}

// ErrorWithWidth renders error lines in a box with the specified width.
func ErrorWithWidth(lines []string, width int) {
	fmt.Print(RenderError(lines, width))
}

// Kv renders key-value pairs under a label with the default width.
func Kv(label string, entries [][2]string) {
	fmt.Print(RenderKv(label, entries, getDefaultWidth()))
}

// KvWithWidth renders key-value pairs under a label with the specified width.
func KvWithWidth(label string, entries [][2]string, width int) {
	fmt.Print(RenderKv(label, entries, width))
}

// List renders a list of items under a label with the default width.
func List(label string, items []string) {
	fmt.Print(RenderList(label, items, getDefaultWidth()))
}

// ListWithWidth renders a list of items under a label with the specified width.
func ListWithWidth(label string, items []string, width int) {
	fmt.Print(RenderList(label, items, width))
}
