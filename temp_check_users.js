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

async function run() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('Users found:');
    data.forEach(user => {
      console.log(`- ID: ${user.id} | Name: ${user.name} | Email: ${user.email} | Password: ${user.password} | Role: ${user.role}`);
    });
  }
}
run();
