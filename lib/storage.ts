/**
 * Historial persistente en localStorage.
 */
import type { TaskItem } from "./nlp";

export interface Recording {
  id: string;
  title: string;
  createdAt: number;
  transcript: string;
  summary: string;
  tasks: TaskItem[];
  keyPoints: string[];
  durationSec: number;
}

const STORAGE_KEY = "voice-to-action:recordings:v1";

function readAll(): Recording[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Recording[];
  } catch {
    return [];
  }
}

export function loadRecordings(): Recording[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

export function saveRecording(rec: Recording): Recording[] {
  const all = readAll();
  all.push(rec);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // localStorage lleno o bloqueado: se ignora sin romper la app.
  }
  return loadRecordings();
}

export function deleteRecording(id: string): Recording[] {
  const all = readAll().filter((r) => r.id !== id);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // noop
  }
  return loadRecordings();
}

export function updateRecordingTasks(id: string, tasks: TaskItem[]): void {
  const all = readAll().map((r) => (r.id === id ? { ...r, tasks } : r));
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // noop
  }
}

/** Texto plano para exportar una grabación como .txt */
export function recordingToText(rec: Recording): string {
  const date = new Date(rec.createdAt).toLocaleString("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const lines = [
    `VOICE-TO-ACTION — ${rec.title}`,
    `Fecha: ${date}`,
    `Duración: ${Math.floor(rec.durationSec / 60)}:${String(
      rec.durationSec % 60
    ).padStart(2, "0")}`,
    "",
    "━━━━━━━━━━━━━━━━━━━",
    "RESUMEN EJECUTIVO",
    "━━━━━━━━━━━━━━━━━━━",
    rec.summary || "(sin resumen)",
    "",
    "━━━━━━━━━━━━━━━━━━━",
    "TAREAS ACCIONABLES",
    "━━━━━━━━━━━━━━━━━━━",
    rec.tasks.length === 0
      ? "(no se detectaron tareas)"
      : rec.tasks
          .map((t) => `${t.done ? "☑" : "☐"} ${t.text}`)
          .join("\n"),
    "",
    "━━━━━━━━━━━━━━━━━━━",
    "PUNTOS CLAVE",
    "━━━━━━━━━━━━━━━━━━━",
    rec.keyPoints.length === 0
      ? "(sin puntos clave)"
      : rec.keyPoints.map((p) => `• ${p}`).join("\n"),
    "",
    "━━━━━━━━━━━━━━━━━━━",
    "TRANSCRIPCIÓN COMPLETA",
    "━━━━━━━━━━━━━━━━━━━",
    rec.transcript || "(sin transcripción)",
    "",
    "— Generado con voice-to-action (Whisper en tu navegador) —",
  ];
  return lines.join("\n");
}

export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
