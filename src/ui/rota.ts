import { useCallback, useSyncExternalStore } from 'react'

/** Roteamento mínimo pelo endereço, sem biblioteca. O botão voltar do celular funciona. */
function assinar(f: () => void) {
  window.addEventListener('popstate', f)
  return () => window.removeEventListener('popstate', f)
}

export function useRota() {
  const caminho = useSyncExternalStore(assinar, () => window.location.pathname)
  const ir = useCallback((destino: string, substituir = false) => {
    if (destino === window.location.pathname) return
    if (substituir) history.replaceState(null, '', destino)
    else history.pushState(null, '', destino)
    window.dispatchEvent(new PopStateEvent('popstate'))
    window.scrollTo(0, 0)
  }, [])
  const voltar = useCallback(() => {
    // Abriu direto numa tela interna: "voltar" leva ao início em vez de sair do app.
    if (history.state === null && history.length <= 1) ir('/', true)
    else history.back()
  }, [ir])
  return { caminho, ir, voltar }
}
