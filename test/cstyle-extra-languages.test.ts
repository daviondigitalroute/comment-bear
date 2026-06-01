import { removeComments } from '../src/index';

/**
 * Tests for the "Phase 2" C-style-comment languages added in
 * `src/removers/cstyle-extra-remover.ts`.
 */

describe('Dart', () => {
  test('removes line comments', () => {
    const result = removeComments('var x = 1;\n// comment\nvar y = 2;', { language: 'dart' });
    expect(result.code).toBe('var x = 1;\nvar y = 2;');
  });

  test('removes block comments', () => {
    const result = removeComments('var x = 1;\n/* block */\nvar y = 2;', { language: 'dart' });
    expect(result.code).not.toContain('block');
    expect(result.code).toContain('var x = 1;');
    expect(result.code).toContain('var y = 2;');
  });

  test('removes nested block comments fully', () => {
    const result = removeComments('var x = 1;\n/* a /* b */ c */\nvar y = 2;', { language: 'dart' });
    expect(result.code).toBe('var x = 1;\nvar y = 2;');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('var s = "http://x";', { language: 'dart' });
    expect(result.code).toBe('var s = "http://x";');
  });

  test('does not touch a comment token inside a single-quoted string', () => {
    const result = removeComments("var s = 'a // b';", { language: 'dart' });
    expect(result.code).toBe("var s = 'a // b';");
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('var x = 1;   // comment', { language: 'dart' });
    expect(result.code).toBe('var x = 1;');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('// Copyright 2024 Acme\nvar x = 1;', {
      language: 'dart',
      preserveLicense: true,
    });
    expect(result.code).toContain('// Copyright 2024 Acme');
  });
});

describe('Groovy', () => {
  test('removes line comments', () => {
    const result = removeComments('def x = 1\n// comment\ndef y = 2', { language: 'groovy' });
    expect(result.code).toBe('def x = 1\ndef y = 2');
  });

  test('removes block comments', () => {
    const result = removeComments('def x = 1\n/* block */\ndef y = 2', { language: 'groovy' });
    expect(result.code).not.toContain('block');
    expect(result.code).toContain('def x = 1');
    expect(result.code).toContain('def y = 2');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('def s = "http://x"', { language: 'groovy' });
    expect(result.code).toBe('def s = "http://x"');
  });

  test('does not touch a comment token inside a triple-quoted string', () => {
    const code = "def s = '''a // b\n/* c */ d'''";
    const result = removeComments(code, { language: 'groovy' });
    expect(result.code).toBe(code);
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('def x = 1   // comment', { language: 'groovy' });
    expect(result.code).toBe('def x = 1');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('// License: MIT\ndef x = 1', {
      language: 'groovy',
      preserveLicense: true,
    });
    expect(result.code).toContain('// License: MIT');
  });
});

describe('Solidity', () => {
  test('removes line comments', () => {
    const result = removeComments('uint x = 1;\n// comment\nuint y = 2;', { language: 'solidity' });
    expect(result.code).toBe('uint x = 1;\nuint y = 2;');
  });

  test('removes block comments', () => {
    const result = removeComments('uint x = 1;\n/* block */\nuint y = 2;', { language: 'solidity' });
    expect(result.code).not.toContain('block');
    expect(result.code).toContain('uint x = 1;');
    expect(result.code).toContain('uint y = 2;');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('string s = "http://x";', { language: 'solidity' });
    expect(result.code).toBe('string s = "http://x";');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('uint x = 1;   // comment', { language: 'solidity' });
    expect(result.code).toBe('uint x = 1;');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('// SPDX-License-Identifier: MIT\nuint x = 1;', {
      language: 'solidity',
      preserveLicense: true,
    });
    expect(result.code).toContain('// SPDX-License-Identifier: MIT');
  });
});

describe('Protobuf', () => {
  test('removes line comments', () => {
    const result = removeComments('message M {\n// comment\n}', { language: 'protobuf' });
    expect(result.code).toBe('message M {\n}');
  });

  test('removes block comments', () => {
    const result = removeComments('message M {\n/* block */\n}', { language: 'protobuf' });
    expect(result.code).not.toContain('block');
    expect(result.code).toContain('message M {');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('option java_package = "http://x";', { language: 'protobuf' });
    expect(result.code).toBe('option java_package = "http://x";');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('int32 id = 1;   // comment', { language: 'protobuf' });
    expect(result.code).toBe('int32 id = 1;');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('// Copyright 2024 Acme\nmessage M {}', {
      language: 'protobuf',
      preserveLicense: true,
    });
    expect(result.code).toContain('// Copyright 2024 Acme');
  });
});

describe('Objective-C', () => {
  test('removes line comments', () => {
    const result = removeComments('int x = 1;\n// comment\nint y = 2;', { language: 'objectivec' });
    expect(result.code).toBe('int x = 1;\nint y = 2;');
  });

  test('removes block comments', () => {
    const result = removeComments('int x = 1;\n/* block */\nint y = 2;', { language: 'objectivec' });
    expect(result.code).not.toContain('block');
    expect(result.code).toContain('int x = 1;');
    expect(result.code).toContain('int y = 2;');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('char *s = "http://x";', { language: 'objectivec' });
    expect(result.code).toBe('char *s = "http://x";');
  });

  test('preserves an @"..." NSString literal intact', () => {
    const result = removeComments('NSString *s = @"a // b";', { language: 'objectivec' });
    expect(result.code).toBe('NSString *s = @"a // b";');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('int x = 1;   // comment', { language: 'objectivec' });
    expect(result.code).toBe('int x = 1;');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('// Copyright 2024 Acme\nint x = 1;', {
      language: 'objectivec',
      preserveLicense: true,
    });
    expect(result.code).toContain('// Copyright 2024 Acme');
  });
});

describe('Zig', () => {
  test('removes line comments', () => {
    const result = removeComments('const x = 1;\n// comment\nconst y = 2;', { language: 'zig' });
    expect(result.code).toBe('const x = 1;\nconst y = 2;');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('const s = "//";', { language: 'zig' });
    expect(result.code).toBe('const s = "//";');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('const x = 1;   // comment', { language: 'zig' });
    expect(result.code).toBe('const x = 1;');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('// Copyright 2024 Acme\nconst x = 1;', {
      language: 'zig',
      preserveLicense: true,
    });
    expect(result.code).toContain('// Copyright 2024 Acme');
  });
});

describe('Vala', () => {
  test('removes line comments', () => {
    const result = removeComments('int x = 1;\n// comment\nint y = 2;', { language: 'vala' });
    expect(result.code).toBe('int x = 1;\nint y = 2;');
  });

  test('removes block comments', () => {
    const result = removeComments('int x = 1;\n/* block */\nint y = 2;', { language: 'vala' });
    expect(result.code).not.toContain('block');
    expect(result.code).toContain('int x = 1;');
    expect(result.code).toContain('int y = 2;');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('string s = "http://x";', { language: 'vala' });
    expect(result.code).toBe('string s = "http://x";');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('int x = 1;   // comment', { language: 'vala' });
    expect(result.code).toBe('int x = 1;');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('// Copyright 2024 Acme\nint x = 1;', {
      language: 'vala',
      preserveLicense: true,
    });
    expect(result.code).toContain('// Copyright 2024 Acme');
  });
});

describe('D', () => {
  test('removes line comments', () => {
    const result = removeComments('int x = 1;\n// comment\nint y = 2;', { language: 'd' });
    expect(result.code).toBe('int x = 1;\nint y = 2;');
  });

  test('removes /* */ block comments', () => {
    const result = removeComments('int x = 1;\n/* block */\nint y = 2;', { language: 'd' });
    expect(result.code).not.toContain('block');
    expect(result.code).toContain('int x = 1;');
    expect(result.code).toContain('int y = 2;');
  });

  test('/* */ block comments do not nest in D (close at first */)', () => {
    // D's /* */ comments are non-nesting: the first */ ends the comment, so
    // the trailing ` c */` survives as code.
    const result = removeComments('int x = 1;\n/* a /* b */ c */\nint y = 2;', { language: 'd' });
    expect(result.code).toBe('int x = 1;\n c */\nint y = 2;');
  });

  test('removes nested /+ +/ block comments fully', () => {
    const result = removeComments('int x = 1;\n/+ a /+ b +/ c +/\nint y = 2;', { language: 'd' });
    expect(result.code).toBe('int x = 1;\nint y = 2;');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('string s = "http://x";', { language: 'd' });
    expect(result.code).toBe('string s = "http://x";');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('int x = 1;   // comment', { language: 'd' });
    expect(result.code).toBe('int x = 1;');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('// Copyright 2024 Acme\nint x = 1;', {
      language: 'd',
      preserveLicense: true,
    });
    expect(result.code).toContain('// Copyright 2024 Acme');
  });
});

describe('GLSL', () => {
  test('removes line comments', () => {
    const result = removeComments('float x = 1.0;\n// comment\nfloat y = 2.0;', { language: 'glsl' });
    expect(result.code).toBe('float x = 1.0;\nfloat y = 2.0;');
  });

  test('removes block comments', () => {
    const result = removeComments('float x = 1.0;\n/* block */\nfloat y = 2.0;', { language: 'glsl' });
    expect(result.code).not.toContain('block');
    expect(result.code).toContain('float x = 1.0;');
    expect(result.code).toContain('float y = 2.0;');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('const s = "http://x";', { language: 'glsl' });
    expect(result.code).toBe('const s = "http://x";');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('float x = 1.0;   // comment', { language: 'glsl' });
    expect(result.code).toBe('float x = 1.0;');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('// Copyright 2024 Acme\nfloat x = 1.0;', {
      language: 'glsl',
      preserveLicense: true,
    });
    expect(result.code).toContain('// Copyright 2024 Acme');
  });
});

describe('HLSL', () => {
  test('removes line comments', () => {
    const result = removeComments('float x = 1.0;\n// comment\nfloat y = 2.0;', { language: 'hlsl' });
    expect(result.code).toBe('float x = 1.0;\nfloat y = 2.0;');
  });

  test('removes block comments', () => {
    const result = removeComments('float x = 1.0;\n/* block */\nfloat y = 2.0;', { language: 'hlsl' });
    expect(result.code).not.toContain('block');
    expect(result.code).toContain('float x = 1.0;');
    expect(result.code).toContain('float y = 2.0;');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('const s = "http://x";', { language: 'hlsl' });
    expect(result.code).toBe('const s = "http://x";');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('float x = 1.0;   // comment', { language: 'hlsl' });
    expect(result.code).toBe('float x = 1.0;');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('// Copyright 2024 Acme\nfloat x = 1.0;', {
      language: 'hlsl',
      preserveLicense: true,
    });
    expect(result.code).toContain('// Copyright 2024 Acme');
  });
});

describe('WGSL', () => {
  test('removes line comments', () => {
    const result = removeComments('var x = 1.0;\n// comment\nvar y = 2.0;', { language: 'wgsl' });
    expect(result.code).toBe('var x = 1.0;\nvar y = 2.0;');
  });

  test('removes block comments', () => {
    const result = removeComments('var x = 1.0;\n/* block */\nvar y = 2.0;', { language: 'wgsl' });
    expect(result.code).not.toContain('block');
    expect(result.code).toContain('var x = 1.0;');
    expect(result.code).toContain('var y = 2.0;');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('const s = "http://x";', { language: 'wgsl' });
    expect(result.code).toBe('const s = "http://x";');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('var x = 1.0;   // comment', { language: 'wgsl' });
    expect(result.code).toBe('var x = 1.0;');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('// Copyright 2024 Acme\nvar x = 1.0;', {
      language: 'wgsl',
      preserveLicense: true,
    });
    expect(result.code).toContain('// Copyright 2024 Acme');
  });
});

describe('JSON5', () => {
  test('removes // line comments and keeps keys/trailing comma', () => {
    const code = '{\n  // c\n  a: 1,\n}';
    const result = removeComments(code, { language: 'json5' });
    expect(result.code).not.toContain('// c');
    expect(result.code).toContain('a: 1,');
    expect(result.code).toContain('{');
    expect(result.code).toContain('}');
  });

  test('removes /* */ block comments and keeps keys/trailing comma', () => {
    const code = '{\n  /* c */\n  a: 1,\n}';
    const result = removeComments(code, { language: 'json5' });
    expect(result.code).not.toContain('c');
    expect(result.code).toContain('a: 1,');
  });

  test('does not touch a comment token inside a string', () => {
    const result = removeComments('{ a: "http://x" }', { language: 'json5' });
    expect(result.code).toBe('{ a: "http://x" }');
  });

  test('does not touch a comment token inside a single-quoted string', () => {
    const result = removeComments("{ a: 'b // c' }", { language: 'json5' });
    expect(result.code).toBe("{ a: 'b // c' }");
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('{ a: 1,   // comment\n}', { language: 'json5' });
    expect(result.code).toBe('{ a: 1,\n}');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('// Copyright 2024 Acme\n{ a: 1 }', {
      language: 'json5',
      preserveLicense: true,
    });
    expect(result.code).toContain('// Copyright 2024 Acme');
  });
});
