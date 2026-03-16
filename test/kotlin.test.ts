import { removeComments } from '../src/index';
import { removeKotlinComments } from '../src/removers/c-style-remover';

describe('Kotlin Comment Removal', () => {
  describe('Single-line comments', () => {
    test('removes // comments', () => {
      const code = `// This is a comment
fun main() {
    println("Hello") // inline comment
}`;
      const result = removeComments(code, { language: 'kotlin' });
      expect(result.code).toContain('fun main()');
      expect(result.code).toContain('println("Hello")');
      expect(result.code).not.toContain('This is a comment');
      expect(result.code).not.toContain('inline comment');
    });

    test('removes multiple single-line comments', () => {
      const code = `// Comment 1
// Comment 2
val x = 5
// Comment 3`;
      const result = removeComments(code, { language: 'kotlin' });
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
fun main() {
    println("Hello")
}`;
      const result = removeComments(code, { language: 'kotlin' });
      expect(result.code).toContain('fun main()');
      expect(result.code).not.toContain('multi-line comment');
    });

    test('removes inline block comments', () => {
      const code = `val x /* comment */ = 5`;
      const result = removeComments(code, { language: 'kotlin' });
      expect(result.code).toContain('val x');
      expect(result.code).toContain('= 5');
      expect(result.code).not.toContain('comment');
    });
  });

  describe('KDoc comments', () => {
    test('removes KDoc comments', () => {
      const code = `/**
 * This is a KDoc comment
 * @param name the name
 */
fun greet(name: String) {
    println("Hello, $name")
}`;
      const result = removeComments(code, { language: 'kotlin' });
      expect(result.code).toContain('fun greet(name: String)');
      expect(result.code).not.toContain('KDoc comment');
      expect(result.code).not.toContain('@param');
    });
  });

  describe('String literals', () => {
    test('preserves comment-like patterns in strings', () => {
      const code = `val url = "https://example.com"
val msg = "This is not a // comment"`;
      const result = removeComments(code, { language: 'kotlin' });
      expect(result.code).toContain('"https://example.com"');
      expect(result.code).toContain('"This is not a // comment"');
    });

    test('preserves multi-line string delimiters', () => {
      const code = `val text = """
    Hello World
""".trimIndent()`;
      const result = removeComments(code, { language: 'kotlin' });
      expect(result.code).toContain('Hello World');
      expect(result.code).toContain('.trimIndent()');
    });
  });

  describe('License preservation', () => {
    test('preserves license comments when preserveLicense is true', () => {
      const code = `/*! MIT License - Copyright (c) 2025 */
// Regular comment
fun main() {}`;
      const result = removeComments(code, { language: 'kotlin', preserveLicense: true });
      expect(result.code).toContain('MIT License');
      expect(result.code).not.toContain('Regular comment');
    });
  });

  describe('keepEmptyLines option', () => {
    test('keeps empty lines where comments were', () => {
      const code = `// Comment
fun main() {}`;
      const result = removeComments(code, { language: 'kotlin', keepEmptyLines: true });
      expect(result.code).toContain('fun main() {}');
      expect(result.code).not.toContain('// Comment');
    });
  });

  describe('Kotlin-specific features', () => {
    test('handles annotations with comments', () => {
      const code = `@JvmStatic // annotation comment
fun main(args: Array<String>) {
    println("Hello")
}`;
      const result = removeComments(code, { language: 'kotlin' });
      expect(result.code).toContain('@JvmStatic');
      expect(result.code).not.toContain('annotation comment');
    });

    test('handles data classes', () => {
      const code = `// Data class for user
data class User(
    val name: String, // User name
    val age: Int // User age
)`;
      const result = removeComments(code, { language: 'kotlin' });
      expect(result.code).toContain('data class User');
      expect(result.code).toContain('val name: String,');
      expect(result.code).not.toContain('Data class for user');
      expect(result.code).not.toContain('User name');
    });

    test('handles lambda expressions', () => {
      const code = `val sum = { a: Int, b: Int -> // lambda
    a + b // sum
}`;
      const result = removeComments(code, { language: 'kotlin' });
      expect(result.code).toContain('a + b');
      expect(result.code).not.toContain('// lambda');
      expect(result.code).not.toContain('// sum');
    });

    test('handles string templates', () => {
      const code = `val greeting = "Hello, \${name}" // greeting
println("Value: \${1 + 2}") // calc`;
      const result = removeComments(code, { language: 'kotlin' });
      expect(result.code).not.toContain('// greeting');
      expect(result.code).not.toContain('// calc');
    });

    test('handles when expression', () => {
      const code = `when (x) {
    // Check positive
    1 -> print("one")
    /* Check negative */
    -1 -> print("minus one")
    else -> print("other") // default
}`;
      const result = removeComments(code, { language: 'kotlin' });
      expect(result.code).toContain('1 -> print("one")');
      expect(result.code).not.toContain('Check positive');
      expect(result.code).not.toContain('Check negative');
      expect(result.code).not.toContain('default');
    });
  });

  describe('Language detection', () => {
    test('detects Kotlin by .kt extension', () => {
      const code = `fun main() { println("Hello") }`;
      const result = removeComments(code, { filename: 'Main.kt' });
      expect(result.detectedLanguage).toBe('kotlin');
    });

    test('detects Kotlin by .kts extension', () => {
      const code = `println("Hello")`;
      const result = removeComments(code, { filename: 'build.gradle.kts' });
      expect(result.detectedLanguage).toBe('kotlin');
    });
  });

  describe('Edge cases', () => {
    test('handles empty code', () => {
      const result = removeComments('', { language: 'kotlin' });
      expect(result.code).toBe('');
    });

    test('handles code with only comments', () => {
      const code = `// Only a comment
/* Another comment */`;
      const result = removeComments(code, { language: 'kotlin' });
      expect(result.code.trim()).toBe('');
    });

    test('handles code with no comments', () => {
      const code = `fun main() {
    println("Hello, World!")
}`;
      const result = removeComments(code, { language: 'kotlin' });
      expect(result.code).toContain('fun main()');
      expect(result.code).toContain('println("Hello, World!")');
    });

    test('dry run counts comments without modifying code', () => {
      const code = `// Comment 1
fun main() {} // Comment 2`;
      const result = removeComments(code, { language: 'kotlin', dryRun: true });
      expect(result.code).toBe(code);
      expect(result.removedCount).toBeGreaterThan(0);
    });
  });
});
