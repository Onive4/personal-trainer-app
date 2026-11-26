import { useState } from 'react'
import { supabase } from '../../api/supabase'
import { Button } from '../../ui/Button'
import { traduzirErroAuth } from './authErrors'

export function GoogleButton({ onErro }: { onErro: (mensagem: string) => void }) {
  const [enviando, setEnviando] = useState(false)

  async function entrarComGoogle() {
    setEnviando(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    // Sem erro, o navegador já está indo para o Google.
    if (error) {
      setEnviando(false)
      onErro(traduzirErroAuth(error.message))
    }
  }

  return (
    <Button variante="secundario" onClick={entrarComGoogle} disabled={enviando}>
      Entrar com Google
    </Button>
  )
}
