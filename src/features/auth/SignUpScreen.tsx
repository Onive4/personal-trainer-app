import { useState, type FormEvent } from 'react'
import { supabase } from '../../api/supabase'
import { Button } from '../../ui/Button'
import { TextField } from '../../ui/TextField'
import { GoogleButton } from './GoogleButton'
import { traduzirErroAuth } from './authErrors'

export function SignUpScreen({ onJaTenhoConta }: { onJaTenhoConta: () => void }) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function cadastrar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        data: { nome: nome.trim() },
        emailRedirectTo: window.location.origin,
      },
    })
    setEnviando(false)
    if (error) {
      setErro(traduzirErroAuth(error.message))
      return
    }
    // Se a confirmação de e-mail estiver ligada no Supabase, não há sessão ainda.
    if (!data.session) setAguardandoConfirmacao(true)
  }

  if (aguardandoConfirmacao) {
    return (
      <main className="tela mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6">
        <h1 className="text-2xl font-bold">Confirme seu e-mail</h1>
        <p className="text-slate-300">
          Enviamos um link para {email}. Abra o link e depois volte aqui para entrar.
        </p>
        <Button onClick={onJaTenhoConta}>Ir para Entrar</Button>
      </main>
    )
  }

  return (
    <main className="tela mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6">
      <h1 className="text-3xl font-bold">Criar conta</h1>

      <GoogleButton onErro={setErro} />

      <div className="flex items-center gap-3 text-sm text-slate-400">
        <span className="h-px flex-1 bg-slate-700" />
        ou com e-mail
        <span className="h-px flex-1 bg-slate-700" />
      </div>

      <form onSubmit={cadastrar} className="flex flex-col gap-4">
        <TextField
          label="Como você quer ser chamado"
          autoComplete="given-name"
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
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
          label="Senha (mínimo 6 caracteres)"
          type="password"
          autoComplete="new-password"
          minLength={6}
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
          Criar conta
        </Button>
      </form>

      <Button variante="texto" onClick={onJaTenhoConta}>
        Já tenho conta
      </Button>
    </main>
  )
}
