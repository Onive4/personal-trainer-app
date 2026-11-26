import { useEffect, useState } from 'react'
import { supabase } from '../../api/supabase'
import { Button } from '../../ui/Button'
import { traduzirErroAuth } from './authErrors'

function erroNaUrl(): string | null {
  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return (
    query.get('error_description') ??
    hash.get('error_description') ??
    query.get('error') ??
    hash.get('error')
  )
}

function irParaInicio() {
  window.location.replace('/')
}

/**
 * Retorno do login com Google. O supabase-js troca o código da URL pela
 * sessão sozinho (detectSessionInUrl); aqui só esperamos e voltamos ao início.
 */
export function AuthCallback() {
  const [erro, setErro] = useState<string | null>(() => {
    const bruto = erroNaUrl()
    return bruto ? traduzirErroAuth(bruto) : null
  })

  useEffect(() => {
    if (erro) return
    const { data } = supabase.auth.onAuthStateChange((evento, session) => {
      if (session) irParaInicio()
      else if (evento === 'INITIAL_SESSION') {
        setErro('Não foi possível concluir o login com Google. Tente de novo.')
      }
    })
    return () => data.subscription.unsubscribe()
  }, [erro])

  return (
    <main className="tela mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6">
      {erro ? (
        <>
          <p role="alert" className="text-red-400">
            {erro}
          </p>
          <Button onClick={irParaInicio}>Voltar</Button>
        </>
      ) : (
        <p className="text-slate-300">Entrando…</p>
      )}
    </main>
  )
}
