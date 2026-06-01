import {
  removeBySpec,
  isLicenseComment,
  CommentSpec,
} from '../src/removers/_shared';

// A C-like spec used by several tests below.
const cLike: CommentSpec = {
  line: [{ token: '//' }],
  block: [{ open: '/*', close: '*/' }],
  strings: [{ open: '"', close: '"', escape: '\\' }],
};

describe('_shared: isLicenseComment', () => {
  it('matches all recognised license/authorship markers', () => {
    expect(isLicenseComment('// Copyright 2024')).toBe(true);
    expect(isLicenseComment('/* License: MIT */')).toBe(true);
    expect(isLicenseComment('// Licence note')).toBe(true);
    expect(isLicenseComment('// SPDX-License-Identifier: MIT')).toBe(true);
    expect(isLicenseComment('/** @license */')).toBe(true);
    expect(isLicenseComment('/** @copyright Foo */')).toBe(true);
    expect(isLicenseComment('/** @author Jane */')).toBe(true);
    expect(isLicenseComment('// author: Jane')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isLicenseComment('// COPYRIGHT')).toBe(true);
    expect(isLicenseComment('// spdx')).toBe(true);
  });

  it('returns false for ordinary comments', () => {
    expect(isLicenseComment('// just a normal comment')).toBe(false);
    expect(isLicenseComment('/* TODO: fix this */')).toBe(false);
  });
});

describe('_shared: removeBySpec', () => {
  describe('line comments', () => {
    it('removes a full-line comment', () => {
      expect(removeBySpec('// gone\nvar x = 1;', cLike)).toBe('var x = 1;');
    });

    it('removes an inline comment and trims trailing whitespace', () => {
      expect(removeBySpec('var x = 1; // gone', cLike)).toBe('var x = 1;');
    });

    it('keeps code when there is no comment', () => {
      expect(removeBySpec('var x = 1;', cLike)).toBe('var x = 1;');
    });
  });

  describe('block comments (non-nested)', () => {
    it('removes a single-line block comment (trailing whitespace before it is trimmed)', () => {
      // The space before the dropped comment is trimmed, leaving a single space.
      expect(removeBySpec('a /* gone */ b', cLike)).toBe('a b');
    });

    it('removes a multi-line block comment', () => {
      const input = 'a\n/* line1\nline2 */\nb';
      expect(removeBySpec(input, cLike)).toBe('a\nb');
    });

    it('ends a non-nested block at the first close token', () => {
      const spec: CommentSpec = { block: [{ open: '/*', close: '*/', nested: false }] };
      // The inner "/*" is ignored; comment ends at first "*/". The space before
      // the dropped inline comment is trimmed.
      expect(removeBySpec('a /* x /* y */ z', spec)).toBe('a z');
    });
  });

  describe('nested block comments', () => {
    it('tracks depth and removes the whole nested comment', () => {
      const spec: CommentSpec = { block: [{ open: '{-', close: '-}', nested: true }] };
      // Whitespace before the dropped inline comment is trimmed.
      expect(removeBySpec('x = 1 {- a {- b -} c -} + 2', spec)).toBe('x = 1 + 2');
    });

    it('does not over-consume after a balanced nested comment', () => {
      const spec: CommentSpec = { block: [{ open: '{-', close: '-}', nested: true }] };
      expect(removeBySpec('{- {- -} -}keep', spec)).toBe('keep');
    });
  });

  describe('strings containing comment tokens', () => {
    it('does not treat // inside a string as a comment', () => {
      expect(removeBySpec('var u = "http://x"; // real', cLike)).toBe('var u = "http://x";');
    });

    it('does not treat /* */ inside a string as a comment', () => {
      expect(removeBySpec('var s = "a/*b*/c";', cLike)).toBe('var s = "a/*b*/c";');
    });

    it('respects escape characters inside strings', () => {
      expect(removeBySpec('var s = "a\\"// not a comment";', cLike)).toBe(
        'var s = "a\\"// not a comment";'
      );
    });

    it('treats backslash literally when escape is null', () => {
      const spec: CommentSpec = {
        line: [{ token: '#' }],
        strings: [{ open: "'", close: "'", escape: null }],
      };
      // With escaping disabled the string ends at the first closing quote.
      expect(removeBySpec("x = 'a\\' # gone", spec)).toBe("x = 'a\\'");
    });

    it('supports multiline strings', () => {
      const spec: CommentSpec = {
        line: [{ token: '#' }],
        strings: [{ open: '"""', close: '"""', multiline: true }],
      };
      const input = 'a = """line1 # not comment\nline2 # not comment"""\nb # gone';
      expect(removeBySpec(input, spec)).toBe(
        'a = """line1 # not comment\nline2 # not comment"""\nb'
      );
    });
  });

  describe('requireWhitespaceBefore', () => {
    const spec: CommentSpec = {
      line: [{ token: '#', requireWhitespaceBefore: true }],
      strings: [{ open: '"', close: '"' }],
    };

    it('treats # as a comment at line start', () => {
      expect(removeBySpec('# whole line', spec)).toBe('');
    });

    it('treats # as a comment when preceded by whitespace', () => {
      expect(removeBySpec('a: 1 # gone', spec)).toBe('a: 1');
    });

    it('does NOT treat # as a comment when glued to a token', () => {
      expect(removeBySpec('color:#fff', spec)).toBe('color:#fff');
      expect(removeBySpec('url: http://x#frag', spec)).toBe('url: http://x#frag');
    });
  });

  describe('notIfFollowedBy', () => {
    const spec: CommentSpec = {
      line: [{ token: '#', notIfFollowedBy: ['['] }],
      strings: [{ open: '"', close: '"' }],
    };

    it('does not treat #[ as a comment (PHP attribute style)', () => {
      expect(removeBySpec('#[Route("/api")]', spec)).toBe('#[Route("/api")]');
    });

    it('still treats a plain # as a comment', () => {
      expect(removeBySpec('code(); # gone', spec)).toBe('code();');
    });
  });

  describe('preserve patterns (directives)', () => {
    it('keeps a line comment matching a preserve pattern', () => {
      const spec: CommentSpec = {
        line: [{ token: '//' }],
        preserve: [/^\/\/go:[a-z]+/],
      };
      expect(removeBySpec('//go:embed file.txt\n// gone', spec)).toBe('//go:embed file.txt');
    });

    it('keeps a block comment matching a preserve pattern', () => {
      const spec: CommentSpec = {
        block: [{ open: '/*', close: '*/' }],
        preserve: [/^\/\*!/],
      };
      expect(removeBySpec('/*! keep */ x /* drop */', spec)).toBe('/*! keep */ x');
    });
  });

  describe('preserveLicense', () => {
    it('keeps license line comments', () => {
      expect(removeBySpec('// Copyright 2024\n// normal\ncode();', cLike, true)).toBe(
        '// Copyright 2024\ncode();'
      );
    });

    it('keeps license block comments', () => {
      const input = '/* License: MIT */\n/* internal */\ncode();';
      expect(removeBySpec(input, cLike, true)).toBe('/* License: MIT */\ncode();');
    });

    it('drops license comments when preserveLicense is false', () => {
      expect(removeBySpec('// Copyright 2024\ncode();', cLike, false)).toBe('code();');
    });
  });

  describe('keepEmptyLines', () => {
    it('removes resulting blank lines when false', () => {
      expect(removeBySpec('a;\n// gone\nb;', cLike, false, false)).toBe('a;\nb;');
    });

    it('preserves blank lines when true', () => {
      expect(removeBySpec('a;\n// gone\nb;', cLike, false, true)).toBe('a;\n\nb;');
    });

    it('preserves the newline count of a removed multi-line block comment when true', () => {
      const input = 'a;\n/* one\ntwo */\nb;';
      expect(removeBySpec(input, cLike, false, true)).toBe('a;\n\n\nb;');
    });
  });

  describe('robustness', () => {
    it('returns empty input unchanged', () => {
      expect(removeBySpec('', cLike)).toBe('');
    });

    it('uses the default string delimiter when none is supplied', () => {
      const spec: CommentSpec = { line: [{ token: '//' }] };
      expect(removeBySpec('x = "a // b"; // gone', spec)).toBe('x = "a // b";');
    });
  });
});
