import { db, type SyncOutboxItem, type TreinoDB } from './schema'

/**
 * Resultado de uma tentativa de envio:
 * - ok: o servidor gravou (ou já tinha o registro) → sai da fila;
 * - rede: sem conexão → para tudo e tenta de novo depois, sem contar tentativa;
 * - recusado: o servidor rejeitou → marca erro, conta tentativa e segue para o próximo.
 */
export type ResultadoEnvio = 'ok' | 'rede' | 'recusado'
/** Recebe um lote: vários inserts seguidos da mesma tabela, ou um item sozinho. */
export type Enviar = (itens: SyncOutboxItem[]) => Promise<ResultadoEnvio>

/** Depois disso o item fica parado na fila como erro, para não insistir para sempre. */
export const MAX_TENTATIVAS = 5
/** Tamanho máximo de um lote (um treino aprovado tem ~40 slots). */
export const TAMANHO_LOTE = 200

let emAndamento: Promise<void> | null = null

/** Agrupa inserts consecutivos da mesma tabela; o resto vai um por um. A ordem é mantida. */
export function agruparEmLotes(itens: SyncOutboxItem[]): SyncOutboxItem[][] {
  const lotes: SyncOutboxItem[][] = []
  for (const item of itens) {
    const ultimo = lotes.at(-1)
    const cabe =
      ultimo &&
      item.operacao === 'insert' &&
      ultimo[0]!.operacao === 'insert' &&
      ultimo[0]!.tabela === item.tabela &&
      ultimo.length < TAMANHO_LOTE
    if (cabe) ultimo.push(item)
    else lotes.push([item])
  }
  return lotes
}

/**
 * Envia a fila em ordem de criação, em lotes. Uma execução por vez; chamadas
 * durante um envio esperam o mesmo envio. Se um lote for recusado, os itens
 * dele vão um por um, para o erro de um não segurar os outros.
 */
export function processarFila(enviar: Enviar, banco: TreinoDB = db): Promise<void> {
  emAndamento ??= (async () => {
    try {
      const itens = (await banco.sync_outbox.orderBy('id').toArray()).filter((i) => i.tentativas < MAX_TENTATIVAS)
      for (const lote of agruparEmLotes(itens)) {
        const ids = lote.map((i) => i.id!)
        await banco.sync_outbox.bulkUpdate(ids.map((key) => ({ key, changes: { status: 'enviando' as const } })))
        const r = await enviar(lote).catch((): ResultadoEnvio => 'rede')
        if (r === 'ok') {
          await banco.sync_outbox.bulkDelete(ids)
          continue
        }
        if (r === 'rede') {
          await banco.sync_outbox.bulkUpdate(ids.map((key) => ({ key, changes: { status: 'pendente' as const } })))
          return
        }
        // Recusado: separa para achar quem está com problema.
        for (const item of lote) {
          const r1 = lote.length === 1 ? r : await enviar([item]).catch((): ResultadoEnvio => 'rede')
          if (r1 === 'ok') await banco.sync_outbox.delete(item.id!)
          else if (r1 === 'rede') {
            await banco.sync_outbox.update(item.id!, { status: 'pendente' })
            return
          } else await banco.sync_outbox.update(item.id!, { status: 'erro', tentativas: item.tentativas + 1 })
        }
      }
    } finally {
      emAndamento = null
    }
  })()
  return emAndamento
}
