/**
 * Shared helpers and a generic comment-removal engine used by the
 * language-specific removers.
 *
 * The `removeBySpec` engine generalizes the char-scanner originally written
 * for Haskell in `other-remover.ts`: it copies string literals verbatim,
 * handles nested/non-nested block comments, line comments to end-of-line,
 * license preservation, directive preservation and `keepEmptyLines`.
 */

/**
 * Checks if a comment is a license comment.
 *
 * Returns true when the lowercased text contains any recognised
 * license/authorship marker. This is the union of every variant that was
 * previously copy-pasted across the individual removers.
 *
 * @param comment - The raw comment text (may include the comment tokens)
 * @returns true if the comment looks like a license/authorship comment
 */
export function isLicenseComment(comment: string): boolean {
  const lower = comment.toLowerCase();
  return lower.includes('copyright') ||
         lower.includes('license') ||
         lower.includes('licence') ||
         lower.includes('spdx') ||
         lower.includes('@license') ||
         lower.includes('@copyright') ||
         lower.includes('@author') ||
         lower.includes('author');
}

/**
 * A string-literal delimiter description.
 */
export interface StringDelimiter {
  /** Opening delimiter, e.g. '"' */
  open: string;
  /** Closing delimiter, e.g. '"' */
  close: string;
  /** Escape character (default '\\'); set to null to disable escaping. */
  escape?: string | null;
  /** Whether the string may span newlines (default false). */
  multiline?: boolean;
}

/**
 * A block-comment description.
 */
export interface BlockComment {
  /** Opening token, e.g. '/*' */
  open: string;
  /** Closing token, e.g. '*\/' */
  close: string;
  /** Whether block comments may nest (track depth). Default false. */
  nested?: boolean;
}

/**
 * A line-comment description.
 */
export interface LineComment {
  /** The token that starts the comment, e.g. '//' or '#'. */
  token: string;
  /**
   * If true, the token only starts a comment when it is at the start of the
   * line (only whitespace before it) OR immediately preceded by whitespace.
   */
  requireWhitespaceBefore?: boolean;
  /**
   * If true, the token only starts a comment when it is at the start of the
   * line (nothing but whitespace before it on the current line). This is
   * stricter than `requireWhitespaceBefore` (which also allows a token that is
   * merely preceded by whitespace mid-line). Used for languages such as
   * Vimscript where a mid-line `"` is ambiguous (string vs comment).
   */
  onlyAtLineStart?: boolean;
  /**
   * If the characters immediately following the token match one of these
   * strings, the token does NOT start a comment (e.g. PHP `#[`).
   */
  notIfFollowedBy?: string[];
}

/**
 * A full comment specification for a language.
 */
export interface CommentSpec {
  /** Line-comment tokens. */
  line?: LineComment[];
  /** Block-comment tokens. */
  block?: BlockComment[];
  /** String delimiters. Defaults to a single double-quoted, escapable string. */
  strings?: StringDelimiter[];
  /** A comment whose full text matches any pattern is kept verbatim (directives). */
  preserve?: RegExp[];
  /**
   * When true, the scanner recognises JavaScript-style regex literals
   * (`/.../flags`) and copies them verbatim. This prevents comment tokens
   * inside a regex body from being treated as comments and stops a regex body
   * from accidentally starting a comment. A leading `/` is disambiguated from
   * the division operator using the "previous significant token" heuristic
   * (see `regexCanStart`). Languages that do not set this flag are completely
   * unaffected.
   */
  regexLiterals?: boolean;
  /**
   * When true, an inline comment (block OR line) is removed WITHOUT trimming
   * the run of whitespace that preceded it on the current line. This
   * reproduces the historical JavaScript behaviour where removing an inline
   * comment leaves the surrounding spaces in place (e.g. an inline block
   * comment leaves two spaces, and `a = b; // c` -> `a = b; `). Languages that
   * do not set this flag keep the default behaviour of trimming that trailing
   * whitespace.
   */
  preserveInlineBlockWhitespace?: boolean;
}

const DEFAULT_STRINGS: StringDelimiter[] = [
  { open: '"', close: '"', escape: '\\', multiline: false },
];

/**
 * Returns true if `ch` terminates a line for the purposes of a line comment.
 * Besides the usual `\n`, this includes the carriage return `\r` (old-Mac /
 * CRLF files) and the Unicode line/paragraph separators U+2028 / U+2029, all of
 * which terminate a line in source code. A line comment must not swallow the
 * code that follows one of these terminators.
 */
function isLineTerminator(ch: string): boolean {
  const code = ch.charCodeAt(0);
  // 10 = LF, 13 = CR, 0x2028 = LINE SEPARATOR, 0x2029 = PARAGRAPH SEPARATOR.
  return code === 10 || code === 13 || code === 0x2028 || code === 0x2029;
}

/**
 * Removes blank lines from text, mirroring the Haskell remover's final
 * cleanup: any line that is empty or whitespace-only is dropped.
 */
function dropBlankLines(text: string): string {
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
 * Trims trailing whitespace left on the current (last) line of `result` after
 * an inline comment was dropped, without disturbing earlier lines.
 */
function trimTrailingWhitespaceOnLastLine(result: string): string {
  const nl = result.lastIndexOf('\n');
  if (nl === -1) {
    return result.replace(/[ \t]+$/, '');
  }
  const head = result.substring(0, nl + 1);
  const tail = result.substring(nl + 1).replace(/[ \t]+$/, '');
  return head + tail;
}

/**
 * Checks whether the text on the current line up to `index` is only
 * whitespace (i.e. the token at `index` is at "start of line").
 */
function onlyWhitespaceBeforeOnLine(code: string, index: number): boolean {
  let k = index - 1;
  while (k >= 0 && code[k] !== '\n') {
    if (code[k] !== ' ' && code[k] !== '\t' && code[k] !== '\r') {
      return false;
    }
    k--;
  }
  return true;
}

/**
 * Single-character tokens after which a `/` begins a regex literal rather than
 * acting as the division operator. These are positions where an expression
 * (and therefore a regex) is expected next.
 *
 * NOTE: `<` and `>` are deliberately EXCLUDED. Although they are
 * expression-prefix operators in plain JS (e.g. `a < /re/`, which is
 * essentially never written), treating them as regex starts would misread JSX
 * closing tags such as `</p>` as the start of a regex literal and swallow the
 * following code up to the next `/`. Excluding them keeps JSX intact at the
 * negligible cost of the `a < /re/` corner case.
 */
const REGEX_PREFIX_CHARS = new Set<string>([
  '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';',
  '+', '-', '*', '%', '^', '~',
]);

/**
 * Keywords after which a `/` begins a regex literal (e.g. `return /x/`).
 */
const REGEX_PREFIX_KEYWORDS = new Set<string>([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
  'do', 'else', 'yield', 'await', 'case',
]);

/** A character class test for JavaScript identifier characters. */
function isIdentChar(ch: string): boolean {
  return (
    (ch >= 'a' && ch <= 'z') ||
    (ch >= 'A' && ch <= 'Z') ||
    (ch >= '0' && ch <= '9') ||
    ch === '_' ||
    ch === '$'
  );
}

/**
 * Incrementally-maintained description of the previous significant token, used
 * to disambiguate a `/` (regex literal vs division operator) in O(1) without
 * ever re-scanning the growing output. See {@link ScannerState}.
 */
type PrevTokenKind =
  // No significant token yet (start of input, or only comments/whitespace so
  // far). A `/` here begins a regex.
  | 'none'
  // A value-producing token whose text is a single operator/punctuator we track
  // via `prevChar` (the last emitted significant char). Used for the
  // REGEX_PREFIX_CHARS lookup.
  | 'punct'
  // An identifier or keyword run (its text is in `prevWord`).
  | 'word'
  // A numeric literal run.
  | 'number'
  // A completed value: string/template/regex literal, or a postfix `++`/`--`,
  // or a closing `)`/`]`/value-`}`. A `/` after a value is always DIVISION.
  | 'value'
  // Transient: a single `+`/`-` that immediately follows a value-producing
  // token. If the next char is the same operator it completes a postfix
  // `++`/`--` (→ 'value'); otherwise it behaves like an ordinary operator
  // (allows a regex). Never read by callers other than `updatePrevToken` and
  // `regexCanStart`'s default branch.
  | '__pre_incdec__';

/**
 * Mutable scanner state for regex-vs-divide disambiguation. Updated in O(1) as
 * each real (non-comment) character is emitted to the output, so deciding
 * whether a `/` starts a regex never re-scans the ever-growing `result` string
 * (which would be O(n) per slash → O(n²) overall).
 */
interface ScannerState {
  /** Kind of the previous significant token. */
  prevKind: PrevTokenKind;
  /** Last significant (non-whitespace) character emitted. '' at start. */
  prevChar: string;
  /** The current identifier/keyword run when `prevKind === 'word'`. */
  prevWord: string;
}

/**
 * Updates the incremental scanner state for a single emitted source character
 * `ch` that is NOT part of a string/regex/template literal and NOT part of a
 * comment (comments are whitespace-equivalent for token tracking). This is the
 * O(1) replacement for re-scanning the output for the previous significant
 * character and trailing identifier run.
 *
 * Whitespace does not change the previous significant token. An identifier
 * character extends (or starts) a `word`/`number` run. Any other character is a
 * punctuator: we additionally detect postfix `++`/`--` (a second `+`/`-`
 * immediately following the same operator that was itself preceded by a value /
 * identifier / number / `)` / `]`) and the value-closers `)` and `]`, marking
 * them as a `value` so a following `/` is treated as division.
 */
function updatePrevToken(state: ScannerState, ch: string): void {
  if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
    // Whitespace separates tokens but is not itself significant.
    return;
  }

  if (isIdentChar(ch)) {
    // Continue or start an identifier/number run. A run that begins with a
    // digit is a number; otherwise it is a word/identifier. Once it is a word
    // (started with a letter/_/$) it stays a word even if digits follow.
    if (state.prevKind === 'word') {
      state.prevWord += ch;
    } else if (state.prevKind === 'number') {
      // Stay a number (digits, or numeric-literal letters like e/x/n/_).
    } else {
      if (ch >= '0' && ch <= '9') {
        state.prevKind = 'number';
      } else {
        state.prevKind = 'word';
        state.prevWord = ch;
      }
    }
    state.prevChar = ch;
    return;
  }

  // Non-identifier, non-whitespace: a punctuator/operator.
  const prevChar = state.prevChar;
  const prevKind = state.prevKind;

  // Postfix `++` / `--`: the second operator char of a pair, where the FIRST
  // operator was preceded by a value-producing token (identifier, number,
  // value, `)` or `]`). In that position `a++` / `a--` is a postfix update and
  // yields a value, so a subsequent `/` is division. (A prefix `++a` is
  // preceded by an operator/start, so it is correctly NOT treated as a value.)
  if (
    (ch === '+' || ch === '-') &&
    prevChar === ch &&
    prevKind === '__pre_incdec__'
  ) {
    state.prevKind = 'value';
    state.prevChar = ch;
    return;
  }

  if (ch === '+' || ch === '-') {
    // Record whether this single operator char follows a value. If so, a
    // following identical operator char completes a postfix `++`/`--`. We use a
    // private transient kind so the `value`-detection above only fires for a
    // true `valueOp op` pair, not for `= ++a` etc.
    if (
      prevKind === 'word' ||
      prevKind === 'number' ||
      prevKind === 'value'
    ) {
      state.prevKind = '__pre_incdec__';
    } else {
      state.prevKind = 'punct';
    }
    state.prevChar = ch;
    return;
  }

  // Closers that yield a value: `)` (call/group) and `]` (index/array). A `/`
  // after these is division. `}` is left as a generic punctuator because a
  // block-closing `}` legitimately allows a regex (`{ }/re/` is essentially
  // never written, and treating `}` as a value would regress object-literal /
  // block ambiguity in the conservative direction the original heuristic chose).
  if (ch === ')' || ch === ']') {
    state.prevKind = 'value';
    state.prevChar = ch;
    return;
  }

  state.prevKind = 'punct';
  state.prevChar = ch;
}

/**
 * Marks the previous significant token as a completed VALUE literal (string,
 * template or regex literal). A `/` immediately after such a literal is the
 * division operator, never a regex. The exact `prevChar` is irrelevant for the
 * decision, but we set it to the literal's last character for completeness.
 */
function markValueLiteral(state: ScannerState, lastChar: string): void {
  state.prevKind = 'value';
  state.prevChar = lastChar || 'x';
}

/**
 * Decides whether a `/` at the current position begins a regex literal, given
 * the incrementally-tracked previous significant token.
 *
 * A regex can start when no significant token precedes it, or when the previous
 * token is one of the expression-prefix punctuators (see REGEX_PREFIX_CHARS) or
 * a known regex-prefix keyword (e.g. `return`). It is DIVISION when the previous
 * token produced a value: an identifier, a number, a string/template/regex
 * literal, a postfix `++`/`--`, or a `)`/`]` closer.
 *
 * @param state - The incremental scanner state at the slash.
 * @returns true if a regex literal can start here.
 */
function regexCanStart(state: ScannerState): boolean {
  switch (state.prevKind) {
    case 'none':
      return true;
    case 'value':
    case 'number':
      // A completed value or a number literal → division.
      return false;
    case 'word':
      // Only a known keyword (return/typeof/...) allows a regex; a plain
      // identifier means division.
      return REGEX_PREFIX_KEYWORDS.has(state.prevWord);
    case 'punct':
    default:
      // A lone operator char that lives in the regex-prefix set allows a regex;
      // the transient `__pre_incdec__` kind (a single `+`/`-` after a value)
      // also behaves like an operator and allows a regex (e.g. `a + /re/`).
      if (REGEX_PREFIX_CHARS.has(state.prevChar)) return true;
      return false;
  }
}

/**
 * Scans a JavaScript regex literal starting at `start` (which must point at the
 * opening `/`). Handles `\` escapes and `[...]` character classes (a `/` inside
 * a character class does not terminate the literal). Trailing flag letters are
 * consumed. A raw newline before the closing `/` (outside a class) means this
 * was not a valid regex literal.
 *
 * @param code - The full source.
 * @param start - Index of the opening `/`.
 * @returns The index just past the regex literal (including flags), or -1 if the
 *   text at `start` is not a well-formed single-line regex literal.
 */
function scanRegexLiteral(code: string, start: number): number {
  const len = code.length;
  let j = start + 1; // skip opening '/'
  let inClass = false;
  while (j < len) {
    const c = code[j];
    if (c === '\\') {
      // Escaped char: copy the next char verbatim (cannot end the regex).
      if (j + 1 >= len) return -1;
      j += 2;
      continue;
    }
    if (isLineTerminator(c)) {
      // Regex literals cannot span a raw line terminator.
      return -1;
    }
    if (inClass) {
      if (c === ']') inClass = false;
      j++;
      continue;
    }
    if (c === '[') {
      inClass = true;
      j++;
      continue;
    }
    if (c === '/') {
      // End of the regex body; consume trailing flag letters.
      j++;
      while (j < len && /[a-z]/i.test(code[j])) {
        j++;
      }
      return j;
    }
    j++;
  }
  // Reached end of input without a closing '/'.
  return -1;
}

/**
 * Generic, spec-driven comment remover.
 *
 * Scans char-by-char. String literals are copied verbatim. Block and line
 * comments are dropped unless they are preserved (license or directive).
 * Never throws: on any unexpected error the original code is returned.
 *
 * @param code - Source code
 * @param spec - Comment specification for the language
 * @param preserveLicense - Keep comments that look like license comments
 * @param keepEmptyLines - Keep blank lines where comments used to be
 * @returns The code with comments removed
 */
export function removeBySpec(
  code: string,
  spec: CommentSpec,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;

  try {
    const strings = spec.strings && spec.strings.length > 0 ? spec.strings : DEFAULT_STRINGS;
    const blocks = spec.block || [];
    const lines = spec.line || [];
    const preserve = spec.preserve || [];

    let result = '';
    let i = 0;
    const len = code.length;
    const regexLiterals = spec.regexLiterals === true;
    const preserveInlineBlockWhitespace = spec.preserveInlineBlockWhitespace === true;

    // Defense-in-depth safety valve: a correct linear scan advances `i` (or
    // appends to `result`) on every iteration, so it can never exceed a small
    // multiple of the input length. If it somehow does (a logic bug), bail out
    // and return the original code rather than spinning. This guarantees the
    // function always terminates quickly regardless of input.
    const maxIterations = len * 4 + 16;
    let iterations = 0;

    // Incremental "previous significant token" tracker for regex-vs-divide
    // disambiguation. Maintained in O(1) per emitted code character so the
    // regex decision NEVER re-scans the growing `result` (which would be O(n)
    // per `/` → O(n²) overall). Only updated when the spec opts into regex
    // literals; other languages never consult it.
    const state: ScannerState = { prevKind: 'none', prevChar: '', prevWord: '' };

    while (i < len) {
      if (++iterations > maxIterations) {
        return code;
      }

      // R. Regex literals (opt-in via `spec.regexLiterals`). A `/` is examined
      // BEFORE comments only when the preceding significant token indicates a
      // regex context. Comment detection still takes precedence: a `/`
      // immediately followed by `/` or `*` is always a `//`/`/*` comment, never
      // a regex (a regex matching those chars is written `/\//`, `/\*/`, `/[/]/`
      // or `/[*]/`, so the char after the opening `/` is never `/` or `*`).
      // Outside a regex context the slash falls through to the comment/divide
      // logic below. This block only runs when a spec opts in, so no other
      // language is affected.
      if (
        regexLiterals &&
        code[i] === '/' &&
        code[i + 1] !== '/' &&
        code[i + 1] !== '*'
      ) {
        if (regexCanStart(state)) {
          const end = scanRegexLiteral(code, i);
          if (end !== -1) {
            result += code.substring(i, end);
            // A regex literal is a value: a following `/` is division.
            markValueLiteral(state, code[end - 1]);
            i = end;
            continue;
          }
          // Not a well-formed single-line regex: fall through so the
          // comment/divide logic handles it.
        }
      }

      // 0. Line comments flagged `onlyAtLineStart` are checked BEFORE strings.
      // This is required for languages (e.g. Vimscript) whose line-comment
      // token coincides with a string delimiter (`"`): at line start the token
      // must be read as a comment, not as the opening of a string. This block
      // is purely additive — it only fires when a spec opts in via
      // `onlyAtLineStart`, which no pre-Phase-3 spec does.
      let matchedLineStart = false;
      for (const l of lines) {
        if (!l.onlyAtLineStart) continue;
        if (!code.startsWith(l.token, i)) continue;
        if (!onlyWhitespaceBeforeOnLine(code, i)) continue;

        if (l.notIfFollowedBy && l.notIfFollowedBy.length > 0) {
          const after = code.substring(i + l.token.length);
          if (l.notIfFollowedBy.some((s) => s.length > 0 && after.startsWith(s))) {
            continue;
          }
        }

        let j = i + l.token.length;
        let commentText = l.token;
        while (j < len && !isLineTerminator(code[j])) {
          commentText += code[j];
          j++;
        }

        const keep =
          (preserveLicense && isLicenseComment(commentText)) ||
          preserve.some((re) => re.test(commentText));

        if (keep) {
          result += commentText;
        } else {
          result = trimTrailingWhitespaceOnLastLine(result);
        }
        i = j;
        matchedLineStart = true;
        break;
      }
      if (matchedLineStart) continue;

      // 1. String literals - copied verbatim.
      let matchedString = false;
      for (const s of strings) {
        if (code.startsWith(s.open, i)) {
          const escape = s.escape === undefined ? '\\' : s.escape;
          const multiline = s.multiline === true;
          let j = i + s.open.length;
          result += s.open;
          while (j < len) {
            // Escape handling.
            if (escape !== null && code[j] === escape && j + 1 < len) {
              result += code[j] + code[j + 1];
              j += 2;
              continue;
            }
            // Non-multiline strings terminate at a newline.
            if (!multiline && code[j] === '\n') {
              break;
            }
            // Closing delimiter.
            if (code.startsWith(s.close, j)) {
              result += s.close;
              j += s.close.length;
              break;
            }
            result += code[j];
            j++;
          }
          i = j;
          matchedString = true;
          // A string/template literal is a value: a following `/` is division.
          if (regexLiterals) markValueLiteral(state, s.close);
          break;
        }
      }
      if (matchedString) continue;

      // 2. Block comments.
      let matchedBlock = false;
      for (const b of blocks) {
        if (code.startsWith(b.open, i)) {
          let commentContent = b.open;
          let j = i + b.open.length;
          if (b.nested) {
            let depth = 1;
            while (j < len && depth > 0) {
              if (code.startsWith(b.open, j)) {
                depth++;
                commentContent += b.open;
                j += b.open.length;
              } else if (code.startsWith(b.close, j)) {
                depth--;
                commentContent += b.close;
                j += b.close.length;
              } else {
                commentContent += code[j];
                j++;
              }
            }
          } else {
            const closeAt = code.indexOf(b.close, j);
            if (closeAt === -1) {
              commentContent += code.substring(j);
              j = len;
            } else {
              commentContent += code.substring(j, closeAt + b.close.length);
              j = closeAt + b.close.length;
            }
          }

          const keep =
            (preserveLicense && isLicenseComment(commentContent)) ||
            preserve.some((re) => re.test(commentContent));

          if (keep) {
            result += commentContent;
          } else {
            // Drop it. Preserve newline count when keepEmptyLines.
            if (keepEmptyLines) {
              const newlines = (commentContent.match(/\n/g) || []).length;
              result += '\n'.repeat(newlines);
            }
            // Trim trailing whitespace left before a single-line block comment.
            // A full-line block comment (only whitespace before it) is always
            // trimmed so the line collapses; an inline one keeps its leading
            // whitespace when the spec opts in via `preserveInlineBlockWhitespace`
            // (historical JS behaviour leaves the surrounding spaces, e.g.
            // `a; /` + `* c *` + `/ b` -> `a;  b`).
            if (!commentContent.includes('\n')) {
              const fullLine = onlyWhitespaceBeforeOnLine(code, i);
              if (fullLine || !preserveInlineBlockWhitespace) {
                result = trimTrailingWhitespaceOnLastLine(result);
              }
            }
          }
          i = j;
          matchedBlock = true;
          break;
        }
      }
      if (matchedBlock) continue;

      // 3. Line comments.
      let matchedLine = false;
      for (const l of lines) {
        if (!code.startsWith(l.token, i)) continue;

        // requireWhitespaceBefore: token must be at line start (only
        // whitespace before) OR immediately preceded by whitespace.
        if (l.requireWhitespaceBefore) {
          const prev = i > 0 ? code[i - 1] : '\n';
          const prevIsWs = prev === ' ' || prev === '\t' || prev === '\r' || prev === '\n';
          if (!prevIsWs && !onlyWhitespaceBeforeOnLine(code, i)) {
            continue;
          }
        }

        // onlyAtLineStart: token must be at the start of the line (only
        // whitespace before it on the current line). Stricter than
        // requireWhitespaceBefore.
        if (l.onlyAtLineStart && !onlyWhitespaceBeforeOnLine(code, i)) {
          continue;
        }

        // notIfFollowedBy: the char(s) right after the token disqualify it.
        if (l.notIfFollowedBy && l.notIfFollowedBy.length > 0) {
          const after = code.substring(i + l.token.length);
          if (l.notIfFollowedBy.some((s) => s.length > 0 && after.startsWith(s))) {
            continue;
          }
        }

        // Collect the comment to end of line.
        let j = i + l.token.length;
        let commentText = l.token;
        while (j < len && !isLineTerminator(code[j])) {
          commentText += code[j];
          j++;
        }

        const keep =
          (preserveLicense && isLicenseComment(commentText)) ||
          preserve.some((re) => re.test(commentText));

        if (keep) {
          result += commentText;
        } else {
          // A full-line comment (only whitespace before it on the line) always
          // has its leading indentation trimmed so the line becomes empty.
          // For an inline comment (code before it) the trailing whitespace is
          // trimmed by default, but kept when the spec opts in via
          // `preserveInlineBlockWhitespace` (historical JS behaviour where
          // `a = b; // c` -> `a = b; `).
          const fullLine = onlyWhitespaceBeforeOnLine(code, i);
          if (fullLine || !preserveInlineBlockWhitespace) {
            result = trimTrailingWhitespaceOnLastLine(result);
          }
        }
        // Do not consume the newline; the main loop handles it.
        i = j;
        matchedLine = true;
        break;
      }
      if (matchedLine) continue;

      // 4. Ordinary character.
      result += code[i];
      // Track the previous significant token in O(1) (no re-scan of `result`).
      if (regexLiterals) updatePrevToken(state, code[i]);
      i++;
    }

    if (!keepEmptyLines) {
      result = dropBlankLines(result);
    }

    return result;
  } catch (error) {
    return code;
  }
}
