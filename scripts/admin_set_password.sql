-- ============================================================
-- Permite que um ADMINISTRADOR troque a senha de qualquer usuário
-- pela tela Usuários > Editar Acesso do sistema.
-- Rode UMA vez no Supabase: SQL Editor > New query > Run.
-- ============================================================

create or replace function public.admin_set_user_password(target_id uuid, new_password text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem alterar senhas.' using errcode = '42501';
  end if;

  if new_password is null or length(new_password) < 8 then
    raise exception 'A senha precisa ter pelo menos 8 caracteres.' using errcode = '22023';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = target_id;

  if not found then
    raise exception 'Usuário não encontrado no Supabase Auth.' using errcode = 'P0002';
  end if;
end;
$$;

-- Só usuários logados chamam; anônimos e o público não.
revoke all on function public.admin_set_user_password(uuid, text) from public, anon;
grant execute on function public.admin_set_user_password(uuid, text) to authenticated;
