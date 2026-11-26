/** Traduz mensagens do Supabase Auth para texto que o usuário entende. */
export function traduzirErroAuth(mensagem: string | null | undefined): string {
  const m = (mensagem ?? '').toLowerCase()

  if (m.includes('email_nao_autorizado') || m.includes('database error saving new user')) {
    return 'Este e-mail não está autorizado a usar o app.'
  }
  if (m.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.'
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'Já existe uma conta com este e-mail. Use "Entrar".'
  }
  if (m.includes('password should be at least') || m.includes('weak password')) {
    return 'A senha precisa ter pelo menos 6 caracteres.'
  }
  if (m.includes('email not confirmed')) {
    return 'Confirme seu e-mail pelo link enviado antes de entrar.'
  }
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed')) {
    return 'Sem conexão. Para entrar pela primeira vez é preciso internet.'
  }
  if (m.includes('rate limit')) {
    return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'
  }
  return 'Não foi possível concluir. Tente de novo.'
}
