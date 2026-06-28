import { Font } from 'fonteditor-core';
import * as wawoff2 from 'wawoff2';
import { normalizeExt } from '../formats';

/**
 * Yazı tipi dönüştürücü (TrueType ailesi).
 * ttf, woff, woff2, eot → ttf, woff, woff2, eot, svg
 *
 * Strateji: her kaynağı önce TTF'e indir (evrensel ara biçim), sonra hedefe yaz.
 * woff2 fonteditor'da WASM init gerektirdiği için wawoff2 ile işlenir.
 */
export async function convertFont(
  input: Buffer,
  sourceExt: string,
  targetExt: string,
): Promise<Buffer> {
  const source = normalizeExt(sourceExt);
  const target = normalizeExt(targetExt);

  // 1) Kaynağı TTF tamponuna getir.
  let ttf: Buffer;
  if (source === 'ttf') {
    ttf = input;
  } else if (source === 'woff2') {
    ttf = Buffer.from(await wawoff2.decompress(input));
  } else {
    // woff, eot → fonteditor ile oku, ttf yaz
    const font = Font.create(input, { type: source as any });
    ttf = toBuffer(font.write({ type: 'ttf' }));
  }

  // 2) TTF'ten hedefe yaz.
  if (target === 'ttf') return ttf;
  if (target === 'woff2') return Buffer.from(await wawoff2.compress(ttf));

  const font = Font.create(ttf, { type: 'ttf' });
  const written = font.write({ type: target as any }); // woff | eot | svg
  return toBuffer(written);
}

function toBuffer(x: ArrayBuffer | Buffer | string): Buffer {
  if (Buffer.isBuffer(x)) return x;
  if (typeof x === 'string') return Buffer.from(x, 'utf8');
  return Buffer.from(new Uint8Array(x));
}
