# Changelog

All notable changes to the Comment Bear project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.3] - 2026-06-02

A focused correctness/security pass (two audit cycles). All changes are
backwards compatible; no public API changed. Tests: 1396 → 1520.

### Fixed (security)
- **ReDoS hang in language auto-detection.** `detectLanguageByContent` (run on
  every input with no explicit language) had three quadratic regexes — the Ruby
  `def`/`class`/`begin`/`do`/`=begin` heuristics and the CSS selector check —
  that took ~6s on 50KB of non-matching input and grew quadratically. Rewritten
  as linear scans; detection results are unchanged. A full sweep confirms no
  input hangs across all 80 languages.

### Fixed (code/data corruption)
- **Python**: a single-line triple-quoted string that is not a docstring was
  emitted twice (missing `continue`). `x = """s"""` no longer duplicates.
- **Ruby**: `/regex/` literals (a `#` inside is no longer a comment), `?#` char
  literals, percent literals with bracket delimiters (`%q{…#…}`, `%w[…]`,
  `%r{…}`, `%Q<…>`, `%(…)`), and heredoc bodies (`<<~TAG` etc.) are preserved.
  (The percent-literal pre-pass was also O(n²); now linear.)
- **PHP**: `#`/comment-looking content inside heredoc/nowdoc bodies is preserved
  (placeholders are now restored after, not before, the `#` pass).
- **YAML**: `#` inside literal (`|`) and folded (`>`) block scalars is preserved.
- **Shell/Bash**: `$#`, `${#arr}`, `$((2#101))` and mid-word `a#b` are preserved
  (`#` starts a comment only at word start).
- **Char literals**: Elixir `?#`, Erlang `$%`/`$#`, and Clojure/Scheme/Common
  Lisp `\;` are preserved.
- **PowerShell**: here-strings `@"…"@` / `@'…'@` bodies are preserved.
- **OCaml/SML**: a string containing `*)` inside a block comment no longer leaks.
- **Makefile/properties**: an escaped `\#` is a literal, not a comment.
- **Dart / Groovy / Vala / D**: comment tokens inside triple-quoted, dollar-slashy
  (`$/…/$`), verbatim (`"""…"""`) and token (`q{…}`) strings are preserved.
- **SQL `preserveLicense` (data loss)**: a license block comment no longer causes
  all following statements to be dropped (the block-comment state wasn't reset
  when the license block closed).
- **Rust `preserveLicense`**: ordinary `//` and `/* */` license/copyright comments
  are now kept (previously only `///`/`//!` doc comments were).
- **PHP**: `keepEmptyLines` is now honored for `//` and `/* */` comments.
- **CRLF**: no dangling lone `\r` is left at end-of-output (mid-file CRLF intact).

### Fixed (robustness)
- `removeComments` no longer throws on `null` options or on a value whose
  `toString()` throws or returns a non-string; `result.code` is always a string.

### Known limitations (documented, not fixed)
- Julia `'#'` char literal, CMake leveled bracket comments (`#[=[ … ]=]`), Tcl
  command-position `#`, Zig `\\` multiline strings, and Markdown 4-space indented
  code blocks remain best-effort. The inline-comment trailing-whitespace and
  `removedCount` semantics are unchanged (cosmetic/metadata only).

## [1.2.2] - 2026-06-01

### Fixed
- **Critical: infinite hang / catastrophic backtracking** on JavaScript/TypeScript (and the C-style languages that delegate to it: Java, C#, C, C++, PHP, Go, Rust, Swift, Kotlin, Scala) when the input interleaved regex literals (`/.../`) with `//` line comments. The hang was inside the `strip-comments` dependency. The JavaScript remover is now a linear, single-pass scanner (`removeBySpec` with regex-literal awareness) that cannot backtrack, with a hard iteration safety valve as defense-in-depth.
- Regex-vs-division disambiguation uses an incrementally-tracked "previous significant token" (O(1) per character), so large regex/division-heavy files are processed in linear time. Postfix `++`/`--` (and `)`/`]` value closers) before `/` are correctly treated as division, not a regex.

### Changed
- **Removed the `strip-comments` runtime dependency** — the package now has **zero runtime dependencies**.

## [1.2.1] - 2026-06-01

### Changed
- Removed the GitHub Actions CI workflow and the CI badge from the README (the badge image broke once the workflow was removed). Tests still run locally via `npm test` / `npm run test:coverage`. No runtime code changed since 1.2.0.

## [1.2.0] - 2026-06-01

Grew comment-bear from 21 to **80+ languages** on top of a new shared engine,
fixed every issue from the code audit, and added a coverage gate.
All changes are backwards compatible. Tests: 1043 → **1383**.

### Added
- **Shared comment-removal engine** (`removeBySpec` in `src/removers/_shared.ts`) that is aware of string/character literals, handles nested block comments, preserves license and directive comments, and supports `keepEmptyLines`. Most languages are now driven by a small declarative `CommentSpec`.
- **59 new languages**, grouped by comment family:
  - Hash (`#`): Shell/Bash, PowerShell, Perl (incl. POD blocks), R, TOML, Makefile, Dockerfile, INI, GraphQL, Elixir, Crystal, Julia, Nim, CoffeeScript, Tcl, CMake, Java `.properties`, Puppet, HCL/Terraform, SCSS, LESS, Sass.
  - C-style (`//`, `/* */`): Dart, Groovy/Gradle, Solidity, Protobuf, Objective-C (incl. `@"..."` literals), Zig, Vala, D (`/+ +/` nested blocks), GLSL, HLSL, WGSL, JSON5.
  - Dash (`--`): Lua (long-bracket strings/comments), Elm, Ada, VHDL, AppleScript.
  - Lisp/asm (`;`): Clojure, Common Lisp, Scheme, Emacs Lisp, Assembly.
  - Percent (`%`): Erlang, LaTeX (`\%` aware), MATLAB (`%{ %}`), Prolog.
  - ML-style (`(* *)`): OCaml, F#, Standard ML, Pascal.
  - Other: VB/VBA (`'`, `REM`), Batch (`REM`, `::`), Fortran (`!`), Vimscript (line-start `"`).
  - Hybrid/templating: Vue and Svelte (section-aware — `<template>`/`<script>`/`<style>` handled by the HTML/JS/CSS removers) and Markdown (HTML comments removed, but fenced code blocks and inline code spans preserved).
- **Smarter detection**: by shebang (`#!/usr/bin/env bash` → shell, etc.) and by special filename (`Makefile`, `Dockerfile`, `CMakeLists.txt`, `.vimrc`).
- `keepEmptyLines` support for the HTML, CSS, XML, SQL and JSON removers.
- `mergeConfig` and `validateConfig` are now re-exported from the package entry point.
- Optional `onlyAtLineStart` flag on the engine's line-comment spec (used by Vimscript; purely additive).
- Coverage gate via `jest` `coverageThreshold` (run with `npm run test:coverage`), so coverage regressions are caught.

### Changed
- Fixed npm metadata: `repository`/`bugs`/`homepage` now point at the `comment-bear` repo; added `author` and `engines` (Node >= 16).
- Cross-platform `clean` script (Node `fs.rmSync` instead of `rm -rf`); added `prepublishOnly` (build + test) and `test:coverage` scripts.
- Rewrote the README with a concise feature list, a full grouped language table, hybrid examples and documented limitations.

### Fixed
- YAML: `#` is now only treated as a comment at line start or after whitespace, so values like `url: http://x#frag` and `color:#fff` are preserved.
- PHP: `#[Attribute]` (PHP 8 attributes) are no longer removed as comments.
- Go: `//go:build`, `//go:embed`, `//go:generate` directives are preserved (in addition to `// +build`).
- CSS: comment-like sequences inside string/`content` values (e.g. `content: "a/*b*/c"`) are no longer corrupted.
- SCSS/LESS/Sass: `//` line comments are now removed (previously left untouched because these mapped to the CSS remover).
- CLI: `--language` now truly forces the language even when the file extension is recognised.
- Inline comment removal no longer leaves trailing whitespace.

### Known limitations
- MATLAB/Octave: only `"`-strings are tracked, not `'` (also the transpose operator); reachable via `--language matlab` (`.m` maps to Objective-C).
- Fortran: only free-form `!` comments (not fixed-form column-1 `C`/`*`).
- Vimscript: only full-line `"` comments are removed; inline `"` is left intact.
- Prolog: reachable only via explicit `--language prolog` (`.pl` maps to Perl).

## [1.1.0] - 2026-03-16

### Added
- CLI tool (`comment-bear` command) with support for --in-place, --dry-run, --preserve-license, --keep-empty-lines flags
- Language support for Kotlin, Scala, and Haskell
- Additional unit tests (1043+ total)

### Changed
- N/A

### Fixed
- N/A

## [1.0.0] - 2024-10-31

### Changed
- Renamed package from `universal-comment-remover` to `comment-bear`

### Added
- Initial release of Universal Comment Remover
- Support for 18+ programming languages
- Automatic language detection by file extension and content
- Preserve license comments option
- Comprehensive test suite with 788+ tests
- Command Line Interface (CLI) support
- TypeScript type definitions

### Changed
- N/A (Initial release)

### Fixed
- N/A (Initial release)
