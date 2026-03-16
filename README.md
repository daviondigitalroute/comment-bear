<div align="center">
  <a href="https://github.com/ivan-markov-666/comment-bear">
    <img src="assets/logo.png" alt="Comment Bear Logo" width="200">
  </a>

  <h3>Your friendly code comment remover</h3>

  [![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?style=flat-square&logo=github)](https://github.com/ivan-markov-666/comment-bear)
  [![npm](https://img.shields.io/badge/npm-comment--bear-blue?style=flat-square&logo=npm)](https://www.npmjs.com/package/comment-bear)
  [![Tests](https://img.shields.io/badge/tests-1043%2B-brightgreen?style=flat-square)](https://github.com/ivan-markov-666/comment-bear/actions)
  [![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

  🐻 A fast and friendly tool for removing comments from code in multiple programming languages. Built with TypeScript and thoroughly tested with 1043+ tests to ensure reliability and quality.
</div>

## ✨ Features

- 🌐 **Language Support**:
  - **Full Support**: JavaScript, TypeScript, Python, Java, C#, C, C++, HTML, CSS, SQL, Ruby, Haskell
  - **Basic Support** (using generic comment patterns): PHP, Go, Rust, Swift, Kotlin, Scala, YAML, JSON, XML
  - *More languages coming soon!*

- 🔍 **Automatic language detection** by file extension or content
- 📝 **Preserve license comments** (optional)
- 🔒 **Type safety** with full TypeScript support
- ⚡ **High performance** with minimal dependencies
- 🧪 **Dry-run mode** for preview
- 📦 **Easy integration** with Node.js and TypeScript projects
- 🖥️ **CLI tool** for command-line usage
- 🌊 **Stream API** for processing large files
- ⚙️ **Configuration files** (.commentbearrc) for project-level settings

> **Note on Language Support**: 
> - **Full Support**: Dedicated comment remover with language-specific rules
> - **Basic Support**: Uses generic comment patterns that work for most cases but might not handle all edge cases
> - We're actively working on adding more languages and improving existing support

## 📦 Installation

```bash
npm install comment-bear
```

## 🚀 Quick Start

### TypeScript

```typescript
import { removeComments } from 'comment-bear';

const code = `
// This is a comment
const hello = () => {
  console.log("Hello World"); // Inline comment
};
`;

const result = removeComments(code, { language: 'javascript' });
console.log(result.code);
// Output:
// const hello = () => {
//   console.log("Hello World");
// };
```

### JavaScript (CommonJS)

```javascript
const { removeComments } = require('comment-bear');

const code = '# Python comment\nprint("Hello")';
const result = removeComments(code, { language: 'python' });
console.log(result.code); // print("Hello")
```

### JavaScript (ES Modules)

```javascript
import { removeComments } from 'comment-bear';

const result = removeComments(myCode, { filename: 'script.js' });
```

## 📖 API Documentation

### `removeComments(code: string, options?: RemoveOptions): RemoveResult`

Main function for removing comments.

#### Parameters

- **`code`** (string): Input code to process
- **`options`** (RemoveOptions, optional): Configuration options

#### RemoveOptions

```typescript
interface RemoveOptions {
  language?: Lang;              // Explicitly specify language
  filename?: string;            // Filename for auto-detection
  preserveLicense?: boolean;    // Preserve license comments (default: false)
  dryRun?: boolean;            // Test mode without changes (default: false)
  keepEmptyLines?: boolean;    // Preserve empty lines (default: false)
}
```

#### RemoveResult

```typescript
interface RemoveResult {
  code: string;                 // Processed code
  removedCount: number;         // Number of comments removed
  detectedLanguage?: Lang;      // Auto-detected language
}
```

#### Supported Languages (Lang)

```typescript
type Lang =
  | "javascript" | "typescript" | "python" | "ruby"
  | "java" | "csharp" | "c" | "cpp"
  | "html" | "css" | "sql" | "yaml"
  | "json" | "xml" | "php" | "go"
  | "rust" | "swift" | "kotlin" | "scala"
  | "haskell";
```

## 🎯 Usage Examples

### Automatic Language Detection

```typescript
import { removeComments } from 'comment-bear';

// By filename
const result1 = removeComments(code, { filename: 'script.py' });
console.log(result1.detectedLanguage); // "python"

// By content
const htmlCode = '<!DOCTYPE html><!-- Comment --><html></html>';
const result2 = removeComments(htmlCode);
console.log(result2.detectedLanguage); // "html"
```

### Preserving License Comments

```typescript
const code = `
/*! MIT License - Copyright (c) 2025 */
// Regular comment
const x = 5;
`;

const result = removeComments(code, {
  language: 'javascript',
  preserveLicense: true
});

console.log(result.code);
// Output:
// /*! MIT License - Copyright (c) 2025 */
// const x = 5;
```

### Dry-run Mode

```typescript
const code = '// Comment\nconst x = 5;';

const result = removeComments(code, {
  language: 'javascript',
  dryRun: true
});

console.log(result.code === code); // true (code was not modified)
console.log(result.removedCount);  // 1 (number of comments that would be removed)
```

### Working with Different Languages

#### Python

```typescript
const pythonCode = `
# This is a comment
def hello():
    """Docstring"""
    print("Hello")  # Inline comment
`;

const result = removeComments(pythonCode, { language: 'python' });
```

#### Java

```typescript
const javaCode = `
// Single line comment
/* Multi-line
   comment */
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello"); // Inline
    }
}
`;

const result = removeComments(javaCode, { language: 'java' });
```

#### HTML

```typescript
const htmlCode = `
<!-- This is a comment -->
<div class="container">
  <!-- Another comment -->
  <p>Content</p>
</div>
`;

const result = removeComments(htmlCode, { language: 'html' });
```

#### SQL

```typescript
const sqlCode = `
-- Single line comment
/* Multi-line
   comment */
SELECT * FROM users;
`;

const result = removeComments(sqlCode, { language: 'sql' });
```

#### Kotlin

```typescript
const kotlinCode = `
// Data class comment
data class User(
    val name: String, // User name
    val age: Int // User age
)
`;

const result = removeComments(kotlinCode, { language: 'kotlin' });
```

#### Scala

```typescript
const scalaCode = `
// Trait definition
trait Greeter {
  def greet(name: String): Unit // greet method
}
`;

const result = removeComments(scalaCode, { language: 'scala' });
```

#### Haskell

```typescript
const haskellCode = `
{-# LANGUAGE OverloadedStrings #-}
-- | Main module
module Main where

-- Entry point
main :: IO ()
main = putStrLn "Hello" -- prints greeting
`;

const result = removeComments(haskellCode, { language: 'haskell' });
// Pragmas ({-# #-}) are always preserved
```

## 🖥️ CLI Usage

```bash
# Install globally
npm install -g comment-bear

# Remove comments and print to stdout
comment-bear src/index.js

# Write to output file
comment-bear src/index.js -o clean.js

# Modify file in place
comment-bear src/index.js -i

# Multiple files in place
comment-bear src/*.js -i

# Force language detection
comment-bear config.txt --language javascript

# Preserve license comments
comment-bear src/index.js --preserve-license

# Preview what would be removed
comment-bear src/index.js --dry-run

# Use a config file
comment-bear src/index.js --config .commentbearrc
```

### CLI Options

| Option | Short | Description |
|---|---|---|
| `--help` | `-h` | Show help message |
| `--version` | `-v` | Show version number |
| `--output <file>` | `-o` | Write output to file |
| `--in-place` | `-i` | Modify files in place |
| `--language <lang>` | `-l` | Force language |
| `--preserve-license` | | Keep license comments |
| `--dry-run` | | Preview without modifying |
| `--keep-empty-lines` | | Preserve empty lines |
| `--config <path>` | `-c` | Path to config file |

## 🌊 Stream API

For processing large files efficiently:

```typescript
import { createCommentRemoverStream } from 'comment-bear';
import { createReadStream, createWriteStream } from 'fs';

// Pipe a file through the comment remover
createReadStream('input.js')
  .pipe(createCommentRemoverStream({ language: 'javascript' }))
  .pipe(createWriteStream('output.js'));

// With options
createReadStream('input.js')
  .pipe(createCommentRemoverStream({
    language: 'javascript',
    preserveLicense: true,
    keepEmptyLines: true,
  }))
  .pipe(createWriteStream('output.js'));

// Auto-detect language by filename
createReadStream('input.py')
  .pipe(createCommentRemoverStream({ filename: 'input.py' }))
  .pipe(createWriteStream('output.py'));
```

## ⚙️ Configuration Files

Create a `.commentbearrc` or `.commentbearrc.json` file in your project root:

```json
{
  "language": "javascript",
  "preserveLicense": true,
  "keepEmptyLines": false,
  "exclude": ["node_modules", "dist"],
  "include": ["src/**/*.ts"]
}
```

The CLI automatically discovers config files by walking up the directory tree from the current working directory.

**Programmatic usage:**

```typescript
import { loadConfig, mergeConfig } from 'comment-bear';

// Auto-discover and load config
const config = loadConfig();

// Load from specific path
const config2 = loadConfig('.commentbearrc');
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## 🏗️ Development

```bash
# Clone the repository
git clone https://github.com/ivan-markov-666/comment-bear.git
cd comment-bear

# Install dependencies
npm install

# Build
npm run build

# Watch mode for development
npm run dev
```

## 📁 Project Structure

```
comment-bear/
├── src/
│   ├── index.ts              # Main entry point & API exports
│   ├── types.ts              # TypeScript types
│   ├── cli.ts                # CLI tool
│   ├── stream.ts             # Stream API
│   ├── config.ts             # Configuration file support
│   ├── detectors/            # Language detectors
│   │   └── language-detector.ts
│   └── removers/             # Language-specific removers
│       ├── javascript-remover.ts
│       ├── python-remover.ts
│       ├── css-html-remover.ts
│       ├── sql-remover.ts
│       ├── c-style-remover.ts  # Java, C#, C, C++, PHP, Go, Rust, Swift, Kotlin, Scala
│       └── other-remover.ts    # JSON, YAML, Ruby, Haskell
├── test/                     # Tests (1043+ test cases)
├── dist/                     # Compiled files (auto-generated)
├── package.json
├── tsconfig.json
└── README.md
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [strip-comments](https://github.com/jonschlinkert/strip-comments) - for JavaScript comments
- [strip-json-comments](https://github.com/sindresorhus/strip-json-comments) - for JSON comments

## 📞 Contact

- GitHub: [ivan-markov-666](https://github.com/ivan-markov-666)
- Issues: [github.com/ivan-markov-666/comment-bear/issues](https://github.com/ivan-markov-666/comment-bear/issues)

## 🗺️ Roadmap

- [x] CLI tool
- [x] Support for more languages (Kotlin, Scala, Haskell)
- [x] Stream API for large file processing
- [x] Configuration files (.commentbearrc)
- [ ] Editor plugins (VS Code, IntelliJ)
- [ ] GitHub Action for automatic comment removal

---

⭐ If you find this project useful, give it a star on GitHub!
