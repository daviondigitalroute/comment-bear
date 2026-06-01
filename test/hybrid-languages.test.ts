import { removeComments } from '../src/index';
import { detectLanguageByFilename } from '../src/detectors/language-detector';

/**
 * Tests for the "hybrid" / templating languages added in
 * `src/removers/hybrid-remover.ts` (Vue, Svelte, Markdown).
 */

describe('Vue', () => {
  test('removes HTML, JS and CSS comments across SFC blocks', () => {
    const code =
      '<template><!-- c --><div>{{x}}</div></template>\n' +
      '<script>// c\nconst x=1;</script>\n' +
      '<style>/* c */ .a{color:red}</style>';
    const result = removeComments(code, { language: 'vue' }).code;

    // All three comment kinds are gone.
    expect(result).not.toContain('<!-- c -->');
    expect(result).not.toContain('// c');
    expect(result).not.toContain('/* c */');

    // Tags are preserved verbatim.
    expect(result).toContain('<template>');
    expect(result).toContain('</template>');
    expect(result).toContain('<script>');
    expect(result).toContain('</script>');
    expect(result).toContain('<style>');
    expect(result).toContain('</style>');

    // Markup, code and the mustache expression survive.
    expect(result).toContain('<div>{{x}}</div>');
    expect(result).toContain('const x=1;');
    expect(result).toContain('.a{color:red}');
    expect(result).toContain('{{x}}');
  });

  test('preserves a JS string that looks like a line comment', () => {
    const code = '<script>\nconst u = "http://x"; // real comment\n</script>';
    const result = removeComments(code, { language: 'vue' }).code;

    // The // inside the string is part of a URL and must remain.
    expect(result).toContain('"http://x"');
    // The actual trailing line comment is removed.
    expect(result).not.toContain('// real comment');
  });

  test('handles attributes on the script/style tags', () => {
    const code =
      '<script setup lang="ts">// c\nlet n: number = 1;</script>\n' +
      '<style scoped>/* c */ .b{}</style>';
    const result = removeComments(code, { language: 'vue' }).code;

    expect(result).toContain('<script setup lang="ts">');
    expect(result).toContain('<style scoped>');
    expect(result).toContain('let n: number = 1;');
    expect(result).not.toContain('// c');
    expect(result).not.toContain('/* c */');
  });
});

describe('Svelte', () => {
  test('removes HTML, JS and CSS comments across SFC blocks', () => {
    const code =
      '<script>// c\nconst x=1;</script>\n' +
      '<div><!-- markup comment -->{x}</div>\n' +
      '<style>/* c */ .a{color:red}</style>';
    const result = removeComments(code, { language: 'svelte' }).code;

    expect(result).not.toContain('// c');
    expect(result).not.toContain('/* c */');
    expect(result).toContain('const x=1;');
    expect(result).toContain('.a{color:red}');
  });

  test('plain-markup file: HTML comment removed, element kept', () => {
    const code = '<!-- c -->\n<div>hello</div>';
    const result = removeComments(code, { language: 'svelte' }).code;

    expect(result).not.toContain('<!-- c -->');
    expect(result).toContain('<div>hello</div>');
  });

  test('preserves a JS string that looks like a line comment', () => {
    const code = '<script>\nconst u = "http://x"; // not a comment? yes it is\n</script>';
    const result = removeComments(code, { language: 'svelte' }).code;

    expect(result).toContain('"http://x"');
    expect(result).not.toContain('// not a comment');
  });
});

describe('Markdown', () => {
  test('removes a top-level HTML comment', () => {
    const code = '# Title\n<!-- c -->\nText';
    const result = removeComments(code, { language: 'markdown' }).code;

    expect(result).not.toContain('<!-- c -->');
    expect(result).toContain('# Title');
    expect(result).toContain('Text');
  });

  test('keeps an HTML comment inside a fenced code block', () => {
    const code = '```html\n<!-- keep -->\n```';
    const result = removeComments(code, { language: 'markdown' }).code;

    expect(result).toContain('<!-- keep -->');
    expect(result).toContain('```html');
  });

  test('keeps an HTML comment inside a ~~~ fenced block', () => {
    const code = '~~~\n<!-- keep -->\n~~~';
    const result = removeComments(code, { language: 'markdown' }).code;

    expect(result).toContain('<!-- keep -->');
  });

  test('keeps an HTML comment inside an inline code span', () => {
    const code = 'Use `<!-- keep -->` here.';
    const result = removeComments(code, { language: 'markdown' }).code;

    // Preserved verbatim, with no spacing artifacts around the span.
    expect(result).toBe('Use `<!-- keep -->` here.');
  });

  test('removes prose HTML comments but keeps fenced examples', () => {
    const code =
      '<!-- drop me -->\n' +
      '# Doc\n' +
      '```\n<!-- keep me -->\n```\n' +
      '<!-- drop me too -->';
    const result = removeComments(code, { language: 'markdown' }).code;

    expect(result).not.toContain('<!-- drop me -->');
    expect(result).not.toContain('<!-- drop me too -->');
    expect(result).toContain('<!-- keep me -->');
  });

  test('preserveLicense keeps a license HTML comment', () => {
    const code = '<!-- Copyright 2024 Acme -->\n# Title';
    const result = removeComments(code, {
      language: 'markdown',
      preserveLicense: true,
    }).code;

    expect(result).toContain('<!-- Copyright 2024 Acme -->');
  });
});

describe('Hybrid language detection', () => {
  test('detects new extensions by filename', () => {
    expect(detectLanguageByFilename('App.vue')).toBe('vue');
    expect(detectLanguageByFilename('Component.svelte')).toBe('svelte');
    expect(detectLanguageByFilename('README.md')).toBe('markdown');
    expect(detectLanguageByFilename('doc.markdown')).toBe('markdown');
  });
});
