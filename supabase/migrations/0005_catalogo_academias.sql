-- M2 — Catálogo de exercícios e academias.

-- ---------------------------------------------------------------------------
-- exercises: catálogo curado (data/exercises.pt.json). O id é o slug do
-- free-exercise-db, estável entre regerações. Carga em 0006 (gerada por
-- scripts/gerar-seed-exercicios.mjs). Pela API é só leitura.
-- ---------------------------------------------------------------------------
create table public.exercises (
  id                    text primary key,
  nome_pt               text not null,
  nome_en               text not null,
  padrao_movimento      text not null,
  musculo_primario      text not null,
  musculos_secundarios  text[] not null default '{}',
  equipamento           text not null,
  nivel                 text not null check (nivel in ('iniciante', 'intermediario', 'avancado')),
  mecanica              text,
  unilateral            boolean not null default false,
  instrucoes_pt         text[] not null default '{}',
  imagens               text[] not null default '{}',
  contraindicacoes      text[] not null default '{}'
);

alter table public.exercises enable row level security;

create policy "catálogo: logado lê" on public.exercises
  for select to authenticated using (true);

revoke all on public.exercises from anon, authenticated;
grant select on public.exercises to authenticated;

-- ---------------------------------------------------------------------------
-- gyms: academias de cada pessoa. Os equipamentos ficam numa lista dentro da
-- própria academia (chaves de data/equipamentos.json) em vez de uma tabela
-- gym_equipment: marcar um item é uma gravação só, sem conflito offline.
-- ---------------------------------------------------------------------------
create table public.gyms (
  id            uuid primary key,
  profile_id    uuid not null default auth.uid()
                references public.profiles (id) on delete cascade,
  nome          text not null check (length(trim(nome)) between 1 and 60),
  ativa         boolean not null default false,
  equipamentos  text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index gyms_profile_idx on public.gyms (profile_id);

alter table public.gyms enable row level security;

create policy "academia: dono lê" on public.gyms
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "academia: dono insere" on public.gyms
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "academia: dono altera" on public.gyms
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

revoke all on public.gyms from anon, authenticated;
grant select, insert on public.gyms to authenticated;
grant update (nome, ativa, equipamentos, updated_at) on public.gyms to authenticated;
