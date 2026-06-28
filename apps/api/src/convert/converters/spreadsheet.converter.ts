import * as XLSX from 'xlsx';
import { normalizeExt } from '../formats';
import { wrapHtml } from './_shared';
import { serializeObject } from './data.converter';

/**
 * Hesap tablosu dönüştürücü (SheetJS).
 * xlsx, xls, ods, csv, tsv → xlsx, xls, ods, csv, tsv, json, html, yaml, xml, toml
 * Ağaç biçimleri (yaml/xml/toml) için ilk sayfa satır-nesnelerine indirilip veri
 * seri hale getiricisine devredilir; böylece tablo ↔ veri aileleri tam bağlanır.
 */
export async function convertSpreadsheet(
  input: Buffer,
  sourceExt: string,
  targetExt: string,
): Promise<{ buffer: Buffer; ext: string }> {
  const source = normalizeExt(sourceExt);
  const target = normalizeExt(targetExt);

  const wb = XLSX.read(input, { type: 'buffer', raw: false });
  const firstSheetName = wb.SheetNames[0];
  const firstSheet = wb.Sheets[firstSheetName];

  switch (target) {
    case 'xlsx':
      return { buffer: bufferOf(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })), ext: 'xlsx' };
    case 'xls':
      return { buffer: bufferOf(XLSX.write(wb, { type: 'buffer', bookType: 'xls' })), ext: 'xls' };
    case 'ods':
      return { buffer: bufferOf(XLSX.write(wb, { type: 'buffer', bookType: 'ods' })), ext: 'ods' };
    case 'csv': {
      const csv = XLSX.utils.sheet_to_csv(firstSheet);
      return { buffer: Buffer.from(csv, 'utf8'), ext: 'csv' };
    }
    case 'tsv': {
      const tsv = XLSX.utils.sheet_to_csv(firstSheet, { FS: '\t' });
      return { buffer: Buffer.from(tsv, 'utf8'), ext: 'tsv' };
    }
    case 'yaml':
    case 'xml':
    case 'toml':
      // Tablo → ağaç biçimi: ilk sayfayı satır-nesneleri dizisine indirip veri katmanına devret.
      return serializeObject(XLSX.utils.sheet_to_json(firstSheet), target);
    case 'json': {
      // Birden çok sayfa varsa { sayfaAdı: satırlar } olarak ver.
      let payload: any;
      if (wb.SheetNames.length > 1) {
        payload = Object.fromEntries(
          wb.SheetNames.map((n) => [n, XLSX.utils.sheet_to_json(wb.Sheets[n])]),
        );
      } else {
        payload = XLSX.utils.sheet_to_json(firstSheet);
      }
      return { buffer: Buffer.from(JSON.stringify(payload, null, 2), 'utf8'), ext: 'json' };
    }
    case 'html': {
      const inner = XLSX.utils.sheet_to_html(firstSheet, { id: 'sheet' });
      return { buffer: Buffer.from(wrapHtml(inner, `${firstSheetName} — file-convert`), 'utf8'), ext: 'html' };
    }
    default:
      throw new Error(`Desteklenmeyen tablo hedefi: ${target}`);
  }
}

function bufferOf(x: any): Buffer {
  return Buffer.isBuffer(x) ? x : Buffer.from(x);
}
