import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as zlib from 'zlib';
import { promisify } from 'util';
import AdmZip from 'adm-zip';
import * as tar from 'tar';
import { normalizeExt } from '../formats';

const gunzip = promisify(zlib.gunzip);
const gzip = promisify(zlib.gzip);

/**
 * Arşiv dönüştürücü — içeriği açıp hedef formatta yeniden paketler.
 * zip, tar, tgz, gz → zip, tar, tgz
 *
 * Akış: kaynağı geçici bir dizine aç, sonra o dizini hedef formatta paketle.
 */
export async function convertArchive(
  input: Buffer,
  sourceExt: string,
  targetExt: string,
  innerName = 'dosya',
): Promise<Buffer> {
  const source = normalizeExt(sourceExt);
  const target = normalizeExt(targetExt);

  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'filarc-'));
  const srcDir = path.join(work, 'src');
  await fs.mkdir(srcDir, { recursive: true });

  try {
    await extract(input, source, srcDir, work, innerName);
    // Boş çıktıyı önle
    const entries = await fs.readdir(srcDir);
    if (entries.length === 0) throw new Error('Arşiv boş veya açılamadı.');
    return await pack(srcDir, target, work);
  } finally {
    fs.rm(work, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function extract(
  input: Buffer,
  source: string,
  srcDir: string,
  work: string,
  innerName: string,
): Promise<void> {
  switch (source) {
    case 'zip': {
      new AdmZip(input).extractAllTo(srcDir, true);
      return;
    }
    case 'tar':
    case 'tgz': {
      const tmp = path.join(work, `in.${source}`);
      await fs.writeFile(tmp, input);
      await tar.x({ file: tmp, cwd: srcDir }); // gzip otomatik tespit edilir
      return;
    }
    case 'gz': {
      const data = await gunzip(input);
      const name = innerName.replace(/\.gz$/i, '') || 'dosya';
      await fs.writeFile(path.join(srcDir, name), data);
      return;
    }
    default:
      throw new Error(`Desteklenmeyen arşiv kaynağı: ${source}`);
  }
}

async function pack(srcDir: string, target: string, work: string): Promise<Buffer> {
  switch (target) {
    case 'zip': {
      const zip = new AdmZip();
      zip.addLocalFolder(srcDir);
      return zip.toBuffer();
    }
    case 'tar':
    case 'tgz': {
      const out = path.join(work, `out.${target}`);
      const files = await fs.readdir(srcDir);
      await tar.c({ file: out, cwd: srcDir, gzip: target === 'tgz' }, files);
      return fs.readFile(out);
    }
    case 'gz': {
      // gz tek akış taşır: yalnız tek dosya varsa onu gzip'ler; çok dosya için tgz önerilir.
      const files = await fs.readdir(srcDir);
      if (files.length !== 1) {
        throw new Error('gz tek dosya içindir; birden çok dosya için tgz kullanın.');
      }
      const data = await fs.readFile(path.join(srcDir, files[0]));
      return gzip(data);
    }
    default:
      throw new Error(`Desteklenmeyen arşiv hedefi: ${target}`);
  }
}
