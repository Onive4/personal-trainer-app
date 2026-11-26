import { useState, type FormEvent } from 'react'
import { supabase } from '../../api/supabase'
import { Button } from '../../ui/Button'
import { TextField } from '../../ui/TextField'
import { GoogleButton } from './GoogleButton'
import { traduzirErroAuth } from './authErrors'

export function LoginScreen({ onCriarConta }: { onCriarConta: () => void }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    setEnviando(false)
    if (error) setErro(traduzirErroAuth(error.message))
    // Com sucesso, useAuth recebe o evento e troca a tela.
  }

  return (
    <main className="tela mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6">
      <h1 className="text-3xl font-bold">Treino</h1>

      <GoogleButton onErro={setErro} />

      <div className="flex items-center gap-3 text-sm text-neutral-400">
        <span className="h-px flex-1 bg-neutral-800" />
        ou com e-mail
        <span className="h-px flex-1 bg-neutral-800" />
      </div>

      <form onSubmit={entrar} className="flex flex-col gap-4">
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Senha"
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        {erro && (
          <p role="alert" className="text-red-400">
            {erro}
          </p>
        )}
        <Button type="submit" disabled={enviando}>
          Entrar
        </Button>
      </form>

      <Button variante="texto" onClick={onCriarConta}>
        Criar conta
      </Button>
    </main>
  )
}
