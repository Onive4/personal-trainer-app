import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { MINUTOS_AQUECIMENTO, MINUTOS_POR_SERIE } from '../../engine/volume'
import { Button } from '../../ui/Button'
import { Tela } from '../../ui/Tela'
import { formatarData } from '../../ui/datas'
import { ROTULO_OBJETIVO } from '../anamnese/rotulos'
import { useCatalogo } from '../exercicios/useCatalogo'
import { pendenciaParaGerar, programaAtual } from './registros'
import { DiaTreino, PorQue, SemanasEsforco } from './Componentes'

interface Props {
  userId: string
  onVoltar: () => void
  onIr: (caminho: string) => void
  onAbrirExercicio: (slug: string) => void
}

const PENDENCIA = {
  anamnese: { texto: 'Responda o questionário inicial primeiro: é dele que saem seu nível, objetivo e cuidados.', botao: 'Responder questionário', destino: '/anamnese' },
  liberacao: { texto: 'O treino fica bloqueado até você registrar a liberação médica.', botao: 'Ver avaliação', destino: '/avaliacao' },
  academia: { texto: 'Cadastre sua academia e marque os aparelhos: o treino só usa o que existe lá.', botao: 'Cadastrar academia', destino: '/academias' },
} as const

export function ProgramaScreen({ userId, onVoltar, onIr, onAbrirExercicio }: Props) {
  const catalogo = useCatalogo()
  const porSlug = useMemo(() => new Map((catalogo ?? []).map((e) => [e.slug, e])), [catalogo])
  const dados = useLiveQuery(async () => {
    const [atual, pendencia, proposta] = await Promise.all([programaAtual(userId), pendenciaParaGerar(userId), db.propostas.get(userId)])
    return { atual, pendencia, proposta }
  }, [userId])
  if (!dados) return null
  const { atual, pendencia, proposta } = dados

  const botaoGerar = pendencia ? (
    <Button onClick={() => onIr(PENDENCIA[pendencia].destino)}>{PENDENCIA[pendencia].botao}</Button>
  ) : (
    <Button variante={atual ? 'secundario' : 'primario'} onClick={() => onIr('/programa/proposta')}>
      {proposta ? 'Continuar vendo a sugestão' : atual ? 'Montar um treino novo' : 'Montar meu treino'}
    </Button>
  )

  if (!atual) {
    return (
      <Tela titulo="Treino" onVoltar={onVoltar}>
        <p className="text-neutral-300">
          {pendencia
            ? PENDENCIA[pendencia].texto
            : 'O app monta seu treino a partir do questionário e da sua academia. Você vê, troca o que quiser e começa.'}
        </p>
        {botaoGerar}
      </Tela>
    )
  }

  const { programa, mesociclo, slots } = atual
  const rir = slots[0]?.rir_semana ?? []
  const dias = [...new Set(slots.map((s) => s.dia))]
  const nomesDias = (mesociclo.diagnostico.dias as string[] | undefined) ?? []
  const explicacao = (mesociclo.diagnostico.explicacao as string[] | undefined) ?? []
  const minutosDia = (dia: number) => {
    const doDia = slots.filter((s) => s.dia === dia)
    return Math.round(
      MINUTOS_AQUECIMENTO +
        doDia.filter((s) => s.tipo !== 'aerobico').reduce((t, s) => t + s.series_alvo, 0) * MINUTOS_POR_SERIE +
        doDia.reduce((t, s) => t + (s.minutos ?? 0), 0),
    )
  }
  const semAerobico = !slots.some((s) => s.tipo === 'aerobico')

  return (
    <Tela titulo="Treino" onVoltar={onVoltar}>
      <section className="flex flex-col gap-3 rounded-2xl bg-neutral-900 p-4">
        <div>
          <p className="text-lg font-semibold">{programa.nome}</p>
          <p className="text-sm text-neutral-400">
            {ROTULO_OBJETIVO[programa.objetivo]} · fase {mesociclo.numero} · começou em{' '}
            {mesociclo.aprovado_em ? formatarData(mesociclo.aprovado_em) : '—'}
          </p>
        </div>
        <SemanasEsforco rir={rir} />
      </section>

      {semAerobico && (
        <p className="rounded-xl border border-sky-900 p-3 text-sm text-sky-200">
          Este treino foi montado antes de o app incluir aeróbico. Toque em "Montar um treino novo" para receber a versão com
          esteira, bicicleta e similares.
        </p>
      )}

      <PorQue frases={explicacao} />

      <p className="text-sm text-neutral-400">O registro das séries, com peso e cronômetro, chega na próxima versão do app.</p>

      {dias.map((dia) => (
        <DiaTreino
          key={dia}
          titulo={`Treino ${dia}${nomesDias[dia - 1] ? ` · ${nomesDias[dia - 1]}` : ''}`}
          minutos={minutosDia(dia)}
          porSlug={porSlug}
          onAbrir={onAbrirExercicio}
          itens={slots.filter((s) => s.dia === dia).map((s) => ({ ...s, chave: s.id }))}
        />
      ))}

      {botaoGerar}
    </Tela>
  )
}
