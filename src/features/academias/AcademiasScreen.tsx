import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Gym } from '../../db/schema'
import { Button } from '../../ui/Button'
import { TextField } from '../../ui/TextField'
import { Tela } from '../../ui/Tela'
import { CATEGORIAS, ROTULO_CATEGORIA, rotuloEquipamento } from './equipamentos'
import { academias, ativarAcademia, criarAcademia, salvarAcademia } from './registros'

interface Props {
  userId: string
  onVoltar: () => void
}

export function AcademiasScreen({ userId, onVoltar }: Props) {
  const lista = useLiveQuery(() => academias(userId), [userId])
  const [editando, setEditando] = useState<Gym | null>(null)
  const [nova, setNova] = useState('')

  if (editando) return <EditarAcademia gym={editando} onFechar={() => setEditando(null)} />

  const criar = async () => {
    if (!nova.trim()) return
    const gym = await criarAcademia(userId, nova)
    setNova('')
    setEditando(gym)
  }

  return (
    <Tela titulo="Academias" onVoltar={onVoltar}>
      <p className="text-neutral-300">
        O app só sugere exercícios com o equipamento que existe na academia ativa.
      </p>

      <ul className="flex flex-col gap-3">
        {lista?.map((g) => (
          <li key={g.id} className={`rounded-2xl border p-4 ${g.ativa ? 'border-orange-500' : 'border-neutral-800'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-lg font-semibold">{g.nome}</p>
                <p className="text-sm text-neutral-400">
                  {g.equipamentos.filter((e) => e !== 'peso_corporal').length} equipamentos marcados
                </p>
              </div>
              {g.ativa && <span className="rounded-full bg-orange-500 px-3 py-1 text-sm font-semibold text-black">Ativa</span>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variante="secundario" onClick={() => setEditando(g)}>
                Equipamentos
              </Button>
              {!g.ativa && (
                <Button variante="secundario" onClick={() => void ativarAcademia(userId, g.id)}>
                  Usar esta
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-3 rounded-2xl bg-neutral-900 p-4">
        <TextField
          label={lista?.length ? 'Outra academia' : 'Nome da sua academia'}
          placeholder="Ex.: Smart Fit Centro"
          maxLength={60}
          value={nova}
          onChange={(e) => setNova(e.target.value)}
        />
        <Button onClick={() => void criar()} disabled={!nova.trim()}>
          Cadastrar e marcar equipamentos
        </Button>
      </section>
    </Tela>
  )
}

function EditarAcademia({ gym, onFechar }: { gym: Gym; onFechar: () => void }) {
  const [nome, setNome] = useState(gym.nome)
  const [marcados, setMarcados] = useState(() => new Set([...gym.equipamentos, 'peso_corporal']))

  const alternar = (k: string) => {
    if (k === 'peso_corporal') return
    const s = new Set(marcados)
    if (s.has(k)) s.delete(k)
    else s.add(k)
    setMarcados(s)
  }
  const categoriaInteira = (chaves: string[], marcar: boolean) => {
    const s = new Set(marcados)
    for (const k of chaves) if (k !== 'peso_corporal') marcar ? s.add(k) : s.delete(k)
    setMarcados(s)
  }

  const salvar = async () => {
    await salvarAcademia(gym, { nome: nome.trim() || gym.nome, equipamentos: [...marcados] })
    onFechar()
  }

  return (
    <Tela
      titulo="Equipamentos"
      onVoltar={onFechar}
      rodape={<Button onClick={() => void salvar()}>Salvar ({marcados.size - 1} marcados)</Button>}
    >
      <TextField label="Nome" maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} />
      <p className="text-sm text-neutral-400">
        Marque o que existe na academia. Itens como "supino reto com barra" são a estação completa (banco + suporte +
        barra).
      </p>
      {CATEGORIAS.map(([categoria, itens]) => {
        const chaves = itens.map((i) => i.chave)
        const todos = chaves.every((k) => marcados.has(k))
        return (
          <section key={categoria} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{ROTULO_CATEGORIA[categoria] ?? categoria}</h2>
              <button
                type="button"
                onClick={() => categoriaInteira(chaves, !todos)}
                className="min-h-12 px-2 text-orange-400 active:underline"
              >
                {todos ? 'Desmarcar todos' : 'Marcar todos'}
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {chaves.map((k) => {
                const on = marcados.has(k)
                const fixo = k === 'peso_corporal'
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    disabled={fixo}
                    onClick={() => alternar(k)}
                    className={`flex min-h-12 items-center gap-3 rounded-xl border px-4 text-left ${
                      on ? 'border-orange-500 bg-orange-500/15 text-orange-100' : 'border-neutral-800 bg-neutral-900'
                    } ${fixo ? 'opacity-70' : ''}`}
                  >
                    <span
                      aria-hidden
                      className={`flex size-6 shrink-0 items-center justify-center rounded-md border text-sm ${
                        on ? 'border-orange-500 bg-orange-500 text-black' : 'border-neutral-600'
                      }`}
                    >
                      {on ? '✓' : ''}
                    </span>
                    {rotuloEquipamento(k)}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </Tela>
  )
}
