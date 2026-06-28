import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'file-convert — Her dosyayı dönüştür',
  description:
    'Görüntü, ses, video ve belgeleri saniyeler içinde dönüştürün. Convertio benzeri, yenilikçi ve hızlı dosya dönüştürücü.',
  keywords: ['dosya dönüştürücü', 'image converter', 'video converter', 'pdf', 'file-convert'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
