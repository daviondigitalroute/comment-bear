/**
 * Removers for the "Phase 2" C-style-comment languages.
 *
 * Every function here is a thin wrapper that delegates to the generic
 * `removeBySpec` engine in `_shared.ts` with a language-specific
 * `CommentSpec`. These languages all use `//` line comments and (mostly)
 * `/*` ... `*\/` block comments, differing mainly in their string literals
 * and a few block-comment quirks (nesting, `/+` ... `+/`, etc.).
 */

import { removeBySpec, CommentSpec } from './_shared';

/**
 * Removes comments from Dart code.
 *
 * Line comments start with `//`, block comments are delimited by `/*` ... `*\/`
 * and may nest. Double- and single-quoted strings allow `\` escapes.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeDartComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '//' }],
    block: [{ open: '/*', close: '*/', nested: true }],
    strings: [
      { open: '"', close: '"', escape: '\\' },
      { open: "'", close: "'", escape: '\\' },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Groovy code.
 *
 * Line comments start with `//`, block comments are delimited by `/*` ... `*\/`.
 * Triple-quoted `"""` and `'''` strings are matched before the ordinary
 * single- and double-quoted strings so embedded quotes are handled correctly.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeGroovyComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '//' }],
    block: [{ open: '/*', close: '*/' }],
    strings: [
      { open: '"""', close: '"""', multiline: true, escape: '\\' },
      { open: "'''", close: "'''", multiline: true, escape: '\\' },
      { open: '"', close: '"', escape: '\\' },
      { open: "'", close: "'", escape: '\\' },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Solidity code.
 *
 * Line comments start with `//`, block comments are delimited by `/*` ... `*\/`.
 * Double- and single-quoted strings allow `\` escapes.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeSolidityComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '//' }],
    block: [{ open: '/*', close: '*/' }],
    strings: [
      { open: '"', close: '"', escape: '\\' },
      { open: "'", close: "'", escape: '\\' },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Protocol Buffers (protobuf) code.
 *
 * Line comments start with `//`, block comments are delimited by `/*` ... `*\/`.
 * Double- and single-quoted strings allow `\` escapes.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeProtobufComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '//' }],
    block: [{ open: '/*', close: '*/' }],
    strings: [
      { open: '"', close: '"', escape: '\\' },
      { open: "'", close: "'", escape: '\\' },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Objective-C code.
 *
 * Line comments start with `//`, block comments are delimited by `/*` ... `*\/`.
 * `@"..."` NSString literals are matched before ordinary double-quoted strings
 * so the `@` prefix is copied verbatim. Single-quoted strings allow `\` escapes.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeObjectiveCComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '//' }],
    block: [{ open: '/*', close: '*/' }],
    strings: [
      { open: '@"', close: '"', escape: '\\' },
      { open: '"', close: '"', escape: '\\' },
      { open: "'", close: "'", escape: '\\' },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Zig code.
 *
 * Line comments start with `//`. Zig has no block comments. Double- and
 * single-quoted strings allow `\` escapes.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeZigComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '//' }],
    strings: [
      { open: '"', close: '"', escape: '\\' },
      { open: "'", close: "'", escape: '\\' },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Vala code.
 *
 * Line comments start with `//`, block comments are delimited by `/*` ... `*\/`.
 * Double- and single-quoted strings allow `\` escapes.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeValaComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '//' }],
    block: [{ open: '/*', close: '*/' }],
    strings: [
      { open: '"', close: '"', escape: '\\' },
      { open: "'", close: "'", escape: '\\' },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from D code.
 *
 * Line comments start with `//`. D has two kinds of block comment: the regular
 * `/*` ... `*\/` form and the nesting `/+` ... `+/` form (tracked by depth).
 * Double-quoted strings allow `\` escapes; backtick `` ` `` strings are raw
 * (no escaping).
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeDComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '//' }],
    block: [
      { open: '/*', close: '*/' },
      { open: '/+', close: '+/', nested: true },
    ],
    strings: [
      { open: '"', close: '"', escape: '\\' },
      { open: '`', close: '`', escape: null },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Shared shading-language spec used by GLSL, HLSL and WGSL.
 *
 * Line comments start with `//`, block comments are delimited by `/*` ... `*\/`,
 * and only double-quoted strings are recognised.
 */
const SHADER_SPEC: CommentSpec = {
  line: [{ token: '//' }],
  block: [{ open: '/*', close: '*/' }],
  strings: [{ open: '"', close: '"', escape: '\\' }],
};

/**
 * Removes comments from GLSL code.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeGlslComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  return removeBySpec(code, SHADER_SPEC, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from HLSL code.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeHlslComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  return removeBySpec(code, SHADER_SPEC, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from WGSL code.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeWgslComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  return removeBySpec(code, SHADER_SPEC, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from JSON5 code.
 *
 * Line comments start with `//`, block comments are delimited by `/*` ... `*\/`.
 * Double- and single-quoted strings allow `\` escapes.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeJson5Comments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '//' }],
    block: [{ open: '/*', close: '*/' }],
    strings: [
      { open: '"', close: '"', escape: '\\' },
      { open: "'", close: "'", escape: '\\' },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}
