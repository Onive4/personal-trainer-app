# CLAUDE.md

Contexto e regras deste projeto. Leia `ESPECIFICACAO.md` antes de implementar qualquer coisa.

## O que é

PWA de treino personalizado para dois usuários (um casal). Faz o papel de personal trainer e avaliador físico: coleta anamnese e medidas, monta a série, acompanha carga por série, detecta platô e propõe o próximo bloco. Sem avaliação física presencial e sem custo recorrente.

## Restrições que não se negociam

1. **Custo zero.** Nenhuma dependência paga, nenhuma chave de API de serviço cobrado, nenhum plano. Antes de adicionar qualquer biblioteca ou serviço, confirme que o plano gratuito atende e registre o limite em `ESPECIFICACAO.md`. Se a única solução de um problema for paga, pare e pergunte.
2. **Sem IA em runtime.** O motor de progressão é determinístico, em TypeScript puro. Nada de chamada a LLM para montar treino — custaria dinheiro, não funcionaria offline e tornaria a prescrição inexplicável.
3. **Offline primeiro.** Nenhuma ação do usuário espera resposta de rede. Grava no IndexedDB e sincroniza depois. Academia com sinal ruim é o caso normal, não a exceção.
4. **Dois usuários, dados separados.** RLS por `auth.uid()` em toda tabela com `profile_id`. A anamnese de um não é visível ao outro, nem com a flag de compartilhar progresso ligada.
5. **Nada de dispositivo médico.** O app estima e sugere, não diagnostica nem prescreve. Toda tela com número de saúde ou nutrição traz o enquadramento de estimativa. Sinal de alerta na triagem bloqueia a geração de programa.

## Stack

React 19 · TypeScript · Vite · Tailwind · vite-plugin-pwa · Dexie · Supabase (Auth + Postgres + RLS) · Recharts · Vitest · Playwright · Cloudflare Workers (arquivos estáticos, `npm run deploy`).

Toda migração que cria tabela declara os `grant` de `anon` e `authenticated` explicitamente — o projeto Supabase não concede acesso da API sozinho (ver "Permissões do banco" na especificação).

## Estrutura

```
src/
  engine/          motor determinístico — funções puras, sem I/O, sem React
    anamnese.ts      triagem, constraints, nível
    volume.ts        volume e divisão semanal
    builder.ts       montagem do mesociclo
    progression.ts   dupla progressão, e1RM
    plateau.ts       gatilhos e escada de intervenção
    substitution.ts  alternativas de exercício
    nutrition.ts     Mifflin-St Jeor, macros, ajuste adaptativo
    __tests__/       cenários da seção 14 da especificação
  db/              Dexie: schema local, fila de sincronização
  api/             cliente Supabase, repositórios
  features/        telas por domínio (anamnese, sessao, evolucao, nutricao)
  ui/              componentes compartilhados
data/
  exercises.pt.json  catálogo curado e traduzido
```

**Regra de ouro:** `src/engine/` não importa React, não faz fetch, não toca em Dexie. Entra estado, sai prescrição. É o que permite testar a inteligência do app sem subir interface.

## Convenções

- Interface, textos e nomes de domínio em **português do Brasil**. Código, tipos e nomes de arquivo em inglês quando for termo técnico (`progression.ts`), em português quando for domínio (`anamnese.ts`).
- Linguagem da interface para leigo: nada de RIR, mesociclo, padrão de movimento ou sigla técnica na tela. Esforço em palavras, "fase", "semana leve", "questionário inicial". O que não ajuda a pessoa a treinar fica fora da tela ou recolhido.
- Unidades: quilogramas e centímetros. Máquina com placas registra número de placas, nunca convertido para kg estimado.
- Datas em ISO 8601, horário local de São Paulo na exibição.
- `set_logs` é append-only. Correção cria registro novo com `substitui_id`. Nunca UPDATE em registro de série.
- Commits em português, no imperativo.
- Toda mudança no motor acompanha teste. Toda intervenção aplicada pelo motor grava o gatilho que a disparou.

## Usabilidade na academia

A tela de sessão é usada de pé, com uma mão, celular suado, muitas vezes sem sinal. Ao mexer nela:

- Alvo de toque mínimo de 48 px.
- O número da última vez fica ao lado do campo atual.
- Registrar série: no máximo dois toques, sem rolagem.
- Cronômetro de descanso dispara ao confirmar a série.
- Nada de spinner bloqueando o fluxo.

## Direitos autorais e fontes de dados

- Catálogo de exercícios: `yuhonas/free-exercise-db` (Unlicense, domínio público). Imagens por URL do repositório; não copiar para o nosso storage.
- **Não copiar o PAR-Q+.** A licença dele exige uso do formulário inteiro sem alterações. O questionário de triagem é próprio, inspirado na lógica de estratificação de risco. O PAR-Q+ oficial só é referenciado por link.
- Não copiar texto de app comercial, de artigo ou de site de treino. Instruções de exercício são redação própria ou vêm da base de domínio público.

## Como trabalhar neste repositório

Siga os milestones M0 a M6 da especificação, em ordem. Cada um termina funcionando e implantado — não acumule integração para o fim. Antes de fechar um milestone, rode os testes e confira o critério de "pronto quando" da especificação.

Quando uma decisão de arquitetura mudar, atualize `ESPECIFICACAO.md` no mesmo commit. A especificação é a fonte de verdade; este arquivo só resume as regras.
