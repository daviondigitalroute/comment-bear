/**
 * Supported programming languages
 */
export type Lang =
  | "javascript"
  | "typescript"
  | "python"
  | "ruby"
  | "java"
  | "csharp"
  | "c"
  | "cpp"
  | "html"
  | "css"
  | "sql"
  | "yaml"
  | "json"
  | "xml"
  | "php"
  | "go"
  | "rust"
  | "swift"
  | "kotlin"
  | "scala"
  | "haskell";

/**
 * Comment removal options
 */
export interface RemoveOptions {
  /**
   * The code language (if not specified, automatic detection will be attempted)
   */
  language?: Lang;
  
  /**
   * Filename for automatic language detection
   */
  filename?: string;
  
  /**
   * Preserve license comments (starting with /*! or //**)
   */
  preserveLicense?: boolean;
  
  /**
   * Dry run mode - doesn't modify the code, only returns what would be removed
   */
  dryRun?: boolean;
  
  /**
   * Preserve empty lines where comments were
   */
  keepEmptyLines?: boolean;
}

/**
 * Result of comment removal
 */
export interface RemoveResult {
  /**
   * The processed code
   */
  code: string;
  
  /**
   * Number of comments removed
   */
  removedCount: number;
  
  /**
   * The detected language
   */
  detectedLanguage?: Lang;
}
