import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // News thumbnails come from many publisher domains, so allow any HTTPS/HTTP
    // host. Next still proxies + optimizes through /_next/image, so we're not
    // hotlinking raw source images directly into the page.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
