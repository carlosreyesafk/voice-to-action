# 🎙️ Voice-to-Action

Graba tu voz 1–2 minutos en el navegador → la app la **transcribe con Whisper 100% en tu dispositivo** → genera **resumen ejecutivo**, extrae **tareas accionables** y **puntos clave**. Sin servidores, sin cuentas, sin que tu audio salga del navegador.

🔴 **Demo en vivo:** https://voice-to-action-chachi.vercel.app

---

## ✨ Features

- **🎙️ Grabación con un toque** — MediaRecorder API, timer visible y botón grande de grabar/detener (auto-stop a los 5 min).
- **🌊 Visualizador de onda en tiempo real** — Web Audio API + `AnalyserNode` + canvas, barras con gradiente violeta→cian.
- **🧠 Transcripción local con Whisper** — `@xenova/transformers` con el modelo `Xenova/whisper-tiny`, pipeline `automatic-speech-recognition` con `chunk_length_s: 30`. Estado de "cargando modelo" elegante con progress bar (~40MB la primera vez; luego queda cacheado en el navegador).
- **📝 Resumen ejecutivo** — algoritmo extractivo local: puntúa oraciones por frecuencia de palabras y toma las top (3–4 líneas).
- **✅ Tareas accionables** — detecta patrones en español e inglés ("tengo que", "hay que", "no olvidar", "pendiente", "need to", "don't forget"…). Checkboxes interactivos que persisten.
- **💡 Puntos clave** — bullets con las ideas principales del audio.
- **🕘 Historial** — cada grabación se guarda en `localStorage` (título auto-generado con fecha/hora, transcripción, resumen, tareas). Ver, cargar y borrar anteriores.
- **📋 Botones de acción** — copiar transcripción, copiar resumen, exportar todo como `.txt` descargable.
- **⚠️ Manejo de errores elegante** — sin micrófono, permiso denegado, falla del modelo, audio vacío.

## 🛠️ Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** — dark mode premium, glassmorphism sutil, responsive
- **@xenova/transformers** — Whisper corriendo en el navegador (WebAssembly)
- **Web Audio API / MediaRecorder / Canvas** — captura y visualización
- `localStorage` — historial 100% local

## 🚀 Cómo correrlo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en Chrome, Edge, Firefox o Safari reciente (se necesita micrófono y HTTPS o `localhost`).

> **Nota:** la primera transcripción descarga el modelo Whisper (~40MB). Las siguientes veces es instantáneo porque queda cacheado en tu navegador.

## 📦 Deploy

La app usa `output: 'export'` en `next.config.js`, así que genera un sitio 100% estático:

```bash
npm run build
```

El resultado queda en `out/` y se puede desplegar en Vercel, Netlify, GitHub Pages o cualquier hosting estático.

## 🧩 Estructura

```
app/
  layout.tsx            # Layout raíz + metadata
  page.tsx              # Orquestador principal (client component)
  globals.css           # Estilos globales, glassmorphism, animaciones
  components/
    Recorder.tsx            # Grabación + visualizador de onda en vivo
    TranscriptionStatus.tsx # Progress elegante de carga/transcripción
    ResultsPanel.tsx        # Resumen, tareas, puntos clave, botones
    HistoryPanel.tsx        # Historial en localStorage
lib/
  whisper.ts  # Singleton de Whisper (import dinámico, cache, chunk 30s)
  audio.ts    # Blob webm/opus → PCM 16kHz mono
  nlp.ts      # Resumen extractivo, detección de tareas ES/EN, puntos clave
  storage.ts  # Historial en localStorage + export .txt
```

## 🔒 Privacidad

Todo el procesamiento (grabación, transcripción, análisis) ocurre en tu dispositivo. El único tráfico de red es la descarga inicial del modelo Whisper. Tu voz nunca toca un servidor.
