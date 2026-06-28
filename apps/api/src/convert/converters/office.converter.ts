import { marked } from 'marked';
import { libreConvert } from '../libreoffice';
import { normalizeExt } from '../formats';
import { convertDocument } from './document.converter';

/** PDF'in metin ailesine açılırken HTML üzerinden köprülendiği hedefler (html doğrudan LO'dan). */
const PDF_TEXT_TARGETS = new Set(['txt', 'md']);

/**
 * Office dönüştürücü — LibreOffice headless üzerinden (yüksek sadakat).
 * doc/docx/odt/rtf, ppt/pptx/odp, xls/xlsx/ods/csv, pdf → pdf, word, metin ve aralarında.
 *
 * Köprüler:
 *  - Markdown LibreOffice tarafından içe aktarılmaz → önce HTML'e indirilir.
 *  - PDF'in metin hedefleri (txt/md): LO ile HTML'e, sonra belge motoruyla hedefe
 *    (düz Text export'u PDF metin-çerçevelerini güvenilir yakalamaz).
 */
export async function convertOffice(
  input: Buffer,
  sourceExt: string,
  targetExt: string,
): Promise<{ buffer: Buffer; ext: string }> {
  let source = normalizeExt(sourceExt);
  const target = normalizeExt(targetExt);

  // Markdown'u LibreOffice'e vermeden önce HTML'e indir.
  let buf = input;
  if (source === 'md') {
    buf = Buffer.from(await marked.parse(input.toString('utf8')), 'utf8');
    source = 'html';
  }

  // PDF → metin/markdown/html: önce HTML'e çevir, sonra belge motoruyla hedefe.
  if (source === 'pdf' && PDF_TEXT_TARGETS.has(target)) {
    const html = await libreConvert(buf, 'pdf', 'html');
    return convertDocument(html, 'html', target);
  }

  const buffer = await libreConvert(buf, source, target);
  return { buffer, ext: target };
}
