import { describe, expect, it } from 'vitest'
import catalogoJson from '../../../data/exercises.pt.json'
import equipamentosJson from '../../../data/equipamentos.json'
import { buscar, conflitos, disponivelNa, normalizar, type Exercicio } from '../catalogo'
import { alternativas, type ContextoSubstituicao } from '../substitution'

const catalogo = catalogoJson as Exercicio[]
const todos = Object.values(equipamentosJson as Record<string, { chave: string }[]>)
  .flat()
  .map((e) => e.chave)
const ex = (slug: string) => {
  const e = catalogo.find((x) => x.slug === slug)
  if (!e) throw new Error(slug)
  return e
}
const ctx = (p: Partial<ContextoSubstituicao> = {}): ContextoSubstituicao => ({
  equipamentos: todos,
  constraints: [],
  nivel: 'intermediario',
  ...p,
})

describe('catálogo', () => {
  it('toda chave de equipamento do catálogo está no checklist', () => {
    for (const e of catalogo) expect(todos).toContain(e.equipamento)
  })

  it('busca ignora acento e maiúscula e exige todas as palavras', () => {
    expect(normalizar('Rosca Bíceps')).toBe('rosca biceps')
    const r = buscar(catalogo, 'leg press')
    expect(r.map((e) => e.slug)).toContain('Leg_Press')
    expect(r.every((e) => normalizar(e.nome_pt + ' ' + e.nome_en).includes('leg'))).toBe(true)
  })

  it('peso corporal está sempre disponível', () => {
    const corporal = catalogo.find((e) => e.equipamento === 'peso_corporal')!
    expect(disponivelNa(corporal, [])).toBe(true)
    expect(disponivelNa(ex('Leg_Press'), [])).toBe(false)
  })
})

describe('substituição', () => {
  it('cenário 7: academia sem leg press → alternativa de mesmo padrão e músculo', () => {
    const r = alternativas(ex('Leg_Press'), catalogo, ctx({ equipamentos: todos.filter((k) => k !== 'leg_press') }))
    expect(r).toHaveLength(3)
    for (const a of r) {
      expect(a.exercicio.musculo_primario).toBe('quadriceps')
      expect(a.exercicio.padrao_movimento).toBe('agachamento')
      expect(a.exercicio.equipamento).not.toBe('leg_press')
      expect(a.tipo).toBe('mesmo_padrao')
    }
  })

  it('nunca sugere exercício que contraria uma restrição', () => {
    const r = alternativas(ex('Leg_Press'), catalogo, ctx({ constraints: ['sem_carga_axial', 'flexao_joelho_limitada'] }))
    for (const a of r) expect(conflitos(a.exercicio, ['sem_carga_axial', 'flexao_joelho_limitada'])).toEqual([])
  })

  it('só equipamento disponível; com academia vazia, só peso corporal', () => {
    const r = alternativas(ex('Leg_Press'), catalogo, ctx({ equipamentos: [] }))
    for (const a of r) expect(a.exercicio.equipamento).toBe('peso_corporal')
  })

  it('fallback: sem candidato do mesmo padrão, troca o padrão e avisa', () => {
    const r = alternativas(ex('Face_Pull'), catalogo, ctx())
    expect(r.length).toBeGreaterThan(0)
    for (const a of r) {
      expect(a.exercicio.musculo_primario).toBe('ombros')
      expect(a.tipo).toBe('outro_padrao')
    }
  })

  it('fallback: músculo com um exercício só busca quem o trabalha como secundário', () => {
    const r = alternativas(ex('Thigh_Adductor'), catalogo, ctx())
    expect(r.length).toBeGreaterThan(0)
    for (const a of r) {
      expect(a.tipo).toBe('musculo_secundario')
      expect(a.exercicio.musculos_secundarios).toContain('adutores')
    }
  })

  it('mesmo padrão vem antes de outro padrão', () => {
    const r = alternativas(ex('Leg_Press'), catalogo, ctx(), 50)
    const primeiroOutro = r.findIndex((a) => a.tipo !== 'mesmo_padrao')
    const ultimoMesmo = r.map((a) => a.tipo).lastIndexOf('mesmo_padrao')
    if (primeiroOutro !== -1) expect(ultimoMesmo).toBeLessThan(primeiroOutro)
  })

  it('com a academia completa, todo exercício do catálogo tem alternativa', () => {
    const sem = catalogo.filter((e) => alternativas(e, catalogo, ctx()).length === 0).map((e) => e.slug)
    expect(sem).toEqual([])
  })

  it('é determinístico', () => {
    const a = alternativas(ex('Barbell_Squat'), catalogo, ctx()).map((x) => x.exercicio.slug)
    const b = alternativas(ex('Barbell_Squat'), catalogo, ctx()).map((x) => x.exercicio.slug)
    expect(a).toEqual(b)
  })
})
