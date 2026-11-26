interface Opcao<T extends string | number> {
  valor: T
  rotulo: string
  detalhe?: string
}

const base =
  'min-h-12 rounded-xl border px-4 py-2 text-left text-base transition-colors active:scale-[0.99]'
const ativo = 'border-orange-500 bg-orange-500/15 text-orange-200'
const inativo = 'border-neutral-800 bg-neutral-900 text-neutral-200'

interface UmaProps<T extends string | number> {
  rotulo?: string
  opcoes: Opcao<T>[]
  valor: T | null
  onChange: (v: T) => void
  colunas?: 1 | 2 | 3
}

const grade = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' }

/** Escolha única em botões grandes (alvo de 48 px). */
export function EscolhaUma<T extends string | number>({ rotulo, opcoes, valor, onChange, colunas = 2 }: UmaProps<T>) {
  return (
    <fieldset className="flex flex-col gap-2">
      {rotulo && <legend className="mb-2 text-sm text-neutral-300">{rotulo}</legend>}
      <div className={`grid gap-2 ${grade[colunas]}`}>
        {opcoes.map((o) => (
          <button
            key={String(o.valor)}
            type="button"
            aria-pressed={valor === o.valor}
            onClick={() => onChange(o.valor)}
            className={`${base} ${valor === o.valor ? ativo : inativo}`}
          >
            <span className="block">{o.rotulo}</span>
            {o.detalhe && <span className="block text-sm text-neutral-400">{o.detalhe}</span>}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

interface VariasProps<T extends string> {
  rotulo?: string
  opcoes: Opcao<T>[]
  valores: T[]
  onChange: (v: T[]) => void
  maximo?: number
  colunas?: 1 | 2 | 3
}

/** Escolha múltipla. Com `maximo`, não deixa marcar além do limite. */
export function EscolhaVarias<T extends string>({ rotulo, opcoes, valores, onChange, maximo, colunas = 2 }: VariasProps<T>) {
  const alternar = (v: T) => {
    if (valores.includes(v)) onChange(valores.filter((x) => x !== v))
    else if (!maximo || valores.length < maximo) onChange([...valores, v])
  }
  return (
    <fieldset className="flex flex-col gap-2">
      {rotulo && <legend className="mb-2 text-sm text-neutral-300">{rotulo}</legend>}
      <div className={`grid gap-2 ${grade[colunas]}`}>
        {opcoes.map((o) => {
          const marcado = valores.includes(o.valor)
          return (
            <button
              key={o.valor}
              type="button"
              aria-pressed={marcado}
              onClick={() => alternar(o.valor)}
              className={`${base} ${marcado ? ativo : inativo}`}
            >
              {o.rotulo}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

interface SimNaoProps {
  pergunta: string
  valor: boolean | null
  onChange: (v: boolean) => void
}

/** Pergunta de sim ou não, com os dois botões lado a lado. */
export function SimNao({ pergunta, valor, onChange }: SimNaoProps) {
  return (
    <fieldset className="flex flex-col gap-2 rounded-xl border border-neutral-900 p-3">
      <legend className="sr-only">{pergunta}</legend>
      <p className="text-base text-neutral-100">{pergunta}</p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { v: false, r: 'Não' },
          { v: true, r: 'Sim' },
        ].map(({ v, r }) => (
          <button
            key={r}
            type="button"
            aria-pressed={valor === v}
            onClick={() => onChange(v)}
            className={`${base} text-center ${valor === v ? ativo : inativo}`}
          >
            {r}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
