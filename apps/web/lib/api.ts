import type { FormatMatrix } from './types';

/** Format matrisini çeker. */
export async function fetchFormats(): Promise<FormatMatrix> {
  const res = await fetch('/api/formats', { cache: 'no-store' });
  if (!res.ok) throw new Error('Format listesi alınamadı');
  return res.json();
}

export interface ConvertResponse {
  id: string;
  filename: string;
  size: number;
  mime: string;
}

/**
 * Tek bir dosyayı yükler ve dönüştürür.
 * XHR kullanır çünkü yükleme ilerleme yüzdesi (onprogress) gerekiyor.
 */
export function convertFile(
  file: File,
  target: string,
  onProgress?: (percent: number) => void,
): Promise<ConvertResponse> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file, file.name);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/convert?target=${encodeURIComponent(target)}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Geçersiz sunucu yanıtı'));
        }
      } else {
        let msg = `Hata ${xhr.status}`;
        try {
          const body = JSON.parse(xhr.responseText);
          msg = body.message || msg;
        } catch {
          /* yoksay */
        }
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error('Ağ hatası — API çalışıyor mu?'));
    xhr.send(form);
  });
}

export function downloadUrl(id: string): string {
  return `/api/files/${id}`;
}
