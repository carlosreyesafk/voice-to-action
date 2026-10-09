"use client";

import { useState } from "react";
import type { TaskItem } from "../../lib/nlp";
import type { Recording } from "../../lib/storage";
import { recordingToText, downloadText } from "../../lib/storage";
import { exportFileName, formatTime } from "../../lib/audio";

interface Props {
  recording: Recording;
  onTasksChange: (tasks: TaskItem[]) => void;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback para contextos sin permiso de clipboard
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

export default function ResultsPanel({ recording, onTasksChange }: Props) {
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const toggleTask = (id: string) => {
    const next = recording.tasks.map((t) =>
      t.id === id ? { ...t, done: !t.done } : t
    );
    onTasksChange(next);
  };

  const doneCount = recording.tasks.filter((t) => t.done).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Header del resultado */}
      <div className="glass rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white">
              {recording.title}
            </h2>
            <p className="text-xs text-white/50 mt-1">
              {new Date(recording.createdAt).toLocaleString("es-DO", {
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              · {formatTime(recording.durationSec)} de audio
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={async () =>
                flash(
                  (await copyText(recording.transcript))
                    ? "Transcripción copiada ✓"
                    : "No se pudo copiar"
                )
              }
              className="text-xs px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 transition"
            >
              📋 Copiar transcripción
            </button>
            <button
              onClick={async () =>
                flash(
                  (await copyText(recording.summary))
                    ? "Resumen copiado ✓"
                    : "No se pudo copiar"
                )
              }
              className="text-xs px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 transition"
            >
              📝 Copiar resumen
            </button>
            <button
              onClick={() => {
                downloadText(
                  exportFileName(new Date(recording.createdAt)),
                  recordingToText(recording)
                );
                flash("Archivo .txt descargado ✓");
              }}
              className="text-xs px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 text-white font-medium transition"
            >
              ⬇ Exportar .txt
            </button>
          </div>
        </div>
        {toast && (
          <div className="mt-3 inline-block text-xs px-3 py-1.5 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/25">
            {toast}
          </div>
        )}
      </div>

      {/* Resumen ejecutivo */}
      <section className="glass rounded-2xl p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-violet-300 mb-3">
          <span className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-400/25 flex items-center justify-center text-sm">
            ✨
          </span>
          Resumen ejecutivo
        </h3>
        <p className="text-white/85 leading-relaxed text-[15px]">
          {recording.summary || "No se pudo generar un resumen."}
        </p>
      </section>

      {/* Tareas accionables */}
      <section className="glass rounded-2xl p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-cyan-300 mb-1">
          <span className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-400/25 flex items-center justify-center text-sm">
            ✅
          </span>
          Tareas accionables
          {recording.tasks.length > 0 && (
            <span className="ml-auto text-[11px] normal-case tracking-normal text-white/50 font-normal">
              {doneCount}/{recording.tasks.length} completadas
            </span>
          )}
        </h3>
        {recording.tasks.length === 0 ? (
          <p className="text-sm text-white/45 mt-3 leading-relaxed">
            No se detectaron tareas en esta grabación. Prueba frases como
            “tengo que…”, “hay que…”, “no olvidar…” o “pendiente…”.
          </p>
        ) : (
          <>
            {recording.tasks.length > 0 && (
              <div className="mt-2 mb-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all duration-300"
                  style={{
                    width: `${(doneCount / recording.tasks.length) * 100}%`,
                  }}
                />
              </div>
            )}
            <ul className="flex flex-col gap-2 mt-2">
              {recording.tasks.map((t) => (
                <li key={t.id}>
                  <label className="checkbox-task flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => toggleTask(t.id)}
                      className="mt-1 w-4 h-4 accent-cyan-400 shrink-0 cursor-pointer"
                    />
                    <span className="text-sm text-white/85 leading-relaxed">
                      {t.text}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Puntos clave */}
      <section className="glass rounded-2xl p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-fuchsia-300 mb-3">
          <span className="w-7 h-7 rounded-lg bg-fuchsia-500/15 border border-fuchsia-400/25 flex items-center justify-center text-sm">
            💡
          </span>
          Puntos clave
        </h3>
        {recording.keyPoints.length === 0 ? (
          <p className="text-sm text-white/45">Sin puntos clave detectados.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {recording.keyPoints.map((p, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-white/80 leading-relaxed">{p}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Transcripción completa */}
      <details className="glass rounded-2xl p-5 sm:p-6 group">
        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wider text-white/60 hover:text-white/90 transition list-none flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm">
            🎙️
          </span>
          Transcripción completa
          <span className="ml-auto text-xs normal-case tracking-normal text-white/40 group-open:rotate-180 transition">
            ▼
          </span>
        </summary>
        <p className="mt-4 text-sm text-white/70 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto pr-2">
          {recording.transcript || "(vacía)"}
        </p>
      </details>
    </div>
  );
}
