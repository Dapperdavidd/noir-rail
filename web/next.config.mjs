/** @type {import('next').NextConfig} */
const nextConfig = {
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
