import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",       // produces ./out — load this folder as an unpacked Chrome extension
  trailingSlash: false,
  images: {
    unoptimized: true,    // required for static export
  },
};

export default nextConfig;
