import { describe, expect, it } from 'vitest'
import {
  avaliarAnamnese,
  idadeEm,
  nivelPorTempo,
  podeGerarPrograma,
  restricoesDasLesoes,
  SINAIS_ALERTA,
  triar,
  type RespostasAnamnese,
  type SinalAlerta,
} from '../anamnese'
import {
  ajusteAdaptativo,
  gorduraMarinha,
  mediaMovel7,
  metaNutricional,
  tmbMifflin,
  type Pesagem,
} from '../nutrition'

const semAlerta = Object.fromEntries(SINAIS_ALERTA.map((s) => [s, false])) as Record<SinalAlerta, boolean>

function respostas(extra: Partial<RespostasAnamnese> = {}): RespostasAnamnese {
  return {
    identificacao: { data_nascimento: '1995-06-15', sexo: 'masculino', altura_cm: 178, peso_kg: 80 },
    historico: { meses_treino_continuo: 3, experiencia: '', frequencia_atual: 2, padroes_dominados: [] },
    alerta: { ...semAlerta },
    familiar: { cardiovascular_precoce: false, diabetes: false, hipertensao: false },
    lesoes: [],
    contexto: { dias_semana: 3, minutos_sessao: 60, horas_sono: 7, estresse: 'medio', atividade_diaria: 'leve' },
    objetivo: { objetivo: 'hipertrofia', musculos_prioritarios: [] },
    ...extra,
  }
}

describe('triagem (cenário 3)', () => {
  it('sinal de alerta positivo bloqueia a geração de programa', () => {
    const av = avaliarAnamnese(respostas({ alerta: { ...semAlerta, dor_peito: true } }), null)
    expect(av.clearance_status).toBe('orientar_avaliacao')
    expect(av.sinais_positivos).toEqual(['dor_peito'])
    expect(podeGerarPrograma(av.clearance_status)).toBe(false)
  })

  it('sem sinal de alerta, libera', () => {
    expect(triar(semAlerta, null)).toBe('liberado')
    expect(podeGerarPrograma('liberado')).toBe(true)
  })

  it('liberação registrada com data e profissional desbloqueia', () => {
    const alerta = { ...semAlerta, pressao_descontrolada: true }
    const lib = { data: '2026-11-20', profissional: 'Dra. Ana, cardiologista', registrado_em: '2026-11-26T10:00:00Z' }
    expect(triar(alerta, lib)).toBe('liberado_por_registro')
    expect(triar(alerta, { ...lib, profissional: '  ' })).toBe('orientar_avaliacao')
  })
})

describe('restrições das lesões', () => {
  it('lombar ativa remove carga axial (base do cenário 2)', () => {
    const r = restricoesDasLesoes([{ regiao: 'lombar', status: 'ativa', movimentos: [] }])
    expect(r.map((x) => x.constraint)).toContain('sem_carga_axial')
    expect(r[0]?.motivo).toBe('Lombar (ativa)')
  })

  it('reabilitação usa só os movimentos que doem', () => {
    const r = restricoesDasLesoes([{ regiao: 'ombro', status: 'reabilitacao', movimentos: ['acima_cabeca'] }])
    expect(r.map((x) => x.constraint)).toEqual(['sem_desenvolvimento_acima_cabeca'])
  })

  it('lesão resolvida não gera restrição e repetidas não duplicam', () => {
    const r = restricoesDasLesoes([
      { regiao: 'joelho', status: 'resolvida', movimentos: ['saltar_correr'] },
      { regiao: 'tornozelo', status: 'ativa', movimentos: ['saltar_correr'] },
    ])
    expect(r.map((x) => x.constraint)).toEqual(['sem_impacto'])
  })
})

describe('nível e idade', () => {
  it('faixas da tabela 6.1', () => {
    expect(nivelPorTempo(5)).toBe('iniciante')
    expect(nivelPorTempo(6)).toBe('intermediario')
    expect(nivelPorTempo(24)).toBe('intermediario')
    expect(nivelPorTempo(25)).toBe('avancado')
  })
  it('idade considera o aniversário', () => {
    expect(idadeEm('1995-06-15', '2026-06-14')).toBe(30)
    expect(idadeEm('1995-06-15', '2026-06-15')).toBe(31)
  })
})

describe('meta nutricional', () => {
  it('Mifflin-St Jeor', () => {
    expect(tmbMifflin({ sexo: 'masculino', peso_kg: 80, altura_cm: 180, idade: 30 })).toBe(1780)
    expect(tmbMifflin({ sexo: 'feminino', peso_kg: 60, altura_cm: 165, idade: 30 })).toBeCloseTo(1320.25)
  })

  it('emagrecimento: −15% do gasto total e macros fecham as calorias', () => {
    const m = metaNutricional({
      sexo: 'masculino', peso_kg: 80, altura_cm: 180, idade: 30, atividade: 'moderado', objetivo: 'emagrecimento',
    })
    expect(m.tdee).toBe(2759)
    expect(m.kcal_alvo).toBe(2350)
    expect(m.proteina_g).toBe(160)
    expect(m.gordura_g).toBe(64)
    expect(Math.abs(m.proteina_g * 4 + m.gordura_g * 9 + m.carbo_g * 4 - m.kcal_alvo)).toBeLessThan(4)
  })

  it('nunca propõe meta abaixo do basal', () => {
    const m = metaNutricional({
      sexo: 'feminino', peso_kg: 50, altura_cm: 155, idade: 40, atividade: 'sedentario', objetivo: 'emagrecimento',
    })
    expect(m.kcal_alvo).toBeGreaterThanOrEqual(m.tmb)
    // Sedentário × 0,85 = 1,02 × basal: o piso só atua no ajuste adaptativo.
    expect(m.kcal_alvo).toBe(1130)
  })
})

describe('gordura corporal (Marinha)', () => {
  it('homem e mulher dão valores plausíveis', () => {
    expect(gorduraMarinha({ sexo: 'masculino', altura_cm: 178, pescoco: 38, cintura: 85 })).toBe(16.4)
    const f = gorduraMarinha({ sexo: 'feminino', altura_cm: 165, pescoco: 32, cintura: 72, quadril: 98 })
    expect(f).toBeGreaterThan(20)
    expect(f).toBeLessThan(35)
  })
  it('sem medida necessária devolve null', () => {
    expect(gorduraMarinha({ sexo: 'feminino', altura_cm: 165, pescoco: 32, cintura: 72 })).toBeNull()
  })
})

function serie(inicio: string, dias: number, peso: (i: number) => number): Pesagem[] {
  const base = Date.parse(inicio + 'T00:00:00Z')
  return Array.from({ length: dias }, (_, i) => ({
    data: new Date(base + i * 86_400_000).toISOString().slice(0, 10),
    peso_kg: peso(i),
  }))
}

describe('ajuste adaptativo (cenário 8)', () => {
  it('peso parado 2 semanas em déficit → −10% nas calorias, com o motivo', () => {
    const pesagens = serie('2026-11-01', 21, () => 80)
    const a = ajusteAdaptativo({ objetivo: 'emagrecimento', kcal_atual: 2200, tmb: 1700, pesagens, hoje: '2026-11-21' })
    expect(a).not.toBeNull()
    expect(a?.ajuste_pct).toBe(-10)
    expect(a?.kcal_nova).toBe(1980)
    expect(a?.motivo).toContain('2200 → 1980')
  })

  it('perdendo no ritmo certo não ajusta', () => {
    // ~0,75% por semana
    const pesagens = serie('2026-11-01', 21, (i) => 80 * (1 - (0.0075 / 7) * i))
    expect(ajusteAdaptativo({ objetivo: 'emagrecimento', kcal_atual: 2200, tmb: 1700, pesagens, hoje: '2026-11-21' })).toBeNull()
  })

  it('o ajuste também respeita o basal', () => {
    const pesagens = serie('2026-11-01', 21, () => 80)
    const a = ajusteAdaptativo({ objetivo: 'emagrecimento', kcal_atual: 1750, tmb: 1700, pesagens, hoje: '2026-11-21' })
    expect(a?.kcal_nova).toBe(1700)
  })

  it('sem pesagens suficientes não decide nada', () => {
    expect(mediaMovel7([{ data: '2026-11-20', peso_kg: 80 }], '2026-11-21')).toBeNull()
    expect(ajusteAdaptativo({ objetivo: 'hipertrofia', kcal_atual: 2800, tmb: 1800, pesagens: [], hoje: '2026-11-21' })).toBeNull()
  })
})
