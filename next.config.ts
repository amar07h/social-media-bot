// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.experiments = { 
      ...config.experiments, 
      topLevelAwait: true 
    };
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['playwright-chromium']
  },
  // إعدادات إضافية
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['instagram.com'],
  },
};

export default nextConfig;