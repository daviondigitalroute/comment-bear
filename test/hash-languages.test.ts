import { removeComments } from '../src/index';

/**
 * Tests for the "Phase 1" hash-comment and related languages added in
 * `src/removers/hash-remover.ts`.
 */

describe('Shell', () => {
  test('removes line comments', () => {
    const result = removeComments('x=1\n# a comment\ny=2', { language: 'shell' });
    expect(result.code).toBe('x=1\ny=2');
  });

  test('does not touch # inside a string', () => {
    const result = removeComments('echo "a # b"', { language: 'shell' });
    expect(result.code).toBe('echo "a # b"');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('x=1   # comment', { language: 'shell' });
    expect(result.code).toBe('x=1');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('# Copyright 2024 Acme\nx=1', {
      language: 'shell',
      preserveLicense: true,
    });
    expect(result.code).toContain('# Copyright 2024 Acme');
  });
});

describe('PowerShell', () => {
  test('removes line comments', () => {
    const result = removeComments('$x = 1\n# comment\n$y = 2', { language: 'powershell' });
    expect(result.code).toBe('$x = 1\n$y = 2');
  });

  test('does not touch # inside a string', () => {
    const result = removeComments('Write-Output "a # b"', { language: 'powershell' });
    expect(result.code).toBe('Write-Output "a # b"');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('$x = 1   # comment', { language: 'powershell' });
    expect(result.code).toBe('$x = 1');
  });

  test('removes a <# #> block comment', () => {
    const result = removeComments('$x = 1\n<#\nblock comment\n#>\n$y = 2', {
      language: 'powershell',
    });
    expect(result.code).not.toContain('block comment');
    expect(result.code).toContain('$x = 1');
    expect(result.code).toContain('$y = 2');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('# License: MIT\n$x = 1', {
      language: 'powershell',
      preserveLicense: true,
    });
    expect(result.code).toContain('# License: MIT');
  });
});

describe('Perl', () => {
  test('removes line comments', () => {
    const result = removeComments('my $x = 1;\n# comment\nmy $y = 2;', { language: 'perl' });
    expect(result.code).toBe('my $x = 1;\nmy $y = 2;');
  });

  test('does not touch # inside a string', () => {
    const result = removeComments('print "a # b";', { language: 'perl' });
    expect(result.code).toBe('print "a # b";');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('my $x = 1;   # comment', { language: 'perl' });
    expect(result.code).toBe('my $x = 1;');
  });

  test('removes a POD block', () => {
    const code = 'my $x = 1;\n=pod\nThis is documentation.\nMore docs.\n=cut\nmy $y = 2;';
    const result = removeComments(code, { language: 'perl' });
    expect(result.code).not.toContain('documentation');
    expect(result.code).toContain('my $x = 1;');
    expect(result.code).toContain('my $y = 2;');
  });

  test('preserveLicense keeps a license POD block', () => {
    const code = 'my $x = 1;\n=head1 LICENSE\nCopyright 2024 Acme\n=cut\nmy $y = 2;';
    const result = removeComments(code, { language: 'perl', preserveLicense: true });
    expect(result.code).toContain('Copyright 2024 Acme');
  });

  test('preserveLicense keeps a license line comment', () => {
    const result = removeComments('# Copyright 2024\nmy $x = 1;', {
      language: 'perl',
      preserveLicense: true,
    });
    expect(result.code).toContain('# Copyright 2024');
  });
});

describe('R', () => {
  test('removes line comments', () => {
    const result = removeComments('x <- 1\n# comment\ny <- 2', { language: 'r' });
    expect(result.code).toBe('x <- 1\ny <- 2');
  });

  test('does not touch # inside a string', () => {
    const result = removeComments('x <- "a # b"', { language: 'r' });
    expect(result.code).toBe('x <- "a # b"');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('x <- 1   # comment', { language: 'r' });
    expect(result.code).toBe('x <- 1');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('# Copyright 2024\nx <- 1', {
      language: 'r',
      preserveLicense: true,
    });
    expect(result.code).toContain('# Copyright 2024');
  });
});

describe('TOML', () => {
  test('removes line comments', () => {
    const result = removeComments('a = 1\n# comment\nb = 2', { language: 'toml' });
    expect(result.code).toBe('a = 1\nb = 2');
  });

  test('does not touch # inside a string', () => {
    const result = removeComments('x = "#1"', { language: 'toml' });
    expect(result.code).toBe('x = "#1"');
  });

  test('does not touch # inside a multiline triple-quoted string', () => {
    const result = removeComments('x = """a # b\nc # d"""', { language: 'toml' });
    expect(result.code).toBe('x = """a # b\nc # d"""');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('a = 1   # comment', { language: 'toml' });
    expect(result.code).toBe('a = 1');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('# Copyright 2024\na = 1', {
      language: 'toml',
      preserveLicense: true,
    });
    expect(result.code).toContain('# Copyright 2024');
  });
});

describe('Makefile', () => {
  test('removes line comments', () => {
    const result = removeComments('all:\n\techo hi\n# comment', { language: 'makefile' });
    expect(result.code).toBe('all:\n\techo hi');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('all:   # comment', { language: 'makefile' });
    expect(result.code).toBe('all:');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('# Copyright 2024\nall:', {
      language: 'makefile',
      preserveLicense: true,
    });
    expect(result.code).toContain('# Copyright 2024');
  });
});

describe('Dockerfile', () => {
  test('removes line comments', () => {
    const result = removeComments('FROM node\n# comment\nRUN x', { language: 'dockerfile' });
    expect(result.code).toBe('FROM node\nRUN x');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('FROM node   # comment', { language: 'dockerfile' });
    expect(result.code).toBe('FROM node');
  });

  test('preserves a # syntax= directive', () => {
    const code = '# syntax=docker/dockerfile:1\nFROM node\n# a comment';
    const result = removeComments(code, { language: 'dockerfile' });
    expect(result.code).toContain('# syntax=docker/dockerfile:1');
    expect(result.code).not.toContain('a comment');
  });

  test('preserves a # escape= directive', () => {
    const result = removeComments('# escape=`\nFROM node', { language: 'dockerfile' });
    expect(result.code).toContain('# escape=`');
  });
});

describe('INI', () => {
  test('removes # and ; line comments', () => {
    const result = removeComments('a=1\n# comment\n; another\nb=2', { language: 'ini' });
    expect(result.code).toBe('a=1\nb=2');
  });

  test('does not touch ; inside a string', () => {
    const result = removeComments('a="x ; y"', { language: 'ini' });
    expect(result.code).toBe('a="x ; y"');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('a=1   ; comment', { language: 'ini' });
    expect(result.code).toBe('a=1');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('; Copyright 2024\na=1', {
      language: 'ini',
      preserveLicense: true,
    });
    expect(result.code).toContain('; Copyright 2024');
  });
});

describe('GraphQL', () => {
  test('removes line comments', () => {
    const result = removeComments('type X {\n  # comment\n  f: Int\n}', { language: 'graphql' });
    expect(result.code).not.toContain('comment');
    expect(result.code).toContain('f: Int');
  });

  test('does not touch # inside a """ description', () => {
    const result = removeComments('"""\n# not a comment\n"""\ntype X { f: Int }', {
      language: 'graphql',
    });
    expect(result.code).toContain('# not a comment');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('f: Int   # comment', { language: 'graphql' });
    expect(result.code).toBe('f: Int');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('# Copyright 2024\ntype X { f: Int }', {
      language: 'graphql',
      preserveLicense: true,
    });
    expect(result.code).toContain('# Copyright 2024');
  });
});

describe('Elixir', () => {
  test('removes line comments', () => {
    const result = removeComments('x = 1\n# comment\ny = 2', { language: 'elixir' });
    expect(result.code).toBe('x = 1\ny = 2');
  });

  test('does not touch # inside a """ heredoc', () => {
    const result = removeComments('@doc """\n# not a comment\n"""\nx = 1', {
      language: 'elixir',
    });
    expect(result.code).toContain('# not a comment');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('x = 1   # comment', { language: 'elixir' });
    expect(result.code).toBe('x = 1');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('# Copyright 2024\nx = 1', {
      language: 'elixir',
      preserveLicense: true,
    });
    expect(result.code).toContain('# Copyright 2024');
  });
});

describe('Crystal', () => {
  test('removes line comments', () => {
    const result = removeComments('x = 1\n# comment\ny = 2', { language: 'crystal' });
    expect(result.code).toBe('x = 1\ny = 2');
  });

  test('does not touch # inside a string', () => {
    const result = removeComments('puts "a # b"', { language: 'crystal' });
    expect(result.code).toBe('puts "a # b"');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('x = 1   # comment', { language: 'crystal' });
    expect(result.code).toBe('x = 1');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('# Copyright 2024\nx = 1', {
      language: 'crystal',
      preserveLicense: true,
    });
    expect(result.code).toContain('# Copyright 2024');
  });
});

describe('Julia', () => {
  test('removes line comments', () => {
    const result = removeComments('x = 1\n# comment\ny = 2', { language: 'julia' });
    expect(result.code).toBe('x = 1\ny = 2');
  });

  test('does not touch # inside a string', () => {
    const result = removeComments('println("a # b")', { language: 'julia' });
    expect(result.code).toBe('println("a # b")');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('x = 1   # comment', { language: 'julia' });
    expect(result.code).toBe('x = 1');
  });

  test('removes a #= =# block comment', () => {
    const result = removeComments('x = 1\n#= block\ncomment =#\ny = 2', { language: 'julia' });
    expect(result.code).not.toContain('block');
    expect(result.code).toContain('x = 1');
    expect(result.code).toContain('y = 2');
  });

  test('removes a nested #= =# block comment', () => {
    const result = removeComments('a #= b #= c =# d =# e', { language: 'julia' });
    expect(result.code).toBe('a e');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('# Copyright 2024\nx = 1', {
      language: 'julia',
      preserveLicense: true,
    });
    expect(result.code).toContain('# Copyright 2024');
  });
});

describe('Nim', () => {
  test('removes line comments', () => {
    const result = removeComments('x = 1\n# comment\ny = 2', { language: 'nim' });
    expect(result.code).toBe('x = 1\ny = 2');
  });

  test('does not touch # inside a string', () => {
    const result = removeComments('echo "a # b"', { language: 'nim' });
    expect(result.code).toBe('echo "a # b"');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('x = 1   # comment', { language: 'nim' });
    expect(result.code).toBe('x = 1');
  });

  test('removes a #[ ]# block comment', () => {
    const result = removeComments('x = 1\n#[ block\ncomment ]#\ny = 2', { language: 'nim' });
    expect(result.code).not.toContain('block');
    expect(result.code).toContain('x = 1');
    expect(result.code).toContain('y = 2');
  });

  test('removes a nested #[ ]# block comment', () => {
    const result = removeComments('a #[ b #[ c ]# d ]# e', { language: 'nim' });
    expect(result.code).toBe('a e');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('# Copyright 2024\nx = 1', {
      language: 'nim',
      preserveLicense: true,
    });
    expect(result.code).toContain('# Copyright 2024');
  });
});

describe('CoffeeScript', () => {
  test('removes line comments', () => {
    const result = removeComments('x = 1\n# comment\ny = 2', { language: 'coffeescript' });
    expect(result.code).toBe('x = 1\ny = 2');
  });

  test('does not touch # inside a string', () => {
    const result = removeComments('console.log "a # b"', { language: 'coffeescript' });
    expect(result.code).toBe('console.log "a # b"');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('x = 1   # comment', { language: 'coffeescript' });
    expect(result.code).toBe('x = 1');
  });

  test('removes a ### ### block comment', () => {
    const result = removeComments('x = 1\n###\nblock comment\n###\ny = 2', {
      language: 'coffeescript',
    });
    expect(result.code).not.toContain('block comment');
    expect(result.code).toContain('x = 1');
    expect(result.code).toContain('y = 2');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('# Copyright 2024\nx = 1', {
      language: 'coffeescript',
      preserveLicense: true,
    });
    expect(result.code).toContain('# Copyright 2024');
  });
});

describe('Tcl', () => {
  test('removes line comments', () => {
    const result = removeComments('set x 1\n# comment\nset y 2', { language: 'tcl' });
    expect(result.code).toBe('set x 1\nset y 2');
  });

  test('does not touch # inside a string', () => {
    const result = removeComments('puts "a # b"', { language: 'tcl' });
    expect(result.code).toBe('puts "a # b"');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('set x 1   # comment', { language: 'tcl' });
    expect(result.code).toBe('set x 1');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('# Copyright 2024\nset x 1', {
      language: 'tcl',
      preserveLicense: true,
    });
    expect(result.code).toContain('# Copyright 2024');
  });
});

describe('CMake', () => {
  test('removes line comments', () => {
    const result = removeComments('set(X 1)\n# comment\nset(Y 2)', { language: 'cmake' });
    expect(result.code).toBe('set(X 1)\nset(Y 2)');
  });

  test('does not touch # inside a string', () => {
    const result = removeComments('set(X "a # b")', { language: 'cmake' });
    expect(result.code).toBe('set(X "a # b")');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('set(X 1)   # comment', { language: 'cmake' });
    expect(result.code).toBe('set(X 1)');
  });

  test('removes a #[[ ]] block comment', () => {
    const result = removeComments('set(X 1)\n#[[\nblock comment\n]]\nset(Y 2)', {
      language: 'cmake',
    });
    expect(result.code).not.toContain('block comment');
    expect(result.code).toContain('set(X 1)');
    expect(result.code).toContain('set(Y 2)');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('# Copyright 2024\nset(X 1)', {
      language: 'cmake',
      preserveLicense: true,
    });
    expect(result.code).toContain('# Copyright 2024');
  });
});

describe('Properties', () => {
  test('removes # and ! line comments', () => {
    const result = removeComments('a=1\n# comment\n! another\nb=2', { language: 'properties' });
    expect(result.code).toBe('a=1\nb=2');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('a=1   # comment', { language: 'properties' });
    expect(result.code).toBe('a=1');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('# Copyright 2024\na=1', {
      language: 'properties',
      preserveLicense: true,
    });
    expect(result.code).toContain('# Copyright 2024');
  });
});

describe('Puppet', () => {
  test('removes line comments', () => {
    const result = removeComments('$x = 1\n# comment\n$y = 2', { language: 'puppet' });
    expect(result.code).toBe('$x = 1\n$y = 2');
  });

  test('does not touch # inside a string', () => {
    const result = removeComments('notice("a # b")', { language: 'puppet' });
    expect(result.code).toBe('notice("a # b")');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('$x = 1   # comment', { language: 'puppet' });
    expect(result.code).toBe('$x = 1');
  });

  test('removes a /* */ block comment', () => {
    const result = removeComments('$x = 1\n/* block\ncomment */\n$y = 2', { language: 'puppet' });
    expect(result.code).not.toContain('block');
    expect(result.code).toContain('$x = 1');
    expect(result.code).toContain('$y = 2');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('# Copyright 2024\n$x = 1', {
      language: 'puppet',
      preserveLicense: true,
    });
    expect(result.code).toContain('# Copyright 2024');
  });
});

describe('HCL', () => {
  test('removes # and // line comments', () => {
    const result = removeComments('a = 1 # c\nb = 2 // d', { language: 'hcl' });
    expect(result.code).toBe('a = 1\nb = 2');
  });

  test('does not touch # inside a string', () => {
    const result = removeComments('a = "x # y"', { language: 'hcl' });
    expect(result.code).toBe('a = "x # y"');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('a = 1   // comment', { language: 'hcl' });
    expect(result.code).toBe('a = 1');
  });

  test('removes a /* */ block comment', () => {
    const result = removeComments('a = 1\n/* block\ncomment */\nb = 2', { language: 'hcl' });
    expect(result.code).not.toContain('block');
    expect(result.code).toContain('a = 1');
    expect(result.code).toContain('b = 2');
  });

  test('preserveLicense keeps a license comment', () => {
    const result = removeComments('# Copyright 2024\na = 1', {
      language: 'hcl',
      preserveLicense: true,
    });
    expect(result.code).toContain('# Copyright 2024');
  });
});

describe.each([
  ['scss' as const],
  ['less' as const],
  ['sass' as const],
])('CSS preprocessor: %s', (lang) => {
  test('removes // line comments', () => {
    const result = removeComments('a { color: red; } // comment', { language: lang });
    expect(result.code).toBe('a { color: red; }');
  });

  test('does not touch // inside a string value', () => {
    const result = removeComments('a { content: "//x"; }', { language: lang });
    expect(result.code).toBe('a { content: "//x"; }');
  });

  test('inline comment removal leaves no trailing space', () => {
    const result = removeComments('color: red;   // comment', { language: lang });
    expect(result.code).toBe('color: red;');
  });

  test('removes a /* */ block comment', () => {
    const result = removeComments('a {}\n/* block\ncomment */\nb {}', { language: lang });
    expect(result.code).not.toContain('block');
    expect(result.code).toContain('a {}');
    expect(result.code).toContain('b {}');
  });

  test('preserveLicense keeps a license block comment', () => {
    const result = removeComments('/* Copyright 2024 */\na {}', {
      language: lang,
      preserveLicense: true,
    });
    expect(result.code).toContain('Copyright 2024');
  });
});
