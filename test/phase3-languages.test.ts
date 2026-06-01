import { removeComments } from '../src/index';
import { removeBySpec } from '../src/removers/_shared';
import { detectLanguageByFilename } from '../src/detectors/language-detector';

/**
 * Tests for the "Phase 3" languages added in
 * `src/removers/phase3-remover.ts`, plus the additive `onlyAtLineStart`
 * engine extension in `_shared.ts`.
 */

describe('Engine: onlyAtLineStart line comments', () => {
  test('removes a comment when the token is at the start of the line', () => {
    const out = removeBySpec('" a comment\nset nu', {
      line: [{ token: '"', onlyAtLineStart: true }],
      strings: [{ open: '"', close: '"', escape: '\\' }],
    });
    expect(out).toBe('set nu');
  });

  test('does NOT treat a mid-line token as a comment', () => {
    const out = removeBySpec('echo "hi"', {
      line: [{ token: '"', onlyAtLineStart: true }],
      strings: [{ open: '"', close: '"', escape: '\\' }],
    });
    expect(out).toBe('echo "hi"');
  });

  test('removes a comment after leading whitespace only', () => {
    const out = removeBySpec('   " indented comment\ncode', {
      line: [{ token: '"', onlyAtLineStart: true }],
      strings: [{ open: '"', close: '"', escape: '\\' }],
    });
    expect(out).toBe('code');
  });
});

describe('Lua', () => {
  test('removes line comments', () => {
    const result = removeComments('local x = 1\n-- comment\nlocal y = 2', { language: 'lua' });
    expect(result.code).toBe('local x = 1\nlocal y = 2');
  });

  test('removes a long-bracket block comment', () => {
    const result = removeComments('--[[ long /* comment */ ]]\nprint(1)', { language: 'lua' });
    expect(result.code).toBe('print(1)');
  });

  test('removes a leveled long-bracket comment', () => {
    const result = removeComments('--[=[ leveled\ncomment ]=]\nprint(2)', { language: 'lua' });
    expect(result.code).toBe('print(2)');
  });

  test('does not touch "--" inside a string', () => {
    const result = removeComments('local s = "--"', { language: 'lua' });
    expect(result.code).toBe('local s = "--"');
  });

  test('does not touch -- inside a long string', () => {
    const result = removeComments('local t = [[ -- not a comment ]]\nprint(1)', { language: 'lua' });
    expect(result.code).toBe('local t = [[ -- not a comment ]]\nprint(1)');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('local x = 1   -- comment', { language: 'lua' });
    expect(result.code).toBe('local x = 1');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('-- Copyright 2024 Acme\nprint(1)', {
      language: 'lua',
      preserveLicense: true,
    });
    expect(result.code).toContain('-- Copyright 2024 Acme');
  });

  test('keepEmptyLines preserves block newline count', () => {
    const result = removeComments('--[[\nx\n]]\nprint(1)', {
      language: 'lua',
      keepEmptyLines: true,
    });
    expect(result.code).toBe('\n\n\nprint(1)');
  });
});

describe('Elm', () => {
  test('removes line comments', () => {
    const result = removeComments('x = 1\n-- comment\ny = 2', { language: 'elm' });
    expect(result.code).toBe('x = 1\ny = 2');
  });

  test('removes nested block comments fully', () => {
    const result = removeComments('x = 1 {- a {- b -} c -}\ny = 2', { language: 'elm' });
    expect(result.code).toBe('x = 1\ny = 2');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('s = "-- not a comment"', { language: 'elm' });
    expect(result.code).toBe('s = "-- not a comment"');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('x = 1   -- comment', { language: 'elm' });
    expect(result.code).toBe('x = 1');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('-- Copyright 2024\nx = 1', {
      language: 'elm',
      preserveLicense: true,
    });
    expect(result.code).toContain('Copyright');
  });
});

describe('Ada', () => {
  test('removes line comments', () => {
    const result = removeComments('X := 1;\n-- comment\nY := 2;', { language: 'ada' });
    expect(result.code).toBe('X := 1;\nY := 2;');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('S := "-- not a comment";', { language: 'ada' });
    expect(result.code).toBe('S := "-- not a comment";');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('X := 1;   -- comment', { language: 'ada' });
    expect(result.code).toBe('X := 1;');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('-- Copyright 2024\nX := 1;', {
      language: 'ada',
      preserveLicense: true,
    });
    expect(result.code).toContain('Copyright');
  });
});

describe('VHDL', () => {
  test('removes line comments', () => {
    const result = removeComments('signal a : bit;\n-- comment\nsignal b : bit;', { language: 'vhdl' });
    expect(result.code).toBe('signal a : bit;\nsignal b : bit;');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('s <= "-- not";', { language: 'vhdl' });
    expect(result.code).toBe('s <= "-- not";');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('a <= 1;   -- comment', { language: 'vhdl' });
    expect(result.code).toBe('a <= 1;');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('-- License: MIT\na <= 1;', {
      language: 'vhdl',
      preserveLicense: true,
    });
    expect(result.code).toContain('License');
  });
});

describe('AppleScript', () => {
  test('removes -- line comments', () => {
    const result = removeComments('set x to 1\n-- comment\nset y to 2', { language: 'applescript' });
    expect(result.code).toBe('set x to 1\nset y to 2');
  });

  test('removes # line comments', () => {
    const result = removeComments('set x to 1\n# comment\nset y to 2', { language: 'applescript' });
    expect(result.code).toBe('set x to 1\nset y to 2');
  });

  test('removes nested block comments fully', () => {
    const result = removeComments('set x to 1 (* a (* b *) c *)\nset y to 2', { language: 'applescript' });
    expect(result.code).toBe('set x to 1\nset y to 2');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('set s to "-- not"', { language: 'applescript' });
    expect(result.code).toBe('set s to "-- not"');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('set x to 1   -- comment', { language: 'applescript' });
    expect(result.code).toBe('set x to 1');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('-- Copyright 2024\nset x to 1', {
      language: 'applescript',
      preserveLicense: true,
    });
    expect(result.code).toContain('Copyright');
  });
});

describe('Clojure', () => {
  test('removes line comments', () => {
    const result = removeComments('(def x 1)\n; comment\n(def y 2)', { language: 'clojure' });
    expect(result.code).toBe('(def x 1)\n(def y 2)');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('(def s "a ; b")', { language: 'clojure' });
    expect(result.code).toBe('(def s "a ; b")');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('(def x 1)   ; comment', { language: 'clojure' });
    expect(result.code).toBe('(def x 1)');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('; Copyright 2024\n(def x 1)', {
      language: 'clojure',
      preserveLicense: true,
    });
    expect(result.code).toContain('Copyright');
  });
});

describe('Common Lisp', () => {
  test('removes line comments', () => {
    const result = removeComments('(setq x 1)\n; comment\n(setq y 2)', { language: 'commonlisp' });
    expect(result.code).toBe('(setq x 1)\n(setq y 2)');
  });

  test('removes nested block comments fully', () => {
    const result = removeComments('(setq x 1) #| a #| b |# c |#\n(setq y 2)', { language: 'commonlisp' });
    expect(result.code).toBe('(setq x 1)\n(setq y 2)');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('(setq s "a ; b")', { language: 'commonlisp' });
    expect(result.code).toBe('(setq s "a ; b")');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('; Copyright 2024\n(setq x 1)', {
      language: 'commonlisp',
      preserveLicense: true,
    });
    expect(result.code).toContain('Copyright');
  });
});

describe('Scheme', () => {
  test('removes line comments', () => {
    const result = removeComments('(define x 1)\n; comment\n(define y 2)', { language: 'scheme' });
    expect(result.code).toBe('(define x 1)\n(define y 2)');
  });

  test('removes nested block comments fully', () => {
    const result = removeComments('(define x 1) #| a #| b |# c |#\n(define y 2)', { language: 'scheme' });
    expect(result.code).toBe('(define x 1)\n(define y 2)');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('(define s "a ; b")', { language: 'scheme' });
    expect(result.code).toBe('(define s "a ; b")');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('; Copyright 2024\n(define x 1)', {
      language: 'scheme',
      preserveLicense: true,
    });
    expect(result.code).toContain('Copyright');
  });
});

describe('Emacs Lisp', () => {
  test('removes line comments', () => {
    const result = removeComments('(setq x 1)\n; comment\n(setq y 2)', { language: 'emacslisp' });
    expect(result.code).toBe('(setq x 1)\n(setq y 2)');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('(setq s "a ; b")', { language: 'emacslisp' });
    expect(result.code).toBe('(setq s "a ; b")');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('(setq x 1)   ; comment', { language: 'emacslisp' });
    expect(result.code).toBe('(setq x 1)');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('; Copyright 2024\n(setq x 1)', {
      language: 'emacslisp',
      preserveLicense: true,
    });
    expect(result.code).toContain('Copyright');
  });
});

describe('Assembly', () => {
  test('removes line comments', () => {
    const result = removeComments('mov ax, 1\n; comment\nmov bx, 2', { language: 'assembly' });
    expect(result.code).toBe('mov ax, 1\nmov bx, 2');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('msg: db "a ; b"', { language: 'assembly' });
    expect(result.code).toBe('msg: db "a ; b"');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('mov ax, 1   ; comment', { language: 'assembly' });
    expect(result.code).toBe('mov ax, 1');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('; Copyright 2024\nmov ax, 1', {
      language: 'assembly',
      preserveLicense: true,
    });
    expect(result.code).toContain('Copyright');
  });
});

describe('Erlang', () => {
  test('removes line comments', () => {
    const result = removeComments('X = 1,\n% comment\nY = 2.', { language: 'erlang' });
    expect(result.code).toBe('X = 1,\nY = 2.');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('S = "a % b".', { language: 'erlang' });
    expect(result.code).toBe('S = "a % b".');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('X = 1,   % comment', { language: 'erlang' });
    expect(result.code).toBe('X = 1,');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('% Copyright 2024\nX = 1.', {
      language: 'erlang',
      preserveLicense: true,
    });
    expect(result.code).toContain('Copyright');
  });
});

describe('LaTeX', () => {
  test('removes a % line comment', () => {
    const result = removeComments('text\n% comment\nmore', { language: 'latex' });
    expect(result.code).toBe('text\nmore');
  });

  test('keeps an escaped \\% literal percent', () => {
    const result = removeComments('100\\% done % this is a comment', { language: 'latex' });
    expect(result.code).toBe('100\\% done');
  });

  test('removes an inline comment leaving no trailing space', () => {
    const result = removeComments('text   % comment', { language: 'latex' });
    expect(result.code).toBe('text');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('% Copyright 2024\ntext', {
      language: 'latex',
      preserveLicense: true,
    });
    expect(result.code).toContain('Copyright');
  });
});

describe('MATLAB', () => {
  test('removes a % line comment', () => {
    const result = removeComments('x = 1; % comment\ny = 2;', { language: 'matlab' });
    expect(result.code).toBe('x = 1;\ny = 2;');
  });

  test('removes a %{ %} block comment', () => {
    const result = removeComments('x = 1;\n%{\nblock\n%}\ny = 2;', { language: 'matlab' });
    expect(result.code).toBe('x = 1;\ny = 2;');
  });

  test('does not corrupt the transpose operator', () => {
    const result = removeComments("x = a'\ny = 2;", { language: 'matlab' });
    expect(result.code).toContain("a'");
  });

  test('does not touch a % inside a double-quoted string', () => {
    const result = removeComments('s = "a % b";', { language: 'matlab' });
    expect(result.code).toBe('s = "a % b";');
  });

  test('does not treat ... as a comment', () => {
    const result = removeComments('x = 1 + ...\n2;', { language: 'matlab' });
    expect(result.code).toContain('...');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('% Copyright 2024\nx = 1;', {
      language: 'matlab',
      preserveLicense: true,
    });
    expect(result.code).toContain('Copyright');
  });
});

describe('Prolog', () => {
  test('removes % line comments', () => {
    const result = removeComments('foo(1).\n% comment\nbar(2).', { language: 'prolog' });
    expect(result.code).toBe('foo(1).\nbar(2).');
  });

  test('removes /* */ block comments', () => {
    const result = removeComments('foo(1). /* block */\nbar(2).', { language: 'prolog' });
    expect(result.code).toBe('foo(1).\nbar(2).');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('s("a % b").', { language: 'prolog' });
    expect(result.code).toBe('s("a % b").');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('% Copyright 2024\nfoo(1).', {
      language: 'prolog',
      preserveLicense: true,
    });
    expect(result.code).toContain('Copyright');
  });
});

describe('OCaml', () => {
  test('removes block comments', () => {
    const result = removeComments('let x = 1 (* comment *)\nlet y = 2', { language: 'ocaml' });
    expect(result.code).toBe('let x = 1\nlet y = 2');
  });

  test('removes nested block comments fully', () => {
    const result = removeComments('let x = 1 (* a (* b *) c *)\nlet y = 2', { language: 'ocaml' });
    expect(result.code).toBe('let x = 1\nlet y = 2');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('let s = "(* not a comment *)"', { language: 'ocaml' });
    expect(result.code).toBe('let s = "(* not a comment *)"');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('(* Copyright 2024 *)\nlet x = 1', {
      language: 'ocaml',
      preserveLicense: true,
    });
    expect(result.code).toContain('Copyright');
  });
});

describe('F#', () => {
  test('removes line comments', () => {
    const result = removeComments('let x = 1\n// comment\nlet y = 2', { language: 'fsharp' });
    expect(result.code).toBe('let x = 1\nlet y = 2');
  });

  test('removes nested block comments fully', () => {
    const result = removeComments('let x = 1 (* a (* b *) c *)\nlet y = 2', { language: 'fsharp' });
    expect(result.code).toBe('let x = 1\nlet y = 2');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('let s = "a // b"', { language: 'fsharp' });
    expect(result.code).toBe('let s = "a // b"');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('let x = 1   // comment', { language: 'fsharp' });
    expect(result.code).toBe('let x = 1');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('// Copyright 2024\nlet x = 1', {
      language: 'fsharp',
      preserveLicense: true,
    });
    expect(result.code).toContain('Copyright');
  });
});

describe('Standard ML', () => {
  test('removes block comments', () => {
    const result = removeComments('val x = 1 (* comment *)\nval y = 2', { language: 'sml' });
    expect(result.code).toBe('val x = 1\nval y = 2');
  });

  test('removes nested block comments fully', () => {
    const result = removeComments('val x = 1 (* a (* b *) c *)\nval y = 2', { language: 'sml' });
    expect(result.code).toBe('val x = 1\nval y = 2');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('val s = "(* not *)"', { language: 'sml' });
    expect(result.code).toBe('val s = "(* not *)"');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('(* Copyright 2024 *)\nval x = 1', {
      language: 'sml',
      preserveLicense: true,
    });
    expect(result.code).toContain('Copyright');
  });
});

describe('Pascal', () => {
  test('removes // line comments', () => {
    const result = removeComments('x := 1; // comment\ny := 2;', { language: 'pascal' });
    expect(result.code).toBe('x := 1;\ny := 2;');
  });

  test('removes (* *) and { } block comments and // all removed', () => {
    const result = removeComments('x := 1; // line\n(* block *)\n{ brace }\ny := 2;', { language: 'pascal' });
    expect(result.code).toBe('x := 1;\ny := 2;');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments("s := '// not a comment';", { language: 'pascal' });
    expect(result.code).toBe("s := '// not a comment';");
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('{ Copyright 2024 }\nx := 1;', {
      language: 'pascal',
      preserveLicense: true,
    });
    expect(result.code).toContain('Copyright');
  });
});

describe('Visual Basic', () => {
  test("removes ' apostrophe comments", () => {
    const result = removeComments("Dim x = 1 ' comment\nDim y = 2", { language: 'vb' });
    expect(result.code).toBe('Dim x = 1\nDim y = 2');
  });

  test('removes a whole-line REM statement', () => {
    const result = removeComments('REM whole line\nDim x = 1', { language: 'vb' });
    expect(result.code).toBe('Dim x = 1');
  });

  test('does not touch the REMOVE identifier', () => {
    const result = removeComments('REMOVE = 1', { language: 'vb' });
    expect(result.code).toBe('REMOVE = 1');
  });

  test("keeps a string containing an apostrophe", () => {
    const result = removeComments('x = "don\'t"', { language: 'vb' });
    expect(result.code).toBe('x = "don\'t"');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments("Dim x = 1   ' comment", { language: 'vb' });
    expect(result.code).toBe('Dim x = 1');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments("' Copyright 2024\nDim x = 1", {
      language: 'vb',
      preserveLicense: true,
    });
    expect(result.code).toContain('Copyright');
  });
});

describe('Batch', () => {
  test('removes REM statements and :: comments', () => {
    const result = removeComments('echo hi\nREM a comment\n:: label comment\necho bye', { language: 'batch' });
    expect(result.code).toBe('echo hi\necho bye');
  });

  test('keeps a normal echo line', () => {
    const result = removeComments('echo hi', { language: 'batch' });
    expect(result.code).toBe('echo hi');
  });

  test('preserveLicense keeps a license REM line', () => {
    const result = removeComments('REM Copyright 2024\necho hi', {
      language: 'batch',
      preserveLicense: true,
    });
    expect(result.code).toContain('Copyright');
  });

  test('keepEmptyLines preserves removed comment lines as blanks', () => {
    const result = removeComments('echo hi\nREM x\necho bye', {
      language: 'batch',
      keepEmptyLines: true,
    });
    expect(result.code).toBe('echo hi\n\necho bye');
  });
});

describe('Fortran', () => {
  test('removes ! line comments', () => {
    const result = removeComments('x = 1 ! comment\ny = 2', { language: 'fortran' });
    expect(result.code).toBe('x = 1\ny = 2');
  });

  test('keeps a "!" inside a string', () => {
    const result = removeComments('s = "a!b"', { language: 'fortran' });
    expect(result.code).toBe('s = "a!b"');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('x = 1   ! comment', { language: 'fortran' });
    expect(result.code).toBe('x = 1');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('! Copyright 2024\nx = 1', {
      language: 'fortran',
      preserveLicense: true,
    });
    expect(result.code).toContain('Copyright');
  });
});

describe('Vimscript', () => {
  test('removes a full-line " comment', () => {
    const result = removeComments('" a comment\nset nu', { language: 'vimscript' });
    expect(result.code).toBe('set nu');
  });

  test('does not corrupt an inline string', () => {
    const result = removeComments('echo "hi"', { language: 'vimscript' });
    expect(result.code).toBe('echo "hi"');
  });

  test('removes an indented full-line comment', () => {
    const result = removeComments('  " indented\nset nu', { language: 'vimscript' });
    expect(result.code).toBe('set nu');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('" Copyright 2024\nset nu', {
      language: 'vimscript',
      preserveLicense: true,
    });
    expect(result.code).toContain('Copyright');
  });
});

describe('Phase 3 language detection', () => {
  test('detects the new extensions', () => {
    expect(detectLanguageByFilename('x.lua')).toBe('lua');
    expect(detectLanguageByFilename('x.elm')).toBe('elm');
    expect(detectLanguageByFilename('x.adb')).toBe('ada');
    expect(detectLanguageByFilename('x.ads')).toBe('ada');
    expect(detectLanguageByFilename('x.vhd')).toBe('vhdl');
    expect(detectLanguageByFilename('x.vhdl')).toBe('vhdl');
    expect(detectLanguageByFilename('x.applescript')).toBe('applescript');
    expect(detectLanguageByFilename('x.clj')).toBe('clojure');
    expect(detectLanguageByFilename('x.cljs')).toBe('clojure');
    expect(detectLanguageByFilename('x.cljc')).toBe('clojure');
    expect(detectLanguageByFilename('x.edn')).toBe('clojure');
    expect(detectLanguageByFilename('x.lisp')).toBe('commonlisp');
    expect(detectLanguageByFilename('x.cl')).toBe('commonlisp');
    expect(detectLanguageByFilename('x.scm')).toBe('scheme');
    expect(detectLanguageByFilename('x.ss')).toBe('scheme');
    expect(detectLanguageByFilename('x.rkt')).toBe('scheme');
    expect(detectLanguageByFilename('x.el')).toBe('emacslisp');
    expect(detectLanguageByFilename('x.asm')).toBe('assembly');
    expect(detectLanguageByFilename('x.s')).toBe('assembly');
    expect(detectLanguageByFilename('x.erl')).toBe('erlang');
    expect(detectLanguageByFilename('x.hrl')).toBe('erlang');
    expect(detectLanguageByFilename('x.tex')).toBe('latex');
    expect(detectLanguageByFilename('x.sty')).toBe('latex');
    expect(detectLanguageByFilename('x.ml')).toBe('ocaml');
    expect(detectLanguageByFilename('x.mli')).toBe('ocaml');
    expect(detectLanguageByFilename('x.fs')).toBe('fsharp');
    expect(detectLanguageByFilename('x.fsx')).toBe('fsharp');
    expect(detectLanguageByFilename('x.fsi')).toBe('fsharp');
    expect(detectLanguageByFilename('x.sml')).toBe('sml');
    expect(detectLanguageByFilename('x.pas')).toBe('pascal');
    expect(detectLanguageByFilename('x.dpr')).toBe('pascal');
    expect(detectLanguageByFilename('x.lpr')).toBe('pascal');
    expect(detectLanguageByFilename('x.vb')).toBe('vb');
    expect(detectLanguageByFilename('x.vba')).toBe('vb');
    expect(detectLanguageByFilename('x.bas')).toBe('vb');
    expect(detectLanguageByFilename('x.bat')).toBe('batch');
    expect(detectLanguageByFilename('x.cmd')).toBe('batch');
    expect(detectLanguageByFilename('x.f90')).toBe('fortran');
    expect(detectLanguageByFilename('x.f95')).toBe('fortran');
    expect(detectLanguageByFilename('x.f03')).toBe('fortran');
    expect(detectLanguageByFilename('x.f08')).toBe('fortran');
    expect(detectLanguageByFilename('x.f')).toBe('fortran');
    expect(detectLanguageByFilename('x.for')).toBe('fortran');
    expect(detectLanguageByFilename('x.vim')).toBe('vimscript');
  });

  test('detects vimscript special filenames', () => {
    expect(detectLanguageByFilename('.vimrc')).toBe('vimscript');
    expect(detectLanguageByFilename('vimrc')).toBe('vimscript');
    expect(detectLanguageByFilename('_vimrc')).toBe('vimscript');
    expect(detectLanguageByFilename('.gvimrc')).toBe('vimscript');
  });

  test('does not reassign existing extensions for matlab/prolog', () => {
    // matlab and prolog get NO extension; `.m` stays Objective-C, `.pl` Perl.
    expect(detectLanguageByFilename('x.m')).toBe('objectivec');
    expect(detectLanguageByFilename('x.pl')).toBe('perl');
  });
});
