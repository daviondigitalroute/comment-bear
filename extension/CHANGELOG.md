# Changelog — Comment Bear for VS Code

## [1.0.0]

Initial release.

### Added
- **Remove Comments** in the editor (selection or whole file), with one-step undo.
- **Diff preview** with confirmation before applying (toggle: `commentBear.showDiffPreview`).
- **Copy Without Comments** — cleaned copy to the clipboard, file untouched.
- **Count Comments** — dry-run count.
- **Folder / batch** removal from the Explorer context menu, with progress, cancel,
  a confirmation prompt and configurable exclude globs.
- **Status-bar counter** showing the active file's comment count (click to remove).
- 80+ languages, auto-detected from the VS Code language id / file name, with a
  manual `commentBear.languageOverride`.
- Per-run stats: comments removed, characters and lines saved.
- Settings for `preserveLicense` and `keepEmptyLines`.
- Keybindings: `Ctrl+Alt+/` (remove), `Ctrl+Alt+Shift+/` (preview).

Powered by the `comment-bear` engine (string-aware, zero runtime dependencies).
