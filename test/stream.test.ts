import { Readable, Writable } from 'stream';
import { createCommentRemoverStream, CommentRemoverStream } from '../src/stream';

function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

function stringToStream(str: string): Readable {
  const readable = new Readable();
  readable.push(str);
  readable.push(null);
  return readable;
}

describe('Stream API', () => {
  describe('createCommentRemoverStream', () => {
    test('creates a CommentRemoverStream instance', () => {
      const stream = createCommentRemoverStream();
      expect(stream).toBeInstanceOf(CommentRemoverStream);
    });

    test('creates stream with options', () => {
      const stream = createCommentRemoverStream({
        language: 'javascript',
        preserveLicense: true,
      });
      expect(stream).toBeInstanceOf(CommentRemoverStream);
    });
  });

  describe('JavaScript processing', () => {
    test('removes single-line comments from JavaScript', async () => {
      const input = '// comment\nconst x = 5;\n';
      const stream = createCommentRemoverStream({ language: 'javascript' });
      const source = stringToStream(input);
      const result = await streamToString(source.pipe(stream));
      expect(result).toContain('const x = 5;');
      expect(result).not.toContain('// comment');
    });

    test('removes multi-line comments from JavaScript', async () => {
      const input = '/* block comment */\nconst x = 5;\n';
      const stream = createCommentRemoverStream({ language: 'javascript' });
      const source = stringToStream(input);
      const result = await streamToString(source.pipe(stream));
      expect(result).toContain('const x = 5;');
      expect(result).not.toContain('block comment');
    });
  });

  describe('Python processing', () => {
    test('removes Python comments', async () => {
      const input = '# comment\nprint("hello")\n';
      const stream = createCommentRemoverStream({ language: 'python' });
      const source = stringToStream(input);
      const result = await streamToString(source.pipe(stream));
      expect(result).toContain('print("hello")');
      expect(result).not.toContain('# comment');
    });
  });

  describe('Auto-detection by filename', () => {
    test('auto-detects language by filename', async () => {
      const input = '# comment\nprint("hello")\n';
      const stream = createCommentRemoverStream({ filename: 'test.py' });
      const source = stringToStream(input);
      const result = await streamToString(source.pipe(stream));
      expect(result).toContain('print("hello")');
      expect(result).not.toContain('# comment');
    });
  });

  describe('Options', () => {
    test('preserves license comments', async () => {
      const input = '/*! MIT License */\n// comment\nconst x = 5;\n';
      const stream = createCommentRemoverStream({
        language: 'javascript',
        preserveLicense: true,
      });
      const source = stringToStream(input);
      const result = await streamToString(source.pipe(stream));
      expect(result).toContain('MIT License');
      expect(result).not.toContain('// comment');
    });

    test('keeps empty lines when option set', async () => {
      const input = '// comment\nconst x = 5;\n';
      const stream = createCommentRemoverStream({
        language: 'javascript',
        keepEmptyLines: true,
      });
      const source = stringToStream(input);
      const result = await streamToString(source.pipe(stream));
      expect(result).toContain('const x = 5;');
    });
  });

  describe('Large content handling', () => {
    test('handles large files', async () => {
      const lines: string[] = [];
      for (let i = 0; i < 1000; i++) {
        lines.push(`// Comment ${i}`);
        lines.push(`const x${i} = ${i};`);
      }
      const input = lines.join('\n');
      const stream = createCommentRemoverStream({ language: 'javascript' });
      const source = stringToStream(input);
      const result = await streamToString(source.pipe(stream));
      expect(result).toContain('const x0 = 0;');
      expect(result).toContain('const x999 = 999;');
      expect(result).not.toContain('// Comment');
    });
  });

  describe('Multiple chunks', () => {
    test('handles input split across multiple chunks', async () => {
      const stream = createCommentRemoverStream({ language: 'javascript' });

      const source = new Readable({
        read() {
          this.push('// first comment\n');
          this.push('const x = 5;\n');
          this.push('// second comment\n');
          this.push('const y = 10;\n');
          this.push(null);
        }
      });

      const result = await streamToString(source.pipe(stream));
      expect(result).toContain('const x = 5;');
      expect(result).toContain('const y = 10;');
      expect(result).not.toContain('first comment');
      expect(result).not.toContain('second comment');
    });

    test('handles multi-line comment split across chunks', async () => {
      const stream = createCommentRemoverStream({ language: 'javascript' });

      const source = new Readable({
        read() {
          this.push('/* start of \n');
          this.push('multi-line comment */\n');
          this.push('const x = 5;\n');
          this.push(null);
        }
      });

      const result = await streamToString(source.pipe(stream));
      expect(result).toContain('const x = 5;');
      expect(result).not.toContain('multi-line comment');
    });
  });

  describe('New languages', () => {
    test('processes Kotlin code', async () => {
      const input = '// Kotlin comment\nfun main() { println("Hello") }\n';
      const stream = createCommentRemoverStream({ language: 'kotlin' });
      const source = stringToStream(input);
      const result = await streamToString(source.pipe(stream));
      expect(result).toContain('fun main()');
      expect(result).not.toContain('Kotlin comment');
    });

    test('processes Scala code', async () => {
      const input = '// Scala comment\nobject Main { def main(): Unit = {} }\n';
      const stream = createCommentRemoverStream({ language: 'scala' });
      const source = stringToStream(input);
      const result = await streamToString(source.pipe(stream));
      expect(result).toContain('object Main');
      expect(result).not.toContain('Scala comment');
    });

    test('processes Haskell code', async () => {
      const input = '-- Haskell comment\nmain = putStrLn "Hello"\n';
      const stream = createCommentRemoverStream({ language: 'haskell' });
      const source = stringToStream(input);
      const result = await streamToString(source.pipe(stream));
      expect(result).toContain('main = putStrLn "Hello"');
      expect(result).not.toContain('Haskell comment');
    });
  });

  describe('Edge cases', () => {
    test('handles empty input', async () => {
      const stream = createCommentRemoverStream({ language: 'javascript' });
      const source = stringToStream('');
      const result = await streamToString(source.pipe(stream));
      expect(result).toBe('');
    });

    test('handles input with no comments', async () => {
      const input = 'const x = 5;\nconst y = 10;\n';
      const stream = createCommentRemoverStream({ language: 'javascript' });
      const source = stringToStream(input);
      const result = await streamToString(source.pipe(stream));
      expect(result).toContain('const x = 5;');
      expect(result).toContain('const y = 10;');
    });

    test('handles input that is only comments', async () => {
      const input = '// comment 1\n// comment 2\n/* block */\n';
      const stream = createCommentRemoverStream({ language: 'javascript' });
      const source = stringToStream(input);
      const result = await streamToString(source.pipe(stream));
      expect(result.trim()).toBe('');
    });
  });
});
