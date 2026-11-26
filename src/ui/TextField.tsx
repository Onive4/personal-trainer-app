import { useId, type InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

/** Campo com rótulo visível e altura mínima de 48 px. */
export function TextField({ label, className = '', ...resto }: Props) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-slate-300">
        {label}
      </label>
      <input
        id={id}
        className={`min-h-12 rounded-xl border border-slate-700 bg-slate-800 px-4 text-lg text-slate-100 focus:border-emerald-400 focus:outline-none ${className}`}
        {...resto}
      />
    </div>
  )
}
