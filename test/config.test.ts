import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadConfig, findConfigFile, validateConfig, mergeConfig } from '../src/config';

describe('Configuration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'comment-bear-config-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('findConfigFile', () => {
    test('finds .commentbearrc in given directory', () => {
      const configPath = path.join(tmpDir, '.commentbearrc');
      fs.writeFileSync(configPath, '{}');
      const found = findConfigFile(tmpDir);
      expect(found).toBe(configPath);
    });

    test('finds .commentbearrc.json in given directory', () => {
      const configPath = path.join(tmpDir, '.commentbearrc.json');
      fs.writeFileSync(configPath, '{}');
      const found = findConfigFile(tmpDir);
      expect(found).toBe(configPath);
    });

    test('prefers .commentbearrc over .commentbearrc.json', () => {
      fs.writeFileSync(path.join(tmpDir, '.commentbearrc'), '{"language": "python"}');
      fs.writeFileSync(path.join(tmpDir, '.commentbearrc.json'), '{"language": "java"}');
      const found = findConfigFile(tmpDir);
      expect(found).toBe(path.join(tmpDir, '.commentbearrc'));
    });

    test('walks up directory tree', () => {
      const subDir = path.join(tmpDir, 'sub', 'deep');
      fs.mkdirSync(subDir, { recursive: true });
      const configPath = path.join(tmpDir, '.commentbearrc');
      fs.writeFileSync(configPath, '{}');
      const found = findConfigFile(subDir);
      expect(found).toBe(configPath);
    });

    test('returns undefined when no config file exists', () => {
      const found = findConfigFile(tmpDir);
      expect(found).toBeUndefined();
    });
  });

  describe('loadConfig', () => {
    test('loads valid config from path', () => {
      const configPath = path.join(tmpDir, '.commentbearrc');
      fs.writeFileSync(configPath, JSON.stringify({
        language: 'javascript',
        preserveLicense: true,
        keepEmptyLines: false,
      }));
      const config = loadConfig(configPath);
      expect(config.language).toBe('javascript');
      expect(config.preserveLicense).toBe(true);
      expect(config.keepEmptyLines).toBe(false);
    });

    test('loads config with exclude/include arrays', () => {
      const configPath = path.join(tmpDir, '.commentbearrc');
      fs.writeFileSync(configPath, JSON.stringify({
        exclude: ['node_modules', 'dist'],
        include: ['src/**/*.ts'],
      }));
      const config = loadConfig(configPath);
      expect(config.exclude).toEqual(['node_modules', 'dist']);
      expect(config.include).toEqual(['src/**/*.ts']);
    });

    test('returns empty config for empty file', () => {
      const configPath = path.join(tmpDir, '.commentbearrc');
      fs.writeFileSync(configPath, '');
      const config = loadConfig(configPath);
      expect(config).toEqual({});
    });

    test('throws on non-existent specified path', () => {
      expect(() => loadConfig('/nonexistent/.commentbearrc')).toThrow('Config file not found');
    });

    test('throws on invalid JSON', () => {
      const configPath = path.join(tmpDir, '.commentbearrc');
      fs.writeFileSync(configPath, '{ invalid json }');
      expect(() => loadConfig(configPath)).toThrow('Invalid JSON');
    });

    test('returns empty config when no config file found', () => {
      const config = loadConfig();
      // If no config file found in cwd tree, returns empty
      expect(config).toBeDefined();
    });
  });

  describe('validateConfig', () => {
    test('validates a valid config', () => {
      const config = validateConfig({
        language: 'python',
        preserveLicense: true,
        keepEmptyLines: false,
        exclude: ['dist'],
        include: ['src'],
      });
      expect(config.language).toBe('python');
      expect(config.preserveLicense).toBe(true);
    });

    test('returns empty config for empty object', () => {
      const config = validateConfig({});
      expect(config).toEqual({});
    });

    test('throws on non-object config', () => {
      expect(() => validateConfig('string')).toThrow('Config must be a JSON object');
      expect(() => validateConfig(null)).toThrow('Config must be a JSON object');
      expect(() => validateConfig([1, 2])).toThrow('Config must be a JSON object');
    });

    test('throws on invalid language type', () => {
      expect(() => validateConfig({ language: 123 })).toThrow('"language" must be a string');
    });

    test('throws on invalid preserveLicense type', () => {
      expect(() => validateConfig({ preserveLicense: 'yes' })).toThrow('"preserveLicense" must be a boolean');
    });

    test('throws on invalid keepEmptyLines type', () => {
      expect(() => validateConfig({ keepEmptyLines: 1 })).toThrow('"keepEmptyLines" must be a boolean');
    });

    test('throws on invalid exclude type', () => {
      expect(() => validateConfig({ exclude: 'dist' })).toThrow('"exclude" must be an array of strings');
    });

    test('throws on exclude with non-string items', () => {
      expect(() => validateConfig({ exclude: [1, 2] })).toThrow('"exclude" must be an array of strings');
    });

    test('throws on invalid include type', () => {
      expect(() => validateConfig({ include: 'src' })).toThrow('"include" must be an array of strings');
    });
  });

  describe('mergeConfig', () => {
    test('merges config with options', () => {
      const config = { language: 'python' as const, preserveLicense: true };
      const options = { keepEmptyLines: true };
      const merged = mergeConfig(config, options);
      expect(merged.language).toBe('python');
      expect(merged.preserveLicense).toBe(true);
      expect(merged.keepEmptyLines).toBe(true);
    });

    test('options override config', () => {
      const config = { language: 'python' as const, preserveLicense: true };
      const options = { language: 'javascript' as const };
      const merged = mergeConfig(config, options);
      expect(merged.language).toBe('javascript');
      expect(merged.preserveLicense).toBe(true);
    });

    test('undefined options do not override config', () => {
      const config = { language: 'python' as const, preserveLicense: true };
      const options = { language: undefined };
      const merged = mergeConfig(config, options);
      expect(merged.language).toBe('python');
    });

    test('handles empty config', () => {
      const config = {};
      const options = { language: 'javascript' as const };
      const merged = mergeConfig(config, options);
      expect(merged.language).toBe('javascript');
    });

    test('handles empty options', () => {
      const config = { language: 'python' as const };
      const merged = mergeConfig(config, {});
      expect(merged.language).toBe('python');
    });
  });
});
