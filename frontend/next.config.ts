import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output configuration for production
  output: 'standalone',
  
  // Optimize for production
  compress: true,
  
  // Enable experimental features
  experimental: {
    optimizePackageImports: ['axios', 'lucide-react'],
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Image optimization
  images: {
    domains: ['fsfvi.ai', 'localhost'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      // Dashboard redirects removed - let it serve normally
    ];
  },
  
  // Webpack configuration
  webpack: (config) => {
    // Add any custom webpack config here
    return config;
  },
};

export default nextConfig;
