import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { Button } from '../../ui/Button'
import { num } from '../../ui/datas'
import { anamneseAtual, metaAtual, ultimaMedida } from '../perfil/registros'
import { ROTULO_NIVEL, ROTULO_OBJETIVO } from '../anamnese/rotulos'
import { academiaAtiva } from '../academias/registros'
import { programaAtual } from '../programa/registros'

interface Props {
  userId: string
  email: string | null
  nomeDaSessao: string | null
  online: boolean
  onIr: (caminho: string) => void
  onSair: () => Promise<void>
}

export function HomeScreen({ userId, email, nomeDaSessao, online, onIr, onSair }: Props) {
  // A tela lê do Dexie; a rede só atualiza o espelho em segundo plano.
  const dados = useLiveQuery(async () => {
    const [perfil, anamnese, meta, medida, rascunho, pendentes, gym, programa, proposta] = await Promise.all([
      db.profiles.get(userId),
      anamneseAtual(userId),
      metaAtual(userId),
      ultimaMedida(userId),
      db.rascunhos_anamnese.get(userId),
      db.sync_outbox.count(),
      academiaAtiva(userId),
      programaAtual(userId),
      db.propostas.get(userId),
    ])
    return { perfil, anamnese, meta, medida, rascunho, pendentes, gym, programa, proposta }
  }, [userId])

  // Perfil local primeiro; na primeira abertura, o nome que veio no login.
  const nome = dados?.perfil?.nome || nomeDaSessao || email || 'você'
  const anamnese = dados?.anamnese

  return (
    <main className="tela mx-auto flex min-h-dvh max-w-md flex-col gap-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Olá, {nome}</h1>
        <span
          className={`rounded-full px-3 py-1 text-sm ${
            online ? 'bg-emerald-900 text-emerald-200' : 'bg-amber-900 text-amber-200'
          }`}
        >
          {online ? 'Online' : 'Offline'}
        </span>
      </header>

      {dados && !anamnese && (
        <section className="flex flex-col gap-3 rounded-2xl bg-neutral-900 p-4">
          <h2 className="text-lg font-semibold">Comece pela anamnese</h2>
          <p className="text-neutral-300">
            São 7 etapas rápidas sobre saúde, histórico de treino e objetivo. Com elas o app calcula suas restrições e
            metas.
          </p>
          <Button onClick={() => onIr('/anamnese')}>{dados.rascunho ? 'Continuar anamnese' : 'Fazer anamnese'}</Button>
        </section>
      )}

      {anamnese?.clearance_status === 'orientar_avaliacao' && (
        <section className="flex flex-col gap-3 rounded-2xl border border-amber-700 p-4">
          <h2 className="text-lg font-semibold">Avaliação médica recomendada</h2>
          <p className="text-neutral-300">O treino fica bloqueado até você registrar a liberação.</p>
          <Button onClick={() => onIr('/avaliacao')}>Ver detalhes</Button>
        </section>
      )}

      {anamnese && anamnese.clearance_status !== 'orientar_avaliacao' && (
        <button
          type="button"
          onClick={() => onIr('/programa')}
          className="flex flex-col gap-1 rounded-2xl border border-orange-500/60 bg-neutral-900 p-4 text-left active:bg-neutral-800"
        >
          <span className="text-sm text-orange-300">Seu treino</span>
          <span className="text-lg font-semibold">
            {dados?.programa
              ? dados.programa.programa.nome
              : dados?.proposta
                ? 'Proposta aguardando aprovação'
                : dados?.gym
                  ? 'Gerar proposta de treino'
                  : 'Cadastre a academia para gerar'}
          </span>
          {dados?.programa && (
            <span className="text-sm text-neutral-400">
              Bloco {dados.programa.mesociclo.numero} · {dados.programa.mesociclo.semanas} semanas
            </span>
          )}
        </button>
      )}

      {anamnese && anamnese.clearance_status !== 'orientar_avaliacao' && (
        <button
          type="button"
          onClick={() => onIr('/avaliacao')}
          className="flex flex-col gap-1 rounded-2xl bg-neutral-900 p-4 text-left active:bg-neutral-800"
        >
          <span className="text-sm text-neutral-400">Sua avaliação</span>
          <span className="text-lg font-semibold">
            {ROTULO_NIVEL[anamnese.nivel]} · {ROTULO_OBJETIVO[anamnese.objetivo]}
          </span>
          <span className="text-sm text-neutral-400">
            {anamnese.constraints.length === 0
              ? 'Sem restrições'
              : `${anamnese.constraints.length} ${anamnese.constraints.length === 1 ? 'restrição' : 'restrições'}`}
          </span>
        </button>
      )}

      {anamnese && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onIr('/medidas')}
            className="flex min-h-24 flex-col justify-between rounded-2xl bg-neutral-900 p-4 text-left active:bg-neutral-800"
          >
            <span className="text-sm text-neutral-400">Medidas</span>
            <span className="text-xl font-semibold">{dados?.medida ? `${num(dados.medida.peso_kg)} kg` : '—'}</span>
          </button>
          <button
            type="button"
            onClick={() => onIr('/nutricao')}
            className="flex min-h-24 flex-col justify-between rounded-2xl bg-neutral-900 p-4 text-left active:bg-neutral-800"
          >
            <span className="text-sm text-neutral-400">Nutrição</span>
            <span className="text-xl font-semibold">{dados?.meta ? `${dados.meta.kcal_alvo} kcal` : '—'}</span>
          </button>
        </div>
      )}

      {dados && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onIr('/academias')}
            className="flex min-h-24 flex-col justify-between rounded-2xl bg-neutral-900 p-4 text-left active:bg-neutral-800"
          >
            <span className="text-sm text-neutral-400">Academia</span>
            <span className="truncate text-lg font-semibold">{dados.gym?.nome ?? 'Cadastrar'}</span>
          </button>
          <button
            type="button"
            onClick={() => onIr('/exercicios')}
            className="flex min-h-24 flex-col justify-between rounded-2xl bg-neutral-900 p-4 text-left active:bg-neutral-800"
          >
            <span className="text-sm text-neutral-400">Exercícios</span>
            <span className="text-lg font-semibold">Catálogo</span>
          </button>
        </div>
      )}

      {!!dados?.pendentes && (
        <p className="text-sm text-neutral-500">
          {dados.pendentes} {dados.pendentes === 1 ? 'registro aguardando' : 'registros aguardando'} envio
          {online ? '…' : ' (sem sinal).'}
        </p>
      )}

      <div className="mt-auto">
        <Button variante="secundario" onClick={() => void onSair()}>
          Sair
        </Button>
      </div>
    </main>
  )
}
