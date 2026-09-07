import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production: emit a self-contained server (.next/standalone) used by
  // `bun run start` / `node .next/standalone/server.js` / the Dockerfile.
  // No effect on `next dev`.
  output: "standalone",
  // v28: kill the client router cache for dynamic pages — switching the
  // storefront template (or any settings change) previously took "several
  // refreshes" because the browser kept serving its cached RSC payload for
  // 30s+ after a client-side navigation. With staleTimes.dynamic = 0 every
  // navigation to a dynamic page fetches a fresh server render, so template
  // changes apply on the very next view WITHOUT any manual refresh.
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
  // Dev-only: the sandbox preview panel embeds this app through the z.ai
  // gateway (origin: preview-chat-*.space-z.ai). Without this allow-list the
  // dev server flags every /_next/* request as cross-origin ("Cross origin
  // request detected…"), which can delay/block chunk + HMR loading and was
  // the trigger for the intermittent "tree hydrated but some attributes
  // didn't match" console error in the preview iframe. Wildcard covers the
  // per-session preview subdomains.
  allowedDevOrigins: ["*.space-z.ai"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.chatglm.cn" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // NOTE: X-Frame-Options is intentionally NOT set here so the sandbox
          // preview panel can embed the store. For VPS production deployments,
          // add `header X-Frame-Options SAMEORIGIN` (or a CSP frame-ancestors
          // limited to your own domain) at your reverse proxy (Caddy/Nginx).
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
