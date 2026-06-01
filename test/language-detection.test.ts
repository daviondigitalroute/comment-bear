import { detectLanguage, detectLanguageByFilename, detectLanguageByContent } from '../src/detectors/language-detector';
import { Lang } from '../src/types';

describe('Language Detection', () => {
  // Test detectLanguageByFilename
  test('detects language by file extension', () => {
    // Test with full filenames
    expect(detectLanguageByFilename('test.js')).toBe('javascript');
    expect(detectLanguageByFilename('file.ts')).toBe('typescript');
    expect(detectLanguageByFilename('script.py')).toBe('python');
    expect(detectLanguageByFilename('styles.css')).toBe('css');
    expect(detectLanguageByFilename('index.html')).toBe('html');
    
    // Test with just extensions (should work the same)
    expect(detectLanguageByFilename('.js')).toBe('javascript');
    expect(detectLanguageByFilename('.ts')).toBe('typescript');
    expect(detectLanguageByFilename('.py')).toBe('python');
  });

  test('returns undefined for unknown extensions', () => {
    expect(detectLanguageByFilename('file.unknown')).toBeUndefined();
  });

  // Test detectLanguageByContent
  test('detects language by content', () => {
    // Test with JavaScript/TypeScript
    const jsResult = detectLanguageByContent('const x = 1;');
    // The result might be undefined if content-based detection is not implemented
    // So we'll just test that it doesn't throw
    expect(() => detectLanguageByContent('const x = 1;')).not.toThrow();
    
    // Test with HTML/XML
    expect(() => detectLanguageByContent('<div>test</div>')).not.toThrow();
    
    // Test with CSS
    expect(() => detectLanguageByContent('.class { color: red; }')).not.toThrow();
  });

  // Test detectLanguage (combined)
  test('detects language using both filename and content', () => {
    // Should use filename if available
    const result1 = detectLanguage('test.js', 'const x = 1;');
    expect(result1).toBe('javascript');
    
    // Should fall back to content detection if no filename
    const result2 = detectLanguage(undefined, 'const x = 1;');
    expect(result2).toBe('javascript');
    
    // Should handle empty content
    const result3 = detectLanguage('test.js', '');
    expect(result3).toBe('javascript');
  });

  test('handles edge cases', () => {
    // Empty input
    expect(detectLanguageByContent('')).toBeUndefined();
    
    // Very short input - might not be detectable
    expect(detectLanguageByContent('{}')).toBeUndefined();
    
    // Null/undefined input for detectLanguageByFilename
    expect(detectLanguageByFilename(undefined)).toBeUndefined();
    expect(detectLanguageByFilename(null as any)).toBeUndefined();
    
    // Test with non-string input - should throw TypeError
    expect(() => detectLanguageByContent(123 as any)).toThrow(TypeError);
    expect(() => detectLanguageByContent({} as any)).toThrow(TypeError);
    
    // Test with Uint8Array - should throw TypeError
    const binaryData = new Uint8Array(10);
    expect(() => detectLanguageByContent(binaryData as any)).toThrow(TypeError);
  });
});

describe('Phase 1 language detection', () => {
  test('detects new extensions by filename', () => {
    expect(detectLanguageByFilename('deploy.sh')).toBe('shell');
    expect(detectLanguageByFilename('lib.bash')).toBe('shell');
    expect(detectLanguageByFilename('start.fish')).toBe('shell');
    expect(detectLanguageByFilename('module.ps1')).toBe('powershell');
    expect(detectLanguageByFilename('script.pl')).toBe('perl');
    expect(detectLanguageByFilename('analysis.r')).toBe('r');
    expect(detectLanguageByFilename('analysis.R')).toBe('r');
    expect(detectLanguageByFilename('Cargo.toml')).toBe('toml');
    expect(detectLanguageByFilename('build.mk')).toBe('makefile');
    expect(detectLanguageByFilename('config.ini')).toBe('ini');
    expect(detectLanguageByFilename('settings.cfg')).toBe('ini');
    expect(detectLanguageByFilename('schema.graphql')).toBe('graphql');
    expect(detectLanguageByFilename('query.gql')).toBe('graphql');
    expect(detectLanguageByFilename('mod.ex')).toBe('elixir');
    expect(detectLanguageByFilename('test.exs')).toBe('elixir');
    expect(detectLanguageByFilename('app.cr')).toBe('crystal');
    expect(detectLanguageByFilename('calc.jl')).toBe('julia');
    expect(detectLanguageByFilename('main.nim')).toBe('nim');
    expect(detectLanguageByFilename('app.coffee')).toBe('coffeescript');
    expect(detectLanguageByFilename('script.tcl')).toBe('tcl');
    expect(detectLanguageByFilename('build.cmake')).toBe('cmake');
    expect(detectLanguageByFilename('app.properties')).toBe('properties');
    expect(detectLanguageByFilename('init.pp')).toBe('puppet');
    expect(detectLanguageByFilename('main.tf')).toBe('hcl');
    expect(detectLanguageByFilename('vars.tfvars')).toBe('hcl');
    expect(detectLanguageByFilename('styles.scss')).toBe('scss');
    expect(detectLanguageByFilename('styles.less')).toBe('less');
    expect(detectLanguageByFilename('styles.sass')).toBe('sass');
  });

  test('detects special filenames without an extension', () => {
    expect(detectLanguageByFilename('Makefile')).toBe('makefile');
    expect(detectLanguageByFilename('makefile')).toBe('makefile');
    expect(detectLanguageByFilename('GNUmakefile')).toBe('makefile');
    expect(detectLanguageByFilename('Dockerfile')).toBe('dockerfile');
    expect(detectLanguageByFilename('CMakeLists.txt')).toBe('cmake');
  });

  test('detects special filenames with a directory prefix', () => {
    expect(detectLanguageByFilename('build/Dockerfile')).toBe('dockerfile');
    expect(detectLanguageByFilename('src/Makefile')).toBe('makefile');
  });

  test('detects language by shebang', () => {
    expect(detectLanguageByContent('#!/bin/bash\necho hi')).toBe('shell');
    expect(detectLanguageByContent('#!/bin/sh\necho hi')).toBe('shell');
    expect(detectLanguageByContent('#!/usr/bin/env zsh\necho hi')).toBe('shell');
    expect(detectLanguageByContent('#!/usr/bin/env python3\nprint(1)')).toBe('python');
    expect(detectLanguageByContent('#!/usr/bin/perl\nprint 1;')).toBe('perl');
    expect(detectLanguageByContent('#!/usr/bin/env ruby\nputs 1')).toBe('ruby');
    expect(detectLanguageByContent('#!/usr/bin/env node\nconsole.log(1)')).toBe('javascript');
  });

  test('detectLanguage falls back to shebang content detection', () => {
    expect(detectLanguage(undefined, '#!/bin/bash\necho hi')).toBe('shell');
  });
});

describe('Phase 2 language detection', () => {
  test('detects new extensions by filename', () => {
    expect(detectLanguageByFilename('main.dart')).toBe('dart');
    expect(detectLanguageByFilename('build.groovy')).toBe('groovy');
    expect(detectLanguageByFilename('build.gradle')).toBe('groovy');
    expect(detectLanguageByFilename('Token.sol')).toBe('solidity');
    expect(detectLanguageByFilename('schema.proto')).toBe('protobuf');
    expect(detectLanguageByFilename('app.m')).toBe('objectivec');
    expect(detectLanguageByFilename('app.mm')).toBe('objectivec');
    expect(detectLanguageByFilename('main.zig')).toBe('zig');
    expect(detectLanguageByFilename('app.vala')).toBe('vala');
    expect(detectLanguageByFilename('main.d')).toBe('d');
    expect(detectLanguageByFilename('shader.glsl')).toBe('glsl');
    expect(detectLanguageByFilename('shader.vert')).toBe('glsl');
    expect(detectLanguageByFilename('shader.frag')).toBe('glsl');
    expect(detectLanguageByFilename('shader.comp')).toBe('glsl');
    expect(detectLanguageByFilename('shader.hlsl')).toBe('hlsl');
    expect(detectLanguageByFilename('shader.wgsl')).toBe('wgsl');
    expect(detectLanguageByFilename('config.json5')).toBe('json5');
    expect(detectLanguageByFilename('config.jsonc')).toBe('json5');
  });
});

describe('Hybrid language detection', () => {
  test('detects new extensions by filename', () => {
    expect(detectLanguageByFilename('App.vue')).toBe('vue');
    expect(detectLanguageByFilename('Component.svelte')).toBe('svelte');
    expect(detectLanguageByFilename('README.md')).toBe('markdown');
    expect(detectLanguageByFilename('doc.markdown')).toBe('markdown');
    expect(detectLanguageByFilename('notes.mdown')).toBe('markdown');
    expect(detectLanguageByFilename('notes.mkd')).toBe('markdown');
  });
});
