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
    await processarFila(async (i) => {
      enviados.push(i.payload.id)
      return 'ok'
    }, banco)
    expect(enviados).toEqual(['a', 'b'])
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
    const enviar = async (i: { payload: Record<string, unknown> }): Promise<ResultadoEnvio> =>
      i.payload.id === 'ruim' ? 'recusado' : 'ok'
    for (let k = 0; k < MAX_TENTATIVAS + 2; k++) await processarFila(enviar, banco)
    const itens = await banco.sync_outbox.toArray()
    expect(itens).toHaveLength(1)
    expect(itens[0]?.status).toBe('erro')
    expect(itens[0]?.tentativas).toBe(MAX_TENTATIVAS)
  })
})
