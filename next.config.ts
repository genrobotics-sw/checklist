import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Allow mobile devices on the same network and VS Code dev tunnels to access
  // the app and submit Server Actions without host/origin mismatch errors.
  allowedDevOrigins: [
    '192.168.36.171',
    '192.168.29.62',
    '*.devtunnels.ms',
  ],
};

export default nextConfig;
