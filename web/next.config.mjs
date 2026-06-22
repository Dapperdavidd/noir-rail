import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the monorepo root (a stray lockfile elsewhere otherwise confuses detection).
  outputFileTracingRoot: repoRoot,
  // Compile the workspace SDK (it ships TypeScript source).
  transpilePackages: ["@noir-rail/sdk"],
  // snarkjs references a few Node built-ins it never uses in the browser proving path.
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      readline: false,
    };
    return config;
  },
};

export default nextConfig;
