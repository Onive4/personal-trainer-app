/**
 * Triagem, restrições e nível — seção 5 da especificação.
 * Função pura: entra a resposta do questionário, sai a avaliação. Sem I/O.
 *
 * O questionário é próprio (não é o PAR-Q+): pergunta de alerta → resposta
 * positiva → recomendação de avaliação antes de gerar programa.
 */

export type Sexo = 'masculino' | 'feminino'
export type Objetivo = 'hipertrofia' | 'forca' | 'emagrecimento' | 'condicionamento' | 'saude'
export type Nivel = 'iniciante' | 'intermediario' | 'avancado'
export type ClearanceStatus = 'liberado' | 'orientar_avaliacao' | 'liberado_por_registro'
export type AtividadeDiaria = 'sedentario' | 'leve' | 'moderado' | 'intenso'
export type Estresse = 'baixo' | 'medio' | 'alto'
/** "Você conhece os exercícios e aparelhos da academia?" */
export type Conhecimento = 'nenhum' | 'alguns' | 'bem'

export const SINAIS_ALERTA = [
  'dor_peito',
  'tontura_desmaio',
  'perda_consciencia',
  'pressao_descontrolada',
  'medicacao_cardiaca_pressao',
  'orientacao_supervisionada',
  'dor_osso_articulacao',
] as const
export type SinalAlerta = (typeof SINAIS_ALERTA)[number]

export const REGIOES = [
  'ombro',
  'cervical',
  'lombar',
  'quadril',
  'joelho',
  'tornozelo',
  'punho_cotovelo',
] as const
export type Regiao = (typeof REGIOES)[number]

export type StatusLesao = 'ativa' | 'reabilitacao' | 'resolvida'

export const MOVIMENTOS_DOLOROSOS = [
  'acima_cabeca',
  'amplitude_maxima_ombro',
  'carga_nas_costas',
  'flexionar_lombar',
  'arquear_lombar',
  'agachar_fundo',
  'saltar_correr',
  'apoiar_punho',
  'barra_reta',
  'tensao_pescoco',
] as const
export type MovimentoDoloroso = (typeof MOVIMENTOS_DOLOROSOS)[number]

/** Chaves de `data/vocabulario.json` → `contraindicacoes`. */
export type Constraint =
  | 'sem_carga_axial'
  | 'sem_desenvolvimento_acima_cabeca'
  | 'evitar_amplitude_maxima_ombro'
  | 'flexao_joelho_limitada'
  | 'sem_impacto'
  | 'sem_flexao_lombar_carregada'
  | 'sem_hiperextensao_lombar'
  | 'sem_extensao_punho'
  | 'sem_apoio_punho'
  | 'cervical_sensivel'

export interface Lesao {
  regiao: Regiao
  status: StatusLesao
  movimentos: MovimentoDoloroso[]
}

export interface RespostasAnamnese {
  identificacao: {
    data_nascimento: string // AAAA-MM-DD
    sexo: Sexo
    altura_cm: number
    peso_kg: number
  }
  historico: {
    meses_treino_continuo: number
    experiencia: string
    frequencia_atual: number // dias por semana hoje
    /** Anamneses antigas (antes da pergunta de conhecimento) só têm padroes_dominados. */
    conhecimento?: Conhecimento
    padroes_dominados?: string[]
  }
  alerta: Record<SinalAlerta, boolean>
  familiar: {
    cardiovascular_precoce: boolean
    diabetes: boolean
    hipertensao: boolean
  }
  lesoes: Lesao[]
  contexto: {
    dias_semana: number // 2 a 6
    minutos_sessao: number
    horas_sono: number
    estresse: Estresse
    atividade_diaria: AtividadeDiaria
  }
  objetivo: {
    objetivo: Objetivo
    musculos_prioritarios: string[] // no máximo 2
  }
}

export interface LiberacaoMedica {
  data: string // AAAA-MM-DD da liberação
  profissional: string
  registrado_em: string // ISO 8601
}

export interface AvaliacaoAnamnese {
  clearance_status: ClearanceStatus
  sinais_positivos: SinalAlerta[]
  constraints: Constraint[]
  motivos_constraints: { constraint: Constraint; motivo: string }[]
  nivel: Nivel
  objetivo: Objetivo
}

const POR_MOVIMENTO: Record<MovimentoDoloroso, Constraint> = {
  acima_cabeca: 'sem_desenvolvimento_acima_cabeca',
  amplitude_maxima_ombro: 'evitar_amplitude_maxima_ombro',
  carga_nas_costas: 'sem_carga_axial',
  flexionar_lombar: 'sem_flexao_lombar_carregada',
  arquear_lombar: 'sem_hiperextensao_lombar',
  agachar_fundo: 'flexao_joelho_limitada',
  saltar_correr: 'sem_impacto',
  apoiar_punho: 'sem_apoio_punho',
  barra_reta: 'sem_extensao_punho',
  tensao_pescoco: 'cervical_sensivel',
}

/** Restrições conservadoras de cada região quando a lesão está ativa. */
const POR_REGIAO: Record<Regiao, Constraint[]> = {
  ombro: ['sem_desenvolvimento_acima_cabeca', 'evitar_amplitude_maxima_ombro'],
  cervical: ['cervical_sensivel', 'sem_carga_axial'],
  lombar: ['sem_carga_axial', 'sem_flexao_lombar_carregada', 'sem_hiperextensao_lombar'],
  quadril: ['sem_impacto', 'flexao_joelho_limitada'],
  joelho: ['flexao_joelho_limitada', 'sem_impacto'],
  tornozelo: ['sem_impacto'],
  punho_cotovelo: ['sem_extensao_punho', 'sem_apoio_punho'],
}

export const ROTULO_REGIAO: Record<Regiao, string> = {
  ombro: 'Ombro',
  cervical: 'Cervical (pescoço)',
  lombar: 'Lombar',
  quadril: 'Quadril',
  joelho: 'Joelho',
  tornozelo: 'Tornozelo',
  punho_cotovelo: 'Punho ou cotovelo',
}

export const ROTULO_STATUS_LESAO: Record<StatusLesao, string> = {
  ativa: 'ativa',
  reabilitacao: 'em reabilitação',
  resolvida: 'resolvida',
}

/** Sinais de alerta marcados como "sim". */
export function sinaisPositivos(alerta: Record<SinalAlerta, boolean>): SinalAlerta[] {
  return SINAIS_ALERTA.filter((s) => alerta[s])
}

/**
 * Qualquer sinal positivo → orientar avaliação, e o programa não é gerado.
 * Só a liberação registrada pelo próprio usuário (data + profissional) desbloqueia.
 */
export function triar(
  alerta: Record<SinalAlerta, boolean>,
  liberacao: LiberacaoMedica | null,
): ClearanceStatus {
  if (sinaisPositivos(alerta).length === 0) return 'liberado'
  return liberacao && liberacao.profissional.trim() && liberacao.data
    ? 'liberado_por_registro'
    : 'orientar_avaliacao'
}

export function podeGerarPrograma(status: ClearanceStatus): boolean {
  return status !== 'orientar_avaliacao'
}

/**
 * Lesão ativa: restrições da região + as dos movimentos que doem.
 * Em reabilitação: só as dos movimentos que doem (ou as da região, se nenhum foi marcado).
 * Resolvida: nenhuma.
 */
export function restricoesDasLesoes(
  lesoes: Lesao[],
): { constraint: Constraint; motivo: string }[] {
  const saida = new Map<Constraint, string>()
  for (const lesao of lesoes) {
    if (lesao.status === 'resolvida') continue
    const motivo = `${ROTULO_REGIAO[lesao.regiao]} (${ROTULO_STATUS_LESAO[lesao.status]})`
    const porMovimento = lesao.movimentos.map((m) => POR_MOVIMENTO[m])
    const lista =
      lesao.status === 'ativa'
        ? [...POR_REGIAO[lesao.regiao], ...porMovimento]
        : porMovimento.length > 0
          ? porMovimento
          : POR_REGIAO[lesao.regiao]
    for (const c of lista) if (!saida.has(c)) saida.set(c, motivo)
  }
  return [...saida.entries()]
    .map(([constraint, motivo]) => ({ constraint, motivo }))
    .sort((a, b) => a.constraint.localeCompare(b.constraint))
}

/** Tempo de treino contínuo → nível (tabela 6.1). */
export function nivelPorTempo(meses: number): Nivel {
  if (meses < 6) return 'iniciante'
  if (meses <= 24) return 'intermediario'
  return 'avancado'
}

/** Idade em anos completos na data `hoje` (AAAA-MM-DD). */
export function idadeEm(dataNascimento: string, hoje: string): number {
  const [an, mn, dn] = dataNascimento.split('-').map(Number) as [number, number, number]
  const [ah, mh, dh] = hoje.split('-').map(Number) as [number, number, number]
  let idade = ah - an
  if (mh < mn || (mh === mn && dh < dn)) idade--
  return idade
}

export function avaliarAnamnese(
  respostas: RespostasAnamnese,
  liberacao: LiberacaoMedica | null,
): AvaliacaoAnamnese {
  const motivos = restricoesDasLesoes(respostas.lesoes)
  return {
    clearance_status: triar(respostas.alerta, liberacao),
    sinais_positivos: sinaisPositivos(respostas.alerta),
    constraints: motivos.map((m) => m.constraint),
    motivos_constraints: motivos,
    nivel: nivelPorTempo(respostas.historico.meses_treino_continuo),
    objetivo: respostas.objetivo.objetivo,
  }
}

/** Conhecimento declarado; para anamneses antigas, deduz pelos movimentos marcados. */
export function conhecimentoDe(r: RespostasAnamnese): Conhecimento {
  if (r.historico.conhecimento) return r.historico.conhecimento
  const n = r.historico.padroes_dominados?.length ?? 0
  return n >= 4 ? 'bem' : n > 0 ? 'alguns' : 'nenhum'
}
