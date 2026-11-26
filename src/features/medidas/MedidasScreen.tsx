import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Measurement } from '../../db/schema'
import { Button } from '../../ui/Button'
import { NumberField } from '../../ui/NumberField'
import { TextField } from '../../ui/TextField'
import { AvisoEstimativa, Tela } from '../../ui/Tela'
import { formatarData, hojeSP, num } from '../../ui/datas'
import { registrarMedida, type CamposMedida } from '../perfil/registros'

type Circ = 'pescoco' | 'cintura' | 'quadril' | 'torax' | 'braco_d' | 'braco_e' | 'coxa_d' | 'coxa_e' | 'panturrilha'

const CIRCUNFERENCIAS: { campo: Circ; rotulo: string; dica: string }[] = [
  { campo: 'pescoco', rotulo: 'Pescoço', dica: 'logo abaixo do pomo de adão' },
  { campo: 'cintura', rotulo: 'Cintura', dica: 'na altura do umbigo, sem encolher a barriga' },
  { campo: 'quadril', rotulo: 'Quadril', dica: 'na parte mais larga do bumbum' },
  { campo: 'torax', rotulo: 'Tórax', dica: 'na linha dos mamilos' },
  { campo: 'braco_d', rotulo: 'Braço direito', dica: 'meio do braço, relaxado' },
  { campo: 'braco_e', rotulo: 'Braço esquerdo', dica: 'meio do braço, relaxado' },
  { campo: 'coxa_d', rotulo: 'Coxa direita', dica: 'meio da coxa' },
  { campo: 'coxa_e', rotulo: 'Coxa esquerda', dica: 'meio da coxa' },
  { campo: 'panturrilha', rotulo: 'Panturrilha', dica: 'parte mais grossa' },
]

const vazio = (): CamposMedida => ({
  data: hojeSP(),
  peso_kg: 0,
  pescoco: null,
  cintura: null,
  quadril: null,
  torax: null,
  braco_d: null,
  braco_e: null,
  coxa_d: null,
  coxa_e: null,
  panturrilha: null,
})

export function MedidasScreen({ userId, onVoltar }: { userId: string; onVoltar: () => void }) {
  const historico = useLiveQuery(
    async () =>
      (await db.measurements.where('profile_id').equals(userId).toArray()).sort((a, b) =>
        (b.data + b.created_at).localeCompare(a.data + a.created_at),
      ),
    [userId],
  )
  const [lancando, setLancando] = useState(false)

  if (lancando) {
    return <NovaMedida userId={userId} onFechar={() => setLancando(false)} />
  }

  return (
    <Tela titulo="Medidas" onVoltar={onVoltar}>
      <Button onClick={() => setLancando(true)}>Registrar medidas de hoje</Button>
      {historico && historico.length === 0 && (
        <p className="text-neutral-400">Nenhuma medida ainda. O peso da anamnese aparece aqui.</p>
      )}
      <ul className="flex flex-col gap-2">
        {historico?.map((m) => <LinhaMedida key={m.id} m={m} />)}
      </ul>
      <AvisoEstimativa>
        O percentual de gordura vem da fórmula da Marinha dos EUA (pescoço, cintura e, para mulheres, quadril).
        É uma estimativa com margem de alguns pontos; serve para acompanhar a tendência, não como diagnóstico.
      </AvisoEstimativa>
    </Tela>
  )
}

function LinhaMedida({ m }: { m: Measurement }) {
  const extras = CIRCUNFERENCIAS.filter((c) => m[c.campo] !== null)
  return (
    <li className="rounded-xl border border-neutral-800 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-neutral-400">{formatarData(m.data)}</span>
        <span className="text-xl font-semibold">{num(m.peso_kg)} kg</span>
      </div>
      {m.bf_estimado !== null && <p className="text-orange-300">Gordura estimada: {num(m.bf_estimado)}%</p>}
      {extras.length > 0 && (
        <p className="mt-1 text-sm text-neutral-400">
          {extras.map((c) => `${c.rotulo} ${num(m[c.campo]!)}`).join(' · ')} cm
        </p>
      )}
    </li>
  )
}

function NovaMedida({ userId, onFechar }: { userId: string; onFechar: () => void }) {
  const [campos, setCampos] = useState<CamposMedida>(vazio)
  const [erro, setErro] = useState<string | null>(null)
  const muda = (p: Partial<CamposMedida>) => {
    setCampos({ ...campos, ...p })
    setErro(null)
  }

  const salvar = async () => {
    if (!campos.peso_kg || campos.peso_kg < 30 || campos.peso_kg > 300) return setErro('Informe o peso em quilos.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(campos.data) || campos.data > hojeSP()) return setErro('Confira a data.')
    await registrarMedida(userId, campos)
    onFechar()
  }

  return (
    <Tela
      titulo="Novas medidas"
      onVoltar={onFechar}
      rodape={
        <div className="flex flex-col gap-2">
          {erro && <p role="alert" className="text-sm text-orange-300">{erro}</p>}
          <Button onClick={() => void salvar()}>Salvar</Button>
        </div>
      }
    >
      <TextField label="Data" type="date" max={hojeSP()} value={campos.data} onChange={(e) => muda({ data: e.target.value })} />
      <NumberField label="Peso" unidade="kg" valor={campos.peso_kg || null} onChange={(v) => muda({ peso_kg: v ?? 0 })} />
      <p className="text-sm text-neutral-400">
        Circunferências são opcionais. Meça com fita, em cm, de manhã e sem apertar a pele.
      </p>
      {CIRCUNFERENCIAS.map((c) => (
        <div key={c.campo}>
          <NumberField label={c.rotulo} unidade="cm" valor={campos[c.campo]} onChange={(v) => muda({ [c.campo]: v })} />
          <p className="mt-1 text-xs text-neutral-500">{c.dica}</p>
        </div>
      ))}
    </Tela>
  )
}
