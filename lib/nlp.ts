/**
 * Procesamiento de lenguaje 100% local (sin APIs).
 * - Resumen ejecutivo extractivo (puntaje por frecuencia de palabras)
 * - Detección de tareas accionables por patrones ES/EN
 * - Puntos clave: ideas principales
 */

export interface TaskItem {
  id: string;
  text: string;
  done: boolean;
}

export interface AnalysisResult {
  summary: string;
  tasks: TaskItem[];
  keyPoints: string[];
}

const STOPWORDS_ES = new Set([
  "el", "la", "los", "las", "de", "del", "en", "y", "a", "que", "con", "por",
  "para", "un", "una", "uno", "unos", "se", "su", "sus", "es", "son", "esta",
  "este", "esto", "estas", "estos", "al", "lo", "le", "les", "me", "mi", "mis",
  "nos", "nosotros", "yo", "tu", "tus", "él", "ella", "ellos", "ellas", "pero",
  "como", "más", "muy", "todo", "todos", "toda", "todas", "hay", "fue",
  "fueron", "era", "eran", "han", "hemos", "tiene", "tienen", "tengo", "hacer",
  "hace", "hacen", "está", "están", "estoy", "ser", "estar", "tener", "o", "ni",
  "si", "no", "sí", "ya", "también", "tan", "solo", "sólo", "así", "cuando",
  "donde", "porque", "pues", "poco", "mucho", "mucha", "muchos", "muchas",
  "ese", "esa", "esos", "esas", "aquello", "aquel", "aquella", "mi", "mis",
  "su", "sus", "nuestro", "nuestra", "vuestro", "vuestra", "qué", "quien",
  "quienes", "cual", "cuales", "cuanto", "cuanta", "cuantos", "cuantas", "donde",
  "este", "ese", "aquel", "alguno", "alguna", "algunos", "algunas", "otro",
  "otra", "otros", "otras", "mismo", "misma", "mismos", "mismas", "cada",
  "entre", "hasta", "desde", "durante", "contra", "sin", "sobre", "tras",
  "ante", "bajo", "cabe", "hacia", "mediante", "según",
]);

const STOPWORDS_EN = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "with", "by", "from", "as", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "should", "could",
  "can", "may", "might", "must", "i", "you", "he", "she", "it", "we", "they",
  "me", "him", "her", "us", "them", "my", "your", "his", "its", "our", "their",
  "this", "that", "these", "those", "not", "no", "yes", "so", "if", "then",
  "than", "too", "very", "just", "also", "about", "into", "over", "after",
  "before", "between", "through", "during", "about", "again", "once", "here",
  "there", "when", "where", "which", "who", "whom", "what", "how", "all",
  "any", "both", "each", "few", "more", "most", "other", "some", "such", "only",
  "own", "same", "than",
]);

const WORD_RE = /[a-záéíóúñü]+/gi;

function tokenizeWords(text: string): string[] {
  return (text.toLowerCase().match(WORD_RE) ?? []).filter(
    (w) => w.length > 2 && !STOPWORDS_ES.has(w) && !STOPWORDS_EN.has(w)
  );
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?¡!¿?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

/** Resumen extractivo: puntúa oraciones por frecuencia de palabras clave. */
export function extractSummary(text: string, maxSentences = 4): string {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return text.trim();
  if (sentences.length <= maxSentences) return sentences.join(" ");

  const freq = new Map<string, number>();
  for (const w of tokenizeWords(text)) freq.set(w, (freq.get(w) ?? 0) + 1);

  const scored = sentences.map((s, i) => {
    const words = tokenizeWords(s);
    if (words.length === 0) return { s, i, score: 0 };
    const sum = words.reduce((acc, w) => acc + (freq.get(w) ?? 0), 0);
    // Normaliza por longitud para no favorecer oraciones larguísimas
    return { s, i, score: sum / Math.sqrt(words.length) };
  });

  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.i - b.i);

  return top.map((t) => t.s).join(" ");
}

/** Patrones de tareas en ES y EN. */
const TASK_PATTERNS: RegExp[] = [
  /\btengo que\b/i,
  /\btienes que\b/i,
  /\btiene que\b/i,
  /\btenemos que\b/i,
  /\bhay que\b/i,
  /\bnecesito\b/i,
  /\bnecesitamos\b/i,
  /\bno (te |se |me )?olvid(es?|ar)\b/i,
  /\bpendiente\b/i,
  /\btodo\b/i,
  /\btodos\b/i,
  /\bdebo\b/i,
  /\bdebemos\b/i,
  /\bdebería\b/i,
  /\bdeberíamos\b/i,
  /\bvoy a\b/i,
  /\bvamos a\b/i,
  /\brecordar\b/i,
  /\brecuerda\b/i,
  /\bimportante\b/i,
  /\bprioridad\b/i,
  /\bmañana\b/i,
  /\blunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo\b/i,
  /\bneed to\b/i,
  /\bhave to\b/i,
  /\bhas to\b/i,
  /\bshould\b/i,
  /\bmust\b/i,
  /\bremember to\b/i,
  /\bdon'?t forget\b/i,
  /\baction item\b/i,
  /\bfollow ?up\b/i,
  /\bdeadline\b/i,
  /\bby (monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow)\b/i,
];

/** Extrae tareas accionables: oraciones que contienen patrones de acción. */
export function extractTasks(text: string): TaskItem[] {
  const sentences = splitSentences(text);
  const seen = new Set<string>();
  const tasks: TaskItem[] = [];
  let n = 0;

  for (const s of sentences) {
    if (TASK_PATTERNS.some((re) => re.test(s))) {
      const key = s.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      tasks.push({ id: `task-${Date.now()}-${n++}`, text: s, done: false });
    }
  }
  return tasks;
}

/** Puntos clave: top ideas por frecuencia, distintas de las del resumen. */
export function extractKeyPoints(text: string, count = 5): string[] {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return [];

  const freq = new Map<string, number>();
  for (const w of tokenizeWords(text)) freq.set(w, (freq.get(w) ?? 0) + 1);

  const scored = sentences.map((s, i) => {
    const words = tokenizeWords(s);
    const sum = words.reduce((acc, w) => acc + (freq.get(w) ?? 0), 0);
    // Bonus por longitud media (las ideas principales suelen ser explicativas)
    return { s, i, score: sum / Math.sqrt(words.length || 1) };
  });

  const top = scored
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .sort((a, b) => a.i - b.i);

  return top.map((t) => t.s);
}

/** Análisis completo de una transcripción. */
export function analyzeTranscript(text: string): AnalysisResult {
  const clean = text.trim();
  return {
    summary: extractSummary(clean, 4),
    tasks: extractTasks(clean),
    keyPoints: extractKeyPoints(clean, 5),
  };
}

/** Título auto-generado: "Grabación — 9 oct 2026, 12:57". */
export function autoTitle(date: Date = new Date()): string {
  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `Grabación — ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${hh}:${mm}`;
}
