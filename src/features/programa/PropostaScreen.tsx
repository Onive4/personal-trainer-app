import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { alternativas } from '../../engine/substitution'
import { db } from '../../db/schema'
import { Button } from '../../ui/Button'
import { Tela } from '../../ui/Tela'
import { anamneseAtual } from '../perfil/registros'
import { academiaAtiva } from '../academias/registros'
import { useCatalogo } from '../exercicios/useCatalogo'
import { aplicarTrocas, aprovarProposta, chaveSlot, gerarProposta, trocarNaProposta } from './registros'
import { DiaTreino, PorQue, SemanasEsforco } from './Componentes'

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
  const [ocupado, setOcupado] = useState(false)

  // Primeira visita, ou proposta feita por uma versão antiga do app (sem aeróbico): gera de novo.
  useEffect(() => {
    if (!catalogo || !dados?.anamnese || !dados.gym) return
    if (!dados.local || !dados.local.proposta.explicacao) void gerarProposta(userId, catalogo)
  }, [catalogo, dados, userId])

  const porSlug = useMemo(() => new Map((catalogo ?? []).map((e) => [e.slug, e])), [catalogo])
  if (!catalogo || !dados?.local?.proposta.explicacao || !dados.anamnese || !dados.gym) return null

  const { local, anamnese, gym } = dados
  const proposta = aplicarTrocas(local, catalogo)
  const ctx = { equipamentos: gym.equipamentos, constraints: anamnese.constraints, nivel: anamnese.nivel }

  const outra = async () => {
    setOcupado(true)
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
      titulo="Seu novo treino"
      onVoltar={onVoltar}
      rodape={
        <div className="grid grid-cols-2 gap-2">
          <Button variante="secundario" disabled={ocupado} onClick={() => void outra()}>
            Outra opção
          </Button>
          <Button disabled={ocupado} onClick={() => void aprovar()}>
            Começar este
          </Button>
        </div>
      }
    >
      <section className="flex flex-col gap-3 rounded-2xl bg-neutral-900 p-4">
        <div>
          <p className="text-lg font-semibold">{proposta.divisao}</p>
          <p className="text-sm text-neutral-400">
            {proposta.dias.length} treinos por semana · fase de {proposta.semanas} semanas · {gym.nome}
          </p>
        </div>
        <SemanasEsforco rir={proposta.rir_semana} />
      </section>

      {proposta.avisos.map((a) => (
        <p key={a} className="rounded-xl border border-amber-800 p-3 text-sm text-amber-200">
          {a}
        </p>
      ))}

      <PorQue frases={proposta.explicacao} />

      <p className="text-sm text-neutral-400">Não conhece algum aparelho? Toque nele para ver como fazer, ou em "Trocar".</p>

      {proposta.dias.map((d) => (
        <DiaTreino
          key={d.dia}
          titulo={`Treino ${d.dia} · ${d.nome}`}
          minutos={d.minutos_estimados}
          porSlug={porSlug}
          onAbrir={onAbrirExercicio}
          itens={d.slots.map((s) => ({ ...s, chave: chaveSlot(s) }))}
          destaque={(s) => !!local.trocas[s.chave]}
          trocar={(s, fechar) => {
            const original = local.proposta.dias[d.dia - 1]!.slots.find((o) => chaveSlot(o) === s.chave)!
            const atual = porSlug.get(s.exercise_id)
            const opcoes = atual ? alternativas(atual, catalogo, ctx, 4).map((a) => a.exercicio) : []
            const escolher = async (slug: string) => {
              await trocarNaProposta(userId, original, slug)
              fechar()
            }
            return (
              <div className="flex flex-col gap-2">
                {local.trocas[s.chave] && (
                  <button
                    type="button"
                    onClick={() => void escolher(original.exercise_id)}
                    className="min-h-12 rounded-xl bg-neutral-900 px-3 text-left text-sm text-orange-300"
                  >
                    Voltar para a sugestão original
                  </button>
                )}
                {opcoes.length === 0 && <p className="text-sm text-neutral-400">Sem outra opção nesta academia.</p>}
                {opcoes.map((o) => (
                  <button
                    key={o.slug}
                    type="button"
                    onClick={() => void escolher(o.slug)}
                    className="flex min-h-12 items-center gap-3 rounded-xl bg-neutral-900 px-3 py-2 text-left active:bg-neutral-800"
                  >
                    <img src={o.imagens[0]} alt="" loading="lazy" className="size-10 shrink-0 rounded-md bg-neutral-800 object-cover" />
                    <span className="text-sm">{o.nome_pt}</span>
                  </button>
                ))}
              </div>
            )
          }}
        />
      ))}
    </Tela>
  )
}
