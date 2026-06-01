/**
 * Removers for hash-comment (`#`) and related "Phase 1" languages.
 *
 * Every function here is a thin wrapper that delegates to the generic
 * `removeBySpec` engine in `_shared.ts` with a language-specific
 * `CommentSpec`. The only exception is Perl, which has an additional
 * POD-block pre-pass before the generic engine runs.
 */

import { removeBySpec, isLicenseComment, CommentSpec } from './_shared';

/**
 * Removes comments from Shell / Bash code.
 *
 * Line comments start with `#`. Double-quoted strings allow `\` escapes and
 * single-quoted strings are literal (no escaping).
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeShellComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '#' }],
    strings: [
      { open: '"', close: '"', escape: '\\' },
      { open: "'", close: "'", escape: null },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from PowerShell code.
 *
 * Line comments start with `#`, block comments are delimited by `<#` and `#>`.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removePowerShellComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '#' }],
    block: [{ open: '<#', close: '#>' }],
    strings: [
      { open: '"', close: '"' },
      { open: "'", close: "'", escape: null },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Perl code.
 *
 * Performs a POD-block pre-pass (consecutive lines from `=word` through `=cut`)
 * before the generic `#` line-comment removal. POD blocks are dropped unless
 * they are license blocks and `preserveLicense` is set; when `keepEmptyLines`
 * is set, dropped POD lines are replaced with blank lines.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removePerlComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;

  const withoutPod = removePodBlocks(code, preserveLicense, keepEmptyLines);

  const spec: CommentSpec = {
    line: [{ token: '#' }],
    strings: [
      { open: '"', close: '"' },
      { open: "'", close: "'", escape: null },
    ],
  };
  return removeBySpec(withoutPod, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes Perl POD documentation blocks.
 *
 * A POD block runs from a line matching `^=[a-zA-Z]\w*` through a line
 * matching `^=cut\b` inclusive. Blocks are removed unless they look like a
 * license comment and `preserveLicense` is set; dropped blocks are replaced
 * with blank lines when `keepEmptyLines` is set.
 *
 * @param code - Input Perl code
 * @param preserveLicense - Whether to keep license POD blocks
 * @param keepEmptyLines - Whether to keep blank lines where POD blocks were
 * @returns Code with POD blocks removed
 */
function removePodBlocks(
  code: string,
  preserveLicense: boolean,
  keepEmptyLines: boolean
): string {
  const lines = code.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (/^=[a-zA-Z]\w*/.test(line)) {
      // Collect the whole POD block up to and including the =cut line.
      const block: string[] = [];
      while (i < lines.length) {
        block.push(lines[i]);
        if (/^=cut\b/.test(lines[i])) {
          i++;
          break;
        }
        i++;
      }

      const blockText = block.join('\n');
      if (preserveLicense && isLicenseComment(blockText)) {
        result.push(...block);
      } else if (keepEmptyLines) {
        for (let k = 0; k < block.length; k++) {
          result.push('');
        }
      }
      continue;
    }

    result.push(line);
    i++;
  }

  return result.join('\n');
}

/**
 * Removes comments from R code.
 *
 * Line comments start with `#`.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeRComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '#' }],
    strings: [
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from TOML code.
 *
 * Line comments start with `#`. Supports multiline `"""` and `'''` strings as
 * well as ordinary single- and double-quoted strings.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeTomlComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '#' }],
    strings: [
      { open: '"""', close: '"""', multiline: true },
      { open: "'''", close: "'''", multiline: true, escape: null },
      { open: '"', close: '"' },
      { open: "'", close: "'", escape: null },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Makefile code.
 *
 * Line comments start with `#`.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeMakefileComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '#' }],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Dockerfile code.
 *
 * Line comments start with `#`. Parser directives such as `# syntax=...` and
 * `# escape=...` on the first lines are preserved.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeDockerfileComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '#' }],
    preserve: [/^#\s*(syntax|escape)=/i],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from INI code.
 *
 * Line comments start with `#` or `;`.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeIniComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '#' }, { token: ';' }],
    strings: [
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from GraphQL code.
 *
 * Line comments start with `#`. Triple-quoted `"""` block strings (descriptions)
 * are copied verbatim, as are ordinary double-quoted strings.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeGraphqlComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '#' }],
    strings: [
      { open: '"""', close: '"""', multiline: true },
      { open: '"', close: '"' },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Elixir code.
 *
 * Line comments start with `#`. Triple-quoted `"""` heredocs are copied
 * verbatim, as are ordinary double-quoted strings.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeElixirComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '#' }],
    strings: [
      { open: '"""', close: '"""', multiline: true },
      { open: '"', close: '"' },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Crystal code.
 *
 * Line comments start with `#`.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeCrystalComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '#' }],
    strings: [
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Julia code.
 *
 * Line comments start with `#`, block comments are delimited by `#=` and `=#`
 * and may nest. Triple-quoted `"""` strings are copied verbatim.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeJuliaComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '#' }],
    block: [{ open: '#=', close: '=#', nested: true }],
    strings: [
      { open: '"""', close: '"""', multiline: true },
      { open: '"', close: '"' },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Nim code.
 *
 * Line comments start with `#`, block comments are delimited by `#[` and `]#`
 * and may nest. Triple-quoted `"""` strings are copied verbatim.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeNimComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '#' }],
    block: [{ open: '#[', close: ']#', nested: true }],
    strings: [
      { open: '"""', close: '"""', multiline: true },
      { open: '"', close: '"' },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from CoffeeScript code.
 *
 * Line comments start with `#`, block comments are delimited by `###` ... `###`.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeCoffeeScriptComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '#' }],
    block: [{ open: '###', close: '###' }],
    strings: [
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Tcl code.
 *
 * Line comments start with `#`.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeTclComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '#' }],
    strings: [{ open: '"', close: '"' }],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from CMake code.
 *
 * Line comments start with `#`, block comments are delimited by `#[[` ... `]]`.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeCMakeComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '#' }],
    block: [{ open: '#[[', close: ']]' }],
    strings: [{ open: '"', close: '"' }],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Java/.properties files.
 *
 * Line comments start with `#` or `!`.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removePropertiesComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '#' }, { token: '!' }],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Puppet code.
 *
 * Line comments start with `#`, block comments are delimited by `/*` ... `*\/`.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removePuppetComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '#' }],
    block: [{ open: '/*', close: '*/' }],
    strings: [
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from HCL / Terraform code.
 *
 * Line comments start with `#` or `//`, block comments are delimited by
 * `/*` ... `*\/`.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeHclComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  const spec: CommentSpec = {
    line: [{ token: '#' }, { token: '//' }],
    block: [{ open: '/*', close: '*/' }],
    strings: [{ open: '"', close: '"' }],
  };
  return removeBySpec(code, spec, preserveLicense, keepEmptyLines);
}

/**
 * Shared CSS-preprocessor spec used by SCSS, LESS and Sass.
 *
 * Line comments start with `//`, block comments are delimited by `/*` ... `*\/`.
 */
const CSS_PREPROCESSOR_SPEC: CommentSpec = {
  line: [{ token: '//' }],
  block: [{ open: '/*', close: '*/' }],
  strings: [
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
};

/**
 * Removes comments from SCSS code.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeScssComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  return removeBySpec(code, CSS_PREPROCESSOR_SPEC, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from LESS code.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeLessComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  return removeBySpec(code, CSS_PREPROCESSOR_SPEC, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Sass code.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeSassComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  return removeBySpec(code, CSS_PREPROCESSOR_SPEC, preserveLicense, keepEmptyLines);
}
