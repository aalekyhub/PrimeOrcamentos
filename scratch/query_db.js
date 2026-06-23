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

const supabase = createClient(url, key);

async function check() {
  console.log('--- ACCOUNT ENTRIES ---');
  const { data: entries, error: err1 } = await supabase
    .from('serviflow_account_entries')
    .select('*')
    .in('amount', [27425.70, 8000, 2300, 19300, 5450.14, 1412]);
  
  if (err1) {
    console.error('Error entries:', err1);
  } else {
    entries.forEach(e => {
      console.log(`ID: ${e.id} | Desc: ${e.description} | Type: ${e.type} | Cat: ${e.category} | Status: ${e.status} | Amount: ${e.amount}`);
    });
  }

  console.log('\n--- TRANSACTIONS ---');
  const { data: trans, error: err2 } = await supabase
    .from('serviflow_transactions')
    .select('*')
    .in('amount', [27425.70, 8000, 2300, 19300, 5450.14, 1412]);

  if (err2) {
    console.error('Error trans:', err2);
  } else {
    trans.forEach(t => {
      console.log(`ID: ${t.id} | Desc: ${t.description} | Type: ${t.type} | Cat: ${t.category} | EntryID: ${t.entryId} | Amount: ${t.amount}`);
    });
  }
}

check();
