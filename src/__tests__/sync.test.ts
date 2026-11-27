import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { TreinoDB, enfileirarSync } from '../db/schema'
import { MAX_TENTATIVAS, processarFila, type ResultadoEnvio } from '../db/sync'

let banco: TreinoDB

beforeEach(async () => {
  banco = new TreinoDB(`sync-${Math.random()}`)
  await banco.open()
})

describe('fila de sincronização', () => {
  it('envia em ordem e remove o que deu certo', async () => {
    await enfileirarSync('measurements', 'insert', { id: 'a' }, banco)
    await enfileirarSync('measurements', 'insert', { id: 'b' }, banco)
    const enviados: unknown[] = []
    await processarFila(async (lote) => {
      enviados.push(lote.map((i) => i.payload.id))
      return 'ok'
    }, banco)
    // Inserts seguidos da mesma tabela vão juntos, num envio só.
    expect(enviados).toEqual([['a', 'b']])
    expect(await banco.sync_outbox.count()).toBe(0)
  })

  it('sem rede para e mantém tudo pendente, sem contar tentativa', async () => {
    await enfileirarSync('measurements', 'insert', { id: 'a' }, banco)
    await enfileirarSync('measurements', 'insert', { id: 'b' }, banco)
    let chamadas = 0
    await processarFila(async () => {
      chamadas++
      return 'rede'
    }, banco)
    expect(chamadas).toBe(1)
    const itens = await banco.sync_outbox.toArray()
    expect(itens.map((i) => [i.status, i.tentativas])).toEqual([
      ['pendente', 0],
      ['pendente', 0],
    ])
  })

  it('recusa conta tentativa, segue para o próximo e desiste no limite', async () => {
    await enfileirarSync('anamneses', 'insert', { id: 'ruim' }, banco)
    await enfileirarSync('anamneses', 'insert', { id: 'bom' }, banco)
    const enviar = async (lote: { payload: Record<string, unknown> }[]): Promise<ResultadoEnvio> =>
      lote.some((i) => i.payload.id === 'ruim') ? 'recusado' : 'ok'
    for (let k = 0; k < MAX_TENTATIVAS + 2; k++) await processarFila(enviar, banco)
    const itens = await banco.sync_outbox.toArray()
    expect(itens).toHaveLength(1)
    expect(itens[0]?.status).toBe('erro')
    expect(itens[0]?.tentativas).toBe(MAX_TENTATIVAS)
  })
})

describe('lotes', () => {
  it('agrupa só inserts consecutivos da mesma tabela, mantendo a ordem', async () => {
    await enfileirarSync('programs', 'update', { id: 'p0' }, banco)
    await enfileirarSync('programs', 'insert', { id: 'p1' }, banco)
    await enfileirarSync('mesocycles', 'insert', { id: 'm1' }, banco)
    for (let i = 0; i < 3; i++) await enfileirarSync('slots', 'insert', { id: 's' + i }, banco)
    const lotes: unknown[][] = []
    await processarFila(async (lote) => {
      lotes.push(lote.map((i) => i.payload.id))
      return 'ok'
    }, banco)
    expect(lotes).toEqual([['p0'], ['p1'], ['m1'], ['s0', 's1', 's2']])
  })

  it('sem rede no meio: o que já foi fica, o resto espera', async () => {
    await enfileirarSync('programs', 'insert', { id: 'p1' }, banco)
    await enfileirarSync('slots', 'insert', { id: 's1' }, banco)
    await processarFila(async (lote) => (lote[0]!.tabela === 'slots' ? 'rede' : 'ok'), banco)
    const restantes = await banco.sync_outbox.toArray()
    expect(restantes.map((i) => [i.payload.id, i.status])).toEqual([['s1', 'pendente']])
  })
})
