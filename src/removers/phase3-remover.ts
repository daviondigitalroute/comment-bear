/**
 * Removers for the "Phase 3" languages.
 *
 * Most functions here are thin wrappers that delegate to the generic
 * `removeBySpec` engine in `_shared.ts` with a language-specific
 * `CommentSpec`. A handful (Lua, LaTeX, Visual Basic, Batch) need custom
 * handling and implement their own scanners / pre-passes.
 *
 * Languages are grouped by their dominant line-comment token:
 *   Group A (`--`): lua, elm, ada, vhdl, applescript
 *   Group B (`;`):  clojure, commonlisp, scheme, emacslisp, assembly
 *   Group C (`%`):  erlang, latex, matlab, prolog
 *   Group D (`(* *)`): ocaml, fsharp, sml, pascal
 *   Group E (misc): vb, batch, fortran, vimscript
 */

import { removeBySpec, isLicenseComment, CommentSpec } from './_shared';

/* -------------------------------------------------------------------------- */
/* Group A — `--` line comments                                               */
/* -------------------------------------------------------------------------- */

/**
 * Removes comments from Lua code.
 *
 * Lua has several comment/string forms handled by a dedicated char scanner:
 *  - Long-bracket strings `[[ ... ]]` / `[=[ ... ]=]` (any number of `=`) are
 *    copied verbatim.
 *  - Long-bracket comments `--[[ ... ]]` / `--[=[ ... ]=]` are dropped.
 *  - `--` to end of line is a line comment.
 *  - `"` and `'` are ordinary strings with `\` escapes.
 *
 * A `"--"` inside a string and `--` inside a long string are left untouched.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeLuaComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;

  try {
    let result = '';
    let i = 0;
    const len = code.length;

    while (i < len) {
      const char = code[i];

      // Long-bracket string: [[ ... ]] or [=[ ... ]=] (any level of `=`).
      const openLevel = matchLongBracketOpen(code, i);
      if (openLevel !== null) {
        const close = ']' + '='.repeat(openLevel) + ']';
        const open = '[' + '='.repeat(openLevel) + '[';
        const closeAt = code.indexOf(close, i + open.length);
        const end = closeAt === -1 ? len : closeAt + close.length;
        result += code.substring(i, end);
        i = end;
        continue;
      }

      // Comment: -- possibly followed by a long-bracket comment.
      if (char === '-' && code[i + 1] === '-') {
        const afterDashes = i + 2;
        const commentLevel = matchLongBracketOpen(code, afterDashes);
        if (commentLevel !== null) {
          // Long comment: --[[ ... ]] / --[=[ ... ]=].
          const open = '[' + '='.repeat(commentLevel) + '[';
          const close = ']' + '='.repeat(commentLevel) + ']';
          const closeAt = code.indexOf(close, afterDashes + open.length);
          const end = closeAt === -1 ? len : closeAt + close.length;
          const commentContent = code.substring(i, end);

          if (preserveLicense && isLicenseComment(commentContent)) {
            result += commentContent;
          } else if (keepEmptyLines) {
            const newlines = (commentContent.match(/\n/g) || []).length;
            result += '\n'.repeat(newlines);
          }
          i = end;
          continue;
        }

        // Plain line comment: -- to end of line.
        let j = afterDashes;
        let commentText = '--';
        while (j < len && code[j] !== '\n') {
          commentText += code[j];
          j++;
        }
        if (preserveLicense && isLicenseComment(commentText)) {
          result += commentText;
        } else {
          result = trimTrailingWsOnLastLine(result);
        }
        i = j;
        continue;
      }

      // Ordinary strings.
      if (char === '"' || char === "'") {
        let j = i + 1;
        result += char;
        while (j < len) {
          if (code[j] === '\\' && j + 1 < len) {
            result += code[j] + code[j + 1];
            j += 2;
            continue;
          }
          if (code[j] === '\n') break;
          if (code[j] === char) {
            result += code[j];
            j++;
            break;
          }
          result += code[j];
          j++;
        }
        i = j;
        continue;
      }

      result += char;
      i++;
    }

    if (!keepEmptyLines) {
      result = dropBlankLinesLocal(result);
    }
    return result;
  } catch (error) {
    return code;
  }
}

/**
 * If `code` at `index` begins a Lua long-bracket opener `[` `=`* `[`, returns
 * the number of `=` characters (the "level"); otherwise returns null.
 */
function matchLongBracketOpen(code: string, index: number): number | null {
  if (code[index] !== '[') return null;
  let k = index + 1;
  while (code[k] === '=') k++;
  if (code[k] === '[') return k - (index + 1);
  return null;
}

/**
 * Trims trailing spaces/tabs left on the current (last) line of `result`.
 */
function trimTrailingWsOnLastLine(result: string): string {
  const nl = result.lastIndexOf('\n');
  if (nl === -1) {
    return result.replace(/[ \t]+$/, '');
  }
  const head = result.substring(0, nl + 1);
  const tail = result.substring(nl + 1).replace(/[ \t]+$/, '');
  return head + tail;
}

/**
 * Drops blank (empty or whitespace-only) lines, mirroring the engine's cleanup.
 */
function dropBlankLinesLocal(text: string): string {
  const lines = text.split('\n');
  const cleaned: string[] = [];
  for (const line of lines) {
    if (line.trim().length > 0) {
      cleaned.push(line);
    }
  }
  return cleaned.join('\n');
}

/**
 * Removes comments from Elm code.
 *
 * Line comments start with `--`, block comments are delimited by `{-` ... `-}`
 * and may nest. Triple-quoted `"""` strings are matched before ordinary
 * double-quoted strings.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeElmComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '--' }],
    block: [{ open: '{-', close: '-}', nested: true }],
    strings: [
      { open: '"""', close: '"""', multiline: true, escape: '\\' },
      { open: '"', close: '"', escape: '\\' },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Ada code.
 *
 * Line comments start with `--`. Double-quoted strings are recognised (Ada
 * escapes a quote by doubling it, which the scanner handles naturally).
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeAdaComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '--' }],
    strings: [{ open: '"', close: '"', escape: null }],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from VHDL code.
 *
 * Line comments start with `--`. Double-quoted strings are recognised.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeVhdlComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '--' }],
    strings: [{ open: '"', close: '"', escape: null }],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from AppleScript code.
 *
 * Line comments start with `--` or `#`, block comments are delimited by
 * `(*` ... `*)` and may nest. Double-quoted strings are recognised.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeAppleScriptComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '--' }, { token: '#' }],
    block: [{ open: '(*', close: '*)', nested: true }],
    strings: [{ open: '"', close: '"', escape: '\\' }],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/* -------------------------------------------------------------------------- */
/* Group B — `;` line comments (Lisp / asm)                                   */
/* -------------------------------------------------------------------------- */

/**
 * Removes comments from Clojure code.
 *
 * Line comments start with `;`. Double-quoted strings are recognised.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeClojureComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: ';' }],
    strings: [{ open: '"', close: '"', escape: '\\' }],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Common Lisp code.
 *
 * Line comments start with `;`, block comments are delimited by `#|` ... `|#`
 * and may nest. Double-quoted strings are recognised.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeCommonLispComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: ';' }],
    block: [{ open: '#|', close: '|#', nested: true }],
    strings: [{ open: '"', close: '"', escape: '\\' }],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Scheme code.
 *
 * Line comments start with `;`, block comments are delimited by `#|` ... `|#`
 * and may nest. Double-quoted strings are recognised. The `#;` datum comment
 * is intentionally NOT implemented.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeSchemeComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: ';' }],
    block: [{ open: '#|', close: '|#', nested: true }],
    strings: [{ open: '"', close: '"', escape: '\\' }],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Emacs Lisp code.
 *
 * Line comments start with `;`. Double-quoted strings are recognised.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeEmacsLispComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: ';' }],
    strings: [{ open: '"', close: '"', escape: '\\' }],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Assembly code.
 *
 * Line comments start with `;`. Double- and single-quoted strings are
 * recognised.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeAssemblyComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: ';' }],
    strings: [
      { open: '"', close: '"', escape: '\\' },
      { open: "'", close: "'", escape: '\\' },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/* -------------------------------------------------------------------------- */
/* Group C — `%` line comments                                                */
/* -------------------------------------------------------------------------- */

/**
 * Removes comments from Erlang code.
 *
 * Line comments start with `%`. Double-quoted strings are recognised.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeErlangComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '%' }],
    strings: [{ open: '"', close: '"', escape: '\\' }],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from LaTeX code.
 *
 * `%` starts a comment to end of line UNLESS it is preceded by a backslash
 * (`\%` is a literal percent sign and is kept). There are no strings. License
 * comments and blank lines are honoured per the usual options. Implemented as
 * a per-line scan that tracks the backslash-escape state.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeLatexComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;

  try {
    const lines = code.split('\n');
    const result: string[] = [];

    for (const line of lines) {
      const commentIndex = findLatexCommentIndex(line);
      if (commentIndex === -1) {
        result.push(line);
        continue;
      }

      const comment = line.substring(commentIndex);
      const before = line.substring(0, commentIndex);

      if (preserveLicense && isLicenseComment(comment)) {
        result.push(line);
        continue;
      }

      const codeBefore = before.replace(/[ \t]+$/, '');
      if (codeBefore.length > 0) {
        result.push(codeBefore);
      } else if (keepEmptyLines) {
        result.push('');
      }
    }

    let out = result.join('\n');
    if (!keepEmptyLines) {
      out = dropBlankLinesLocal(out);
    }
    return out;
  } catch (error) {
    return code;
  }
}

/**
 * Finds the index of a LaTeX `%` comment in a line, ignoring an escaped `\%`.
 *
 * @param line - A single line of LaTeX
 * @returns Index of the comment `%`, or -1 if there is none
 */
function findLatexCommentIndex(line: string): number {
  let escaped = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '%') {
      return i;
    }
  }
  return -1;
}

/**
 * Removes comments from MATLAB code.
 *
 * Line comments start with `%`, block comments are delimited by `%{` ... `%}`.
 * Only double-quoted strings are treated as strings.
 *
 * LIMITATION: the single quote `'` is NOT treated as a string delimiter
 * because in MATLAB `'` is also the transpose operator, and pairing it would
 * corrupt far more code than it would protect. As a consequence, a `%` that
 * appears inside a single-quoted char array (e.g. `s = 'a%b';`) may be
 * over-removed. The `...` line continuation is intentionally NOT treated as a
 * comment.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeMatlabComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '%' }],
    block: [{ open: '%{', close: '%}' }],
    strings: [{ open: '"', close: '"', escape: null }],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Prolog code.
 *
 * Line comments start with `%`, block comments are delimited by `/*` ... `*\/`.
 * Double- and single-quoted strings are recognised.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removePrologComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '%' }],
    block: [{ open: '/*', close: '*/' }],
    strings: [
      { open: '"', close: '"', escape: '\\' },
      { open: "'", close: "'", escape: '\\' },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/* -------------------------------------------------------------------------- */
/* Group D — `(* *)` block comments                                           */
/* -------------------------------------------------------------------------- */

/**
 * Removes comments from OCaml code.
 *
 * Block comments are delimited by `(*` ... `*)` and may nest. OCaml has no
 * line comments. Double-quoted strings are recognised.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeOcamlComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    block: [{ open: '(*', close: '*)', nested: true }],
    strings: [{ open: '"', close: '"', escape: '\\' }],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from F# code.
 *
 * Line comments start with `//`, block comments are delimited by `(*` ... `*)`
 * and may nest. Double-quoted strings are recognised.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeFSharpComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '//' }],
    block: [{ open: '(*', close: '*)', nested: true }],
    strings: [{ open: '"', close: '"', escape: '\\' }],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Standard ML code.
 *
 * Block comments are delimited by `(*` ... `*)` and may nest. SML has no line
 * comments. Double-quoted strings are recognised.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeSmlComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    block: [{ open: '(*', close: '*)', nested: true }],
    strings: [{ open: '"', close: '"', escape: '\\' }],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Pascal / Delphi code.
 *
 * Line comments start with `//`. Block comments come in two non-nesting forms:
 * `(*` ... `*)` and `{` ... `}`. Single-quoted strings are recognised (Pascal
 * escapes a quote by doubling it, so no backslash escaping).
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removePascalComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '//' }],
    block: [
      { open: '(*', close: '*)' },
      { open: '{', close: '}' },
    ],
    strings: [{ open: "'", close: "'", escape: null }],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/* -------------------------------------------------------------------------- */
/* Group E — misc                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Removes comments from Visual Basic code.
 *
 * The primary line comment is the apostrophe `'` (VB has no single-quoted
 * strings; string literals are double-quoted and a literal quote is written by
 * doubling it). A light pre-pass also removes whole-line `REM` statements
 * (word-bounded, case-insensitive). `REM` inside a `"..."` string and
 * identifiers such as `REMOVE` are left untouched.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeVbComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;

  // Pre-pass: drop whole-line REM statements.
  const lines = code.split('\n');
  const kept: string[] = [];
  for (const line of lines) {
    if (/^(\s*)REM\b.*$/i.test(line)) {
      if (preserveLicense && isLicenseComment(line)) {
        kept.push(line);
      } else if (keepEmptyLines) {
        kept.push('');
      }
      continue;
    }
    kept.push(line);
  }
  const withoutRem = kept.join('\n');

  const spec: CommentSpec = {
    line: [{ token: "'" }],
    strings: [{ open: '"', close: '"', escape: null }],
  };
  return removeBySpec(withoutRem, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Batch (`.bat` / `.cmd`) code.
 *
 * Drops whole lines that are `REM` statements or `::` label-comments. There is
 * no string handling. Blank lines and license comments are honoured per the
 * usual options.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeBatchComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;

  try {
    const lines = code.split('\n');
    const result: string[] = [];

    for (const line of lines) {
      if (/^\s*(REM\b.*|::.*)$/i.test(line)) {
        if (preserveLicense && isLicenseComment(line)) {
          result.push(line);
        } else if (keepEmptyLines) {
          result.push('');
        }
        continue;
      }
      result.push(line);
    }

    let out = result.join('\n');
    if (!keepEmptyLines) {
      out = dropBlankLinesLocal(out);
    }
    return out;
  } catch (error) {
    return code;
  }
}

/**
 * Removes comments from Fortran (free-form) code.
 *
 * Line comments start with `!`. Double- and single-quoted strings are
 * recognised.
 *
 * LIMITATION: fixed-form column-1 `C` / `*` comments are intentionally NOT
 * implemented because in free-form source those characters are ordinary code
 * and treating them as comments produces too many false positives.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeFortranComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '!' }],
    strings: [
      { open: '"', close: '"', escape: null },
      { open: "'", close: "'", escape: null },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Vimscript code.
 *
 * A `"` starts a comment ONLY when it is at the start of a line (after optional
 * whitespace). A mid-line `"` is ambiguous between a string literal and a
 * comment, so inline `"` comments are deliberately LEFT IN PLACE to avoid
 * corrupting string literals (e.g. `echo "hi"`). Double-quoted strings are
 * otherwise treated as strings.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeVimComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '"', onlyAtLineStart: true }],
    strings: [{ open: '"', close: '"', escape: '\\' }],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}
