import { useEffect, useState } from 'react'
import { TextField } from './TextField'

interface Props {
  label: string
  valor: number | null
  onChange: (v: number | null) => void
  unidade?: string
  inteiro?: boolean
}

const paraTexto = (v: number | null) => (v === null ? '' : String(v).replace('.', ','))

/** Campo numérico que aceita vírgula. Vazio vira null. */
export function NumberField({ label, valor, onChange, unidade, inteiro = false }: Props) {
  const [texto, setTexto] = useState(paraTexto(valor))

  // Valor trocado de fora (rascunho carregado): reflete no campo.
  useEffect(() => {
    setTexto((t) => {
      const atual = t.trim() === '' ? null : Number(t.replace(',', '.'))
      return atual === valor ? t : paraTexto(valor)
    })
  }, [valor])

  return (
    <TextField
      label={unidade ? `${label} (${unidade})` : label}
      inputMode={inteiro ? 'numeric' : 'decimal'}
      value={texto}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d,.]/g, '')
        setTexto(t)
        const n = Number(t.replace(',', '.'))
        onChange(t.trim() === '' || Number.isNaN(n) ? null : n)
      }}
    />
  )
}
