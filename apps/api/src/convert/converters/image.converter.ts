import sharp from 'sharp';
import PDFDocument from 'pdfkit';
import * as bmpjs from 'bmp-js';
import decodeIco from 'decode-ico';
import pngToIcoMod from 'png-to-ico';
import { normalizeExt } from '../formats';

// png-to-ico ESM-interop: fonksiyon ya doğrudan ya da .default altında.
const pngToIco: (input: Buffer | Buffer[]) => Promise<Buffer> =
  (pngToIcoMod as any).default ?? (pngToIcoMod as any);

/**
 * Görüntü dönüştürücü.
 * sharp çekirdek motordur; bmp/ico için yardımcı kütüphaneler köprü görevi görür.
 * heic/heif/svg yalnızca girdi olarak okunur.
 */
export async function convertImage(
  input: Buffer,
  sourceExt: string,
  targetExt: string,
  opts: { quality?: number } = {},
): Promise<Buffer> {
  const source = normalizeExt(sourceExt);
  const target = normalizeExt(targetExt);
  const quality = clamp(opts.quality ?? 82, 1, 100);

  // 1) Girişi sharp'ın anlayacağı bir tampona getir (bmp/ico özel yol).
  let pipelineInput: Buffer;
  let rawInfo: { width: number; height: number; channels: 4 } | null = null;

  if (source === 'bmp') {
    const decoded = bmpjs.decode(input); // ABGR
    pipelineInput = abgrToRgba(decoded.data, decoded.width, decoded.height);
    rawInfo = { width: decoded.width, height: decoded.height, channels: 4 };
  } else if (source === 'ico') {
    const frames = decodeIco(input);
    if (!frames.length) throw new Error('ICO çözülemedi (kare yok).');
    // En büyük kareyi seç
    const best = frames.reduce((a, b) => (a.width * a.height >= b.width * b.height ? a : b));
    pipelineInput = Buffer.from(best.data); // decode-ico RGBA verir
    rawInfo = { width: best.width, height: best.height, channels: 4 };
  } else {
    pipelineInput = input; // jpg/png/webp/avif/gif/tiff/svg/heic/heif → sharp doğrudan okur
  }

  const makePipeline = () =>
    rawInfo
      ? sharp(pipelineInput, { raw: rawInfo })
      : sharp(pipelineInput, { failOn: 'none', animated: target === 'gif' });

  // 2) Hedefe yaz.
  if (target === 'pdf') return imageToPdf(makePipeline());
  if (target === 'bmp') return imageToBmp(makePipeline());
  if (target === 'ico') return imageToIco(makePipeline());

  const pipeline = makePipeline();
  switch (target) {
    case 'jpg':
      return pipeline.flatten({ background: '#ffffff' }).jpeg({ quality, mozjpeg: true }).toBuffer();
    case 'png':
      return pipeline.png({ compressionLevel: 9 }).toBuffer();
    case 'webp':
      return pipeline.webp({ quality }).toBuffer();
    case 'avif':
      return pipeline.avif({ quality }).toBuffer();
    case 'tiff':
      return pipeline.tiff({ quality }).toBuffer();
    case 'gif':
      return pipeline.gif().toBuffer();
    default:
      throw new Error(`Desteklenmeyen görüntü hedefi: ${target}`);
  }
}

/* ---------------- Hedef kodlayıcılar ---------------- */

async function imageToBmp(pipeline: sharp.Sharp): Promise<Buffer> {
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const abgr = rgbaToAbgr(data, info.width, info.height);
  const encoded = bmpjs.encode({ data: abgr, width: info.width, height: info.height });
  return Buffer.from(encoded.data);
}

async function imageToIco(pipeline: sharp.Sharp): Promise<Buffer> {
  // png-to-ico KARE png ister. Görüntüyü 256x256 kareye, en-boy oranını koruyarak
  // (şeffaf dolgu ile) yerleştir.
  const png = await pipeline
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return pngToIco([png]);
}

async function imageToPdf(pipeline: sharp.Sharp): Promise<Buffer> {
  const png = await pipeline.png().toBuffer();
  const meta = await sharp(png).metadata();
  const width = meta.width ?? 800;
  const height = meta.height ?? 600;
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: [width, height], margin: 0 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.image(png, 0, 0, { width, height });
    doc.end();
  });
}

/* ---------------- Kanal sırası yardımcıları ---------------- */
// bmp-js ABGR kullanır; sharp RGBA. Aralarında dönüştürürüz.

function abgrToRgba(src: Buffer | Uint8Array, w: number, h: number): Buffer {
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h * 4; i += 4) {
    out[i] = src[i + 3];     // R
    out[i + 1] = src[i + 2]; // G
    out[i + 2] = src[i + 1]; // B
    out[i + 3] = src[i] || 255; // A
  }
  return out;
}

function rgbaToAbgr(src: Buffer | Uint8Array, w: number, h: number): Buffer {
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h * 4; i += 4) {
    out[i] = src[i + 3];     // A
    out[i + 1] = src[i + 2]; // B
    out[i + 2] = src[i + 1]; // G
    out[i + 3] = src[i];     // R
  }
  return out;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
