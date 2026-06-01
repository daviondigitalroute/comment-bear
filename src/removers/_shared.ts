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
}

const DEFAULT_STRINGS: StringDelimiter[] = [
  { open: '"', close: '"', escape: '\\', multiline: false },
];

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

    while (i < len) {
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
        while (j < len && code[j] !== '\n') {
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
            // Trim trailing whitespace left before an inline block comment.
            if (!commentContent.includes('\n')) {
              result = trimTrailingWhitespaceOnLastLine(result);
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
        while (j < len && code[j] !== '\n') {
          commentText += code[j];
          j++;
        }

        const keep =
          (preserveLicense && isLicenseComment(commentText)) ||
          preserve.some((re) => re.test(commentText));

        if (keep) {
          result += commentText;
        } else {
          // Trim trailing whitespace left before an inline line comment.
          result = trimTrailingWhitespaceOnLastLine(result);
        }
        // Do not consume the newline; the main loop handles it.
        i = j;
        matchedLine = true;
        break;
      }
      if (matchedLine) continue;

      // 4. Ordinary character.
      result += code[i];
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
