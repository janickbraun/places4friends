import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apple requires the association file to be served as application/json.
        // It has no file extension, so it would otherwise be guessed as
        // text/plain and iOS would refuse to associate the domain.
        //
        // This entry only covers `next start` locally — in production Vercel
        // serves everything in public/ straight from its CDN, bypassing the Next
        // server, so the deployed header comes from vercel.json instead. Keep
        // the two in sync.
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
};

export default nextConfig;
