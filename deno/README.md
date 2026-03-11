# sh-style for Deno, Bun, and Node.js

Use sh-style directly in your Deno, Node.js, or Bun code. This cross-runtime wrapper bundles the compiled Go binary and executes CLI commands under the hood, providing a clean TypeScript API that works across all major JavaScript runtimes.

## Usage Patterns

1. **Simple functions** - Import and call functions directly (recommended for most use cases)
2. **Factory pattern** - Create a configured logger for custom width or output destination

## Installation

This package is published to JSR (JavaScript Registry), which works across all runtimes.

**For Deno:**
```bash
deno add jsr:@levibostian/sh-style
```

**For Node.js:**
```bash
npx jsr add @levibostian/sh-style
```

**For Bun:**
```bash
bunx jsr add @levibostian/sh-style
```

Then import in your code:
```typescript
import { title, phase, step, done } from "@levibostian/sh-style";

// Or for factory pattern
import { createLogger } from "@levibostian/sh-style";
```

## Using Simple Functions

Import and call functions directly. All functions automatically output to console.

```typescript
import { title, phase, step, cmd, ok, done } from "jsr:@levibostian/sh-style";

title("My Build Script");
phase("Setup");
step("Installing dependencies");
cmd("npm install");
ok("Dependencies installed");
done("Setup complete!");
```

### Headers

```typescript
title(text: string)      // Document title (centered, double rules)
phase(text: string)      // H1 section (full-width rules)
step(text: string)       // H2 subsection (short rules)
```

### Messages

```typescript
note(text: string)       // NOTE: message
why(text: string)        // WHY: message
plan(text: string)       // PLAN: message
ok(text: string)         // OK: message
done(text: string)       // DONE: message
```

### Commands

```typescript
cmd(text: string)        // Display shell command with $ prefix
```

### Warnings & Errors

```typescript
warn(text: string, details?: string[])     // Warning with optional details
error(lines: string[])                      // Error box with multiple lines
```

### Structured Data

```typescript
kv(label: string, entries: [string, string][])  // Key-value block
list(label: string, items: string[])             // List block
```

## Using Factory Pattern

Create a configured logger instance when you need custom width or custom output destination.

```typescript
import { createLogger } from "jsr:@levibostian/sh-style";

const log = createLogger();

log.title("My Build Script");
log.phase("Setup");
log.done("Complete!");
```

**Custom Width:**

```typescript
const log = createLogger({ width: 50 });
log.title("Narrow Output");
```

**Custom Logger:**

Pass a custom logger that implements the standard `Logger` interface (`Pick<Console, "log">`):

**Deno:**
```typescript
const log = createLogger({
  logger: {
    log: (msg: string) => {
      // Send to file, network, or any other destination
      Deno.writeTextFileSync("/var/log/build.log", msg + "\n", { append: true });
    }
  }
});

log.title("Logging to file");
log.done("Build complete!");
```

**Node.js:**
```typescript
import { writeFileSync } from 'fs';

const log = createLogger({
  logger: {
    log: (msg: string) => {
      writeFileSync("/var/log/build.log", msg + "\n", { flag: 'a' });
    }
  }
});

log.title("Logging to file");
log.done("Build complete!");
```

**Bun:**
```typescript
const log = createLogger({
  logger: {
    log: (msg: string) => {
      Bun.write(Bun.file("/var/log/build.log"), msg + "\n");
    }
  }
});

log.title("Logging to file");
log.done("Build complete!");
```

Any object with a `log` method (including the built-in `console`) can be used as a logger.

## Configuration

Set the fixed width for rules and boxes using the `DOC_WIDTH` environment variable (default: 72):

**Deno:**
```typescript
Deno.env.set("DOC_WIDTH", "80");
title("Wider output");
```

**Node.js:**
```typescript
process.env.DOC_WIDTH = "80";
title("Wider output");
```

**Bun:**
```typescript
process.env.DOC_WIDTH = "80";
title("Wider output");
```

Or use the factory pattern with explicit width (works in all runtimes):

```typescript
const log = createLogger({ width: 80 });
log.title("Wider output");
```

## Features

- **Cross-runtime support** - Works seamlessly in Deno, Node.js, and Bun
- **No truncation** - all text is wrapped, never cut off
- **Character preservation** - including repeated spaces
- **Deterministic output** - suitable for snapshot testing
- **Fixed-width output** - configurable via `DOC_WIDTH` or factory options
- **Automatic spacing** - elements add appropriate whitespace automatically
- **Flexible output** - console, file, network, or any custom destination

## Example Usage

**Simple build script:**
```typescript
import { title, phase, step, cmd, ok, list } from "jsr:@levibostian/sh-style";

title("BUILD PIPELINE");

phase("Setup");
cmd("npm install");
ok("dependencies installed");

phase("Build");
step("Compile TypeScript");
cmd("npm run build");
ok("build completed in 12s");

step("Bundle application");
cmd("npm run bundle");
ok("bundle created");

list("ARTIFACTS", ["dist/app.js", "dist/app.css"]);
```

**Error handling:**
```typescript
import { error } from "jsr:@levibostian/sh-style";

try {
  // ... some operation
} catch (e) {
  error(["Tests failed", `error: ${e.message}`, "run npm test for details"]);
  Deno.exit(1);
}
```

## License

MIT (see LICENSE file in repository root)
