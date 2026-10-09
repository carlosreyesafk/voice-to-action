"use client";

import type { Recording } from "../../lib/storage";

interface Props {
  recordings: Recording[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Historial de grabaciones guardadas en localStorage. */
export default function HistoryPanel({
  recordings,
  activeId,
  onSelect,
  onDelete,
}: Props) {
  if (recordings.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <div className="text-3xl mb-2">🕘</div>
        <p className="text-sm text-white/60 font-medium">Sin grabaciones todavía</p>
        <p className="text-xs text-white/40 mt-1 leading-relaxed">
          Graba tu primera nota de voz y aparecerá aquí tu historial.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-white/50 px-1 mb-3">
        Historial · {recordings.length}
      </h3>
      <ul className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
        {recordings.map((r) => {
          const active = r.id === activeId;
          const done = r.tasks.filter((t) => t.done).length;
          return (
            <li
              key={r.id}
              className={`group rounded-xl border p-3 transition cursor-pointer ${
                active
                  ? "bg-violet-500/10 border-violet-400/30"
                  : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]"
              }`}
              onClick={() => onSelect(r.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white/90 truncate">
                    {r.title}
                  </p>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    {new Date(r.createdAt).toLocaleDateString("es-DO", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    · {r.tasks.length} tareas
                    {r.tasks.length > 0 && ` (${done} ✓)`}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      window.confirm(`¿Borrar "${r.title}"? Esta acción no se puede deshacer.`)
                    ) {
                      onDelete(r.id);
                    }
                  }}
                  aria-label={`Borrar ${r.title}`}
                  title="Borrar"
                  className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  🗑️
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-white/30 mt-3 px-1 leading-relaxed">
        Todo se guarda solo en este navegador (localStorage). Nada sale de tu
        dispositivo.
      </p>
    </div>
  );
}
