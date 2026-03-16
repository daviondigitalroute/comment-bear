/**
 * Removes comments from JSON code (JSON5 style)
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments (not supported for JSON)
 * @returns Processed code
 */
export function removeJsonComments(code: string, preserveLicense: boolean = false): string {
  if (!code) return code;
  
  try {
    // Simplified implementation for removing // and /* */ comments from JSON
    let result = '';
    let inString = false;
    let inSingleLineComment = false;
    let inMultiLineComment = false;
    let stringChar = '';
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const nextChar = i < code.length - 1 ? code[i + 1] : '';
      
      // If we're in a string, just add the character
      if (inString) {
        result += char;
        if (char === stringChar && code[i - 1] !== '\\') {
          inString = false;
        }
        continue;
      }
      
      // Check for string start
      if (char === '"' || char === "'") {
        inString = true;
        stringChar = char;
        result += char;
        continue;
      }
      
      // If we're in a single-line comment
      if (inSingleLineComment) {
        if (char === '\n') {
          inSingleLineComment = false;
          result += char;  // Preserve newline
        }
        continue;
      }
      
      // If we're in a multi-line comment
      if (inMultiLineComment) {
        if (char === '*' && nextChar === '/') {
          inMultiLineComment = false;
          i++;  // Skip '/'
        }
        continue;
      }
      
      // Check for start of single-line comment
      if (char === '/' && nextChar === '/') {
        inSingleLineComment = true;
        i++;  // Skip second '/'
        continue;
      }
      
      // Check for start of multi-line comment
      if (char === '/' && nextChar === '*') {
        inMultiLineComment = true;
        i++;  // Skip '*'
        continue;
      }
      
      // Normal character
      result += char;
    }
    
    return result;
  } catch (error) {
    console.error('Error removing JSON comments:', error);
    return code;
  }
}

/**
 * Removes comments from YAML code
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines
 * @returns Processed code
 */
export function removeYamlComments(
  code: string, 
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;
  
  const lines = code.split('\n');
  const result: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Empty line or just a comment
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
    } else {
      result.push(line);
    }
  }
  
  return result.join('\n');
}

/**
 * Removes comments from Ruby code
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines
 * @returns Processed code
 */
export function removeRubyComments(
  code: string, 
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;
  
  // First, protect percent literals (e.g., %q{}, %w[], %r{}, etc.)
  // This pattern matches % followed by an optional modifier (q,Q,r,R,w,W,x),
  // a delimiter (any non-word, non-whitespace character),
  // and everything up to the matching closing delimiter
  // It properly handles nested delimiters and escaped characters
  const percentLiteralPattern = /(^|\s)(%[qQrRwWx]?([^\w\s]))(?:[^\\]|\\.)*?\3/g;
  const percentLiterals: {id: string, content: string}[] = [];
  let percentLiteralIndex = 0;
  
  // First pass: protect percent literals
  let withProtectedLiterals = code;
  let match;
  
  // We need to use a while loop to handle all matches correctly
  const regex = new RegExp(percentLiteralPattern);
  let lastIndex = 0;
  while ((match = regex.exec(code)) !== null) {
    // Prevent infinite loops for zero-length matches
    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
    
    const [fullMatch, prefix, , delimiter] = match;
    const startPos = match.index + prefix.length;
    const endPos = code.indexOf(delimiter, startPos + 1);
    
    if (endPos !== -1) {
      const literalContent = code.substring(match.index, endPos + 1);
      const id = `__PERCENT_LITERAL_${percentLiteralIndex++}__`;
      percentLiterals.push({ id, content: literalContent });
      withProtectedLiterals = withProtectedLiterals.replace(literalContent, id);
    }
  }
  
  // Process the code with percent literals protected
  let result = '';
  const lines = withProtectedLiterals.split('\n');
  let inMultilineComment = false;
  let multilineBuffer: string[] = [];
  let isLicenseBlock = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip processing if this line is part of a protected literal
    if (line.includes('__PERCENT_LITERAL_')) {
      result += line + '\n';
      continue;
    }
    
    // Multiline comments =begin ... =end
    if (trimmed.startsWith('=begin')) {
      inMultilineComment = true;
      multilineBuffer = [line];
      isLicenseBlock = preserveLicense && isLicenseComment(line);
      if (!isLicenseBlock && keepEmptyLines) {
        result += '\n';
      }
      continue;
    }
    
    if (inMultilineComment) {
      multilineBuffer.push(line);
      
      if (trimmed.startsWith('=end')) {
        inMultilineComment = false;
        
        if (preserveLicense) {
          const blockContent = multilineBuffer.join('\n');
          if (isLicenseBlock || isLicenseComment(blockContent)) {
            result += multilineBuffer.join('\n') + '\n';
          } else if (keepEmptyLines) {
            result += '\n'.repeat(multilineBuffer.length);
          }
        } else if (keepEmptyLines) {
          result += '\n'.repeat(multilineBuffer.length);
        }
        
        multilineBuffer = [];
        isLicenseBlock = false;
      }
      continue;
    }
    
    // Handle single line comments with #, but not in strings or regex
    const commentIndex = findCommentIndex(line);
    if (commentIndex !== -1) {
      const codeBeforeComment = line.substring(0, commentIndex).trimEnd();
      const comment = line.substring(commentIndex);
      
      if (codeBeforeComment.length > 0) {
        // There's code before the comment
        if (preserveLicense && isLicenseComment(comment)) {
          result += line + '\n';
        } else {
          result += codeBeforeComment + '\n';
        }
      } else {
        // The line is *only* a comment
        if (preserveLicense && isLicenseComment(comment)) {
          result += line + '\n';
        } else if (keepEmptyLines) {
          result += '\n';
        }
      }
      continue;
    }
    
    // No comment on this line
    result += line + '\n';
  }
  
  // Restore percent literals
  result = result.replace(/__PERCENT_LITERAL_(\d+)__/g, (_, index) => {
    const literal = percentLiterals[parseInt(index)];
    return literal ? literal.content : '';
  });
  
  return result.trimEnd();
}

/**
 * Removes comments from Haskell code
 * Handles -- line comments and {- -} block comments (including nested)
 * Preserves {-# #-} pragmas
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines
 * @returns Processed code
 */
export function removeHaskellComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;

  let result = '';
  let i = 0;
  const len = code.length;

  while (i < len) {
    const char = code[i];
    const next = i + 1 < len ? code[i + 1] : '';

    // String literal (double quotes)
    if (char === '"') {
      let j = i + 1;
      result += char;
      while (j < len && code[j] !== '"') {
        if (code[j] === '\\' && j + 1 < len) {
          result += code[j] + code[j + 1];
          j += 2;
        } else {
          result += code[j];
          j++;
        }
      }
      if (j < len) {
        result += code[j]; // closing quote
        j++;
      }
      i = j;
      continue;
    }

    // Character literal (single quotes) - e.g. 'a', '\n'
    if (char === "'" && i + 2 < len) {
      // Check for character literal pattern: 'x' or '\x'
      if (code[i + 1] === '\\' && i + 3 < len && code[i + 3] === "'") {
        result += code.substring(i, i + 4);
        i += 4;
        continue;
      }
      if (code[i + 2] === "'") {
        result += code.substring(i, i + 3);
        i += 3;
        continue;
      }
    }

    // Pragma: {-# ... #-} - always preserve
    if (char === '{' && next === '-' && i + 2 < len && code[i + 2] === '#') {
      const pragmaEnd = code.indexOf('#-}', i + 3);
      if (pragmaEnd !== -1) {
        result += code.substring(i, pragmaEnd + 3);
        i = pragmaEnd + 3;
        continue;
      }
    }

    // Block comment: {- ... -} (may be nested)
    if (char === '{' && next === '-') {
      let depth = 1;
      let j = i + 2;
      let commentContent = '{-';
      while (j < len && depth > 0) {
        if (code[j] === '{' && j + 1 < len && code[j + 1] === '-') {
          depth++;
          commentContent += '{-';
          j += 2;
        } else if (code[j] === '-' && j + 1 < len && code[j + 1] === '}') {
          depth--;
          commentContent += '-}';
          j += 2;
        } else {
          commentContent += code[j];
          j++;
        }
      }

      if (preserveLicense && isLicenseComment(commentContent)) {
        result += commentContent;
      } else if (keepEmptyLines) {
        // Count newlines in the comment and preserve them
        const newlines = (commentContent.match(/\n/g) || []).length;
        result += '\n'.repeat(newlines);
      }
      i = j;
      continue;
    }

    // Line comment: --
    if (char === '-' && next === '-') {
      // Make sure it's not inside an operator (e.g., -->)
      // A valid line comment starts with -- followed by non-operator char or end of line
      const afterDashes = i + 2 < len ? code[i + 2] : '\n';
      if (afterDashes === ' ' || afterDashes === '\n' || afterDashes === '\r' || afterDashes === '\t' || i + 2 >= len ||
          !/[!#$%&*+./<=>?@\\^|~:]/.test(afterDashes)) {
        // It's a line comment - find end of line
        let j = i + 2;
        let commentText = '--';
        while (j < len && code[j] !== '\n') {
          commentText += code[j];
          j++;
        }

        if (preserveLicense && isLicenseComment(commentText)) {
          result += commentText;
        }
        // Skip to newline (but don't consume it yet)
        i = j;
        continue;
      }
    }

    result += char;
    i++;
  }

  // Clean up empty lines if not keeping them
  if (!keepEmptyLines) {
    const lines = result.split('\n');
    const cleaned: string[] = [];
    for (const line of lines) {
      if (line.trim().length > 0) {
        cleaned.push(line);
      }
    }
    result = cleaned.join('\n');
  }

  return result;
}

/**
 * Checks if a comment is a license comment
 */
function isLicenseComment(comment: string): boolean {
  const lower = comment.toLowerCase();
  return lower.includes('copyright') ||
         lower.includes('license') ||
         lower.includes('licence') ||
         lower.includes('author');
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
    
    if (char === '"' || char === "'" || char === '`') {
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
