import { supabase } from './supabase'
import { db, type Profile } from '../db/schema'

/**
 * Busca o perfil no Supabase e espelha no Dexie. A tela lê sempre do Dexie;
 * isto só atualiza o espelho quando há rede. Falha de rede é silenciosa.
 */
export async function sincronizarPerfil(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, sexo, data_nascimento, altura_cm, compartilhar_progresso, created_at')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return
  await db.profiles.put(data as Profile)
}
