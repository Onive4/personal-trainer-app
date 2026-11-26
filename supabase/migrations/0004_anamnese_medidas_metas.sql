-- M1 — Anamnese, medidas corporais e metas nutricionais.
--
-- As três tabelas são append-only pela API: o app só insere e lê. Refazer a
-- anamnese ou registrar liberação médica cria uma versão nova; corrigir uma
-- medida cria um registro novo. Os ids são gerados no celular (crypto.randomUUID)
-- para que o reenvio da fila seja idempotente (insert ... on conflict do nothing).
--
-- Privacidade: cada pessoa lê só as próprias linhas. A anamnese continua
-- privada mesmo com compartilhar_progresso ligado. A leitura mútua de medidas
-- para os painéis fica para o M6.

-- ---------------------------------------------------------------------------
-- anamneses
-- ---------------------------------------------------------------------------
create table public.anamneses (
  id               uuid primary key,
  profile_id       uuid not null default auth.uid()
                   references public.profiles (id) on delete cascade,
  versao           integer not null check (versao > 0),
  respostas        jsonb not null,
  clearance_status text not null
                   check (clearance_status in ('liberado', 'orientar_avaliacao', 'liberado_por_registro')),
  constraints      text[] not null default '{}',
  nivel            text not null check (nivel in ('iniciante', 'intermediario', 'avancado')),
  objetivo         text not null
                   check (objetivo in ('hipertrofia', 'forca', 'emagrecimento', 'condicionamento', 'saude')),
  liberacao        jsonb,          -- { data, profissional, registrado_em } quando houver
  data             timestamptz not null,
  created_at       timestamptz not null default now(),
  unique (profile_id, versao)
);

create index anamneses_profile_idx on public.anamneses (profile_id, versao desc);

alter table public.anamneses enable row level security;

create policy "anamnese: dono lê" on public.anamneses
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "anamnese: dono insere" on public.anamneses
  for insert to authenticated with check (profile_id = (select auth.uid()));

revoke all on public.anamneses from anon, authenticated;
grant select, insert on public.anamneses to authenticated;

-- ---------------------------------------------------------------------------
-- measurements (circunferências em cm)
-- ---------------------------------------------------------------------------
create table public.measurements (
  id           uuid primary key,
  profile_id   uuid not null default auth.uid()
               references public.profiles (id) on delete cascade,
  data         date not null,
  peso_kg      numeric(5, 2) not null check (peso_kg > 0 and peso_kg < 400),
  pescoco      numeric(5, 1) check (pescoco > 0),
  cintura      numeric(5, 1) check (cintura > 0),
  quadril      numeric(5, 1) check (quadril > 0),
  torax        numeric(5, 1) check (torax > 0),
  braco_d      numeric(5, 1) check (braco_d > 0),
  braco_e      numeric(5, 1) check (braco_e > 0),
  coxa_d       numeric(5, 1) check (coxa_d > 0),
  coxa_e       numeric(5, 1) check (coxa_e > 0),
  panturrilha  numeric(5, 1) check (panturrilha > 0),
  bf_estimado  numeric(4, 1),
  created_at   timestamptz not null default now()
);

create index measurements_profile_idx on public.measurements (profile_id, data desc);

alter table public.measurements enable row level security;

create policy "medidas: dono lê" on public.measurements
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "medidas: dono insere" on public.measurements
  for insert to authenticated with check (profile_id = (select auth.uid()));

revoke all on public.measurements from anon, authenticated;
grant select, insert on public.measurements to authenticated;

-- ---------------------------------------------------------------------------
-- nutrition_targets
-- ---------------------------------------------------------------------------
create table public.nutrition_targets (
  id                    uuid primary key,
  profile_id            uuid not null default auth.uid()
                        references public.profiles (id) on delete cascade,
  data                  date not null,
  tmb                   integer not null,
  tdee                  integer not null,
  kcal_alvo             integer not null,
  proteina_g            integer not null,
  gordura_g             integer not null,
  carbo_g               integer not null,
  objetivo              text not null,
  peso_alvo_semana_pct  numeric(4, 2) not null,
  motivo                text not null,  -- o que gerou esta meta (gatilho registrado)
  created_at            timestamptz not null default now()
);

create index nutrition_targets_profile_idx on public.nutrition_targets (profile_id, data desc);

alter table public.nutrition_targets enable row level security;

create policy "metas: dono lê" on public.nutrition_targets
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "metas: dono insere" on public.nutrition_targets
  for insert to authenticated with check (profile_id = (select auth.uid()));

revoke all on public.nutrition_targets from anon, authenticated;
grant select, insert on public.nutrition_targets to authenticated;
