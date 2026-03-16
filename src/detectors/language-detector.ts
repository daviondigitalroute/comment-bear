import { Lang } from '../types';

/**
 * Mapping of file extensions to programming languages
 */
const EXTENSION_MAP: Record<string, Lang> = {
  // JavaScript/TypeScript
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  
  // Python
  '.py': 'python',
  '.pyw': 'python',
  '.pyi': 'python',
  
  // Ruby
  '.rb': 'ruby',
  '.rake': 'ruby',
  
  // Java
  '.java': 'java',
  
  // C#
  '.cs': 'csharp',
  
  // C/C++
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.hh': 'cpp',
  '.hxx': 'cpp',
  
  // Web
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'css',
  '.sass': 'css',
  '.less': 'css',
  
  // SQL
  '.sql': 'sql',
  
  // Config/Data
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.json': 'json',
  '.xml': 'xml',
  
  // Other
  '.php': 'php',
  '.go': 'go',
  '.rs': 'rust',
  '.swift': 'swift',

  // Kotlin
  '.kt': 'kotlin',
  '.kts': 'kotlin',

  // Scala
  '.scala': 'scala',
  '.sc': 'scala',

  // Haskell
  '.hs': 'haskell',
  '.lhs': 'haskell',
};

/**
 * Detects the programming language by filename or extension
 * @param filename - Filename with extension
 * @returns Detected language or undefined
 */
export function detectLanguageByFilename(filename: string | undefined | null): Lang | undefined {
  if (!filename) return undefined;
  
  // Handle non-string input
  if (typeof filename !== 'string') {
    return undefined;
  }
  
  // Normalize the filename - trim spaces and remove trailing dots
  const normalized = filename.trim().replace(/\.+$/, '');
  
  // Check for exact extension match
  for (const [extension, lang] of Object.entries(EXTENSION_MAP)) {
    if (normalized.toLowerCase().endsWith(extension)) {
      return lang;
    }
  }
  
  return undefined;
}

/**
 * Attempts to detect the language by code content
 * @param code - Code to analyze
 * @returns Detected language or undefined
 */
export function detectLanguageByContent(code: string): Lang | undefined {
  if (!code || code.trim().length === 0) return undefined;
  
  const trimmed = code.trim();
  
  // HTML - check for DOCTYPE or HTML tags
  if (trimmed.includes('<!DOCTYPE') || 
      /<html[\s>]/i.test(trimmed) ||
      /<head[\s>]/i.test(trimmed) ||
      /<body[\s>]/i.test(trimmed)) {
    return 'html';
  }
  
  // XML - check for XML declaration
  if (trimmed.startsWith('<?xml')) {
    return 'xml';
  }
  
  // JSON - check for valid JSON syntax
  if (trimmed.length > 4 && // Require minimum length for meaningful JSON
      ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
       (trimmed.startsWith('[') && trimmed.endsWith(']')))) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // Not valid JSON
    }
  }
  
  // Ruby - check for Ruby-specific patterns first (before Python since they share some syntax)
  // Check for Ruby's def/end pattern
  if ((/^\s*def\s+\w+\s*[\s\S]*?\n\s*end\b/m.test(trimmed) && /\bend\b/m.test(trimmed)) ||
      // Ruby's class/module with end
      /^\s*(class|module)\s+[\w:]+\s*(<\s*[\w:]+)?\s*\n[\s\S]*?\n\s*end\b/m.test(trimmed) ||
      // Ruby's puts with string
      /\bputs\s+["']/.test(trimmed) ||
      // Ruby's begin/end blocks
      /\bbegin\b[\s\S]*?\bend\b/m.test(trimmed) ||
      // Ruby's do/end blocks
      /\bdo\s*\|.*\|\s*\n[\s\S]*?\n\s*end\b/m.test(trimmed) ||
      // Ruby's multi-line comments
      /^=begin\s*\n[\s\S]*?\n=end\b/m.test(trimmed)) {
    return 'ruby';
  }
  
  // Haskell - check for Haskell-specific patterns (before Python due to import overlap)
  if (/^\s*module\s+[A-Z][\w.]*\s+where/m.test(trimmed) ||
      /^\s*\w+\s*::\s*.+->/.test(trimmed) ||
      (/^\s*import\s+(qualified\s+)?[A-Z]/m.test(trimmed) && !/[{};]/.test(trimmed) && !/from\s/m.test(trimmed))) {
    return 'haskell';
  }

  // Python - check for Python-specific keywords with more specific patterns
  // Check for Python's def with colon and indentation
  if (/^\s*def\s+\w+\s*\([^)]*\)\s*:/m.test(trimmed) ||
      // Python's class with colon and inheritance
      /^\s*class\s+\w+\s*(\([^)]*\))?\s*:/m.test(trimmed) ||
      // Python's import/from with newline or end of string
      /^\s*(import|from)\s+\w+/m.test(trimmed) && !/[{};]/.test(trimmed)) {
    return 'python';
  }

  // PHP - check for PHP tags
  if (trimmed.includes('<?php')) {
    return 'php';
  }

  // SQL - check for SQL keywords
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s+/im.test(trimmed)) {
    return 'sql';
  }

  // Java - check for Java-specific patterns
  if (/^(public|private|protected)\s+(class|interface|enum)/m.test(trimmed) ||
      trimmed.includes('System.out.println')) {
    return 'java';
  }

  // C# - check for C#-specific patterns
  if (trimmed.includes('using System;') ||
      /namespace\s+\w+/m.test(trimmed)) {
    return 'csharp';
  }

  // Kotlin - check for Kotlin-specific patterns (before Rust/Go due to fun/val overlap)
  if (/\bdata\s+class\b/m.test(trimmed) ||
      (/\bfun\s+\w+/m.test(trimmed) && /\bval\s+\w+/m.test(trimmed))) {
    return 'kotlin';
  }
  if (/^\s*package\s+[\w.]+\.[\w.]+/m.test(trimmed) &&
      (/\bfun\s+/m.test(trimmed) || /\bval\s+/m.test(trimmed))) {
    return 'kotlin';
  }

  // Scala - check for Scala-specific patterns (before Rust due to trait overlap)
  if (/\bcase\s+class\b/m.test(trimmed) ||
      (/^\s*(object|trait)\s+\w+/m.test(trimmed) &&
       (/\bdef\s+\w+/m.test(trimmed) || /\bval\s+\w+/m.test(trimmed)))) {
    return 'scala';
  }
  if (/^\s*package\s+[\w.]+\.[\w.]+/m.test(trimmed) &&
      (/\btrait\s+/m.test(trimmed) || /\bobject\s+/m.test(trimmed))) {
    return 'scala';
  }

  // Rust - check for Rust-specific patterns
  if (/^(fn|pub fn|impl|mod|use)\s+/m.test(trimmed) ||
      trimmed.includes('println!') ||
      (/^\s*trait\s+\w+/m.test(trimmed) && !(/\bdef\s+/m.test(trimmed) || /\bval\s+/m.test(trimmed)))) {
    return 'rust';
  }

  // Swift - check for Swift-specific patterns (before Go)
  if (/^(func|var|let|class|struct|enum)\s+\w+/m.test(trimmed) &&
      (trimmed.includes(': ') || trimmed.includes('-> '))) {
    return 'swift';
  }

  // Go - check for Go-specific patterns (after Swift)
  if (/^package\s+\w+/m.test(trimmed) ||
      /^func\s+\w+/m.test(trimmed) ||
      trimmed.includes('fmt.Println')) {
    return 'go';
  }

  // TypeScript - check for TypeScript types
  if (/:\s*(string|number|boolean|any|void|never)\s*[=;,\)]/m.test(trimmed) ||
      trimmed.includes('interface ') ||
      trimmed.includes('type ')) {
    return 'typescript';
  }
  
  // JavaScript - fallback for JS syntax
  if (/^(function|const|let|var|class|export|import)\s+/m.test(trimmed) ||
      trimmed.includes('=>')) {
    return 'javascript';
  }
  
  // CSS - check for CSS selectors
  if (/[.#]?\w+\s*\{[\s\S]*\}/m.test(trimmed)) {
    return 'css';
  }
  
  return undefined;
}

/**
 * Detects the language by combining multiple methods
 * @param filename - Optional filename
 * @param code - Optional code content
 * @returns Detected language or undefined
 */
export function detectLanguage(filename?: string, code?: string): Lang | undefined {
  // First try by filename (more reliable)
  if (filename) {
    const langByFilename = detectLanguageByFilename(filename);
    if (langByFilename) return langByFilename;
  }
  
  // If no filename or couldn't detect by filename, try by content
  if (code) {
    return detectLanguageByContent(code);
  }
  
  return undefined;
}