// Script de uso único: migra a tabela `users` (senha em texto puro) para
// contas reais do Supabase Auth, preservando a mesma senha de cada pessoa,
// e cria a linha correspondente em `profiles` (nome/role/permissões).
//
// Requer a SERVICE ROLE KEY do projeto (Supabase Dashboard > Settings > API).
// NUNCA salve essa chave em arquivo/commit — passe só como variável de
// ambiente na hora de rodar:
//
//   SUPABASE_SERVICE_ROLE_KEY=coloque_a_chave_aqui node scripts/migrate_users_to_auth.mjs
//
// Pré-requisito: rode scripts/migrate_to_supabase_auth.sql (PARTE A) antes,
// para a tabela `profiles` já existir.
//
// O script é seguro para rodar mais de uma vez: usuários cujo e-mail já
// existir em auth.users são pulados (só a linha em `profiles` é atualizada).

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valParts] = line.split('=');
  if (key && valParts.length > 0) {
    env[key.trim()] = valParts.join('=').trim();
  }
});

const url = env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  console.error('VITE_SUPABASE_URL não encontrada em .env.local');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error(
    'Defina SUPABASE_SERVICE_ROLE_KEY como variável de ambiente antes de rodar.\n' +
    'Exemplo: SUPABASE_SERVICE_ROLE_KEY=xxxx node scripts/migrate_users_to_auth.mjs'
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findAuthUserByEmail(email) {
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function migrate() {
  const { data: oldUsers, error } = await supabase.from('users').select('*');

  if (error) {
    console.error('Erro ao ler a tabela users:', error.message);
    process.exit(1);
  }

  console.log(`Encontrados ${oldUsers.length} usuários para migrar.\n`);

  const summary = { created: 0, alreadyExisted: 0, failed: 0 };

  for (const oldUser of oldUsers) {
    const email = (oldUser.email || '').trim().toLowerCase();
    if (!email) {
      console.warn(`- Pulando registro sem e-mail (id ${oldUser.id})`);
      summary.failed += 1;
      continue;
    }

    let authUser = null;

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: oldUser.password,
      email_confirm: true,
      user_metadata: { name: oldUser.name, role: oldUser.role },
    });

    if (createError) {
      if (String(createError.message || '').toLowerCase().includes('already')) {
        authUser = await findAuthUserByEmail(email);
        if (!authUser) {
          console.error(`- ${email}: já existia mas não consegui localizar em auth.users`);
          summary.failed += 1;
          continue;
        }
        summary.alreadyExisted += 1;
        console.log(`- ${email}: já existia em Auth, atualizando apenas o perfil.`);
      } else {
        console.error(`- ${email}: erro ao criar (${createError.message})`);
        summary.failed += 1;
        continue;
      }
    } else {
      authUser = created.user;
      summary.created += 1;
      console.log(`- ${email}: conta criada em Auth (senha preservada).`);
    }

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: authUser.id,
        name: oldUser.name,
        email,
        role: oldUser.role,
        permissions: oldUser.permissions || ['dashboard'],
        created_at: oldUser.createdAt || new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      console.error(`  Erro ao gravar profile de ${email}: ${profileError.message}`);
      summary.failed += 1;
    }
  }

  console.log('\n--- Resumo ---');
  console.log(`Criados agora: ${summary.created}`);
  console.log(`Já existiam (perfil atualizado): ${summary.alreadyExisted}`);
  console.log(`Falhas: ${summary.failed}`);
  console.log('\nConfira em Supabase Dashboard > Authentication > Users se todos aparecem.');
}

migrate();
