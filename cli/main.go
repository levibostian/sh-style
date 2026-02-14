package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	shstyle "github.com/levibostian/sh-style"
)

func main() {
	args := os.Args[1:]
	width := shstyle.GetDocWidth()

	if len(args) > 0 && args[0] == "render" {
		renderMode(width)
		return
	}

	cmd := ParseArgs(args)
	if cmd == nil {
		return
	}

	output := RenderCommand(cmd, width)
	fmt.Print(output)
}

func renderMode(width int) {
	scanner := bufio.NewScanner(os.Stdin)
	// Increase buffer size for long lines
	scanner.Buffer(make([]byte, 1024*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Text()

		// Skip empty or whitespace-only lines
		if strings.TrimSpace(line) == "" {
			continue
		}

		cmd := ParseCommand(line)
		if cmd == nil {
			continue
		}

		output := RenderCommand(cmd, width)
		fmt.Print(output)
	}
}
