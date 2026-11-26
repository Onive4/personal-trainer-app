import { supabase } from './supabase'
import { db, type Anamnese, type Gym, type Measurement, type NutritionTarget, type SyncOutboxItem } from '../db/schema'
import { processarFila, type ResultadoEnvio } from '../db/sync'

/** Erro de fetch (sem rede) aparece como TypeError ou mensagem "Failed to fetch". */
function ehErroDeRede(mensagem: string | undefined): boolean {
  return !navigator.onLine || /fetch|network|load failed/i.test(mensagem ?? '')
}

async function enviarItem(item: SyncOutboxItem): Promise<ResultadoEnvio> {
  const { tabela, operacao, payload } = item
  let erro: { message: string } | null = null

  if (operacao === 'update') {
    const { id, ...campos } = payload
    erro = (await supabase.from(tabela).update(campos).eq('id', id as string)).error
  } else {
    // ids gerados no celular: reenviar o mesmo item não duplica.
    erro = (await supabase.from(tabela).upsert(payload, { onConflict: 'id', ignoreDuplicates: true })).error
  }

  if (!erro) return 'ok'
  return ehErroDeRede(erro.message) ? 'rede' : 'recusado'
}

/** Envia o que está na fila. Seguro chamar várias vezes. */
export function enviarFila(): Promise<void> {
  if (!navigator.onLine) return Promise.resolve()
  return processarFila(enviarItem)
}

/**
 * Baixa do Supabase o que é do usuário e grava no Dexie (aparelho novo,
 * ou dados lançados no outro celular). Falha de rede é silenciosa.
 */
export async function baixarDados(userId: string): Promise<void> {
  if (!navigator.onLine) return
  const [a, m, n, g] = await Promise.all([
    supabase.from('anamneses').select('id, profile_id, versao, respostas, clearance_status, constraints, nivel, objetivo, liberacao, data').eq('profile_id', userId),
    supabase.from('measurements').select('*').eq('profile_id', userId),
    supabase.from('nutrition_targets').select('*').eq('profile_id', userId),
    supabase.from('gyms').select('id, profile_id, nome, ativa, equipamentos, created_at, updated_at').eq('profile_id', userId),
  ])
  const num = <T extends object>(linhas: T[]) =>
    linhas.map((l) =>
      Object.fromEntries(
        Object.entries(l).map(([k, v]) => [k, typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) && k !== 'data' ? Number(v) : v]),
      ) as T,
    )
  await db.transaction('rw', [db.anamneses, db.measurements, db.nutrition_targets, db.gyms], async () => {
    if (a.data) await db.anamneses.bulkPut(a.data as Anamnese[])
    if (m.data) await db.measurements.bulkPut(num(m.data as Measurement[]))
    if (n.data) await db.nutrition_targets.bulkPut(num(n.data as NutritionTarget[]))
    // Academia é editável: só aceita a versão do servidor se não for mais velha que a local.
    for (const remota of (g.data ?? []) as Gym[]) {
      const local = await db.gyms.get(remota.id)
      if (!local || Date.parse(remota.updated_at) >= Date.parse(local.updated_at)) await db.gyms.put(remota)
    }
  })
}

/** Envia a fila e depois atualiza o espelho local. */
export async function sincronizarTudo(userId: string): Promise<void> {
  try {
    await enviarFila()
    await baixarDados(userId)
  } catch {
    // Sem rede ou servidor fora: tenta de novo no próximo evento online.
  }
}
