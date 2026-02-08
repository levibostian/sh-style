/**
 * Command type definitions and JSONL parsing.
 * Implements the internal Command model for rendering.
 */

// Discriminated union for all command types (internal representation)
export type Command =
  | { type: "title"; text: string }
  | { type: "phase"; text: string }
  | { type: "step"; text: string }
  | { type: "note"; text: string }
  | { type: "why"; text: string }
  | { type: "plan"; text: string }
  | { type: "ok"; text: string }
  | { type: "done"; text: string }
  | { type: "cmd"; text: string }
  | { type: "warn"; text: string; details?: string[] }
  | { type: "error"; lines: string[] }
  | { type: "kv"; label: string; entries: [string, string][] }
  | { type: "list"; label: string; items: string[] };

/**
 * Parse a JSONL line into a Command.
 * JSONL format: { "command": "...", "lines": ["..."] }
 * Returns null if the line cannot be parsed or validated.
 */
export function parseCommand(json: string, _lineNumber?: number): Command | null {
  try {
    const obj = JSON.parse(json);
    
    // Basic validation: must be object with "command" and "lines"
    if (typeof obj !== "object" || obj === null) return null;
    if (typeof obj.command !== "string") return null;
    if (!Array.isArray(obj.lines)) return null;
    if (obj.lines.length === 0) return null;
    
    // Ensure all lines are strings
    for (const line of obj.lines) {
      if (typeof line !== "string") return null;
    }
    
    const command = obj.command;
    const lines = obj.lines as string[];
    
    // Simple text commands - use lines[0] as text
    if (
      command === "title" || command === "phase" || command === "step" ||
      command === "note" || command === "why" || command === "plan" ||
      command === "ok" || command === "done" || command === "cmd"
    ) {
      return { type: command, text: lines[0] };
    }
    
    // Warn - lines[0] is text, lines[1..] are details
    if (command === "warn") {
      const details = lines.length > 1 ? lines.slice(1) : undefined;
      return { type: "warn", text: lines[0], details };
    }
    
    // Error - all lines are error lines
    if (command === "error") {
      return { type: "error", lines };
    }
    
    // List - lines[0] is label, lines[1..] are items
    if (command === "list") {
      const label = lines[0];
      const items = lines.slice(1);
      return { type: "list", label, items };
    }
    
    // KV - lines[0] is label, lines[1..] are "key: value" pairs
    if (command === "kv") {
      const label = lines[0];
      const entries: [string, string][] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const colonIndex = line.indexOf(":");
        if (colonIndex === -1) continue; // Skip invalid pairs
        
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        entries.push([key, value]);
      }
      
      return { type: "kv", label, entries };
    }
    
    // Unknown command - ignore
    return null;
  } catch {
    // Invalid JSON - ignore
    return null;
  }
}
