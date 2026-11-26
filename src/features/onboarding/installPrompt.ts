// Evento do Chrome/Android que permite mostrar o diálogo nativo de instalação.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let eventoGuardado: BeforeInstallPromptEvent | null = null
const ouvintes = new Set<() => void>()

function avisar() {
  ouvintes.forEach((f) => f())
}

export function capturarPromptDeInstalacao() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    eventoGuardado = e as BeforeInstallPromptEvent
    avisar()
  })
  window.addEventListener('appinstalled', () => {
    eventoGuardado = null
    avisar()
  })
}

export function podeInstalarNativo(): boolean {
  return eventoGuardado !== null
}

export function aoMudarPromptDeInstalacao(f: () => void): () => void {
  ouvintes.add(f)
  return () => ouvintes.delete(f)
}

export async function abrirPromptDeInstalacao(): Promise<boolean> {
  if (!eventoGuardado) return false
  await eventoGuardado.prompt()
  const { outcome } = await eventoGuardado.userChoice
  eventoGuardado = null
  avisar()
  return outcome === 'accepted'
}
