import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseArgs, showHelp, processFile, run } from '../src/cli';

describe('CLI', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'comment-bear-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('parseArgs', () => {
    test('parses file arguments', () => {
      const result = parseArgs(['file1.js', 'file2.ts']);
      expect(result.files).toEqual(['file1.js', 'file2.ts']);
    });

    test('parses --help flag', () => {
      const result = parseArgs(['--help']);
      expect(result.help).toBe(true);
    });

    test('parses -h flag', () => {
      const result = parseArgs(['-h']);
      expect(result.help).toBe(true);
    });

    test('parses --version flag', () => {
      const result = parseArgs(['--version']);
      expect(result.version).toBe(true);
    });

    test('parses -v flag', () => {
      const result = parseArgs(['-v']);
      expect(result.version).toBe(true);
    });

    test('parses --output flag', () => {
      const result = parseArgs(['file.js', '--output', 'out.js']);
      expect(result.output).toBe('out.js');
    });

    test('parses -o flag', () => {
      const result = parseArgs(['file.js', '-o', 'out.js']);
      expect(result.output).toBe('out.js');
    });

    test('parses --in-place flag', () => {
      const result = parseArgs(['file.js', '--in-place']);
      expect(result.inPlace).toBe(true);
    });

    test('parses -i flag', () => {
      const result = parseArgs(['file.js', '-i']);
      expect(result.inPlace).toBe(true);
    });

    test('parses --language flag', () => {
      const result = parseArgs(['file.txt', '--language', 'python']);
      expect(result.language).toBe('python');
    });

    test('parses -l flag', () => {
      const result = parseArgs(['file.txt', '-l', 'javascript']);
      expect(result.language).toBe('javascript');
    });

    test('parses --preserve-license flag', () => {
      const result = parseArgs(['file.js', '--preserve-license']);
      expect(result.preserveLicense).toBe(true);
    });

    test('parses --dry-run flag', () => {
      const result = parseArgs(['file.js', '--dry-run']);
      expect(result.dryRun).toBe(true);
    });

    test('parses --keep-empty-lines flag', () => {
      const result = parseArgs(['file.js', '--keep-empty-lines']);
      expect(result.keepEmptyLines).toBe(true);
    });

    test('parses --config flag', () => {
      const result = parseArgs(['file.js', '--config', '.commentbearrc']);
      expect(result.configPath).toBe('.commentbearrc');
    });

    test('parses -c flag', () => {
      const result = parseArgs(['file.js', '-c', '.commentbearrc']);
      expect(result.configPath).toBe('.commentbearrc');
    });

    test('throws on unknown option', () => {
      expect(() => parseArgs(['--unknown'])).toThrow('Unknown option: --unknown');
    });

    test('throws on unknown language', () => {
      expect(() => parseArgs(['file.js', '--language', 'brainfuck'])).toThrow('Unknown language');
    });

    test('throws on missing --output value', () => {
      expect(() => parseArgs(['file.js', '--output'])).toThrow('Missing value for --output');
    });

    test('throws on missing --language value', () => {
      expect(() => parseArgs(['file.js', '--language'])).toThrow('Missing value for --language');
    });

    test('throws on missing --config value', () => {
      expect(() => parseArgs(['file.js', '--config'])).toThrow('Missing value for --config');
    });

    test('parses complex combination', () => {
      const result = parseArgs([
        'file.js', '--language', 'typescript', '--preserve-license',
        '--keep-empty-lines', '-o', 'output.ts'
      ]);
      expect(result.files).toEqual(['file.js']);
      expect(result.language).toBe('typescript');
      expect(result.preserveLicense).toBe(true);
      expect(result.keepEmptyLines).toBe(true);
      expect(result.output).toBe('output.ts');
    });

    test('defaults are correct', () => {
      const result = parseArgs(['file.js']);
      expect(result.inPlace).toBe(false);
      expect(result.preserveLicense).toBe(false);
      expect(result.dryRun).toBe(false);
      expect(result.keepEmptyLines).toBe(false);
      expect(result.help).toBe(false);
      expect(result.version).toBe(false);
      expect(result.language).toBeUndefined();
      expect(result.output).toBeUndefined();
      expect(result.configPath).toBeUndefined();
    });
  });

  describe('showHelp', () => {
    test('returns help text', () => {
      const help = showHelp();
      expect(help).toContain('comment-bear');
      expect(help).toContain('Usage');
      expect(help).toContain('Options');
      expect(help).toContain('--help');
      expect(help).toContain('--language');
      expect(help).toContain('Examples');
    });

    test('lists all supported languages', () => {
      const help = showHelp();
      expect(help).toContain('javascript');
      expect(help).toContain('kotlin');
      expect(help).toContain('scala');
      expect(help).toContain('haskell');
    });
  });

  describe('processFile', () => {
    test('processes a JavaScript file', () => {
      const filePath = path.join(tmpDir, 'test.js');
      fs.writeFileSync(filePath, '// comment\nconst x = 5;\n');
      const result = processFile(filePath, {});
      expect(result.code).toContain('const x = 5;');
      expect(result.code).not.toContain('// comment');
      expect(result.removedCount).toBeGreaterThan(0);
    });

    test('processes a Python file', () => {
      const filePath = path.join(tmpDir, 'test.py');
      fs.writeFileSync(filePath, '# comment\nprint("hello")\n');
      const result = processFile(filePath, {});
      expect(result.code).toContain('print("hello")');
      expect(result.code).not.toContain('# comment');
    });

    test('respects language override', () => {
      const filePath = path.join(tmpDir, 'test.txt');
      fs.writeFileSync(filePath, '// comment\nconst x = 5;\n');
      const result = processFile(filePath, { language: 'javascript' });
      expect(result.code).not.toContain('// comment');
    });

    test('respects preserveLicense option', () => {
      const filePath = path.join(tmpDir, 'test.js');
      fs.writeFileSync(filePath, '/*! MIT License */\n// comment\nconst x = 5;\n');
      const result = processFile(filePath, { preserveLicense: true });
      expect(result.code).toContain('MIT License');
      expect(result.code).not.toContain('// comment');
    });

    test('respects dryRun option', () => {
      const filePath = path.join(tmpDir, 'test.js');
      const original = '// comment\nconst x = 5;\n';
      fs.writeFileSync(filePath, original);
      const result = processFile(filePath, { dryRun: true });
      expect(result.code).toBe(original);
      expect(result.removedCount).toBeGreaterThan(0);
    });

    test('throws on non-existent file', () => {
      expect(() => processFile('/nonexistent/file.js', {})).toThrow('File not found');
    });
  });

  describe('run', () => {
    test('returns 0 for --help', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const exitCode = run(['--help']);
      expect(exitCode).toBe(0);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    test('returns 0 for --version', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const exitCode = run(['--version']);
      expect(exitCode).toBe(0);
      spy.mockRestore();
    });

    test('returns 1 with no input files', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const exitCode = run([]);
      expect(exitCode).toBe(1);
      spy.mockRestore();
    });

    test('returns 1 for --output with multiple files', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const exitCode = run(['file1.js', 'file2.js', '-o', 'out.js']);
      expect(exitCode).toBe(1);
      spy.mockRestore();
    });

    test('returns 1 for --output with --in-place', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const exitCode = run(['file.js', '-o', 'out.js', '-i']);
      expect(exitCode).toBe(1);
      spy.mockRestore();
    });

    test('processes file and prints to stdout', () => {
      const filePath = path.join(tmpDir, 'test.js');
      fs.writeFileSync(filePath, '// comment\nconst x = 5;\n');
      const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
      const exitCode = run([filePath]);
      expect(exitCode).toBe(0);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    test('processes file with --in-place', () => {
      const filePath = path.join(tmpDir, 'test.js');
      fs.writeFileSync(filePath, '// comment\nconst x = 5;\n');
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const exitCode = run([filePath, '-i']);
      expect(exitCode).toBe(0);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('const x = 5;');
      expect(content).not.toContain('// comment');
      spy.mockRestore();
    });

    test('processes file with --output', () => {
      const inputPath = path.join(tmpDir, 'input.js');
      const outputPath = path.join(tmpDir, 'output.js');
      fs.writeFileSync(inputPath, '// comment\nconst x = 5;\n');
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const exitCode = run([inputPath, '-o', outputPath]);
      expect(exitCode).toBe(0);
      const content = fs.readFileSync(outputPath, 'utf-8');
      expect(content).toContain('const x = 5;');
      expect(content).not.toContain('// comment');
      spy.mockRestore();
    });

    test('processes file with --dry-run', () => {
      const filePath = path.join(tmpDir, 'test.js');
      fs.writeFileSync(filePath, '// comment\nconst x = 5;\n');
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const exitCode = run([filePath, '--dry-run']);
      expect(exitCode).toBe(0);
      // Original file should be unchanged
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('// comment');
      spy.mockRestore();
    });

    test('returns 1 for non-existent file', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const exitCode = run(['/nonexistent/file.js']);
      expect(exitCode).toBe(1);
      spy.mockRestore();
    });

    test('returns 1 for unknown option', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const exitCode = run(['--unknown-flag']);
      expect(exitCode).toBe(1);
      spy.mockRestore();
    });
  });
});
