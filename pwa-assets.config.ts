import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Gera os ícones PNG a partir de public/icon.svg: `npm run icons`.
// Os arquivos gerados ficam em public/ e entram no repositório.
export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/icon.svg'],
})
