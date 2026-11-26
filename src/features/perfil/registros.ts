/**
 * Gravação local dos dados do M1. Cada escrita vai para o Dexie e para a fila
 * de sincronização na mesma transação — nada espera a rede.
 * As regras ficam no motor (src/engine); aqui só se monta o registro.
 */
import {
  avaliarAnamnese,
  idadeEm,
  podeGerarPrograma,
  type LiberacaoMedica,
  type RespostasAnamnese,
} from '../../engine/anamnese'
import { gorduraMarinha, macros, metaNutricional, type AjusteAdaptativo } from '../../engine/nutrition'
import {
  db,
  enfileirarSync,
  type Anamnese,
  type Measurement,
  type NutritionTarget,
} from '../../db/schema'
import { enviarFila } from '../../api/sincronizacao'
import { hojeSP } from '../../ui/datas'

const agoraISO = () => new Date().toISOString()

function enviarDepois() {
  void enviarFila().catch(() => {})
}

export async function anamneseAtual(userId: string): Promise<Anamnese | undefined> {
  return db.anamneses
    .where('[profile_id+versao]')
    .between([userId, 0], [userId, Infinity])
    .last()
}

export async function metaAtual(userId: string): Promise<NutritionTarget | undefined> {
  const todas = await db.nutrition_targets.where('profile_id').equals(userId).toArray()
  return todas.sort((a, b) => a.created_at.localeCompare(b.created_at)).at(-1)
}

export async function ultimaMedida(userId: string): Promise<Measurement | undefined> {
  const todas = await db.measurements.where('profile_id').equals(userId).toArray()
  return todas.sort((a, b) => (a.data + a.created_at).localeCompare(b.data + b.created_at)).at(-1)
}

function novaMeta(
  userId: string,
  respostas: RespostasAnamnese,
  peso_kg: number,
  motivo: string,
): NutritionTarget {
  const id = respostas.identificacao
  const hoje = hojeSP()
  const m = metaNutricional({
    sexo: id.sexo,
    peso_kg,
    altura_cm: id.altura_cm,
    idade: idadeEm(id.data_nascimento, hoje),
    atividade: respostas.contexto.atividade_diaria,
    objetivo: respostas.objetivo.objetivo,
  })
  return {
    id: crypto.randomUUID(),
    profile_id: userId,
    data: hoje,
    tmb: m.tmb,
    tdee: m.tdee,
    kcal_alvo: m.kcal_alvo,
    proteina_g: m.proteina_g,
    gordura_g: m.gordura_g,
    carbo_g: m.carbo_g,
    objetivo: respostas.objetivo.objetivo,
    peso_alvo_semana_pct: m.peso_alvo_semana_pct,
    motivo,
    created_at: agoraISO(),
  }
}

/** Grava uma versão nova da anamnese, o peso informado e, se liberado, a meta. */
export async function salvarAnamnese(
  userId: string,
  respostas: RespostasAnamnese,
  liberacao: LiberacaoMedica | null,
  motivo?: string,
): Promise<Anamnese> {
  const anterior = await anamneseAtual(userId)
  const versao = (anterior?.versao ?? 0) + 1
  const av = avaliarAnamnese(respostas, liberacao)
  const anamnese: Anamnese = {
    id: crypto.randomUUID(),
    profile_id: userId,
    versao,
    respostas,
    clearance_status: av.clearance_status,
    constraints: av.constraints,
    nivel: av.nivel,
    objetivo: av.objetivo,
    liberacao,
    data: agoraISO(),
  }

  const { sexo, data_nascimento, altura_cm, peso_kg } = respostas.identificacao
  const ultima = await ultimaMedida(userId)
  const hoje = hojeSP()
  const medida: Measurement | null =
    ultima && ultima.data === hoje && ultima.peso_kg === peso_kg
      ? null
      : {
          id: crypto.randomUUID(),
          profile_id: userId,
          data: hoje,
          peso_kg,
          pescoco: null,
          cintura: null,
          quadril: null,
          torax: null,
          braco_d: null,
          braco_e: null,
          coxa_d: null,
          coxa_e: null,
          panturrilha: null,
          bf_estimado: null,
          created_at: agoraISO(),
        }

  // Sinal de alerta sem liberação: sem programa e sem meta calórica.
  const meta = podeGerarPrograma(av.clearance_status)
    ? novaMeta(userId, respostas, peso_kg, motivo ?? `Anamnese versão ${versao}`)
    : null

  await db.transaction(
    'rw',
    [db.anamneses, db.measurements, db.nutrition_targets, db.profiles, db.sync_outbox, db.rascunhos_anamnese],
    async () => {
      await db.profiles.update(userId, { sexo, data_nascimento, altura_cm })
      await enfileirarSync('profiles', 'update', { id: userId, sexo, data_nascimento, altura_cm })
      await db.anamneses.add(anamnese)
      await enfileirarSync('anamneses', 'insert', { ...anamnese })
      if (medida) {
        await db.measurements.add(medida)
        await enfileirarSync('measurements', 'insert', { ...medida })
      }
      if (meta) {
        await db.nutrition_targets.add(meta)
        await enfileirarSync('nutrition_targets', 'insert', { ...meta })
      }
      await db.rascunhos_anamnese.delete(userId)
    },
  )
  enviarDepois()
  return anamnese
}

/** Liberação médica registrada pelo usuário: nova versão com as mesmas respostas. */
export function registrarLiberacao(userId: string, atual: Anamnese, liberacao: LiberacaoMedica) {
  return salvarAnamnese(userId, atual.respostas, liberacao, `Liberação médica registrada (anamnese versão ${atual.versao + 1})`)
}

export type CamposMedida = Omit<Measurement, 'id' | 'profile_id' | 'bf_estimado' | 'created_at'>

export async function registrarMedida(userId: string, campos: CamposMedida): Promise<Measurement> {
  const anamnese = await anamneseAtual(userId)
  const id = anamnese?.respostas.identificacao
  const bf = id
    ? gorduraMarinha({ sexo: id.sexo, altura_cm: id.altura_cm, pescoco: campos.pescoco, cintura: campos.cintura, quadril: campos.quadril })
    : null
  const medida: Measurement = {
    ...campos,
    id: crypto.randomUUID(),
    profile_id: userId,
    bf_estimado: bf,
    created_at: agoraISO(),
  }
  await db.transaction('rw', db.measurements, db.sync_outbox, async () => {
    await db.measurements.add(medida)
    await enfileirarSync('measurements', 'insert', { ...medida })
  })
  enviarDepois()
  return medida
}

/** O motor propôs, o usuário aprovou: grava a meta nova com o motivo. */
export async function aplicarAjuste(
  atual: NutritionTarget,
  ajuste: AjusteAdaptativo,
  peso_kg: number,
): Promise<void> {
  const meta: NutritionTarget = {
    ...atual,
    ...macros(ajuste.kcal_nova, peso_kg, atual.objetivo),
    id: crypto.randomUUID(),
    data: hojeSP(),
    kcal_alvo: ajuste.kcal_nova,
    motivo: ajuste.motivo,
    created_at: agoraISO(),
  }
  await db.transaction('rw', db.nutrition_targets, db.sync_outbox, async () => {
    await db.nutrition_targets.add(meta)
    await enfileirarSync('nutrition_targets', 'insert', { ...meta })
  })
  enviarDepois()
}
