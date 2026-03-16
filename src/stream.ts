import { Transform, TransformCallback, TransformOptions } from 'stream';
import { removeComments } from './index';
import { Lang, RemoveOptions } from './types';

export interface CommentRemoverStreamOptions extends TransformOptions {
  language?: Lang;
  filename?: string;
  preserveLicense?: boolean;
  keepEmptyLines?: boolean;
}

/**
 * A Transform stream that removes comments from code.
 * Buffers all input and processes it on flush to handle multi-line comments correctly.
 */
export class CommentRemoverStream extends Transform {
  private chunks: Buffer[] = [];
  private removeOptions: RemoveOptions;

  constructor(options: CommentRemoverStreamOptions = {}) {
    const { language, filename, preserveLicense, keepEmptyLines, ...transformOptions } = options;
    super({ ...transformOptions, objectMode: false });

    this.removeOptions = {
      language,
      filename,
      preserveLicense,
      keepEmptyLines,
    };
  }

  _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    this.chunks.push(chunk);
    callback();
  }

  _flush(callback: TransformCallback): void {
    try {
      const code = Buffer.concat(this.chunks).toString('utf-8');
      const result = removeComments(code, this.removeOptions);
      this.push(Buffer.from(result.code, 'utf-8'));
      callback();
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

/**
 * Creates a Transform stream that removes comments from code
 * @param options - Stream options including language and removal preferences
 * @returns A Transform stream
 *
 * @example
 * ```typescript
 * import { createCommentRemoverStream } from 'comment-bear';
 * import { createReadStream, createWriteStream } from 'fs';
 *
 * createReadStream('input.js')
 *   .pipe(createCommentRemoverStream({ language: 'javascript' }))
 *   .pipe(createWriteStream('output.js'));
 * ```
 */
export function createCommentRemoverStream(options: CommentRemoverStreamOptions = {}): CommentRemoverStream {
  return new CommentRemoverStream(options);
}
