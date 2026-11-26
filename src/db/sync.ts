import { db, type SyncOutboxItem, type TreinoDB } from './schema'

/**
 * Resultado de uma tentativa de envio:
 * - ok: o servidor gravou (ou já tinha o registro) → sai da fila;
 * - rede: sem conexão → para tudo e tenta de novo depois, sem contar tentativa;
 * - recusado: o servidor rejeitou → marca erro, conta tentativa e segue para o próximo.
 */
export type ResultadoEnvio = 'ok' | 'rede' | 'recusado'
export type Enviar = (item: SyncOutboxItem) => Promise<ResultadoEnvio>

/** Depois disso o item fica parado na fila como erro, para não insistir para sempre. */
export const MAX_TENTATIVAS = 5

let emAndamento: Promise<void> | null = null

/**
 * Envia a fila em ordem de criação. Uma execução por vez; chamadas durante
 * um envio esperam o mesmo envio. Versão do M1: só inserção idempotente e
 * atualização de perfil. A resolução de conflitos completa chega no M4.
 */
export function processarFila(enviar: Enviar, banco: TreinoDB = db): Promise<void> {
  emAndamento ??= (async () => {
    try {
      const itens = await banco.sync_outbox.orderBy('id').toArray()
      for (const item of itens) {
        if (item.tentativas >= MAX_TENTATIVAS) continue
        await banco.sync_outbox.update(item.id!, { status: 'enviando' })
        const r = await enviar(item).catch((): ResultadoEnvio => 'rede')
        if (r === 'ok') {
          await banco.sync_outbox.delete(item.id!)
        } else if (r === 'rede') {
          await banco.sync_outbox.update(item.id!, { status: 'pendente' })
          return
        } else {
          await banco.sync_outbox.update(item.id!, {
            status: 'erro',
            tentativas: item.tentativas + 1,
          })
        }
      }
    } finally {
      emAndamento = null
    }
  })()
  return emAndamento
}
