import type { Lang } from '../../src/types';

/**
 * Maps a VS Code `languageId` (TextDocument.languageId) to a comment-bear `Lang`.
 * VS Code's identifiers don't always match comment-bear's (e.g. `shellscript`,
 * `typescriptreact`, `objective-c`), so this table normalizes them.
 */
const VSCODE_LANGUAGE_MAP: Record<string, Lang> = {
  javascript: 'javascript',
  javascriptreact: 'javascript',
  typescript: 'typescript',
  typescriptreact: 'typescript',
  java: 'java',
  csharp: 'csharp',
  c: 'c',
  cpp: 'cpp',
  'objective-c': 'objectivec',
  'objective-cpp': 'objectivec',
  go: 'go',
  rust: 'rust',
  swift: 'swift',
  kotlin: 'kotlin',
  scala: 'scala',
  php: 'php',
  dart: 'dart',
  groovy: 'groovy',
  solidity: 'solidity',
  proto: 'protobuf',
  proto3: 'protobuf',
  zig: 'zig',
  vala: 'vala',
  d: 'd',
  glsl: 'glsl',
  hlsl: 'hlsl',
  wgsl: 'wgsl',
  json5: 'json5',
  jsonc: 'json5',
  scss: 'scss',
  less: 'less',
  sass: 'sass',
  terraform: 'hcl',
  hcl: 'hcl',
  puppet: 'puppet',
  python: 'python',
  ruby: 'ruby',
  shellscript: 'shell',
  bash: 'shell',
  sh: 'shell',
  powershell: 'powershell',
  perl: 'perl',
  perl6: 'perl',
  r: 'r',
  toml: 'toml',
  yaml: 'yaml',
  makefile: 'makefile',
  dockerfile: 'dockerfile',
  ini: 'ini',
  properties: 'properties',
  graphql: 'graphql',
  elixir: 'elixir',
  crystal: 'crystal',
  julia: 'julia',
  nim: 'nim',
  coffeescript: 'coffeescript',
  tcl: 'tcl',
  cmake: 'cmake',
  sql: 'sql',
  haskell: 'haskell',
  lua: 'lua',
  elm: 'elm',
  ada: 'ada',
  vhdl: 'vhdl',
  applescript: 'applescript',
  clojure: 'clojure',
  lisp: 'commonlisp',
  commonlisp: 'commonlisp',
  scheme: 'scheme',
  racket: 'scheme',
  'emacs-lisp': 'emacslisp',
  elisp: 'emacslisp',
  asm: 'assembly',
  assembly: 'assembly',
  erlang: 'erlang',
  latex: 'latex',
  tex: 'latex',
  matlab: 'matlab',
  octave: 'matlab',
  prolog: 'prolog',
  ocaml: 'ocaml',
  fsharp: 'fsharp',
  sml: 'sml',
  pascal: 'pascal',
  objectpascal: 'pascal',
  vb: 'vb',
  vba: 'vb',
  bat: 'batch',
  batch: 'batch',
  fortran: 'fortran',
  'fortran-modern': 'fortran',
  fortran90: 'fortran',
  viml: 'vimscript',
  vim: 'vimscript',
  html: 'html',
  xml: 'xml',
  css: 'css',
  json: 'json',
  vue: 'vue',
  svelte: 'svelte',
  markdown: 'markdown',
};

/**
 * Resolve the comment-bear language to use for a document.
 *
 * @param vscodeLanguageId - the document's `languageId`
 * @param fileName - the document's file name (used as a fallback hint)
 * @param override - the user's `commentBear.languageOverride` setting
 * @returns a `Lang`, or `undefined` if the language is unsupported/unknown
 */
export function resolveLanguage(
  vscodeLanguageId: string,
  fileName: string | undefined,
  override: string
): Lang | undefined {
  if (override && override !== 'auto') {
    return override as Lang;
  }
  const mapped = VSCODE_LANGUAGE_MAP[vscodeLanguageId];
  if (mapped) return mapped;

  // Fallback: a couple of common extension hints for files VS Code labels
  // generically (e.g. "plaintext").
  if (fileName) {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.sql')) return 'sql';
    if (lower.endsWith('.lua')) return 'lua';
    if (/\.ya?ml$/.test(lower)) return 'yaml';
    if (lower.endsWith('.toml')) return 'toml';
  }
  return undefined;
}

/** All comment-bear language values, for messages / pickers. */
export { VSCODE_LANGUAGE_MAP };
