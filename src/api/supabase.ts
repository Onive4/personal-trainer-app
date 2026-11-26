import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigurado = Boolean(url && chave)

// Sessão persistida no localStorage: o app abre logado mesmo sem sinal.
export const supabase = createClient(url ?? 'http://localhost', chave ?? 'ausente', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})
