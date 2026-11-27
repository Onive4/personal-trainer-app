import { MUSCULOS } from '../anamnese/rotulos'

export const rotuloMusculo = (m: string) =>
  m === 'cardio' ? 'Aeróbico' : (MUSCULOS.find((x) => x.valor === m)?.rotulo ?? m.replaceAll('_', ' '))

const PADRAO: Record<string, string> = {
  agachamento: 'Agachamento',
  anti_extensao: 'Estabilidade de tronco (anti-extensão)',
  anti_rotacao: 'Estabilidade de tronco (anti-rotação)',
  dobradica_quadril: 'Dobradiça de quadril',
  empurrar_horizontal: 'Empurrar na horizontal',
  empurrar_vertical: 'Empurrar na vertical',
  flexao_tronco: 'Flexão de tronco',
  isolamento: 'Isolado',
  puxar_horizontal: 'Puxar na horizontal',
  puxar_vertical: 'Puxar na vertical',
  unilateral_perna: 'Perna unilateral',
}
export const rotuloPadrao = (p: string) => PADRAO[p] ?? p.replaceAll('_', ' ')

export const ROTULO_NIVEL_EX: Record<string, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
}
