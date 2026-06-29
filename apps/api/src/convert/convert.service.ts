import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { categoryOf, normalizeExt, targetsFor } from './formats';
import { convertImage } from './converters/image.converter';
import { convertMedia } from './converters/media.converter';
import { convertDocument } from './converters/document.converter';
import { convertSpreadsheet } from './converters/spreadsheet.converter';
import { convertData } from './converters/data.converter';
import { convertFont } from './converters/font.converter';
import { convertCert } from './converters/cert.converter';
import { convertArchive } from './converters/archive.converter';
import { convertOffice } from './converters/office.converter';
import { convertCad } from './converters/cad.converter';
import { isAvailable as libreOfficeAvailable } from './libreoffice';

interface StoredResult {
  id: string;
  filePath: string;
  filename: string;
  mime: string;
  size: number;
  createdAt: number;
}

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif',
  tiff: 'image/tiff', gif: 'image/gif', svg: 'image/svg+xml', bmp: 'image/bmp',
  ico: 'image/x-icon', heic: 'image/heic', heif: 'image/heif',
  pdf: 'application/pdf',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4',
  aac: 'audio/aac', flac: 'audio/flac', opus: 'audio/opus', aiff: 'audio/aiff', ac3: 'audio/ac3',
  wma: 'audio/x-ms-wma', amr: 'audio/amr', dts: 'audio/vnd.dts',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', avi: 'video/x-msvideo',
  mkv: 'video/x-matroska', ts: 'video/mp2t', mpg: 'video/mpeg', m4v: 'video/x-m4v', '3gp': 'video/3gpp',
  flv: 'video/x-flv', wmv: 'video/x-ms-wmv', ogv: 'video/ogg',
  html: 'text/html', txt: 'text/plain', md: 'text/markdown',
  csv: 'text/csv', json: 'application/json', tsv: 'text/tab-separated-values',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  yaml: 'application/x-yaml', xml: 'application/xml', toml: 'application/toml',
  ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2', eot: 'application/vnd.ms-fontobject',
  pem: 'application/x-pem-file', der: 'application/x-x509-ca-cert', crt: 'application/x-x509-ca-cert',
  zip: 'application/zip', tar: 'application/x-tar', tgz: 'application/gzip', gz: 'application/gzip',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  odt: 'application/vnd.oasis.opendocument.text', rtf: 'application/rtf',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odp: 'application/vnd.oasis.opendocument.presentation',
  dwg: 'image/vnd.dwg', dxf: 'image/vnd.dxf',
};

/** Hangi (kategori, kaynak, hedef) üçlüsünün LibreOffice ile yapılacağını belirler. */
function shouldUseLibreOffice(category: string, source: string, target: string): boolean {
  if (category === 'richdoc' || category === 'presentation') return true;
  if (category === 'spreadsheet' && target === 'pdf') return true;
  if (category === 'document') {
    if (source === 'pdf') return true; // pdf→word/metin (mammoth/marked pdf okuyamaz)
    if (target === 'docx') return true; // md/html/txt/pdf→word
    if (source === 'docx' && target === 'pdf') return true; // word→pdf
  }
  return false;
}

@Injectable()
export class ConvertService {
  private readonly logger = new Logger('ConvertService');
  private readonly store = new Map<string, StoredResult>();
  private readonly outDir = path.join(os.tmpdir(), 'file-convert-out');
  private readonly TTL = 60 * 60 * 1000; // 1 saat

  constructor() {
    fs.mkdir(this.outDir, { recursive: true }).catch(() => undefined);
    setInterval(() => this.cleanup(), 10 * 60 * 1000).unref();
  }

  /** Asıl dönüştürme akışı. */
  async convert(
    buffer: Buffer,
    originalName: string,
    targetExt: string,
    opts: { quality?: number } = {},
  ): Promise<{ id: string; filename: string; size: number; mime: string }> {
    const sourceExt = normalizeExt(path.extname(originalName));
    const target = normalizeExt(targetExt);

    if (!sourceExt) throw new BadRequestException('Dosya uzantısı tespit edilemedi.');
    const category = categoryOf(sourceExt);
    if (!category) {
      throw new BadRequestException(`Desteklenmeyen giriş formatı: .${sourceExt}`);
    }
    const allowed = targetsFor(sourceExt);
    if (!allowed.includes(target)) {
      throw new BadRequestException(
        `.${sourceExt} dosyası .${target} formatına dönüştürülemez. Mümkün hedefler: ${allowed.join(', ') || 'yok'}`,
      );
    }

    let outBuffer: Buffer;
    let outExt = target;
    const baseNameForInner = path.basename(originalName, path.extname(originalName));

    try {
      // Office formatları (Word/sunu/tablo→pdf) LibreOffice'e yönlendirilir.
      if (libreOfficeAvailable() && shouldUseLibreOffice(category, sourceExt, target)) {
        const res = await convertOffice(buffer, sourceExt, target);
        outBuffer = res.buffer;
        outExt = res.ext;
      } else {
        switch (category) {
          case 'image':
            outBuffer = await convertImage(buffer, sourceExt, target, opts);
            break;
          case 'audio':
          case 'video':
            outBuffer = await convertMedia(buffer, sourceExt, target);
            break;
          case 'font':
            outBuffer = await convertFont(buffer, sourceExt, target);
            break;
          case 'archive':
            outBuffer = await convertArchive(buffer, sourceExt, target, baseNameForInner);
            break;
          case 'document': {
            const res = await convertDocument(buffer, sourceExt, target);
            outBuffer = res.buffer;
            outExt = res.ext;
            break;
          }
          case 'spreadsheet': {
            const res = await convertSpreadsheet(buffer, sourceExt, target);
            outBuffer = res.buffer;
            outExt = res.ext;
            break;
          }
          case 'data': {
            const res = await convertData(buffer, sourceExt, target);
            outBuffer = res.buffer;
            outExt = res.ext;
            break;
          }
          case 'cert': {
            const res = await convertCert(buffer, sourceExt, target);
            outBuffer = res.buffer;
            outExt = res.ext;
            break;
          }
          case 'cad': {
            const res = await convertCad(buffer, sourceExt, target);
            outBuffer = res.buffer;
            outExt = res.ext;
            break;
          }
          default:
            throw new Error(`Bilinmeyen kategori: ${category}`);
        }
      }
    } catch (err: any) {
      this.logger.error(`Dönüştürme hatası (${sourceExt}→${target}): ${err?.message}`);
      throw new BadRequestException(`Dönüştürme başarısız: ${err?.message ?? 'bilinmeyen hata'}`);
    }

    const id = randomUUID();
    const baseName = path.basename(originalName, path.extname(originalName));
    const filename = `${sanitize(baseName)}.${outExt}`;
    const filePath = path.join(this.outDir, `${id}.${outExt}`);
    await fs.writeFile(filePath, outBuffer);

    const result: StoredResult = {
      id,
      filePath,
      filename,
      mime: MIME[outExt] ?? 'application/octet-stream',
      size: outBuffer.length,
      createdAt: Date.now(),
    };
    this.store.set(id, result);

    return { id, filename, size: result.size, mime: result.mime };
  }

  async getFile(id: string): Promise<StoredResult & { buffer: Buffer }> {
    const r = this.store.get(id);
    if (!r) throw new NotFoundException('Dosya bulunamadı veya süresi doldu.');
    const buffer = await fs.readFile(r.filePath).catch(() => null);
    if (!buffer) throw new NotFoundException('Dosya artık mevcut değil.');
    return { ...r, buffer };
  }

  private async cleanup() {
    const now = Date.now();
    for (const [id, r] of this.store) {
      if (now - r.createdAt > this.TTL) {
        this.store.delete(id);
        fs.rm(r.filePath, { force: true }).catch(() => undefined);
      }
    }
  }
}

function sanitize(name: string): string {
  return (name || 'donusturulmus').replace(/[^\p{L}\p{N}\-_. ]/gu, '_').slice(0, 80) || 'dosya';
}
