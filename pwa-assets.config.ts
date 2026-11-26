import { defineConfig, minimal2023Preset as base } from '@vite-pwa/assets-generator/config'

// Gera os ícones PNG a partir de public/icon.svg: `npm run icons`.
// Os arquivos gerados ficam em public/ e entram no repositório.
// Fundo preto no ícone do iPhone e no maskable do Android (o padrão é branco).
const FUNDO = '#000000'

export default defineConfig({
  preset: {
    ...base,
    maskable: { ...base.maskable, resizeOptions: { ...base.maskable.resizeOptions, background: FUNDO } },
    apple: { ...base.apple, resizeOptions: { ...base.apple.resizeOptions, background: FUNDO } },
  },
  images: ['public/icon.svg'],
})
