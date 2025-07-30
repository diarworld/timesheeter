const { patchWebpackConfig } = require('next-global-css');
const path = require('path');

/** @type {import('next').NextConfig} */
module.exports = {
  env: {
    NEXT_TELEMETRY_DISABLED: '1',
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
  ],
  webpack: (config, options) => {
    patchWebpackConfig(config, options);

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

    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
