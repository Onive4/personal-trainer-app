import Dexie, { type EntityTable } from 'dexie'

export type Sexo = 'masculino' | 'feminino'

export interface Profile {
  id: string
  nome: string
  sexo: Sexo | null
  data_nascimento: string | null // ISO 8601 (AAAA-MM-DD)
  altura_cm: number | null
  compartilhar_progresso: boolean
  created_at: string
}

export type OperacaoSync = 'insert' | 'update' | 'upsert'
export type StatusSync = 'pendente' | 'enviando' | 'erro'

/** Fila de escrita para o Supabase. Criada no M0, processada a partir do M4. */
export interface SyncOutboxItem {
  id?: number
  tabela: string
  operacao: OperacaoSync
  payload: Record<string, unknown>
  tentativas: number
  status: StatusSync
  created_at: string
}

export class TreinoDB extends Dexie {
  profiles!: EntityTable<Profile, 'id'>
  sync_outbox!: EntityTable<SyncOutboxItem, 'id'>

  constructor(nome = 'treino') {
    super(nome)
    this.version(1).stores({
      profiles: 'id',
      sync_outbox: '++id, status, tabela, created_at',
    })
  }
}

export const db = new TreinoDB()

export function enfileirarSync(
  tabela: string,
  operacao: OperacaoSync,
  payload: Record<string, unknown>,
  banco: TreinoDB = db,
): Promise<number | undefined> {
  return banco.sync_outbox.add({
    tabela,
    operacao,
    payload,
    tentativas: 0,
    status: 'pendente',
    created_at: new Date().toISOString(),
  })
}
