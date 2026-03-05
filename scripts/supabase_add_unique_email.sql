-- SCRIPT PARA GARANTIR E-MAIL ÚNICO PARA USUÁRIOS
-- Executar no SQL Editor do Supabase

-- Adicionar regra de unicidade na tabela users para e-mails
alter table public.users
add constraint users_email_unique unique (email);
