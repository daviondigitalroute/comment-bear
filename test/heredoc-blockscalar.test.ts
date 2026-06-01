import { removeComments } from '../src/index';

/**
 * Regression tests for two "string body wrongly treated as comments" bugs:
 *  - PHP heredoc/nowdoc bodies had their `#` content stripped (the heredoc was
 *    restored BEFORE the `#`-comment pass ran), corrupting the string.
 *  - YAML literal (`|`) / folded (`>`) block scalars had `#` stripped from
 *    their indented body lines (the remover was purely per-line).
 */
describe('PHP heredoc / nowdoc body preservation', () => {
  const php = (code: string) => removeComments(code, { language: 'php' }).code;

  test('heredoc body keeps # and // content', () => {
    const code = '$x = <<<EOT\nhas # and // inside\nEOT;';
    expect(php(code)).toBe(code);
  });

  test('nowdoc body keeps # content', () => {
    const code = "$x = <<<'EOT'\n# not a comment\nEOT;";
    expect(php(code)).toBe(code);
  });

  test('heredoc body preserved while a real # comment after it is removed', () => {
    const code = '$x = <<<EOT\nline # one\nEOT;\n$y = 1; # gone';
    const out = php(code);
    expect(out).toContain('line # one');
    expect(out).toContain('$y = 1;');
    expect(out).not.toContain('# gone');
  });

  // Must-not-regress: ordinary PHP comments still go.
  test('ordinary # and // comments still removed', () => {
    expect(php('$x = 1; # c').trimEnd()).toBe('$x = 1;');
    expect(php('$x = 1; // c').trimEnd()).toBe('$x = 1;');
  });

  test('PHP 8 attribute is not a comment', () => {
    const code = '#[Route("/api")]\nfunction f(){}';
    expect(php(code)).toBe(code);
  });
});

describe('YAML block scalar body preservation', () => {
  const yaml = (code: string) => removeComments(code, { language: 'yaml' }).code;

  test('literal block | keeps # in body, strips real trailing comment', () => {
    const code = 'key: |\n  text with # not a comment\nother: 1 # real';
    expect(yaml(code)).toBe('key: |\n  text with # not a comment\nother: 1');
  });

  test('folded block > keeps # in body', () => {
    const code = 'key: >\n  folded # not comment\nx: 1 # real';
    expect(yaml(code)).toBe('key: >\n  folded # not comment\nx: 1');
  });

  test('block with chomping indicator |- keeps # in body', () => {
    const code = 'k: |-\n  a # b\n  c # d\nz: 1';
    expect(yaml(code)).toBe('k: |-\n  a # b\n  c # d\nz: 1');
  });

  // Must-not-regress: ordinary YAML comments and non-block pipes.
  test('ordinary comment removed', () => {
    expect(yaml('a: 1 # c')).toBe('a: 1');
  });

  test('a quoted pipe value is not a block-scalar introducer', () => {
    expect(yaml('a: "b | c" # real')).toBe('a: "b | c"');
  });

  test('url fragment is not a comment', () => {
    expect(yaml('url: http://x#frag')).toBe('url: http://x#frag');
  });
});
