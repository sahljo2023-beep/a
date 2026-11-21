import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // للدعم الكامل لـ standalone output في Docker
  output: "standalone",

  // تعطيل Turbopack واستخدام Webpack الكلاسيكي (لدعم argon2 native)
  turbopack: {},

  // دعم RTL والخطوط العربية
  experimental: {
    optimizePackageImports: ["@react-pdf/renderer", "exceljs"],
  },

  // إعدادات Webpack لدعم argon2 native module
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "argon2"];
    }
    return config;
  },
};

export default nextConfig;
