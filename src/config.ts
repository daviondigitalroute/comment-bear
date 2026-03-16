import * as fs from 'fs';
import * as path from 'path';
import { Lang } from './types';

export interface CommentBearConfig {
  language?: Lang;
  preserveLicense?: boolean;
  keepEmptyLines?: boolean;
  exclude?: string[];
  include?: string[];
}

const CONFIG_FILENAMES = [
  '.commentbearrc',
  '.commentbearrc.json',
];

/**
 * Searches for a config file starting from the given directory and walking up
 * @param startDir - Directory to start searching from
 * @returns Path to config file or undefined
 */
export function findConfigFile(startDir?: string): string | undefined {
  let dir = startDir || process.cwd();

  // Walk up directory tree
  const root = path.parse(dir).root;
  while (true) {
    for (const filename of CONFIG_FILENAMES) {
      const configPath = path.join(dir, filename);
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir || dir === root) {
      break;
    }
    dir = parent;
  }

  return undefined;
}

/**
 * Loads and parses a config file
 * @param configPath - Path to config file, or undefined to auto-detect
 * @returns Parsed config object
 */
export function loadConfig(configPath?: string): CommentBearConfig {
  const resolvedPath = configPath || findConfigFile();

  if (!resolvedPath) {
    return {};
  }

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Config file not found: ${resolvedPath}`);
  }

  const content = fs.readFileSync(resolvedPath, 'utf-8').trim();

  if (!content) {
    return {};
  }

  try {
    const config = JSON.parse(content);
    return validateConfig(config);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in config file ${resolvedPath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validates a config object
 * @param config - Raw config object
 * @returns Validated config
 */
export function validateConfig(config: any): CommentBearConfig {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    throw new Error('Config must be a JSON object');
  }

  const result: CommentBearConfig = {};

  if (config.language !== undefined) {
    if (typeof config.language !== 'string') {
      throw new Error('Config "language" must be a string');
    }
    result.language = config.language as Lang;
  }

  if (config.preserveLicense !== undefined) {
    if (typeof config.preserveLicense !== 'boolean') {
      throw new Error('Config "preserveLicense" must be a boolean');
    }
    result.preserveLicense = config.preserveLicense;
  }

  if (config.keepEmptyLines !== undefined) {
    if (typeof config.keepEmptyLines !== 'boolean') {
      throw new Error('Config "keepEmptyLines" must be a boolean');
    }
    result.keepEmptyLines = config.keepEmptyLines;
  }

  if (config.exclude !== undefined) {
    if (!Array.isArray(config.exclude) || !config.exclude.every((e: any) => typeof e === 'string')) {
      throw new Error('Config "exclude" must be an array of strings');
    }
    result.exclude = config.exclude;
  }

  if (config.include !== undefined) {
    if (!Array.isArray(config.include) || !config.include.every((e: any) => typeof e === 'string')) {
      throw new Error('Config "include" must be an array of strings');
    }
    result.include = config.include;
  }

  return result;
}

/**
 * Merges config with programmatic options (programmatic takes precedence)
 * @param config - Config from file
 * @param options - Programmatic options
 * @returns Merged options
 */
export function mergeConfig(config: CommentBearConfig, options: Partial<CommentBearConfig>): CommentBearConfig {
  return {
    ...config,
    ...Object.fromEntries(
      Object.entries(options).filter(([_, v]) => v !== undefined)
    ),
  };
}
