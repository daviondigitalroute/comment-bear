import { removeComments } from '../src/index';
import { removeScalaComments } from '../src/removers/c-style-remover';

describe('Scala Comment Removal', () => {
  describe('Single-line comments', () => {
    test('removes // comments', () => {
      const code = `// This is a comment
object Main {
  def main(args: Array[String]): Unit = {
    println("Hello") // inline comment
  }
}`;
      const result = removeComments(code, { language: 'scala' });
      expect(result.code).toContain('object Main');
      expect(result.code).toContain('println("Hello")');
      expect(result.code).not.toContain('This is a comment');
      expect(result.code).not.toContain('inline comment');
    });

    test('removes multiple single-line comments', () => {
      const code = `// Comment 1
// Comment 2
val x = 5
// Comment 3`;
      const result = removeComments(code, { language: 'scala' });
      expect(result.code).toContain('val x = 5');
      expect(result.code).not.toContain('Comment 1');
      expect(result.code).not.toContain('Comment 2');
      expect(result.code).not.toContain('Comment 3');
    });
  });

  describe('Multi-line comments', () => {
    test('removes /* */ comments', () => {
      const code = `/* This is a
multi-line comment */
object Main {
  def main(): Unit = println("Hello")
}`;
      const result = removeComments(code, { language: 'scala' });
      expect(result.code).toContain('object Main');
      expect(result.code).not.toContain('multi-line comment');
    });

    test('removes inline block comments', () => {
      const code = `val x /* comment */ = 5`;
      const result = removeComments(code, { language: 'scala' });
      expect(result.code).toContain('val x');
      expect(result.code).toContain('= 5');
      expect(result.code).not.toContain('comment');
    });
  });

  describe('ScalaDoc comments', () => {
    test('removes ScalaDoc comments', () => {
      const code = `/**
 * This is a ScalaDoc comment
 * @param name the name
 * @return greeting string
 */
def greet(name: String): String = s"Hello, $name"`;
      const result = removeComments(code, { language: 'scala' });
      expect(result.code).toContain('def greet(name: String)');
      expect(result.code).not.toContain('ScalaDoc comment');
      expect(result.code).not.toContain('@param');
    });
  });

  describe('String literals', () => {
    test('preserves comment-like patterns in strings', () => {
      const code = `val url = "https://example.com"
val msg = "This is not a // comment"`;
      const result = removeComments(code, { language: 'scala' });
      expect(result.code).toContain('"https://example.com"');
      expect(result.code).toContain('"This is not a // comment"');
    });

    test('preserves triple-quoted strings', () => {
      const code = `val text = """
    Hello World
""".stripMargin`;
      const result = removeComments(code, { language: 'scala' });
      expect(result.code).toContain('Hello World');
      expect(result.code).toContain('.stripMargin');
    });
  });

  describe('License preservation', () => {
    test('preserves license comments when preserveLicense is true', () => {
      const code = `/*! MIT License - Copyright (c) 2025 */
// Regular comment
object Main {}`;
      const result = removeComments(code, { language: 'scala', preserveLicense: true });
      expect(result.code).toContain('MIT License');
      expect(result.code).not.toContain('Regular comment');
    });
  });

  describe('Scala-specific features', () => {
    test('handles trait definitions', () => {
      const code = `// Trait comment
trait Greeter {
  def greet(name: String): Unit // greet method
}`;
      const result = removeComments(code, { language: 'scala' });
      expect(result.code).toContain('trait Greeter');
      expect(result.code).not.toContain('Trait comment');
      expect(result.code).not.toContain('greet method');
    });

    test('handles case classes', () => {
      const code = `// Case class
case class Person(
  name: String, // person name
  age: Int // person age
)`;
      const result = removeComments(code, { language: 'scala' });
      expect(result.code).toContain('case class Person');
      expect(result.code).not.toContain('// Case class');
      expect(result.code).not.toContain('person name');
    });

    test('handles pattern matching', () => {
      const code = `x match {
  // Match positive
  case 1 => "one"
  /* Match negative */
  case -1 => "minus one"
  case _ => "other" // default
}`;
      const result = removeComments(code, { language: 'scala' });
      expect(result.code).toContain('case 1 => "one"');
      expect(result.code).not.toContain('Match positive');
      expect(result.code).not.toContain('Match negative');
      expect(result.code).not.toContain('// default');
    });

    test('handles for comprehensions', () => {
      const code = `val result = for {
  x <- list // iterate
  if x > 0 // filter
} yield x * 2 // transform`;
      const result = removeComments(code, { language: 'scala' });
      expect(result.code).toContain('x <- list');
      expect(result.code).not.toContain('// iterate');
      expect(result.code).not.toContain('// filter');
    });

    test('handles implicit parameters', () => {
      const code = `def greet(name: String)(implicit ctx: Context): Unit = { // implicit
  println(s"Hello, $name")
}`;
      const result = removeComments(code, { language: 'scala' });
      expect(result.code).toContain('implicit ctx: Context');
      expect(result.code).not.toContain('// implicit');
    });
  });

  describe('Language detection', () => {
    test('detects Scala by .scala extension', () => {
      const code = `object Main { def main(args: Array[String]): Unit = {} }`;
      const result = removeComments(code, { filename: 'Main.scala' });
      expect(result.detectedLanguage).toBe('scala');
    });

    test('detects Scala by .sc extension', () => {
      const code = `println("Hello")`;
      const result = removeComments(code, { filename: 'script.sc' });
      expect(result.detectedLanguage).toBe('scala');
    });
  });

  describe('Edge cases', () => {
    test('handles empty code', () => {
      const result = removeComments('', { language: 'scala' });
      expect(result.code).toBe('');
    });

    test('handles code with only comments', () => {
      const code = `// Only a comment
/* Another comment */`;
      const result = removeComments(code, { language: 'scala' });
      expect(result.code.trim()).toBe('');
    });

    test('handles code with no comments', () => {
      const code = `object Main {
  def main(args: Array[String]): Unit = {
    println("Hello, World!")
  }
}`;
      const result = removeComments(code, { language: 'scala' });
      expect(result.code).toContain('object Main');
      expect(result.code).toContain('println("Hello, World!")');
    });

    test('dry run counts comments without modifying code', () => {
      const code = `// Comment 1
object Main {} // Comment 2`;
      const result = removeComments(code, { language: 'scala', dryRun: true });
      expect(result.code).toBe(code);
      expect(result.removedCount).toBeGreaterThan(0);
    });
  });
});
