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
  console.log('Querying columns for orders table...');
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching order row:', error);
  } else {
    console.log('Sample order row:', data[0]);
    if (data[0]) {
      console.log('Keys in order row:', Object.keys(data[0]));
    } else {
      console.log('No rows in orders table');
    }
  }
}

check();
