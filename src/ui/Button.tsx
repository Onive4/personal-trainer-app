import type { ButtonHTMLAttributes } from 'react'

type Variante = 'primario' | 'secundario' | 'texto'

const estilos: Record<Variante, string> = {
  primario: 'bg-emerald-500 text-slate-950 font-semibold active:bg-emerald-400',
  secundario: 'bg-slate-800 text-slate-100 font-semibold active:bg-slate-700',
  texto: 'bg-transparent text-emerald-300 underline-offset-4 active:underline',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
}

/** Alvo de toque mínimo de 48 px (min-h-12), largura total por padrão. */
export function Button({ variante = 'primario', className = '', type = 'button', ...resto }: Props) {
  return (
    <button
      type={type}
      className={`min-h-12 w-full rounded-xl px-4 text-lg disabled:opacity-50 ${estilos[variante]} ${className}`}
      {...resto}
    />
  )
}
