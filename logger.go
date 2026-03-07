package shstyle

import "fmt"

// Logger provides a structured interface for sh-style output.
type Logger struct {
	width int
}

// NewLogger creates a new logger with the specified width.
// If width is 0 or negative, it uses the DOC_WIDTH environment variable or defaults to 72.
func NewLogger(width int) *Logger {
	if width <= 0 {
		width = GetDocWidth()
	}
	return &Logger{width: width}
}

// NewLoggerFromEnv creates a logger using the DOC_WIDTH environment variable (defaults to 72).
func NewLoggerFromEnv() *Logger {
	return NewLogger(0)
}

// GetWidth returns the current width setting for this logger.
func (l *Logger) GetWidth() int {
	return l.width
}

// SetWidth updates the width setting for this logger.
func (l *Logger) SetWidth(width int) {
	if width > 0 {
		l.width = width
	}
}

// Title renders a title block with double rules.
func (l *Logger) Title(text string) {
	fmt.Print(RenderTitle(text, l.width))
}

// Phase renders a phase header with dash rules.
func (l *Logger) Phase(text string) {
	fmt.Print(RenderPhase(text, l.width))
}

// Step renders a step header with short dash rules.
func (l *Logger) Step(text string) {
	fmt.Print(RenderStep(text, l.width))
}

// Note renders a labeled note line.
func (l *Logger) Note(text string) {
	fmt.Print(RenderLabeled("NOTE", text, l.width))
}

// Why renders a labeled why line.
func (l *Logger) Why(text string) {
	fmt.Print(RenderLabeled("WHY", text, l.width))
}

// Plan renders a labeled plan line.
func (l *Logger) Plan(text string) {
	fmt.Print(RenderLabeled("PLAN", text, l.width))
}

// Ok renders a labeled ok line.
func (l *Logger) Ok(text string) {
	fmt.Print(RenderLabeled("OK", text, l.width))
}

// Done renders a labeled done line.
func (l *Logger) Done(text string) {
	fmt.Print(RenderLabeled("DONE", text, l.width))
}

// Cmd renders a command line with $ prefix.
func (l *Logger) Cmd(text string) {
	fmt.Print(RenderCmd(text, l.width))
}

// Warn renders a warning with optional detail lines.
func (l *Logger) Warn(text string, details ...string) {
	fmt.Print(RenderWarn(text, details, l.width))
}

// Error renders error lines in a box.
func (l *Logger) Error(lines ...string) {
	fmt.Print(RenderError(lines, l.width))
}

// Kv renders key-value pairs under a label.
func (l *Logger) Kv(label string, entries [][2]string) {
	fmt.Print(RenderKv(label, entries, l.width))
}

// List renders a list of items under a label.
func (l *Logger) List(label string, items []string) {
	fmt.Print(RenderList(label, items, l.width))
}

// Msg renders plain text wrapped to width with no prefix.
func (l *Logger) Msg(text string) {
	fmt.Print(RenderMsg(text, l.width))
}
