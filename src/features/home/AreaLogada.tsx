import { useEffect, useSyncExternalStore } from 'react'
import { sincronizarPerfil } from '../../api/profiles'
import { sincronizarTudo } from '../../api/sincronizacao'
import { useRota } from '../../ui/rota'
import { AnamneseScreen } from '../anamnese/AnamneseScreen'
import { ResumoScreen } from '../anamnese/ResumoScreen'
import { MedidasScreen } from '../medidas/MedidasScreen'
import { NutricaoScreen } from '../nutricao/NutricaoScreen'
import { HomeScreen } from './HomeScreen'
import { AcademiasScreen } from '../academias/AcademiasScreen'
import { ExerciciosScreen } from '../exercicios/ExerciciosScreen'
import { ExercicioScreen } from '../exercicios/ExercicioScreen'
import { ProgramaScreen } from '../programa/ProgramaScreen'
import { PropostaScreen } from '../programa/PropostaScreen'

function assinarConexao(f: () => void) {
  window.addEventListener('online', f)
  window.addEventListener('offline', f)
  return () => {
    window.removeEventListener('online', f)
    window.removeEventListener('offline', f)
  }
}

export function useOnline() {
  return useSyncExternalStore(assinarConexao, () => navigator.onLine)
}

interface Props {
  userId: string
  email: string | null
  nomeDaSessao: string | null
  onSair: () => Promise<void>
}

/** Telas de quem está logado. Sincroniza ao abrir e sempre que o sinal volta. */
export function AreaLogada({ userId, email, nomeDaSessao, onSair }: Props) {
  const online = useOnline()
  const { caminho, ir, voltar } = useRota()

  useEffect(() => {
    if (!online) return
    void sincronizarPerfil(userId)
    void sincronizarTudo(userId)
  }, [userId, online])

  if (caminho.startsWith('/exercicios/')) {
    return (
      <ExercicioScreen
        key={caminho}
        userId={userId}
        slug={decodeURIComponent(caminho.slice('/exercicios/'.length))}
        onVoltar={voltar}
        onAbrir={(s) => ir(`/exercicios/${encodeURIComponent(s)}`)}
        onAcademias={() => ir('/academias')}
      />
    )
  }

  const abrirExercicio = (s: string) => ir(`/exercicios/${encodeURIComponent(s)}`)

  switch (caminho) {
    case '/programa':
      return <ProgramaScreen userId={userId} onVoltar={voltar} onIr={ir} onAbrirExercicio={abrirExercicio} />
    case '/programa/proposta':
      return (
        <PropostaScreen
          userId={userId}
          onVoltar={voltar}
          onAprovado={() => ir('/programa', true)}
          onAbrirExercicio={abrirExercicio}
        />
      )
    case '/academias':
      return <AcademiasScreen userId={userId} onVoltar={voltar} />
    case '/exercicios':
      return (
        <ExerciciosScreen userId={userId} onVoltar={voltar} onAbrir={(s) => ir(`/exercicios/${encodeURIComponent(s)}`)} />
      )
    case '/anamnese':
      return <AnamneseScreen userId={userId} onVoltar={voltar} onConcluir={() => ir('/avaliacao', true)} />
    case '/avaliacao':
      return (
        <ResumoScreen
          userId={userId}
          onVoltar={() => ir('/', true)}
          onRefazer={() => ir('/anamnese')}
          onNutricao={() => ir('/nutricao')}
        />
      )
    case '/medidas':
      return <MedidasScreen userId={userId} onVoltar={voltar} />
    case '/nutricao':
      return <NutricaoScreen userId={userId} onVoltar={voltar} onAnamnese={() => ir('/avaliacao')} />
    default:
      return (
        <HomeScreen
          userId={userId}
          email={email}
          nomeDaSessao={nomeDaSessao}
          online={online}
          onIr={ir}
          onSair={onSair}
        />
      )
  }
}
