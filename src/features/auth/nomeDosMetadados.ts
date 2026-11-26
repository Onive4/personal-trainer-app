/**
 * Nome que o Supabase guarda junto da conta: "nome" no cadastro por e-mail,
 * "full_name"/"name" no Google. Mesma ordem do trigger que cria o perfil.
 */
export function nomeDosMetadados(metadados: Record<string, unknown> | null | undefined): string | null {
  for (const chave of ['nome', 'full_name', 'name']) {
    const valor = metadados?.[chave]
    if (typeof valor === 'string' && valor.trim()) return valor.trim()
  }
  return null
}
