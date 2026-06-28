import * as yaml from 'js-yaml';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import * as TOML from '@iarna/toml';
import * as XLSX from 'xlsx';
import { normalizeExt } from '../formats';
import { toCsv, wrapHtml } from './_shared';

/**
 * Veri dönüştürücü. Tüm formatları ortak bir JS nesnesine ayrıştırır,
 * sonra hedefe seri hale getirir.
 * json, yaml, xml, toml → json, yaml, xml, toml, csv, xlsx, html
 */
export async function convertData(
  input: Buffer,
  sourceExt: string,
  targetExt: string,
): Promise<{ buffer: Buffer; ext: string }> {
  const source = normalizeExt(sourceExt);
  const target = normalizeExt(targetExt);
  const text = input.toString('utf8');

  // 1) Ayrıştır → JS nesnesi
  let obj: any;
  switch (source) {
    case 'json':
      obj = JSON.parse(text);
      break;
    case 'yaml':
      obj = yaml.load(text);
      break;
    case 'xml':
      obj = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' }).parse(text);
      break;
    case 'toml':
      obj = TOML.parse(text);
      break;
    default:
      throw new Error(`Desteklenmeyen veri kaynağı: ${source}`);
  }

  // 2) Seri hale getir → hedef
  return serializeObject(obj, target);
}

/**
 * Ortak seri hale getirici — hem veri kaynaklarından hem de tablo dönüştürücüsünden
 * (satır-nesneleri ile) çağrılır. Böylece tablo ↔ veri aileleri tek noktadan beslenir.
 */
export function serializeObject(obj: any, target: string): { buffer: Buffer; ext: string } {
  switch (normalizeExt(target)) {
    case 'json':
      return out(JSON.stringify(obj, null, 2), 'json');
    case 'yaml':
      return out(yaml.dump(obj, { noRefs: true, lineWidth: 120 }), 'yaml');
    case 'xml':
      return out(
        new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_', format: true }).build(
          wrapForXml(obj),
        ),
        'xml',
      );
    case 'toml':
      return out(TOML.stringify(normalizeForToml(obj)), 'toml');
    case 'csv':
      return out(toCsv(toRows(obj)), 'csv');
    case 'xlsx': {
      const ws = XLSX.utils.aoa_to_sheet(toRows(obj));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return { buffer: Buffer.isBuffer(buf) ? buf : Buffer.from(buf), ext: 'xlsx' };
    }
    case 'html': {
      const ws = XLSX.utils.aoa_to_sheet(toRows(obj));
      return out(wrapHtml(XLSX.utils.sheet_to_html(ws, { id: 'sheet' }), 'Veri — file-convert'), 'html');
    }
    default:
      throw new Error(`Desteklenmeyen veri hedefi: ${target}`);
  }
}

function out(s: string, ext: string) {
  return { buffer: Buffer.from(s, 'utf8'), ext };
}

/** XMLBuilder tek kök ister; dizi/ilkel ise <root> ile sarmalar. */
function wrapForXml(obj: any): any {
  if (obj && typeof obj === 'object' && !Array.isArray(obj) && Object.keys(obj).length === 1) {
    return obj;
  }
  return { root: obj };
}

/** TOML kök seviyede nesne ister; dizi/ilkel ise sarmalar. */
function normalizeForToml(obj: any): any {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
  return { value: obj };
}

/** Nesneyi düz satır tablosuna (string[][]) indirger: dizi-of-obj ise sütunlar, değilse anahtar/değer. */
function toRows(obj: any): string[][] {
  const arr: any[] = Array.isArray(obj) ? obj : [obj];
  const allObjects = arr.every((o) => o && typeof o === 'object' && !Array.isArray(o));
  if (allObjects) {
    const header = [...new Set(arr.flatMap((o) => Object.keys(o)))];
    return [header, ...arr.map((o) => header.map((h) => stringifyCell(o[h])))];
  }
  // Düz anahtar/değer
  const rows: string[][] = [['key', 'value']];
  for (const [k, v] of Object.entries(obj ?? {})) rows.push([k, stringifyCell(v)]);
  return rows;
}

function stringifyCell(v: any): string {
  if (v === null || v === undefined) return '';
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
}
