/**
 * Nutrição — estimativa de referência (seção 11 da especificação).
 * Funções puras. Tudo aqui é estimativa para orientar ajuste, não prescrição.
 */
import type { AtividadeDiaria, Objetivo, Sexo } from './anamnese'

export const FATOR_ATIVIDADE: Record<AtividadeDiaria, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  intenso: 1.725,
}

/** Ajuste sobre o gasto total. Emagrecimento −15% e hipertrofia +7,5% (meio das faixas). */
const AJUSTE_CALORICO: Record<Objetivo, number> = {
  emagrecimento: -0.15,
  hipertrofia: 0.075,
  forca: 0,
  condicionamento: 0,
  saude: 0,
}

/** g/kg: mais proteína em déficit para preservar massa magra. */
const PROTEINA_G_KG: Record<Objetivo, number> = {
  emagrecimento: 2.0,
  hipertrofia: 1.8,
  forca: 1.8,
  condicionamento: 1.6,
  saude: 1.6,
}
const GORDURA_G_KG = 0.8

/** Faixa de ritmo de peso (% do peso por semana) e o alvo usado. */
export const RITMO_PESO: Record<Objetivo, { min: number; max: number; alvo: number } | null> = {
  emagrecimento: { min: -1.0, max: -0.5, alvo: -0.75 },
  hipertrofia: { min: 0.25, max: 0.5, alvo: 0.375 },
  forca: null,
  condicionamento: null,
  saude: null,
}

export interface DadosCorporais {
  sexo: Sexo
  peso_kg: number
  altura_cm: number
  idade: number
}

/** Mifflin-St Jeor. */
export function tmbMifflin({ sexo, peso_kg, altura_cm, idade }: DadosCorporais): number {
  const base = 10 * peso_kg + 6.25 * altura_cm - 5 * idade
  return sexo === 'masculino' ? base + 5 : base - 161
}

export interface MetaNutricional {
  tmb: number
  tdee: number
  kcal_alvo: number
  proteina_g: number
  gordura_g: number
  carbo_g: number
  peso_alvo_semana_pct: number
  ajuste_pct: number
  /** true quando a meta foi levantada para não ficar abaixo do basal. */
  limitada_pelo_basal: boolean
}

const arred10 = (n: number) => Math.round(n / 10) * 10

/** Distribui macros: proteína e gordura por kg, carboidrato preenche o resto. */
export function macros(kcal: number, peso_kg: number, objetivo: Objetivo) {
  const proteina_g = Math.round(PROTEINA_G_KG[objetivo] * peso_kg)
  const gordura_g = Math.round(GORDURA_G_KG * peso_kg)
  const carbo_g = Math.max(0, Math.round((kcal - proteina_g * 4 - gordura_g * 9) / 4))
  return { proteina_g, gordura_g, carbo_g }
}

export function metaNutricional(
  dados: DadosCorporais & { atividade: AtividadeDiaria; objetivo: Objetivo },
): MetaNutricional {
  const tmb = Math.round(tmbMifflin(dados))
  const tdee = Math.round(tmb * FATOR_ATIVIDADE[dados.atividade])
  const ajuste = AJUSTE_CALORICO[dados.objetivo]
  const desejada = arred10(tdee * (1 + ajuste))
  // Regra da especificação: nunca propor meta abaixo do basal estimado.
  const kcal_alvo = Math.max(desejada, tmb)
  return {
    tmb,
    tdee,
    kcal_alvo,
    ...macros(kcal_alvo, dados.peso_kg, dados.objetivo),
    peso_alvo_semana_pct: RITMO_PESO[dados.objetivo]?.alvo ?? 0,
    ajuste_pct: ajuste * 100,
    limitada_pelo_basal: kcal_alvo > desejada,
  }
}

/**
 * Gordura corporal pela fórmula da Marinha dos EUA (cm). Devolve null quando
 * faltam medidas ou elas não fazem sentido (logaritmo de número ≤ 0).
 */
export function gorduraMarinha(m: {
  sexo: Sexo
  altura_cm: number
  pescoco?: number | null
  cintura?: number | null
  quadril?: number | null
}): number | null {
  const { sexo, altura_cm, pescoco, cintura, quadril } = m
  if (!pescoco || !cintura || altura_cm <= 0) return null
  let bf: number
  if (sexo === 'masculino') {
    const d = cintura - pescoco
    if (d <= 0) return null
    bf = 495 / (1.0324 - 0.19077 * Math.log10(d) + 0.15456 * Math.log10(altura_cm)) - 450
  } else {
    if (!quadril) return null
    const d = cintura + quadril - pescoco
    if (d <= 0) return null
    bf = 495 / (1.29579 - 0.35004 * Math.log10(d) + 0.221 * Math.log10(altura_cm)) - 450
  }
  if (!Number.isFinite(bf) || bf < 2 || bf > 70) return null
  return Math.round(bf * 10) / 10
}

// ---------------------------------------------------------------------------
// Ajuste adaptativo
// ---------------------------------------------------------------------------

export interface Pesagem {
  data: string // AAAA-MM-DD
  peso_kg: number
}

const diaNum = (d: string) => {
  const [a, m, dia] = d.split('-').map(Number) as [number, number, number]
  return Date.UTC(a, m - 1, dia) / 86_400_000
}

/** Média das pesagens nos 7 dias que terminam em `fim` (inclusive). Exige 3 pesagens. */
export function mediaMovel7(pesagens: Pesagem[], fim: string): number | null {
  const f = diaNum(fim)
  const janela = pesagens.filter((p) => {
    const d = diaNum(p.data)
    return d <= f && d > f - 7
  })
  if (janela.length < 3) return null
  return janela.reduce((s, p) => s + p.peso_kg, 0) / janela.length
}

export interface AjusteAdaptativo {
  kcal_nova: number
  ajuste_pct: number
  variacao_semana_pct: number
  motivo: string
}

const fmt = (n: number) => n.toFixed(2).replace('.', ',')

/**
 * Compara a média móvel de hoje com a de 14 dias atrás. Se o ritmo semanal
 * ficou fora da faixa do objetivo, ajusta as calorias em ±10% e explica o número.
 * Sem ajuste (null) quando não há dados suficientes ou o ritmo está na faixa.
 */
export function ajusteAdaptativo(p: {
  objetivo: Objetivo
  kcal_atual: number
  tmb: number
  pesagens: Pesagem[]
  hoje: string
}): AjusteAdaptativo | null {
  const faixa = RITMO_PESO[p.objetivo]
  if (!faixa) return null
  const agora = mediaMovel7(p.pesagens, p.hoje)
  const inicio = new Date((diaNum(p.hoje) - 14) * 86_400_000).toISOString().slice(0, 10)
  const antes = mediaMovel7(p.pesagens, inicio)
  if (agora === null || antes === null) return null

  const variacao = ((agora - antes) / antes) * 100 / 2 // % por semana
  // Acima da faixa (perdendo devagar ou ganhando rápido) → −10%; abaixo → +10%.
  const ajuste = variacao > faixa.max ? -0.1 : variacao < faixa.min ? 0.1 : 0
  if (ajuste === 0) return null

  const kcal_nova = Math.max(arred10(p.kcal_atual * (1 + ajuste)), p.tmb)
  if (kcal_nova === p.kcal_atual) return null
  const faixaTxt = `${fmt(faixa.min)}% a ${fmt(faixa.max)}%`
  return {
    kcal_nova,
    ajuste_pct: ajuste * 100,
    variacao_semana_pct: Math.round(variacao * 100) / 100,
    motivo:
      `Média de 7 dias foi de ${fmt(antes)} kg para ${fmt(agora)} kg em 2 semanas ` +
      `(${fmt(variacao)}% por semana; faixa alvo ${faixaTxt}). ` +
      `Calorias ${ajuste > 0 ? '+' : '−'}10%: ${p.kcal_atual} → ${kcal_nova} kcal.`,
  }
}
