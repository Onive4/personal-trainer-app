-- M0 — Fundação: perfis, lista de e-mails autorizados e keep-alive.
-- Rodar no SQL Editor do Supabase (ou via `supabase db push`).

-- ---------------------------------------------------------------------------
-- Lista de e-mails autorizados
-- O cadastro é aberto na tela (e-mail/senha ou Google), mas só estes e-mails
-- conseguem criar conta. Sem nenhuma policy: o app nunca lê esta tabela.
-- ---------------------------------------------------------------------------
create table public.allowed_emails (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;
revoke all on public.allowed_emails from anon, authenticated;

create or replace function public.bloquear_email_nao_autorizado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.allowed_emails where email = lower(new.email)
  ) then
    raise exception 'email_nao_autorizado';
  end if;
  return new;
end;
$$;

create trigger antes_de_criar_usuario
  before insert on auth.users
  for each row execute function public.bloquear_email_nao_autorizado();

-- ---------------------------------------------------------------------------
-- Perfis — um por conta. profiles.id = auth.users.id.
-- Sexo, nascimento e altura são preenchidos na anamnese (M1).
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  sexo text check (sexo in ('masculino', 'feminino')),
  data_nascimento date,
  altura_cm numeric(5, 1) check (altura_cm between 100 and 250),
  compartilhar_progresso boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cada um lê o próprio perfil; o do outro só se ele liberou o compartilhamento.
-- (Anamnese terá policy própria, sempre restrita ao dono.)
create policy "ler proprio perfil ou compartilhado"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or compartilhar_progresso);

create policy "editar proprio perfil"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Sem policy de insert/delete: o perfil nasce pelo trigger abaixo e morre
-- junto com a conta.

create or replace function public.criar_perfil_do_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'nome',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    )
  );
  return new;
end;
$$;

create trigger depois_de_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_do_usuario();

-- ---------------------------------------------------------------------------
-- Keep-alive: o projeto free pausa após 7 dias sem atividade.
-- A GitHub Action chama esta função toda semana. Não expõe dado nenhum.
-- ---------------------------------------------------------------------------
create or replace function public.keep_alive()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select now();
$$;

grant execute on function public.keep_alive() to anon;
