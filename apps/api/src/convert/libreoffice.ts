import { execFile } from 'child_process';
import { existsSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';

/** soffice çağrısı için üst sınır. Bazı çizimler içe-aktarıcıyı askıya alabildiğinden zorunlu. */
const SOFFICE_TIMEOUT = 90_000;

/**
 * soffice'i sert timeout ile çalıştırır; süre dolarsa TÜM süreç ağacını öldürür.
 * LibreOffice launcher (soffice.exe) işi alt süreç soffice.bin'e devrettiğinden, yalnız
 * launcher'a sinyal göndermek yetmez — Windows'ta `taskkill /T` ile ağaç komple kapatılır.
 * Aksi halde takılan bir dönüşüm hem isteği hem soffice.bin'i süresiz kilitler.
 */
function runSoffice(soffice: string, args: string[]): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let timer: NodeJS.Timeout;
    let timedOut = false;
    const child = execFile(
      soffice,
      args,
      { windowsHide: true, maxBuffer: 64 * 1024 * 1024 },
      (err) => {
        clearTimeout(timer);
        if (timedOut) return;
        if (err) reject(err);
        else resolve();
      },
    );
    timer = setTimeout(() => {
      timedOut = true;
      const pid = child.pid;
      if (pid) {
        if (process.platform === 'win32') {
          execFile('taskkill', ['/F', '/T', '/PID', String(pid)], () => undefined);
        } else {
          try {
            process.kill(pid, 'SIGKILL');
          } catch {
            /* zaten ölmüş olabilir */
          }
        }
      }
      reject(new Error('LibreOffice zaman aşımına uğradı (çizim çok karmaşık veya içe-aktarma takıldı).'));
    }, SOFFICE_TIMEOUT);
  });
}

/**
 * LibreOffice (soffice) headless dönüştürme köprüsü.
 * Office belge/sunu/tablo formatlarını yüksek sadakatle çevirir.
 * Kurulu değilse isAvailable() false döner ve ilgili formatlar UI'da listelenmez.
 */

const CANDIDATE_PATHS = [
  process.env.SOFFICE_PATH,
  'C:/Program Files/LibreOffice/program/soffice.exe',
  'C:/Program Files (x86)/LibreOffice/program/soffice.exe',
  '/usr/bin/soffice',
  '/usr/local/bin/soffice',
  '/Applications/LibreOffice.app/Contents/MacOS/soffice',
].filter(Boolean) as string[];

let cachedPath: string | null | undefined;

/** soffice yürütülebilir dosyasının yolunu bulur (önbellekli). */
export function findSoffice(): string | null {
  if (cachedPath !== undefined) return cachedPath;
  for (const p of CANDIDATE_PATHS) {
    if (existsSync(p)) {
      cachedPath = p;
      return p;
    }
  }
  cachedPath = null;
  return null;
}

/** Önbelleği sıfırla (kurulum sonrası yeniden tespit için). */
export function resetSofficeCache(): void {
  cachedPath = undefined;
}

export function isAvailable(): boolean {
  return findSoffice() !== null;
}

/**
 * Bir tamponu LibreOffice ile hedef formata çevirir.
 * Her çağrı için izole bir kullanıcı profili kullanır → eşzamanlı çağrılar çakışmaz.
 */
export async function libreConvert(
  input: Buffer,
  sourceExt: string,
  targetExt: string,
): Promise<Buffer> {
  const soffice = findSoffice();
  if (!soffice) throw new Error('LibreOffice (soffice) bulunamadı — kurulu mu?');

  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'filoffice-'));
  const profile = path.join(work, 'profile');
  const inPath = path.join(work, `in.${sourceExt}`);
  const outPath = path.join(work, `in.${targetExt}`);

  await fs.writeFile(inPath, input);

  try {
    const profileUri = 'file:///' + profile.replace(/\\/g, '/');
    const inFilter = inFilterFor(sourceExt);
    const args = [
      '--headless',
      '--norestore',
      '--nolockcheck',
      `-env:UserInstallation=${profileUri}`,
      // PDF varsayılan olarak Draw'a açılır (Writer'a değil) → docx/metin export filtresi olmaz.
      // writer_pdf_import ile PDF metnini Writer belgesi olarak içe aktarmaya zorla.
      ...(inFilter ? [`--infilter=${inFilter}`] : []),
      '--convert-to',
      filterFor(targetExt),
      '--outdir',
      work,
      inPath,
    ];
    await runSoffice(soffice, args);

    if (!existsSync(outPath)) {
      throw new Error(`LibreOffice çıktı üretmedi (${sourceExt}→${targetExt}).`);
    }
    return await fs.readFile(outPath);
  } finally {
    fs.rm(work, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** Bazı kaynaklar için içe-aktarma filtresi gerekir (yoksa boş döner → varsayılan tespit). */
function inFilterFor(source: string): string | null {
  // PDF metnini Writer'a aktar; aksi halde Draw'a açılır ve word/metin export'u başarısız olur.
  if (source === 'pdf') return 'writer_pdf_import';
  // HTML'i Writer'a aktar (Writer/Web değil); aksi halde docx export filtresi bulunamaz.
  if (source === 'html') return 'HTML (StarWriter)';
  return null;
}

/** Bazı hedefler için açık filtre gerekir; çoğu için uzantı yeterlidir. */
function filterFor(target: string): string {
  switch (target) {
    case 'pdf':
      return 'pdf';
    case 'html':
      return 'html:XHTML Writer File';
    case 'txt':
      return 'txt:Text';
    default:
      return target; // docx, odt, rtf, pptx, odp, xlsx, ods, csv, doc …
  }
}
