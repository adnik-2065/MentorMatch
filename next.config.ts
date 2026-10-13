import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // An empty package-lock.json sits in the parent directory, which makes
  // Turbopack guess the workspace root and warn on every dev start. The app is
  // the root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
