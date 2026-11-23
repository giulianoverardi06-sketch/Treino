import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Gera os ícones do PWA a partir de public/icon.svg: `npx pwa-assets-generator`.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      padding: 0,
      resizeOptions: { background: '#FFCC00' },
    },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#FFCC00' } },
  },
  images: ['public/icon.svg'],
});
