"use client";

import type { ModelLoadProgress } from "../../lib/whisper";

interface Props {
  stage: "idle" | "decoding" | "loading-model" | "transcribing" | "analyzing";
  progress: ModelLoadProgress | null;
  firstTime: boolean;
}

/** Estado elegante de carga del modelo / transcripción con progress bar. */
export default function TranscriptionStatus({ stage, progress, firstTime }: Props) {
  if (stage === "idle") return null;

  const isModelStage = stage === "loading-model";
  const pct = progress?.progress ?? 0;
  const label =
    stage === "decoding"
      ? "Preparando tu audio…"
      : stage === "transcribing"
      ? "Transcribiendo tu audio…"
      : stage === "analyzing"
      ? "Generando resumen, tareas y puntos clave…"
      : progress?.label ?? "Cargando…";

  return (
    <div className="glass rounded-2xl p-5 sm:p-6 w-full" role="status" aria-live="polite">
      <div className="flex items-center gap-4">
        <div className="relative w-11 h-11 shrink-0">
          <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
            <circle
              cx="22"
              cy="22"
              r="19"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="5"
            />
            <circle
              cx="22"
              cy="22"
              r="19"
              fill="none"
              stroke="url(#grad)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 119.4} 119.4`}
              className="transition-all duration-300"
            />
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-white/80">
            {pct}%
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/90 truncate">{label}</p>
          <p className="text-xs text-white/50 mt-0.5">
            {stage === "analyzing"
              ? "Todo se procesa en tu dispositivo, nada sale de tu navegador."
              : "Whisper corre 100% en tu navegador, sin servidores."}
          </p>
        </div>
      </div>

      <div className="mt-4 h-2 rounded-full bg-white/8 overflow-hidden bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-400 to-cyan-400 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {isModelStage && firstTime && (
        <div className="mt-4 flex gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3">
          <svg
            className="w-5 h-5 text-cyan-300 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs text-cyan-100/80 leading-relaxed">
            <span className="font-semibold">Primera vez:</span> se descarga el
            modelo Whisper (~40MB). Tarda un poco, pero queda guardado en tu
            navegador y las próximas veces es instantáneo.
          </p>
        </div>
      )}
    </div>
  );
}
