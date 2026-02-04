# Plain-Text CI Typography Spec (Bash Log Design System)

This is the spec for all of the individual elements that create this design system. It doesn't necessarily tell you how to use them together to make your program look beautiful, but simply describes all the individual pieces, like headers and bullet-point lists, and the rules that define how those should be formatted. 

See [README.md](README.md) to get suggestions on how to combine these elements into a complete log.

## Goals

- **Readable in monochrome CI logs** (no color required).
- **Human-scannable**: clear hierarchy (title → sections → commands → results).
- **Test-friendly**: stable prefixes, stable indentation, stable fixed-width rules.
- **Tiny + simple**: easy to implement as a small Bash library.
- **No emojis used by default** (callers may print their own if desired).

---

## Global settings

### Fixed width

This system uses a **fixed width** for horizontal rules and boxed errors.

- Default width: `DOC_WIDTH` (implementation default recommended: `72` or `78`)
- Override: users can set `DOC_WIDTH=<n>` before printing.

**Definition**
- `WIDTH := DOC_WIDTH`
- All horizontal rules are exactly `WIDTH` characters long.

### Indentation

- Standard indent for structured blocks: **2 spaces**
- Warning detail indent: **4 spaces**
- Error box body padding is handled by the box format (see below).

---

## Elements

### 1) TITLE (Document title)

Used once at the start of a run/job.

**Format**
- 2 lines of `=` rule
- 1 centered title line
- 2 lines of `=` rule

```
========================================================================
========================================================================
                         BUILD & TEST — api
========================================================================
========================================================================
```

**Rules**
- Each rule line is `=` repeated to `WIDTH`.
- Title line is centered within `WIDTH` using spaces.
- Title text should be short enough to fit in one line after centering.

---

### 2) H1 Section (Major phase)

Separates major phases like Setup / Build / Test / Deploy.

**Format**
```
------------------------------------------------------------------------
## Setup
------------------------------------------------------------------------
```

**Rules**
- Rule lines are `-` repeated to `WIDTH`.
- Heading line begins with `## `.

---

### 3) H2 Subsection

Subsection within a phase.

**Format**
```
### Install dependencies
```

**Rules**
- Heading line begins with `### `.
- No surrounding rule lines.

---

### 4) Paragraph / status lines (labels)

Single-line messages with stable prefixes.

**Supported labels (recommended)**
- `NOTE: ...` (context)
- `WHY: ...` (reason/justification)
- `PLAN: ...` (what will happen)
- `OK: ...` (success)
- `DONE: ...` (end of run)

**Examples**
```
NOTE: Using lockfile to enforce exact versions.
WHY: Ensure deterministic tooling across runners.
OK: dependencies installed
DONE: Build & Test — api
```

**Rules**
- Keep these as single lines when possible.
- Prefer ~80–100 chars max for readability in narrow CI panes.

---

### 5) ENV / key-value blocks

For versions, paths, configuration; should be easy to read and easy to assert in tests.

**Format**
```
ENV:
  node: 20.11.1
  pnpm: 9.1.0
  os: ubuntu-22.04
```

**Rules**
- Header ends with `:`
- Keys are indented by 2 spaces and formatted as `key: value`.

---

### 6) Lists (optional)

**Format**
```
ARTIFACTS:
  - dist/server.js
  - dist/server.js.map
```

**Rules**
- Use 2-space indentation before `- ` for list items under a heading.

---

### 7) Commands (shell commands executed)

Commands should be visually distinct and grep-friendly.

**Format**
```
$ pnpm install --frozen-lockfile
```

**Rules**
- Each executed command line starts with `$ `.
- Multi-line commands may be continued with indentation (implementation-defined), but the first line MUST start with `$ `.

---

### 8) WARN (high visibility, compact)

Warnings must stand out without color.

**Format**
```
!!! WARNING: integration tests skipped
    detail: INTEGRATION=0
```

**Rules**
- First line starts with `!!! WARNING: `
- Detail/continuation lines are indented **4 spaces**.
- Use short summary line; put extra info in detail lines.

---

### 9) ERROR (highest visibility, boxed)

Errors must be unmistakable in CI logs; use a fixed-width ASCII box.

**Format**
```
+----------------------------------------------------------------------+
| ERROR: deploy validation failed                                      |
| command: ./scripts/deploy.sh --dry-run                               |
| code: 2                                                             |
| hint: ensure DEPLOY_TOKEN is set and has permissions                 |
+----------------------------------------------------------------------+
```

**Rules**
- Top/bottom border:
  - `+` + (`-` repeated `WIDTH-2`) + `+`
- Body lines:
  - `| ` + text + padding spaces + ` |`
- Maximum visible text width inside the box is `WIDTH-4`.
  - If a message exceeds this, implementation should wrap or truncate consistently (choose one behavior and keep it stable).
- Recommended fields:
  - summary: `ERROR: ...`
  - context: `command: ...`, `code: ...`
  - guidance: `hint: ...` (can appear multiple times)

---

## Spacing rules

- Put **one blank line** after the TITLE block.
- Separate H1 sections with **one blank line** (optional but recommended for dense logs).
- Within a section, use blank lines sparingly; prefer structure (H2, NOTE, ENV, etc.) over extra whitespace.

---

## Complete example (reference)

```
========================================================================
========================================================================
                         BUILD & TEST — api
========================================================================
========================================================================

NOTE: Plain-text typography (no color, no emojis). Fixed-width layout.

------------------------------------------------------------------------
## Setup
------------------------------------------------------------------------
WHY: Ensure deterministic tooling across runners.

ENV:
  node: 20.11.1
  pnpm: 9.1.0
  os: ubuntu-22.04

$ corepack enable
$ node --version
$ pnpm --version
OK: toolchain ready

### Install dependencies
$ pnpm install --frozen-lockfile
OK: dependencies installed

------------------------------------------------------------------------
## Test
------------------------------------------------------------------------
$ pnpm test
!!! WARNING: integration tests skipped
    detail: INTEGRATION=0

------------------------------------------------------------------------
## Deploy
------------------------------------------------------------------------
$ ./scripts/deploy.sh --dry-run
+----------------------------------------------------------------------+
| ERROR: deploy validation failed                                      |
| command: ./scripts/deploy.sh --dry-run                               |
| code: 2                                                             |
| hint: ensure DEPLOY_TOKEN is set and has permissions                 |
| hint: rerun with VERBOSE=1 for additional diagnostics                |
+----------------------------------------------------------------------+

DONE: Build & Test — api
```

