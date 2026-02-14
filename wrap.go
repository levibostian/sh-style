package shstyle

import (
	"errors"
	"math"
	"os"
	"strconv"
	"strings"
	"unicode/utf8"
)

const DefaultWidth = 72

// GetDocWidth reads DOC_WIDTH from the environment.
// Returns DefaultWidth if not set, not a valid integer, or < 40.
func GetDocWidth() int {
	envWidth := os.Getenv("DOC_WIDTH")
	if envWidth == "" {
		return DefaultWidth
	}
	width, err := strconv.Atoi(envWidth)
	if err != nil || width <= 0 || width < 40 {
		return DefaultWidth
	}
	return width
}

// WrapPreserve wraps text to the given width, preserving explicit newlines.
// Returns a slice of lines, each no longer than width characters.
func WrapPreserve(text string, width int) ([]string, error) {
	if width <= 0 {
		return nil, errors.New("Width must be positive")
	}
	if text == "" {
		return []string{""}, nil
	}
	segments := strings.Split(text, "\n")
	var result []string
	for _, segment := range segments {
		if segment == "" {
			result = append(result, "")
		} else {
			wrapped := wrapSegment(segment, width)
			result = append(result, wrapped...)
		}
	}
	return result, nil
}

// runeLen returns the number of runes (characters) in a string.
func runeLen(s string) int {
	return utf8.RuneCountInString(s)
}

// runeAt returns the rune at a given character index.
func runeAt(s string, idx int) rune {
	for i, r := range s {
		_ = i
		if idx == 0 {
			return r
		}
		idx--
	}
	return 0
}

// runeSlice returns a substring from character index start to end (exclusive).
func runeSlice(s string, start, end int) string {
	runes := []rune(s)
	if end > len(runes) {
		end = len(runes)
	}
	return string(runes[start:end])
}

// runeSliceFrom returns a substring from character index start to end of string.
func runeSliceFrom(s string, start int) string {
	runes := []rune(s)
	if start >= len(runes) {
		return ""
	}
	return string(runes[start:])
}

// wrapSegment wraps a single segment (no embedded newlines) to the given width (in characters).
func wrapSegment(segment string, width int) []string {
	var lines []string
	remaining := segment
	for runeLen(remaining) > 0 {
		rLen := runeLen(remaining)
		if rLen < width {
			lines = append(lines, remaining)
			break
		}
		if rLen == width {
			lines = append(lines, remaining)
			break
		}
		// Over width - need to break
		breakAt := width
		foundSpace := false

		// Check if the character at position [width] is a space/tab
		ch := runeAt(remaining, width)
		if ch == ' ' || ch == '\t' {
			foundSpace = true
			// breakAt stays at width
		} else {
			// Scan backwards for a space/tab
			for i := width - 1; i >= 1; i-- {
				ch := runeAt(remaining, i)
				if ch == ' ' || ch == '\t' {
					breakAt = i
					foundSpace = true
					break
				}
			}
		}

		lines = append(lines, runeSlice(remaining, 0, breakAt))
		if foundSpace {
			// Skip the breaking whitespace character
			remaining = runeSliceFrom(remaining, breakAt+1)
		} else {
			// Hard break - no space found
			remaining = runeSliceFrom(remaining, breakAt)
		}
	}
	return lines
}

// CenterLine centers a line within the given width using left padding.
func CenterLine(line string, width int) string {
	lineLen := runeLen(line)
	if lineLen >= width {
		return line
	}
	leftPad := int(math.Floor(float64(width-lineLen) / 2.0))
	return strings.Repeat(" ", leftPad) + line
}

// Rule creates a horizontal rule by repeating a character to the given width.
func Rule(ch string, width int) string {
	return strings.Repeat(ch, width)
}

// PadRight pads a line with spaces on the right to the given width.
func PadRight(line string, width int) string {
	lineLen := runeLen(line)
	if lineLen >= width {
		return line
	}
	return line + strings.Repeat(" ", width-lineLen)
}
