import { removeComments, mergeConfig } from '../src/index';
import { processFile } from '../src/cli';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Phase 0 bug fixes', () => {
  // B1: CLI --language must be honored over the filename.
  describe('B1: CLI processFile honors explicit --language', () => {
    let tmpDir: string;

    beforeAll(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'commentbear-b1-'));
    });

    afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('treats foo.py as javascript when language is forced', () => {
      // "//" is a comment in JavaScript but NOT in Python.
      const file = path.join(tmpDir, 'foo.py');
      fs.writeFileSync(file, '// header\nx = 1\n');

      const forced = processFile(file, { language: 'javascript' });
      expect(forced.detectedLanguage).toBe('javascript');
      // The JS remover strips the // comment.
      expect(forced.code).not.toContain('// header');

      // Without forcing, the .py filename wins and Python keeps the // line.
      const auto = processFile(file, {});
      expect(auto.detectedLanguage).toBe('python');
      expect(auto.code).toContain('// header');
    });
  });

  // B2: mergeConfig must be exported from the package entry point.
  describe('B2: mergeConfig is exported and merges correctly', () => {
    it('lets programmatic options override config', () => {
      const merged = mergeConfig(
        { language: 'python', preserveLicense: false },
        { language: 'javascript' }
      );
      expect(merged.language).toBe('javascript');
      expect(merged.preserveLicense).toBe(false);
    });

    it('ignores undefined values in options', () => {
      const merged = mergeConfig(
        { language: 'python', preserveLicense: true },
        { language: undefined, preserveLicense: false }
      );
      // undefined language is ignored, config value retained.
      expect(merged.language).toBe('python');
      // defined false overrides true.
      expect(merged.preserveLicense).toBe(false);
    });
  });

  // B3: YAML '#' is only a comment at line start or after whitespace.
  describe('B3: YAML # handling', () => {
    const yaml = (code: string) => removeComments(code, { language: 'yaml' }).code;

    it('strips a full-line comment', () => {
      expect(yaml('# a comment')).toBe('');
    });

    it('strips an inline comment after whitespace', () => {
      expect(yaml('a: 1 # comment')).toBe('a: 1');
    });

    it('keeps # glued to a value (no preceding whitespace)', () => {
      expect(yaml('color:#fff')).toBe('color:#fff');
      expect(yaml('url: http://x#frag')).toBe('url: http://x#frag');
    });

    it('keeps # inside a quoted string', () => {
      expect(yaml('a: "#x"')).toBe('a: "#x"');
    });
  });

  // B4: PHP 8 attributes (#[...]) are not comments.
  describe('B4: PHP attributes survive', () => {
    it('keeps #[Route("/api")]', () => {
      const code = '<?php\n#[Route("/api")]\nfunction f() {}\n';
      const result = removeComments(code, { language: 'php' });
      expect(result.code).toContain('#[Route("/api")]');
    });

    it('still removes a plain # comment', () => {
      const code = '<?php\n$x = 1; # gone\n';
      const result = removeComments(code, { language: 'php' });
      expect(result.code).not.toContain('# gone');
      expect(result.code).toContain('$x = 1;');
    });
  });

  // B5: Go directive comments are protected.
  describe('B5: Go directives survive', () => {
    const go = (code: string) => removeComments(code, { language: 'go' }).code;

    it('keeps //go:embed', () => {
      expect(go('//go:embed file.txt\nvar f string')).toContain('//go:embed file.txt');
    });

    it('keeps //go:build', () => {
      expect(go('//go:build linux\npackage main')).toContain('//go:build linux');
    });

    it('still removes ordinary line comments', () => {
      const out = go('// ordinary\nvar x = 1');
      expect(out).not.toContain('// ordinary');
    });
  });

  // B6: CSS string literals containing comment tokens are protected.
  describe('B6: CSS string protection', () => {
    it('keeps a comment-like sequence inside a string', () => {
      const code = '.a::before{content:"a/*b*/c"}';
      const result = removeComments(code, { language: 'css' });
      expect(result.code).toContain('"a/*b*/c"');
    });

    it('still removes a real CSS comment', () => {
      const code = '.a{color:red} /* real comment */';
      const result = removeComments(code, { language: 'css' });
      expect(result.code).not.toContain('real comment');
    });
  });

  // B7: keepEmptyLines for the 2-arg removers.
  describe('B7: keepEmptyLines for css and sql', () => {
    it('SQL keeps a blank line where a comment-only line was', () => {
      const code = 'SELECT 1;\n-- a comment\nSELECT 2;';
      const kept = removeComments(code, { language: 'sql', keepEmptyLines: true }).code;
      expect(kept).toBe('SELECT 1;\n\nSELECT 2;');

      const collapsed = removeComments(code, { language: 'sql', keepEmptyLines: false }).code;
      expect(collapsed).toBe('SELECT 1;\nSELECT 2;');
    });

    it('CSS preserves newline count of a removed multi-line comment when keepEmptyLines is true', () => {
      const code = 'a{}\n/* one\ntwo */\nb{}';
      const kept = removeComments(code, { language: 'css', keepEmptyLines: true }).code;
      expect(kept).toBe('a{}\n\n\nb{}');
    });
  });
});
