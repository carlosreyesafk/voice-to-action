/**
 * Gestor de Whisper 100% en el navegador con @xenova/transformers.
 * - Import dinámico (nunca se toca en SSR).
 * - Singleton: el pipeline se crea una sola vez y el modelo queda cacheado
 *   por el navegador (IndexedDB / HTTP cache) para próximas visitas.
 * - chunk_length_s: 30 para audios de 1-2 minutos.
 */

export type ModelLoadProgress = {
  status: "loading" | "ready" | "error";
  /** 0..100 */
  progress: number;
  label: string;
};

const MODEL_ID = "Xenova/whisper-tiny";

type PipelineFn = (audio: Float32Array, options?: Record<string, unknown>) => Promise<unknown>;

let pipelinePromise: Promise<PipelineFn> | null = null;

async function getPipeline(
  onProgress: (p: ModelLoadProgress) => void
): Promise<PipelineFn> {
  if (pipelinePromise) return pipelinePromise;

  pipelinePromise = (async () => {
    onProgress({
      status: "loading",
      progress: 2,
      label: "Cargando motor de transcripción…",
    });

    // Import dinámico: solo existe en el cliente, jamás en SSR.
    const { pipeline, env } = await import("@xenova/transformers");

    // Deja que el navegador cachee los pesos del modelo.
    env.allowRemoteModels = true;
    env.allowLocalModels = false;

    const transcriber = (await pipeline("automatic-speech-recognition", MODEL_ID, {
      progress_callback: (data: {
        status?: string;
        progress?: number;
        file?: string;
        loaded?: number;
        total?: number;
      }) => {
        if (data.status === "progress" && typeof data.progress === "number") {
          const pct = Math.round(Math.min(100, Math.max(0, data.progress)));
          onProgress({
            status: "loading",
            progress: pct,
            label: `Descargando modelo Whisper (~40MB)… ${pct}%${
              data.file ? ` — ${shortFile(data.file)}` : ""
            }`,
          });
        } else if (data.status === "done") {
          onProgress({
            status: "loading",
            progress: 95,
            label: "Modelo listo, preparando…",
          });
        }
      },
    })) as PipelineFn;

    onProgress({ status: "ready", progress: 100, label: "Modelo listo" });
    return transcriber;
  })().catch((err) => {
    // Si falla, permite reintentar en la próxima llamada.
    pipelinePromise = null;
    throw err;
  });

  return pipelinePromise;
}

function shortFile(file: string): string {
  const parts = file.split("/");
  return parts[parts.length - 1];
}

export interface TranscribeResult {
  text: string;
}

/**
 * Transcribe audio PCM mono 16kHz. La primera vez descarga el modelo (~40MB);
 * las siguientes usa el cache del navegador.
 */
export async function transcribeAudio(
  pcm: Float32Array,
  onProgress: (p: ModelLoadProgress) => void
): Promise<TranscribeResult> {
  let transcriber: PipelineFn;
  try {
    transcriber = await getPipeline(onProgress);
  } catch (err) {
    onProgress({
      status: "error",
      progress: 0,
      label: "No se pudo cargar el modelo de transcripción.",
    });
    throw new Error(
      "MODEL_LOAD_FAILED: " +
        (err instanceof Error ? err.message : "error desconocido")
    );
  }

  onProgress({ status: "loading", progress: 100, label: "Transcribiendo tu audio…" });

  try {
    const out = (await transcriber(pcm, {
      chunk_length_s: 30,
      stride_length_s: 5,
      // Deja que el modelo detecte el idioma automáticamente.
      return_timestamps: false,
    })) as { text?: string } | { text?: string }[];

    const text = Array.isArray(out)
      ? out.map((c) => c.text ?? "").join(" ").trim()
      : (out.text ?? "").trim();

    return { text };
  } catch (err) {
    throw new Error(
      "TRANSCRIBE_FAILED: " +
        (err instanceof Error ? err.message : "error desconocido")
    );
  }
}
