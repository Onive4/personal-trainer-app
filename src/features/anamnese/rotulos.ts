import type {
  AtividadeDiaria,
  Constraint,
  Estresse,
  MovimentoDoloroso,
  Nivel,
  Objetivo,
  Regiao,
  SinalAlerta,
} from '../../engine/anamnese'

/** Perguntas de triagem — redação própria (não é o PAR-Q+). */
export const PERGUNTA_ALERTA: Record<SinalAlerta, string> = {
  dor_peito: 'Você sente dor ou aperto no peito, em repouso ou durante esforço?',
  tontura_desmaio: 'Já teve tontura forte ou desmaio durante ou logo após esforço físico?',
  perda_consciencia: 'Perdeu a consciência alguma vez nos últimos 12 meses?',
  pressao_descontrolada: 'Tem pressão alta que não está controlada?',
  medicacao_cardiaca_pressao: 'Usa algum remédio para o coração ou para a pressão?',
  orientacao_supervisionada: 'Algum médico já disse para você fazer atividade física apenas com supervisão?',
  dor_osso_articulacao: 'Tem dor em osso ou articulação que piora quando você se exercita?',
}

export const ROTULO_MOVIMENTO: Record<MovimentoDoloroso, string> = {
  acima_cabeca: 'Levantar peso acima da cabeça',
  amplitude_maxima_ombro: 'Abrir o braço ao máximo',
  carga_nas_costas: 'Carga apoiada nas costas',
  flexionar_lombar: 'Curvar a coluna com peso',
  arquear_lombar: 'Arquear a lombar',
  agachar_fundo: 'Agachar fundo',
  saltar_correr: 'Saltar ou correr',
  apoiar_punho: 'Apoiar o corpo nas mãos',
  barra_reta: 'Segurar barra reta',
  tensao_pescoco: 'Tensão no pescoço',
}

/** Movimentos que fazem sentido perguntar em cada região. */
export const MOVIMENTOS_POR_REGIAO: Record<Regiao, MovimentoDoloroso[]> = {
  ombro: ['acima_cabeca', 'amplitude_maxima_ombro', 'apoiar_punho'],
  cervical: ['tensao_pescoco', 'carga_nas_costas'],
  lombar: ['carga_nas_costas', 'flexionar_lombar', 'arquear_lombar'],
  quadril: ['agachar_fundo', 'saltar_correr', 'flexionar_lombar'],
  joelho: ['agachar_fundo', 'saltar_correr'],
  tornozelo: ['saltar_correr', 'agachar_fundo'],
  punho_cotovelo: ['apoiar_punho', 'barra_reta'],
}

export const ROTULO_CONSTRAINT: Record<Constraint, string> = {
  sem_carga_axial: 'Sem carga comprimindo a coluna (barra nas costas, terra pesado)',
  sem_desenvolvimento_acima_cabeca: 'Sem empurrar ou alongar acima da cabeça',
  evitar_amplitude_maxima_ombro: 'Evitar amplitude extrema de ombro',
  flexao_joelho_limitada: 'Flexão profunda ou extensão carregada de joelho limitada',
  sem_impacto: 'Sem salto ou impacto',
  sem_flexao_lombar_carregada: 'Sem flexionar a lombar sob carga',
  sem_hiperextensao_lombar: 'Sem hiperextensão da lombar',
  sem_extensao_punho: 'Sem extensão forçada de punho (barra reta)',
  sem_apoio_punho: 'Sem apoiar o peso do corpo no punho',
  cervical_sensivel: 'Cuidado com carga ou tensão na região cervical',
}

export const ROTULO_OBJETIVO: Record<Objetivo, string> = {
  hipertrofia: 'Hipertrofia',
  forca: 'Força',
  emagrecimento: 'Emagrecimento',
  condicionamento: 'Condicionamento',
  saude: 'Saúde geral',
}

export const ROTULO_NIVEL: Record<Nivel, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
}

export const ROTULO_ATIVIDADE: Record<AtividadeDiaria, { rotulo: string; detalhe: string }> = {
  sedentario: { rotulo: 'Sedentária', detalhe: 'Trabalho sentado, pouco deslocamento a pé' },
  leve: { rotulo: 'Leve', detalhe: 'Anda um pouco no dia a dia' },
  moderado: { rotulo: 'Moderada', detalhe: 'Fica muito em pé ou anda bastante' },
  intenso: { rotulo: 'Intensa', detalhe: 'Trabalho físico pesado' },
}

export const ROTULO_ESTRESSE: Record<Estresse, string> = {
  baixo: 'Baixo',
  medio: 'Médio',
  alto: 'Alto',
}

/** Padrões de movimento de `data/vocabulario.json` que valem como "domina". */
export const PADROES_DOMINAVEIS: { valor: string; rotulo: string }[] = [
  { valor: 'agachamento', rotulo: 'Agachamento' },
  { valor: 'dobradica_quadril', rotulo: 'Terra / stiff' },
  { valor: 'empurrar_horizontal', rotulo: 'Supino / flexão' },
  { valor: 'empurrar_vertical', rotulo: 'Desenvolvimento' },
  { valor: 'puxar_horizontal', rotulo: 'Remada' },
  { valor: 'puxar_vertical', rotulo: 'Puxada / barra fixa' },
  { valor: 'unilateral_perna', rotulo: 'Afundo / búlgaro' },
  { valor: 'anti_extensao', rotulo: 'Prancha' },
]

/** Os 16 músculos primários do catálogo. */
export const MUSCULOS: { valor: string; rotulo: string }[] = [
  { valor: 'peito', rotulo: 'Peito' },
  { valor: 'dorsais', rotulo: 'Dorsais' },
  { valor: 'dorsal_medio', rotulo: 'Meio das costas' },
  { valor: 'ombros', rotulo: 'Ombros' },
  { valor: 'trapezio', rotulo: 'Trapézio' },
  { valor: 'biceps', rotulo: 'Bíceps' },
  { valor: 'triceps', rotulo: 'Tríceps' },
  { valor: 'antebraco', rotulo: 'Antebraço' },
  { valor: 'abdomen', rotulo: 'Abdômen' },
  { valor: 'lombar', rotulo: 'Lombar' },
  { valor: 'quadriceps', rotulo: 'Quadríceps' },
  { valor: 'posterior_de_coxa', rotulo: 'Posterior de coxa' },
  { valor: 'gluteos', rotulo: 'Glúteos' },
  { valor: 'adutores', rotulo: 'Adutores' },
  { valor: 'abdutores', rotulo: 'Abdutores' },
  { valor: 'panturrilha', rotulo: 'Panturrilha' },
]
