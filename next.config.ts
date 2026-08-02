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
};

export default withNextIntl(nextConfig);
