import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vídeo IA — Suas fotos em movimento",
  description: "Crie vídeos promocionais automaticamente a partir das fotos da sua empresa."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}