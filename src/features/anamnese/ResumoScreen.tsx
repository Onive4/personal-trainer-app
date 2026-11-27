import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { restricoesDasLesoes } from '../../engine/anamnese'
import { Button } from '../../ui/Button'
import { TextField } from '../../ui/TextField'
import { Tela } from '../../ui/Tela'
import { formatarData, hojeSP } from '../../ui/datas'
import { anamneseAtual, registrarLiberacao } from '../perfil/registros'
import { PERGUNTA_ALERTA, ROTULO_CONSTRAINT, ROTULO_NIVEL, ROTULO_OBJETIVO, MUSCULOS } from './rotulos'

interface Props {
  userId: string
  onVoltar: () => void
  onRefazer: () => void
  onNutricao: () => void
}

const LINK_PARQ = 'https://eparmedx.com/'

export function ResumoScreen({ userId, onVoltar, onRefazer, onNutricao }: Props) {
  const anamnese = useLiveQuery(() => anamneseAtual(userId), [userId])
  if (!anamnese) return null

  const r = anamnese.respostas
  const sinais = (Object.keys(r.alerta) as (keyof typeof r.alerta)[]).filter((s) => r.alerta[s])

  if (anamnese.clearance_status === 'orientar_avaliacao') {
    return (
      <Tela titulo="Antes de começar" onVoltar={onVoltar}>
        <p className="text-neutral-200">
          Você respondeu "sim" a {sinais.length === 1 ? 'uma pergunta' : `${sinais.length} perguntas`} de alerta.
          Isso não quer dizer que exista um problema, mas é prudente conversar com um médico antes de iniciar um
          programa de treino. Por isso o app não monta o seu treino nem a meta de calorias por enquanto.
        </p>
        <ul className="flex flex-col gap-2">
          {sinais.map((s) => (
            <li key={s} className="rounded-xl border border-neutral-800 p-3 text-sm text-neutral-300">
              {PERGUNTA_ALERTA[s]}
            </li>
          ))}
        </ul>
        <p className="text-sm text-neutral-400">
          Se o médico quiser um questionário formal, o PAR-Q+ oficial está em{' '}
          <a className="text-orange-400 underline" href={LINK_PARQ} target="_blank" rel="noreferrer">
            eparmedx.com
          </a>
          .
        </p>
        <RegistroLiberacao onRegistrar={(data, profissional) =>
          registrarLiberacao(userId, anamnese, { data, profissional, registrado_em: new Date().toISOString() })
        } />
        <Button variante="secundario" onClick={onRefazer}>
          Revisar minhas respostas
        </Button>
      </Tela>
    )
  }

  const restricoes = restricoesDasLesoes(r.lesoes)
  const familiar = [
    r.familiar.cardiovascular_precoce && 'doença do coração precoce',
    r.familiar.diabetes && 'diabetes',
    r.familiar.hipertensao && 'pressão alta',
  ].filter(Boolean)
  const prioritarios = r.objetivo.musculos_prioritarios.map((m) => MUSCULOS.find((x) => x.valor === m)?.rotulo ?? m)

  return (
    <Tela titulo="Sua avaliação" onVoltar={onVoltar}>
      <p className="text-sm text-neutral-400">
        Questionário respondido em {formatarData(anamnese.data)}
        {anamnese.liberacao &&
          ` · liberação de ${anamnese.liberacao.profissional} em ${formatarData(anamnese.liberacao.data)}`}
      </p>

      <dl className="grid grid-cols-2 gap-3">
        <Item rotulo="Nível" valor={ROTULO_NIVEL[anamnese.nivel]} />
        <Item rotulo="Objetivo" valor={ROTULO_OBJETIVO[anamnese.objetivo]} />
        <Item rotulo="Treinos por semana" valor={`${r.contexto.dias_semana} × ${r.contexto.minutos_sessao} min`} />
        <Item rotulo="Prioridade" valor={prioritarios.length ? prioritarios.join(', ') : 'Equilibrado'} />
      </dl>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Cuidados no seu treino</h2>
        {restricoes.length === 0 ? (
          <p className="text-neutral-300">Nenhuma. Todos os exercícios do catálogo podem entrar.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {restricoes.map(({ constraint, motivo }) => (
              <li key={constraint} className="rounded-xl border border-neutral-800 p-3">
                <p className="text-neutral-100">{ROTULO_CONSTRAINT[constraint]}</p>
                <p className="text-sm text-neutral-400">Por causa de: {motivo}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-neutral-400">Exercícios que forçam esses pontos ficam fora do seu treino.</p>
      </section>

      {familiar.length > 0 && (
        <p className="rounded-xl border border-neutral-800 p-3 text-sm text-neutral-300">
          Histórico familiar de {familiar.join(', ')}. Vale manter os exames de rotina em dia.
        </p>
      )}

      <div className="mt-auto flex flex-col gap-2">
        <Button onClick={onNutricao}>Ver metas de nutrição</Button>
        <Button variante="secundario" onClick={onRefazer}>
          Refazer questionário
        </Button>
      </div>
    </Tela>
  )
}

function Item({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl bg-neutral-900 p-3">
      <dt className="text-sm text-neutral-400">{rotulo}</dt>
      <dd className="text-lg font-semibold">{valor}</dd>
    </div>
  )
}

function RegistroLiberacao({ onRegistrar }: { onRegistrar: (data: string, profissional: string) => Promise<unknown> }) {
  const [aberto, setAberto] = useState(false)
  const [data, setData] = useState('')
  const [profissional, setProfissional] = useState('')
  const [confirmo, setConfirmo] = useState(false)
  const pronto = /^\d{4}-\d{2}-\d{2}$/.test(data) && profissional.trim().length >= 3 && confirmo

  if (!aberto) {
    return (
      <Button variante="secundario" onClick={() => setAberto(true)}>
        Já tenho liberação médica
      </Button>
    )
  }
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-800 p-3">
      <h2 className="text-lg font-semibold">Registrar liberação</h2>
      <TextField label="Data da liberação" type="date" max={hojeSP()} value={data} onChange={(e) => setData(e.target.value)} />
      <TextField
        label="Profissional"
        placeholder="Nome e especialidade"
        value={profissional}
        onChange={(e) => setProfissional(e.target.value)}
      />
      <label className="flex min-h-12 items-center gap-3 text-neutral-200">
        <input type="checkbox" className="size-6 accent-orange-500" checked={confirmo} onChange={(e) => setConfirmo(e.target.checked)} />
        Confirmo que fui liberado(a) por um médico para treinar musculação.
      </label>
      <Button disabled={!pronto} onClick={() => void onRegistrar(data, profissional.trim())}>
        Registrar e liberar o treino
      </Button>
    </section>
  )
}
