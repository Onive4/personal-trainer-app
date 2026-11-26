import { useSyncExternalStore } from 'react'
import { Button } from '../../ui/Button'
import { plataformaAtual } from './platform'
import {
  abrirPromptDeInstalacao,
  aoMudarPromptDeInstalacao,
  podeInstalarNativo,
} from './installPrompt'

/**
 * Instalar na tela de início não é opcional no iPhone: fora dela o iOS
 * apaga os dados locais após ~7 dias sem uso.
 */
export function InstallScreen({ onContinuarNoNavegador }: { onContinuarNoNavegador: () => void }) {
  const plataforma = plataformaAtual()
  const nativo = useSyncExternalStore(aoMudarPromptDeInstalacao, podeInstalarNativo)

  return (
    <main className="tela mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6">
      <h1 className="text-3xl font-bold">Instale o app</h1>
      <p className="text-slate-300">
        Instalado na tela de início, o Treino abre sem internet e seus registros ficam guardados no
        celular até sincronizar.
      </p>

      {plataforma === 'ios' && (
        <ol className="flex flex-col gap-4 text-lg">
          <li>
            <strong>1.</strong> Abra esta página no <strong>Safari</strong>.
          </li>
          <li>
            <strong>2.</strong> Toque em <strong>Compartilhar</strong> (o quadrado com a seta para
            cima).
          </li>
          <li>
            <strong>3.</strong> Escolha <strong>Adicionar à Tela de Início</strong> e confirme.
          </li>
          <li>
            <strong>4.</strong> Abra o Treino pelo ícone novo.
          </li>
        </ol>
      )}

      {plataforma === 'android' &&
        (nativo ? (
          <Button onClick={() => void abrirPromptDeInstalacao()}>Instalar</Button>
        ) : (
          <ol className="flex flex-col gap-4 text-lg">
            <li>
              <strong>1.</strong> Abra esta página no <strong>Chrome</strong>.
            </li>
            <li>
              <strong>2.</strong> Toque no menu <strong>⋮</strong> e em{' '}
              <strong>Instalar app</strong> (ou Adicionar à tela inicial).
            </li>
            <li>
              <strong>3.</strong> Abra o Treino pelo ícone novo.
            </li>
          </ol>
        ))}

      {plataforma === 'outra' && (
        <p className="text-slate-300">
          No computador, use o ícone de instalar na barra de endereço, ou continue no navegador.
        </p>
      )}

      <Button variante="texto" onClick={onContinuarNoNavegador}>
        Continuar no navegador
      </Button>
    </main>
  )
}
