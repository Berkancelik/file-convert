/** Birden fazla dönüştürücünün paylaştığı küçük yardımcılar. */

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function wrapHtml(body: string, title = 'file-convert çıktısı'): string {
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;max-width:960px;margin:40px auto;padding:0 20px;color:#1a1a1a}
  table{border-collapse:collapse;width:100%;font-size:14px}
  th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}
  th{background:#f4f4f5}
  tr:nth-child(even) td{background:#fafafa}
  pre{white-space:pre-wrap;word-wrap:break-word;background:#f6f8fa;padding:16px;border-radius:8px}
</style>
</head>
<body>
${body}
</body>
</html>`;
}

export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) =>
      r
        .map((cell) => {
          const v = String(cell ?? '');
          return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(','),
    )
    .join('\n');
}

/** Tırnak-bilinçli CSV/TSV ayrıştırıcı. */
export function parseDelimited(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const t = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQuotes) {
      if (c === '"') {
        if (t[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delim) { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r[0] ?? '').trim() !== '');
}

export function rowsToHtmlTable(header: string[], body: (string | number)[][]): string {
  const th = header.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const trs = body
    .map((rr) => `<tr>${rr.map((c) => `<td>${escapeHtml(String(c ?? ''))}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
}
