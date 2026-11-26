/**
 * Substituição de exercício — seção 10 da especificação. Função pura.
 *
 * Eliminatório: equipamento disponível na academia ativa e nenhuma
 * contraindicação com as restrições do usuário; e o mesmo músculo primário.
 * Pontuação: mesmo padrão de movimento (3), mesma condição unilateral/bilateral
 * (1), nível compatível (1).
 *
 * Fallback em dois degraus, sempre avisando o que mudou:
 * 1. Sem candidato do mesmo padrão: os do mesmo músculo com outro padrão já
 *    aparecem (a pontuação os coloca depois dos estritos) e vêm marcados.
 * 2. Nenhum candidato do mesmo músculo primário (ex.: adutores, que tem um
 *    exercício só): busca exercícios que trabalham esse músculo como secundário.
 */
import type { Constraint, Nivel } from './anamnese'
import { conflitos, disponivelNa, nivelCompativel, type Exercicio } from './catalogo'

export interface ContextoSubstituicao {
  equipamentos: readonly string[]
  constraints: readonly Constraint[]
  nivel: Nivel
}

export type TipoAlternativa = 'mesmo_padrao' | 'outro_padrao' | 'musculo_secundario'

export interface Alternativa {
  exercicio: Exercicio
  pontos: number
  tipo: TipoAlternativa
}

/** O exercício pode ser feito por esta pessoa nesta academia? */
export function elegivel(e: Exercicio, ctx: ContextoSubstituicao): boolean {
  return disponivelNa(e, ctx.equipamentos) && conflitos(e, ctx.constraints).length === 0
}

function pontuar(alvo: Exercicio, e: Exercicio, nivel: Nivel): number {
  return (
    (e.padrao_movimento === alvo.padrao_movimento ? 3 : 0) +
    (e.unilateral === alvo.unilateral ? 1 : 0) +
    (nivelCompativel(e.nivel, nivel) ? 1 : 0)
  )
}

const porPontos = (a: Alternativa, b: Alternativa) =>
  b.pontos - a.pontos || a.exercicio.nome_pt.localeCompare(b.exercicio.nome_pt, 'pt-BR')

export function alternativas(
  alvo: Exercicio,
  catalogo: readonly Exercicio[],
  ctx: ContextoSubstituicao,
  quantas = 3,
): Alternativa[] {
  const candidatos = catalogo.filter((e) => e.slug !== alvo.slug && elegivel(e, ctx))

  const mesmoMusculo = candidatos
    .filter((e) => e.musculo_primario === alvo.musculo_primario)
    .map(
      (e): Alternativa => ({
        exercicio: e,
        pontos: pontuar(alvo, e, ctx.nivel),
        tipo: e.padrao_movimento === alvo.padrao_movimento ? 'mesmo_padrao' : 'outro_padrao',
      }),
    )
    .sort(porPontos)

  if (mesmoMusculo.length > 0) return mesmoMusculo.slice(0, quantas)

  return candidatos
    .filter((e) => e.musculos_secundarios.includes(alvo.musculo_primario))
    .map((e): Alternativa => ({ exercicio: e, pontos: pontuar(alvo, e, ctx.nivel), tipo: 'musculo_secundario' }))
    .sort(porPontos)
    .slice(0, quantas)
}
