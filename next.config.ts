import path from "node:path";
import type { NextConfig } from "next";

/** Application root when Next is run from this package directory (normal npm/pnpm workflows). */
const projectRoot = path.resolve(process.cwd());

const nextConfig: NextConfig = {
  /*
   * Next may pick a parent folder as the workspace root when multiple lockfiles exist
   * (e.g. a package-lock.json in $HOME). That breaks resolution and can crash Turbopack
   * with "Next.js package not found".
   */
  outputFileTracingRoot: projectRoot,

  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },

  turbopack: {
    /*
     * Do not set `root` here unless you are inside a monorepo: pinning `root` has triggered
     * Turbopack panics ("Next.js package not found" in get_next_server_import_map) for some setups.
     * If you need it, use: root: path.resolve(__dirname)
     */
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
