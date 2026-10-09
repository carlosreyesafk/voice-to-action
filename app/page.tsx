"use client";

import { useCallback, useEffect, useState } from "react";
import Recorder from "./components/Recorder";
import TranscriptionStatus from "./components/TranscriptionStatus";
import ResultsPanel from "./components/ResultsPanel";
import HistoryPanel from "./components/HistoryPanel";
import { blobToPcm16k } from "../lib/audio";
import { transcribeAudio, type ModelLoadProgress } from "../lib/whisper";
import { analyzeTranscript, autoTitle, type TaskItem } from "../lib/nlp";
import {
  loadRecordings,
  saveRecording,
  deleteRecording,
  updateRecordingTasks,
  type Recording,
} from "../lib/storage";

type Stage = "idle" | "decoding" | "loading-model" | "transcribing" | "analyzing";

export default function Home() {
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState<ModelLoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modelEverLoaded, setModelEverLoaded] = useState(false);

  useEffect(() => {
    setRecordings(loadRecordings());
    try {
      setModelEverLoaded(
        window.localStorage.getItem("voice-to-action:model-loaded") === "1"
      );
    } catch {
      /* noop */
    }
  }, []);

  const active = recordings.find((r) => r.id === activeId) ?? null;
  const busy = stage !== "idle";

  const handleRecordingComplete = useCallback(
    async (blob: Blob, durationSec: number) => {
      setError(null);
      try {
        // 1. Decodificar a PCM 16kHz mono
        setStage("decoding");
        setProgress({ status: "loading", progress: 8, label: "Preparando tu audio…" });
        const pcm = await blobToPcm16k(blob);

        // 2. Transcribir con Whisper (navegador)
        setStage("loading-model");
        const { text } = await transcribeAudio(pcm, (p) => {
          setProgress(p);
          if (p.status === "ready") {
            try {
              window.localStorage.setItem("voice-to-action:model-loaded", "1");
            } catch {
              /* noop */
            }
            setModelEverLoaded(true);
          }
        });

        if (!text) {
          throw new Error(
            "EMPTY_TRANSCRIPT: No se detectó voz clara en el audio. Habla más cerca del micrófono e intenta de nuevo."
          );
        }

        // 3. Análisis local
        setStage("transcribing");
        setProgress({ status: "loading", progress: 100, label: "Transcribiendo tu audio…" });
        await new Promise((r) => setTimeout(r, 50)); // deja pintar el estado
        setStage("analyzing");
        setProgress({
          status: "loading",
          progress: 100,
          label: "Generando resumen, tareas y puntos clave…",
        });

        const analysis = analyzeTranscript(text);
        const rec: Recording = {
          id: `rec-${Date.now()}`,
          title: autoTitle(),
          createdAt: Date.now(),
          transcript: text,
          summary: analysis.summary,
          tasks: analysis.tasks,
          keyPoints: analysis.keyPoints,
          durationSec,
        };

        const next = saveRecording(rec);
        setRecordings(next);
        setActiveId(rec.id);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Ocurrió un error inesperado.";
        if (msg.startsWith("MODEL_LOAD_FAILED")) {
          setError(
            "No se pudo descargar el modelo Whisper. Revisa tu conexión a internet e intenta de nuevo (solo se descarga una vez)."
          );
        } else if (msg.startsWith("TRANSCRIBE_FAILED")) {
          setError(
            "Falló la transcripción. Intenta con un audio más corto o recarga la página."
          );
        } else if (msg.startsWith("EMPTY_TRANSCRIPT")) {
          setError(msg.replace("EMPTY_TRANSCRIPT: ", ""));
        } else {
          setError(msg);
        }
      } finally {
        setStage("idle");
        setProgress(null);
      }
    },
    []
  );

  const handleTasksChange = useCallback(
    (tasks: TaskItem[]) => {
      if (!activeId) return;
      updateRecordingTasks(activeId, tasks);
      setRecordings((prev) =>
        prev.map((r) => (r.id === activeId ? { ...r, tasks } : r))
      );
    },
    [activeId]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const next = deleteRecording(id);
      setRecordings(next);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
    },
    [activeId]
  );

  return (
    <main className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero */}
        <header className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 text-4xl sm:text-5xl mb-3 animate-float">
            🎙️
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
            Voice<span className="text-gradient">-to-Action</span>
          </h1>
          <p className="text-white/60 text-sm sm:text-base mt-3 max-w-xl mx-auto leading-relaxed">
            Graba tu voz 1–2 minutos. Whisper la transcribe{" "}
            <span className="text-white/85 font-medium">
              100% en tu navegador
            </span>{" "}
            y la convierte en resumen ejecutivo, tareas accionables y puntos
            clave. Sin servidores. Sin cuentas.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4 text-[11px]">
            {["🔒 Privado por diseño", "⚡ Whisper en el navegador", "📝 ES + EN"].map(
              (b) => (
                <span
                  key={b}
                  className="px-3 py-1.5 rounded-full glass text-white/60"
                >
                  {b}
                </span>
              )
            )}
          </div>
        </header>

        {/* Error elegante */}
        {error && (
          <div
            className="mb-6 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 flex gap-3"
            role="alert"
          >
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-200">Algo salió mal</p>
              <p className="text-sm text-red-200/70 mt-1 leading-relaxed">
                {error}
              </p>
            </div>
            <button
              onClick={() => setError(null)}
              aria-label="Cerrar error"
              className="text-red-200/60 hover:text-red-200 text-lg leading-none"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* Columna principal */}
          <div className="flex flex-col gap-6 min-w-0">
            <Recorder
              onRecordingComplete={handleRecordingComplete}
              onError={setError}
              busy={busy}
            />

            <TranscriptionStatus
              stage={stage}
              progress={progress}
              firstTime={!modelEverLoaded}
            />

            {active && !busy && (
              <ResultsPanel
                key={active.id}
                recording={active}
                onTasksChange={handleTasksChange}
              />
            )}

            {!active && !busy && (
              <div className="glass rounded-2xl p-8 text-center">
                <div className="text-4xl mb-3">💭</div>
                <p className="text-white/70 font-medium">
                  Tus ideas, convertidas en acción
                </p>
                <p className="text-sm text-white/40 mt-2 max-w-md mx-auto leading-relaxed">
                  Habla de tu proyecto, tu día o tus pendientes. Al detener la
                  grabación obtendrás transcripción, resumen, tareas detectadas
                  automáticamente y puntos clave.
                </p>
              </div>
            )}
          </div>

          {/* Historial */}
          <aside className="lg:sticky lg:top-6">
            <HistoryPanel
              recordings={recordings}
              activeId={activeId}
              onSelect={setActiveId}
              onDelete={handleDelete}
            />
          </aside>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center">
          <p className="text-xs text-white/30 leading-relaxed">
            Hecho con Next.js + Transformers.js · Modelo Xenova/whisper-tiny ·
            Todo el procesamiento ocurre en tu dispositivo.
          </p>
        </footer>
      </div>
    </main>
  );
}
