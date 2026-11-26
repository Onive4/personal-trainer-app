const FUSO = 'America/Sao_Paulo'

/** Data de hoje em São Paulo, AAAA-MM-DD. */
export function hojeSP(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(agora)
}

/** AAAA-MM-DD ou ISO completo → "26/11/2026". */
export function formatarData(data: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    const [a, m, d] = data.split('-')
    return `${d}/${m}/${a}`
  }
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO }).format(new Date(data))
}

/** Número em pt-BR com até `casas` decimais. */
export function num(n: number, casas = 1): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: casas })
}
