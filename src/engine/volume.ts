/**
 * Volume semanal por músculo — seção 6.1 da especificação. Funções puras.
 */
import type { Nivel } from './anamnese'
import type { Exercicio } from './catalogo'

/** Grupos que recebem meta de volume. Dorsais e meio das costas contam juntos. */
export const GRUPOS = [
  'peito',
  'costas',
  'ombros',
  'quadriceps',
  'posterior_de_coxa',
  'gluteos',
  'biceps',
  'triceps',
  'panturrilha',
  'abdomen',
] as const
export type Grupo = (typeof GRUPOS)[number]

const MUSCULO_PARA_GRUPO: Record<string, Grupo> = {
  peito: 'peito',
  dorsais: 'costas',
  dorsal_medio: 'costas',
  ombros: 'ombros',
  quadriceps: 'quadriceps',
  posterior_de_coxa: 'posterior_de_coxa',
  gluteos: 'gluteos',
  biceps: 'biceps',
  triceps: 'triceps',
  panturrilha: 'panturrilha',
  abdomen: 'abdomen',
}

export function grupoDe(musculo: string): Grupo | null {
  return MUSCULO_PARA_GRUPO[musculo] ?? null
}

/** Séries semanais por grupo (tabela 6.1). */
export const FAIXA_VOLUME: Record<Nivel, { min: number; max: number }> = {
  iniciante: { min: 8, max: 10 },
  intermediario: { min: 12, max: 18 },
  avancado: { min: 16, max: 22 },
}

/** Panturrilha e abdômen recebem metade da meta: músculos pequenos, muito trabalho indireto. */
const FATOR_GRUPO: Partial<Record<Grupo, number>> = { panturrilha: 0.5, abdomen: 0.5 }

export interface MetaGrupo {
  grupo: Grupo
  min: number
  max: number
  alvo: number
  prioritario: boolean
}

/** Prioritários no topo da faixa; os demais no piso. */
export function metasDeVolume(nivel: Nivel, prioritarios: readonly string[]): MetaGrupo[] {
  const faixa = FAIXA_VOLUME[nivel]
  const gruposPrioritarios = new Set(prioritarios.map(grupoDe).filter((g): g is Grupo => g !== null))
  return GRUPOS.map((grupo) => {
    const f = FATOR_GRUPO[grupo] ?? 1
    const min = Math.round(faixa.min * f)
    const max = Math.round(faixa.max * f)
    const prioritario = gruposPrioritarios.has(grupo)
    return { grupo, min, max, alvo: prioritario ? max : min, prioritario }
  })
}

/** Uma série conta 1 para o músculo primário e 0,5 para cada secundário. */
export function contribuicao(e: Exercicio): Map<Grupo, number> {
  const m = new Map<Grupo, number>()
  const p = grupoDe(e.musculo_primario)
  if (p) m.set(p, 1)
  for (const s of e.musculos_secundarios) {
    const g = grupoDe(s)
    if (g && !m.has(g)) m.set(g, 0.5)
  }
  return m
}

export function volumeSemanal(itens: readonly { exercicio: Exercicio; series: number }[]): Record<Grupo, number> {
  const total = Object.fromEntries(GRUPOS.map((g) => [g, 0])) as Record<Grupo, number>
  for (const { exercicio, series } of itens) {
    for (const [g, peso] of contribuicao(exercicio)) total[g] += peso * series
  }
  return total
}

/** Tempo: ~10 min de aquecimento e ~2,5 min por série (execução + descanso). */
export const MINUTOS_AQUECIMENTO = 10
export const MINUTOS_POR_SERIE = 2.5

export function seriesPorSessao(minutos: number): number {
  return Math.max(8, Math.floor((minutos - MINUTOS_AQUECIMENTO) / MINUTOS_POR_SERIE))
}
