-- Projetos Supabase novos não concedem acesso automático da API às tabelas
-- criadas no schema public. Sem isto, o próprio dono recebe 403 ao ler o perfil.
-- Regra: toda tabela nova declara aqui, explicitamente, o que cada papel pode
-- fazer; a RLS filtra as linhas em cima disso.

-- Quem não está logado não toca em perfis.
revoke all on public.profiles from anon;

-- Logado: lê (a RLS limita ao próprio perfil ou ao compartilhado) e edita
-- só os campos de domínio. id e created_at não mudam pela API.
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (nome, sexo, data_nascimento, altura_cm, compartilhar_progresso)
  on public.profiles to authenticated;
