#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { removeComments } from './index';
import { Lang } from './types';
import { loadConfig } from './config';

interface CliOptions {
  files: string[];
  output?: string;
  inPlace: boolean;
  language?: Lang;
  preserveLicense: boolean;
  dryRun: boolean;
  keepEmptyLines: boolean;
  configPath?: string;
  help: boolean;
  version: boolean;
}

const VALID_LANGUAGES: Lang[] = [
  'javascript', 'typescript', 'python', 'ruby', 'java', 'csharp',
  'c', 'cpp', 'html', 'css', 'sql', 'yaml', 'json', 'xml',
  'php', 'go', 'rust', 'swift', 'kotlin', 'scala', 'haskell'
];

export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    files: [],
    inPlace: false,
    preserveLicense: false,
    dryRun: false,
    keepEmptyLines: false,
    help: false,
    version: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '-v':
      case '--version':
        options.version = true;
        break;
      case '-o':
      case '--output':
        i++;
        if (i >= args.length) {
          throw new Error('Missing value for --output');
        }
        options.output = args[i];
        break;
      case '-i':
      case '--in-place':
        options.inPlace = true;
        break;
      case '-l':
      case '--language':
        i++;
        if (i >= args.length) {
          throw new Error('Missing value for --language');
        }
        const lang = args[i] as Lang;
        if (!VALID_LANGUAGES.includes(lang)) {
          throw new Error(`Unknown language: ${args[i]}. Valid languages: ${VALID_LANGUAGES.join(', ')}`);
        }
        options.language = lang;
        break;
      case '--preserve-license':
        options.preserveLicense = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--keep-empty-lines':
        options.keepEmptyLines = true;
        break;
      case '-c':
      case '--config':
        i++;
        if (i >= args.length) {
          throw new Error('Missing value for --config');
        }
        options.configPath = args[i];
        break;
      default:
        if (arg.startsWith('-')) {
          throw new Error(`Unknown option: ${arg}`);
        }
        options.files.push(arg);
        break;
    }
    i++;
  }

  return options;
}

export function showHelp(): string {
  return `comment-bear - Remove comments from source code

Usage:
  comment-bear <file> [options]
  comment-bear <file1> <file2> ... [options]

Options:
  -h, --help              Show this help message
  -v, --version           Show version number
  -o, --output <file>     Write output to file (single file only)
  -i, --in-place          Modify files in place
  -l, --language <lang>   Force language (auto-detected by default)
  --preserve-license      Preserve license comments
  --dry-run               Show what would be removed without modifying
  --keep-empty-lines      Keep empty lines where comments were
  -c, --config <path>     Path to config file

Supported languages:
  javascript, typescript, python, ruby, java, csharp, c, cpp,
  html, css, sql, yaml, json, xml, php, go, rust, swift,
  kotlin, scala, haskell

Examples:
  comment-bear src/index.js                    # Print to stdout
  comment-bear src/index.js -o clean.js        # Write to file
  comment-bear src/*.js -i                     # Modify in place
  comment-bear src/app.ts --preserve-license   # Keep license comments
  comment-bear src/app.py --dry-run            # Preview changes`;
}

export function showVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

export function processFile(
  filePath: string,
  options: {
    language?: Lang;
    preserveLicense?: boolean;
    dryRun?: boolean;
    keepEmptyLines?: boolean;
  }
): { code: string; removedCount: number; detectedLanguage?: Lang } {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const code = fs.readFileSync(filePath, 'utf-8');
  const result = removeComments(code, {
    filename: path.basename(filePath),
    language: options.language,
    preserveLicense: options.preserveLicense,
    dryRun: options.dryRun,
    keepEmptyLines: options.keepEmptyLines,
  });

  return result;
}

export function run(args: string[]): number {
  try {
    const options = parseArgs(args);

    if (options.help) {
      console.log(showHelp());
      return 0;
    }

    if (options.version) {
      console.log(showVersion());
      return 0;
    }

    if (options.files.length === 0) {
      console.error('Error: No input files specified. Use --help for usage information.');
      return 1;
    }

    if (options.output && options.files.length > 1) {
      console.error('Error: --output can only be used with a single input file.');
      return 1;
    }

    if (options.output && options.inPlace) {
      console.error('Error: --output and --in-place cannot be used together.');
      return 1;
    }

    // Load config file if specified
    let configOptions: Record<string, any> = {};
    if (options.configPath) {
      configOptions = loadConfig(options.configPath);
    } else {
      try {
        configOptions = loadConfig();
      } catch {
        // No config file found, that's fine
      }
    }

    // CLI flags override config
    const mergedOptions = {
      language: options.language || configOptions.language,
      preserveLicense: options.preserveLicense || configOptions.preserveLicense || false,
      dryRun: options.dryRun,
      keepEmptyLines: options.keepEmptyLines || configOptions.keepEmptyLines || false,
    };

    for (const filePath of options.files) {
      try {
        const result = processFile(filePath, mergedOptions);

        if (options.dryRun) {
          console.log(`${filePath}: ${result.removedCount} comment(s) would be removed`);
          if (result.detectedLanguage) {
            console.log(`  Detected language: ${result.detectedLanguage}`);
          }
        } else if (options.inPlace) {
          fs.writeFileSync(filePath, result.code, 'utf-8');
          console.log(`${filePath}: ${result.removedCount} comment(s) removed`);
        } else if (options.output) {
          fs.writeFileSync(options.output, result.code, 'utf-8');
          console.log(`Output written to ${options.output}: ${result.removedCount} comment(s) removed`);
        } else {
          // Print to stdout
          process.stdout.write(result.code);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Error processing ${filePath}: ${message}`);
        return 1;
      }
    }

    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    return 1;
  }
}

// Only run when executed directly (not when imported for testing)
if (require.main === module) {
  const exitCode = run(process.argv.slice(2));
  process.exit(exitCode);
}
