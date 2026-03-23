package shstyle

import (
	"errors"
	"strings"
)

// RenderTitle renders a title block with double rules.
func RenderTitle(text string, width int) string {
	lines, _ := WrapPreserve(text, width)
	var parts []string
	parts = append(parts, Rule("=", width))
	parts = append(parts, Rule("=", width))
	for _, line := range lines {
		parts = append(parts, CenterLine(line, width))
	}
	parts = append(parts, Rule("=", width))
	parts = append(parts, Rule("=", width))
	return normalizeSpacerLines(strings.Join(parts, "\n") + "\n\n")
}

// RenderPhase renders a phase header with dash rules.
func RenderPhase(text string, width int) string {
	wrapped := wrapWithPrefix(text, "## ", "   ", width)
	var parts []string
	parts = append(parts, Rule("-", width))
	parts = append(parts, wrapped...)
	parts = append(parts, Rule("-", width))
	return normalizeSpacerLines(strings.Join(parts, "\n") + "\n\n")
}

// RenderStep renders a step header with short dash rules.
func RenderStep(text string, width int) string {
	wrapped := wrapWithPrefix(text, "### ", "    ", width)
	var parts []string
	parts = append(parts, "----------")
	parts = append(parts, wrapped...)
	parts = append(parts, "----------")
	return normalizeSpacerLines(strings.Join(parts, "\n") + "\n\n")
}

// RenderLabeled renders a labeled line (NOTE:, WHY:, PLAN:, OK:, DONE:).
func RenderLabeled(label string, text string, width int) string {
	prefix := label + ": "
	contPrefix := strings.Repeat(" ", len(prefix))
	wrapped := wrapWithPrefix(text, prefix, contPrefix, width)
	return normalizeSpacerLines(strings.Join(wrapped, "\n") + "\n\n")
}

// RenderCmd renders a command line with $ prefix.
func RenderCmd(text string, width int) string {
	wrapped := wrapWithPrefix(text, "  $ ", "    ", width)
	return normalizeSpacerLines(strings.Join(wrapped, "\n") + "\n")
}

// RenderWarn renders a warning with optional detail lines.
func RenderWarn(text string, details []string, width int) string {
	prefix := "!!! WARNING: "
	contPrefix := strings.Repeat(" ", len(prefix))
	wrapped := wrapWithPrefix(text, prefix, contPrefix, width)

	if len(details) > 0 {
		for _, detail := range details {
			detailWrapped := wrapWithPrefix(detail, "    ", "    ", width)
			wrapped = append(wrapped, detailWrapped...)
		}
	}

	return normalizeSpacerLines(strings.Join(wrapped, "\n") + "\n\n")
}

// RenderError renders error lines in a box.
func RenderError(lines []string, width int) string {
	innerWidth := width - 4
	topBottom := "+" + strings.Repeat("-", width-2) + "+"

	var boxLines []string
	boxLines = append(boxLines, topBottom)

	for i, line := range lines {
		// Split on embedded newlines
		segments := strings.Split(line, "\n")
		for j, segment := range segments {
			textToWrap := segment
			if i == 0 && j == 0 {
				textToWrap = "ERROR: " + segment
			}
			wrapped, _ := WrapPreserve(textToWrap, innerWidth)
			for _, w := range wrapped {
				padded := PadRight(w, innerWidth)
				boxLines = append(boxLines, "| "+padded+" |")
			}
		}
	}

	boxLines = append(boxLines, topBottom)
	return normalizeSpacerLines(strings.Join(boxLines, "\n") + "\n\n")
}

// RenderKv renders key-value pairs under a label.
func RenderKv(label string, entries [][2]string, width int) string {
	var parts []string
	parts = append(parts, label+":")

	for _, entry := range entries {
		prefix := "  " + entry[0] + ": "
		contPrefix := strings.Repeat(" ", len(prefix))
		wrapped := wrapWithPrefix(entry[1], prefix, contPrefix, width)
		parts = append(parts, wrapped...)
	}

	return normalizeSpacerLines(strings.Join(parts, "\n") + "\n\n")
}

// RenderList renders a list of items under a label.
func RenderList(label string, items []string, width int) string {
	var parts []string
	parts = append(parts, label+":")

	for _, item := range items {
		wrapped := wrapWithPrefix(item, "  - ", "    ", width)
		parts = append(parts, wrapped...)
	}

	return normalizeSpacerLines(strings.Join(parts, "\n") + "\n\n")
}

// RenderMsg renders plain text wrapped to width, with no prefix.
func RenderMsg(text string, width int) string {
	lines, _ := WrapPreserve(text, width)
	return normalizeSpacerLines(strings.Join(lines, "\n") + "\n\n")
}

// wrapWithPrefix wraps text with a first-line prefix and continuation prefix.
func wrapWithPrefix(text string, firstPrefix string, contPrefix string, width int) []string {
	firstWidth := width - len(firstPrefix)
	contWidth := width - len(contPrefix)

	if firstWidth <= 0 || contWidth <= 0 {
		panic(errors.New("Prefix too long for given width"))
	}

	if text == "" {
		return []string{firstPrefix}
	}

	wrapped, _ := WrapPreserve(text, firstWidth)

	var result []string
	result = append(result, firstPrefix+wrapped[0])

	if len(wrapped) > 1 {
		continuation := wrapped[1:]
		if contWidth < firstWidth {
			// Re-wrap continuation lines to the narrower continuation width
			var rewrapped []string
			for _, line := range continuation {
				w, _ := WrapPreserve(line, contWidth)
				rewrapped = append(rewrapped, w...)
			}
			continuation = rewrapped
		}
		for _, line := range continuation {
			result = append(result, contPrefix+line)
		}
	}

	return result
}

// Meant to be called in *all* render functions. This function fixes a weird 
// visual issue so far only found on GitHub Actions. When you run this tool there, 
// any intentional empty lines (created by \n\n) are not visible in the web UI. 
// but as soon as you refresh the webpage, they are visible. This is a workaround 
// to make them visible immediately without needing a refresh.
func normalizeSpacerLines(output string) string {
	for strings.Contains(output, "\n\n") {
		output = strings.ReplaceAll(output, "\n\n", "\n \n")
	}
	return output
}
