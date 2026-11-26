import { db, enfileirarSync, type Gym } from '../../db/schema'
import { enviarFila } from '../../api/sincronizacao'

const agora = () => new Date().toISOString()
const enviarDepois = () => void enviarFila().catch(() => {})

export async function academias(userId: string): Promise<Gym[]> {
  const lista = await db.gyms.where('profile_id').equals(userId).toArray()
  return lista.sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export async function academiaAtiva(userId: string): Promise<Gym | undefined> {
  return (await academias(userId)).find((g) => g.ativa)
}

/** Cria a academia. A primeira já nasce ativa. Peso corporal vem marcado. */
export async function criarAcademia(userId: string, nome: string): Promise<Gym> {
  const existentes = await academias(userId)
  const gym: Gym = {
    id: crypto.randomUUID(),
    profile_id: userId,
    nome: nome.trim(),
    ativa: existentes.length === 0,
    equipamentos: ['peso_corporal'],
    created_at: agora(),
    updated_at: agora(),
  }
  await db.transaction('rw', db.gyms, db.sync_outbox, async () => {
    await db.gyms.add(gym)
    await enfileirarSync('gyms', 'insert', { ...gym })
  })
  enviarDepois()
  return gym
}

type Alteravel = Partial<Pick<Gym, 'nome' | 'ativa' | 'equipamentos'>>

async function alterar(gym: Gym, campos: Alteravel) {
  const updated_at = agora()
  await db.gyms.update(gym.id, { ...campos, updated_at })
  await enfileirarSync('gyms', 'update', { id: gym.id, ...campos, updated_at })
}

export async function salvarAcademia(gym: Gym, campos: Pick<Gym, 'nome' | 'equipamentos'>): Promise<void> {
  await db.transaction('rw', db.gyms, db.sync_outbox, () =>
    alterar(gym, { nome: campos.nome.trim(), equipamentos: [...new Set(campos.equipamentos)].sort() }),
  )
  enviarDepois()
}

/** Só uma academia ativa por pessoa. */
export async function ativarAcademia(userId: string, id: string): Promise<void> {
  const lista = await academias(userId)
  await db.transaction('rw', db.gyms, db.sync_outbox, async () => {
    for (const g of lista) {
      const deve = g.id === id
      if (g.ativa !== deve) await alterar(g, { ativa: deve })
    }
  })
  enviarDepois()
}
