import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apple requires the association file to be served as application/json.
        // It has no file extension, so Next would otherwise guess a generic type
        // and iOS would silently refuse to associate the domain.
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
};

export default nextConfig;
