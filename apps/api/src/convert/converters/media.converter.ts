import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { normalizeExt } from '../formats';

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
}

const AUDIO_ONLY = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'aiff', 'ac3', 'wma', 'amr', 'dts']);

/**
 * Ses ve video dönüştürücü.
 * ffmpeg dosya tabanlı çalıştığı için giriş/çıkış geçici dosyalar üzerinden işlenir.
 */
export async function convertMedia(
  input: Buffer,
  sourceExt: string,
  targetExt: string,
): Promise<Buffer> {
  const target = normalizeExt(targetExt);
  const source = normalizeExt(sourceExt);

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'filconv-'));
  const inPath = path.join(dir, `in.${source}`);
  const outPath = path.join(dir, `out.${target}`);

  try {
    await fs.writeFile(inPath, input);
    await runFfmpeg(inPath, outPath, source, target);
    return await fs.readFile(outPath);
  } finally {
    fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function runFfmpeg(
  inPath: string,
  outPath: string,
  source: string,
  target: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let cmd = ffmpeg(inPath);

    if (AUDIO_ONLY.has(target)) {
      // Ses çıkışı (video → ses çıkarımı dahil): video akışını at.
      cmd = cmd.noVideo();
      cmd = applyAudioCodec(cmd, target);
    } else if (target === 'gif') {
      // Video → animasyonlu GIF (boyutu makul tutmak için 10fps, 480px genişlik).
      cmd = cmd
        .noAudio()
        .outputOptions(['-vf', 'fps=10,scale=480:-1:flags=lanczos', '-loop', '0']);
    } else {
      // Video → video. Çıkışa uygun makul varsayılan codec'ler.
      cmd = applyVideoCodec(cmd, target);
    }

    cmd
      .on('error', (err) => reject(new Error(`ffmpeg hatası: ${err.message}`)))
      .on('end', () => resolve())
      .save(outPath);
  });
}

function applyAudioCodec(cmd: ffmpeg.FfmpegCommand, target: string): ffmpeg.FfmpegCommand {
  switch (target) {
    case 'mp3':
      return cmd.audioCodec('libmp3lame').audioBitrate('192k');
    case 'wav':
      return cmd.audioCodec('pcm_s16le');
    case 'ogg':
      return cmd.audioCodec('libvorbis').audioBitrate('192k');
    case 'opus':
      return cmd.audioCodec('libopus').audioBitrate('128k');
    case 'm4a':
    case 'aac':
      return cmd.audioCodec('aac').audioBitrate('192k');
    case 'flac':
      return cmd.audioCodec('flac');
    case 'aiff':
      return cmd.audioCodec('pcm_s16be');
    case 'ac3':
      return cmd.audioCodec('ac3').audioBitrate('192k');
    case 'wma':
      return cmd.audioCodec('wmav2').audioBitrate('192k');
    case 'amr':
      // AMR-NB yalnızca 8 kHz mono ve dar bit hızlarını destekler.
      return cmd.audioCodec('libopencore_amrnb').audioFrequency(8000).audioChannels(1).audioBitrate('12.2k');
    case 'dts':
      // DCA kodlayıcısı deneyseldir; -strict -2 gerekir.
      return cmd.audioCodec('dca').outputOptions(['-strict', '-2']);
    default:
      return cmd;
  }
}

function applyVideoCodec(cmd: ffmpeg.FfmpegCommand, target: string): ffmpeg.FfmpegCommand {
  switch (target) {
    case 'mp4':
    case 'mov':
    case 'mkv':
    case 'm4v':
    case 'ts':
      return cmd.videoCodec('libx264').audioCodec('aac').outputOptions(['-preset', 'veryfast', '-crf', '23']);
    case 'webm':
      return cmd.videoCodec('libvpx-vp9').audioCodec('libopus').outputOptions(['-b:v', '0', '-crf', '34']);
    case 'avi':
      return cmd.videoCodec('mpeg4').audioCodec('libmp3lame').outputOptions(['-qscale:v', '4']);
    case 'mpg':
      return cmd.videoCodec('mpeg2video').audioCodec('mp2').outputOptions(['-qscale:v', '4']);
    case '3gp':
      // 3GP: boyut çift sayı olmalı; mpeg4 + aac.
      return cmd
        .videoCodec('mpeg4')
        .audioCodec('aac')
        .outputOptions(['-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-q:v', '4']);
    case 'flv':
      // Flash Video: H.264 + AAC (flv muxer her ikisini de destekler).
      return cmd.videoCodec('libx264').audioCodec('aac').outputOptions(['-preset', 'veryfast', '-crf', '23']);
    case 'wmv':
      return cmd.videoCodec('wmv2').audioCodec('wmav2').outputOptions(['-q:v', '4']);
    case 'ogv':
      return cmd.videoCodec('libtheora').audioCodec('libvorbis').outputOptions(['-q:v', '7']);
    default:
      return cmd;
  }
}
