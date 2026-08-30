import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  allowedDevOrigins: ["127.0.0.1"],

  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;