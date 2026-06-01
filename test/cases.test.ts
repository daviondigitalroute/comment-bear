import { detectLanguage, detectLanguageByFilename, detectLanguageByContent } from '../src/detectors/language-detector';

describe('Language Detection - Edge Cases & Boundary Conditions', () => {
  
  // ============================================================================
  // 1. Празен и whitespace-only код
  // ============================================================================
  describe('Empty and Whitespace-only Code', () => {
    test('returns undefined for empty string', () => {
      const result = detectLanguageByContent('');
      expect(result).toBeUndefined();
    });

    test('returns undefined for whitespace-only code (spaces)', () => {
      const result = detectLanguageByContent('     ');
      expect(result).toBeUndefined();
    });

    test('returns undefined for whitespace-only code (tabs)', () => {
      const result = detectLanguageByContent('\t\t\t');
      expect(result).toBeUndefined();
    });

    test('returns undefined for whitespace-only code (newlines)', () => {
      const result = detectLanguageByContent('\n\n\n');
      expect(result).toBeUndefined();
    });

    test('returns undefined for mixed whitespace', () => {
      const result = detectLanguageByContent('  \n\t  \n  ');
      expect(result).toBeUndefined();
    });

    test('detectLanguage with empty filename and code returns undefined', () => {
      const result = detectLanguage('', '');
      expect(result).toBeUndefined();
    });

    test('detectLanguage with undefined both parameters', () => {
      const result = detectLanguage(undefined, undefined);
      expect(result).toBeUndefined();
    });
  });

  // ============================================================================
  // 2. Много кратък код (1-5 символа)
  // ============================================================================
  describe('Very Short Code Snippets', () => {
    test('single character code', () => {
      const result = detectLanguageByContent('x');
      expect(result).toBeUndefined();
    });

    test('two characters', () => {
      const result = detectLanguageByContent('{}');
      // Може да е CSS, но твърде кратко за уверено разпознаване
      expect(result).toBeUndefined();
    });

    test('three characters - single letter word', () => {
      const result = detectLanguageByContent('def');
      expect(result).toBeUndefined(); // Твърде кратко
    });

    test('short JSON object', () => {
      const result = detectLanguageByContent('{}');
      // {} е валиден JSON, но detectLanguageByContent го проверява със JSON.parse
      expect(result).toBeUndefined();
    });

    test('short array', () => {
      const result = detectLanguageByContent('[]');
      expect(result).toBeUndefined();
    });
  });

  // ============================================================================
  // 3. Код който прилича на множество езици едновременно
  // ============================================================================
  describe('Ambiguous Code - Multiple Language Candidates', () => {
    test('function keyword - could be JS or Go', () => {
      const code = 'function test() {}';
      const result = detectLanguageByContent(code);
      // Трябва да избере JavaScript (има по-силен match)
      expect(result).toBe('javascript');
    });

    test('def keyword - could be Python or Ruby', () => {
      const code = 'def hello\n  puts "hi"\nend';
      const result = detectLanguageByContent(code);
      // Ruby syntax с 'end'
      expect(result).toBe('ruby');
    });

    test('class keyword - multiple languages', () => {
      const code = 'class Test { }';
      const result = detectLanguageByContent(code);
      // JavaScript (има къдрави скоби)
      expect(result).toBe('javascript');
    });

    test('simple CSS vs JSON confusion', () => {
      const code = '.class { color: red }';
      const result = detectLanguageByContent(code);
      expect(result).toBe('css');
    });

    test('HTML-like XML', () => {
      const code = '<root><child>Text</child></root>';
      const result = detectLanguageByContent(code);
      // Няма DOCTYPE или html tags, не може да е HTML
      expect(result).toBeUndefined();
    });

    test('package keyword - could be Java or Go', () => {
      const code = 'package main\nfunc test() {}';
      const result = detectLanguageByContent(code);
      expect(result).toBe('go');
    });

    test('import statement - multiple languages', () => {
      const code = 'import sys';
      const result = detectLanguageByContent(code);
      expect(result).toBe('python');
    });
  });

  // ============================================================================
  // 4. Код с BOM (Byte Order Mark) в началото
  // ============================================================================
  describe('Code with BOM (Byte Order Mark)', () => {
    test('UTF-8 BOM + JavaScript code', () => {
      const code = '\ufeffconst x = 5;';
      const result = detectLanguageByContent(code);
      expect(result).toBe('javascript');
    });

    test('UTF-8 BOM + Python code', () => {
      const code = '\ufeffdef hello():\n    pass';
      const result = detectLanguageByContent(code);
      expect(result).toBe('python');
    });

    test('UTF-8 BOM + HTML', () => {
      const code = '\ufeff<!DOCTYPE html><html></html>';
      const result = detectLanguageByContent(code);
      expect(result).toBe('html');
    });

    test('UTF-8 BOM + JSON', () => {
      const code = '\ufeff{"key": "value"}';
      const result = detectLanguageByContent(code);
      expect(result).toBe('json');
    });

    test('UTF-8 BOM + whitespace only', () => {
      const code = '\ufeff   \n\t';
      const result = detectLanguageByContent(code);
      expect(result).toBeUndefined();
    });
  });

  // ============================================================================
  // 5. Файлове с грешни/нестандартни extensions
  // ============================================================================
  describe('Files with Wrong or Non-standard Extensions', () => {
    test('.txt file with Python code - content detection should work', () => {
      const code = 'def hello():\n    print("hi")';
      const result = detectLanguage('script.txt', code);
      // Filename не помага, но content detection улавя Python
      expect(result).toBe('python');
    });

    test('.data file with JSON - content detection', () => {
      const code = '{"key": "value"}';
      const result = detectLanguage('config.data', code);
      expect(result).toBe('json');
    });

    test('.bak file with JavaScript', () => {
      const code = 'const x = 5; export default x;';
      const result = detectLanguage('app.js.bak', code);
      expect(result).toBe('javascript');
    });

    test('no extension with HTML', () => {
      const code = '<!DOCTYPE html><html><body></body></html>';
      const result = detectLanguage('index', code);
      expect(result).toBe('html');
    });

    test('unknown extension with SQL', () => {
      const code = 'SELECT * FROM users WHERE id = 1;';
      const result = detectLanguage('query.unknown', code);
      expect(result).toBe('sql');
    });

    test('wrong extension - .js file with Python code', () => {
      const code = 'def hello():\n    print("test")';
      const result = detectLanguage('script.js', code);
      // Filename каза JS, но има conflict
      // Според current logic, filename има приоритет
      expect(result).toBe('javascript');
    });
  });

  // ============================================================================
  // 6. Case Sensitivity при file extensions
  // ============================================================================
  describe('Case Sensitivity in File Extensions', () => {
    test('uppercase .JS extension', () => {
      const result = detectLanguageByFilename('script.JS');
      expect(result).toBe('javascript');
    });

    test('mixed case .Py extension', () => {
      const result = detectLanguageByFilename('script.Py');
      expect(result).toBe('python');
    });

    test('uppercase .HTML', () => {
      const result = detectLanguageByFilename('index.HTML');
      expect(result).toBe('html');
    });

    test('mixed case .TyPeScRiPt', () => {
      const result = detectLanguageByFilename('app.TS');
      expect(result).toBe('typescript');
    });

    test('lowercase vs uppercase should both work', () => {
      const lower = detectLanguageByFilename('test.cpp');
      const upper = detectLanguageByFilename('test.CPP');
      expect(lower).toBe('cpp');
      expect(upper).toBe('cpp');
    });

    test('all caps filename', () => {
      const result = detectLanguageByFilename('MAKEFILE.RB');
      expect(result).toBe('ruby');
    });
  });

  // ============================================================================
  // 7. Double/Multiple Extensions
  // ============================================================================
  describe('Double and Multiple File Extensions', () => {
    test('.test.ts extension', () => {
      const result = detectLanguageByFilename('app.test.ts');
      expect(result).toBe('typescript');
    });

    test('.spec.js extension', () => {
      const result = detectLanguageByFilename('component.spec.js');
      expect(result).toBe('javascript');
    });

    test('.min.js extension', () => {
      const result = detectLanguageByFilename('bundle.min.js');
      expect(result).toBe('javascript');
    });

    test('.component.html extension', () => {
      const result = detectLanguageByFilename('app.component.html');
      expect(result).toBe('html');
    });

    test('.service.ts extension', () => {
      const result = detectLanguageByFilename('user.service.ts');
      expect(result).toBe('typescript');
    });

    test('.config.js extension', () => {
      const result = detectLanguageByFilename('webpack.config.js');
      expect(result).toBe('javascript');
    });

    test('.d.ts TypeScript declaration', () => {
      const result = detectLanguageByFilename('types.d.ts');
      expect(result).toBe('typescript');
    });

    test('triple extension .test.spec.js', () => {
      const result = detectLanguageByFilename('app.test.spec.js');
      expect(result).toBe('javascript');
    });

    test('.min.css extension', () => {
      const result = detectLanguageByFilename('styles.min.css');
      expect(result).toBe('css');
    });

    test('.backup.py extension', () => {
      const result = detectLanguageByFilename('script.backup.py');
      expect(result).toBe('python');
    });
  });

  // ============================================================================
  // 8. Конфликт между Content Detection и Filename Detection
  // ============================================================================
  describe('Conflict Between Filename and Content Detection', () => {
    test('filename says .js but content is clearly Python', () => {
      const code = 'def hello():\n    print("Hello")\n    return True';
      // Filename detection има приоритет в detectLanguage()
      const result = detectLanguage('script.js', code);
      expect(result).toBe('javascript');
    });

    test('filename says .py but content is JavaScript', () => {
      const code = 'const hello = () => { console.log("Hello"); };';
      const result = detectLanguage('script.py', code);
      expect(result).toBe('python');
    });

    test('no filename, content detection succeeds', () => {
      const code = 'SELECT * FROM users;';
      const result = detectLanguage(undefined, code);
      expect(result).toBe('sql');
    });

    test('invalid filename, fallback to content', () => {
      const code = 'def test():\n    pass';
      const result = detectLanguage('unknown.xyz', code);
      expect(result).toBe('python');
    });

    test('filename without extension, use content', () => {
      // README has no filename-based detection, so content wins.
      const code = '<!DOCTYPE html><html></html>';
      const result = detectLanguage('README', code);
      expect(result).toBe('html');
    });

    test('empty filename string, use content', () => {
      const code = 'package main\nfunc main() {}';
      const result = detectLanguage('', code);
      expect(result).toBe('go');
    });
  });

  // ============================================================================
  // 9. Special Filenames (без разширение)
  // ============================================================================
  describe('Special Filenames Without Extensions', () => {
    test('Makefile detection', () => {
      // Makefile is detected as makefile via special-filename handling.
      const result = detectLanguageByFilename('Makefile');
      expect(result).toBe('makefile');
    });

    test('Dockerfile detection', () => {
      const result = detectLanguageByFilename('Dockerfile');
      expect(result).toBe('dockerfile');
    });

    test('README detection', () => {
      const result = detectLanguageByFilename('README');
      expect(result).toBeUndefined();
    });

    test('.gitignore detection', () => {
      const result = detectLanguageByFilename('.gitignore');
      expect(result).toBeUndefined();
    });

    test('.bashrc detection', () => {
      const result = detectLanguageByFilename('.bashrc');
      expect(result).toBeUndefined();
    });
  });

  // ============================================================================
  // 10. Path-like Filenames (with directories)
  // ============================================================================
  describe('Filenames with Directory Paths', () => {
    test('Unix path with .js', () => {
      const result = detectLanguageByFilename('/home/user/project/app.js');
      expect(result).toBe('javascript');
    });

    test('Windows path with .py', () => {
      const result = detectLanguageByFilename('C:\\Users\\Project\\script.py');
      expect(result).toBe('python');
    });

    test('relative path with .ts', () => {
      const result = detectLanguageByFilename('./src/components/App.ts');
      expect(result).toBe('typescript');
    });

    test('path with multiple dots', () => {
      const result = detectLanguageByFilename('../folder.name/file.test.js');
      expect(result).toBe('javascript');
    });

    test('URL-like path', () => {
      const result = detectLanguageByFilename('https://example.com/script.js');
      expect(result).toBe('javascript');
    });
  });

  // ============================================================================
  // 11. Code with Invalid or Unexpected Syntax
  // ============================================================================
  describe('Code with Invalid or Unexpected Syntax', () => {
    test('all caps filename', () => {
      const result = detectLanguageByFilename('MAKEFILE.RB');
      expect(result).toBe('ruby');
    });

    test('JSON with trailing comma (invalid)', () => {
      const code = '{"key": "value",}';
      // JSON.parse will fail but should return undefined
      const result = detectLanguageByContent(code);
      expect(result).toBeUndefined();
    });

    test('incomplete function definition', () => {
      const code = 'function test(';
      const result = detectLanguageByContent(code);
      expect(result).toBe('javascript');
    });

    test('random gibberish', () => {
      const code = 'xqwjkasdhfkjahsdf 123 !@#$%';
      const result = detectLanguageByContent(code);
      expect(result).toBeUndefined();
    });
  });

  // ============================================================================
  // 12. Content Detection Priority Tests
  // ============================================================================
  describe('Content Detection - Priority of Patterns', () => {
    test('HTML detection prioritized (DOCTYPE)', () => {
      const code = '<!DOCTYPE html>\nfunction test() {}';
      const result = detectLanguageByContent(code);
      // DOCTYPE е по-силен match от function keyword
      expect(result).toBe('html');
    });

    test('XML detection prioritized (<?xml)', () => {
      const code = '<?xml version="1.0"?>\n<root></root>';
      const result = detectLanguageByContent(code);
      expect(result).toBe('xml');
    });

    test('PHP detection prioritized (<?php)', () => {
      const code = '<?php echo "hello"; function test() {}';
      const result = detectLanguageByContent(code);
      expect(result).toBe('php');
    });

    test('SQL detection early (SELECT at start)', () => {
      const code = 'SELECT function FROM table;';
      const result = detectLanguageByContent(code);
      expect(result).toBe('sql');
    });

    test('TypeScript interface beats JavaScript', () => {
      const code = 'interface User { name: string; }';
      const result = detectLanguageByContent(code);
      expect(result).toBe('typescript');
    });
  });

  // ============================================================================
  // 13. Edge Cases с Special Characters
  // ============================================================================
  describe('Code with Special Characters and Unicode', () => {
    test('code with emoji', () => {
      const code = 'const greeting = "Hello 👋"; // 🎉';
      const result = detectLanguageByContent(code);
      expect(result).toBe('javascript');
    });

    test('code with Cyrillic characters', () => {
      const code = 'const име = "Иван"; // коментар';
      const result = detectLanguageByContent(code);
      expect(result).toBe('javascript');
    });

    test('code with Chinese characters', () => {
      const code = 'const 名字 = "测试";';
      const result = detectLanguageByContent(code);
      expect(result).toBe('javascript');
    });

    test('code with right-to-left text', () => {
      const code = 'const text = "مرحبا";';
      const result = detectLanguageByContent(code);
      expect(result).toBe('javascript');
    });

    test('filename with special characters', () => {
      const result = detectLanguageByFilename('файл-名字.js');
      expect(result).toBe('javascript');
    });
  });

  // ============================================================================
  // 14. Numeric and Symbol-heavy Code
  // ============================================================================
  describe('Numeric and Symbol-heavy Code', () => {
    test('mostly numbers', () => {
      const code = '12345 67890 11111';
      const result = detectLanguageByContent(code);
      expect(result).toBeUndefined();
    });

    test('mostly symbols', () => {
      const code = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const result = detectLanguageByContent(code);
      expect(result).toBeUndefined();
    });

    test('ASCII art', () => {
      const code = `
   /\\_/\\  
  ( o.o ) 
   > ^ <
      `;
      const result = detectLanguageByContent(code);
      expect(result).toBeUndefined();
    });
  });
});