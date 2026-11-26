import type { ButtonHTMLAttributes } from 'react'

type Variante = 'primario' | 'secundario' | 'texto'

const estilos: Record<Variante, string> = {
  primario: 'bg-orange-500 text-black font-semibold active:bg-orange-400',
  secundario: 'bg-neutral-900 text-neutral-100 font-semibold active:bg-neutral-800',
  texto: 'bg-transparent text-orange-400 underline-offset-4 active:underline',
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
