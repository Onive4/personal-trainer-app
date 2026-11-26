import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { volumeDaProposta, type SlotProposto } from '../../engine/builder'
import { alternativas } from '../../engine/substitution'
import type { Exercicio } from '../../engine/catalogo'
import { db } from '../../db/schema'
import { Button } from '../../ui/Button'
import { Tela } from '../../ui/Tela'
import { anamneseAtual } from '../perfil/registros'
import { academiaAtiva } from '../academias/registros'
import { useCatalogo } from '../exercicios/useCatalogo'
import { aplicarTrocas, aprovarProposta, chaveSlot, gerarProposta, trocarNaProposta } from './registros'
import { rotuloGrupo, textoPrescricao } from './rotulos'

interface Props {
  userId: string
  onVoltar: () => void
  onAprovado: () => void
  onAbrirExercicio: (slug: string) => void
}

export function PropostaScreen({ userId, onVoltar, onAprovado, onAbrirExercicio }: Props) {
  const catalogo = useCatalogo()
  const dados = useLiveQuery(async () => {
    const [local, anamnese, gym] = await Promise.all([db.propostas.get(userId), anamneseAtual(userId), academiaAtiva(userId)])
    return { local, anamnese, gym }
  }, [userId])
  const [trocando, setTrocando] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  // Primeira visita: gera a proposta.
  useEffect(() => {
    if (catalogo && dados && !dados.local && dados.anamnese && dados.gym) void gerarProposta(userId, catalogo)
  }, [catalogo, dados, userId])

  const porSlug = useMemo(() => new Map((catalogo ?? []).map((e) => [e.slug, e])), [catalogo])
  if (!catalogo || !dados?.local || !dados.anamnese || !dados.gym) return null

  const { local, anamnese, gym } = dados
  const proposta = aplicarTrocas(local, catalogo)
  const volume = volumeDaProposta(proposta.dias, catalogo)
  const ctx = { equipamentos: gym.equipamentos, constraints: anamnese.constraints, nivel: anamnese.nivel }

  const outra = async () => {
    setOcupado(true)
    setTrocando(null)
    await gerarProposta(userId, catalogo, local.variante + 1)
    setOcupado(false)
    window.scrollTo(0, 0)
  }
  const aprovar = async () => {
    setOcupado(true)
    await aprovarProposta(userId, catalogo)
    onAprovado()
  }

  return (
    <Tela
      titulo="Proposta de bloco"
      onVoltar={onVoltar}
      rodape={
        <div className="grid grid-cols-2 gap-2">
          <Button variante="secundario" disabled={ocupado} onClick={() => void outra()}>
            Outra proposta
          </Button>
          <Button disabled={ocupado} onClick={() => void aprovar()}>
            Aprovar bloco
          </Button>
        </div>
      }
    >
      <section className="rounded-2xl bg-neutral-900 p-4">
        <p className="text-lg font-semibold">{proposta.divisao}</p>
        <p className="text-sm text-neutral-400">
          {proposta.semanas_acumulo} semanas de treino + 1 de descarga · até {proposta.series_por_sessao} séries por treino ·{' '}
          {gym.nome}
        </p>
        <div className="mt-3 flex gap-1">
          {proposta.rir_semana.map((rir, i) => {
            const descarga = i === proposta.rir_semana.length - 1
            return (
              <div key={i} className={`flex-1 rounded-lg p-2 text-center ${descarga ? 'bg-neutral-800' : 'bg-black'}`}>
                <p className="text-xs text-neutral-500">{descarga ? 'Desc.' : `S${i + 1}`}</p>
                <p className="font-semibold">RIR {rir}</p>
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          RIR = repetições que ainda sobrariam no fim da série. O esforço sobe ao longo do bloco; a descarga usa metade das
          séries e cerca de 70% da carga.
        </p>
      </section>

      {proposta.avisos.length > 0 && (
        <ul className="flex flex-col gap-2">
          {proposta.avisos.map((a) => (
            <li key={a} className="rounded-xl border border-amber-800 p-3 text-sm text-amber-200">
              {a}
            </li>
          ))}
        </ul>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Séries por semana</h2>
        <ul className="flex flex-col gap-1">
          {proposta.volume.map((v) => {
            const planejado = Math.round(volume[v.grupo] * 2) / 2
            const ok = planejado >= v.alvo - 0.5
            return (
              <li key={v.grupo} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0">
                  {rotuloGrupo(v.grupo)}
                  {v.prioritario && <span className="text-orange-400"> ★</span>}
                </span>
                <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-neutral-800">
                  <span
                    className={`absolute inset-y-0 left-0 rounded-full ${ok ? 'bg-orange-500' : 'bg-amber-700'}`}
                    style={{ width: `${Math.min(100, (planejado / v.max) * 100)}%` }}
                  />
                </span>
                <span className="w-16 shrink-0 text-right tabular-nums text-neutral-300">
                  {String(planejado).replace('.', ',')} / {v.alvo}
                </span>
              </li>
            )
          })}
        </ul>
        <p className="text-xs text-neutral-500">
          Planejado / meta. Exercício conta 1 série para o músculo principal e meia para os que ajudam.
        </p>
      </section>

      {proposta.dias.map((d) => (
        <section key={d.dia} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">
            Dia {d.dia} · {d.nome}
          </h2>
          <ul className="flex flex-col gap-2">
            {d.slots.map((s) => (
              <SlotLinha
                key={chaveSlot(s)}
                slot={s}
                exercicio={porSlug.get(s.exercise_id)}
                trocado={!!local.trocas[chaveSlot(s)]}
                aberto={trocando === chaveSlot(s)}
                onAlternar={() => setTrocando(trocando === chaveSlot(s) ? null : chaveSlot(s))}
                opcoes={
                  trocando === chaveSlot(s) && porSlug.get(s.exercise_id)
                    ? alternativas(porSlug.get(s.exercise_id)!, catalogo, ctx, 4).map((a) => a.exercicio)
                    : []
                }
                original={local.proposta.dias[d.dia - 1]?.slots.find((o) => o.ordem === s.ordem)}
                onEscolher={async (slug) => {
                  const original = local.proposta.dias[d.dia - 1]!.slots.find((o) => o.ordem === s.ordem)!
                  await trocarNaProposta(userId, original, slug)
                  setTrocando(null)
                }}
                onAbrir={onAbrirExercicio}
              />
            ))}
          </ul>
        </section>
      ))}
    </Tela>
  )
}

interface SlotLinhaProps {
  slot: SlotProposto
  exercicio: Exercicio | undefined
  trocado: boolean
  aberto: boolean
  opcoes: Exercicio[]
  original: SlotProposto | undefined
  onAlternar: () => void
  onEscolher: (slug: string) => Promise<void>
  onAbrir: (slug: string) => void
}

function SlotLinha({ slot, exercicio, trocado, aberto, opcoes, original, onAlternar, onEscolher, onAbrir }: SlotLinhaProps) {
  return (
    <li className={`rounded-xl border p-3 ${trocado ? 'border-orange-700' : 'border-neutral-800'}`}>
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => onAbrir(slot.exercise_id)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          {exercicio && (
            <img src={exercicio.imagens[0]} alt="" loading="lazy" className="size-12 shrink-0 rounded-lg bg-neutral-800 object-cover" />
          )}
          <span className="min-w-0">
            <span className="block font-medium">{exercicio?.nome_pt ?? slot.exercise_id}</span>
            <span className="block text-sm text-orange-300">{textoPrescricao(slot)}</span>
            <span className="block text-xs text-neutral-500">{slot.motivo}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onAlternar}
          className="min-h-12 shrink-0 rounded-xl border border-neutral-700 px-3 text-sm active:bg-neutral-800"
        >
          {aberto ? 'Fechar' : 'Trocar'}
        </button>
      </div>
      {aberto && (
        <div className="mt-3 flex flex-col gap-2">
          {trocado && original && (
            <button
              type="button"
              onClick={() => void onEscolher(original.exercise_id)}
              className="min-h-12 rounded-xl bg-neutral-900 px-3 text-left text-sm text-orange-300"
            >
              Voltar para a sugestão original
            </button>
          )}
          {opcoes.length === 0 && <p className="text-sm text-neutral-400">Sem alternativa nesta academia.</p>}
          {opcoes.map((o) => (
            <button
              key={o.slug}
              type="button"
              onClick={() => void onEscolher(o.slug)}
              className="flex min-h-12 items-center gap-3 rounded-xl bg-neutral-900 px-3 py-2 text-left active:bg-neutral-800"
            >
              <img src={o.imagens[0]} alt="" loading="lazy" className="size-10 shrink-0 rounded-md bg-neutral-800 object-cover" />
              <span className="text-sm">{o.nome_pt}</span>
            </button>
          ))}
        </div>
      )}
    </li>
  )
}
