import { useEffect, useState } from 'react'
import { db } from '../../db/schema'
import { REGIOES, ROTULO_REGIAO, SINAIS_ALERTA, type Lesao, type Regiao } from '../../engine/anamnese'
import { Button } from '../../ui/Button'
import { EscolhaUma, EscolhaVarias, SimNao } from '../../ui/Escolha'
import { NumberField } from '../../ui/NumberField'
import { TextField } from '../../ui/TextField'
import { Tela } from '../../ui/Tela'
import { hojeSP } from '../../ui/datas'
import { anamneseAtual, salvarAnamnese } from '../perfil/registros'
import { ETAPAS, formInicial, montarRespostas, pendenciaDaEtapa, type FormAnamnese } from './formulario'
import {
  MOVIMENTOS_POR_REGIAO,
  MUSCULOS,
  PERGUNTA_ALERTA,
  ROTULO_ATIVIDADE,
  ROTULO_ESTRESSE,
  ROTULO_MOVIMENTO,
  ROTULO_OBJETIVO,
} from './rotulos'

interface Props {
  userId: string
  onVoltar: () => void
  onConcluir: () => void
}

/** Questionário em 7 etapas. O progresso fica salvo no aparelho a cada toque. */
export function AnamneseScreen({ userId, onVoltar, onConcluir }: Props) {
  const [form, setForm] = useState<FormAnamnese | null>(null)
  const [etapa, setEtapa] = useState(0)
  const [aviso, setAviso] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    void (async () => {
      const rascunho = await db.rascunhos_anamnese.get(userId)
      if (rascunho) {
        setForm(rascunho.respostas as unknown as FormAnamnese)
        setEtapa(rascunho.etapa)
        return
      }
      const [perfil, anterior] = await Promise.all([db.profiles.get(userId), anamneseAtual(userId)])
      setForm(formInicial(perfil, anterior?.respostas))
    })()
  }, [userId])

  if (!form) return null

  const atualizar = (novo: FormAnamnese, novaEtapa = etapa) => {
    setForm(novo)
    setAviso(null)
    void db.rascunhos_anamnese.put({
      profile_id: userId,
      etapa: novaEtapa,
      respostas: novo as never,
      atualizado_em: new Date().toISOString(),
    })
  }

  const avancar = async () => {
    const falta = pendenciaDaEtapa(etapa, form, hojeSP())
    if (falta) {
      setAviso(falta)
      return
    }
    if (etapa < ETAPAS.length - 1) {
      atualizar(form, etapa + 1)
      setEtapa(etapa + 1)
      window.scrollTo(0, 0)
      return
    }
    setSalvando(true)
    await salvarAnamnese(userId, montarRespostas(form), null)
    onConcluir()
  }

  const voltar = () => {
    if (etapa === 0) return onVoltar()
    atualizar(form, etapa - 1)
    setEtapa(etapa - 1)
    window.scrollTo(0, 0)
  }

  return (
    <Tela
      titulo={ETAPAS[etapa]!}
      onVoltar={voltar}
      rodape={
        <div className="flex flex-col gap-2">
          {aviso && <p role="alert" className="text-sm text-orange-300">{aviso}</p>}
          <Button onClick={() => void avancar()} disabled={salvando}>
            {etapa < ETAPAS.length - 1 ? 'Continuar' : 'Concluir questionário'}
          </Button>
        </div>
      }
    >
      <div>
        <div className="flex gap-1" aria-hidden>
          {ETAPAS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= etapa ? 'bg-orange-500' : 'bg-neutral-800'}`} />
          ))}
        </div>
        <p className="mt-2 text-sm text-neutral-400">
          Etapa {etapa + 1} de {ETAPAS.length} · o progresso fica salvo
        </p>
      </div>

      {etapa === 0 && <Identificacao form={form} set={atualizar} />}
      {etapa === 1 && <Historico form={form} set={atualizar} />}
      {etapa === 2 && <Alerta form={form} set={atualizar} />}
      {etapa === 3 && <Familiar form={form} set={atualizar} />}
      {etapa === 4 && <Lesoes form={form} set={atualizar} />}
      {etapa === 5 && <Contexto form={form} set={atualizar} />}
      {etapa === 6 && <ObjetivoEtapa form={form} set={atualizar} />}
    </Tela>
  )
}

interface EtapaProps {
  form: FormAnamnese
  set: (f: FormAnamnese) => void
}

function Identificacao({ form, set }: EtapaProps) {
  const i = form.identificacao
  const muda = (p: Partial<FormAnamnese['identificacao']>) => set({ ...form, identificacao: { ...i, ...p } })
  return (
    <>
      <TextField
        label="Data de nascimento"
        type="date"
        value={i.data_nascimento}
        max={hojeSP()}
        onChange={(e) => muda({ data_nascimento: e.target.value })}
      />
      <EscolhaUma
        rotulo="Sexo (usado nas fórmulas de gasto calórico e gordura corporal)"
        opcoes={[
          { valor: 'feminino', rotulo: 'Feminino' },
          { valor: 'masculino', rotulo: 'Masculino' },
        ]}
        valor={i.sexo}
        onChange={(sexo) => muda({ sexo })}
      />
      <NumberField label="Altura" unidade="cm" inteiro valor={i.altura_cm} onChange={(altura_cm) => muda({ altura_cm })} />
      <NumberField label="Peso atual" unidade="kg" valor={i.peso_kg} onChange={(peso_kg) => muda({ peso_kg })} />
    </>
  )
}

function Historico({ form, set }: EtapaProps) {
  const h = form.historico
  const muda = (p: Partial<FormAnamnese['historico']>) => set({ ...form, historico: { ...h, ...p } })
  return (
    <>
      <EscolhaUma
        rotulo="Há quanto tempo você treina musculação sem parar?"
        colunas={1}
        opcoes={[
          { valor: 0, rotulo: 'Nunca treinei ou parei há muito tempo' },
          { valor: 3, rotulo: 'Menos de 6 meses' },
          { valor: 12, rotulo: 'De 6 meses a 2 anos' },
          { valor: 36, rotulo: 'Mais de 2 anos' },
        ]}
        valor={h.meses_treino_continuo}
        onChange={(meses_treino_continuo) => muda({ meses_treino_continuo })}
      />
      <EscolhaUma
        rotulo="Quantos dias por semana você treina hoje?"
        colunas={3}
        opcoes={[0, 1, 2, 3, 4, 5, 6].map((n) => ({ valor: n, rotulo: String(n) }))}
        valor={h.frequencia_atual}
        onChange={(frequencia_atual) => muda({ frequencia_atual })}
      />
      <EscolhaUma
        rotulo="Você conhece os exercícios e aparelhos da academia?"
        colunas={1}
        opcoes={[
          { valor: 'nenhum', rotulo: 'Não, preciso de orientação', detalhe: 'O treino usa mais aparelhos fáceis de aprender e repete exercícios' },
          { valor: 'alguns', rotulo: 'Conheço alguns', detalhe: 'Mistura aparelhos e pesos livres' },
          { valor: 'bem', rotulo: 'Sim, sei usar bem', detalhe: 'Mais pesos livres e mais variedade' },
        ]}
        valor={h.conhecimento}
        onChange={(conhecimento) => muda({ conhecimento })}
      />
      <TextField
        label="Outras experiências (opcional)"
        placeholder="Ex.: fiz crossfit por 1 ano, corro aos domingos"
        value={h.experiencia}
        onChange={(e) => muda({ experiencia: e.target.value })}
      />
    </>
  )
}

function Alerta({ form, set }: EtapaProps) {
  return (
    <>
      <p className="text-neutral-300">
        Estas perguntas não diagnosticam nada. Servem para saber se é prudente passar por um médico antes de
        começar.
      </p>
      {SINAIS_ALERTA.map((s) => (
        <SimNao
          key={s}
          pergunta={PERGUNTA_ALERTA[s]}
          valor={form.alerta[s]}
          onChange={(v) => set({ ...form, alerta: { ...form.alerta, [s]: v } })}
        />
      ))}
    </>
  )
}

function Familiar({ form, set }: EtapaProps) {
  const f = form.familiar
  const muda = (p: Partial<FormAnamnese['familiar']>) => set({ ...form, familiar: { ...f, ...p } })
  return (
    <>
      <p className="text-neutral-300">Pais ou irmãos.</p>
      <SimNao
        pergunta="Alguém teve infarto ou doença do coração cedo (homem antes dos 55, mulher antes dos 65)?"
        valor={f.cardiovascular_precoce}
        onChange={(cardiovascular_precoce) => muda({ cardiovascular_precoce })}
      />
      <SimNao pergunta="Alguém tem diabetes?" valor={f.diabetes} onChange={(diabetes) => muda({ diabetes })} />
      <SimNao pergunta="Alguém tem pressão alta?" valor={f.hipertensao} onChange={(hipertensao) => muda({ hipertensao })} />
    </>
  )
}

function Lesoes({ form, set }: EtapaProps) {
  const lesaoDe = (r: Regiao) => form.lesoes.find((l) => l.regiao === r)
  const trocar = (r: Regiao, nova: Lesao | null) =>
    set({ ...form, lesoes: [...form.lesoes.filter((l) => l.regiao !== r), ...(nova ? [nova] : [])] })

  return (
    <>
      <p className="text-neutral-300">
        Marque só as regiões onde você tem ou teve lesão, dor ou limitação. Se não tem nenhuma, é só continuar.
      </p>
      {REGIOES.map((r) => {
        const lesao = lesaoDe(r)
        return (
          <div key={r} className="flex flex-col gap-3 rounded-xl border border-neutral-900 p-3">
            <button
              type="button"
              aria-pressed={!!lesao}
              onClick={() => trocar(r, lesao ? null : { regiao: r, status: 'ativa', movimentos: [] })}
              className={`min-h-12 rounded-xl border px-4 text-left text-base ${
                lesao ? 'border-orange-500 bg-orange-500/15 text-orange-200' : 'border-neutral-800 bg-neutral-900'
              }`}
            >
              {lesao ? '✓ ' : ''}
              {ROTULO_REGIAO[r]}
            </button>
            {lesao && (
              <>
                <EscolhaUma
                  rotulo="Situação"
                  colunas={3}
                  opcoes={[
                    { valor: 'ativa', rotulo: 'Ativa' },
                    { valor: 'reabilitacao', rotulo: 'Reabilitando' },
                    { valor: 'resolvida', rotulo: 'Resolvida' },
                  ]}
                  valor={lesao.status}
                  onChange={(status) => trocar(r, { ...lesao, status })}
                />
                {lesao.status !== 'resolvida' && (
                  <EscolhaVarias
                    rotulo="O que provoca dor?"
                    colunas={1}
                    opcoes={MOVIMENTOS_POR_REGIAO[r].map((m) => ({ valor: m, rotulo: ROTULO_MOVIMENTO[m] }))}
                    valores={lesao.movimentos}
                    onChange={(movimentos) => trocar(r, { ...lesao, movimentos })}
                  />
                )}
              </>
            )}
          </div>
        )
      })}
    </>
  )
}

function Contexto({ form, set }: EtapaProps) {
  const c = form.contexto
  const muda = (p: Partial<FormAnamnese['contexto']>) => set({ ...form, contexto: { ...c, ...p } })
  return (
    <>
      <EscolhaUma
        rotulo="Quantos dias por semana você pode treinar?"
        colunas={3}
        opcoes={[2, 3, 4, 5, 6].map((n) => ({ valor: n, rotulo: `${n} dias` }))}
        valor={c.dias_semana}
        onChange={(dias_semana) => muda({ dias_semana })}
      />
      <EscolhaUma
        rotulo="Quanto tempo você tem por treino?"
        colunas={3}
        opcoes={[30, 45, 60, 75, 90].map((n) => ({ valor: n, rotulo: `${n} min` }))}
        valor={c.minutos_sessao}
        onChange={(minutos_sessao) => muda({ minutos_sessao })}
      />
      <EscolhaUma
        rotulo="Quantas horas você dorme por noite?"
        colunas={3}
        opcoes={[
          { valor: 5, rotulo: '5 ou menos' },
          { valor: 6, rotulo: '6' },
          { valor: 7, rotulo: '7' },
          { valor: 8, rotulo: '8' },
          { valor: 9, rotulo: '9 ou mais' },
        ]}
        valor={c.horas_sono}
        onChange={(horas_sono) => muda({ horas_sono })}
      />
      <EscolhaUma
        rotulo="Nível de estresse no dia a dia"
        colunas={3}
        opcoes={(['baixo', 'medio', 'alto'] as const).map((e) => ({ valor: e, rotulo: ROTULO_ESTRESSE[e] }))}
        valor={c.estresse}
        onChange={(estresse) => muda({ estresse })}
      />
      <EscolhaUma
        rotulo="Atividade fora do treino"
        colunas={1}
        opcoes={(['sedentario', 'leve', 'moderado', 'intenso'] as const).map((a) => ({
          valor: a,
          rotulo: ROTULO_ATIVIDADE[a].rotulo,
          detalhe: ROTULO_ATIVIDADE[a].detalhe,
        }))}
        valor={c.atividade_diaria}
        onChange={(atividade_diaria) => muda({ atividade_diaria })}
      />
    </>
  )
}

function ObjetivoEtapa({ form, set }: EtapaProps) {
  const o = form.objetivo
  const muda = (p: Partial<FormAnamnese['objetivo']>) => set({ ...form, objetivo: { ...o, ...p } })
  return (
    <>
      <EscolhaUma
        rotulo="Objetivo principal"
        colunas={1}
        opcoes={(['hipertrofia', 'forca', 'emagrecimento', 'condicionamento', 'saude'] as const).map((v) => ({
          valor: v,
          rotulo: ROTULO_OBJETIVO[v],
        }))}
        valor={o.objetivo}
        onChange={(objetivo) => muda({ objetivo })}
      />
      <EscolhaVarias
        rotulo={`Músculos prioritários (até 2) — ${o.musculos_prioritarios.length}/2`}
        opcoes={MUSCULOS}
        valores={o.musculos_prioritarios}
        maximo={2}
        onChange={(musculos_prioritarios) => muda({ musculos_prioritarios })}
      />
    </>
  )
}
