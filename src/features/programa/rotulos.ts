import type { Grupo } from '../../engine/volume'
import { rotuloMusculo } from '../exercicios/rotulos'

export const rotuloGrupo = (g: Grupo) => (g === 'costas' ? 'Costas' : rotuloMusculo(g))

/** "3 × 8–12" */
export function textoPrescricao(s: { series_alvo: number; rep_min: number; rep_max: number }): string {
  return `${s.series_alvo} × ${s.rep_min}–${s.rep_max}`
}
