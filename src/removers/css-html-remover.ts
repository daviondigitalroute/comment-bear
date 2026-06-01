/**
 * Replacement used when a comment is dropped.
 *
 * @param match - The full comment text being removed
 * @param keepEmptyLines - When true, preserve the comment's newline count so
 *   the lines it occupied become blank instead of disappearing
 * @returns The text to substitute for the removed comment
 */
function droppedReplacement(match: string, keepEmptyLines: boolean): string {
  if (!keepEmptyLines) {
    return '';
  }
  const newlines = (match.match(/\n/g) || []).length;
  return '\n'.repeat(newlines);
}

/**
 * Removes comments from CSS code
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeCssComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;

  // Protect string literals ("..." and '...') so comment tokens inside them
  // (e.g. content: "a/*b*/c") are never treated as comments.
  const protectedStrings: { id: string; content: string }[] = [];
  let stringIndex = 0;
  const stringPattern = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g;
  const withProtectedStrings = code.replace(stringPattern, (match) => {
    const id = `__CSS_STRING_${stringIndex++}__`;
    protectedStrings.push({ id, content: match });
    return id;
  });

  // CSS comments are /* ... */
  const commentRegex = /\/\*[\s\S]*?\*\//g;

  let result: string;
  if (!preserveLicense) {
    result = withProtectedStrings.replace(commentRegex, (match) =>
      droppedReplacement(match, keepEmptyLines)
    );
  } else {
    // Keep only license comments
    result = withProtectedStrings.replace(commentRegex, (match) => {
      const lower = match.toLowerCase();
      if (lower.includes('copyright') ||
          lower.includes('license') ||
          lower.includes('licence') ||
          lower.includes('author') ||
          match.startsWith('/*!')) {
        return match;
      }
      return droppedReplacement(match, keepEmptyLines);
    });
  }

  // Restore protected strings.
  return result.replace(/__CSS_STRING_(\d+)__/g, (_, index) => {
    const s = protectedStrings[parseInt(index)];
    return s ? s.content : '';
  });
}

/**
 * Removes comments from HTML code
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeHtmlComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;

  // HTML comments are <!-- ... -->
  const commentRegex = /<!--[\s\S]*?-->/g;

  if (!preserveLicense) {
    return code.replace(commentRegex, (match) =>
      droppedReplacement(match, keepEmptyLines)
    );
  }

  // Keep only license comments
  return code.replace(commentRegex, (match) => {
    const lower = match.toLowerCase();
    if (lower.includes('copyright') ||
        lower.includes('license') ||
        lower.includes('licence') ||
        lower.includes('author')) {
      return match;
    }
    return droppedReplacement(match, keepEmptyLines);
  });
}

/**
 * Removes comments from XML code
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeXmlComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;

  // Process CDATA sections first to protect their contents
  const cdataSections: {id: string, content: string}[] = [];
  let cdataIndex = 0;

  // Replace CDATA sections with placeholders
  const withCdataPlaceholders = code.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (match) => {
    const id = `__CDATA_${cdataIndex++}__`;
    cdataSections.push({ id, content: match });
    return id;
  });

  // Process comments in the code with CDATA sections replaced by placeholders
  const commentRegex = /<!--[\s\S]*?-->/g;
  let processedCode: string;

  if (!preserveLicense) {
    processedCode = withCdataPlaceholders.replace(commentRegex, (match) =>
      droppedReplacement(match, keepEmptyLines)
    );
  } else {
    // Keep only license comments
    processedCode = withCdataPlaceholders.replace(commentRegex, (match) => {
      const lower = match.toLowerCase();
      if (lower.includes('copyright') ||
          lower.includes('license') ||
          lower.includes('licence') ||
          lower.includes('author')) {
        return match;
      }
      return droppedReplacement(match, keepEmptyLines);
    });
  }

  // Restore CDATA sections
  return processedCode.replace(/__CDATA_(\d+)__/g, (_, index) => {
    const cdata = cdataSections[parseInt(index)];
    return cdata ? cdata.content : '';
  });
}
