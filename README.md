# Treino — PWA de treino personalizado

App para duas pessoas que faz o papel de personal trainer: anamnese, montagem da série, registro de carga, detecção de platô e próximo bloco. Custo zero, funciona offline.

- Especificação (fonte de verdade): [ESPECIFICACAO.md](ESPECIFICACAO.md)
- Regras do projeto: [CLAUDE.md](CLAUDE.md)

## Rodar localmente

Pré-requisito: [Node.js LTS](https://nodejs.org/) (versão 20 ou mais nova).

```powershell
npm install
copy .env.example .env.local   # e preencha com os dados do Supabase
npm run icons                  # gera os PNGs a partir de public/icon.svg (só quando o ícone mudar)
npm run dev
npm test
```

## Configuração única (M0)

Todos os serviços abaixo têm plano gratuito suficiente. Nenhum pede cartão.

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (plano Free, região São Paulo).
2. Em **SQL Editor**, cole e rode o conteúdo de [supabase/migrations/0001_profiles.sql](supabase/migrations/0001_profiles.sql).
3. Ainda no SQL Editor, autorize os dois e-mails (em minúsculas):
   ```sql
   insert into public.allowed_emails (email) values
     ('pessoa1@exemplo.com'),
     ('pessoa2@exemplo.com');
   ```
4. Em **Authentication → Sign In / Providers**, na seção **User Signups** no topo, deixe **Allow new users to sign up** ligado e desligue **Confirm email**. O SMTP gratuito do Supabase não entrega para endereços de fora da organização, e a lista de e-mails autorizados já impede cadastros indevidos.
5. Em **Authentication → URL Configuration**:
   - **Site URL**: `https://treino.raphaleskbom.workers.dev`
   - **Redirect URLs**: `https://treino.raphaleskbom.workers.dev/auth/callback` e `http://localhost:5173/auth/callback`
6. Em **Project Settings → API**, copie a **Project URL** e a chave pública (**anon** ou **publishable**) para o `.env.local`.

### 2. Login com Google

1. Em [console.cloud.google.com](https://console.cloud.google.com), crie um projeto.
2. **APIs e serviços → Tela de consentimento OAuth**: tipo **Externo**, mantenha em modo **Teste** e adicione os dois e-mails como **usuários de teste**.
3. **Credenciais → Criar credenciais → ID do cliente OAuth** → tipo **Aplicativo da Web**.
   - **URIs de redirecionamento autorizados**: `https://SEU-PROJETO.supabase.co/auth/v1/callback` (o endereço exato aparece no Supabase, na tela do provedor Google).
4. No Supabase, em **Authentication → Sign In / Providers → Google**, ative e cole o **Client ID** e o **Client Secret**.

### 3. GitHub

1. Crie um repositório e envie o código.
2. Em **Settings → Secrets and variables → Actions**, crie `SUPABASE_URL` e `SUPABASE_ANON_KEY` com os mesmos valores do `.env.local`.
3. Em **Actions → Keep-alive do Supabase**, rode uma vez com **Run workflow** para conferir que funciona.

O GitHub desliga workflows agendados depois de 60 dias sem commit. Se isso acontecer, ele avisa por e-mail; basta reativar em **Actions**.

### 4. Cloudflare (Worker com arquivos estáticos)

O app é publicado como Worker só de arquivos estáticos (configuração em [wrangler.jsonc](wrangler.jsonc)), no plano gratuito. Endereço: https://treino.raphaleskbom.workers.dev

```powershell
npx wrangler login     # uma vez por computador
npm run deploy         # build + publicação
```

As variáveis `VITE_SUPABASE_*` entram no build a partir do `.env.local`.

## Critério de pronto do M0

- [ ] Instala na tela de início do iPhone (Safari → Compartilhar → Adicionar à Tela de Início)
- [ ] Instala na tela de início do Android (Chrome → Instalar app)
- [ ] Abre em modo avião depois de aberto uma vez com internet
- [x] Cadastro e login funcionam por e-mail/senha
- [ ] Login com Google funciona no app instalado (testar no iPhone em especial)
- [x] E-mail fora da lista é recusado (`email_nao_autorizado`)

## Critério de pronto do M1

- [ ] Raphael completa a anamnese e vê nível, restrições e meta de nutrição
- [ ] Julyana completa a anamnese e vê nível, restrições e meta de nutrição
- [ ] Os dados aparecem no Supabase (tabelas `anamneses`, `measurements`, `nutrition_targets`)
- [x] Sinal de alerta bloqueia treino e meta; liberação registrada desbloqueia (testes do motor e teste na tela)
