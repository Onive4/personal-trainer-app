import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Gym } from '../../db/schema'
import { Button } from '../../ui/Button'
import { TextField } from '../../ui/TextField'
import { Tela } from '../../ui/Tela'
import { CATEGORIAS, ROTULO_CATEGORIA, rotuloEquipamento } from './equipamentos'
import { academias, ativarAcademia, criarAcademia, salvarAcademia } from './registros'
import { buscarAcademiasProximas, minhaPosicao, textoDistancia, type AcademiaProxima, type ErroBusca } from './buscarProximas'

const MENSAGEM_ERRO: Record<ErroBusca, string> = {
  sem_permissao: 'O celular não deu acesso à localização. Libere nas configurações do navegador ou digite o nome abaixo.',
  sem_gps: 'Não deu para pegar sua localização agora. Tente de novo ou digite o nome abaixo.',
  sem_rede: 'Sem internet para buscar. Digite o nome abaixo e marque os aparelhos.',
  falhou: 'O serviço de mapas não respondeu. Tente de novo em instantes ou digite o nome abaixo.',
}

interface Props {
  userId: string
  onVoltar: () => void
}

export function AcademiasScreen({ userId, onVoltar }: Props) {
  const lista = useLiveQuery(() => academias(userId), [userId])
  const [editando, setEditando] = useState<Gym | null>(null)
  const [nova, setNova] = useState('')
  const [busca, setBusca] = useState<{ estado: 'parado' | 'buscando' } | { estado: 'pronto'; lista: AcademiaProxima[] } | { estado: 'erro'; erro: ErroBusca }>({ estado: 'parado' })

  const buscar = async () => {
    setBusca({ estado: 'buscando' })
    try {
      const { latitude, longitude } = await minhaPosicao()
      setBusca({ estado: 'pronto', lista: await buscarAcademiasProximas(latitude, longitude) })
    } catch (e) {
      setBusca({ estado: 'erro', erro: (typeof e === 'string' ? e : 'falhou') as ErroBusca })
    }
  }
  const escolher = async (nome: string) => {
    const gym = await criarAcademia(userId, nome)
    setBusca({ estado: 'parado' })
    setEditando(gym)
  }

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
        O treino só usa aparelhos que existem na sua academia.
      </p>

      <ul className="flex flex-col gap-3">
        {lista?.map((g) => (
          <li key={g.id} className={`rounded-2xl border p-4 ${g.ativa ? 'border-orange-500' : 'border-neutral-800'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-lg font-semibold">{g.nome}</p>
                <p className="text-sm text-neutral-400">
                  {g.equipamentos.filter((e) => e !== 'peso_corporal').length} aparelhos marcados
                </p>
              </div>
              {g.ativa && <span className="rounded-full bg-orange-500 px-3 py-1 text-sm font-semibold text-black">Em uso</span>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variante="secundario" onClick={() => setEditando(g)}>
                Aparelhos
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
        <h2 className="text-lg font-semibold">{lista?.length ? 'Adicionar outra academia' : 'Qual é a sua academia?'}</h2>
        <Button onClick={() => void buscar()} disabled={busca.estado === 'buscando'}>
          {busca.estado === 'buscando' ? 'Procurando perto de você… (até uns 8 segundos)' : 'Buscar academias perto de mim'}
        </Button>
        <p className="text-xs text-neutral-500">
          Usa sua localização só nesta busca, pelo mapa gratuito OpenStreetMap. Nada fica guardado.
        </p>
        {busca.estado === 'erro' && <p className="text-sm text-amber-300">{MENSAGEM_ERRO[busca.erro]}</p>}
        {busca.estado === 'pronto' && busca.lista.length === 0 && (
          <p className="text-sm text-amber-300">Nenhuma academia encontrada perto daqui no mapa. Digite o nome abaixo.</p>
        )}
        {busca.estado === 'pronto' && busca.lista.length > 0 && (
          <ul className="flex flex-col gap-2">
            {busca.lista.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => void escolher(a.nome)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-black px-3 py-2 text-left active:bg-neutral-800"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{a.nome}</span>
                    {a.endereco && <span className="block truncate text-xs text-neutral-500">{a.endereco}</span>}
                  </span>
                  <span className="shrink-0 text-sm text-neutral-400">{textoDistancia(a.distancia_m)}</span>
                </button>
              </li>
            ))}
            <li className="text-xs text-neutral-500">Não achou a sua? Digite o nome abaixo.</li>
          </ul>
        )}
        <TextField
          label="Ou digite o nome"
          placeholder="Ex.: Smart Fit Centro"
          maxLength={60}
          value={nova}
          onChange={(e) => setNova(e.target.value)}
        />
        <Button onClick={() => void criar()} disabled={!nova.trim()}>
          Cadastrar e marcar aparelhos
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
      titulo="Aparelhos"
      onVoltar={onFechar}
      rodape={<Button onClick={() => void salvar()}>Salvar ({marcados.size - 1} marcados)</Button>}
    >
      <TextField label="Nome" maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} />
      <p className="text-sm text-neutral-400">
        Marque o que existe na sua academia. Academia grande costuma ter quase tudo: use "Marcar tudo" e desmarque o que
        faltar.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button variante="secundario" onClick={() => categoriaInteira(CATEGORIAS.flatMap(([, i]) => i.map((x) => x.chave)), true)}>
          Marcar tudo
        </Button>
        <Button variante="secundario" onClick={() => categoriaInteira(CATEGORIAS.flatMap(([, i]) => i.map((x) => x.chave)), false)}>
          Desmarcar tudo
        </Button>
      </div>
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
