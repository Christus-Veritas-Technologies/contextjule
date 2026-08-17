import "@contextjule/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  /**
   * The workspace packages ship TypeScript and JSX source rather than a build
   * — that is what lets the site and the desktop app render from byte-identical
   * components. Next will not compile anything resolved through node_modules
   * unless it is named here, symlinked workspace or not, and the failure mode
   * is an "unexpected token" on the first `.tsx` import at build time.
   */
  transpilePackages: ["@contextjule/ui", "@contextjule/core"],
};

export default nextConfig;
