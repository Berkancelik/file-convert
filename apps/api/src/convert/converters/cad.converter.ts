import { libreConvert } from '../libreoffice';
import { normalizeExt } from '../formats';

/**
 * CAD dönüştürücü — @mlightcad/libredwg-web (GNU LibreDWG'nin WASM derlemesi) + LibreOffice.
 *
 * İş bölümü:
 *  - DWG (kapalı binary biçim) → libredwg ile okunur. Doğrudan DXF (dwg_write_dxf) ve
 *    SVG (dwg_to_svg) üretebilir; sistem aracı gerektirmez. Her DWG sürümünde hızlı.
 *  - PDF, DWG için SVG ara formatı üzerinden LibreOffice ile alınır. ÖNEMLİ: LibreOffice'in
 *    DXF içe-aktarıcısı bazı çizimlerde (ör. AutoCAD 2018) sonsuz döngüye girip askıda kalıyor;
 *    SVG içe-aktarıcısı ise hızlı ve güvenilir. Bu yüzden DWG→PDF için DXF değil SVG köprülenir.
 *  - DXF girişi LibreOffice'e doğrudan verilir (libredwg'nin DXF→SVG yolu model-space block'u
 *    null gelen dosyalarda çöküyor). libreConvert sert timeout + süreç-ağacı öldürmeyle korumalı.
 *
 * Yollar:  dwg→dxf (libredwg) · dwg→svg (libredwg) · dwg→pdf (libredwg→svg, LO svg→pdf)
 *          dxf→svg (LO) · dxf→pdf (LO)
 */

// libredwg-web yalnız ESM yayımlar; UMD/CJS derlemesi emscripten default-export interop
// nedeniyle bozuk. TS'in `import()`'i require'a indirmesini engellemek için gerçek dinamik
// import (bu sayede CommonJS NestJS çalışma zamanında ESM modülü yüklenebilir).
const dynamicImport = new Function('s', 'return import(s)') as (s: string) => Promise<any>;

interface LibreDwgBundle {
  lib: any;
  FileType: { DWG: number; DXF: number };
}

let bundlePromise: Promise<LibreDwgBundle> | null = null;

/** libredwg WASM örneğini bir kez yükler (~9MB WASM; tembel + önbellekli). */
async function getLibreDwg(): Promise<LibreDwgBundle> {
  if (!bundlePromise) {
    bundlePromise = (async () => {
      const mod = await dynamicImport('@mlightcad/libredwg-web');
      const lib = await mod.LibreDwg.create();
      return { lib, FileType: mod.Dwg_File_Type };
    })().catch((err) => {
      bundlePromise = null; // başarısız yüklemeyi önbelleğe alma
      throw err;
    });
  }
  return bundlePromise;
}

/** Node Buffer'ı, paylaşımlı havuzdan bağımsız tam bir ArrayBuffer'a kopyalar. */
function toArrayBuffer(buf: Buffer): ArrayBuffer {
  const copy = new Uint8Array(buf.byteLength);
  copy.set(buf);
  return copy.buffer;
}

/** DWG → DXF (libredwg). Çağrı senkron WASM olduğundan eşzamanlı isteklerle çakışmaz. */
async function dwgToDxf(input: Buffer): Promise<Buffer> {
  const { lib } = await getLibreDwg();
  const out: Uint8Array | null = lib.dwg_write_dxf(toArrayBuffer(input));
  if (!out || !out.length) throw new Error('DWG okunamadı veya DXF üretilemedi.');
  return Buffer.from(out);
}

/** DWG → SVG (libredwg doğrudan; LibreOffice gerekmez). */
async function dwgToSvg(input: Buffer): Promise<Buffer> {
  const { lib, FileType } = await getLibreDwg();
  const data = lib.dwg_read_data(toArrayBuffer(input), FileType.DWG);
  if (data == null) throw new Error('DWG dosyası okunamadı.');
  try {
    const db = lib.convert(data);
    const svg: string = lib.dwg_to_svg(db);
    if (!svg) throw new Error('DWG → SVG üretilemedi.');
    return Buffer.from(svg, 'utf8');
  } finally {
    lib.dwg_free(data);
  }
}

export async function convertCad(
  input: Buffer,
  sourceExt: string,
  targetExt: string,
): Promise<{ buffer: Buffer; ext: string }> {
  const source = normalizeExt(sourceExt);
  const target = normalizeExt(targetExt);

  if (source === 'dwg') {
    if (target === 'dxf') return { buffer: await dwgToDxf(input), ext: 'dxf' };
    // SVG'yi libredwg üretir (tüm DWG sürümlerinde hızlı). PDF de bunun üzerinden alınır.
    const svg = await dwgToSvg(input);
    if (target === 'svg') return { buffer: svg, ext: 'svg' };
    if (target === 'pdf') {
      // LibreOffice'in SVG importu DXF importundan çok daha sağlam (DXF importu askıda kalabiliyor).
      return { buffer: await libreConvert(svg, 'svg', 'pdf'), ext: 'pdf' };
    }
  }

  if (source === 'dxf') {
    if (target === 'pdf' || target === 'svg') {
      return { buffer: await libreConvert(input, 'dxf', target), ext: target };
    }
  }

  throw new Error(`Desteklenmeyen CAD dönüşümü: ${source} → ${target}`);
}
