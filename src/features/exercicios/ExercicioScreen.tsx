import { useLiveQuery } from 'dexie-react-hooks'
import { conflitos, disponivelNa } from '../../engine/catalogo'
import { alternativas, type Alternativa } from '../../engine/substitution'
import { Button } from '../../ui/Button'
import { Tela } from '../../ui/Tela'
import { ROTULO_CONSTRAINT } from '../anamnese/rotulos'
import { anamneseAtual } from '../perfil/registros'
import { academiaAtiva } from '../academias/registros'
import { rotuloEquipamento } from '../academias/equipamentos'
import { useCatalogo } from './useCatalogo'
import { ROTULO_NIVEL_EX, rotuloMusculo } from './rotulos'

interface Props {
  userId: string
  slug: string
  onVoltar: () => void
  onAbrir: (slug: string) => void
  onAcademias: () => void
}

const AVISO_TIPO: Record<Alternativa['tipo'], string | null> = {
  mesmo_padrao: null,
  outro_padrao: 'Muda o padrão do movimento',
  musculo_secundario: `Trabalha o músculo como secundário`,
}

export function ExercicioScreen({ userId, slug, onVoltar, onAbrir, onAcademias }: Props) {
  const catalogo = useCatalogo()
  const contexto = useLiveQuery(async () => {
    const [anamnese, gym] = await Promise.all([anamneseAtual(userId), academiaAtiva(userId)])
    return { anamnese, gym }
  }, [userId])

  if (!catalogo || !contexto) return null
  const e = catalogo.find((x) => x.slug === slug)
  if (!e) {
    return (
      <Tela titulo="Exercício" onVoltar={onVoltar}>
        <p className="text-neutral-300">Exercício não encontrado.</p>
      </Tela>
    )
  }

  const { anamnese, gym } = contexto
  const constraints = anamnese?.constraints ?? []
  const contra = conflitos(e, constraints)
  const alts = gym
    ? alternativas(e, catalogo, { equipamentos: gym.equipamentos, constraints, nivel: anamnese?.nivel ?? 'iniciante' })
    : []

  return (
    <Tela titulo={e.nome_pt} onVoltar={onVoltar}>
      <div className="grid grid-cols-2 gap-2">
        {e.imagens.slice(0, 2).map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`${e.nome_pt}, posição ${i + 1}`}
            className="aspect-square w-full rounded-xl bg-neutral-800 object-cover"
          />
        ))}
      </div>
      <p className="-mt-3 text-xs text-neutral-500">Imagens: free-exercise-db (domínio público)</p>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <Info rotulo="Músculo" valor={rotuloMusculo(e.musculo_primario)} />
        <Info rotulo={e.padrao_movimento === 'aerobico' ? 'Tipo' : 'Aparelho'} valor={e.padrao_movimento === 'aerobico' ? 'Aeróbico' : rotuloEquipamento(e.equipamento)} />
        <Info rotulo="Nível" valor={`${ROTULO_NIVEL_EX[e.nivel] ?? e.nivel}${e.unilateral ? ' · unilateral' : ''}`} />
      </dl>
      {e.musculos_secundarios.length > 0 && (
        <p className="text-sm text-neutral-400">Também trabalha: {e.musculos_secundarios.map(rotuloMusculo).join(', ')}</p>
      )}

      {contra.length > 0 && (
        <div className="rounded-xl border border-amber-700 p-3 text-sm">
          <p className="font-semibold text-amber-300">Não indicado pela sua avaliação</p>
          <ul className="mt-1 list-disc pl-5 text-neutral-300">
            {contra.map((c) => (
              <li key={c}>{ROTULO_CONSTRAINT[c]}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Como fazer</h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-neutral-200">
          {e.instrucoes_pt.map((passo) => (
            <li key={passo}>{passo}</li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Alternativas{gym ? ` em ${gym.nome}` : ''}</h2>
        {!gym ? (
          <>
            <p className="text-neutral-400">Cadastre a academia para ver alternativas com o equipamento que ela tem.</p>
            <Button variante="secundario" onClick={onAcademias}>
              Cadastrar academia
            </Button>
          </>
        ) : (
          <>
            <p className={`text-sm ${disponivelNa(e, gym.equipamentos) ? 'text-emerald-300' : 'text-amber-300'}`}>
              {disponivelNa(e, gym.equipamentos)
                ? 'Este exercício tem equipamento na academia ativa.'
                : 'A academia ativa não tem o equipamento deste exercício.'}
            </p>
            {alts.length === 0 && (
              <p className="text-neutral-400">Nenhuma alternativa com o equipamento marcado nesta academia.</p>
            )}
            <ul className="flex flex-col gap-2">
              {alts.map((a) => (
                <li key={a.exercicio.slug}>
                  <button
                    type="button"
                    onClick={() => onAbrir(a.exercicio.slug)}
                    className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-2 text-left active:bg-neutral-900"
                  >
                    <img src={a.exercicio.imagens[0]} alt="" loading="lazy" className="size-14 shrink-0 rounded-lg bg-neutral-800 object-cover" />
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium">{a.exercicio.nome_pt}</span>
                      <span className="truncate text-sm text-neutral-500">{rotuloEquipamento(a.exercicio.equipamento)}</span>
                      {AVISO_TIPO[a.tipo] && <span className="text-sm text-amber-300">{AVISO_TIPO[a.tipo]}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </Tela>
  )
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl bg-neutral-900 p-3">
      <dt className="text-neutral-400">{rotulo}</dt>
      <dd className="font-semibold">{valor}</dd>
    </div>
  )
}
