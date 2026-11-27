import type { EntityTable } from 'dexie'
import { supabase } from './supabase'
import { db, type Anamnese, type Gym, type Measurement, type Mesocycle, type NutritionTarget, type Program, type Slot, type SyncOutboxItem } from '../db/schema'
import { processarFila, type ResultadoEnvio } from '../db/sync'

/** Erro de fetch (sem rede) aparece como TypeError ou mensagem "Failed to fetch". */
function ehErroDeRede(mensagem: string | undefined): boolean {
  return !navigator.onLine || /fetch|network|load failed/i.test(mensagem ?? '')
}

async function enviarLote(itens: SyncOutboxItem[]): Promise<ResultadoEnvio> {
  const { tabela, operacao } = itens[0]!
  let erro: { message: string } | null = null

  if (operacao === 'update') {
    // Updates vão sempre um por um (o lote tem um item só).
    const { id, ...campos } = itens[0]!.payload
    erro = (await supabase.from(tabela).update(campos).eq('id', id as string)).error
  } else {
    // Um insert com várias linhas. ids gerados no celular: reenviar não duplica.
    const linhas = itens.map((i) => i.payload)
    erro = (await supabase.from(tabela).upsert(linhas, { onConflict: 'id', ignoreDuplicates: true })).error
  }

  if (!erro) return 'ok'
  return ehErroDeRede(erro.message) ? 'rede' : 'recusado'
}

/** Envia o que está na fila. Seguro chamar várias vezes. */
export function enviarFila(): Promise<void> {
  if (!navigator.onLine) return Promise.resolve()
  return processarFila(enviarLote)
}

/**
 * Baixa do Supabase o que é do usuário e grava no Dexie (aparelho novo,
 * ou dados lançados no outro celular). Falha de rede é silenciosa.
 */
export async function baixarDados(userId: string): Promise<void> {
  if (!navigator.onLine) return
  const [a, m, n, g, pr, me, sl] = await Promise.all([
    supabase.from('anamneses').select('id, profile_id, versao, respostas, clearance_status, constraints, nivel, objetivo, liberacao, data').eq('profile_id', userId),
    supabase.from('measurements').select('*').eq('profile_id', userId),
    supabase.from('nutrition_targets').select('*').eq('profile_id', userId),
    supabase.from('gyms').select('id, profile_id, nome, ativa, equipamentos, created_at, updated_at').eq('profile_id', userId),
    supabase.from('programs').select('*').eq('profile_id', userId),
    supabase.from('mesocycles').select('*').eq('profile_id', userId),
    supabase.from('slots').select('*').eq('profile_id', userId),
  ])
  const num = <T extends object>(linhas: T[]) =>
    linhas.map((l) =>
      Object.fromEntries(
        Object.entries(l).map(([k, v]) => [k, typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) && k !== 'data' ? Number(v) : v]),
      ) as T,
    )
  const maisNovo = async <T extends { id: string; updated_at: string }>(tabela: EntityTable<T, 'id'>, linhas: T[] | null) => {
    for (const remota of linhas ?? []) {
      const local = await tabela.get(remota.id as never)
      if (!local || Date.parse(remota.updated_at) >= Date.parse(local.updated_at)) await tabela.put(remota)
    }
  }
  await db.transaction('rw', [db.anamneses, db.measurements, db.nutrition_targets, db.gyms, db.programs, db.mesocycles, db.slots], async () => {
    if (a.data) await db.anamneses.bulkPut(a.data as Anamnese[])
    if (m.data) await db.measurements.bulkPut(num(m.data as Measurement[]))
    if (n.data) await db.nutrition_targets.bulkPut(num(n.data as NutritionTarget[]))
    // Linhas editáveis: só aceita a versão do servidor se não for mais velha que a local.
    await maisNovo(db.gyms, g.data as Gym[] | null)
    await maisNovo(db.programs, pr.data as Program[] | null)
    await maisNovo(db.mesocycles, me.data as Mesocycle[] | null)
    if (sl.data) await db.slots.bulkPut(sl.data as Slot[])
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
