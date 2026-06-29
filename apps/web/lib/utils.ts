import type { Category } from './types';

export function getExt(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  let e = m ? m[1] : '';
  if (e === 'jpeg') e = 'jpg';
  if (e === 'tif') e = 'tiff';
  if (e === 'htm') e = 'html';
  if (e === 'markdown') e = 'md';
  if (e === 'mpeg') e = 'mpg';
  return e;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const CATEGORY_META: Record<
  Category,
  { label: string; gradient: string; ring: string; emoji: string }
> = {
  image: {
    label: 'Görüntü',
    gradient: 'from-fuchsia-500 to-pink-500',
    ring: 'ring-fuchsia-400/40',
    emoji: '🖼️',
  },
  audio: {
    label: 'Ses',
    gradient: 'from-emerald-500 to-teal-500',
    ring: 'ring-emerald-400/40',
    emoji: '🎵',
  },
  video: {
    label: 'Video',
    gradient: 'from-orange-500 to-red-500',
    ring: 'ring-orange-400/40',
    emoji: '🎬',
  },
  document: {
    label: 'Belge',
    gradient: 'from-blue-500 to-indigo-500',
    ring: 'ring-blue-400/40',
    emoji: '📄',
  },
  richdoc: {
    label: 'Word/ODT',
    gradient: 'from-sky-500 to-blue-600',
    ring: 'ring-sky-400/40',
    emoji: '📝',
  },
  presentation: {
    label: 'Sunu',
    gradient: 'from-orange-500 to-amber-600',
    ring: 'ring-orange-400/40',
    emoji: '📽️',
  },
  spreadsheet: {
    label: 'Tablo',
    gradient: 'from-green-500 to-emerald-600',
    ring: 'ring-green-400/40',
    emoji: '📊',
  },
  data: {
    label: 'Veri',
    gradient: 'from-amber-500 to-yellow-500',
    ring: 'ring-amber-400/40',
    emoji: '🗂️',
  },
  font: {
    label: 'Yazı Tipi',
    gradient: 'from-violet-500 to-purple-600',
    ring: 'ring-violet-400/40',
    emoji: '🔤',
  },
  cert: {
    label: 'Sertifika',
    gradient: 'from-slate-500 to-gray-600',
    ring: 'ring-slate-400/40',
    emoji: '🔐',
  },
  archive: {
    label: 'Arşiv',
    gradient: 'from-rose-500 to-pink-600',
    ring: 'ring-rose-400/40',
    emoji: '📦',
  },
  cad: {
    label: 'CAD/Çizim',
    gradient: 'from-cyan-500 to-sky-600',
    ring: 'ring-cyan-400/40',
    emoji: '📐',
  },
};
