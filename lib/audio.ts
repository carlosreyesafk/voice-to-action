/**
 * Utilidades de audio:
 * - Decodifica un Blob (webm/opus de MediaRecorder) a Float32Array mono @ 16kHz,
 *   que es lo que Whisper espera.
 * - Formatea el timer de grabación.
 */

export const WHISPER_SAMPLE_RATE = 16000;

/**
 * Convierte un blob de audio (p. ej. audio/webm;codecs=opus) a PCM mono 16kHz.
 * Usa OfflineAudioContext para hacer el resampleo en el hilo adecuado.
 */
export async function blobToPcm16k(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext({ sampleRate: WHISPER_SAMPLE_RATE });

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  } catch (err) {
    await audioCtx.close();
    throw new Error(
      "No se pudo decodificar el audio. Intenta grabar de nuevo."
    );
  }

  // Mezcla a mono
  const channels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const mono = new Float32Array(length);
  if (channels === 1) {
    mono.set(audioBuffer.getChannelData(0));
  } else {
    const data: Float32Array[] = [];
    for (let c = 0; c < channels; c++) data.push(audioBuffer.getChannelData(c));
    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (let c = 0; c < channels; c++) sum += data[c][i];
      mono[i] = sum / channels;
    }
  }

  await audioCtx.close();

  // Si el buffer decodificado ya está a 16kHz, listo.
  if (audioBuffer.sampleRate === WHISPER_SAMPLE_RATE) return mono;

  // Resampleo manual (lineal) en caso de que decodeAudioData no haya
  // respetado el sampleRate solicitado.
  const ratio = audioBuffer.sampleRate / WHISPER_SAMPLE_RATE;
  const outLen = Math.floor(mono.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const src = i * ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(i0 + 1, mono.length - 1);
    const frac = src - i0;
    out[i] = mono[i0] * (1 - frac) + mono[i1] * frac;
  }
  return out;
}

/** mm:ss */
export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Nombre de archivo .txt: voice-to-action_2026-10-09_12-57.txt */
export function exportFileName(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `voice-to-action_${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(
    date.getDate()
  )}_${p(date.getHours())}-${p(date.getMinutes())}.txt`;
}
