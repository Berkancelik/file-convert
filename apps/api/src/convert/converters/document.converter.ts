import mammoth from 'mammoth';
import { marked } from 'marked';
import PDFDocument from 'pdfkit';
import { normalizeExt } from '../formats';
import { escapeHtml, wrapHtml } from './_shared';

/**
 * Belge dönüştürücü (mammoth + marked + pdfkit).
 * docx, md, html, txt → html, txt, md, pdf
 * Kaynağı ortak ara biçime (HTML + düz metin) getirir, sonra hedefe yazar.
 */
export async function convertDocument(
  input: Buffer,
  sourceExt: string,
  targetExt: string,
): Promise<{ buffer: Buffer; ext: string }> {
  const source = normalizeExt(sourceExt);
  const target = normalizeExt(targetExt);

  let html: string;
  let plain: string;

  switch (source) {
    case 'docx': {
      const res = await mammoth.convertToHtml({ buffer: input });
      html = res.value;
      plain = htmlToText(html);
      break;
    }
    case 'md': {
      const text = input.toString('utf8');
      html = await marked.parse(text);
      plain = text;
      break;
    }
    case 'html': {
      html = input.toString('utf8');
      plain = htmlToText(html);
      break;
    }
    case 'txt': {
      plain = input.toString('utf8');
      html = `<pre>${escapeHtml(plain)}</pre>`;
      break;
    }
    default:
      throw new Error(`Desteklenmeyen belge kaynağı: ${source}`);
  }

  switch (target) {
    case 'html':
      return { buffer: Buffer.from(wrapHtml(html), 'utf8'), ext: 'html' };
    case 'txt':
      return { buffer: Buffer.from(plain, 'utf8'), ext: 'txt' };
    case 'md':
      return { buffer: Buffer.from(htmlToMarkdown(html), 'utf8'), ext: 'md' };
    case 'pdf':
      return { buffer: await textToPdf(plain), ext: 'pdf' };
    default:
      throw new Error(`Desteklenmeyen belge hedefi: ${target}`);
  }
}

async function textToPdf(text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.font('Helvetica').fontSize(11).text(text || '(boş)', { align: 'left' });
    doc.end();
  });
}

/** Görünür olmayan blokları (head/style/script) atar — metne CSS/JS sızmasını önler. */
function stripNonContent(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');
}

function htmlToText(html: string): string {
  return stripNonContent(html)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function htmlToMarkdown(html: string): string {
  return stripNonContent(html)
    .replace(/<h1[^>]*>(.*?)<\/h1>/gis, '# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gis, '## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gis, '### $1\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gis, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gis, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gis, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gis, '*$1*')
    .replace(/<a[^>]*href="(.*?)"[^>]*>(.*?)<\/a>/gis, '[$2]($1)')
    .replace(/<li[^>]*>(.*?)<\/li>/gis, '- $1\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
