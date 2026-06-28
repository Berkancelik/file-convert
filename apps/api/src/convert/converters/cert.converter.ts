import * as forge from 'node-forge';
import { normalizeExt } from '../formats';

/**
 * Sertifika dönüştürücü (node-forge).
 * X.509 sertifikalarını biçimler arası çevirir: pem ↔ der/crt.
 * (.cer/.crt PEM veya DER olabilir; içerik otomatik tespit edilir.)
 */
export async function convertCert(
  input: Buffer,
  sourceExt: string,
  targetExt: string,
): Promise<{ buffer: Buffer; ext: string }> {
  const target = normalizeExt(targetExt);

  // 1) Girişi forge sertifikasına ayrıştır (PEM/DER otomatik).
  const cert = parseCertificate(input);

  // 2) Hedefe yaz.
  if (target === 'pem') {
    return { buffer: Buffer.from(forge.pki.certificateToPem(cert), 'utf8'), ext: 'pem' };
  }
  // der veya crt → DER ikili biçim
  const derBytes = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  return { buffer: Buffer.from(derBytes, 'binary'), ext: target === 'crt' ? 'crt' : 'der' };
}

function parseCertificate(input: Buffer): forge.pki.Certificate {
  const head = input.subarray(0, 64).toString('utf8');
  if (head.includes('-----BEGIN')) {
    const pem = input.toString('utf8');
    // PEM birden çok blok içerebilir; ilk CERTIFICATE bloğunu al.
    const match = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/);
    if (!match) throw new Error('PEM içinde sertifika bloğu bulunamadı.');
    return forge.pki.certificateFromPem(match[0]);
  }
  // DER ikili
  try {
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(input.toString('binary')));
    return forge.pki.certificateFromAsn1(asn1);
  } catch (e: any) {
    throw new Error(`Sertifika çözülemedi (geçerli PEM/DER X.509 mı?): ${e.message}`);
  }
}
