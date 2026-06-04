<div align="center">
  <img src="icon.png" alt="Comment Bear" width="128">
  <h2>Comment Bear for VS Code</h2>
  <p>🐻 Remove comments from code in <strong>80+ languages</strong> — right in the editor, in a diff preview, or across whole folders.</p>
</div>

Powered by the [`comment-bear`](https://www.npmjs.com/package/comment-bear) engine: a fast, **string-aware** comment remover that never touches comment tokens inside strings, regex literals or here-docs, and has zero runtime dependencies.

## ✨ What it does

- **Remove Comments** in the active editor — works on your **selection** if you have one, otherwise the whole file. One `Ctrl+Z` undoes it.
- **Diff preview** before applying (optional) — see exactly what will change and confirm.
- **Copy Without Comments** — put a cleaned copy on the clipboard without touching the file.
- **Count Comments** — a quick dry-run count.
- **Folder / batch** — right-click a file *or a folder* in the Explorer to clean many files at once (with progress, cancel, and a confirmation prompt).
- **Status bar counter** — a 🐻 badge shows how many comments the current file has; click it to remove them.
- **80+ languages**, auto-detected from the file type, with a manual override.
- **Stats** after every run: comments removed, plus characters and lines saved.

## 🚀 Usage

| How | What |
|---|---|
| `Ctrl+Alt+/` (`Cmd+Alt+/` on macOS) | Remove comments in the editor |
| `Ctrl+Alt+Shift+/` | Preview removal as a diff |
| Command Palette → **Comment Bear:** | All commands |
| Right-click in the editor → **Comment Bear** | All editor commands |
| Right-click a file/folder in Explorer | **Remove Comments (Comment Bear)** |
| Click the 🐻 status-bar item | Remove comments in the current file |

## ⚙️ Settings

| Setting | Default | Description |
|---|---|---|
| `commentBear.showDiffPreview` | `true` | Show a diff and confirm before applying in-editor removal. |
| `commentBear.preserveLicense` | `false` | Keep license/copyright comments. |
| `commentBear.keepEmptyLines` | `false` | Leave a blank line where a comment was. |
| `commentBear.confirmFolderOperations` | `true` | Confirm before modifying multiple files. |
| `commentBear.exclude` | `node_modules`, `dist`, `.git`, … | Globs to skip in folder/batch runs. |
| `commentBear.showStatusBar` | `true` | Show the 🐻 comment counter in the status bar. |
| `commentBear.languageOverride` | `auto` | Force one language instead of auto-detecting. |

## 🌐 Supported languages

JavaScript, TypeScript, Java, C#, C, C++, Go, Rust, Swift, Kotlin, Scala, PHP, Dart, Groovy, Solidity, Protobuf, Objective-C, Zig, Vala, D, GLSL, HLSL, WGSL, JSON5, SCSS, LESS, Sass, HCL/Terraform, Puppet, Python, Ruby, Shell/Bash, PowerShell, Perl, R, TOML, YAML, Makefile, Dockerfile, INI, GraphQL, Elixir, Crystal, Julia, Nim, CoffeeScript, Tcl, CMake, Java `.properties`, SQL, Haskell, Lua, Elm, Ada, VHDL, AppleScript, Clojure, Common Lisp, Scheme, Emacs Lisp, Assembly, Erlang, LaTeX, MATLAB, Prolog, OCaml, F#, Standard ML, Pascal, VB, Batch, Fortran, Vimscript, HTML, XML, CSS, JSON, Vue, Svelte, Markdown.

## 📝 License

MIT — see [LICENSE](LICENSE). Same project as the [`comment-bear`](https://github.com/ivan-markov-666/comment-bear) npm package.
