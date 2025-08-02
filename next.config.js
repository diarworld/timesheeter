const { patchWebpackConfig } = require('next-global-css');
const path = require('path');

/** @type {import('next').NextConfig} */
module.exports = {
  env: {
    // Disable Next.js telemetry
    NEXT_TELEMETRY_DISABLED: '1',
    // Disable tracker in development by default to prevent HMR issues
    NEXT_PUBLIC_ENABLE_TRACKER: process.env.NODE_ENV === 'production' ? 'true' : 'false',
  },
  reactStrictMode: true,
  output: 'standalone',
  rewrites() {
    return [
      {
        source: '/tracker/:path*',
        destination: 'https://api.tracker.yandex.net/:path*',
      },
    ];
  },
  transpilePackages: [
    '@ant-design',
    'rc-util',
    'rc-pagination',
    'rc-picker',
    'rc-tooltip',
    'rc-notification',
    'rc-tree',
    'rc-table',
    'rc-field-form',
    'rc-select',
    'rc-input',
    'rc-checkbox',
    'rc-radio',
    'rc-switch',
    'rc-slider',
    'rc-rate',
    'rc-upload',
    'rc-progress',
    'rc-alert',
    'rc-drawer',
    'rc-dropdown',
    'rc-menu',
    'rc-tabs',
    'rc-steps',
    'rc-collapse',
    'rc-carousel',
    'rc-calendar',
    'rc-time-picker',
    'rc-color-picker',
    'rc-mentions',
    'rc-cascader',
    'rc-transfer',
    'rc-tree-select',
    'rc-virtual-list',
    // Only include OpenReplay in production
    ...(process.env.NODE_ENV === 'production' ? ['@openreplay'] : []),
  ],
  webpack: (config, options) => {
    patchWebpackConfig(config, options);

    // Handle OpenReplay compatibility with React 19
    config.resolve.alias = {
      ...config.resolve.alias,
      app: path.resolve(__dirname, './src/app'),
      components: path.resolve(__dirname, './src/components'),
      entities: path.resolve(__dirname, './src/entities'),
      features: path.resolve(__dirname, './src/features'),
      pages: path.resolve(__dirname, './src/pages'),
      shared: path.resolve(__dirname, './src/shared'),
      config: path.resolve(__dirname, './src/config'),
      lib: path.resolve(__dirname, './src/lib'),
      styles: path.resolve(__dirname, './src/styles'),
      ui: path.resolve(__dirname, './src/ui'),
    };

    // In development, completely ignore OpenReplay packages
    if (process.env.NODE_ENV === 'development') {
      config.resolve.alias['@openreplay/tracker'] = false;
      config.resolve.alias['@openreplay/tracker-assist'] = false;
      config.resolve.alias['@openreplay/network-proxy'] = false;
      
      // Add a fallback that returns an empty module
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@openreplay/tracker': false,
        '@openreplay/tracker-assist': false,
        '@openreplay/network-proxy': false,
      };
    }

    // Ignore source map warnings for OpenReplay
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      /Failed to parse source map/,
      /installHook\.js\.map/,
      /@openreplay/,
    ];

    // Configure fallbacks for OpenReplay compatibility
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
