import Dexie, { type EntityTable } from 'dexie'
import type {
  ClearanceStatus,
  Constraint,
  LiberacaoMedica,
  Nivel,
  Objetivo,
  RespostasAnamnese,
  Sexo,
} from '../engine/anamnese'
import type { PropostaMesociclo } from '../engine/builder'

export type { Sexo }

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

export interface Anamnese {
  id: string
  profile_id: string
  versao: number
  respostas: RespostasAnamnese
  clearance_status: ClearanceStatus
  constraints: Constraint[]
  nivel: Nivel
  objetivo: Objetivo
  liberacao: LiberacaoMedica | null
  data: string // ISO 8601
}

/** Circunferências em cm. Correção = registro novo; nada é editado. */
export interface Measurement {
  id: string
  profile_id: string
  data: string // AAAA-MM-DD
  peso_kg: number
  pescoco: number | null
  cintura: number | null
  quadril: number | null
  torax: number | null
  braco_d: number | null
  braco_e: number | null
  coxa_d: number | null
  coxa_e: number | null
  panturrilha: number | null
  bf_estimado: number | null
  created_at: string
}

export interface NutritionTarget {
  id: string
  profile_id: string
  data: string // AAAA-MM-DD
  tmb: number
  tdee: number
  kcal_alvo: number
  proteina_g: number
  gordura_g: number
  carbo_g: number
  objetivo: Objetivo
  peso_alvo_semana_pct: number
  motivo: string
  created_at: string
}

/** Anamnese em andamento: o progresso de cada etapa fica salvo só no aparelho. */
export interface RascunhoAnamnese {
  profile_id: string
  etapa: number
  respostas: Partial<RespostasAnamnese>
  atualizado_em: string
}

/** Academia com a lista de equipamentos (chaves de data/equipamentos.json). */
export interface Gym {
  id: string
  profile_id: string
  nome: string
  ativa: boolean
  equipamentos: string[]
  created_at: string
  updated_at: string
}

export interface Program {
  id: string
  profile_id: string
  nome: string
  objetivo: Objetivo
  dias_semana: number
  criado_em: string
  ativo: boolean
  updated_at: string
}

export type StatusMesociclo = 'proposto' | 'aprovado' | 'em_andamento' | 'concluido'

export interface Mesocycle {
  id: string
  program_id: string
  profile_id: string
  numero: number
  semanas: number
  enfase: string[]
  status: StatusMesociclo
  diagnostico: Record<string, unknown>
  aprovado_em: string | null
  created_at: string
  updated_at: string
}

export interface Slot {
  id: string
  mesocycle_id: string
  profile_id: string
  dia: number
  ordem: number
  exercise_id: string
  padrao_movimento: string
  tipo: 'composto' | 'acessorio' | 'aerobico'
  /** Só no aeróbico. */
  minutos: number | null
  series_alvo: number
  rep_min: number
  rep_max: number
  rir_semana: number[]
  substituiu_slot_id: string | null
  motivo: string
  created_at: string
}

/** Proposta de bloco ainda não aprovada: fica só no aparelho. */
export interface PropostaLocal {
  profile_id: string
  variante: number
  proposta: PropostaMesociclo
  /** Trocas feitas à mão: "dia-ordem" → slug do exercício escolhido. */
  trocas: Record<string, string>
  gym_id: string
  anamnese_id: string
  gerada_em: string
}

/** Fila de escrita para o Supabase. Enviada por src/db/sync.ts. */
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
  anamneses!: EntityTable<Anamnese, 'id'>
  measurements!: EntityTable<Measurement, 'id'>
  nutrition_targets!: EntityTable<NutritionTarget, 'id'>
  rascunhos_anamnese!: EntityTable<RascunhoAnamnese, 'profile_id'>
  gyms!: EntityTable<Gym, 'id'>
  programs!: EntityTable<Program, 'id'>
  mesocycles!: EntityTable<Mesocycle, 'id'>
  slots!: EntityTable<Slot, 'id'>
  propostas!: EntityTable<PropostaLocal, 'profile_id'>

  constructor(nome = 'treino') {
    super(nome)
    this.version(1).stores({
      profiles: 'id',
      sync_outbox: '++id, status, tabela, created_at',
    })
    this.version(2).stores({
      anamneses: 'id, profile_id, [profile_id+versao]',
      measurements: 'id, profile_id, [profile_id+data]',
      nutrition_targets: 'id, profile_id, [profile_id+data]',
      rascunhos_anamnese: 'profile_id',
    })
    this.version(3).stores({
      gyms: 'id, profile_id',
    })
    this.version(4).stores({
      programs: 'id, profile_id',
      mesocycles: 'id, program_id, profile_id',
      slots: 'id, mesocycle_id, profile_id',
      propostas: 'profile_id',
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
