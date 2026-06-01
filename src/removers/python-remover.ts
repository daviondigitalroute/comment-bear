import { isLicenseComment } from './_shared';

/**
 * Removes comments from Python code
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines
 * @returns Processed code
 */
export function removePythonComments(
  code: string, 
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;
  
  const lines = code.split('\n');
  const result: string[] = [];
  let inMultilineString = false;
  let multilineQuote = '';
  let skipDocstring = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    
    // Check for start of multiline string (""" or ''')
    if (!inMultilineString) {
      const tripleDoubleMatch = line.indexOf('"""');
      const tripleSingleMatch = line.indexOf("'''");
      
      let matchIndex = -1;
      let quote = '';
      
      if (tripleDoubleMatch !== -1 && (tripleSingleMatch === -1 || tripleDoubleMatch < tripleSingleMatch)) {
        matchIndex = tripleDoubleMatch;
        quote = '"""';
      } else if (tripleSingleMatch !== -1) {
        matchIndex = tripleSingleMatch;
        quote = "'''";
      }
      
      if (matchIndex !== -1) {
        // Found multiline string
        const afterQuote = line.substring(matchIndex + 3);
        const closingIndex = afterQuote.indexOf(quote);
        
        if (closingIndex !== -1) {
          // Single-line docstring: """text"""
          const beforeQuote = line.substring(0, matchIndex);
          const isDocstring = beforeQuote.trim().length === 0 && isDocstringContext(lines, i);
          
          if (isDocstring && !preserveLicense) {
            if (keepEmptyLines) {
              result.push('');
            }
            continue;
          } else {
            // It's a regular string, keep it
            result.push(line);
          }
        } else {
          // Multi-line docstring start
          const beforeQuote = line.substring(0, matchIndex);
          const isDocstring = beforeQuote.trim().length === 0 && isDocstringContext(lines, i);
          
          if (isDocstring) {
            skipDocstring = !preserveLicense || !isLicenseComment(line);
            inMultilineString = true;
            multilineQuote = quote;
            
            if (!skipDocstring) {
              result.push(line);
            } else if (keepEmptyLines) {
              result.push('');
            }
            continue;
          } else {
            // Regular multi-line string
            inMultilineString = true;
            multilineQuote = quote;
            result.push(line);
            continue;
          }
        }
      }
    } else {
      // Inside multiline string
      if (line.includes(multilineQuote)) {
        inMultilineString = false;
        multilineQuote = '';
        
        if (!skipDocstring) {
          result.push(line);
        }
        skipDocstring = false;
        continue;
      }
      
      // Still in multiline string
      if (!skipDocstring) {
        result.push(line);
      } else if (keepEmptyLines) {
        result.push('');
      }
      continue;
    }
    
    // Single line comments with #
    if (trimmed.startsWith('#')) {
      if (preserveLicense && isLicenseComment(trimmed)) {
        result.push(line);
      } else if (keepEmptyLines) {
        result.push('');
      }
      continue;
    }
    
    // Line with code and comment
    const commentIndex = findCommentIndex(line);
    if (commentIndex !== -1) {
      const codeBeforeComment = line.substring(0, commentIndex).trimEnd();
      if (codeBeforeComment.length > 0) {
        result.push(codeBeforeComment);
      } else if (keepEmptyLines) {
        result.push('');
      }
      continue;
    }
    
    // Regular line of code
    result.push(line);
  }
  
  return result.join('\n');
}

/**
 * Checks if the current position is in a docstring context
 */
function isDocstringContext(lines: string[], index: number): boolean {
  if (index === 0) return false;
  
  // Check previous lines
  for (let i = index - 1; i >= 0; i--) {
    const prevLine = lines[i].trim();
    
    if (prevLine.length === 0) {
      // Empty line, continue
      continue;
    }
    
    // Check for def, class or : at the end (function/class/method)
    if (prevLine.startsWith('def ') || 
        prevLine.startsWith('class ') ||
        prevLine.startsWith('async def ') ||
        prevLine.endsWith(':')) {
      return true;
    }
    
    // If there's other code, it's not a docstring
    return false;
  }
  
  return false;
}

/**
 * Finds the index of a # comment in a line (ignores # in strings)
 */
function findCommentIndex(line: string): number {
  let inString = false;
  let stringChar = '';
  let escapeNext = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' || char === "'") {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }
    
    if (char === '#' && !inString) {
      return i;
    }
  }
  
  return -1;
}