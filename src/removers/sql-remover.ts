import { removeBySpec, CommentSpec } from './_shared';

/**
 * Comment specification for SQL: `--` line comments and `/* ... *\/` block
 * comments, with single- and double-quoted string literals.
 */
const SQL_SPEC: CommentSpec = {
  line: [{ token: '--' }],
  block: [{ open: '/*', close: '*/' }],
  strings: [
    { open: "'", close: "'", escape: '\\' },
    { open: '"', close: '"', escape: '\\' },
  ],
};

/**
 * Removes comments from SQL code.
 *
 * Delegates to the shared linear `removeBySpec` engine. The previous bespoke
 * line scanner mishandled `preserveLicense`: after a kept `/* license *\/`
 * block it failed to reset its multiline-comment state, so all following
 * statements were silently dropped (data loss), and an inline license comment
 * was reordered ahead of the code on its line. The shared engine keeps strings,
 * comments, license preservation and ordering correct in a single pass.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeSqlComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;
  return removeBySpec(code, SQL_SPEC, preserveLicense, keepEmptyLines);
}

