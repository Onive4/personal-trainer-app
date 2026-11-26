-- M3 — Programa, mesociclo e slots.
--
-- A proposta fica só no celular até ser aprovada. Na aprovação, programa,
-- mesociclo e slots são inseridos de uma vez (ids gerados no celular, reenvio
-- idempotente). Depois disso só mudam: programs.ativo (quando outro programa
-- é aprovado) e mesocycles.status (M4/M5). Slots não mudam: trocar exercício
-- cria slot novo com substituiu_slot_id.
--
-- mesocycles e slots repetem profile_id para a RLS filtrar direto por auth.uid().

create table public.programs (
  id           uuid primary key,
  profile_id   uuid not null default auth.uid()
               references public.profiles (id) on delete cascade,
  nome         text not null,
  objetivo     text not null,
  dias_semana  smallint not null check (dias_semana between 2 and 6),
  criado_em    timestamptz not null default now(),
  ativo        boolean not null default true,
  updated_at   timestamptz not null default now()
);
create index programs_profile_idx on public.programs (profile_id);

create table public.mesocycles (
  id           uuid primary key,
  program_id   uuid not null references public.programs (id) on delete cascade,
  profile_id   uuid not null default auth.uid()
               references public.profiles (id) on delete cascade,
  numero       smallint not null check (numero > 0),
  semanas      smallint not null check (semanas between 2 and 8),
  enfase       text[] not null default '{}',
  status       text not null default 'aprovado'
               check (status in ('proposto', 'aprovado', 'em_andamento', 'concluido')),
  diagnostico  jsonb not null default '{}',
  aprovado_em  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index mesocycles_program_idx on public.mesocycles (program_id);
create index mesocycles_profile_idx on public.mesocycles (profile_id);

create table public.slots (
  id                  uuid primary key,
  mesocycle_id        uuid not null references public.mesocycles (id) on delete cascade,
  profile_id          uuid not null default auth.uid()
                      references public.profiles (id) on delete cascade,
  dia                 smallint not null check (dia between 1 and 6),
  ordem               smallint not null check (ordem > 0),
  exercise_id         text not null references public.exercises (id),
  padrao_movimento    text not null,
  tipo                text not null check (tipo in ('composto', 'acessorio')),
  series_alvo         smallint not null check (series_alvo between 1 and 10),
  rep_min             smallint not null check (rep_min > 0),
  rep_max             smallint not null check (rep_max >= rep_min),
  rir_semana          smallint[] not null,
  substituiu_slot_id  uuid references public.slots (id),
  motivo              text not null,
  created_at          timestamptz not null default now()
);
create index slots_mesocycle_idx on public.slots (mesocycle_id);
create index slots_profile_idx on public.slots (profile_id);
create index slots_exercise_idx on public.slots (exercise_id);
create index slots_substituiu_idx on public.slots (substituiu_slot_id);

alter table public.programs enable row level security;
alter table public.mesocycles enable row level security;
alter table public.slots enable row level security;

create policy "programa: dono lê" on public.programs for select to authenticated using (profile_id = (select auth.uid()));
create policy "programa: dono insere" on public.programs for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "programa: dono altera" on public.programs for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

-- O mesociclo só pode apontar para programa do mesmo dono.
create policy "mesociclo: dono lê" on public.mesocycles for select to authenticated using (profile_id = (select auth.uid()));
create policy "mesociclo: dono insere" on public.mesocycles for insert to authenticated with check (
  profile_id = (select auth.uid())
  and exists (select 1 from public.programs p where p.id = program_id and p.profile_id = (select auth.uid()))
);
create policy "mesociclo: dono altera" on public.mesocycles for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create policy "slot: dono lê" on public.slots for select to authenticated using (profile_id = (select auth.uid()));
create policy "slot: dono insere" on public.slots for insert to authenticated with check (
  profile_id = (select auth.uid())
  and exists (select 1 from public.mesocycles m where m.id = mesocycle_id and m.profile_id = (select auth.uid()))
);

revoke all on public.programs, public.mesocycles, public.slots from anon, authenticated;
grant select, insert on public.programs, public.mesocycles, public.slots to authenticated;
grant update (ativo, updated_at) on public.programs to authenticated;
grant update (status, updated_at) on public.mesocycles to authenticated;
