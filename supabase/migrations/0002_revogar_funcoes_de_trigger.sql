-- Funções de trigger não devem ser chamáveis pela API (/rest/v1/rpc/...).
-- O trigger continua disparando: a permissão de EXECUTE só é checada na
-- criação do trigger, não a cada disparo.
revoke execute on function public.bloquear_email_nao_autorizado() from public, anon, authenticated;
revoke execute on function public.criar_perfil_do_usuario() from public, anon, authenticated;
