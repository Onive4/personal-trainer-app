import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../api/supabase'
import { nomeDosMetadados } from './nomeDosMetadados'

const CHAVE_ULTIMO_USUARIO = 'pt:ultimo-usuario'

interface Usuario {
  userId: string
  email: string | null
  /** Nome vindo do cadastro ou do Google; reserva até o perfil chegar do banco. */
  nome: string | null
}

type Estado = { status: 'carregando' } | { status: 'deslogado' } | ({ status: 'logado' } & Usuario)

export type AuthState =
  | { status: 'carregando' }
  | { status: 'deslogado' }
  | ({ status: 'logado'; sair: () => Promise<void> } & Usuario)

function lerUltimoUsuario(): Usuario | null {
  try {
    const bruto = localStorage.getItem(CHAVE_ULTIMO_USUARIO)
    if (!bruto) return null
    const salvo = JSON.parse(bruto) as Partial<Usuario> & { id?: string }
    // Formato antigo guardava "id" em vez de "userId".
    const userId = salvo.userId ?? salvo.id
    if (!userId) return null
    return { userId, email: salvo.email ?? null, nome: salvo.nome ?? null }
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
        const usuario: Usuario = {
          userId: session.user.id,
          email: session.user.email ?? null,
          nome: nomeDosMetadados(session.user.user_metadata),
        }
        localStorage.setItem(CHAVE_ULTIMO_USUARIO, JSON.stringify(usuario))
        setEstado({ status: 'logado', ...usuario })
        return
      }
      const ultimo = lerUltimoUsuario()
      if (ultimo && !navigator.onLine) {
        setEstado({ status: 'logado', ...ultimo })
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
