import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Allow mobile devices on the same network to access dev HMR
  allowedDevOrigins: ['192.168.36.171'],
};

export default nextConfig;
