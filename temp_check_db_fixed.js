import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valParts] = line.split('=');
  if (key && valParts.length > 0) {
    env[key.trim()] = valParts.join('=').trim();
  }
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

console.log('Connecting to Supabase:', url);
const supabase = createClient(url, key);

const tables = [
  'customers',
  'catalog',
  'orders',
  'transactions',
  'users',
  'company',
  'plans',
  'serviflow_financial_accounts',
  'serviflow_financial_categories',
  'serviflow_account_entries'
];

async function check() {
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false });
      
      if (error) {
        console.log(`Tabela "${table}": ERRO - ${error.message} (Código: ${error.code})`);
      } else {
        console.log(`Tabela "${table}": OK - Total de Registros: ${count}. Amostra de dados vazia? ${!data || data.length === 0}`);
      }
    } catch (e) {
      console.log(`Tabela "${table}": EXCEÇÃO - ${e.message}`);
    }
  }
}

check();
