import { removeBySpec, CommentSpec } from './_shared';

/**
 * Comment specification for JavaScript / TypeScript.
 *
 * - `//` line comments and `/` + `* ... *` + `/` block comments.
 * - Double-, single- and backtick (template) string literals, all escapable.
 *   Template literals are multiline.
 * - `regexLiterals` enables single-pass recognition of regex literals
 *   (`/.../flags`) so a regex body containing comment-looking tokens is not
 *   mistaken for a comment.
 * - `preserveInlineBlockWhitespace` reproduces the historical behaviour where
 *   removing an inline comment leaves its surrounding spaces in place.
 * - Block comments are tracked as nested (depth-counted). Real JavaScript block
 *   comments do not nest, but the previous implementation effectively consumed
 *   nested-looking comments as a single comment and the test-suite encodes that
 *   behaviour; depth tracking is still strictly linear.
 * - `preserve` keeps `/*!` banner comments only when preserving license
 *   comments (the convention used by the pre-processing below and by minifiers).
 *
 * @param preserveLicense - When true, keep `/*!` banner comments.
 * @returns The JavaScript/TypeScript comment specification.
 */
function jsSpec(preserveLicense: boolean): CommentSpec {
  return {
    line: [{ token: '//' }],
    block: [{ open: '/*', close: '*/', nested: true }],
    strings: [
      { open: '"', close: '"', escape: '\\' },
      { open: "'", close: "'", escape: '\\' },
      { open: '`', close: '`', escape: '\\', multiline: true },
    ],
    regexLiterals: true,
    preserveInlineBlockWhitespace: true,
    preserve: preserveLicense ? [/^\/\*!/] : [],
  };
}

/**
 * Removes comments from JavaScript/TypeScript code.
 *
 * The default (and license-preserving) path routes everything through the
 * linear, single-pass `removeBySpec` engine, which cannot backtrack and
 * therefore cannot hang on pathological inputs. The previous
 * `strip-comments`-based implementation could hang (catastrophic regex
 * backtracking) on JS that interleaves regex literals with `//` comments; that
 * dependency is no longer used.
 *
 * The `keepEmptyLines` path uses a separate, line-based pass
 * (`removeCommentsPreservingLines`) that reproduces the historical blank-line
 * behaviour. It is a simple per-line scanner with no cross-line backtracking,
 * so it cannot hang either.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines
 * @returns Processed code
 */
export function removeJavaScriptComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;

  // Pre-process license comments so they survive removal. This preserves the
  // historical, test-encoded behaviour: JSDoc-style `/** ... */` banners that
  // contain @license/@copyright/@author are converted to `/*! ... */` banners
  // (kept via the spec's preserve pattern), and `// @license` / `// @copyright`
  // single-line comments are converted to `/*! ... */` block banners.
  let processedCode = code;
  if (preserveLicense) {
    processedCode = code.replace(/\/\*\*[\s\S]*?@license[\s\S]*?\*\//g, (match) => {
      return match.replace('/**', '/*!');
    });

    processedCode = processedCode.replace(/\/\*\*[\s\S]*?@(copyright|author)[\s\S]*?\*\//g, (match) => {
      return match.replace('/**', '/*!');
    });

    processedCode = processedCode.replace(/\/\/\s*@(license|copyright)[^\n]*/g, (match) => {
      return '/*!' + match.substring(2) + '*/';
    });
  }

  if (keepEmptyLines) {
    // Preserve the original line structure (blank lines where comments were).
    return removeCommentsPreservingLines(processedCode, preserveLicense);
  }

  const result = removeBySpec(processedCode, jsSpec(preserveLicense), preserveLicense, false);
  return trimEmptyLines(result);
}

/**
 * Removes comments from TypeScript code (uses the same logic as JavaScript)
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines
 * @returns Processed code
 */
export function removeTypeScriptComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  return removeJavaScriptComments(code, preserveLicense, keepEmptyLines);
}

/**
 * Removes empty lines from the beginning and end of code
 */
function trimEmptyLines(code: string): string {
  const lines = code.split('\n');

  // Remove empty lines at the start
  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }

  // Remove empty lines at the end
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  return lines.join('\n');
}

/**
 * Removes comments from code while preserving line breaks and empty lines.
 *
 * This is a per-line scanner (no cross-line state machine that could
 * backtrack), used only for the `keepEmptyLines` path. It reproduces the
 * historical behaviour where a whole-line comment immediately followed by a
 * blank line collapses to a single blank line.
 *
 * @param code - The source code to process
 * @param preserveLicense - Whether to preserve license and copyright comments
 * @returns Code with comments removed but line structure preserved
 */
function removeCommentsPreservingLines(code: string, preserveLicense: boolean): string {
  const lines = code.split('\n');
  const result: string[] = [];
  let inMultilineComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Process multi-line comments /* ... */
    if (!inMultilineComment) {
      const commentStart = findCommentStart(line);

      if (commentStart !== -1 && line.substring(commentStart).startsWith('/*')) {
        const beforeComment = line.substring(0, commentStart).trimEnd();

        // Check for license/copyright comment
        const isProtected = preserveLicense && (
          line.substring(commentStart).startsWith('/*!') ||
          line.substring(commentStart).toLowerCase().includes('license') ||
          line.substring(commentStart).toLowerCase().includes('copyright')
        );

        if (isProtected) {
          result.push(line);
          if (line.indexOf('*/', commentStart + 2) === -1) {
            inMultilineComment = true;
          }
          continue;
        }

        // Check if the comment ends on the same line
        const commentEnd = line.indexOf('*/', commentStart + 2);
        if (commentEnd !== -1) {
          // Single-line /* */ comment
          const afterComment = line.substring(commentEnd + 2);
          if (beforeComment.length === 0 && afterComment.trim().length === 0) {
            // The whole line is a comment - check the next line
            const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
            if (nextLine.trim().length === 0) {
              // Next line is empty, don't add an extra empty line
              continue;
            } else {
              result.push(''); // Add empty line
            }
          } else {
            result.push((beforeComment + afterComment).trimEnd());
          }
        } else {
          // Multi-line comment starts
          inMultilineComment = true;
          if (beforeComment.length > 0) {
            result.push(beforeComment);
          } else {
            // Check next line
            const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
            if (nextLine.trim().length === 0) {
              continue;
            } else {
              result.push('');
            }
          }
        }
        continue;
      }
    } else {
      // Inside multi-line comment
      if (line.indexOf('*/') !== -1) {
        inMultilineComment = false;
        const afterComment = line.substring(line.indexOf('*/') + 2);
        if (afterComment.trim().length > 0) {
          result.push(afterComment.trimEnd());
        } else {
          // Check next line
          const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
          if (nextLine.trim().length === 0) {
            continue;
          } else {
            result.push('');
          }
        }
      } else {
        // Inside multi-line comment - skip the line without adding empty line
        continue;
      }
      continue;
    }

    // Handle single-line comments //
    const commentIndex = findCommentStart(line);
    if (commentIndex !== -1 && line.substring(commentIndex).startsWith('//')) {
      const beforeComment = line.substring(0, commentIndex).trimEnd();
      const comment = line.substring(commentIndex);

      // Check for license/copyright
      const isLicense = preserveLicense && (
        comment.includes('@license') ||
        comment.toLowerCase().includes('license') ||
        comment.toLowerCase().includes('copyright')
      );

      if (isLicense) {
        result.push(line);
      } else if (beforeComment.length > 0) {
        result.push(beforeComment);
      } else {
        // The whole line is a comment - check the next line
        const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
        if (nextLine.trim().length === 0) {
          // Next line is empty, don't add an extra empty line
          continue;
        } else {
          result.push(''); // Add empty line
        }
      }
      continue;
    }

    // Ordinary line of code or a blank line.
    result.push(line);
  }

  return result.join('\n');
}

/**
 * Finds the start of a comment (// or /*) outside of strings and regex.
 *
 * A simple per-line scanner used by the `keepEmptyLines` path. It is linear in
 * the line length and cannot backtrack.
 *
 * @param line - A single line of source code.
 * @returns The index of the comment start, or -1 if there is none.
 */
function findCommentStart(line: string): number {
  let inString = false;
  let stringChar = '';
  let inRegex = false;
  let escapeNext = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = i < line.length - 1 ? line[i + 1] : '';

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && (inString || inRegex)) {
      escapeNext = true;
      continue;
    }

    // String handling
    if (char === '"' || char === "'" || char === '`') {
      if (!inString && !inRegex) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar) {
        inString = false;
      }
      continue;
    }

    // Regex handling (simplified)
    if (char === '/' && !inString && !inRegex) {
      // Check if this is a regex or a comment
      if (nextChar === '/' || nextChar === '*') {
        return i; // Found comment start
      }
      // Could be regex - simplified check
      if (i > 0 && /[=,([]/.test(line[i - 1])) {
        inRegex = true;
      }
      continue;
    }

    if (char === '/' && inRegex) {
      inRegex = false;
      continue;
    }
  }

  return -1;
}
