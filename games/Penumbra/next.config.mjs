/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Standalone build for self-host Docker deploy on penumbra.allin1site.com.
  // Produces .next/standalone/server.js — Docker runner copies that + .next/static + public.
  output: "standalone",
  // typedRoutes intentionally off: too strict for templated dynamic routes
  // like /levels/${n}. Re-enable + add `as Route<>` casts in skill #5.
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
