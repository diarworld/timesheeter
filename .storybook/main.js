import { resolve } from 'path';
export const stories = ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'];
export const addons = [
  '@storybook/addon-links',
  '@storybook/addon-docs',
];
export const framework = {
  name: '@storybook/nextjs',
  options: {}
};
export const staticDirs = ['../public'];
export const docs = { autodocs: true };
export async function webpackFinal(config) {
  config.resolve.alias = {
    ...config.resolve.alias,
    app: resolve(__dirname, '../src/app'),
    components: resolve(__dirname, '../src/components'),
    entities: resolve(__dirname, '../src/entities'),
    features: resolve(__dirname, '../src/features'),
    pages: resolve(__dirname, '../src/pages'),
    shared: resolve(__dirname, '../src/shared'),
    config: resolve(__dirname, '../src/config'),
    lib: resolve(__dirname, '../src/lib'),
    styles: resolve(__dirname, '../src/styles'),
    ui: resolve(__dirname, '../src/ui'),
  };
  return config;
}
