'use client';

import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, FilePlus2 } from 'lucide-react';

interface Props {
  onFiles: (files: File[]) => void;
}

export function Dropzone({ onFiles }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length) onFiles(files);
    },
    [onFiles],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`glass-strong group relative cursor-pointer rounded-3xl p-10 text-center transition-all duration-300 sm:p-16 ${
        dragging
          ? 'scale-[1.02] ring-2 ring-brand-400 shadow-[0_0_60px_-15px_rgba(99,102,241,0.6)]'
          : 'hover:ring-1 hover:ring-white/20'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = '';
        }}
      />

      <div className="mx-auto flex max-w-md flex-col items-center gap-5">
        <div
          className={`relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-fuchsia-500 shadow-lg transition-transform duration-300 ${
            dragging ? 'animate-float' : 'group-hover:scale-110'
          }`}
        >
          <UploadCloud className="h-9 w-9 text-white" strokeWidth={1.8} />
          <span className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-brand-600 shadow">
            <FilePlus2 className="h-4 w-4" />
          </span>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-white">
            {dragging ? 'Bırak, gerisini biz hallederiz!' : 'Dosyalarını buraya sürükle'}
          </h3>
          <p className="mt-1.5 text-sm text-slate-400">
            ya da <span className="font-medium text-brand-300">tıkla ve seç</span> · görüntü, ses,
            video, belge · birden fazla dosya
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500">
          {['JPG', 'PNG', 'HEIC', 'WEBP', 'MP4', 'MP3', 'PDF', 'XLSX', 'TTF', 'ZIP', 'DWG', '+60'].map((f) => (
            <span key={f} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
              {f}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
