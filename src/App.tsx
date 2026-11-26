import { useState } from 'react'
import { supabaseConfigurado } from './api/supabase'
import { useAuth } from './features/auth/useAuth'
import { LoginScreen } from './features/auth/LoginScreen'
import { SignUpScreen } from './features/auth/SignUpScreen'
import { AuthCallback } from './features/auth/AuthCallback'
import { InstallScreen } from './features/onboarding/InstallScreen'
import { estaInstalado } from './features/onboarding/platform'
import { AreaLogada } from './features/home/AreaLogada'

const CHAVE_PULOU_INSTALACAO = 'pt:pulou-instalacao'

export default function App() {
  const auth = useAuth()
  const [telaAuth, setTelaAuth] = useState<'entrar' | 'cadastrar'>('entrar')
  const [pulouInstalacao, setPulouInstalacao] = useState(
    () => localStorage.getItem(CHAVE_PULOU_INSTALACAO) === '1',
  )

  if (!supabaseConfigurado) {
    return (
      <main className="tela mx-auto max-w-md">
        <h1 className="text-xl font-semibold">Configuração ausente</h1>
        <p className="mt-3 text-neutral-300">
          Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local (veja o README).
        </p>
      </main>
    )
  }

  if (window.location.pathname === '/auth/callback') {
    return <AuthCallback />
  }

  if (!estaInstalado() && !pulouInstalacao) {
    return (
      <InstallScreen
        onContinuarNoNavegador={() => {
          localStorage.setItem(CHAVE_PULOU_INSTALACAO, '1')
          setPulouInstalacao(true)
        }}
      />
    )
  }

  switch (auth.status) {
    case 'carregando':
      // Leitura local da sessão: leva milissegundos, sem spinner.
      return null
    case 'deslogado':
      return telaAuth === 'entrar' ? (
        <LoginScreen onCriarConta={() => setTelaAuth('cadastrar')} />
      ) : (
        <SignUpScreen onJaTenhoConta={() => setTelaAuth('entrar')} />
      )
    case 'logado':
      return (
        <AreaLogada
          userId={auth.userId}
          email={auth.email}
          nomeDaSessao={auth.nome}
          onSair={auth.sair}
        />
      )
  }
}
