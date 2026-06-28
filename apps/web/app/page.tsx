'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, Zap, Trash2, Wand2, ShieldCheck } from 'lucide-react';
import { Background } from '@/components/Background';
import { Dropzone } from '@/components/Dropzone';
import { FileCard } from '@/components/FileCard';
import { fetchFormats, convertFile } from '@/lib/api';
import { getExt } from '@/lib/utils';
import type { ConvertJob, FormatMatrix } from '@/lib/types';

let counter = 0;
const nextId = () => `job_${Date.now()}_${counter++}`;

export default function Home() {
  const [matrix, setMatrix] = useState<FormatMatrix | null>(null);
  const [jobs, setJobs] = useState<ConvertJob[]>([]);
  const [matrixError, setMatrixError] = useState(false);

  useEffect(() => {
    fetchFormats()
      .then(setMatrix)
      .catch(() => setMatrixError(true));
  }, []);

  const categoryOf = useCallback(
    (ext: string) => {
      if (!matrix) return null;
      const g = matrix.groups.find((grp) => grp.inputs.includes(ext));
      return g ? g.category : null;
    },
    [matrix],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      const newJobs: ConvertJob[] = files.map((file) => {
        const ext = getExt(file.name);
        const targets = matrix?.map[ext] ?? [];
        return {
          id: nextId(),
          file,
          ext,
          category: categoryOf(ext),
          targets,
          target: targets[0] ?? null,
          status: 'idle',
          progress: 0,
          unsupportedReason: targets.length === 0 ? matrix?.unsupported?.[ext] : undefined,
        };
      });
      setJobs((prev) => [...newJobs, ...prev]);
    },
    [matrix, categoryOf],
  );

  const setTarget = (id: string, target: string) =>
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, target } : j)));

  const removeJob = (id: string) => setJobs((prev) => prev.filter((j) => j.id !== id));

  const clearAll = () => setJobs((prev) => prev.filter((j) => j.status === 'uploading'));

  const runOne = useCallback(async (job: ConvertJob) => {
    if (!job.target) return;
    setJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, status: 'uploading', progress: 0, error: undefined } : j)),
    );
    try {
      const res = await convertFile(job.file, job.target, (p) =>
        setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, progress: p } : j))),
      );
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id
            ? { ...j, status: 'done', resultId: res.id, resultName: res.filename, resultSize: res.size }
            : j,
        ),
      );
    } catch (err: any) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id ? { ...j, status: 'error', error: err?.message ?? 'Hata' } : j,
        ),
      );
    }
  }, []);

  const convertAll = useCallback(() => {
    jobs
      .filter((j) => (j.status === 'idle' || j.status === 'error') && j.target && j.category)
      .forEach(runOne);
  }, [jobs, runOne]);

  const pending = useMemo(
    () => jobs.filter((j) => (j.status === 'idle' || j.status === 'error') && j.category),
    [jobs],
  );
  const working = jobs.some((j) => j.status === 'uploading');

  return (
    <main className="relative min-h-screen">
      <Background />

      <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-12 sm:pt-20">
        {/* Başlık */}
        <header className="mb-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-brand-200"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Görüntü · Ses · Video · Belge · Tablo · Font · Sertifika · Arşiv
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-balance text-4xl font-bold tracking-tight sm:text-6xl"
          >
            <span className="text-gradient">Her dosyayı</span>
            <br />
            saniyeler içinde dönüştür
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mx-auto mt-4 max-w-xl text-balance text-slate-400"
          >
            Sürükle, formatı seç, indir. Kayıt yok, reklam yok. Dosyaların sunucuda saklanmaz,
            1 saat içinde otomatik silinir.
          </motion.p>
        </header>

        {/* Yükleme alanı */}
        <Dropzone onFiles={addFiles} />

        {matrixError && (
          <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-300">
            API'ye bağlanılamadı. Backend çalışıyor mu? (<code>npm run dev</code>)
          </p>
        )}

        {/* Eylem çubuğu */}
        <AnimatePresence>
          {jobs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 flex items-center justify-between gap-3"
            >
              <p className="text-sm text-slate-400">
                <span className="font-semibold text-white">{jobs.length}</span> dosya kuyrukta
              </p>
              <div className="flex gap-2">
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Temizle
                </button>
                <button
                  onClick={convertAll}
                  disabled={pending.length === 0 || working}
                  className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-brand-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow-lg transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Wand2 className="h-4 w-4" />
                  {working ? 'Dönüştürülüyor…' : `Tümünü Dönüştür${pending.length ? ` (${pending.length})` : ''}`}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dosya listesi */}
        <div className="mt-4 space-y-3">
          <AnimatePresence mode="popLayout">
            {jobs.map((job) => (
              <FileCard key={job.id} job={job} onTargetChange={setTarget} onRemove={removeJob} />
            ))}
          </AnimatePresence>
        </div>

        {/* Özellikler */}
        {jobs.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            {[
              { icon: Zap, title: 'Hızlı', desc: 'Yerel motorlarla anında dönüştürme' },
              { icon: ShieldCheck, title: 'Gizli', desc: 'Dosyalar 1 saatte otomatik silinir' },
              { icon: Sparkles, title: '70+ format', desc: '9 kategori: görüntü, ses, video, font…' },
            ].map((f) => (
              <div key={f.title} className="glass rounded-2xl p-5">
                <f.icon className="mb-3 h-6 w-6 text-brand-300" />
                <h4 className="font-semibold text-white">{f.title}</h4>
                <p className="mt-1 text-sm text-slate-400">{f.desc}</p>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      <footer className="border-t border-white/5 py-8 text-center text-sm text-slate-500">
        <p className="flex items-center justify-center gap-1.5">
          <span className="font-semibold text-gradient">file-convert</span>
          · Next.js + Nest.js ile yapıldı
        </p>
      </footer>
    </main>
  );
}
