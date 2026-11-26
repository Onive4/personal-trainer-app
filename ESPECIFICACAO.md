# Especificação — App de Treino Personalizado (PWA)

Documento de arquitetura para iniciar o projeto no Claude Code.
Dois usuários (casal), custo recorrente zero, acesso por iPhone e Android.

---

## 1. Decisões fundamentais

| Decisão | Escolha | Motivo |
|---|---|---|
| Distribuição | PWA instalável (tela de início) | App Store exige US$ 99/ano; PWA roda em iOS e Android sem custo |
| Dados | Supabase free (Postgres + Auth + RLS) | Sync entre os dois celulares, histórico protegido de troca de aparelho |
| Contas | Cadastro no app (e-mail/senha ou Google), restrito a uma lista de e-mails autorizados (`allowed_emails`) | Os dois criam a própria conta sem mexer no painel; ninguém de fora consegue se cadastrar |
| Hospedagem | Cloudflare Worker só com arquivos estáticos (`wrangler.jsonc`) | Formato que o Cloudflare recomenda no lugar do Pages; gratuito; mesmo formato do `hidrata-app` |
| Fonte de verdade local | IndexedDB (Dexie) + fila de sincronização | Academia tem sinal ruim; treino nunca pode travar por rede |
| Motor de progressão | TypeScript puro, determinístico | Zero custo de API, roda offline, testável, resultado explicável |
| Nutrição | Estimativa de referência (sem diário alimentar) | Calcula meta e ajusta pela curva real de peso |
| Troca de série | Motor propõe, usuário aprova | Mantém controle humano e evita mudança que ninguém entendeu |

**Custo total do projeto: R$ 0.** Nenhuma chave de API paga, nenhum plano, nenhuma dependência comercial. Domínio próprio é opcional (o subdomínio gratuito da hospedagem resolve).

---

## 2. O que diferencia este app de uma planilha da internet

Quatro mecanismos, nesta ordem de importância:

1. **Triagem antes da prescrição.** Lesões, histórico familiar e sinais de alerta filtram o catálogo de exercícios antes de qualquer série ser montada.
2. **Autorregulação por RIR.** A carga de amanhã é função do que aconteceu hoje, não de um percentual fixo decidido semanas atrás.
3. **Detecção de platô com resposta graduada.** O app identifica estagnação real (e não um dia ruim) e aplica uma intervenção por vez.
4. **Substituição por equipamento disponível.** Cada academia tem um inventário cadastrado; o app só prescreve o que existe lá.

---

## 3. Stack

```
Frontend    React 19 + TypeScript + Vite + Tailwind CSS v4 (@tailwindcss/vite)
PWA         vite-plugin-pwa (Workbox) — service worker, manifest, offline shell
Ícones      @vite-pwa/assets-generator — PNGs gerados de public/icon.svg em dev
Local       Dexie + dexie-react-hooks (IndexedDB) — fonte de verdade durante o treino
Backend     Supabase: Auth (e-mail/senha + Google OAuth), Postgres, Row Level Security
Gráficos    Recharts
Testes      Vitest (motor), Playwright (fluxo crítico de sessão)
Hospedagem  Cloudflare Worker de arquivos estáticos — plano gratuito, `npm run deploy` (wrangler)
Catálogo    free-exercise-db (Unlicense, domínio público) curado e traduzido
```

**Endereços:** app em https://treino.raphaleskbom.workers.dev · Supabase `pndebjmytaasrlbtdfpb` (região us-west-2, Oregon) · código em `Onive4/personal-trainer-app`.

### Permissões do banco (regra para toda tabela nova)

O projeto Supabase não concede acesso automático da API às tabelas novas do schema `public`. Cada migração que cria tabela declara, explicitamente, os `grant` de `anon` e `authenticated` (por padrão: nada para `anon`; para `authenticated`, só as operações que o app usa, e `update` restrito às colunas editáveis). A RLS filtra as linhas por cima disso. Funções de trigger têm `execute` revogado de `anon` e `authenticated`. Depois de cada migração, rodar o verificador de segurança do Supabase.

### Limites dos planos gratuitos usados

| Serviço | Limite relevante | Situação no projeto |
|---|---|---|
| Supabase Free | 500 MB de banco, 50 mil usuários ativos/mês, pausa após 7 dias sem atividade | Dois usuários, só texto e números; pausa evitada pelo keep-alive |
| Supabase Auth (SMTP padrão) | Envia e-mail só para membros da organização, com limite baixo por hora | "Confirm email" desligado; a lista `allowed_emails` faz o papel de proteção |
| Supabase Auth (senhas vazadas) | Checagem contra senhas vazadas não está disponível no plano Free | Fica desligada; aviso do verificador aceito |
| Google OAuth (Google Cloud) | Gratuito; tela de consentimento em modo "Teste" aceita até 100 usuários de teste | Os dois e-mails cadastrados como usuários de teste; só escopos de e-mail e perfil |
| Cloudflare Workers Free | Requisições a arquivos estáticos são gratuitas e ilimitadas | App só de arquivos estáticos, sem código de servidor |
| GitHub Actions | Repositório público ilimitado; privado 2.000 min/mês. Cron é desativado após 60 dias sem commit | Keep-alive usa segundos por semana; reativar o workflow se o GitHub desligar |

### Riscos da infraestrutura gratuita e mitigação

| Risco | Mitigação |
|---|---|
| Projeto Supabase free pausa após 7 dias sem atividade no banco | GitHub Actions com cron duas vezes por semana chamando a função `keep_alive()` (gratuito) |
| Login com Google dentro do PWA instalado no iOS pode voltar para o Safari em vez do app | E-mail e senha disponíveis como alternativa; validar no iPhone no fechamento do M0 |
| iOS descarta IndexedDB após ~7 dias de inatividade se não instalado na tela de início | Tela de onboarding obrigando a instalação + sync na nuvem como backup real |
| Limite de 500 MB do banco | Dados são texto e números; o uso de dois usuários por anos não chega perto. Imagens de exercício vêm por URL do GitHub, não do nosso storage |
| PWA no iOS não tem prompt automático de instalação | Tela de instruções ilustrada no primeiro acesso (Compartilhar → Adicionar à Tela de Início) |

---

## 4. Modelo de dados

```
allowed_emails      email, created_at   (sem acesso pela API; trigger em auth.users
                    recusa cadastro de e-mail fora da lista)
profiles            id (= auth.users.id), nome, sexo, data_nascimento, altura_cm,
                    compartilhar_progresso, created_at   (criado por trigger no cadastro)
anamneses           id, profile_id, versao, respostas (jsonb), clearance_status
                    (liberado | orientar_avaliacao | liberado_por_registro),
                    constraints (text[]), nivel, objetivo, liberacao (jsonb: data,
                    profissional, registrado_em), data
measurements        id, profile_id, data, peso_kg, pescoco, cintura, quadril,
                    torax, braco_d, braco_e, coxa_d, coxa_e, panturrilha, bf_estimado
gyms                id, profile_id, nome, ativa (bool)
gym_equipment       gym_id, equipment_key, disponivel (bool)
exercises           id, slug, nome_pt, nome_en, padrao_movimento, musculo_primario,
                    musculos_secundarios[], equipamento, nivel, unilateral,
                    instrucoes_pt, imagens[], contraindicacoes[]
programs            id, profile_id, nome, objetivo, dias_semana, criado_em, ativo
mesocycles          id, program_id, numero, semanas, enfase[], status
                    (proposto | aprovado | em_andamento | concluido), diagnostico (jsonb)
slots               id, mesocycle_id, dia, ordem, exercise_id, padrao_movimento,
                    series_alvo, rep_min, rep_max, rir_semana (int[]), substituiu_slot_id
sessions            id, mesocycle_id, profile_id, dia, semana, data_prevista,
                    data_realizada, readiness (jsonb), status
set_logs            id, session_id, slot_id, exercise_id, serie_num, tipo_carga
                    (kg | placas | peso_corporal | elastico), carga, placas, reps, rir,
                    e1rm, gym_id, maquina_label, observacao, created_at
nutrition_targets   id, profile_id, data, tmb, tdee, kcal_alvo, proteina_g, gordura_g,
                    carbo_g, objetivo, peso_alvo_semana_pct, motivo
sync_outbox         id, tabela, operacao, payload (jsonb), tentativas, status
```

**Anamnese, medidas e metas são append-only pela API** (só `select` e `insert` para `authenticated`). Refazer a anamnese ou registrar liberação médica cria uma versão nova; corrigir medida cria registro novo; cada meta grava o `motivo` que a gerou. Os ids são gerados no celular (`crypto.randomUUID`), então reenviar a fila é idempotente (`insert … on conflict do nothing`). As três tabelas são lidas só pelo dono; a leitura mútua de medidas para os painéis entra no M6.

**Sincronização (versão do M1):** `src/db/sync.ts` envia a fila em ordem ao abrir o app e quando o sinal volta. Sem rede, para e espera; recusa do servidor conta tentativa e desiste após 5. Depois do envio, `baixarDados` espelha no Dexie o que está no servidor. A resolução de conflitos completa é do M4.

**RLS obrigatório:** toda tabela com `profile_id` filtra por `auth.uid()`. Os dois perfis são separados; cada um vê o próprio treino. Uma flag `compartilhar_progresso` libera leitura mútua dos dashboards (não da anamnese — histórico de saúde fica privado por padrão).

**`set_logs` é append-only.** Correção gera um novo registro com `substitui_id`, nunca UPDATE. Isso elimina conflito de sincronização: dois celulares nunca escrevem a mesma linha.

**Carga em placas não é comparável entre academias.** `set_logs` guarda `gym_id` e `maquina_label`. O gráfico de evolução separa séries por máquina e marca visualmente a descontinuidade quando a academia muda.

---

## 5. Anamnese e triagem

### 5.1 Seções do questionário

1. **Identificação** — idade, sexo, altura, peso atual.
2. **Histórico de treino** — tempo de treino contínuo, experiência anterior, frequência atual, exercícios que já domina com técnica.
3. **Triagem de prontidão (sinais de alerta)** — dor no peito em repouso ou esforço; tontura ou desmaio; perda de consciência; pressão alta sem controle; uso de medicação cardíaca ou para pressão; orientação médica para fazer atividade apenas supervisionada; dor em osso ou articulação que piora com atividade física.
4. **Histórico familiar** — doença cardiovascular precoce (homens antes dos 55, mulheres antes dos 65), diabetes, hipertensão.
5. **Lesões e limitações** — por região (ombro, cervical, lombar, quadril, joelho, tornozelo, punho/cotovelo), com status (ativa / em reabilitação / resolvida) e movimentos que provocam dor.
6. **Contexto** — dias disponíveis por semana, minutos por sessão, academia ativa, horas de sono, nível de estresse, atividade diária fora do treino.
7. **Objetivo** — hipertrofia, força, emagrecimento, condicionamento ou saúde geral, mais até dois músculos prioritários.

### 5.2 Lógica de triagem

- Qualquer resposta positiva na seção 3 → `clearance_status = "orientar_avaliacao"`. O app **não gera programa**; exibe tela recomendando liberação médica antes de iniciar.
- Existe um registro explícito de liberação ("já tenho liberação médica", com data e profissional) que desbloqueia a geração. A decisão é do usuário e fica registrada.
- Lesões viram `constraints[]` legíveis pelo motor. Exemplos: `sem_carga_axial`, `sem_desenvolvimento_acima_cabeca`, `flexao_joelho_limitada`, `sem_impacto`, `evitar_amplitude_maxima_ombro`.
- Cada `constraint` casa com `exercises.contraindicacoes[]` e remove o exercício do pool antes da montagem.
- **Regra de conversão (implementada em `src/engine/anamnese.ts`):** lesão **ativa** → restrições padrão da região + as dos movimentos que doem; **em reabilitação** → só as dos movimentos marcados (ou as da região, se nenhum foi marcado); **resolvida** → nenhuma. Padrão por região: ombro → `sem_desenvolvimento_acima_cabeca`, `evitar_amplitude_maxima_ombro`; cervical → `cervical_sensivel`, `sem_carga_axial`; lombar → `sem_carga_axial`, `sem_flexao_lombar_carregada`, `sem_hiperextensao_lombar`; quadril e joelho → `flexao_joelho_limitada`, `sem_impacto`; tornozelo → `sem_impacto`; punho/cotovelo → `sem_extensao_punho`, `sem_apoio_punho`. A tela de avaliação mostra cada restrição com a lesão que a causou.
- Nível pelo tempo de treino contínuo: menos de 6 meses iniciante, 6 a 24 intermediário, mais de 24 avançado.
- Sinal de alerta sem liberação também bloqueia a meta calórica (a orientação é passar por médico antes).
- No M1 a etapa "Contexto" não pergunta a academia ativa: o cadastro de academias chega no M2.

### 5.3 Observação legal importante

O PAR-Q+ é material protegido por direito autoral e sua licença exige uso do questionário inteiro, sem alterações. Portanto: **o app usa um questionário próprio**, inspirado na lógica de estratificação de risco (pergunta de alerta → resposta positiva → recomendação de avaliação), e aponta o usuário para o PAR-Q+ oficial quando ele quiser a liberação formal. Não copiar o formulário.

---

## 6. Motor de montagem do treino

### 6.1 Volume semanal por músculo

| Nível | Séries/semana por músculo | Frequência mínima |
|---|---|---|
| Iniciante (< 6 meses) | 8–10 | 2x |
| Intermediário (6–24 meses) | 12–18 | 2x |
| Avançado (> 24 meses) | 16–22 | 2x |

Músculos prioritários entram no topo da faixa; os demais no piso. O teto nunca é ultrapassado na montagem inicial — subir volume é uma das intervenções reservadas para quando o platô aparecer.

### 6.2 Divisão por dias disponíveis

| Dias | Divisão |
|---|---|
| 2 | Corpo inteiro A / B |
| 3 | Corpo inteiro A / B / C |
| 4 | Superior / Inferior, duas vezes |
| 5 | Superior / Inferior / Empurrar / Puxar / Pernas |
| 6 | Empurrar / Puxar / Pernas, duas vezes |

### 6.3 Faixas de repetição por objetivo

| Objetivo | Compostos | Acessórios | RIR alvo |
|---|---|---|---|
| Força | 3–6 | 6–10 | 1–2 |
| Hipertrofia | 5–8 | 8–15 | 1–3 |
| Emagrecimento | 6–10 | 10–15 | 2–3 |
| Condicionamento / saúde | 8–15 | 10–15 | 2–4 |

No emagrecimento a carga é mantida de propósito: o estímulo preserva massa muscular enquanto o déficit calórico faz o trabalho.

### 6.4 Equilíbrio de padrões de movimento

Toda semana precisa cobrir: agachamento, dobradiça de quadril, empurrar horizontal, empurrar vertical, puxar horizontal, puxar vertical, unilateral de perna e anti-extensão de tronco. Regra de validação: volume de puxar ≥ volume de empurrar. O gerador rejeita a própria saída e remonta se a regra falhar.

### 6.5 Seleção de exercício por slot

Filtro (eliminatório): equipamento disponível na academia ativa → nenhuma contraindicação ativa → nível compatível.
Ordenação: padrão de movimento pedido pelo slot → exercício já dominado pelo usuário → variação diferente da usada no mesociclo anterior (evita repetir o mesmo estímulo bloco após bloco).

---

## 7. Progressão dentro do mesociclo

Mesociclo padrão: 4 a 6 semanas de acúmulo + 1 semana de deload.

**Rampa de esforço:** semana 1 em RIR 3 → última semana de acúmulo em RIR 1 → deload em RIR 4–5 com metade do volume e cerca de 70% da carga.

**Dupla progressão autorregulada**, avaliada por slot ao fim de cada sessão:

```
se todas as séries atingiram rep_max com RIR >= alvo:
    próxima sessão: aumentar carga
      (+2,5 kg superiores, +5 kg inferiores, +1 placa em máquina)
      e voltar para rep_min
senão se reps dentro da faixa:
    próxima sessão: mesma carga, +1 rep por série
senão se reps < rep_min ou RIR 0 antes de rep_min:
    manter carga
    se repetir na sessão seguinte: reduzir carga 5–10%
```

**e1RM (1RM estimado), fórmula de Epley ajustada por RIR:**

```
reps_efetivas = reps + rir
e1rm = carga × (1 + reps_efetivas / 30)
```

O ajuste por RIR é o que torna o número comparável entre uma série levada ao limite e outra parada com folga. Para séries em placas, o e1RM é calculado apenas dentro da mesma máquina e da mesma academia.

---

## 8. Detecção de platô e resposta

### 8.1 Gatilhos (janela móvel de 4 sessões do mesmo slot)

| Gatilho | Condição | Interpretação |
|---|---|---|
| A — Platô real | e1RM sem subir em 3+ sessões **e** RIR relatado ≤ alvo | O estímulo parou de funcionar |
| B — Fadiga acumulada | e1RM caiu ≥ 5% do melhor do bloco com esforço mantido | Precisa de deload, não de mais carga |
| C — Volume estagnado | Volume-carga (Σ carga × reps) estável por 2 semanas | Sobrecarga progressiva parou |
| D — Recuperação ruim | Readiness baixa em 3 sessões seguidas | Reduzir volume em 20% antes de concluir platô |

Readiness é um check-in de 10 segundos no início da sessão: sono, dor muscular e estresse em escala de 1 a 5.

### 8.2 Escada de intervenção

Aplicar **uma intervenção por vez**, nesta ordem. Mudar duas coisas ao mesmo tempo torna impossível saber o que funcionou.

1. Trocar a faixa de repetições do slot (ex.: 8–12 → 5–8).
2. Trocar a variação do exercício, mantendo o padrão de movimento.
3. Aumentar volume do músculo em 2 séries, se estiver abaixo do teto do nível.
4. Deload e novo mesociclo com ênfase diferente.

Cada intervenção aplicada fica registrada com a data e o gatilho que a disparou — é o histórico que explica ao usuário por que o treino mudou.

---

## 9. Revisão de mesociclo (tela de aprovação)

Ao fim do bloco, o app apresenta:

**Diagnóstico** — recordes batidos; variação de e1RM por exercício; aderência (sessões feitas ÷ previstas); volume realizado vs. planejado; músculos que progrediram e que travaram; variação de medidas e peso.

**Proposta** — ênfase do próximo bloco; trocas de exercício com o motivo de cada uma; ajustes de volume; mudança de faixa de repetições.

O usuário aprova, edita exercício por exercício, ou pede outra proposta. Nada entra em vigor sem aprovação.

---

## 10. Substituição de exercício

Acionada pelo botão "não tem esse equipamento" dentro da sessão.

Critérios eliminatórios: mesmo músculo primário; equipamento disponível na academia ativa; sem conflito com as contraindicações do usuário.
Pontuação para ordenar: mesmo padrão de movimento (peso 3); mesma condição unilateral/bilateral (peso 1); nível compatível (peso 1).

**Regra de fallback (validada no catálogo):** cinco exercícios não têm nenhuma alternativa estrita, isto é, nenhum outro exercício com o mesmo músculo primário **e** o mesmo padrão de movimento. Quando não houver candidato estrito, o motor relaxa o critério de padrão e busca apenas pelo músculo primário, avisando na tela que a alternativa muda o padrão do movimento. Sem essa regra, o botão de substituir retorna vazio nesses casos.

Mostra as 3 melhores opções com imagem e instruções. Ao trocar, o novo exercício herda o slot (a contagem de volume semanal continua intacta) mas começa histórico de carga próprio, e o gráfico marca que as cargas não são comparáveis.

---

## 11. Nutrição — estimativa de referência

**Gasto energético basal (Mifflin-St Jeor):**

```
homens:   10 × peso_kg + 6,25 × altura_cm − 5 × idade + 5
mulheres: 10 × peso_kg + 6,25 × altura_cm − 5 × idade − 161
```

**Gasto total:** basal × fator de atividade (1,2 sedentário · 1,375 leve · 1,55 moderado · 1,725 intenso), escolhido pela atividade diária e corrigido pela frequência real de treino registrada.

**Meta calórica:** emagrecimento −10% a −20% · hipertrofia +5% a +10% · manutenção 0%. Valores usados na meta inicial: emagrecimento −15%, hipertrofia +7,5%, demais objetivos 0%.

**Macros:** proteína 1,6 a 2,2 g/kg · gordura 0,8 a 1,0 g/kg · carboidrato preenche o restante. Valores usados: proteína 2,0 g/kg no emagrecimento, 1,8 na hipertrofia e força, 1,6 nos demais; gordura 0,8 g/kg. O ajuste adaptativo é proposto na tela de nutrição e só vale depois que o usuário aprova; ele compara as médias de 7 dias de hoje e de 14 dias atrás (cada uma com pelo menos 3 pesagens).

**Ritmo alvo de peso:** −0,5% a −1,0% do peso corporal por semana (emagrecimento); +0,25% a +0,5% (hipertrofia).

**Ajuste adaptativo:** média móvel de 7 dias do peso. Se por 2 semanas a variação real ficar fora da faixa alvo, ajustar calorias em ±10% e avisar o usuário com o número que motivou o ajuste.

**Gordura corporal por circunferência (fórmula da Marinha dos EUA, métrica, em cm):**

```
homens:   495 / (1,0324 − 0,19077 × log10(cintura − pescoço) + 0,15456 × log10(altura)) − 450
mulheres: 495 / (1,29579 − 0,35004 × log10(cintura + quadril − pescoço) + 0,22100 × log10(altura)) − 450
```

**Enquadramento obrigatório na interface:** são estimativas para orientar ajuste, não prescrição. Qualquer condição de saúde, uso de medicação, gestação ou restrição alimentar → encaminhar para nutricionista. O app nunca propõe meta calórica abaixo do basal estimado.

---

## 12. Telas

| Tela | Conteúdo |
|---|---|
| Onboarding | Instalação na tela de início, criação de conta (e-mail/senha ou Google) e login; cada conta é um perfil |
| Anamnese | Questionário em etapas, com progresso salvo |
| Medidas | Entrada de peso e circunferências, histórico, gráficos |
| Academias | Cadastro de academias e checklist de equipamentos, seleção da ativa |
| Proposta de bloco | Diagnóstico + próximo mesociclo para aprovar ou editar |
| Treino do dia | **Tela mais importante.** Lista de exercícios, série por série |
| Sessão (série) | Carga ou placas, reps, RIR, cronômetro de descanso, número da última vez |
| Histórico | Sessões passadas, recordes |
| Evolução | e1RM por exercício, volume por músculo, peso e medidas |
| Nutrição | Meta atual, curva de peso, histórico de ajustes |

### Regras de usabilidade dentro da academia

A tela de sessão é usada de pé, com uma mão, celular suado, às vezes sem sinal:

- Alvos de toque de 48 px no mínimo; nada de campos pequenos lado a lado.
- **O número da última vez aparece ao lado do campo atual** ("na última: 60 kg × 10 @ RIR 2"). É o recurso de maior valor prático dos apps bem avaliados.
- Registrar uma série não pode exigir rolagem nem mais de dois toques.
- Cronômetro de descanso dispara sozinho ao confirmar a série.
- Nenhuma ação espera resposta de rede. Grava local, sincroniza depois.
- Recorde detectado dá retorno visual imediato.

---

## 13. Milestones

Cada um termina funcionando e implantado. Nada de integração acumulada para o fim.

**M0 — Fundação**
Scaffold Vite + React + TS + Tailwind; PWA com manifest, ícones e service worker; Dexie configurado; Supabase com Auth e RLS; dois perfis; deploy no Cloudflare (Worker de arquivos estáticos); GitHub Action de keep-alive.
*Pronto quando:* instala na tela de início do iPhone e do Android, abre offline, login funciona.

**M1 — Anamnese e perfil**
Questionário em etapas; lógica de triagem e `constraints[]`; registro de liberação médica; medidas corporais; cálculo nutricional e metas.
*Pronto quando:* os dois perfis completam a anamnese e cada um tem suas restrições e metas calculadas.

**M2 — Catálogo e academias**
Catálogo **já pronto** em `data/` — 190 exercícios curados, com nome em português, cues de execução, contraindicações e chave de equipamento granular; basta importar para o banco. Falta: cadastro de academias com o checklist de `data/equipamentos.json`, busca e motor de substituição.
*Pronto quando:* dá para procurar um exercício e ver 3 alternativas válidas para a academia ativa.

Arquivos do catálogo:

| Arquivo | Conteúdo |
|---|---|
| `data/exercises.pt.json` | 190 exercícios prontos para importar |
| `data/equipamentos.json` | 62 chaves de equipamento em 6 categorias — é o checklist da tela de academia |
| `data/vocabulario.json` | os 11 padrões de movimento e as 10 contraindicações, com rótulo em português |
| `scripts/curadoria/` | blocos da curadoria + `build.py`, para regerar ou ampliar o catálogo |

**M3 — Gerador de programa**
Motor de montagem (volume, divisão, padrões de movimento, seleção de exercício); tela de proposta e aprovação.
*Pronto quando:* a partir das duas anamneses, saem dois programas diferentes e coerentes, aprovados em tela.

**M4 — Execução e registro**
Tela de sessão; registro de carga/placas/reps/RIR; cronômetro; detecção de recorde; check-in de readiness; fila de sincronização e resolução offline.
*Pronto quando:* um treino inteiro é registrado em modo avião e sincroniza ao voltar o sinal.

**M5 — Progressão e platô**
Dupla progressão autorregulada; cálculo de e1RM; os quatro gatilhos; escada de intervenção; deload; revisão de mesociclo com diagnóstico.
*Pronto quando:* os testes de cenário passam e um platô simulado gera a intervenção certa, com justificativa.

**M6 — Dashboards**
Evolução de e1RM por exercício; volume semanal por músculo; peso com média móvel; medidas; aderência.
*Pronto quando:* dá para responder "o que progrediu nos últimos 3 meses" em uma tela.

---

## 14. Testes do motor

O motor é função pura: entra estado, sai prescrição. Isso permite testar sem interface.

Cenários mínimos em `src/engine/__tests__/`:

1. Iniciante, hipertrofia, 3 dias, sem restrição → volume no piso, exercícios de nível iniciante, padrões equilibrados.
2. Intermediário com dor lombar ativa → nenhum exercício com carga axial no programa.
3. Sinal de alerta positivo na triagem → geração bloqueada, tela de avaliação médica.
4. Carga estagnada 4 sessões com RIR no alvo → gatilho A, intervenção 1 (troca de faixa de repetições).
5. e1RM caindo 7% com esforço mantido → gatilho B, deload antecipado.
6. Readiness baixa 3 sessões seguidas → redução de volume, sem concluir platô.
7. Academia sem leg press → substituição retorna alternativa de mesmo padrão e músculo.
8. Peso parado 2 semanas em déficit → ajuste de −10% nas calorias, com registro do motivo.

---

## 15. Fora de escopo (por decisão)

Rede social e feed · integração com relógio · vídeo demonstrativo próprio · diário alimentar com busca de alimentos · exercícios de cardio estruturados com zonas de frequência cardíaca · compartilhamento público de treino.

Nenhum deles é necessário para o objetivo, e cada um traria custo, dependência externa ou obrigação de conteúdo que não se sustenta de graça.
