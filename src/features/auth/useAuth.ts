import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../api/supabase'

const CHAVE_ULTIMO_USUARIO = 'pt:ultimo-usuario'

type Estado =
  | { status: 'carregando' }
  | { status: 'deslogado' }
  | { status: 'logado'; userId: string; email: string | null }

export type AuthState =
  | { status: 'carregando' }
  | { status: 'deslogado' }
  | { status: 'logado'; userId: string; email: string | null; sair: () => Promise<void> }

interface UltimoUsuario {
  id: string
  email: string | null
}

function lerUltimoUsuario(): UltimoUsuario | null {
  try {
    const bruto = localStorage.getItem(CHAVE_ULTIMO_USUARIO)
    return bruto ? (JSON.parse(bruto) as UltimoUsuario) : null
  } catch {
    return null
  }
}

/**
 * Estado de login. Se a sessão não puder ser renovada por falta de sinal,
 * o app continua aberto com o último usuário: academia sem sinal é o caso
 * normal. Só "Sair" explícito apaga o usuário local.
 */
export function useAuth(): AuthState {
  const [estado, setEstado] = useState<Estado>({ status: 'carregando' })

  useEffect(() => {
    function aplicar(session: Session | null) {
      if (session) {
        const usuario: UltimoUsuario = { id: session.user.id, email: session.user.email ?? null }
        localStorage.setItem(CHAVE_ULTIMO_USUARIO, JSON.stringify(usuario))
        setEstado({ status: 'logado', userId: usuario.id, email: usuario.email })
        return
      }
      const ultimo = lerUltimoUsuario()
      if (ultimo && !navigator.onLine) {
        setEstado({ status: 'logado', userId: ultimo.id, email: ultimo.email })
        return
      }
      setEstado({ status: 'deslogado' })
    }

    // Dispara INITIAL_SESSION com a sessão salva e depois cada mudança.
    const { data } = supabase.auth.onAuthStateChange((_evento, session) => aplicar(session))
    return () => data.subscription.unsubscribe()
  }, [])

  const sair = useCallback(async () => {
    localStorage.removeItem(CHAVE_ULTIMO_USUARIO)
    // scope 'local' funciona sem rede.
    await supabase.auth.signOut({ scope: 'local' })
    setEstado({ status: 'deslogado' })
  }, [])

  if (estado.status === 'logado') return { ...estado, sair }
  return estado
}
