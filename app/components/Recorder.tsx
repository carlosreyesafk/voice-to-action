"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatTime } from "../../lib/audio";

interface RecorderProps {
  onRecordingComplete: (blob: Blob, durationSec: number) => void;
  onError: (message: string) => void;
  busy: boolean;
}

const MAX_SECONDS = 300; // 5 minutos, margen de seguridad

/**
 * Grabación con MediaRecorder + visualizador de onda en tiempo real
 * (Web Audio API → AnalyserNode → canvas).
 */
export default function Recorder({ onRecordingComplete, onError, busy }: RecorderProps) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [starting, setStarting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const recordedSecRef = useRef<number>(0);

  const drawIdleWave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(139,92,246,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }, []);

  const drawLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    ctx.clearRect(0, 0, width, height);

    // Gradiente violeta → cian para las barras
    const grad = ctx.createLinearGradient(0, height, 0, 0);
    grad.addColorStop(0, "#7c3aed");
    grad.addColorStop(0.55, "#a78bfa");
    grad.addColorStop(1, "#22d3ee");
    ctx.fillStyle = grad;

    const bars = 64;
    const step = Math.floor(data.length / bars);
    const barW = width / bars;

    for (let i = 0; i < bars; i++) {
      const v = data[i * step] / 255;
      // Suaviza: altura mínima para que no quede muerto
      const h = Math.max(3, v * height * 0.92);
      const x = i * barW + barW * 0.18;
      const w = barW * 0.64;
      const y = (height - h) / 2;
      const radius = Math.min(w / 2, 4);
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, w, h, radius);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.fill();
    }

    rafRef.current = requestAnimationFrame(drawLoop);
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    cancelAnimationFrame(rafRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* noop */
      }
    }
    recorderRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    drawIdleWave();
  }, [drawIdleWave]);

  useEffect(() => {
    drawIdleWave();
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    recordedSecRef.current = elapsed;
    setRecording(false);
    setStarting(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    cancelAnimationFrame(rafRef.current);
    if (rec && rec.state !== "inactive") {
      rec.stop(); // onstop arma el blob y dispara onRecordingComplete
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (busy || recording || starting) return;
    setStarting(true);
    chunksRef.current = [];

    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        throw new Error(
          "Tu navegador no soporta grabación de audio. Usa Chrome, Edge, Firefox o Safari reciente."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Visualizador en tiempo real
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.78;
      source.connect(analyser);
      analyserRef.current = analyser;
      drawLoop();

      // MediaRecorder
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const type = mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        cleanup();
        if (blob.size === 0) {
          onError("La grabación salió vacía. Intenta de nuevo.");
          return;
        }
        onRecordingComplete(blob, recordedSecRef.current);
      };
      rec.onerror = () => {
        cleanup();
        setRecording(false);
        setStarting(false);
        onError("Error al grabar el audio. Revisa el micrófono e intenta de nuevo.");
      };

      rec.start(250);
      startTimeRef.current = Date.now();
      setSeconds(0);
      setRecording(true);
      setStarting(false);

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= MAX_SECONDS) {
          stopRecording();
        }
      }, 250);
    } catch (err) {
      setStarting(false);
      cleanup();
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        onError(
          "Permiso de micrófono denegado. Actívalo en tu navegador para grabar."
        );
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        onError("No se encontró ningún micrófono en este dispositivo.");
      } else {
        onError(
          err instanceof Error
            ? err.message
            : "No se pudo acceder al micrófono."
        );
      }
    }
  }, [busy, recording, starting, cleanup, drawLoop, onError, onRecordingComplete, stopRecording]);

  return (
    <div className="glass rounded-3xl p-6 sm:p-8 flex flex-col items-center gap-5">
      {/* Visualizador */}
      <div className="w-full">
        <canvas
          ref={canvasRef}
          width={640}
          height={140}
          className="w-full h-[110px] sm:h-[130px] rounded-2xl bg-black/30 border border-white/5"
        />
      </div>

      {/* Timer */}
      <div
        className={`font-mono text-4xl sm:text-5xl tracking-widest tabular-nums ${
          recording ? "text-red-400" : "text-white/80"
        }`}
        aria-live="polite"
      >
        {formatTime(seconds)}
      </div>
      {recording && (
        <p className="text-xs text-white/50 -mt-3">
          Grabando… se detiene sola a los 5:00
        </p>
      )}

      {/* Botón principal */}
      <button
        onClick={recording ? stopRecording : startRecording}
        disabled={busy || starting}
        aria-label={recording ? "Detener grabación" : "Grabar"}
        className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all duration-200 ${
          recording
            ? "bg-red-500 hover:bg-red-600 recording-ring"
            : "bg-gradient-to-br from-violet-500 via-purple-600 to-cyan-500 hover:scale-105 btn-glow"
        } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
      >
        {starting ? (
          <svg
            className="w-10 h-10 text-white animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-90"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        ) : recording ? (
          <span className="w-9 h-9 bg-white rounded-md" aria-hidden />
        ) : (
          <svg
            className="w-11 h-11 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path d="M12 15a3.5 3.5 0 003.5-3.5v-5a3.5 3.5 0 10-7 0v5A3.5 3.5 0 0012 15zm7-3.5a7 7 0 01-14 0H3.5a8.5 8.5 0 007.4 8.44V21.5h2.2v-1.56a8.5 8.5 0 007.4-8.44H19z" />
          </svg>
        )}
      </button>

      <p className="text-sm text-white/60 text-center">
        {busy
          ? "Procesando tu audio…"
          : recording
          ? "Toca el botón para detener"
          : "Toca para grabar · habla 1–2 minutos"}
      </p>
    </div>
  );
}
