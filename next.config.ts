import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.178.197",
    "192.168.*.*",
    "10.*.*.*",
    "*.local",
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.loca.lt",
  ],
};

export default nextConfig;
