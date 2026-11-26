import type { ReactNode } from 'react'

interface Props {
  titulo: string
  onVoltar?: () => void
  children: ReactNode
  rodape?: ReactNode
}

/** Moldura das telas internas: cabeçalho com voltar e rodapé fixo opcional. */
export function Tela({ titulo, onVoltar, children, rodape }: Props) {
  return (
    <main className="tela mx-auto flex min-h-dvh max-w-md flex-col gap-5">
      <header className="flex items-center gap-2">
        {onVoltar && (
          <button
            type="button"
            onClick={onVoltar}
            aria-label="Voltar"
            className="-ml-2 flex min-h-12 min-w-12 items-center justify-center rounded-xl text-2xl text-orange-400 active:bg-neutral-900"
          >
            ‹
          </button>
        )}
        <h1 className="text-2xl font-bold">{titulo}</h1>
      </header>
      <div className="flex flex-1 flex-col gap-5">{children}</div>
      {rodape && <div className="sticky bottom-0 -mx-1 bg-black px-1 pb-2 pt-3">{rodape}</div>}
    </main>
  )
}

/** Enquadramento obrigatório em toda tela com número de saúde ou nutrição. */
export function AvisoEstimativa({ children }: { children?: ReactNode }) {
  return (
    <p className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-400">
      {children ??
        'Estes números são estimativas para orientar ajustes, não diagnóstico nem prescrição. ' +
          'Condição de saúde, uso de medicação, gestação ou restrição alimentar: procure um nutricionista ou médico.'}
    </p>
  )
}
