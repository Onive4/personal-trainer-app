import { useState, type ReactNode } from 'react'
import type { Exercicio } from '../../engine/catalogo'
import { nivelEsforco, textoEsforco, textoPrescricao } from './rotulos'

/** Faixa com o esforço de cada semana, em palavras. */
export function SemanasEsforco({ rir }: { rir: number[] }) {
  const [aberta, setAberta] = useState<number | null>(null)
  return (
    <div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${rir.length}, minmax(0, 1fr))` }}>
        {rir.map((r, i) => {
          const leve = i === rir.length - 1
          return (
            <button
              key={i}
              type="button"
              onClick={() => setAberta(aberta === i ? null : i)}
              className={`min-h-12 min-w-0 rounded-lg px-0.5 py-1 text-center ${aberta === i ? 'ring-1 ring-orange-500' : ''} ${leve ? 'bg-neutral-800' : 'bg-black'}`}
            >
              <p className="text-[11px] text-neutral-500">Sem. {i + 1}</p>
              <p className="truncate text-xs font-semibold">{leve ? 'Leve' : nivelEsforco(r)}</p>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-sm text-neutral-300">
        {aberta === null
          ? 'O esforço sobe um pouco a cada semana. Toque numa semana para ver como fazer.'
          : aberta === rir.length - 1
            ? `Semana leve: metade das séries, cerca de 70% do peso e ${textoEsforco(rir[aberta]!)}. É a recuperação antes da próxima fase.`
            : `Semana ${aberta + 1}: em cada série, ${textoEsforco(rir[aberta]!)}.`}
      </p>
    </div>
  )
}

export interface ItemTreino {
  chave: string
  exercise_id: string
  tipo: string
  series_alvo: number
  rep_min: number
  rep_max: number
  minutos?: number | null
  motivo: string
}

interface DiaProps {
  titulo: string
  minutos?: number
  itens: ItemTreino[]
  porSlug: Map<string, Exercicio>
  onAbrir: (slug: string) => void
  /** Quando presente, cada item ganha o botão "Trocar" com o conteúdo devolvido. */
  trocar?: (item: ItemTreino, fechar: () => void) => ReactNode
  destaque?: (item: ItemTreino) => boolean
}

/** Um dia de treino: musculação e, no fim, o aeróbico. */
export function DiaTreino({ titulo, minutos, itens, porSlug, onAbrir, trocar, destaque }: DiaProps) {
  const [trocando, setTrocando] = useState<string | null>(null)
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        {minutos !== undefined && <span className="shrink-0 text-sm text-neutral-400">~{minutos} min</span>}
      </div>
      <ul className="flex flex-col gap-2">
        {itens.map((s) => {
          const e = porSlug.get(s.exercise_id)
          const aerobico = s.tipo === 'aerobico'
          return (
            <li
              key={s.chave}
              className={`rounded-xl border p-2 ${destaque?.(s) ? 'border-orange-700' : aerobico ? 'border-sky-900 bg-sky-950/30' : 'border-neutral-800'}`}
            >
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => onAbrir(s.exercise_id)} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-left">
                  {e && <img src={e.imagens[0]} alt="" loading="lazy" className="size-12 shrink-0 rounded-lg bg-neutral-800 object-cover" />}
                  <span className="min-w-0">
                    <span className="block font-medium">{e?.nome_pt ?? s.exercise_id}</span>
                    <span className={`block text-sm ${aerobico ? 'text-sky-300' : 'text-orange-300'}`}>
                      {aerobico ? `Aeróbico · ${textoPrescricao(s)}` : textoPrescricao(s)}
                    </span>
                    {aerobico && <span className="block text-xs text-neutral-400">{s.motivo}</span>}
                  </span>
                </button>
                {trocar && (
                  <button
                    type="button"
                    onClick={() => setTrocando(trocando === s.chave ? null : s.chave)}
                    className="min-h-12 shrink-0 rounded-xl border border-neutral-700 px-3 text-sm active:bg-neutral-800"
                  >
                    {trocando === s.chave ? 'Fechar' : 'Trocar'}
                  </button>
                )}
              </div>
              {trocar && trocando === s.chave && <div className="mt-2">{trocar(s, () => setTrocando(null))}</div>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Bloco recolhível "Por que esse treino?". */
export function PorQue({ frases }: { frases: string[] }) {
  const [aberto, setAberto] = useState(false)
  if (frases.length === 0) return null
  return (
    <section className="rounded-xl border border-neutral-800">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="flex min-h-12 w-full items-center justify-between px-4 text-left font-medium"
      >
        Por que esse treino?
        <span className="text-orange-400">{aberto ? '−' : '+'}</span>
      </button>
      {aberto && (
        <ul className="flex flex-col gap-2 px-4 pb-4 text-sm text-neutral-300">
          {frases.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
