import {
  SINAIS_ALERTA,
  conhecimentoDe,
  type Conhecimento,
  type AtividadeDiaria,
  type Estresse,
  type Lesao,
  type Objetivo,
  type RespostasAnamnese,
  type Sexo,
  type SinalAlerta,
} from '../../engine/anamnese'
import type { Profile } from '../../db/schema'

/** Estado do questionário enquanto é preenchido: tudo pode estar em branco. */
export interface FormAnamnese {
  identificacao: { data_nascimento: string; sexo: Sexo | null; altura_cm: number | null; peso_kg: number | null }
  historico: { meses_treino_continuo: number | null; experiencia: string; frequencia_atual: number | null; conhecimento: Conhecimento | null }
  alerta: Record<SinalAlerta, boolean | null>
  familiar: { cardiovascular_precoce: boolean | null; diabetes: boolean | null; hipertensao: boolean | null }
  lesoes: Lesao[]
  contexto: {
    dias_semana: number | null
    minutos_sessao: number | null
    horas_sono: number | null
    estresse: Estresse | null
    atividade_diaria: AtividadeDiaria | null
  }
  objetivo: { objetivo: Objetivo | null; musculos_prioritarios: string[] }
}

export const ETAPAS = [
  'Identificação',
  'Histórico de treino',
  'Sinais de alerta',
  'Histórico familiar',
  'Lesões e limitações',
  'Rotina',
  'Objetivo',
] as const

/** Formulário inicial: parte da anamnese anterior (refazer) ou do perfil. */
export function formInicial(perfil: Profile | undefined, anterior: RespostasAnamnese | undefined): FormAnamnese {
  if (anterior) {
    const copia = structuredClone(anterior)
    const { padroes_dominados: _p, ...historico } = copia.historico
    return { ...copia, historico: { ...historico, conhecimento: conhecimentoDe(anterior) } }
  }
  return {
    identificacao: {
      data_nascimento: perfil?.data_nascimento ?? '',
      sexo: perfil?.sexo ?? null,
      altura_cm: perfil?.altura_cm ?? null,
      peso_kg: null,
    },
    historico: { meses_treino_continuo: null, experiencia: '', frequencia_atual: null, conhecimento: null },
    alerta: Object.fromEntries(SINAIS_ALERTA.map((s) => [s, null])) as Record<SinalAlerta, null>,
    familiar: { cardiovascular_precoce: null, diabetes: null, hipertensao: null },
    lesoes: [],
    contexto: { dias_semana: null, minutos_sessao: null, horas_sono: null, estresse: null, atividade_diaria: null },
    objetivo: { objetivo: null, musculos_prioritarios: [] },
  }
}

/** Mensagem do que falta na etapa, ou null se pode avançar. */
export function pendenciaDaEtapa(etapa: number, f: FormAnamnese, hoje: string): string | null {
  switch (etapa) {
    case 0: {
      const { data_nascimento, sexo, altura_cm, peso_kg } = f.identificacao
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data_nascimento) || data_nascimento >= hoje) return 'Informe a data de nascimento.'
      const anos = Number(hoje.slice(0, 4)) - Number(data_nascimento.slice(0, 4))
      if (anos < 16 || anos > 100) return 'O app é para adultos (a partir de 16 anos). Confira a data.'
      if (!sexo) return 'Escolha o sexo usado nas fórmulas.'
      if (!altura_cm || altura_cm < 120 || altura_cm > 230) return 'Informe a altura em centímetros (ex.: 172).'
      if (!peso_kg || peso_kg < 30 || peso_kg > 300) return 'Informe o peso atual em quilos.'
      return null
    }
    case 1:
      if (f.historico.meses_treino_continuo === null) return 'Diga há quanto tempo treina sem parar.'
      if (f.historico.frequencia_atual === null) return 'Diga quantos dias por semana treina hoje.'
      if (!f.historico.conhecimento) return 'Diga se você conhece os exercícios e aparelhos da academia.'
      return null
    case 2:
      return SINAIS_ALERTA.some((s) => f.alerta[s] === null) ? 'Responda todas as perguntas.' : null
    case 3:
      return Object.values(f.familiar).some((v) => v === null) ? 'Responda todas as perguntas.' : null
    case 4:
      return null
    case 5: {
      const c = f.contexto
      if (!c.dias_semana) return 'Escolha quantos dias por semana pode treinar.'
      if (!c.minutos_sessao) return 'Escolha quanto tempo tem por treino.'
      if (!c.horas_sono) return 'Escolha quantas horas dorme por noite.'
      if (!c.estresse) return 'Escolha o nível de estresse.'
      if (!c.atividade_diaria) return 'Escolha sua atividade fora do treino.'
      return null
    }
    case 6:
      return f.objetivo.objetivo ? null : 'Escolha o objetivo principal.'
    default:
      return null
  }
}

/** Converte o formulário completo nas respostas que o motor lê. */
export function montarRespostas(f: FormAnamnese): RespostasAnamnese {
  const i = f.identificacao
  const c = f.contexto
  return {
    identificacao: { data_nascimento: i.data_nascimento, sexo: i.sexo!, altura_cm: i.altura_cm!, peso_kg: i.peso_kg! },
    historico: {
      meses_treino_continuo: f.historico.meses_treino_continuo!,
      experiencia: f.historico.experiencia.trim(),
      frequencia_atual: f.historico.frequencia_atual!,
      conhecimento: f.historico.conhecimento!,
    },
    alerta: Object.fromEntries(SINAIS_ALERTA.map((s) => [s, f.alerta[s] === true])) as Record<SinalAlerta, boolean>,
    familiar: {
      cardiovascular_precoce: f.familiar.cardiovascular_precoce === true,
      diabetes: f.familiar.diabetes === true,
      hipertensao: f.familiar.hipertensao === true,
    },
    lesoes: f.lesoes,
    contexto: {
      dias_semana: c.dias_semana!,
      minutos_sessao: c.minutos_sessao!,
      horas_sono: c.horas_sono!,
      estresse: c.estresse!,
      atividade_diaria: c.atividade_diaria!,
    },
    objetivo: { objetivo: f.objetivo.objetivo!, musculos_prioritarios: f.objetivo.musculos_prioritarios.slice(0, 2) },
  }
}
