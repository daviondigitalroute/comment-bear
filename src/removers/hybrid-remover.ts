/**
 * Removers for "hybrid" / templating languages that embed multiple
 * sub-languages in a single file.
 *
 * Rather than re-implement HTML/JS/CSS comment handling, these removers are
 * section-aware: they locate each top-level region (template / script / style
 * for SFCs, fenced code / inline code for Markdown) and delegate the actual
 * comment removal to the EXISTING removers for that region. The tags and any
 * out-of-band text are preserved verbatim.
 */

import {
  removeHtmlComments,
  removeCssComments,
} from './css-html-remover';
import { removeJavaScriptComments } from './javascript-remover';

/**
 * Matches a top-level `<template>`, `<script>` or `<style>` block in a
 * Single-File Component. Capture groups:
 *   1. the opening tag verbatim (e.g. `<script setup lang="ts">`)
 *   2. the tag name (`template` | `script` | `style`), case-insensitive
 *   3. the inner content of the block
 *   4. the closing tag verbatim (e.g. `</script>`)
 */
const SFC_BLOCK_REGEX = /(<(template|script|style)\b[^>]*>)([\s\S]*?)(<\/\2>)/gi;

/**
 * Removes comments from a Single-File Component (Vue or Svelte).
 *
 * Each top-level `<template>`, `<script>` and `<style>` block has its inner
 * content processed by the matching existing remover (HTML / JavaScript / CSS
 * respectively); the surrounding tags and any out-of-block text are kept
 * verbatim. If no such blocks are found (e.g. a plain Svelte file that is
 * mostly markup) the whole input is treated as HTML.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
function removeSfcComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;

  let found = false;
  const result = code.replace(
    SFC_BLOCK_REGEX,
    (_match, openTag: string, tagName: string, inner: string, closeTag: string) => {
      found = true;
      const tag = tagName.toLowerCase();
      let processedInner: string;
      if (tag === 'template') {
        processedInner = removeHtmlComments(inner, preserveLicense, keepEmptyLines);
      } else if (tag === 'script') {
        processedInner = removeJavaScriptComments(inner, preserveLicense, keepEmptyLines);
      } else {
        // style
        processedInner = removeCssComments(inner, preserveLicense, keepEmptyLines);
      }
      return openTag + processedInner + closeTag;
    }
  );

  // No SFC blocks at all: treat the document as plain HTML markup.
  if (!found) {
    return removeHtmlComments(code, preserveLicense, keepEmptyLines);
  }

  return result;
}

/**
 * Removes comments from a Vue Single-File Component (`.vue`).
 *
 * Delegates to the shared SFC handler: `<template>` is processed as HTML,
 * `<script>` as JavaScript and `<style>` as CSS.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeVueComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  return removeSfcComments(code, preserveLicense, keepEmptyLines);
}

/**
 * Removes comments from a Svelte component (`.svelte`).
 *
 * Shares the SFC handler with Vue: `<template>` is processed as HTML,
 * `<script>` as JavaScript and `<style>` as CSS. A plain-markup Svelte file
 * with no such blocks is treated as HTML.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeSvelteComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  return removeSfcComments(code, preserveLicense, keepEmptyLines);
}

/**
 * Sentinel wrapper used to mask protected Markdown regions (fenced code blocks
 * and inline code spans). The `@@MDPROT<n>@@` form is collision-resistant
 * against real Markdown source and contains no characters that
 * `removeHtmlComments` could treat as a comment token. Placeholders are
 * restored verbatim, so no spacing artifacts are introduced.
 */
const MD_PLACEHOLDER_RESTORE = /@@MDPROT(\d+)@@/g;

/**
 * Removes comments from Markdown (`.md`, `.markdown`).
 *
 * Markdown's only real comments are HTML comments `<!-- ... -->`. Content
 * inside fenced code blocks (triple-backtick / `~~~`) and inline code spans
 * (`` `...` ``) must be preserved verbatim, because a `<!-- -->` shown as
 * example code is not a comment. The strategy is to mask those protected
 * regions with placeholders, run `removeHtmlComments` over the rest, then
 * restore the placeholders.
 *
 * @param code - Input code
 * @param preserveLicense - Whether to preserve license comments
 * @param keepEmptyLines - Whether to keep empty lines where comments were
 * @returns Processed code
 */
export function removeMarkdownComments(
  code: string,
  preserveLicense: boolean = false,
  keepEmptyLines: boolean = false
): string {
  if (!code) return code;

  const protectedRegions: string[] = [];
  const placeholder = (content: string): string => {
    const id = protectedRegions.length;
    protectedRegions.push(content);
    return '@@MDPROT' + id + '@@';
  };

  // 1. Mask fenced code blocks line-by-line, tracking the active fence marker
  // so the closing fence must use the same marker (triple-backtick or ~~~).
  const lines = code.split('\n');
  const masked: string[] = [];
  let fenceMarker: string | null = null;

  for (const line of lines) {
    const trimmed = line.trimStart();
    if (fenceMarker === null) {
      // Opening fence: a line whose trimmed text starts with ``` or ~~~.
      const open = /^(`{3,}|~{3,})/.exec(trimmed);
      if (open) {
        fenceMarker = open[1][0]; // '`' or '~'
        masked.push(placeholder(line));
        continue;
      }
      masked.push(line);
    } else {
      // Inside a fence: everything is protected verbatim.
      masked.push(placeholder(line));
      // Closing fence: trimmed text is only the fence marker repeated.
      const close = /^(`{3,}|~{3,})\s*$/.exec(trimmed);
      if (close && close[1][0] === fenceMarker) {
        fenceMarker = null;
      }
    }
  }

  let working = masked.join('\n');

  // 2. Mask inline code spans (text wrapped in matched runs of backticks on a
  // single line, e.g. an inline span containing `<!-- keep -->`). Processed
  // after fenced blocks so the fence placeholders are not re-scanned.
  working = working.replace(/(`+)(?:(?!\1)[^\n])+?\1/g, (match) => placeholder(match));

  // 3. Remove HTML comments from the unprotected remainder.
  let result = removeHtmlComments(working, preserveLicense, keepEmptyLines);

  // 4. Restore protected regions.
  result = result.replace(MD_PLACEHOLDER_RESTORE, (_, index) => {
    const region = protectedRegions[parseInt(index, 10)];
    return region !== undefined ? region : '';
  });

  return result;
}
