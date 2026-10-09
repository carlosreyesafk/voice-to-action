import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voice-to-Action 🎙️ — Tu voz, convertida en acción",
  description:
    "Graba tu voz, transcribe con Whisper 100% en el navegador y convierte tus ideas en resumen ejecutivo, tareas accionables y puntos clave. Sin servidores, sin cuentas.",
  keywords: ["voz", "transcripción", "whisper", "productividad", "tareas", "voice notes"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-ambient min-h-screen">{children}</body>
    </html>
  );
}
