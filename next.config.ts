import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.178.197",
    "172.20.10.4",
    "192.168.*.*",
    "10.*.*.*",
    "*.local",
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.loca.lt",
  ],
  async rewrites() {
    return [
      {
        source: "/api/calendar/feed.ics",
        destination: "/api/calendar/feed",
      },
    ];
  },
};

export default nextConfig;
