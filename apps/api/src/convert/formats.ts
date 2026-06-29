/**
 * Format kayıt sistemi (Converter Registry).
 *
 * Her kategori; kabul ettiği giriş uzantılarını (`inputs`) ve üretebildiği
 * çıkış uzantılarını (`outputs`) bildirir. Frontend bu matrisi `/api/formats`
 * üzerinden çeker ve kullanıcıya yalnızca gerçekten mümkün olan dönüşümleri sunar.
 *
 * Buradaki TÜM dönüşümler npm-paketli motorlarla, sistem bağımlılığı olmadan çalışır.
 * Sistem aracı gerektiren formatlar (RAW, AI/EPS, doc/ppt, pdf→görüntü, ebook…)
 * bilinçli olarak listelenmez; bkz. UNSUPPORTED.
 */

import { isAvailable as hasLibreOffice } from './libreoffice';

export type Category =
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'richdoc'
  | 'presentation'
  | 'spreadsheet'
  | 'data'
  | 'font'
  | 'cert'
  | 'archive'
  | 'cad';

export interface FormatGroup {
  category: Category;
  label: string;
  inputs: string[];
  outputs: string[];
}

/** Görüntü — sharp (libvips+libheif) + bmp-js + ico + ag-psd. */
export const IMAGE: FormatGroup = {
  category: 'image',
  label: 'Görüntü',
  // heic/heif/svg yalnızca girdi (decode); bmp/ico hem girdi hem çıktı.
  inputs: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'tiff', 'tif', 'svg', 'heic', 'heif', 'bmp', 'ico'],
  outputs: ['jpg', 'png', 'webp', 'avif', 'tiff', 'gif', 'bmp', 'ico', 'pdf'],
};

/** Ses — ffmpeg-static (tam donanımlı build: wmav2, alac, amr, dca dahil). */
export const AUDIO: FormatGroup = {
  category: 'audio',
  label: 'Ses',
  inputs: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'wma', 'amr', 'aiff', 'aif', 'ac3', 'dts', 'alac'],
  // wma/amr/dts artık çift yönlü (girdi+çıktı). amr 8kHz mono'ya, dts deneysel kodlayıcıya düşer.
  outputs: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'aiff', 'ac3', 'wma', 'amr', 'dts'],
};

/** Video — ffmpeg-static (flv/wmv2/theora kodlayıcıları mevcut). */
export const VIDEO: FormatGroup = {
  category: 'video',
  label: 'Video',
  inputs: ['mp4', 'mov', 'webm', 'avi', 'mkv', 'flv', 'wmv', 'm4v', 'mpeg', 'mpg', '3gp', 'ts', 'mts', 'm2ts', 'ogv', 'asf', 'vob', 'f4v', 'rm', 'rmvb'],
  // flv/wmv/ogv artık çift yönlü. rm/rmvb/vob/mts kodlayıcısı olmadığından yalnız girdi kalır.
  outputs: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'gif', 'mp3', 'wav', 'ts', 'mpg', 'm4v', '3gp', 'flv', 'wmv', 'ogv'],
};

/**
 * Belge — mammoth (docx), marked (md), pdfkit.
 * LibreOffice kuruluysa pdf girişi (pdf→word/metin) ve docx çıkışı eklenir (bkz. getGroups).
 */
export const DOCUMENT: FormatGroup = {
  category: 'document',
  label: 'Belge',
  inputs: ['docx', 'md', 'markdown', 'html', 'htm', 'txt'],
  outputs: ['html', 'txt', 'md', 'pdf'],
};

/**
 * Hesap tablosu — SheetJS (xlsx). xls SheetJS ile okunur; pdf çıkışı LibreOffice ile.
 * Tablo ailesi (xlsx/xls/ods/csv/tsv) ↔ veri ailesi (json/yaml/xml/toml) ile tam
 * bağlanabilir: tabloyu satır-nesnelerine indirip data seri hale getiricisine devreder.
 */
export const SPREADSHEET: FormatGroup = {
  category: 'spreadsheet',
  label: 'Tablo',
  inputs: ['xlsx', 'xls', 'ods', 'csv', 'tsv'],
  outputs: ['xlsx', 'xls', 'ods', 'csv', 'tsv', 'json', 'html', 'yaml', 'xml', 'toml'],
};

/** Zengin belge (Word/ODT/RTF) — LibreOffice. Yalnızca soffice kuruluysa listelenir. */
export const RICHDOC: FormatGroup = {
  category: 'richdoc',
  label: 'Word/ODT',
  inputs: ['doc', 'odt', 'rtf'],
  outputs: ['pdf', 'docx', 'odt', 'rtf', 'txt', 'html'],
};

/** Sunu — LibreOffice. Yalnızca soffice kuruluysa listelenir. */
export const PRESENTATION: FormatGroup = {
  category: 'presentation',
  label: 'Sunu',
  inputs: ['ppt', 'pptx', 'odp'],
  outputs: ['pdf', 'pptx', 'odp'],
};

/**
 * CAD/Çizim — @mlightcad/libredwg-web (DWG okuma, WASM) + LibreOffice Draw (PDF/DXF render).
 * DWG, libredwg ile gerçek olarak okunur (dxf/svg üretir); PDF LibreOffice Draw'dan alınır.
 * PDF yolu LibreOffice gerektirdiğinden grup yalnız soffice kuruluyken listelenir (bkz. getGroups).
 */
export const CAD: FormatGroup = {
  category: 'cad',
  label: 'CAD/Çizim',
  inputs: ['dwg', 'dxf'],
  outputs: ['pdf', 'svg', 'dxf'],
};

/**
 * Veri — js-yaml, fast-xml-parser, @iarna/toml (+ tablo çıktısı için SheetJS).
 * Ağaç biçimleri (json/yaml/xml/toml) ↔ tablo ailesine de açılır: xlsx ve html çıktısı.
 */
export const DATA: FormatGroup = {
  category: 'data',
  label: 'Veri',
  inputs: ['json', 'yaml', 'yml', 'xml', 'toml'],
  outputs: ['json', 'yaml', 'xml', 'toml', 'csv', 'xlsx', 'html'],
};

/** Yazı tipi — fonteditor-core + wawoff2 (TrueType ailesi). */
export const FONT: FormatGroup = {
  category: 'font',
  label: 'Yazı Tipi',
  inputs: ['ttf', 'woff', 'woff2', 'eot'],
  outputs: ['ttf', 'woff', 'woff2', 'eot', 'svg'],
};

/** Sertifika — node-forge. X.509 biçim dönüşümü (pfx/p12 şifre gerektirir, hariç). */
export const CERT: FormatGroup = {
  category: 'cert',
  label: 'Sertifika',
  inputs: ['pem', 'der', 'cer', 'crt'],
  outputs: ['pem', 'der', 'crt'],
};

/** Arşiv — adm-zip + tar + zlib (yeniden paketleme). gz tek dosya için çift yönlü. */
export const ARCHIVE: FormatGroup = {
  category: 'archive',
  label: 'Arşiv',
  inputs: ['zip', 'tar', 'tgz', 'gz'],
  outputs: ['zip', 'tar', 'tgz', 'gz'],
};

/** Her zaman mevcut (npm motorları) temel gruplar. */
const BASE_GROUPS: FormatGroup[] = [
  IMAGE, AUDIO, VIDEO, DOCUMENT, SPREADSHEET, DATA, FONT, CERT, ARCHIVE,
];

/**
 * Etkin grup listesi — LibreOffice kuruluysa Office formatlarını ekler:
 * yeni richdoc & presentation kategorileri, tablo→pdf, docx→odt/rtf gibi.
 */
export function getGroups(): FormatGroup[] {
  if (!hasLibreOffice()) return BASE_GROUPS;

  const groups: FormatGroup[] = BASE_GROUPS.map((g) => {
    // Tablo → pdf çıkışı LibreOffice ile.
    if (g.category === 'spreadsheet') return { ...g, outputs: [...g.outputs, 'pdf'] };
    // Belge: pdf girişi (pdf→word/metin) ve docx çıkışı (md/html/txt→docx) LibreOffice ile.
    if (g.category === 'document') {
      return { ...g, inputs: [...g.inputs, 'pdf'], outputs: [...g.outputs, 'docx'] };
    }
    return g;
  });
  groups.push(RICHDOC, PRESENTATION, CAD);
  return groups;
}

/** Geriye dönük uyumluluk için anlık görüntü. */
export const GROUPS: FormatGroup[] = BASE_GROUPS;

/**
 * Tanınan ama sistem aracı gerektirdiği için DESTEKLENMEYEN formatlar.
 * UI bunları "kurulum gerekiyor" olarak işaretler (sessiz hata yerine bilgilendirme).
 */
export const UNSUPPORTED: Record<string, string> = {
  // Kamera RAW → libraw/dcraw gerekir
  raw: 'RAW (libraw gerekir)', cr2: 'Canon RAW (libraw)', cr3: 'Canon RAW (libraw)',
  nef: 'Nikon RAW (libraw)', arw: 'Sony RAW (libraw)', orf: 'Olympus RAW (libraw)', dng: 'Adobe DNG (libraw)',
  // PostScript/Adobe → ghostscript/imagemagick
  ai: 'Adobe Illustrator (ghostscript)', eps: 'EPS (ghostscript)',
  xcf: 'GIMP (gimp gerekir)', dds: 'DirectDraw (özel araç)', tga: 'Targa (özel araç)',
  psd: 'Photoshop (node-canvas gerekir)',
  // Office/ebook → libreoffice / calibre
  doc: 'Word 97 (libreoffice)', ppt: 'PowerPoint (libreoffice)', pptx: 'PowerPoint (libreoffice)',
  odt: 'OpenDocument (libreoffice)', odp: 'OpenDocument (libreoffice)', rtf: 'RTF (libreoffice)',
  epub: 'EPUB (calibre)', mobi: 'MOBI (calibre)', azw3: 'AZW3 (calibre)',
  // PDF girişi → LibreOffice (kuruluysa pdf→word/metin açılır; bu liste yalnız kurulu değilken gösterilir)
  pdf: 'PDF girişi (LibreOffice gerekir — çıkış olarak her zaman desteklenir)',
  // Diğer
  rar: 'RAR (unrar gerekir)', '7z': '7-Zip (7za gerekir)', iso: 'ISO', cab: 'CAB',
  apk: 'APK (platformlar arası dönüştürülemez)', aab: 'AAB', ipa: 'iOS IPA',
  fbx: '3D FBX', '3ds': '3D', dae: 'COLLADA', step: 'CAD STEP', stp: 'CAD', iges: 'CAD', igs: 'CAD',
  // DWG/DXF girişi → LibreOffice Draw (kuruluysa pdf/svg çıkışı açılır; bu liste yalnız kurulu değilken gösterilir)
  dwg: 'AutoCAD DWG (LibreOffice gerekir)', dxf: 'AutoCAD DXF (LibreOffice gerekir)',
  // Sertifika anahtar paketleri → şifre girişi gerekir
  pfx: 'PKCS#12 (şifre gerekir)', p12: 'PKCS#12 (şifre gerekir)',
  // OTF çıkışı CFF→quadratic dönüşümü gerektirir
  otf: 'OpenType/CFF (giriş için sınırlı)',
};

/** Uzantıyı normalize eder: nokta, boşluk ve büyük harfleri temizler + eş anlamlılar. */
export function normalizeExt(ext: string): string {
  const e = (ext || '').toLowerCase().trim().replace(/^\./, '');
  if (e === 'jpeg') return 'jpg';
  if (e === 'tif') return 'tiff';
  if (e === 'htm') return 'html';
  if (e === 'markdown') return 'md';
  if (e === 'mpeg') return 'mpg';
  if (e === 'yml') return 'yaml';
  if (e === 'aif') return 'aiff';
  if (e === 'cer') return 'crt';
  return e;
}

/** Verilen giriş uzantısının ait olduğu kategoriyi bulur. */
export function categoryOf(ext: string): Category | null {
  const e = normalizeExt(ext);
  for (const g of getGroups()) {
    if (g.inputs.map(normalizeExt).includes(e)) return g.category;
  }
  return null;
}

/** Bir giriş uzantısı için mümkün olan hedef formatları döndürür. */
export function targetsFor(ext: string): string[] {
  const e = normalizeExt(ext);
  const groups = getGroups();
  const group = groups.find((g) => g.inputs.map(normalizeExt).includes(e));
  if (!group) return [];
  const set = new Set<string>(group.outputs.map(normalizeExt));
  set.delete(e);
  return [...set];
}

/** Frontend'e gönderilecek tam matris. */
export function formatMatrix() {
  const groups = getGroups();
  // Etkin gruplarda gerçekten girdi olan biçimleri "kurulum gerekiyor" listesinden düş
  // (örn. LibreOffice kuruluysa pdf/doc/ppt/odt artık desteklenir, uyarı gösterilmez).
  const supportedInputs = new Set(groups.flatMap((g) => g.inputs.map(normalizeExt)));
  const unsupported = Object.fromEntries(
    Object.entries(UNSUPPORTED).filter(([ext]) => !supportedInputs.has(normalizeExt(ext))),
  );
  return {
    groups: groups.map((g) => ({
      category: g.category,
      label: g.label,
      inputs: [...new Set(g.inputs.map(normalizeExt))],
      outputs: [...new Set(g.outputs.map(normalizeExt))],
    })),
    map: buildLookup(groups),
    unsupported,
    libreoffice: hasLibreOffice(),
  };
}

function buildLookup(groups: FormatGroup[]): Record<string, string[]> {
  const lookup: Record<string, string[]> = {};
  for (const g of groups) {
    for (const inp of g.inputs) {
      const e = normalizeExt(inp);
      lookup[e] = targetsFor(e);
    }
  }
  return lookup;
}
