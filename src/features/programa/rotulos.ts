import type { Grupo } from '../../engine/volume'
import { rotuloMusculo } from '../exercicios/rotulos'

export const rotuloGrupo = (g: Grupo) => (g === 'costas' ? 'Costas' : rotuloMusculo(g))

interface SlotTexto {
  tipo: string
  series_alvo: number
  rep_min: number
  rep_max: number
  minutos?: number | null
}

/** "3 séries de 8 a 12" ou "15 minutos". */
export function textoPrescricao(s: SlotTexto): string {
  if (s.tipo === 'aerobico') return `${s.minutos ?? 10} minutos`
  return `${s.series_alvo} ${s.series_alvo === 1 ? 'série' : 'séries'} de ${s.rep_min} a ${s.rep_max}`
}

/** Esforço em palavras (no lugar de "RIR"). */
export function nivelEsforco(rir: number): string {
  if (rir >= 4) return 'Leve'
  if (rir === 3) return 'Moderado'
  if (rir === 2) return 'Forte'
  return 'Bem forte'
}

/** Instrução de quando parar a série. */
export function textoEsforco(rir: number): string {
  return `pare quando ainda conseguir fazer mais ${rir} ${rir === 1 ? 'repetição' : 'repetições'}`
}
