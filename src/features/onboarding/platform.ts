export type Plataforma = 'ios' | 'android' | 'outra'

export function detectarPlataforma(userAgent: string, maxTouchPoints = 0): Plataforma {
  const ua = userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  // iPadOS 13+ se apresenta como Mac; o toque denuncia.
  if (ua.includes('macintosh') && maxTouchPoints > 1) return 'ios'
  if (ua.includes('android')) return 'android'
  return 'outra'
}

export function plataformaAtual(): Plataforma {
  return detectarPlataforma(navigator.userAgent, navigator.maxTouchPoints)
}

/** True quando o app foi aberto pelo ícone da tela de início. */
export function estaInstalado(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches
}
