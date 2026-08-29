import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only: allow iPhone / LAN browsers hitting the Mac's Wi‑Fi IP so
  // /_next/* and HMR are not blocked by Next 16 cross-origin protection.
  // Ignored in `next build` / Vercel production.
  allowedDevOrigins: ["192.168.7.46", "127.0.0.1"],
};

export default nextConfig;
