import { isLicenseComment } from './_shared';

/**
 * Removes comments from SQL code
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeSqlComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;
  
  const lines = code.split('\n');
  const result: string[] = [];
  let inMultilineComment = false;
  
  let licenseCommentBuffer: string[] = [];
  let isPreservingLicense = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let processedLine = '';
    let inString = false;
    let stringChar = '';
    
    // If we're in the middle of preserving a license comment, add the line and continue
    if (isPreservingLicense) {
      licenseCommentBuffer.push(line);
      // Check if this line ends the multiline comment
      if (line.includes('*/')) {
        isPreservingLicense = false;
        result.push(licenseCommentBuffer.join('\n'));
        licenseCommentBuffer = [];
      }
      continue;
    }
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = j < line.length - 1 ? line[j + 1] : '';
      
      // Check for multiline comments /* ... */
      if (!inString && !inMultilineComment && char === '/' && nextChar === '*') {
        inMultilineComment = true;
        const restOfLine = line.substring(j);
        if (preserveLicense && isLicenseComment(restOfLine)) {
          isPreservingLicense = true;
          licenseCommentBuffer.push(restOfLine);
          // If the comment ends on the same line, process it immediately
          if (restOfLine.includes('*/')) {
            isPreservingLicense = false;
            result.push(licenseCommentBuffer.join('\n'));
            licenseCommentBuffer = [];
          }
          break;
        }
        j++; // Skip next char
        continue;
      }
      
      if (inMultilineComment) {
        if (char === '*' && nextChar === '/') {
          inMultilineComment = false;
          j++; // Skip next char
        }
        continue;
      }
      
      // Check for string literals
      if (char === "'" || char === '"') {
        if (!inString) {
          inString = true;
          stringChar = char;
          processedLine += char;
        } else if (char === stringChar) {
          // Check for escaped quote
          if (j > 0 && line[j - 1] !== '\\') {
            inString = false;
          }
          processedLine += char;
        } else {
          processedLine += char;
        }
        continue;
      }
      
      // Check for single-line comments --
      if (!inString && char === '-' && nextChar === '-') {
        // The rest of the line is a comment
        const comment = line.substring(j);
        if (preserveLicense && isLicenseComment(comment)) {
          processedLine += comment;
        }
        break;
      }
      
      // Normal character
      if (!inMultilineComment) {
        processedLine += char;
      }
    }
    
    // Add the line if it has content or if we're in a multiline comment
    const trimmed = processedLine.trim();
    if (trimmed.length > 0 || inMultilineComment) {
      // Only add if we're not in the middle of preserving a license comment
      if (!isPreservingLicense) {
        result.push(processedLine);
      }
    } else if (keepEmptyLines && !isPreservingLicense) {
      // The line was comment-only (or already blank); keep it as a blank line.
      result.push('');
    }
  }
  
  // If we were in the middle of preserving a license comment but didn't close it,
  // add whatever we have in the buffer
  if (licenseCommentBuffer.length > 0) {
    result.push(licenseCommentBuffer.join('\n'));
  }
  
  return result.join('\n');
}

