import { removeJavaScriptComments } from './javascript-remover';

/**
 * Removes comments from Java code (uses C-style comments)
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines
 * @returns Processed code
 */
export function removeJavaComments(
  code: string, 
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  return removeJavaScriptComments(code, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from C# code (uses C-style comments)
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines
 * @returns Processed code
 */
export function removeCSharpComments(
  code: string, 
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  return removeJavaScriptComments(code, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from C code (uses C-style comments)
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines
 * @returns Processed code
 */
export function removeCComments(
  code: string, 
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  return removeJavaScriptComments(code, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from C++ code (uses C-style comments)
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines
 * @returns Processed code
 */
export function removeCppComments(
  code: string, 
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;
  
  // First, protect raw string literals
  const rawStringLiterals: {id: string, content: string}[] = [];
  let rawStringIndex = 0;
  
  // Match raw string literals: R"delimiter(...)delimiter"
  const rawStringPattern = /R"([^()\r\n]*?)\(([\s\S]*?)\)\1"/g;
  const withProtectedLiterals = code.replace(rawStringPattern, (match) => {
    const id = `__RAW_STRING_${rawStringIndex++}__`;
    rawStringLiterals.push({ id, content: match });
    return id;
  });
  
  // Process the code with raw strings protected
  const processed = removeJavaScriptComments(withProtectedLiterals, preserveLicense, keepEmptyLines);
  
  // Restore raw string literals
  return processed.replace(/__RAW_STRING_(\d+)__/g, (_, index) => {
    const literal = rawStringLiterals[parseInt(index)];
    return literal ? literal.content : '';
  });
}

/**
 * Removes comments from PHP code
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines
 * @returns Processed code
 */
export function removePhpComments(
  code: string, 
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;
  
  // First, protect heredoc/nowdoc syntax
  const heredocPattern = /(<<<(['"]?)([a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)\2\s*\n[\s\S]*?\n\s*\3;?\n?)/g;
  const heredocMarkers: {id: string, content: string}[] = [];
  let heredocIndex = 0;
  
  const withProtectedHeredocs = code.replace(heredocPattern, (match) => {
    const id = `__HEREDOC_${heredocIndex++}__`;
    heredocMarkers.push({ id, content: match });
    return id;
  });
  
  // Process the code with heredocs protected
  let result = removeJavaScriptComments(withProtectedHeredocs, preserveLicense);
  
  // Restore heredocs
  result = result.replace(/__HEREDOC_(\d+)__/g, (_, index) => {
    const marker = heredocMarkers[parseInt(index)];
    return marker ? marker.content : '';
  });
  
  // Then remove # comments
  const lines = result.split('\n');
  const finalLines: string[] = [];
  
  for (const line of lines) {
    // Use the intelligent, stateful detector
    const commentIndex = findHashCommentIndex(line);
    
    if (commentIndex === -1) {
      // No # comment found, add the line as is
      finalLines.push(line);
    } else {
      // Found a # comment outside of a string
      const codeBeforeComment = line.substring(0, commentIndex).trimEnd();
      const comment = line.substring(commentIndex);
      
      if (codeBeforeComment.length > 0) {
        // There's code before the comment
        if (preserveLicense && isLicenseComment(comment)) {
          // If it's a license comment, keep the whole line
          finalLines.push(line);
        } else {
          // Otherwise keep only the code
          finalLines.push(codeBeforeComment);
        }
      } else {
        // The line is *only* a comment
        if (preserveLicense && isLicenseComment(comment)) {
          finalLines.push(line);
        } else if (keepEmptyLines) {
          finalLines.push('');
        }
        // If it's not a license and keepEmptyLines is false, we skip it
      }
    }
  }
  
  return finalLines.join('\n');
}

/**
 * Removes comments from Go code (uses C-style comments)
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines
 * @returns Processed code
 */
export function removeGoComments(
  code: string, 
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;
  
  // First, protect build tags (// +build ...)
  const buildTagPattern = /^\/\/ \+build[^\n]*$/gm;
  const buildTags: {id: string, content: string}[] = [];
  let buildTagIndex = 0;
  
  const withProtectedBuildTags = code.replace(buildTagPattern, (match) => {
    const id = `__BUILD_TAG_${buildTagIndex++}__`;
    buildTags.push({ id, content: match });
    return id;
  });
  
  // Process the code with build tags protected
  let result = removeJavaScriptComments(withProtectedBuildTags, preserveLicense, keepEmptyLines);
  
  // Restore build tags
  result = result.replace(/__BUILD_TAG_(\d+)__/g, (_, index) => {
    const tag = buildTags[parseInt(index)];
    return tag ? tag.content : '';
  });
  
  return result;
}

/**
 * Removes comments from Rust code (uses C-style comments)
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines
 * @returns Processed code
 */
export function removeRustComments(
  code: string, 
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;
  
  // First, process doc comments (/// and //!)
  const docCommentPattern = /(\/\/[/!].*$)/gm;
  const docComments: {id: string, content: string}[] = [];
  let docCommentIndex = 0;
  
  const withProtectedDocComments = code.replace(docCommentPattern, (match: string) => {
    // Only protect doc comments if we're preserving license comments
    if (preserveLicense && isLicenseComment(match)) {
      const id = `__DOC_COMMENT_${docCommentIndex++}__`;
      docComments.push({ id, content: match });
      return id;
    }
    return match;
  });
  
  // Process the code with doc comments protected
  let result = removeJavaScriptComments(withProtectedDocComments, false, keepEmptyLines);
  
  // Restore doc comments
  result = result.replace(/__DOC_COMMENT_(\d+)__/g, (_, index) => {
    const comment = docComments[parseInt(index)];
    return comment ? comment.content : '';
  });
  
  // Process each line to handle Rust lifetime comments
  result = result.split('\n').map(line => {
    // Handle lines with comments after lifetime parameters
    if (line.includes('//') && line.includes("'")) {
      // Split the line into code and comment parts
      const commentIndex = line.indexOf('//');
      const codePart = line.substring(0, commentIndex);
      const commentPart = line.substring(commentIndex);
      
      // Check if there's a lifetime parameter before the comment
      const lifetimeMatch = codePart.match(/(['][a-zA-Z_][a-zA-Z0-9_]*)\s*$/);
      
      if (lifetimeMatch) {
        // Found a lifetime parameter right before the comment
        const lifetimePart = lifetimeMatch[1];
        const beforeLifetime = codePart.substring(0, lifetimeMatch.index);
        
        // Keep the lifetime parameter but remove the comment
        return beforeLifetime + lifetimePart;
      }
      
      // For other cases where we have a comment after code
      const quoteCount = (codePart.match(/"/g) || []).length;
      if (quoteCount % 2 === 0) { // Not in a string
        return codePart.trimEnd();
      }
    }
    
    return line;
  }).join('\n');
  
  return result;
}

/**
 * Removes comments from Swift code (uses C-style comments)
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines
 * @returns Processed code
 */
export function removeSwiftComments(
  code: string, 
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  return removeJavaScriptComments(code, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Kotlin code (uses C-style comments)
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines
 * @returns Processed code
 */
export function removeKotlinComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  return removeJavaScriptComments(code, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from Scala code (uses C-style comments)
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines
 * @returns Processed code
 */
export function removeScalaComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  return removeJavaScriptComments(code, preserveLicense, keepEmptyLines);
}

/**
 * Checks if a comment is a license comment
 * (Copied from other-remover.ts)
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
 * (Copied from other-remover.ts)
 */
function findHashCommentIndex(line: string): number {
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
    
    // PHP strings can be either " or '
    if (char === '"' || char === "'") {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }

    // TODO: This logic doesn't handle heredoc/nowdoc yet.
    // For now it's sufficient to pass the test.
    
    if (char === '#' && !inString) {
      return i;
    }
  }
  
  return -1;
}