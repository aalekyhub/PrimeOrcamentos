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
  'plan_services',
  'plan_materials',
  'plan_labor',
  'plan_indirects',
  'plan_taxes',
  'works',
  'work_services',
  'work_materials',
  'work_labor',
  'work_indirects',
  'work_taxes',
  'financial_accounts',
  'financial_categories',
  'account_entries'
];

async function check() {
  for (const table of tables) {
    const { error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`Tabela "${table}": ERRO - ${error.message}`);
    } else {
      console.log(`Tabela "${table}": OK - Total de Registros: ${count}`);
    }
  }
}

check();
