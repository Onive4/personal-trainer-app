/**
 * Proposta e aprovação do bloco. A proposta fica só no aparelho; aprovar grava
 * programa, mesociclo e slots no Dexie e na fila na mesma transação.
 */
import { podeGerarPrograma } from '../../engine/anamnese'
import { montarMesociclo, type PropostaMesociclo, type SlotProposto } from '../../engine/builder'
import type { Exercicio } from '../../engine/catalogo'
import {
  db,
  enfileirarSync,
  type Mesocycle,
  type Program,
  type PropostaLocal,
  type Slot,
} from '../../db/schema'
import { enviarFila } from '../../api/sincronizacao'
import { anamneseAtual } from '../perfil/registros'
import { academiaAtiva } from '../academias/registros'

const agora = () => new Date().toISOString()
export const chaveSlot = (s: Pick<SlotProposto, 'dia' | 'ordem'>) => `${s.dia}-${s.ordem}`

export interface ProgramaAtual {
  programa: Program
  mesociclo: Mesocycle
  slots: Slot[]
}

export async function programaAtual(userId: string): Promise<ProgramaAtual | undefined> {
  const programas = await db.programs.where('profile_id').equals(userId).toArray()
  const programa = programas.filter((p) => p.ativo).sort((a, b) => b.criado_em.localeCompare(a.criado_em))[0]
  if (!programa) return undefined
  const mesos = await db.mesocycles.where('program_id').equals(programa.id).toArray()
  const mesociclo = mesos.sort((a, b) => b.numero - a.numero)[0]
  if (!mesociclo) return undefined
  const slots = (await db.slots.where('mesocycle_id').equals(mesociclo.id).toArray()).sort(
    (a, b) => a.dia - b.dia || a.ordem - b.ordem,
  )
  return { programa, mesociclo, slots }
}

/** O que falta para poder gerar um programa (null = pode). */
export async function pendenciaParaGerar(userId: string): Promise<'anamnese' | 'liberacao' | 'academia' | null> {
  const anamnese = await anamneseAtual(userId)
  if (!anamnese) return 'anamnese'
  if (!podeGerarPrograma(anamnese.clearance_status)) return 'liberacao'
  if (!(await academiaAtiva(userId))) return 'academia'
  return null
}

/** Gera (ou regera com outra variante) a proposta e guarda no aparelho. */
export async function gerarProposta(userId: string, catalogo: readonly Exercicio[], variante = 0): Promise<PropostaLocal> {
  const [anamnese, gym, atual] = await Promise.all([anamneseAtual(userId), academiaAtiva(userId), programaAtual(userId)])
  if (!anamnese || !gym || !podeGerarPrograma(anamnese.clearance_status)) {
    throw new Error('Faltam anamnese liberada ou academia ativa.')
  }
  const r = anamnese.respostas
  const proposta = montarMesociclo({
    nivel: anamnese.nivel,
    objetivo: anamnese.objetivo,
    dias_semana: r.contexto.dias_semana,
    minutos_sessao: r.contexto.minutos_sessao,
    musculos_prioritarios: r.objetivo.musculos_prioritarios,
    padroes_dominados: r.historico.padroes_dominados,
    constraints: anamnese.constraints,
    equipamentos: gym.equipamentos,
    catalogo,
    anteriores: atual?.slots.map((s) => s.exercise_id),
    variante,
  })
  const local: PropostaLocal = {
    profile_id: userId,
    variante,
    proposta,
    trocas: {},
    gym_id: gym.id,
    anamnese_id: anamnese.id,
    gerada_em: agora(),
  }
  await db.propostas.put(local)
  return local
}

export async function trocarNaProposta(userId: string, slot: SlotProposto, slug: string): Promise<void> {
  const p = await db.propostas.get(userId)
  if (!p) return
  const trocas = { ...p.trocas }
  if (slug === slot.exercise_id) delete trocas[chaveSlot(slot)]
  else trocas[chaveSlot(slot)] = slug
  await db.propostas.update(userId, { trocas })
}

/** Proposta com as trocas aplicadas: o que de fato será gravado. */
export function aplicarTrocas(p: PropostaLocal, catalogo: readonly Exercicio[]): PropostaMesociclo {
  const porSlug = new Map(catalogo.map((e) => [e.slug, e]))
  return {
    ...p.proposta,
    dias: p.proposta.dias.map((d) => ({
      ...d,
      slots: d.slots.map((s) => {
        const novo = p.trocas[chaveSlot(s)]
        const ex = novo ? porSlug.get(novo) : undefined
        if (!ex) return s
        return { ...s, exercise_id: ex.slug, padrao_movimento: ex.padrao_movimento, motivo: `Trocado por você (no lugar de ${porSlug.get(s.exercise_id)?.nome_pt ?? s.exercise_id})` }
      }),
    })),
  }
}

/** Nada entra em vigor sem aprovação (seção 9). */
export async function aprovarProposta(userId: string, catalogo: readonly Exercicio[]): Promise<void> {
  const local = await db.propostas.get(userId)
  if (!local) return
  const proposta = aplicarTrocas(local, catalogo)
  const anamnese = await anamneseAtual(userId)
  const atual = await programaAtual(userId)
  const t = agora()

  // Mesmo objetivo e mesmos dias: novo bloco do mesmo programa. Senão, programa novo.
  const continua =
    atual && anamnese && atual.programa.objetivo === anamnese.objetivo && atual.programa.dias_semana === proposta.dias.length
  const programa: Program = continua
    ? atual.programa
    : {
        id: crypto.randomUUID(),
        profile_id: userId,
        nome: proposta.divisao,
        objetivo: anamnese!.objetivo,
        dias_semana: proposta.dias.length,
        criado_em: t,
        ativo: true,
        updated_at: t,
      }
  const mesociclo: Mesocycle = {
    id: crypto.randomUUID(),
    program_id: programa.id,
    profile_id: userId,
    numero: continua ? atual.mesociclo.numero + 1 : 1,
    semanas: proposta.semanas,
    enfase: proposta.enfase,
    status: 'aprovado',
    diagnostico: {
      divisao: proposta.divisao,
      dias: proposta.dias.map((d) => d.nome),
      volume: proposta.volume,
      avisos: proposta.avisos,
      validacao: proposta.validacao,
      series_por_sessao: proposta.series_por_sessao,
      semanas_acumulo: proposta.semanas_acumulo,
      variante: local.variante,
      trocas: Object.keys(local.trocas).length,
      gym_id: local.gym_id,
      anamnese_id: local.anamnese_id,
    },
    aprovado_em: t,
    created_at: t,
    updated_at: t,
  }
  const slots: Slot[] = proposta.dias.flatMap((d) =>
    d.slots.map((s) => ({
      id: crypto.randomUUID(),
      mesocycle_id: mesociclo.id,
      profile_id: userId,
      dia: d.dia,
      ordem: s.ordem,
      exercise_id: s.exercise_id,
      padrao_movimento: s.padrao_movimento,
      tipo: s.tipo,
      series_alvo: s.series_alvo,
      rep_min: s.rep_min,
      rep_max: s.rep_max,
      rir_semana: proposta.rir_semana,
      substituiu_slot_id: null,
      motivo: s.motivo,
      created_at: t,
    })),
  )

  await db.transaction('rw', [db.programs, db.mesocycles, db.slots, db.propostas, db.sync_outbox], async () => {
    if (!continua) {
      for (const p of await db.programs.where('profile_id').equals(userId).toArray()) {
        if (p.ativo) {
          await db.programs.update(p.id, { ativo: false, updated_at: t })
          await enfileirarSync('programs', 'update', { id: p.id, ativo: false, updated_at: t })
        }
      }
      await db.programs.add(programa)
      await enfileirarSync('programs', 'insert', { ...programa })
    }
    await db.mesocycles.add(mesociclo)
    await enfileirarSync('mesocycles', 'insert', { ...mesociclo })
    await db.slots.bulkAdd(slots)
    for (const s of slots) await enfileirarSync('slots', 'insert', { ...s })
    await db.propostas.delete(userId)
  })
  void enviarFila().catch(() => {})
}
