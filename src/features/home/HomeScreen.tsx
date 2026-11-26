import { useEffect, useSyncExternalStore } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { sincronizarPerfil } from '../../api/profiles'
import { Button } from '../../ui/Button'

function assinarConexao(f: () => void) {
  window.addEventListener('online', f)
  window.addEventListener('offline', f)
  return () => {
    window.removeEventListener('online', f)
    window.removeEventListener('offline', f)
  }
}

interface Props {
  userId: string
  email: string | null
  nomeDaSessao: string | null
  onSair: () => Promise<void>
}

/** Início provisório do M0: confirma login, perfil e modo offline. */
export function HomeScreen({ userId, email, nomeDaSessao, onSair }: Props) {
  const online = useSyncExternalStore(assinarConexao, () => navigator.onLine)
  // A tela lê do Dexie; a rede só atualiza o espelho em segundo plano.
  const perfil = useLiveQuery(() => db.profiles.get(userId), [userId])

  useEffect(() => {
    if (online) void sincronizarPerfil(userId)
  }, [userId, online])

  // Perfil local primeiro; na primeira abertura, o nome que veio no login.
  const nome = perfil?.nome || nomeDaSessao || email || 'você'

  return (
    <main className="tela mx-auto flex min-h-dvh max-w-md flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Olá, {nome}</h1>
        <span
          className={`rounded-full px-3 py-1 text-sm ${
            online ? 'bg-orange-950 text-orange-300' : 'bg-neutral-800 text-neutral-300'
          }`}
        >
          {online ? 'Online' : 'Offline'}
        </span>
      </header>

      <p className="text-neutral-300">
        A fundação está pronta. A anamnese chega na próxima etapa.
      </p>

      <div className="mt-auto">
        <Button variante="secundario" onClick={() => void onSair()}>
          Sair
        </Button>
      </div>
    </main>
  )
}
