import { useId, type InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

/** Campo com rótulo visível e altura mínima de 48 px. */
export function TextField({ label, className = '', ...resto }: Props) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-neutral-300">
        {label}
      </label>
      <input
        id={id}
        className={`min-h-12 rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-lg text-neutral-100 focus:border-orange-500 focus:outline-none ${className}`}
        {...resto}
      />
    </div>
  )
}
