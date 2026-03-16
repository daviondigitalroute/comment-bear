// Export types
export { Lang, RemoveOptions, RemoveResult } from './types';

// Export detectors
export { detectLanguage, detectLanguageByFilename, detectLanguageByContent } from './detectors/language-detector';

// Export stream API
export { createCommentRemoverStream, CommentRemoverStream, CommentRemoverStreamOptions } from './stream';

// Export config
export { loadConfig, findConfigFile, CommentBearConfig } from './config';

// Import removers
import { removeJavaScriptComments, removeTypeScriptComments } from './removers/javascript-remover';
import { removePythonComments } from './removers/python-remover';
import { removeCssComments, removeHtmlComments, removeXmlComments } from './removers/css-html-remover';
import { removeSqlComments } from './removers/sql-remover';
import {
  removeJavaComments,
  removeCSharpComments,
  removeCComments,
  removeCppComments,
  removePhpComments,
  removeGoComments,
  removeRustComments,
  removeSwiftComments,
  removeKotlinComments,
  removeScalaComments
} from './removers/c-style-remover';
import { removeJsonComments, removeYamlComments, removeRubyComments, removeHaskellComments } from './removers/other-remover';

import { Lang, RemoveOptions, RemoveResult } from './types';
import { detectLanguage, detectLanguageByFilename } from './detectors/language-detector';

/**
 * Removes comments from code in various programming languages
 * 
 * @param code - The input code to process
 * @param options - Comment removal options
 * @returns Result with processed code and metadata
 * 
 * @example
 * ```typescript
 * const result = removeComments('// comment\nconst x = 5;', { language: 'javascript' });
 * console.log(result.code); // 'const x = 5;'
 * ```
 */
export function removeComments(code: any, options: RemoveOptions = {}): RemoveResult {
  // Handle non-string input by converting to string
  if (typeof code !== 'string') {
    if (code === null || code === undefined) {
      return {
        code: code as any,
        removedCount: 0,
        detectedLanguage: undefined
      };
    }
    
    // Convert non-string values to string, but handle objects/arrays specially
    const stringValue = typeof code.toString === 'function' 
      ? code.toString() 
      : String(code);
      
    return {
      code: stringValue,
      removedCount: 0,
      detectedLanguage: undefined
    };
  }
  
  // Handle empty or whitespace-only strings
  if (code.trim().length === 0) {
    return {
      code: code,
      removedCount: 0,
      detectedLanguage: undefined
    };
  }
  
  // Determine the language - filename takes precedence over language parameter
  let language = options.language;
  
  // If filename exists, try to detect language from it (overrides language parameter if successful)
  if (options.filename) {
    const detectedByFilename = detectLanguageByFilename(options.filename);
    if (detectedByFilename) {
      language = detectedByFilename;
    }
  }
  
  // If still no language, try automatic detection
  if (!language) {
    language = detectLanguage(undefined, code);
  }
  
  if (!language) {
    // Cannot determine the language
    return {
      code: code,
      removedCount: 0,
      detectedLanguage: undefined
    };
  }
  
  // Dry run mode - count comments while considering preserveLicense
  if (options.dryRun) {
    const commentCount = countComments(code, language, options.preserveLicense || false);
    return {
      code: code,
      removedCount: commentCount,
      detectedLanguage: language
    };
  }
  
  // Remove comments based on language
  const preserveLicense = options.preserveLicense || false;
  const keepEmptyLines = options.keepEmptyLines || false;
  let processedCode = code;
  
  try {
    switch (language) {
  case 'javascript':
    processedCode = removeJavaScriptComments(code, preserveLicense, keepEmptyLines);
    break;
  case 'typescript':
    processedCode = removeTypeScriptComments(code, preserveLicense, keepEmptyLines);
    break;
  case 'python':
    processedCode = removePythonComments(code, preserveLicense, keepEmptyLines);
    break;
  case 'ruby':
    processedCode = removeRubyComments(code, preserveLicense, keepEmptyLines);
    break;
  case 'java':
    processedCode = removeJavaComments(code, preserveLicense, keepEmptyLines);
    break;
  case 'csharp':
    processedCode = removeCSharpComments(code, preserveLicense, keepEmptyLines);
    break;
  case 'c':
    processedCode = removeCComments(code, preserveLicense, keepEmptyLines);
    break;
  case 'cpp':
    processedCode = removeCppComments(code, preserveLicense, keepEmptyLines);
    break;
  case 'php':
    processedCode = removePhpComments(code, preserveLicense, keepEmptyLines);
    break;
  case 'go':
    processedCode = removeGoComments(code, preserveLicense, keepEmptyLines);
    break;
  case 'rust':
    processedCode = removeRustComments(code, preserveLicense, keepEmptyLines);
    break;
  case 'swift':
    processedCode = removeSwiftComments(code, preserveLicense, keepEmptyLines);
    break;
  case 'kotlin':
    processedCode = removeKotlinComments(code, preserveLicense, keepEmptyLines);
    break;
  case 'scala':
    processedCode = removeScalaComments(code, preserveLicense, keepEmptyLines);
    break;
  case 'haskell':
    processedCode = removeHaskellComments(code, preserveLicense, keepEmptyLines);
    break;
  case 'yaml':
    processedCode = removeYamlComments(code, preserveLicense, keepEmptyLines);
    break;
  
  // HTML, CSS, SQL, JSON, XML remain UNCHANGED (2 parameters)
  case 'html':
    processedCode = removeHtmlComments(code, preserveLicense);
    break;
  case 'css':
    processedCode = removeCssComments(code, preserveLicense);
    break;
  case 'sql':
    processedCode = removeSqlComments(code, preserveLicense);
    break;
  case 'json':
    processedCode = removeJsonComments(code, preserveLicense);
    break;
  case 'xml':
    processedCode = removeXmlComments(code, preserveLicense);
    break;
}
  } catch (error) {
    console.error(`Error removing comments for language ${language}:`, error);
    return {
      code: code,
      removedCount: 0,
      detectedLanguage: language
    };
  }
  
  // Calculate the number of removed comments
  const removedCount = estimateRemovedComments(code, processedCode);
  
  return {
    code: processedCode,
    removedCount: removedCount,
    detectedLanguage: language
  };
}

/**
 * Counts comments in code (approximate)
 * @param code - The code to analyze
 * @param language - The programming language
 * @param preserveLicense - Whether license comments are preserved (not counted)
 */
function countComments(code: string, language: Lang, preserveLicense: boolean = false): number {
  const lines = code.split('\n');
  let count = 0;
  
  // Simplified logic for counting comments
  for (const line of lines) {
    const trimmed = line.trim();
    
    // If it's a license comment and preserveLicense is true, don't count it
    if (preserveLicense && isLicenseLine(trimmed)) {
      continue;
    }
    
    switch (language) {
      case 'javascript':
      case 'typescript':
      case 'java':
      case 'csharp':
      case 'c':
      case 'cpp':
      case 'go':
      case 'rust':
      case 'swift':
      case 'php':
      case 'kotlin':
      case 'scala':
        if (trimmed.startsWith('//') || trimmed.startsWith('/*')) {
          count++;
        }
        break;
      case 'haskell':
        if (trimmed.startsWith('--') || trimmed.startsWith('{-')) {
          // Don't count pragmas {-# ... #-}
          if (!trimmed.startsWith('{-#')) {
            count++;
          }
        }
        break;
      case 'python':
      case 'ruby':
      case 'yaml':
        if (trimmed.startsWith('#') || trimmed.startsWith('=begin')) {
          count++;
        }
        break;
      case 'html':
      case 'xml':
        if (trimmed.startsWith('<!--')) {
          count++;
        }
        break;
      case 'css':
        if (trimmed.startsWith('/*')) {
          count++;
        }
        break;
      case 'sql':
        if (trimmed.startsWith('--') || trimmed.startsWith('/*')) {
          count++;
        }
        break;
    }
  }
  
  return count;
}

/**
 * Checks if the line contains license keywords
 */
function isLicenseLine(line: string): boolean {
  const lower = line.toLowerCase();
  return lower.includes('license') ||
         lower.includes('copyright') ||
         lower.includes('licence') ||
         lower.includes('author') ||
         line.startsWith('/*!') ||
         line.includes('@license') ||
         line.includes('@copyright') ||
         line.includes('@author');
}

/**
 * Estimates how many comments were removed by comparing lines
 */
function estimateRemovedComments(original: string, processed: string): number {
  const originalLines = original.split('\n').filter(l => l.trim().length > 0);
  const processedLines = processed.split('\n').filter(l => l.trim().length > 0);
  
  return Math.max(0, originalLines.length - processedLines.length);
}

/**
 * Default export of the main function
 */
export default removeComments;