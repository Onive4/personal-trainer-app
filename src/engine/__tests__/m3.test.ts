import { describe, expect, it } from 'vitest'
import catalogoJson from '../../../data/exercises.pt.json'
import equipamentosJson from '../../../data/equipamentos.json'
import type { Exercicio } from '../catalogo'
import { montarMesociclo, PADROES_OBRIGATORIOS, rampaRir, type EntradaPrograma } from '../builder'
import { metasDeVolume, seriesPorSessao } from '../volume'

const catalogo = catalogoJson as Exercicio[]
const porSlug = new Map(catalogo.map((e) => [e.slug, e]))
const todos = Object.values(equipamentosJson as Record<string, { chave: string }[]>)
  .flat()
  .map((e) => e.chave)

const entrada = (p: Partial<EntradaPrograma> = {}): EntradaPrograma => ({
  nivel: 'iniciante',
  objetivo: 'hipertrofia',
  dias_semana: 3,
  minutos_sessao: 60,
  musculos_prioritarios: [],
  conhecimento: 'alguns',
  constraints: [],
  equipamentos: todos,
  catalogo,
  ...p,
})

const slots = (p: ReturnType<typeof montarMesociclo>) => p.dias.flatMap((d) => musculacao(d))
const musculacao = (d: { slots: { tipo: string; series_alvo: number; exercise_id: string; padrao_movimento: string; rep_min: number; rep_max: number; motivo: string }[] }) =>
  d.slots.filter((s) => s.tipo !== 'aerobico')
const series = (p: ReturnType<typeof montarMesociclo>, prefixo: string) =>
  slots(p)
    .filter((s) => s.padrao_movimento.startsWith(prefixo))
    .reduce((t, s) => t + s.series_alvo, 0)

describe('cenário 1 — iniciante, hipertrofia, 3 dias, sem restrição', () => {
  const p = montarMesociclo(entrada())

  it('corpo inteiro A/B/C', () => {
    expect(p.dias.map((d) => d.nome)).toEqual(['Corpo inteiro A', 'Corpo inteiro B', 'Corpo inteiro C'])
  })
  it('volume no piso: meta = piso e nada passa do teto', () => {
    for (const v of p.volume) {
      expect(v.alvo).toBe(v.min)
      expect(v.planejado).toBeLessThanOrEqual(v.max)
    }
  })
  it('só exercícios de nível iniciante', () => {
    for (const s of slots(p)) expect(porSlug.get(s.exercise_id)!.nivel).toBe('iniciante')
  })
  it('padrões equilibrados: os 8 obrigatórios e puxar ≥ empurrar', () => {
    const cobertos = new Set(slots(p).map((s) => s.padrao_movimento))
    for (const padrao of PADROES_OBRIGATORIOS) expect(cobertos).toContain(padrao)
    expect(p.validacao.padroes_faltando).toEqual([])
    expect(series(p, 'puxar')).toBeGreaterThanOrEqual(series(p, 'empurrar'))
  })
  it('cabe no tempo de cada sessão, com aeróbico no fim', () => {
    for (const d of p.dias) {
      expect(musculacao(d).reduce((t, s) => t + s.series_alvo, 0)).toBeLessThanOrEqual(seriesPorSessao(60))
      expect(d.minutos_estimados).toBeLessThanOrEqual(60)
      const ultimo = d.slots.at(-1)!
      expect(ultimo.tipo).toBe('aerobico')
      expect(ultimo.minutos).toBeGreaterThanOrEqual(10)
    }
  })
  it('faixas da tabela 6.3 e rampa de RIR 3 → 1 com descarga', () => {
    const composto = slots(p).find((s) => s.tipo === 'composto')!
    expect([composto.rep_min, composto.rep_max]).toEqual([5, 8])
    expect(p.rir_semana).toEqual([3, 2, 2, 1, 4])
    expect(p.semanas).toBe(5)
  })
  it('cada escolha traz o motivo', () => {
    for (const s of slots(p)) expect(s.motivo.length).toBeGreaterThan(10)
  })
})

describe('cenário 2 — intermediário com dor lombar ativa', () => {
  const constraints = ['sem_carga_axial', 'sem_flexao_lombar_carregada', 'sem_hiperextensao_lombar'] as const
  const p = montarMesociclo(entrada({ nivel: 'intermediario', dias_semana: 4, constraints: [...constraints] }))

  it('nenhum exercício com carga axial ou que contrarie a lombar', () => {
    for (const s of slots(p)) {
      const e = porSlug.get(s.exercise_id)!
      for (const c of constraints) expect(e.contraindicacoes).not.toContain(c)
    }
  })
  it('ainda cobre agachamento (sem carga na coluna)', () => {
    expect(slots(p).some((s) => s.padrao_movimento === 'agachamento')).toBe(true)
  })
})

describe('regras gerais', () => {
  it('só equipamento da academia ativa', () => {
    const equipamentos = ['peso_corporal', 'halteres', 'banco_halteres', 'polia_alta', 'polia_baixa', 'leg_press', 'barra_fixa']
    const p = montarMesociclo(entrada({ equipamentos }))
    for (const s of slots(p)) {
      const e = porSlug.get(s.exercise_id)!
      expect(['peso_corporal', ...equipamentos]).toContain(e.equipamento)
    }
  })

  it('prioritários ficam no topo da faixa', () => {
    const metas = metasDeVolume('intermediario', ['gluteos', 'peito'])
    expect(metas.find((m) => m.grupo === 'gluteos')!.alvo).toBe(18)
    expect(metas.find((m) => m.grupo === 'quadriceps')!.alvo).toBe(12)
  })

  it('para todos os números de dias: puxar ≥ empurrar, tempo respeitado, divisão certa', () => {
    for (const dias_semana of [2, 3, 4, 5, 6]) {
      for (const nivel of ['iniciante', 'intermediario', 'avancado'] as const) {
        const p = montarMesociclo(entrada({ dias_semana, nivel, minutos_sessao: 75, musculos_prioritarios: ['peito', 'gluteos'] }))
        for (const v of p.volume) expect(v.planejado).toBeLessThanOrEqual(v.max)
        expect(p.dias).toHaveLength(dias_semana)
        expect(series(p, 'puxar')).toBeGreaterThanOrEqual(series(p, 'empurrar'))
        expect(p.validacao.padroes_faltando).toEqual([])
        for (const d of p.dias) {
          expect(musculacao(d).reduce((t, s) => t + s.series_alvo, 0)).toBeLessThanOrEqual(seriesPorSessao(75))
          expect(d.minutos_estimados).toBeLessThanOrEqual(75)
        }
      }
    }
  })

  it('é determinístico e "outra proposta" muda algo', () => {
    const a = montarMesociclo(entrada())
    expect(montarMesociclo(entrada())).toEqual(a)
    const b = montarMesociclo(entrada({ variante: 1 }))
    expect(slots(b).map((s) => s.exercise_id)).not.toEqual(slots(a).map((s) => s.exercise_id))
  })

  it('perfis diferentes geram programas diferentes', () => {
    const raphael = montarMesociclo(entrada({ objetivo: 'emagrecimento', dias_semana: 4, nivel: 'iniciante' }))
    const julyana = montarMesociclo(entrada({ objetivo: 'saude', dias_semana: 3, nivel: 'intermediario', musculos_prioritarios: ['gluteos'] }))
    expect(raphael.divisao).not.toBe(julyana.divisao)
    expect(slots(raphael)[0]!.rep_min).not.toBe(slots(julyana)[0]!.rep_min)
  })

  it('rampa de RIR por objetivo', () => {
    expect(rampaRir('forca', 5)).toEqual([2, 2, 2, 1, 1, 4])
    expect(rampaRir('saude', 4)).toEqual([4, 3, 3, 2, 5])
  })
})

describe('ajustes de simplicidade', () => {
  it('quem não conhece os aparelhos recebe máquinas/cabos e repetição na semana', () => {
    const p = montarMesociclo(entrada({ conhecimento: 'nenhum', dias_semana: 4, nivel: 'intermediario' }))
    const ex = slots(p).map((s) => porSlug.get(s.exercise_id)!)
    const estaveis = ex.filter((e) => /^(maquina_|cadeira_|mesa_|leg_press|smith|polia_|crossover)/.test(e.equipamento))
    expect(estaveis.length / ex.length).toBeGreaterThan(0.6)
    expect(new Set(ex.map((e) => e.slug)).size).toBeLessThan(ex.length)
    for (const e of ex) expect(e.nivel).toBe('iniciante')
  })

  it('nunca repete o mesmo exercício no mesmo treino', () => {
    for (const conhecimento of ['nenhum', 'alguns', 'bem'] as const) {
      for (const dias_semana of [2, 3, 4, 5, 6]) {
        const p = montarMesociclo(entrada({ conhecimento, dias_semana, nivel: 'intermediario', minutos_sessao: 45 }))
        for (const d of p.dias) {
          const ids = d.slots.map((s) => s.exercise_id)
          expect(new Set(ids).size).toBe(ids.length)
        }
      }
    }
  })

  it('quem conhece bem recebe mais peso livre que quem não conhece', () => {
    const livres = (conhecimento: 'nenhum' | 'bem') =>
      slots(montarMesociclo(entrada({ conhecimento, nivel: 'intermediario', dias_semana: 4 }))).filter((s) =>
        /^(barra_|halteres|trap_bar|anilha|banco_)/.test(porSlug.get(s.exercise_id)!.equipamento),
      ).length
    expect(livres('bem')).toBeGreaterThan(livres('nenhum'))
  })

  it('sem impacto: aeróbico sem corrida nem corda', () => {
    const p = montarMesociclo(entrada({ constraints: ['sem_impacto'], dias_semana: 5 }))
    for (const d of p.dias) {
      const a = porSlug.get(d.slots.at(-1)!.exercise_id)!
      expect(a.contraindicacoes).not.toContain('sem_impacto')
    }
  })

  it('6 treinos de 45 min (emagrecimento): os treinos usam o tempo e somam aeróbico', () => {
    const p = montarMesociclo(entrada({ nivel: 'intermediario', objetivo: 'emagrecimento', dias_semana: 6, minutos_sessao: 45 }))
    for (const d of p.dias) expect(d.minutos_estimados).toBeGreaterThanOrEqual(35)
    expect(p.aerobico_semana_min).toBeGreaterThanOrEqual(60)
  })

  it('a explicação é em português comum, sem siglas técnicas', () => {
    const p = montarMesociclo(entrada())
    expect(p.explicacao.length).toBeGreaterThan(3)
    for (const f of [...p.explicacao, ...p.avisos]) expect(f).not.toMatch(/RIR|mesociclo|composto|padrão de movimento|_/)
  })
})
