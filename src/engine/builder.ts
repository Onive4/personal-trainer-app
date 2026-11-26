/**
 * Montagem do mesociclo — seções 6 e 7 da especificação. Função pura:
 * entra anamnese + academia + catálogo, sai a proposta do bloco com o motivo
 * de cada escolha. Mesma entrada → mesma saída.
 */
import type { Constraint, Nivel, Objetivo } from './anamnese'
import { conflitos, disponivelNa, nivelCompativel, type Exercicio } from './catalogo'
import {
  GRUPOS,
  grupoDe,
  metasDeVolume,
  seriesPorSessao,
  volumeSemanal,
  type Grupo,
  type MetaGrupo,
} from './volume'

export type TipoSlot = 'composto' | 'acessorio'

interface Molde {
  padrao: string | null // null = qualquer padrão, desde que seja do músculo
  musculo?: string
  tipo: TipoSlot
}
const C = (padrao: string, musculo?: string): Molde => ({ padrao, musculo, tipo: 'composto' })
const A = (padrao: string | null, musculo: string): Molde => ({ padrao, musculo, tipo: 'acessorio' })

const DIA: Record<string, { nome: string; moldes: Molde[] }> = {
  fbA: {
    nome: 'Corpo inteiro A',
    moldes: [C('agachamento'), C('empurrar_horizontal'), C('puxar_vertical'), C('dobradica_quadril'), A('isolamento', 'ombros'), A('isolamento', 'biceps'), A('anti_extensao', 'abdomen')],
  },
  fbB: {
    nome: 'Corpo inteiro B',
    moldes: [C('dobradica_quadril'), C('empurrar_vertical'), C('puxar_horizontal'), C('unilateral_perna'), A('isolamento', 'triceps'), A('isolamento', 'panturrilha'), A('anti_rotacao', 'abdomen')],
  },
  fbC: {
    nome: 'Corpo inteiro C',
    moldes: [C('agachamento'), C('empurrar_horizontal'), C('puxar_horizontal'), C('unilateral_perna'), A('isolamento', 'posterior_de_coxa'), A('isolamento', 'ombros'), A('flexao_tronco', 'abdomen')],
  },
  supA: {
    nome: 'Superior A',
    moldes: [C('empurrar_horizontal'), C('puxar_vertical'), C('empurrar_vertical'), C('puxar_horizontal'), A('isolamento', 'biceps'), A('isolamento', 'triceps')],
  },
  infA: {
    nome: 'Inferior A',
    moldes: [C('agachamento'), C('dobradica_quadril'), C('unilateral_perna'), A('isolamento', 'posterior_de_coxa'), A('isolamento', 'panturrilha'), A('anti_extensao', 'abdomen')],
  },
  supB: {
    nome: 'Superior B',
    moldes: [C('puxar_horizontal'), C('empurrar_horizontal'), C('puxar_vertical'), A('isolamento', 'ombros'), A('isolamento', 'peito'), A('isolamento', 'biceps'), A('isolamento', 'triceps')],
  },
  infB: {
    nome: 'Inferior B',
    moldes: [C('dobradica_quadril'), C('agachamento'), C('unilateral_perna'), A('isolamento', 'quadriceps'), A('isolamento', 'panturrilha'), A('flexao_tronco', 'abdomen')],
  },
  empurrar: {
    nome: 'Empurrar',
    moldes: [C('empurrar_horizontal'), C('empurrar_vertical'), C('empurrar_horizontal'), A('isolamento', 'peito'), A('isolamento', 'ombros'), A('isolamento', 'triceps')],
  },
  puxar: {
    nome: 'Puxar',
    moldes: [C('puxar_vertical'), C('puxar_horizontal'), C('puxar_horizontal'), A('isolamento', 'ombros'), A('isolamento', 'biceps'), A('anti_rotacao', 'abdomen')],
  },
  pernas: {
    nome: 'Pernas',
    moldes: [C('agachamento'), C('dobradica_quadril'), C('unilateral_perna'), A('isolamento', 'quadriceps'), A('isolamento', 'posterior_de_coxa'), A('isolamento', 'panturrilha'), A('anti_extensao', 'abdomen')],
  },
}

/** Divisão por dias disponíveis (tabela 6.2). */
const DIVISAO: Record<number, { nome: string; dias: string[] }> = {
  2: { nome: 'Corpo inteiro A / B', dias: ['fbA', 'fbB'] },
  3: { nome: 'Corpo inteiro A / B / C', dias: ['fbA', 'fbB', 'fbC'] },
  4: { nome: 'Superior / Inferior, duas vezes', dias: ['supA', 'infA', 'supB', 'infB'] },
  5: { nome: 'Superior / Inferior / Empurrar / Puxar / Pernas', dias: ['supA', 'infA', 'empurrar', 'puxar', 'pernas'] },
  6: { nome: 'Empurrar / Puxar / Pernas, duas vezes', dias: ['empurrar', 'puxar', 'pernas', 'empurrar', 'puxar', 'pernas'] },
}

/** Faixas de repetição e RIR por objetivo (tabela 6.3). RIR desce do primeiro ao segundo valor. */
const PRESCRICAO: Record<Objetivo, { composto: [number, number]; acessorio: [number, number]; rir: [number, number] }> = {
  forca: { composto: [3, 6], acessorio: [6, 10], rir: [2, 1] },
  hipertrofia: { composto: [5, 8], acessorio: [8, 15], rir: [3, 1] },
  emagrecimento: { composto: [6, 10], acessorio: [10, 15], rir: [3, 2] },
  condicionamento: { composto: [8, 15], acessorio: [10, 15], rir: [4, 2] },
  saude: { composto: [8, 15], acessorio: [10, 15], rir: [4, 2] },
}

/** Semanas de acúmulo por nível (seção 7: 4 a 6), mais 1 de descarga. */
const SEMANAS_ACUMULO: Record<Nivel, number> = { iniciante: 4, intermediario: 5, avancado: 6 }

export const PADROES_OBRIGATORIOS = [
  'agachamento',
  'dobradica_quadril',
  'empurrar_horizontal',
  'empurrar_vertical',
  'puxar_horizontal',
  'puxar_vertical',
  'unilateral_perna',
  'anti_extensao',
] as const

const MAX_SERIES_SLOT = 5
const MIN_SERIES = { composto: 2, acessorio: 2 }
const BASE_SERIES = { composto: 3, acessorio: 2 }

const ESTAVEL = /^(maquina_|cadeira_|mesa_|leg_press|smith|polia_|crossover)/
const LIVRE = /^(barra_|halteres|trap_bar|anilha|peso_corporal|banco_)/

export interface EntradaPrograma {
  nivel: Nivel
  objetivo: Objetivo
  dias_semana: number
  minutos_sessao: number
  musculos_prioritarios: string[]
  padroes_dominados: string[]
  constraints: Constraint[]
  equipamentos: string[]
  catalogo: readonly Exercicio[]
  /** Exercícios do bloco anterior: o motor prefere variar. */
  anteriores?: readonly string[]
  /** 0 = melhor proposta; cada "outra proposta" soma 1. */
  variante?: number
}

export interface SlotProposto {
  dia: number
  ordem: number
  exercise_id: string
  padrao_movimento: string
  tipo: TipoSlot
  series_alvo: number
  rep_min: number
  rep_max: number
  motivo: string
}

export interface DiaProposto {
  dia: number
  nome: string
  slots: SlotProposto[]
}

export interface VolumeGrupo extends MetaGrupo {
  planejado: number
}

export interface PropostaMesociclo {
  divisao: string
  dias: DiaProposto[]
  semanas_acumulo: number
  semanas: number // acúmulo + descarga
  rir_semana: number[] // uma entrada por semana, a última é a descarga
  volume: VolumeGrupo[]
  series_por_sessao: number
  enfase: string[]
  avisos: string[]
  validacao: { padroes_faltando: string[]; series_puxar: number; series_empurrar: number }
}

/** RIR semana a semana: rampa do valor alto ao baixo, depois descarga. */
export function rampaRir(objetivo: Objetivo, semanasAcumulo: number): number[] {
  const [alto, baixo] = PRESCRICAO[objetivo].rir
  const semanas = Array.from({ length: semanasAcumulo }, (_, i) =>
    Math.round(alto - ((alto - baixo) * i) / Math.max(1, semanasAcumulo - 1)),
  )
  return [...semanas, Math.max(4, alto + 1)]
}

interface SlotInterno extends SlotProposto {
  exercicio: Exercicio
  grupo: Grupo | null
}

function escolher(
  molde: Molde,
  elegiveis: readonly Exercicio[],
  e: EntradaPrograma,
  usadosNaSemana: Set<string>,
): { exercicio: Exercicio; motivo: string } | null {
  const candidatos = elegiveis.filter(
    (x) => (molde.padrao === null || x.padrao_movimento === molde.padrao) && (!molde.musculo || x.musculo_primario === molde.musculo),
  )
  if (candidatos.length === 0) return null

  const domina = molde.padrao !== null && e.padroes_dominados.includes(molde.padrao)
  const anteriores = new Set(e.anteriores ?? [])
  const pontuar = (x: Exercicio) =>
    (usadosNaSemana.has(x.slug) ? 0 : 10) +
    ((molde.tipo === 'composto') === (x.mecanica === 'composto') ? 3 : 0) +
    (domina ? (LIVRE.test(x.equipamento) ? 1 : 0) : ESTAVEL.test(x.equipamento) ? 1 : 0) +
    (anteriores.size > 0 && !anteriores.has(x.slug) ? 1 : 0)

  const ordenados = candidatos
    .map((x) => ({ x, p: pontuar(x) }))
    // Empate: no composto, o movimento que envolve mais músculos; no acessório, o mais isolado.
    .sort(
      (a, b) =>
        b.p - a.p ||
        (molde.tipo === 'composto' ? 1 : -1) * (b.x.musculos_secundarios.length - a.x.musculos_secundarios.length) ||
        a.x.slug.localeCompare(b.x.slug),
    )
  // "Outra proposta" alterna entre os melhores (até 1 ponto abaixo do primeiro).
  const melhores = ordenados.filter((o) => o.p >= ordenados[0]!.p - 1).slice(0, 4)
  const { x } = melhores[(e.variante ?? 0) % melhores.length]!

  const partes = [
    domina
      ? 'você já domina o movimento, então entra peso livre quando possível'
      : ESTAVEL.test(x.equipamento)
        ? 'variação estável (máquina ou cabo) para aprender o movimento com segurança'
        : 'melhor opção disponível para este movimento',
  ]
  if (anteriores.size > 0 && !anteriores.has(x.slug)) partes.push('diferente do bloco anterior')
  if (usadosNaSemana.has(x.slug)) partes.push('repetido na semana por falta de outra opção')
  return { exercicio: x, motivo: partes.join('; ') }
}

export function montarMesociclo(e: EntradaPrograma): PropostaMesociclo {
  const divisao = DIVISAO[Math.min(6, Math.max(2, e.dias_semana))]!
  const prescricao = PRESCRICAO[e.objetivo]
  const orcamento = seriesPorSessao(e.minutos_sessao)
  const metas = metasDeVolume(e.nivel, e.musculos_prioritarios)
  const metaDe = new Map(metas.map((m) => [m.grupo, m]))
  const avisos: string[] = []

  // Filtro eliminatório (6.5): equipamento → contraindicação → nível.
  const elegiveis = e.catalogo.filter(
    (x) =>
      disponivelNa(x, e.equipamentos) &&
      conflitos(x, e.constraints).length === 0 &&
      nivelCompativel(x.nivel, e.nivel),
  )

  // 1. Escolhe um exercício para cada molde.
  const usados = new Set<string>()
  const padroesSemOpcao = new Set<string>()
  const dias: SlotInterno[][] = divisao.dias.map((chave, d) =>
    DIA[chave]!.moldes.flatMap((molde, i): SlotInterno[] => {
      const r = escolher(molde, elegiveis, e, usados)
      if (!r) {
        padroesSemOpcao.add(molde.musculo && molde.tipo === 'acessorio' ? `${molde.musculo}` : molde.padrao!)
        return []
      }
      usados.add(r.exercicio.slug)
      const [rep_min, rep_max] = prescricao[molde.tipo]
      return [
        {
          dia: d + 1,
          ordem: i + 1,
          exercise_id: r.exercicio.slug,
          padrao_movimento: r.exercicio.padrao_movimento,
          tipo: molde.tipo,
          series_alvo: BASE_SERIES[molde.tipo],
          rep_min,
          rep_max,
          motivo: r.motivo,
          exercicio: r.exercicio,
          grupo: grupoDe(r.exercicio.musculo_primario),
        },
      ]
    }),
  )

  const todos = () => dias.flat()
  const volume = () => volumeSemanal(todos().map((s) => ({ exercicio: s.exercicio, series: s.series_alvo })))
  const seriesDia = (d: SlotInterno[]) => d.reduce((s, x) => s + x.series_alvo, 0)
  /** Tirar este slot deixaria um padrão obrigatório sem nenhum exercício na semana? */
  const unicoDoPadrao = (slot: SlotInterno) =>
    (PADROES_OBRIGATORIOS as readonly string[]).includes(slot.padrao_movimento) &&
    todos().filter((x) => x.padrao_movimento === slot.padrao_movimento).length === 1
  /** Algum grupo que subiu com a mudança passou do teto? */
  const passouDoTeto = (antes: Record<Grupo, number>, depois: Record<Grupo, number>) =>
    GRUPOS.some((g) => depois[g] > antes[g] && depois[g] > metaDe.get(g)!.max)

  // 2. Prioritário sem exercício próprio na semana ganha um acessório no dia com mais folga.
  for (const meta of metas.filter((m) => m.prioritario)) {
    if (todos().some((s) => s.grupo === meta.grupo)) continue
    const musculos = meta.grupo === 'costas' ? ['dorsais', 'dorsal_medio'] : [meta.grupo]
    const dia = [...dias].sort((a, b) => seriesDia(a) - seriesDia(b))[0]!
    for (const musculo of musculos) {
      const r = escolher(A(null, musculo), elegiveis, e, usados)
      if (!r) continue
      usados.add(r.exercicio.slug)
      const [rep_min, rep_max] = prescricao.acessorio
      dia.push({
        dia: dia[0]?.dia ?? 1,
        ordem: dia.length + 1,
        exercise_id: r.exercicio.slug,
        padrao_movimento: r.exercicio.padrao_movimento,
        tipo: 'acessorio',
        series_alvo: BASE_SERIES.acessorio,
        rep_min,
        rep_max,
        motivo: `${r.motivo}; músculo prioritário`,
        exercicio: r.exercicio,
        grupo: meta.grupo,
      })
      break
    }
  }

  // 3. Cabe no tempo: corta séries de onde mais sobra volume; se preciso, tira acessório não prioritário.
  for (const dia of dias) {
    while (seriesDia(dia) > orcamento) {
      const v = volume()
      const sobra = (s: SlotInterno) => (s.grupo ? v[s.grupo] - metaDe.get(s.grupo)!.alvo : 99)
      const redutivel = dia
        .filter((s) => s.series_alvo > MIN_SERIES[s.tipo])
        .sort((a, b) => sobra(b) - sobra(a))[0]
      if (redutivel) {
        redutivel.series_alvo--
        continue
      }
      const removivel = dia
        .filter((s) => s.tipo === 'acessorio' && !(s.grupo && metaDe.get(s.grupo)!.prioritario) && !unicoDoPadrao(s))
        .sort((a, b) => sobra(b) - sobra(a))[0]
      if (!removivel) break
      dia.splice(dia.indexOf(removivel), 1)
      avisos.push(`${removivel.exercicio.nome_pt} saiu do ${DIA[divisao.dias[removivel.dia - 1]!]!.nome} para caber em ${e.minutos_sessao} min.`)
    }
  }

  const contar = (prefixo: string) =>
    todos()
      .filter((s) => s.padrao_movimento.startsWith(prefixo))
      .reduce((t, s) => t + s.series_alvo, 0)
  /** Tirar uma série deste slot quebraria puxar ≥ empurrar? */
  const seguraPuxada = (s: SlotInterno) =>
    s.padrao_movimento.startsWith('puxar') && contar('puxar') - 1 < contar('empurrar')

  // 3b. Teto da faixa (6.1): nunca ultrapassado na montagem inicial.
  const respeitarTeto = () => {
    for (let guarda = 0; guarda < 200; guarda++) {
      const v = volume()
      const acima = metas.filter((m) => v[m.grupo] > m.max).sort((a, b) => v[b.grupo] - b.max - (v[a.grupo] - a.max))[0]
      if (!acima) return
      // Primeiro quem tem o grupo como principal; se não der, quem contribui como secundário.
      const contribui = todos()
        .filter((s) => s.exercicio.musculo_primario && (s.grupo === acima.grupo || s.exercicio.musculos_secundarios.some((m) => grupoDe(m) === acima.grupo)))
        .filter((s) => s.series_alvo > MIN_SERIES[s.tipo] && !seguraPuxada(s))
        .sort(
          (a, b) =>
            Number(b.grupo === acima.grupo) - Number(a.grupo === acima.grupo) ||
            Number(a.tipo === 'composto') - Number(b.tipo === 'composto') ||
            b.series_alvo - a.series_alvo,
        )
      const reduzir = contribui.find((s) => !(s.grupo && s.grupo !== acima.grupo && metaDe.get(s.grupo)!.prioritario))
      if (reduzir) {
        reduzir.series_alvo--
        continue
      }
      // Muitos dias para pouco volume (ex.: iniciante em 6 dias): sai um exercício inteiro.
      // Nunca o único de um padrão obrigatório nem o de um músculo prioritário.
      const tirar = todos()
        .filter(
          (s) =>
            (s.grupo === acima.grupo || s.exercicio.musculos_secundarios.some((m) => grupoDe(m) === acima.grupo)) &&
            !(s.grupo && s.grupo !== acima.grupo && metaDe.get(s.grupo)!.prioritario) &&
            !unicoDoPadrao(s),
        )
        .sort(
          (a, b) =>
            Number(b.grupo === acima.grupo) - Number(a.grupo === acima.grupo) ||
            Number(a.tipo === 'composto') - Number(b.tipo === 'composto'),
        )[0]
      if (!tirar) return
      if (tirar.padrao_movimento.startsWith('puxar') && contar('puxar') - tirar.series_alvo < contar('empurrar')) return
      const dia = dias.find((d) => d.includes(tirar))!
      dia.splice(dia.indexOf(tirar), 1)
    }
  }

  // 4. Completa o volume até a meta: o grupo com maior falta ganha uma série onde houver tempo.
  const completarVolume = () => {
    const bloqueados = new Set<SlotInterno>()
    for (let guarda = 0; guarda < 400; guarda++) {
      const v = volume()
      const faltas = metas
        .map((m) => ({ m, falta: m.alvo - v[m.grupo] }))
        .filter((f) => f.falta >= 0.5)
        .sort((a, b) => Number(b.m.prioritario) - Number(a.m.prioritario) || b.falta - a.falta)
      let avancou = false
      for (const { m } of faltas) {
        const slot = dias
          .flatMap((d) => (seriesDia(d) < orcamento ? d : []))
          .filter((s) => s.grupo === m.grupo && s.series_alvo < MAX_SERIES_SLOT && !bloqueados.has(s))
          // Distribui: dia mais leve primeiro, depois o slot com menos séries.
          .sort((a, b) => seriesDia(dias[a.dia - 1]!) - seriesDia(dias[b.dia - 1]!) || a.series_alvo - b.series_alvo || a.dia - b.dia)[0]
        if (!slot) continue
        slot.series_alvo++
        if (passouDoTeto(v, volume())) {
          slot.series_alvo--
          bloqueados.add(slot)
          continue
        }
        avancou = true
        break
      }
      if (!avancou) return
    }
  }

  // 5. Validação (6.4): puxar ≥ empurrar. Sobe puxada onde couber sem passar do teto; senão, desce empurrada.
  const equilibrarPuxar = () => {
    for (let guarda = 0; guarda < 50 && contar('puxar') < contar('empurrar'); guarda++) {
      const v = volume()
      const puxadas = dias
        .flatMap((d) => (seriesDia(d) < orcamento ? d : []))
        .filter((s) => s.padrao_movimento.startsWith('puxar') && s.series_alvo < MAX_SERIES_SLOT)
      let subiu = false
      for (const p of puxadas) {
        p.series_alvo++
        if (!passouDoTeto(v, volume())) {
          subiu = true
          break
        }
        p.series_alvo--
      }
      if (subiu) continue
      const empurrada = todos()
        .filter((s) => s.padrao_movimento.startsWith('empurrar') && s.series_alvo > MIN_SERIES[s.tipo])
        .sort((a, b) => b.series_alvo - a.series_alvo)[0]
      if (!empurrada) return
      empurrada.series_alvo--
    }
  }

  // Duas passadas: o equilíbrio de puxar pode abrir ou fechar espaço para o resto.
  for (let passada = 0; passada < 2; passada++) {
    respeitarTeto()
    completarVolume()
    equilibrarPuxar()
  }
  respeitarTeto()

  // Ordem do dia: compostos primeiro, abdômen por último.
  for (const dia of dias) {
    dia.sort((a, b) => peso(a) - peso(b) || a.ordem - b.ordem)
    dia.forEach((s, i) => (s.ordem = i + 1))
  }

  const vFinal = volume()
  const cobertos = new Set(todos().map((s) => s.padrao_movimento))
  const padroes_faltando = PADROES_OBRIGATORIOS.filter((p) => !cobertos.has(p))
  for (const p of padroes_faltando) {
    avisos.push(`Nenhum exercício de ${p.replaceAll('_', ' ')} é possível com as suas restrições e a academia ativa.`)
  }
  for (const p of padroesSemOpcao) {
    if (!padroes_faltando.includes(p as never) && GRUPOS.includes(p as Grupo)) {
      avisos.push(`Sem exercício isolado de ${p.replaceAll('_', ' ')} disponível; o volume vem dos compostos.`)
    }
  }
  const abaixo = metas.filter((m) => vFinal[m.grupo] < m.alvo - 0.5)
  if (abaixo.length > 0) {
    const lista = abaixo.map((m) => `${m.grupo.replaceAll('_', ' ')} (${fmt(vFinal[m.grupo])} de ${m.alvo})`).join(', ')
    const sobraTempo = dias.some((d) => seriesDia(d) <= orcamento - 2)
    avisos.push(
      sobraTempo
        ? `Ficou abaixo da meta: ${lista}. Subir mais faria passar do limite de músculos que trabalham junto (ex.: ombros e tríceps nos supinos).`
        : `Com ${e.dias_semana} treinos de ${e.minutos_sessao} min não cabe o volume mínimo de: ${lista}. Mais tempo ou mais dias resolvem.`,
    )
  }

  const semanas_acumulo = SEMANAS_ACUMULO[e.nivel]
  return {
    divisao: divisao.nome,
    dias: dias.map((slots, i) => ({
      dia: i + 1,
      nome: DIA[divisao.dias[i]!]!.nome,
      slots: slots.map(({ exercicio: _x, grupo: _g, ...s }) => ({ ...s, dia: i + 1 })),
    })),
    semanas_acumulo,
    semanas: semanas_acumulo + 1,
    rir_semana: rampaRir(e.objetivo, semanas_acumulo),
    volume: metas.map((m) => ({ ...m, planejado: Math.round(vFinal[m.grupo] * 2) / 2 })),
    series_por_sessao: orcamento,
    enfase: e.musculos_prioritarios,
    avisos,
    validacao: { padroes_faltando, series_puxar: contar('puxar'), series_empurrar: contar('empurrar') },
  }
}

function peso(s: SlotInterno): number {
  if (s.grupo === 'abdomen') return 2
  return s.tipo === 'composto' ? 0 : 1
}

const fmt = (n: number) => String(Math.round(n * 2) / 2).replace('.', ',')

/** Volume de uma proposta depois de trocas feitas à mão na tela. */
export function volumeDaProposta(dias: readonly DiaProposto[], catalogo: readonly Exercicio[]): Record<Grupo, number> {
  const porSlug = new Map(catalogo.map((x) => [x.slug, x]))
  return volumeSemanal(
    dias.flatMap((d) =>
      d.slots.flatMap((s) => {
        const x = porSlug.get(s.exercise_id)
        return x ? [{ exercicio: x, series: s.series_alvo }] : []
      }),
    ),
  )
}
