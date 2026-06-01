import * as fs from 'fs';
import * as path from 'path';
import { removeComments } from '../src/index';

/**
 * Regression tests for the catastrophic-backtracking hang that the previous
 * `strip-comments`-based JavaScript remover exhibited on code that interleaves
 * regex literals with `//` line comments. The remover is now a linear,
 * single-pass scanner that cannot backtrack, so these inputs must return
 * quickly. Each test has a small Jest timeout so a regression hangs fast
 * instead of stalling the whole run.
 */
describe('regex-literal hang regression', () => {
  // ==========================================================================
  // Test A: the original hang reproduction. We read the language-detector
  // SOURCE (which is full of regex literals interleaved with `//` comments —
  // exactly the shape that used to hang). Reading `src/` (not `dist/`) keeps
  // this test independent of whether the project has been built.
  // ==========================================================================
  test('does not hang on the regex-heavy language-detector source', () => {
    const file = path.join(__dirname, '..', 'src', 'detectors', 'language-detector.ts');
    const code = fs.readFileSync(file, 'utf8');
    expect(code.length).toBeGreaterThan(1000);

    const result = removeComments(code, { language: 'typescript' });

    // It returned (no hang) and preserved key code tokens.
    expect(result.code).toContain('EXTENSION_MAP');
    // Comments were actually removed (output is shorter than the input).
    expect(result.code.length).toBeLessThan(code.length);
  }, 5000);

  // ==========================================================================
  // Test B: the minimal input that interleaves regex literals with `//`
  // comments (lines like `/\bbegin\b[\s\S]*?\bend\b/m.test(trimmed) ||`).
  // ==========================================================================
  test('does not hang on minimal interleaved regex/comment input', () => {
    const code = [
      String.raw`/\bbegin\b[\s\S]*?\bend\b/m.test(trimmed) ||`,
      `// detect block start`,
      String.raw`/\bclass\b[\s\S]*?\{/.test(trimmed) ||`,
      `// detect class`,
      String.raw`/\bfunction\b\s*\w*\s*\(/.test(trimmed) ||`,
      `// detect function declaration`,
      String.raw`/\/\/[^\n]*/.test(trimmed) ||`,
      `// detect a line comment`,
      String.raw`/\/\*[\s\S]*?\*\//.test(trimmed) ||`,
      `// detect a block comment`,
      String.raw`/\breturn\b/.test(trimmed);`,
      `// done detecting`,
    ].join('\n');

    const result = removeComments(code, { language: 'javascript' });

    // The `//` comments are gone...
    expect(result.code).not.toContain('detect block start');
    expect(result.code).not.toContain('done detecting');
    expect(result.code).not.toContain('detect a line comment');
    // ...while the regex literals (and their surrounding code) remain intact,
    // including regex bodies that themselves contain `//` and `/* */`.
    expect(result.code).toContain(String.raw`/\bbegin\b[\s\S]*?\bend\b/m.test(trimmed)`);
    expect(result.code).toContain(String.raw`/\/\/[^\n]*/.test(trimmed)`);
    expect(result.code).toContain(String.raw`/\/\*[\s\S]*?\*\//.test(trimmed)`);
    expect(result.code).toContain(String.raw`/\breturn\b/.test(trimmed);`);
  }, 5000);

  // ==========================================================================
  // Test C: regex-vs-divide disambiguation and regex protecting comments.
  // ==========================================================================
  describe('correctness of regex/divide/comment handling', () => {
    const run = (code: string) => removeComments(code, { language: 'javascript' }).code;

    test('regex literal kept, trailing line comment removed', () => {
      const out = run(`const re = /test/g; // c`);
      expect(out).toContain('/test/g;');
      expect(out).not.toContain('// c');
    });

    test('regex containing // is kept verbatim, trailing comment removed', () => {
      const out = run(String.raw`const re = /\/\//g; // c`);
      expect(out).toContain(String.raw`/\/\//g;`);
      expect(out).not.toContain('// c');
    });

    test('slash inside a character class does not end the regex', () => {
      const out = run(String.raw`const re = /[/]/; // c`);
      expect(out).toContain(String.raw`/[/]/;`);
      expect(out).not.toContain('// c');
    });

    test('division is not mistaken for a regex; comment removed', () => {
      const out = run(`const a = b / c; // c`);
      expect(out).toContain('b / c;');
      expect(out).not.toContain('// c');
    });

    test('string containing a URL is kept; trailing comment removed', () => {
      const out = run(`const u = "http://x"; // c`);
      expect(out).toContain('"http://x";');
      expect(out).not.toContain('// c');
    });

    test('template literal content is kept; trailing comment removed', () => {
      const out = run('const s = `a // b ${x}`; // c');
      expect(out).toContain('`a // b ${x}`;');
      expect(out).not.toContain('// c');
    });

    test('regex at expression start followed by more code does not hang', () => {
      const out = run(`/regex/.test(x) // c\nconst y = 1;`);
      expect(out).toContain('/regex/.test(x)');
      expect(out).toContain('const y = 1;');
      expect(out).not.toContain('// c');
    }, 5000);

    // ------------------------------------------------------------------------
    // Postfix `++` / `--` before `/` must be DIVISION, not a regex. Previously
    // the heuristic looked only at the last char (`+`/`-`, a regex-prefix char)
    // so `a++ / b // c` mis-read `/ b /` as a regex, corrupting tokenization
    // (it could swallow a `;`) and wrongly keeping the trailing `//` comment.
    // ------------------------------------------------------------------------
    test('postfix ++ before / is division; trailing comment removed', () => {
      const out = run(`a++ / b // c`);
      expect(out).toContain('a++ / b');
      expect(out).not.toContain('// c');
    });

    test('postfix ++ before / keeps the trailing semicolon', () => {
      const out = run(`x = a++ / b; // c`);
      // The `;` must NOT be swallowed by a phantom regex literal.
      expect(out).toContain('x = a++ / b;');
      expect(out).not.toContain('// c');
    });

    test('postfix -- before / is division; trailing comment removed', () => {
      const out = run(`a-- / b // c`);
      expect(out).toContain('a-- / b');
      expect(out).not.toContain('// c');
    });
  });

  // ==========================================================================
  // Test D: LINEARITY. The regex decision must be made in O(1) per `/` using an
  // incrementally-tracked "previous significant token" — NOT by re-scanning the
  // ever-growing output (which was O(n) per slash → O(n²) overall, ~17s on this
  // 40k-line input). With the linear scanner this large input finishes well
  // within a generous Jest timeout. This test would have caught the O(n²) bug.
  // ==========================================================================
  test('regex + division + comment scales linearly (no O(n^2) blowup)', () => {
    const line = 'var re = /ab+c/.test(x); y = a / b; // note\n';
    const code = line.repeat(20000);
    expect(code.length).toBeGreaterThan(800000);

    const result = removeComments(code, { language: 'javascript' });

    // Comments were actually removed...
    expect(result.code).not.toContain('// note');
    // ...while the regex literal and the division both survived intact.
    expect(result.code).toContain('/ab+c/.test(x)');
    expect(result.code).toContain('y = a / b;');
  }, 4000);
});
