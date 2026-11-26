/**
 * Catálogo de exercícios: tipos, busca e disponibilidade. Funções puras.
 * Os dados vêm de data/exercises.pt.json (carregado por quem chama).
 */
import type { Constraint, Nivel } from './anamnese'

export interface Exercicio {
  slug: string
  nome_pt: string
  nome_en: string
  padrao_movimento: string
  musculo_primario: string
  musculos_secundarios: string[]
  equipamento: string
  nivel: Nivel
  mecanica: string | null
  unilateral: boolean
  instrucoes_pt: string[]
  imagens: string[]
  contraindicacoes: string[]
}

/** Equipamento que toda academia tem. */
export const SEMPRE_DISPONIVEL = new Set(['peso_corporal'])

/** Minúsculas e sem acento, para buscar "supino" ou "rosca biceps" do jeito que se digita. */
export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Busca por nome (português ou inglês). Todas as palavras digitadas precisam
 * aparecer. Opcionalmente filtra por músculo primário. Ordena por nome.
 */
export function buscar(catalogo: Exercicio[], termo: string, musculo?: string | null): Exercicio[] {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean)
  return catalogo
    .filter((e) => !musculo || e.musculo_primario === musculo)
    .filter((e) => {
      const alvo = normalizar(`${e.nome_pt} ${e.nome_en}`)
      return palavras.every((p) => alvo.includes(p))
    })
    .sort((a, b) => a.nome_pt.localeCompare(b.nome_pt, 'pt-BR'))
}

export function disponivelNa(e: Exercicio, equipamentos: readonly string[]): boolean {
  return SEMPRE_DISPONIVEL.has(e.equipamento) || equipamentos.includes(e.equipamento)
}

/** Restrições do usuário que o exercício contraria. */
export function conflitos(e: Exercicio, constraints: readonly Constraint[]): Constraint[] {
  return constraints.filter((c) => e.contraindicacoes.includes(c))
}

const ORDEM_NIVEL: Record<Nivel, number> = { iniciante: 0, intermediario: 1, avancado: 2 }

/** Exercício no nível do usuário ou abaixo dele. */
export function nivelCompativel(exercicio: Nivel, usuario: Nivel): boolean {
  return ORDEM_NIVEL[exercicio] <= ORDEM_NIVEL[usuario]
}
