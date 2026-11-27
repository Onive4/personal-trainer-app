import { useDeferredValue, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { buscar, conflitos, disponivelNa, type Exercicio } from '../../engine/catalogo'
import { Tela } from '../../ui/Tela'
import { TextField } from '../../ui/TextField'
import { MUSCULOS } from '../anamnese/rotulos'
import { anamneseAtual } from '../perfil/registros'
import { academiaAtiva } from '../academias/registros'
import { rotuloEquipamento } from '../academias/equipamentos'
import { useCatalogo } from './useCatalogo'
import { rotuloMusculo } from './rotulos'

interface Props {
  userId: string
  onVoltar: () => void
  onAbrir: (slug: string) => void
}

/** Busca e filtro guardados na memória: voltar do detalhe mantém a lista. */
const estado = { termo: '', musculo: null as string | null }

export function ExerciciosScreen({ userId, onVoltar, onAbrir }: Props) {
  const catalogo = useCatalogo()
  const contexto = useLiveQuery(async () => {
    const [anamnese, gym] = await Promise.all([anamneseAtual(userId), academiaAtiva(userId)])
    return { constraints: anamnese?.constraints ?? [], gym }
  }, [userId])
  const [termo, setTermo] = useState(estado.termo)
  const [musculo, setMusculo] = useState(estado.musculo)
  const termoAdiado = useDeferredValue(termo)

  const lista = useMemo(
    () => (catalogo ? buscar(catalogo, termoAdiado, musculo) : []),
    [catalogo, termoAdiado, musculo],
  )

  return (
    <Tela titulo="Exercícios" onVoltar={onVoltar}>
      <TextField
        label="Buscar"
        type="search"
        placeholder="Ex.: supino, agachamento, rosca"
        value={termo}
        onChange={(e) => {
          setTermo(e.target.value)
          estado.termo = e.target.value
        }}
      />
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {[{ valor: null as string | null, rotulo: 'Todos' }, { valor: 'cardio', rotulo: 'Aeróbico' }, ...MUSCULOS].map((m) => (
          <button
            key={m.valor ?? 'todos'}
            type="button"
            aria-pressed={musculo === m.valor}
            onClick={() => {
              setMusculo(m.valor)
              estado.musculo = m.valor
            }}
            className={`min-h-12 shrink-0 rounded-full border px-4 ${
              musculo === m.valor ? 'border-orange-500 bg-orange-500/15 text-orange-200' : 'border-neutral-800 bg-neutral-900'
            }`}
          >
            {m.rotulo}
          </button>
        ))}
      </div>

      {contexto && !contexto.gym && (
        <p className="text-sm text-neutral-400">Cadastre uma academia para ver o que está disponível nela.</p>
      )}

      <p className="text-sm text-neutral-500">{catalogo ? `${lista.length} exercícios` : 'Carregando catálogo…'}</p>
      <ul className="flex flex-col gap-2">
        {lista.map((e) => (
          <Item
            key={e.slug}
            e={e}
            semEquipamento={!!contexto?.gym && !disponivelNa(e, contexto.gym.equipamentos)}
            conflita={conflitos(e, contexto?.constraints ?? []).length > 0}
            onAbrir={() => onAbrir(e.slug)}
          />
        ))}
      </ul>
    </Tela>
  )
}

function Item({ e, semEquipamento, conflita, onAbrir }: { e: Exercicio; semEquipamento: boolean; conflita: boolean; onAbrir: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onAbrir}
        className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-2 text-left active:bg-neutral-900"
      >
        <img
          src={e.imagens[0]}
          alt=""
          loading="lazy"
          className="size-14 shrink-0 rounded-lg bg-neutral-800 object-cover"
        />
        <span className="flex min-w-0 flex-col">
          <span className={`font-medium ${semEquipamento || conflita ? 'text-neutral-400' : ''}`}>{e.nome_pt}</span>
          <span className="truncate text-sm text-neutral-500">
            {rotuloMusculo(e.musculo_primario)} · {rotuloEquipamento(e.equipamento)}
          </span>
          {(conflita || semEquipamento) && (
            <span className="text-sm text-amber-300">
              {conflita ? 'Não indicado pela sua avaliação' : 'Sua academia não tem o aparelho'}
            </span>
          )}
        </span>
      </button>
    </li>
  )
}
