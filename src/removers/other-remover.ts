import { isLicenseComment } from './_shared';

/**
 * Removes comments from JSON code (JSON5 style)
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments (not supported for JSON)
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeJsonComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;
  
  try {
    // Simplified implementation for removing // and /* */ comments from JSON
    let result = '';
    let inString = false;
    let inSingleLineComment = false;
    let inMultiLineComment = false;
    let stringChar = '';
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const nextChar = i < code.length - 1 ? code[i + 1] : '';
      
      // If we're in a string, just add the character
      if (inString) {
        result += char;
        if (char === stringChar && code[i - 1] !== '\\') {
          inString = false;
        }
        continue;
      }
      
      // Check for string start
      if (char === '"' || char === "'") {
        inString = true;
        stringChar = char;
        result += char;
        continue;
      }
      
      // If we're in a single-line comment
      if (inSingleLineComment) {
        if (char === '\n') {
          inSingleLineComment = false;
          result += char;  // Preserve newline
        }
        continue;
      }
      
      // If we're in a multi-line comment
      if (inMultiLineComment) {
        if (char === '*' && nextChar === '/') {
          inMultiLineComment = false;
          i++;  // Skip '/'
        } else if (char === '\n' && keepEmptyLines) {
          // Preserve the newline count of removed block comments.
          result += char;
        }
        continue;
      }
      
      // Check for start of single-line comment
      if (char === '/' && nextChar === '/') {
        inSingleLineComment = true;
        i++;  // Skip second '/'
        continue;
      }
      
      // Check for start of multi-line comment
      if (char === '/' && nextChar === '*') {
        inMultiLineComment = true;
        i++;  // Skip '*'
        continue;
      }
      
      // Normal character
      result += char;
    }
    
    return result;
  } catch (error) {
    console.error('Error removing JSON comments:', error);
    return code;
  }
}

/**
 * Removes comments from YAML code
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines
 * @returns Processed code
 */
export function removeYamlComments(
  code: string, 
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;
  
  const lines = code.split('\n');
  const result: string[] = [];

  // Block-scalar state. A `key: |` or `key: >` (with optional `-`/`+`/digit
  // indicators) introduces a literal/folded block scalar whose more-indented
  // following lines are STRING CONTENT, not YAML — a `#` there is not a comment
  // and must be preserved verbatim. The block ends at the first non-blank line
  // indented at or below the indentation of the line that introduced it.
  let inBlockScalar = false;
  let blockIndent = 0;

  const indentOf = (s: string): number => {
    let n = 0;
    while (n < s.length && (s[n] === ' ' || s[n] === '\t')) n++;
    return n;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (inBlockScalar) {
      // Blank lines stay inside the block; a non-blank line that is not more
      // indented than the introducer ends the block.
      if (trimmed.length === 0 || indentOf(line) > blockIndent) {
        result.push(line); // verbatim — no comment stripping inside a block scalar
        continue;
      }
      inBlockScalar = false; // fall through and process this line normally
    }

    // Empty line or just a comment
    if (trimmed.startsWith('#')) {
      if (preserveLicense && isLicenseComment(trimmed)) {
        result.push(line);
      } else if (keepEmptyLines) {
        result.push('');
      }
      continue;
    }

    // Line with code and comment.
    // In YAML, '#' only starts a comment when it is at the start of the line
    // (after leading whitespace) or is immediately preceded by whitespace.
    const commentIndex = findYamlCommentIndex(line);
    let emitted: string;
    if (commentIndex !== -1) {
      const codeBeforeComment = line.substring(0, commentIndex).trimEnd();
      if (codeBeforeComment.length > 0) {
        emitted = codeBeforeComment;
        result.push(emitted);
      } else {
        emitted = '';
        if (keepEmptyLines) result.push('');
      }
    } else {
      emitted = line;
      result.push(line);
    }

    // After emitting the (comment-stripped) line, detect a block-scalar
    // introducer: a `|` or `>` indicator at the END of the value, optionally
    // followed by `-`/`+` and/or a digit (e.g. `|`, `|-`, `>+`, `|2`, `|2-`).
    if (/(^|[\s:])[|>][0-9]*[-+]?\s*$/.test(emitted)) {
      inBlockScalar = true;
      blockIndent = indentOf(line);
    }
  }

  return result.join('\n');
}

/**
 * Finds the index of a YAML '#' comment in a line.
 *
 * Unlike a bare '#' scan, a '#' only starts a comment when it is at the start
 * of the line (only whitespace before it) or is immediately preceded by a
 * whitespace character. This keeps values such as `url: http://x#frag` and
 * `color:#fff` intact while still stripping `a: 1 # comment`. The '#' inside
 * quoted strings is ignored.
 *
 * @param line - A single line of YAML
 * @returns Index of the comment '#', or -1 if there is none
 */
function findYamlCommentIndex(line: string): number {
  let inString = false;
  let stringChar = '';
  let escapeNext = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"' || char === "'") {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }

    if (char === '#' && !inString) {
      const prev = i > 0 ? line[i - 1] : '';
      const atLineStart = i === 0 || line.substring(0, i).trim().length === 0;
      const precededByWhitespace = prev === ' ' || prev === '\t';
      if (atLineStart || precededByWhitespace) {
        return i;
      }
    }
  }

  return -1;
}

/** Matching close delimiter for paired bracket percent-literal delimiters. */
const RUBY_PAIRED_DELIMITERS: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
  '<': '>',
};

/**
 * Scans Ruby source and replaces percent literals (`%q{...}`, `%w[...]`,
 * `%r{...}`, `%(...)`, etc.) and heredoc bodies with opaque placeholders so a
 * `#` inside them is never treated as a comment. The scan is a single O(n)
 * pass that tracks string state, so a `%` or `<<` inside a string or after a
 * value (where it is the modulo/left-shift operator) is left untouched.
 *
 * Returns the rewritten source plus the placeholder -> original-content map.
 */
function protectRubyLiterals(code: string): {
  text: string;
  literals: string[];
} {
  const literals: string[] = [];
  let out = '';
  let i = 0;
  const n = code.length;
  // Tracks the previous significant (non-space) char on the current logical
  // position to decide value-position for `%` and `<<`. Reset at newlines.
  let prevSignificant = '';

  const addPlaceholder = (content: string): string => {
    const id = `__PERCENT_LITERAL_${literals.length}__`;
    literals.push(content);
    return id;
  };

  while (i < n) {
    const ch = code[i];

    if (ch === '\n') {
      out += ch;
      prevSignificant = '';
      i++;
      continue;
    }

    if (ch === ' ' || ch === '\t') {
      out += ch;
      i++;
      continue;
    }

    // Line comment: everything until end of line is left as-is (the
    // line-based pass strips it later); but we must not scan inside it for
    // literals.
    if (ch === '#') {
      const eol = code.indexOf('\n', i);
      const end = eol === -1 ? n : eol;
      out += code.substring(i, end);
      i = end;
      continue;
    }

    // String literals: copy verbatim (handle escapes).
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      let j = i + 1;
      while (j < n) {
        if (code[j] === '\\') {
          j += 2;
          continue;
        }
        if (code[j] === quote) {
          j++;
          break;
        }
        j++;
      }
      out += code.substring(i, j);
      prevSignificant = quote;
      i = j;
      continue;
    }

    // Percent literals: %q{...}, %w[...], %r{...}, %(...), %!...!, etc.
    // Only in value position (otherwise `%` is the modulo operator).
    if (ch === '%') {
      const prevIsValue = prevSignificant !== '' && isRubyValueChar(prevSignificant);
      let p = i + 1;
      // Optional type char.
      if (p < n && /[qQrRwWiIsx]/.test(code[p])) {
        p++;
      }
      const delim = p < n ? code[p] : '';
      const delimIsValid = delim !== '' && /[^\w\s]/.test(delim);
      if (!prevIsValue && delimIsValid) {
        const close = RUBY_PAIRED_DELIMITERS[delim];
        let j = p + 1;
        let found = -1;
        if (close) {
          // Nesting-aware scan for paired brackets.
          let depth = 1;
          while (j < n) {
            const c = code[j];
            if (c === '\\') {
              j += 2;
              continue;
            }
            if (c === delim) {
              depth++;
            } else if (c === close) {
              depth--;
              if (depth === 0) {
                found = j;
                break;
              }
            }
            j++;
          }
        } else {
          // Non-paired delimiter: same char closes it.
          while (j < n) {
            const c = code[j];
            if (c === '\\') {
              j += 2;
              continue;
            }
            if (c === delim) {
              found = j;
              break;
            }
            j++;
          }
        }
        if (found !== -1) {
          out += addPlaceholder(code.substring(i, found + 1));
          prevSignificant = 'a'; // a literal is a value
          i = found + 1;
          continue;
        }
        // Unterminated: fall through, treat `%` literally.
      }
      out += ch;
      prevSignificant = '%';
      i++;
      continue;
    }

    // Heredocs: <<~TAG / <<-TAG / <<TAG and quoted forms <<'TAG' / <<"TAG".
    // Only a heredoc in value position; `a << b` (shift) is excluded because
    // the previous significant char is a value, and `<< 2` (space/digit after)
    // is the shift operator too.
    if (ch === '<' && i + 1 < n && code[i + 1] === '<') {
      const prevIsValue = prevSignificant !== '' && isRubyValueChar(prevSignificant);
      const m = code
        .substring(i)
        .match(/^<<([~-]?)(?:(['"])([A-Za-z_]\w*)\2|([A-Za-z_]\w*))/);
      if (!prevIsValue && m) {
        const squiggly = m[1]; // '', '~', or '-'
        const tag = m[3] !== undefined ? m[3] : m[4];
        const allowIndent = squiggly === '~' || squiggly === '-';
        // The heredoc opener stays on the current line; its body begins on the
        // next line and ends at a line whose (optionally indented) trimmed
        // content equals the tag.
        const headerEnd = i + m[0].length;
        const bodyStart = code.indexOf('\n', headerEnd);
        if (bodyStart !== -1) {
          // Find the terminator line.
          let lineStart = bodyStart + 1;
          let bodyEnd = -1;
          while (lineStart <= n) {
            let lineEnd = code.indexOf('\n', lineStart);
            if (lineEnd === -1) lineEnd = n;
            const lineText = code.substring(lineStart, lineEnd);
            const matchesTag = allowIndent
              ? lineText.trim() === tag
              : lineText === tag;
            if (matchesTag) {
              bodyEnd = lineEnd;
              break;
            }
            if (lineEnd === n) break;
            lineStart = lineEnd + 1;
          }
          if (bodyEnd !== -1) {
            // Emit the header (up to and including the newline) untouched so
            // any inline comment after the opener is still processed, then
            // protect the body (including the terminator tag line).
            out += code.substring(i, bodyStart + 1);
            out += addPlaceholder(code.substring(bodyStart + 1, bodyEnd));
            prevSignificant = '';
            i = bodyEnd;
            continue;
          }
        }
      }
      // Not a heredoc: emit `<<` and continue (shift operator).
      out += '<<';
      prevSignificant = '<';
      i += 2;
      continue;
    }

    out += ch;
    prevSignificant = ch;
    i++;
  }

  return { text: out, literals };
}

/**
 * Removes comments from Ruby code
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines
 * @returns Processed code
 */
export function removeRubyComments(
  code: string, 
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;
  
  // First, protect percent literals (e.g., %q{}, %w[], %r{}, etc.) and heredoc
  // bodies so a `#` inside them is never treated as a comment. This is a
  // single O(n) index-based pass (no repeated full-string replace).
  const { text: withProtectedLiterals, literals: percentLiterals } =
    protectRubyLiterals(code);

  // Process the code with percent literals protected
  let result = '';
  const lines = withProtectedLiterals.split('\n');
  let inMultilineComment = false;
  let multilineBuffer: string[] = [];
  let isLicenseBlock = false;
  
  for (const line of lines) {
    const trimmed = line.trim();

    // Note: protected percent-literal / heredoc placeholders are plain word
    // tokens (no `#`), so the normal comment scan below leaves them intact
    // while still stripping any real comment that follows them on the line.

    // Multiline comments =begin ... =end
    if (trimmed.startsWith('=begin')) {
      inMultilineComment = true;
      multilineBuffer = [line];
      isLicenseBlock = preserveLicense && isLicenseComment(line);
      if (!isLicenseBlock && keepEmptyLines) {
        result += '\n';
      }
      continue;
    }
    
    if (inMultilineComment) {
      multilineBuffer.push(line);
      
      if (trimmed.startsWith('=end')) {
        inMultilineComment = false;
        
        if (preserveLicense) {
          const blockContent = multilineBuffer.join('\n');
          if (isLicenseBlock || isLicenseComment(blockContent)) {
            result += multilineBuffer.join('\n') + '\n';
          } else if (keepEmptyLines) {
            result += '\n'.repeat(multilineBuffer.length);
          }
        } else if (keepEmptyLines) {
          result += '\n'.repeat(multilineBuffer.length);
        }
        
        multilineBuffer = [];
        isLicenseBlock = false;
      }
      continue;
    }
    
    // Handle single line comments with #, but not in strings or regex
    const commentIndex = findCommentIndex(line);
    if (commentIndex !== -1) {
      const codeBeforeComment = line.substring(0, commentIndex).trimEnd();
      const comment = line.substring(commentIndex);
      
      if (codeBeforeComment.length > 0) {
        // There's code before the comment
        if (preserveLicense && isLicenseComment(comment)) {
          result += line + '\n';
        } else {
          result += codeBeforeComment + '\n';
        }
      } else {
        // The line is *only* a comment
        if (preserveLicense && isLicenseComment(comment)) {
          result += line + '\n';
        } else if (keepEmptyLines) {
          result += '\n';
        }
      }
      continue;
    }
    
    // No comment on this line
    result += line + '\n';
  }
  
  // Restore percent literals and heredoc bodies
  result = result.replace(/__PERCENT_LITERAL_(\d+)__/g, (_, index) => {
    const literal = percentLiterals[parseInt(index)];
    return literal !== undefined ? literal : '';
  });
  
  return result.trimEnd();
}

/**
 * Removes comments from Haskell code
 * Handles -- line comments and {- -} block comments (including nested)
 * Preserves {-# #-} pragmas
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines
 * @returns Processed code
 */
export function removeHaskellComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;

  let result = '';
  let i = 0;
  const len = code.length;

  while (i < len) {
    const char = code[i];
    const next = i + 1 < len ? code[i + 1] : '';

    // String literal (double quotes)
    if (char === '"') {
      let j = i + 1;
      result += char;
      while (j < len && code[j] !== '"') {
        if (code[j] === '\\' && j + 1 < len) {
          result += code[j] + code[j + 1];
          j += 2;
        } else {
          result += code[j];
          j++;
        }
      }
      if (j < len) {
        result += code[j]; // closing quote
        j++;
      }
      i = j;
      continue;
    }

    // Character literal (single quotes) - e.g. 'a', '\n'
    if (char === "'" && i + 2 < len) {
      // Check for character literal pattern: 'x' or '\x'
      if (code[i + 1] === '\\' && i + 3 < len && code[i + 3] === "'") {
        result += code.substring(i, i + 4);
        i += 4;
        continue;
      }
      if (code[i + 2] === "'") {
        result += code.substring(i, i + 3);
        i += 3;
        continue;
      }
    }

    // Pragma: {-# ... #-} - always preserve
    if (char === '{' && next === '-' && i + 2 < len && code[i + 2] === '#') {
      const pragmaEnd = code.indexOf('#-}', i + 3);
      if (pragmaEnd !== -1) {
        result += code.substring(i, pragmaEnd + 3);
        i = pragmaEnd + 3;
        continue;
      }
    }

    // Block comment: {- ... -} (may be nested)
    if (char === '{' && next === '-') {
      let depth = 1;
      let j = i + 2;
      let commentContent = '{-';
      while (j < len && depth > 0) {
        if (code[j] === '{' && j + 1 < len && code[j + 1] === '-') {
          depth++;
          commentContent += '{-';
          j += 2;
        } else if (code[j] === '-' && j + 1 < len && code[j + 1] === '}') {
          depth--;
          commentContent += '-}';
          j += 2;
        } else {
          commentContent += code[j];
          j++;
        }
      }

      if (preserveLicense && isLicenseComment(commentContent)) {
        result += commentContent;
      } else if (keepEmptyLines) {
        // Count newlines in the comment and preserve them
        const newlines = (commentContent.match(/\n/g) || []).length;
        result += '\n'.repeat(newlines);
      }
      i = j;
      continue;
    }

    // Line comment: --
    if (char === '-' && next === '-') {
      // Make sure it's not inside an operator (e.g., -->)
      // A valid line comment starts with -- followed by non-operator char or end of line
      const afterDashes = i + 2 < len ? code[i + 2] : '\n';
      if (afterDashes === ' ' || afterDashes === '\n' || afterDashes === '\r' || afterDashes === '\t' || i + 2 >= len ||
          !/[!#$%&*+./<=>?@\\^|~:]/.test(afterDashes)) {
        // It's a line comment - find end of line
        let j = i + 2;
        let commentText = '--';
        while (j < len && code[j] !== '\n') {
          commentText += code[j];
          j++;
        }

        if (preserveLicense && isLicenseComment(commentText)) {
          result += commentText;
        }
        // Skip to newline (but don't consume it yet)
        i = j;
        continue;
      }
    }

    result += char;
    i++;
  }

  // Clean up empty lines if not keeping them
  if (!keepEmptyLines) {
    const lines = result.split('\n');
    const cleaned: string[] = [];
    for (const line of lines) {
      if (line.trim().length > 0) {
        cleaned.push(line);
      }
    }
    result = cleaned.join('\n');
  }

  return result;
}

/**
 * Returns true when `ch` can end a value/expression, meaning a following `/`
 * is division rather than the start of a regex literal, and a following `?`
 * is the ternary operator rather than a character literal.
 */
function isRubyValueChar(ch: string): boolean {
  // Identifier chars (letters, digits, `_`) plus closing brackets terminate a
  // value. (Unicode letters are treated as value chars as well.)
  return /[\w)\]}]/.test(ch) || ch.charCodeAt(0) > 127;
}

/**
 * Keywords after which a `/` begins a regex literal (e.g. `return /x/`).
 */
const RUBY_REGEX_KEYWORDS = new Set([
  'when', 'and', 'or', 'not', 'if', 'unless', 'while', 'until',
  'return', 'then', 'do', 'else', 'elsif', 'case', 'in', 'begin',
]);

/**
 * Finds the index of a `#` comment in a line, ignoring `#` that appears inside
 * Ruby string literals (`"..."`, `'...'`, `` `...` ``), regex literals
 * (`/.../`) and character literals (`?#`, `?a`, `?\n`).
 *
 * Regex-vs-division is resolved with a "previous significant token" heuristic:
 * a `/` starts a regex only when the previous non-space token is NOT a value
 * (identifier/digit/`)`/`]`/`}`); otherwise the `/` is treated as division so
 * that code such as `a / b # c` is never swallowed. When ambiguous we prefer
 * division (conservative — never eat code).
 */
function findCommentIndex(line: string): number {
  let escapeNext = false;
  // The previous significant (non-space) character, used to decide whether a
  // `/` or `?` is in "value position". The empty string means start-of-line.
  let prevSignificant = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (escapeNext) {
      escapeNext = false;
      prevSignificant = char;
      continue;
    }

    if (char === ' ' || char === '\t') {
      // Whitespace is not significant, but remember nothing changes about the
      // previous significant token.
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      prevSignificant = char;
      continue;
    }

    // String literals: "...", '...', `...`
    if (char === '"' || char === "'" || char === '`') {
      const stringChar = char;
      i++;
      while (i < line.length) {
        const c = line[i];
        if (c === '\\') {
          i++; // skip escaped char
        } else if (c === stringChar) {
          break;
        }
        i++;
      }
      prevSignificant = stringChar;
      continue;
    }

    // Character literals: ?# ?a ?\n etc. Only in value position (so the
    // ternary `cond ? a : b` is unaffected — there `?` is followed by space).
    if (char === '?') {
      const next = i + 1 < line.length ? line[i + 1] : '';
      const prevIsValue = prevSignificant !== '' && isRubyValueChar(prevSignificant);
      if (!prevIsValue && next !== '' && next !== ' ' && next !== '\t') {
        // Skip `?X` or `?\X` as a single-character literal.
        if (next === '\\') {
          i += 2; // skip `?` and the escape's char (consumed below)
        } else {
          i += 1; // skip the literal char
        }
        prevSignificant = 'a'; // a char literal is a value
        continue;
      }
      // Otherwise it's the ternary operator.
      prevSignificant = '?';
      continue;
    }

    // Regex literals: /.../ — only when `/` is NOT in value position.
    if (char === '/') {
      const prevIsValue = prevSignificant !== '' && isRubyValueChar(prevSignificant);
      // Check if the previous word token was a regex-introducing keyword.
      let prevIsKeyword = false;
      if (prevIsValue) {
        const before = line.substring(0, i).trimEnd();
        const m = before.match(/(?:^|[^\w])([a-z]+)$/);
        if (m && RUBY_REGEX_KEYWORDS.has(m[1])) {
          prevIsKeyword = true;
        }
      }
      if (!prevIsValue || prevIsKeyword) {
        // Consume a regex literal: handle \ escapes and [...] char classes
        // (a `/` inside a class does not terminate the regex).
        let j = i + 1;
        let inClass = false;
        let closed = false;
        while (j < line.length) {
          const c = line[j];
          if (c === '\\') {
            j += 2;
            continue;
          }
          if (c === '[') {
            inClass = true;
          } else if (c === ']') {
            inClass = false;
          } else if (c === '/' && !inClass) {
            closed = true;
            break;
          }
          j++;
        }
        if (closed) {
          i = j; // position on the closing `/`
          prevSignificant = '/';
          continue;
        }
        // Unterminated regex on this line: fall through and treat `/` as
        // division to stay conservative.
      }
      prevSignificant = '/';
      continue;
    }

    if (char === '#') {
      return i;
    }

    prevSignificant = char;
  }

  return -1;
}
