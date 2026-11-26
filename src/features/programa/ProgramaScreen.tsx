import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { Button } from '../../ui/Button'
import { Tela } from '../../ui/Tela'
import { formatarData } from '../../ui/datas'
import { ROTULO_OBJETIVO } from '../anamnese/rotulos'
import { useCatalogo } from '../exercicios/useCatalogo'
import { pendenciaParaGerar, programaAtual } from './registros'
import { textoPrescricao } from './rotulos'

interface Props {
  userId: string
  onVoltar: () => void
  onIr: (caminho: string) => void
  onAbrirExercicio: (slug: string) => void
}

const PENDENCIA = {
  anamnese: { texto: 'Faça a anamnese primeiro: é dela que saem nível, objetivo e restrições.', botao: 'Fazer anamnese', destino: '/anamnese' },
  liberacao: { texto: 'O treino está bloqueado até você registrar a liberação médica.', botao: 'Ver avaliação', destino: '/avaliacao' },
  academia: { texto: 'Cadastre a academia e marque os equipamentos: o programa só usa o que existe lá.', botao: 'Cadastrar academia', destino: '/academias' },
} as const

export function ProgramaScreen({ userId, onVoltar, onIr, onAbrirExercicio }: Props) {
  const catalogo = useCatalogo()
  const dados = useLiveQuery(async () => {
    const [atual, pendencia, proposta] = await Promise.all([programaAtual(userId), pendenciaParaGerar(userId), db.propostas.get(userId)])
    return { atual, pendencia, proposta }
  }, [userId])
  if (!dados) return null
  const { atual, pendencia, proposta } = dados
  const nomeDe = (slug: string) => catalogo?.find((e) => e.slug === slug)?.nome_pt ?? slug

  const botaoGerar = pendencia ? (
    <Button onClick={() => onIr(PENDENCIA[pendencia].destino)}>{PENDENCIA[pendencia].botao}</Button>
  ) : (
    <Button variante={atual ? 'secundario' : 'primario'} onClick={() => onIr('/programa/proposta')}>
      {proposta ? 'Continuar revisando a proposta' : atual ? 'Propor novo bloco' : 'Gerar proposta de treino'}
    </Button>
  )

  if (!atual) {
    return (
      <Tela titulo="Treino" onVoltar={onVoltar}>
        <p className="text-neutral-300">
          {pendencia
            ? PENDENCIA[pendencia].texto
            : 'O app monta um bloco de treino a partir da sua anamnese e da academia ativa. Você revisa, troca o que quiser e aprova.'}
        </p>
        {botaoGerar}
      </Tela>
    )
  }

  const { programa, mesociclo, slots } = atual
  const rir = slots[0]?.rir_semana ?? []
  const dias = [...new Set(slots.map((s) => s.dia))]
  const nomesDias = (mesociclo.diagnostico.dias as string[] | undefined) ?? []

  return (
    <Tela titulo="Treino" onVoltar={onVoltar}>
      <section className="rounded-2xl bg-neutral-900 p-4">
        <p className="text-lg font-semibold">{programa.nome}</p>
        <p className="text-sm text-neutral-400">
          {ROTULO_OBJETIVO[programa.objetivo]} · bloco {mesociclo.numero} · aprovado em{' '}
          {mesociclo.aprovado_em ? formatarData(mesociclo.aprovado_em) : '—'}
        </p>
        <div className="mt-3 flex gap-1">
          {rir.map((r, i) => (
            <div key={i} className={`flex-1 rounded-lg p-2 text-center ${i === rir.length - 1 ? 'bg-neutral-800' : 'bg-black'}`}>
              <p className="text-xs text-neutral-500">{i === rir.length - 1 ? 'Desc.' : `S${i + 1}`}</p>
              <p className="font-semibold">RIR {r}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-sm text-neutral-400">
        O registro das séries, com carga e cronômetro, chega na próxima etapa do app.
      </p>

      {dias.map((dia) => (
        <section key={dia} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">
            Dia {dia}
            {nomesDias.length === dias.length ? ` · ${nomesDias[dia - 1]}` : ''}
          </h2>
          <ul className="flex flex-col gap-2">
            {slots
              .filter((s) => s.dia === dia)
              .map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onAbrirExercicio(s.exercise_id)}
                    className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-neutral-800 px-3 py-2 text-left active:bg-neutral-900"
                  >
                    <span>{nomeDe(s.exercise_id)}</span>
                    <span className="shrink-0 text-sm text-orange-300">{textoPrescricao(s)}</span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}

      {botaoGerar}
    </Tela>
  )
}
