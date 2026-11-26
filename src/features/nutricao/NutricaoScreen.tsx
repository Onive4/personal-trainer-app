import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { ajusteAdaptativo, mediaMovel7 } from '../../engine/nutrition'
import { Button } from '../../ui/Button'
import { AvisoEstimativa, Tela } from '../../ui/Tela'
import { formatarData, hojeSP, num } from '../../ui/datas'
import { ROTULO_OBJETIVO } from '../anamnese/rotulos'
import { aplicarAjuste, anamneseAtual, metaAtual } from '../perfil/registros'

interface Props {
  userId: string
  onVoltar: () => void
  onAnamnese: () => void
}

export function NutricaoScreen({ userId, onVoltar, onAnamnese }: Props) {
  const dados = useLiveQuery(async () => {
    const [anamnese, meta, metas, medidas] = await Promise.all([
      anamneseAtual(userId),
      metaAtual(userId),
      db.nutrition_targets.where('profile_id').equals(userId).toArray(),
      db.measurements.where('profile_id').equals(userId).toArray(),
    ])
    return { anamnese, meta, metas, medidas }
  }, [userId])
  if (!dados) return null
  const { anamnese, meta, metas, medidas } = dados

  if (!meta) {
    return (
      <Tela titulo="Nutrição" onVoltar={onVoltar}>
        <p className="text-neutral-300">
          {anamnese?.clearance_status === 'orientar_avaliacao'
            ? 'A meta de calorias fica bloqueada até a liberação médica ser registrada.'
            : 'Complete a anamnese para calcular sua meta.'}
        </p>
        <Button onClick={onAnamnese}>{anamnese ? 'Ver avaliação' : 'Fazer anamnese'}</Button>
      </Tela>
    )
  }

  const hoje = hojeSP()
  const pesagens = medidas.map((m) => ({ data: m.data, peso_kg: m.peso_kg }))
  const media = mediaMovel7(pesagens, hoje)
  const pesoAtual = media ?? [...medidas].sort((a, b) => a.data.localeCompare(b.data)).at(-1)?.peso_kg ?? 0
  const ajuste = ajusteAdaptativo({ objetivo: meta.objetivo, kcal_atual: meta.kcal_alvo, tmb: meta.tmb, pesagens, hoje })
  // Só propõe de novo depois de 2 semanas da última meta.
  const diasDaMeta = (Date.parse(hoje) - Date.parse(meta.data)) / 86_400_000
  const ultimaBf = [...medidas].filter((m) => m.bf_estimado !== null).sort((a, b) => a.data.localeCompare(b.data)).at(-1)
  const historico = [...metas].sort((a, b) => b.created_at.localeCompare(a.created_at))

  return (
    <Tela titulo="Nutrição" onVoltar={onVoltar}>
      <AvisoEstimativa />

      <section className="rounded-2xl bg-neutral-900 p-4">
        <p className="text-sm text-neutral-400">Meta diária estimada · {ROTULO_OBJETIVO[meta.objetivo]}</p>
        <p className="text-4xl font-bold text-orange-400">{meta.kcal_alvo} kcal</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Macro rotulo="Proteína" g={meta.proteina_g} />
          <Macro rotulo="Gordura" g={meta.gordura_g} />
          <Macro rotulo="Carboidrato" g={meta.carbo_g} />
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Info rotulo="Gasto basal" valor={`${meta.tmb} kcal`} />
        <Info rotulo="Gasto total" valor={`${meta.tdee} kcal`} />
        <Info
          rotulo="Ritmo de peso alvo"
          valor={meta.peso_alvo_semana_pct === 0 ? 'Manter' : `${meta.peso_alvo_semana_pct > 0 ? '+' : ''}${num(meta.peso_alvo_semana_pct, 2)}% por semana`}
        />
        <Info rotulo="Gordura estimada" valor={ultimaBf ? `${num(ultimaBf.bf_estimado!)}%` : 'Sem medidas'} />
      </dl>

      {ajuste && diasDaMeta >= 14 && (
        <section className="flex flex-col gap-3 rounded-xl border border-orange-500/50 p-3">
          <h2 className="text-lg font-semibold">Ajuste sugerido</h2>
          <p className="text-neutral-300">{ajuste.motivo}</p>
          <Button onClick={() => void aplicarAjuste(meta, ajuste, pesoAtual)}>
            Aplicar {ajuste.kcal_nova} kcal
          </Button>
        </section>
      )}

      <p className="text-sm text-neutral-400">
        Pese-se de manhã, em jejum, pelo menos 3 vezes por semana. Com 3 semanas de pesagens o app compara a
        média real com o ritmo alvo e sugere ajuste de 10% quando precisar.
        {media !== null && ` Média dos últimos 7 dias: ${num(media)} kg.`}
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Histórico de metas</h2>
        <ul className="flex flex-col gap-2">
          {historico.map((m) => (
            <li key={m.id} className="rounded-xl border border-neutral-800 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-400">{formatarData(m.data)}</span>
                <span className="font-semibold">{m.kcal_alvo} kcal</span>
              </div>
              <p className="text-neutral-400">{m.motivo}</p>
            </li>
          ))}
        </ul>
      </section>
    </Tela>
  )
}

function Macro({ rotulo, g }: { rotulo: string; g: number }) {
  return (
    <div className="rounded-xl bg-black p-2">
      <p className="text-xl font-semibold">{g} g</p>
      <p className="text-xs text-neutral-400">{rotulo}</p>
    </div>
  )
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 p-3">
      <dt className="text-neutral-400">{rotulo}</dt>
      <dd className="text-base font-semibold">{valor}</dd>
    </div>
  )
}
