'use client';

import { motion } from 'framer-motion';
import {
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  FileQuestion,
} from 'lucide-react';
import type { ConvertJob } from '@/lib/types';
import { CATEGORY_META, formatBytes } from '@/lib/utils';
import { downloadUrl } from '@/lib/api';

interface Props {
  job: ConvertJob;
  onTargetChange: (id: string, target: string) => void;
  onRemove: (id: string) => void;
}

export function FileCard({ job, onTargetChange, onRemove }: Props) {
  const meta = job.category ? CATEGORY_META[job.category] : null;
  const unsupported = !job.category || job.targets.length === 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.25 }}
      className="glass relative flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:p-5"
    >
      {/* İkon */}
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl ${
          meta ? meta.gradient : 'from-slate-600 to-slate-700'
        }`}
      >
        {meta ? <span>{meta.emoji}</span> : <FileQuestion className="h-6 w-6 text-white" />}
      </div>

      {/* Dosya bilgisi */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-white" title={job.file.name}>
          {job.file.name}
        </p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
          <span className="uppercase">{job.ext || '—'}</span>
          <span className="text-slate-600">·</span>
          <span>{formatBytes(job.file.size)}</span>
          {meta && (
            <>
              <span className="text-slate-600">·</span>
              <span>{meta.label}</span>
            </>
          )}
        </p>

        {/* İlerleme çubuğu */}
        {job.status === 'uploading' && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-fuchsia-400"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(job.progress, 8)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
        {job.status === 'error' && (
          <p className="mt-1 text-xs text-red-400">{job.error}</p>
        )}
      </div>

      {/* Hedef seçimi + durum */}
      <div className="flex shrink-0 items-center gap-3">
        {unsupported ? (
          <span
            className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300"
            title={job.unsupportedReason || 'Bu format şu an desteklenmiyor'}
          >
            {job.unsupportedReason ? `⚙ ${job.unsupportedReason}` : 'Desteklenmiyor'}
          </span>
        ) : job.status === 'done' && job.resultId ? (
          <a
            href={downloadUrl(job.resultId)}
            download
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
          >
            <Download className="h-4 w-4" />
            İndir
          </a>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-slate-500" />
              <select
                value={job.target ?? ''}
                disabled={job.status === 'uploading'}
                onChange={(e) => onTargetChange(job.id, e.target.value)}
                className="cursor-pointer rounded-lg border border-white/10 bg-white/5 py-2 pl-3 pr-9 text-sm font-medium text-white outline-none transition focus:border-brand-400 disabled:opacity-50"
              >
                {job.targets.map((t) => (
                  <option key={t} value={t} className="bg-slate-900">
                    {t.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            {job.status === 'uploading' && (
              <Loader2 className="h-5 w-5 animate-spin text-brand-300" />
            )}
          </>
        )}

        {/* Durum rozeti */}
        {job.status === 'done' && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
        {job.status === 'error' && <AlertCircle className="h-5 w-5 text-red-400" />}

        {/* Kaldır */}
        {job.status !== 'uploading' && (
          <button
            onClick={() => onRemove(job.id)}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-white"
            aria-label="Kaldır"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
