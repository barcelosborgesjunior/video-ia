import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // A rota de renderização usa disco temporário e processo FFmpeg.
  // Em produção, mover a renderização para um worker dedicado.
  serverExternalPackages: []
};
export default nextConfig;