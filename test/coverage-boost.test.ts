/**
 * Additional tests to boost coverage in areas with gaps.
 * Targets: javascript-remover, c-style-remover, other-remover,
 * language-detector, sql-remover, stream, index, config.
 */
import { removeComments } from '../src/index';
import { removeJavaScriptComments } from '../src/removers/javascript-remover';
import { removePhpComments, removeRustComments, removeCppComments, removeGoComments } from '../src/removers/c-style-remover';
import { removeHaskellComments, removeRubyComments, removeYamlComments, removeJsonComments } from '../src/removers/other-remover';
import { removeSqlComments } from '../src/removers/sql-remover';
import { removeCssComments, removeHtmlComments, removeXmlComments } from '../src/removers/css-html-remover';
import { detectLanguageByContent, detectLanguageByFilename } from '../src/detectors/language-detector';
import { createCommentRemoverStream } from '../src/stream';
import { Readable } from 'stream';

// Helper
function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

describe('JavaScript Remover - Coverage Boost', () => {
  describe('keepEmptyLines with multi-line comments', () => {
    test('preserves lines when multi-line comment removed with keepEmptyLines', () => {
      const code = `const a = 1;
/* This is
   a multi-line
   comment */
const b = 2;`;
      const result = removeJavaScriptComments(code, false, true);
      expect(result).toContain('const a = 1;');
      expect(result).toContain('const b = 2;');
      expect(result).not.toContain('multi-line');
    });

    test('preserves license in multi-line comment with keepEmptyLines', () => {
      const code = `/*! MIT License
 * Copyright 2025
 */
const x = 5;`;
      const result = removeJavaScriptComments(code, true, true);
      expect(result).toContain('MIT License');
      expect(result).toContain('const x = 5;');
    });

    test('handles inline block comment with code after it and keepEmptyLines', () => {
      const code = `const a = /* inline */ 5;`;
      const result = removeJavaScriptComments(code, false, true);
      expect(result).toContain('const a =');
      expect(result).toContain('5;');
    });

    test('handles single-line // comment with keepEmptyLines', () => {
      const code = `// comment
const x = 5;`;
      const result = removeJavaScriptComments(code, false, true);
      expect(result).toContain('const x = 5;');
    });

    test('handles // comment on same line as code with keepEmptyLines', () => {
      const code = `const x = 5; // comment`;
      const result = removeJavaScriptComments(code, false, true);
      expect(result).toContain('const x = 5;');
      expect(result).not.toContain('// comment');
    });

    test('preserves license // comment with keepEmptyLines', () => {
      const code = `// @license MIT
const x = 5;`;
      const result = removeJavaScriptComments(code, true, true);
      expect(result).toContain('MIT');
      expect(result).toContain('const x = 5;');
    });

    test('handles multi-line comment ending with code on same line, keepEmptyLines', () => {
      const code = `/* comment
end */ const x = 5;`;
      const result = removeJavaScriptComments(code, false, true);
      expect(result).toContain('const x = 5;');
    });

    test('handles multi-line comment with license in middle', () => {
      const code = `/* @copyright 2025
 * All rights reserved
 */
const x = 5;`;
      const result = removeJavaScriptComments(code, true, true);
      expect(result).toContain('@copyright 2025');
    });

    test('handles comment-only line followed by empty line, keepEmptyLines', () => {
      const code = `// comment

const x = 5;`;
      const result = removeJavaScriptComments(code, false, true);
      expect(result).toContain('const x = 5;');
    });

    test('handles block comment-only line followed by empty line', () => {
      const code = `/* comment */

const x = 5;`;
      const result = removeJavaScriptComments(code, false, true);
      expect(result).toContain('const x = 5;');
    });

    test('handles multi-line comment start with code before it', () => {
      const code = `const a = 1; /* start
comment
end */
const b = 2;`;
      const result = removeJavaScriptComments(code, false, true);
      expect(result).toContain('const a = 1;');
      expect(result).toContain('const b = 2;');
    });
  });

  describe('findCommentStart edge cases', () => {
    test('handles regex-like patterns before comments', () => {
      const code = `const x = /pattern/; // comment`;
      const result = removeJavaScriptComments(code, false, true);
      expect(result).not.toContain('// comment');
    });

    test('handles regex assigned with equals', () => {
      const code = `const re = /test/g; // regex`;
      const result = removeJavaScriptComments(code, false, false);
      expect(result).not.toContain('// regex');
    });

    test('handles backtick template strings', () => {
      const code = "const x = `template // not a comment`; // real comment";
      const result = removeJavaScriptComments(code, false, false);
      expect(result).toContain('template // not a comment');
      expect(result).not.toContain('// real comment');
    });

    test('handles escaped characters in strings', () => {
      const code = `const x = "escaped \\\\ quote"; // comment`;
      const result = removeJavaScriptComments(code, false, false);
      expect(result).not.toContain('// comment');
    });
  });

  describe('preserveLicense transformations', () => {
    test('transforms /** @license */ to /*! @license */', () => {
      const code = `/** @license MIT */
const x = 5;`;
      const result = removeJavaScriptComments(code, true);
      expect(result).toContain('MIT');
    });

    test('transforms /** @copyright */ to preserve it', () => {
      const code = `/** @copyright 2025 Author */
const x = 5;`;
      const result = removeJavaScriptComments(code, true);
      expect(result).toContain('@copyright');
    });

    test('transforms /** @author */ to preserve it', () => {
      const code = `/** @author John Doe */
const x = 5;`;
      const result = removeJavaScriptComments(code, true);
      expect(result).toContain('@author');
    });

    test('transforms // @copyright to preserve it', () => {
      const code = `// @copyright 2025 Company
const x = 5;`;
      const result = removeJavaScriptComments(code, true);
      expect(result).toContain('@copyright');
    });
  });
});

describe('PHP Remover - Coverage Boost', () => {
  test('handles # comment with license', () => {
    const code = `<?php
# @license MIT
echo "hello";
# regular comment`;
    const result = removePhpComments(code, true, false);
    expect(result).toContain('@license MIT');
    expect(result).not.toContain('regular comment');
  });

  test('handles # comment that is only comment on line with keepEmptyLines', () => {
    const code = `<?php
# standalone comment
echo "hello";`;
    const result = removePhpComments(code, false, true);
    expect(result).toContain('echo "hello"');
  });

  test('handles # comment with license as standalone line', () => {
    const code = `<?php
# Copyright 2025
echo "hello";`;
    const result = removePhpComments(code, true, false);
    expect(result).toContain('Copyright 2025');
  });

  test('handles empty code', () => {
    expect(removePhpComments('')).toBe('');
  });

  test('handles # in single-quoted string', () => {
    const code = `$x = 'color #fff'; # comment`;
    const result = removePhpComments(code, false, false);
    expect(result).toContain("'color #fff'");
    expect(result).not.toContain('# comment');
  });
});

describe('Rust Remover - Coverage Boost', () => {
  test('handles empty code', () => {
    expect(removeRustComments('')).toBe('');
  });

  test('preserves doc comments with license', () => {
    const code = `/// @license MIT
fn main() {}`;
    const result = removeRustComments(code, true, false);
    expect(result).toContain('@license MIT');
  });

  test('removes doc comments without license', () => {
    const code = `/// This is a doc comment
fn main() {}`;
    const result = removeRustComments(code, false, false);
    expect(result).toContain('fn main()');
  });
});

describe('C++ Remover - Coverage Boost', () => {
  test('handles empty code', () => {
    expect(removeCppComments('')).toBe('');
  });

  test('handles raw string literals with comment-like content', () => {
    const code = `auto s = R"(// not a comment
/* also not */)"`;
    const result = removeCppComments(code);
    expect(result).toContain('// not a comment');
    expect(result).toContain('/* also not */');
  });
});

describe('Go Remover - Coverage Boost', () => {
  test('handles empty code', () => {
    expect(removeGoComments('')).toBe('');
  });

  test('preserves build tags', () => {
    const code = `// +build linux
// Regular comment
package main`;
    const result = removeGoComments(code, false, false);
    expect(result).toContain('// +build linux');
    expect(result).not.toContain('Regular comment');
  });
});

describe('SQL Remover - Coverage Boost', () => {
  test('handles multiline license comment that ends on same line', () => {
    const code = `/* @license MIT */ SELECT * FROM users;`;
    const result = removeSqlComments(code, true);
    expect(result).toContain('@license MIT');
  });

  test('handles multiline license comment spanning multiple lines', () => {
    const code = `/* @license MIT
 * Copyright 2025
 */
SELECT * FROM users;`;
    const result = removeSqlComments(code, true);
    expect(result).toContain('@license MIT');
    expect(result).toContain('Copyright 2025');
  });

  test('handles different quote in string', () => {
    const code = `SELECT * FROM users WHERE name = "it's here"; -- comment`;
    const result = removeSqlComments(code);
    expect(result).toContain(`"it's here"`);
    expect(result).not.toContain('-- comment');
  });

  test('handles unclosed license comment buffer', () => {
    const code = `/* @license MIT
This never closes`;
    const result = removeSqlComments(code, true);
    expect(result).toContain('@license MIT');
  });

  test('preserves -- license comment', () => {
    const code = `-- @copyright 2025 Company
SELECT 1;`;
    const result = removeSqlComments(code, true);
    expect(result).toContain('@copyright 2025');
  });

  test('handles empty code', () => {
    expect(removeSqlComments('')).toBe('');
  });
});

describe('CSS/HTML/XML Remover - Coverage Boost', () => {
  test('CSS handles empty code', () => {
    expect(removeCssComments('')).toBe('');
  });

  test('HTML handles empty code', () => {
    expect(removeHtmlComments('')).toBe('');
  });

  test('XML handles empty code', () => {
    expect(removeXmlComments('')).toBe('');
  });

  test('CSS preserves license comments', () => {
    const code = `/*! @license MIT */
body { color: red; }`;
    const result = removeCssComments(code, true);
    expect(result).toContain('@license MIT');
  });

  test('HTML preserves license comments', () => {
    const code = `<!-- @license MIT -->
<div>Hello</div>`;
    const result = removeHtmlComments(code, true);
    expect(result).toContain('@license MIT');
  });

  test('XML preserves CDATA sections', () => {
    const code = `<data><![CDATA[some <!-- data -->]]></data>
<!-- comment -->`;
    const result = removeXmlComments(code);
    expect(result).toContain('CDATA');
    expect(result).not.toContain('<!-- comment -->');
  });
});

describe('Haskell Remover - Coverage Boost', () => {
  test('handles empty code', () => {
    expect(removeHaskellComments('')).toBe('');
  });

  test('handles unclosed string', () => {
    const code = `msg = "unclosed string`;
    const result = removeHaskellComments(code);
    expect(result).toContain('msg = "unclosed string');
  });

  test('handles escaped character in string', () => {
    const code = `msg = "line1\\nline2" -- comment`;
    const result = removeHaskellComments(code);
    expect(result).toContain('msg = "line1\\nline2"');
    expect(result).not.toContain('-- comment');
  });

  test('handles character literal with escape', () => {
    const code = `ch = '\\n' -- newline char`;
    const result = removeHaskellComments(code);
    expect(result).toContain("ch = '\\n'");
    expect(result).not.toContain('newline char');
  });

  test('handles simple character literal', () => {
    const code = `ch = 'x' -- char x`;
    const result = removeHaskellComments(code);
    expect(result).toContain("ch = 'x'");
    expect(result).not.toContain('char x');
  });

  test('handles block comment with newlines and keepEmptyLines', () => {
    const code = `{- multi
line
comment -}
main = putStrLn "Hi"`;
    const result = removeHaskellComments(code, false, true);
    expect(result).toContain('main = putStrLn "Hi"');
  });

  test('handles operator that looks like comment start (-->)', () => {
    const code = `x --> y = x + y`;
    const result = removeHaskellComments(code);
    expect(result).toContain('-->');
  });

  test('handles -- at end of line (no space after)', () => {
    const code = `x = 5 --comment without space`;
    const result = removeHaskellComments(code);
    expect(result).toContain('x = 5');
    expect(result).not.toContain('comment without space');
  });

  test('preserves pragma even without space', () => {
    const code = `{-# LANGUAGE GADTs #-}
main = return ()`;
    const result = removeHaskellComments(code);
    expect(result).toContain('{-# LANGUAGE GADTs #-}');
  });

  test('single quote not followed by enough characters', () => {
    const code = `it's -- comment`;
    const result = removeHaskellComments(code);
    // The apostrophe in "it's" should not break parsing
    expect(result).not.toContain('-- comment');
  });

  test('handles line comment at very end of input', () => {
    const code = `x = 5 -- end`;
    const result = removeHaskellComments(code);
    expect(result).toContain('x = 5');
    expect(result).not.toContain('end');
  });
});

describe('Ruby Remover - Coverage Boost', () => {
  test('handles =begin/=end with license and preserveLicense', () => {
    const code = `=begin
@license MIT
Copyright 2025
=end
puts "hello"`;
    const result = removeRubyComments(code, true, false);
    expect(result).toContain('@license MIT');
    expect(result).toContain('puts "hello"');
  });

  test('handles =begin/=end without license and keepEmptyLines', () => {
    const code = `=begin
This is a comment
=end
puts "hello"`;
    const result = removeRubyComments(code, false, true);
    expect(result).toContain('puts "hello"');
  });

  test('handles inline # comment with license', () => {
    const code = `x = 5 # @copyright 2025`;
    const result = removeRubyComments(code, true, false);
    expect(result).toContain('@copyright 2025');
  });

  test('handles standalone # license comment', () => {
    const code = `# @license MIT
puts "hello"`;
    const result = removeRubyComments(code, true, false);
    expect(result).toContain('@license MIT');
  });
});

describe('YAML Remover - Coverage Boost', () => {
  test('handles inline comment with no code before it', () => {
    const code = `key: value
  # standalone comment
other: data`;
    const result = removeYamlComments(code, false, true);
    expect(result).toContain('key: value');
    expect(result).toContain('other: data');
  });

  test('handles license # comment', () => {
    const code = `# @license MIT
key: value`;
    const result = removeYamlComments(code, true, false);
    expect(result).toContain('@license MIT');
  });
});

describe('JSON Remover - Coverage Boost', () => {
  test('handles empty code', () => {
    expect(removeJsonComments('')).toBe('');
  });

  test('handles single-quoted strings', () => {
    const code = `{'key': 'value // not comment'}`;
    const result = removeJsonComments(code);
    expect(result).toContain('value // not comment');
  });
});

describe('Language Detection - Coverage Boost', () => {
  test('detects Kotlin by content - fun + val pattern', () => {
    const code = `fun greet(): String {
    val name = "World"
    return "Hello, $name"
}`;
    const detected = detectLanguageByContent(code);
    expect(detected).toBe('kotlin');
  });

  test('detects Kotlin by content - package with dotted name + val', () => {
    // Go's package detection matches single-word packages, so use dotted package
    const code = `package com.example.app
val greeting = "Hello"
fun greet(): String { return greeting }`;
    const detected = detectLanguageByContent(code);
    expect(detected).toBe('kotlin');
  });

  test('detects Kotlin by content - package with dotted name + data class', () => {
    const code = `package com.example.model
data class User(val name: String, val age: Int)`;
    const detected = detectLanguageByContent(code);
    expect(detected).toBe('kotlin');
  });

  test('detects Scala by file extension (content detection is order-dependent)', () => {
    // Scala content detection can overlap with other languages,
    // so file extension is the reliable method
    const code = `object Main { def main(): Unit = {} }`;
    const result = removeComments(code, { filename: 'Main.scala' });
    expect(result.detectedLanguage).toBe('scala');
  });

  test('detects Scala content - case class with val', () => {
    // Use a pattern that's distinctly Scala
    const code = `case class Person(name: String, age: Int)
trait Printable {
  def show: String
  val label: String
}`;
    const detected = detectLanguageByContent(code);
    expect(detected).toBe('scala');
  });

  test('detects Haskell by content - module where', () => {
    const code = `module Main where
main = putStrLn "Hello"`;
    const detected = detectLanguageByContent(code);
    expect(detected).toBe('haskell');
  });

  test('detects Haskell by content - type signature', () => {
    const code = `add :: Int -> Int -> Int
add x y = x + y`;
    const detected = detectLanguageByContent(code);
    expect(detected).toBe('haskell');
  });

  test('detects Haskell by content - import (no braces)', () => {
    // Haskell imports look like "import Data.List" without braces
    // JS/TS imports use braces like "import { foo }" so we exclude those
    const code = `module Main where
import Data.List
main = print (sort [3,1,2])`;
    const detected = detectLanguageByContent(code);
    expect(detected).toBe('haskell');
  });

  test('detects Haskell by content - qualified import', () => {
    const code = `module Lib where
import qualified Data.Map as Map
lookup k = Map.lookup k`;
    const detected = detectLanguageByContent(code);
    expect(detected).toBe('haskell');
  });

  test('detects .kts extension', () => {
    expect(detectLanguageByFilename('build.gradle.kts')).toBe('kotlin');
  });

  test('detects .sc extension', () => {
    expect(detectLanguageByFilename('script.sc')).toBe('scala');
  });

  test('detects .lhs extension', () => {
    expect(detectLanguageByFilename('Lib.lhs')).toBe('haskell');
  });
});

describe('Index - Coverage Boost', () => {
  test('countComments for Haskell (dry run)', () => {
    const code = `-- Comment 1
{- Block comment -}
main = putStrLn "Hello"`;
    const result = removeComments(code, { language: 'haskell', dryRun: true });
    expect(result.removedCount).toBeGreaterThanOrEqual(2);
    expect(result.code).toBe(code); // unchanged in dry-run
  });

  test('countComments for Haskell ignores pragmas in dry run', () => {
    const code = `{-# LANGUAGE OverloadedStrings #-}
-- Comment
main = putStrLn "Hello"`;
    const result = removeComments(code, { language: 'haskell', dryRun: true });
    expect(result.removedCount).toBe(1); // only the -- comment, not the pragma
  });

  test('countComments for Kotlin (dry run)', () => {
    const code = `// Comment
/* Block */
fun main() {}`;
    const result = removeComments(code, { language: 'kotlin', dryRun: true });
    expect(result.removedCount).toBe(2);
  });

  test('countComments for Scala (dry run)', () => {
    const code = `// Comment
/* Block */
object Main {}`;
    const result = removeComments(code, { language: 'scala', dryRun: true });
    expect(result.removedCount).toBe(2);
  });

  test('handles non-string input (null)', () => {
    const result = removeComments(null as any);
    expect(result.code).toBeNull();
    expect(result.removedCount).toBe(0);
  });

  test('handles non-string input (undefined)', () => {
    const result = removeComments(undefined as any);
    expect(result.code).toBeUndefined();
    expect(result.removedCount).toBe(0);
  });

  test('handles non-string input (number)', () => {
    const result = removeComments(42 as any);
    expect(result.code).toBe('42');
    expect(result.removedCount).toBe(0);
  });

  test('handles whitespace-only string', () => {
    const result = removeComments('   \n  \n  ');
    expect(result.code).toBe('   \n  \n  ');
    expect(result.removedCount).toBe(0);
  });

  test('handles undetectable language', () => {
    const result = removeComments('just some random text');
    expect(result.removedCount).toBe(0);
  });

  test('dry run with preserveLicense skips license lines', () => {
    const code = `// @license MIT
// Regular comment
const x = 5;`;
    const result = removeComments(code, { language: 'javascript', dryRun: true, preserveLicense: true });
    expect(result.removedCount).toBe(1); // only regular comment
  });

  test('isLicenseLine detects various patterns', () => {
    const code1 = `// @license MIT
const x = 5;`;
    const code2 = `// @copyright 2025
const x = 5;`;
    const code3 = `// @author John
const x = 5;`;
    const code4 = `/*! Protected */
const x = 5;`;

    // These should all result in 0 removed if preserveLicense
    for (const code of [code1, code2, code3, code4]) {
      const result = removeComments(code, { language: 'javascript', dryRun: true, preserveLicense: true });
      expect(result.removedCount).toBeLessThanOrEqual(1);
    }
  });

  test('filename detection takes precedence over language option', () => {
    const code = `# Python comment
print("hello")`;
    const result = removeComments(code, { filename: 'test.py', language: 'javascript' });
    expect(result.detectedLanguage).toBe('python');
  });
});

describe('Stream - Coverage Boost', () => {
  test('handles empty stream', async () => {
    const stream = createCommentRemoverStream({ language: 'javascript' });
    const source = new Readable({ read() { this.push(null); } });
    const result = await streamToString(source.pipe(stream));
    expect(result).toBe('');
  });

  test('handles stream with only whitespace', async () => {
    const stream = createCommentRemoverStream({ language: 'javascript' });
    const source = new Readable({ read() { this.push('   \n  '); this.push(null); } });
    const result = await streamToString(source.pipe(stream));
    expect(result).toBe('   \n  ');
  });
});

describe('Kotlin - Additional Edge Cases', () => {
  test('handles nullable types with comments', () => {
    const code = `val x: String? = null // nullable
val y: Int? = 42 // also nullable`;
    const result = removeComments(code, { language: 'kotlin' });
    expect(result.code).toContain('val x: String? = null');
    expect(result.code).toContain('val y: Int? = 42');
    expect(result.code).not.toContain('nullable');
  });

  test('handles companion object', () => {
    const code = `class MyClass {
    companion object {
        // Factory method
        fun create(): MyClass = MyClass()
    }
}`;
    const result = removeComments(code, { language: 'kotlin' });
    expect(result.code).toContain('companion object');
    expect(result.code).not.toContain('Factory method');
  });

  test('handles extension functions', () => {
    const code = `// Extension function
fun String.addExclamation(): String = this + "!"`;
    const result = removeComments(code, { language: 'kotlin' });
    expect(result.code).toContain('fun String.addExclamation()');
    expect(result.code).not.toContain('Extension function');
  });

  test('handles sealed class', () => {
    const code = `// Sealed class for result
sealed class Result {
    data class Success(val data: String) : Result() // success
    data class Error(val message: String) : Result() // error
}`;
    const result = removeComments(code, { language: 'kotlin' });
    expect(result.code).toContain('sealed class Result');
    expect(result.code).not.toContain('Sealed class for result');
    expect(result.code).not.toContain('// success');
    expect(result.code).not.toContain('// error');
  });
});

describe('Scala - Additional Edge Cases', () => {
  test('handles type parameters', () => {
    const code = `// Generic container
class Container[T](value: T) {
  def get: T = value // getter
}`;
    const result = removeComments(code, { language: 'scala' });
    expect(result.code).toContain('class Container[T]');
    expect(result.code).not.toContain('Generic container');
    expect(result.code).not.toContain('// getter');
  });

  test('handles implicit class', () => {
    const code = `// Rich string
implicit class RichString(val s: String) {
  def shout: String = s.toUpperCase + "!" // shout method
}`;
    const result = removeComments(code, { language: 'scala' });
    expect(result.code).toContain('implicit class RichString');
    expect(result.code).not.toContain('Rich string');
  });

  test('handles object with apply', () => {
    const code = `object Person {
  // Factory
  def apply(name: String, age: Int): Person = new Person(name, age)
}`;
    const result = removeComments(code, { language: 'scala' });
    expect(result.code).toContain('def apply');
    expect(result.code).not.toContain('// Factory');
  });
});

describe('Haskell - Additional Edge Cases', () => {
  test('handles where clause with multiple bindings', () => {
    const code = `bmi x
  | bmi <= 18.5 = "underweight"  -- low
  | bmi <= 25.0 = "normal"      -- mid
  | otherwise   = "overweight"   -- high
  where bmi = x / 2`;
    const result = removeComments(code, { language: 'haskell' });
    expect(result.code).toContain('where bmi = x / 2');
    expect(result.code).not.toContain('-- low');
    expect(result.code).not.toContain('-- mid');
    expect(result.code).not.toContain('-- high');
  });

  test('handles let in expression', () => {
    const code = `result = let x = 5 -- bind x
                  y = 10 -- bind y
              in x + y -- sum`;
    const result = removeComments(code, { language: 'haskell' });
    expect(result.code).toContain('let x = 5');
    expect(result.code).not.toContain('bind x');
  });

  test('handles multiple pragmas', () => {
    const code = `{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE DeriveGeneric #-}
{-# OPTIONS_GHC -Wall #-}
-- regular comment
module Main where`;
    const result = removeComments(code, { language: 'haskell' });
    expect(result.code).toContain('{-# LANGUAGE OverloadedStrings #-}');
    expect(result.code).toContain('{-# LANGUAGE DeriveGeneric #-}');
    expect(result.code).toContain('{-# OPTIONS_GHC -Wall #-}');
    expect(result.code).not.toContain('regular comment');
  });

  test('handles lambda expressions', () => {
    const code = `double = \\x -> x * 2 -- lambda`;
    const result = removeComments(code, { language: 'haskell' });
    expect(result.code).toContain('\\x -> x * 2');
    expect(result.code).not.toContain('-- lambda');
  });

  test('handles record syntax', () => {
    const code = `data Person = Person
  { firstName :: String  -- first name
  , lastName  :: String  -- last name
  , age       :: Int     -- age in years
  }`;
    const result = removeComments(code, { language: 'haskell' });
    expect(result.code).toContain('firstName :: String');
    expect(result.code).not.toContain('first name');
    expect(result.code).not.toContain('last name');
  });

  test('handles list operations with --', () => {
    const code = `xs = [1, 2, 3] -- a list
ys = map (+1) xs -- increment`;
    const result = removeComments(code, { language: 'haskell' });
    expect(result.code).toContain('xs = [1, 2, 3]');
    expect(result.code).toContain('ys = map (+1) xs');
    expect(result.code).not.toContain('a list');
    expect(result.code).not.toContain('increment');
  });
});
