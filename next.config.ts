import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB — too small for product photo uploads and the Excel
      // import file upload, both of which go through Server Actions.
      bodySizeLimit: "15mb",
    },
  },
  // onnxruntime-node (used by @imgly/background-removal-node) loads its native
  // .so/.node binary from a computed path at runtime based on process.platform/arch,
  // not a static require() string — Vercel's build-time file tracer can't follow that,
  // so the binary silently isn't included in the deployed function ("cannot open
  // shared object file" at runtime) unless explicitly listed here.
  serverExternalPackages: ["onnxruntime-node", "@imgly/background-removal-node", "sharp"],
  // Keys are picomatch globs matched against the route path — literal `[locale]`
  // brackets must be escaped or they're parsed as a glob character class (which
  // silently matched nothing, the reason the first attempt at this didn't work).
  outputFileTracingIncludes: {
    "/\\[locale\\]/\\(dashboard\\)/marketing": ["node_modules/onnxruntime-node/bin/**/*"],
  },
};

export default withNextIntl(nextConfig);
