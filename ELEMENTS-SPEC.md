# Plain-Text CI Typography Spec (Bash Log Design System)

This is the spec for all of the individual elements that create this design system. It doesn't
necessarily tell you how to use them together to make your program look beautiful, but simply
describes all the individual pieces, like headers and bullet-point lists, and the rules that define
how those should be formatted.

See [README.md](README.md) to get suggestions on how to combine these elements into a complete log.

## Goals

- **Readable in monochrome CI logs** (no color required).
- **Human-scannable**: clear hierarchy (title → sections → commands → results).
- **Test-friendly**: stable prefixes, stable indentation, stable fixed-width rules.
- **Tiny + simple**: easy to implement as a small Bash library.
- **No emojis used by default** (callers may print their own if desired).

---

## Global rules

### Fixed width

All horizontal rules and boxed elements use a fixed width `WIDTH`.

- `WIDTH` is configured by `DOC_WIDTH`.
- A default width must exist in implementations.
- `WIDTH` must be a positive integer; if invalid, fall back to default.

### No truncation (ever)

**No element may truncate user-provided text.**\
If text does not fit within `WIDTH` constraints, it MUST be wrapped onto additional lines.

### Character preservation

When wrapping:

- Preserve all characters exactly as provided (including repeated spaces).
- Only insert `\n` where wrapping occurs.
- Do not remove or normalize whitespace.
- Preserve explicit newlines in input as forced line breaks (wrap lines within each segment).

### Wrapping behavior (deterministic)

- Prefer breaking at whitespace boundaries when possible.
- If a single token/word is longer than the available width, hard-wrap it (split within the token)
  to guarantee progress.
- Wrapping must be deterministic for testability.

### Indentation

- Standard structural indentation: **2 spaces**
- Warning detail indentation: **4 spaces**
- Wrapped line continuation: uses element-specific continuation prefixes (defined below).

### Automatic whitespace (trailing blank lines)

The design system automatically adds visual breathing room after most elements to ensure good typography out of the box. Users should never need to manually insert blank lines between elements.

**Trailing blank line rules:**

- **Elements that add 1 trailing blank line:** `title`, `phase`, `step`, `note`, `why`, `plan`, `ok`, `done`, `warn`, `error`, `kv`, `list`
- **Elements that add NO trailing blank:** `cmd`

**Rationale:**
- Commands (`cmd`) often appear in sequences and should flow together without extra spacing
- All other elements provide visual structure and need breathing room below them

---

## Elements

### 1) TITLE (Document title)

Used once at the start of a run/job.

**Format**

- Two `=` rule lines
- One or more centered title lines (wrapping allowed)
- Two `=` rule lines

Example (single-line title):

```
========================================================================
========================================================================
                         BUILD & TEST — api
========================================================================
========================================================================

```

Example (wrapped title):

```
========================================================================
========================================================================
                 RELEASE PIPELINE — payments-api — nightly
                    with extended validation steps
========================================================================
========================================================================

```

**Rules**

- Rule line = `=` repeated to `WIDTH`.
- Title text is wrapped to `WIDTH` (no truncation), then each wrapped line is centered within
  `WIDTH`.
- Centering = left padding + text + right padding; if padding is uneven, right-pad with the
  remainder.
- A trailing blank line is automatically added (see "Automatic whitespace" above).

---

### 2) H1 Section (Major phase)

A section divider for major phases.

**Format**

```

------------------------------------------------------------------------
## Setup
------------------------------------------------------------------------

```

**Rules**

- Rule line = `-` repeated to `WIDTH`.
- Heading begins with prefix `## `.
- If heading wraps:
  - First line uses `## `
  - Continuation lines use a continuation prefix of **3 spaces** (`"   "`) so wrapped text visually
    aligns under the heading text.
- A trailing blank line is automatically added (see "Automatic whitespace" above).

Example (wrapped):

```

------------------------------------------------------------------------
## Build and package the service for production deployment
   including generation of integrity metadata
------------------------------------------------------------------------

```

---

### 3) H2 Subsection (Step title)

A subsection heading within a phase.

**Format**

```
----------
### Install dependencies
----------
```

**Rules**

- Top rule: 10 dashes (`----------`)
- Heading begins with prefix `### `.
- If heading wraps:
  - First line uses `### `
  - Continuation lines use a continuation prefix of **4 spaces** (`"    "`).
- Bottom rule: 10 dashes (`----------`)
- A trailing blank line is automatically added (see "Automatic whitespace" above).

Example (wrapped):

```
----------
### Compile TypeScript and bundle server for
    distribution
----------
```

---

### 4) Labeled single-line messages

Used for short human-readable lines.

**Supported labels (recommended)**

- `NOTE:`
- `WHY:`
- `PLAN:`
- `OK:`
- `DONE:`

**Format**

```
NOTE: Using lockfile for deterministic builds.
```

**Wrapping rules**

- Use prefix `<LABEL>: ` (e.g. `NOTE: `).
- Wrap the message text to fit within `WIDTH` while preserving all characters.
- Continuation lines must use a prefix of spaces equal to the label prefix length.
- A trailing blank line is automatically added (see "Automatic whitespace" above).

Example (wrapped):

```
NOTE: This line is very long and must wrap within the fixed width while
      preserving every character and only inserting newlines where needed.
```

---

### 5) Commands (shell commands)

Used to display commands executed by the script/program.

**Format**

```
  $ pnpm install --frozen-lockfile
```

**Wrapping rules**

- Prefix first line with `  $ ` (2 spaces + dollar sign + 1 space).
- If wrapped:
  - Continuation lines have a prefix of **4 spaces** (`"    "`) to align with the command text after
    `  $ `.
- NO trailing blank line is added (commands flow together in sequences).

Example (wrapped):

```
  $ docker build --file Dockerfile --tag payments-api:ci --build-arg FOO=bar
    --build-arg REALLY_LONG_ARGUMENT=somevalue .
```

---

### 6) WARN callout

High-visibility non-fatal event.

**Format**

```
!!! WARNING: integration tests skipped
    detail: INTEGRATION=0
```

**Rules**

- Summary line prefix: `!!! WARNING: `
- Message wraps with continuation prefix of spaces equal to the summary prefix length.
- Optional details are printed on following line(s).
- Each detail line prefix: **4 spaces** (`"    "`).
- Detail lines also wrap, using the same **4-space** continuation prefix.
- A trailing blank line is automatically added (see "Automatic whitespace" above).

Example (wrapped):

```
!!! WARNING: This warning summary is very long and must wrap while
             preserving exact characters and spacing
    detail: This detail line can also be long and should wrap using the
    same 4-space indentation on continuation lines
```

---

### 7) ERROR callout (boxed)

Highest-visibility fatal (or failure) event.

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

- Box width is exactly `WIDTH`.
- Top/bottom border:
  - `+` + (`-` repeated `WIDTH-2`) + `+`
- Body lines:
  - `| ` + content padded with spaces to `(WIDTH-4)` + ` |`
- Content is derived from zero or more input lines:
  - The first line automatically gets the prefix `ERROR: ` prepended (similar to how WARN gets `!!! WARNING: `).
  - Each input line may itself contain newlines; treat them as forced breaks.
  - Each resulting line is wrapped to `INNER_WIDTH = WIDTH-4` with **no truncation**.
- Every wrapped line becomes its own box row.
- A trailing blank line is automatically added (see "Automatic whitespace" above).

Example (wrapped inside box):

```
+----------------------------------------------------------------------+
| ERROR: This is a long summary that wraps within the box without      |
| truncation and keeps the box shape intact                            |
| command: ./deploy.sh --dry-run --with-an-extremely-long-flag=VALUE   |
| hint: This hint also wraps and remains fully visible to the user     |
+----------------------------------------------------------------------+
```

**Note**: When providing error lines, do NOT include "ERROR:" in the first line - it will be added automatically.

---

### 8) Key-Value blocks (KV)

Used for structured data such as ENV, CONTEXT, SUMMARY, METRICS, DEBUG, etc.

**Format**

```
ENV:
  node: 20.11.1
  pnpm: 9.1.0
```

**Rules**

- Header line: `<LABEL>:` (no indentation)
- Entries:
  - Base prefix: `  <key>: `
  - Value is wrapped with **no truncation**.
  - Continuation lines are indented with spaces equal to the base prefix length (align under the
    value start).
- A trailing blank line is automatically added (see "Automatic whitespace" above).

Example (wrapped value):

```
CONTEXT:
  workspace: /home/runner/work/payments-api/this/path/is/so/long/it/wraps
             /and/continues/here
```

---

### 9) List blocks

Used for lists such as ARTIFACTS.

**Format**

```
ARTIFACTS:
  - dist/app.tar.gz
  - dist/checksums.txt
```

**Rules**

- Header line: `<LABEL>:`
- Items:
  - First line prefix: `  - `
  - Item text wraps with **no truncation**
  - Continuation lines use spaces equal to the item prefix length (typically 4 spaces).
- A trailing blank line is automatically added (see "Automatic whitespace" above).

Example (wrapped item):

```
ARTIFACTS:
  - dist/some/really/long/path/that/wraps/because/it/exceeds/width/and
    continues/here
```

---