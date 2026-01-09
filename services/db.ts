
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL?.trim() || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY?.trim() || '';

const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http')) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

export const db = {
  isConnected: () => !!supabase,

  async save(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));

    if (supabase) {
      const tableName = key.replace('serviflow_', '');
      
      try {
        const payload = Array.isArray(data) ? data : [data];
        
        if (payload.length > 0) {
          const { error } = await supabase
            .from(tableName)
            .upsert(payload, { onConflict: 'id' });
            
          if (error) {
            console.error(`[Supabase Error] Tabela: ${tableName}. Erro: ${error.message}`);
            if (error.message.includes('not found')) {
              console.warn(`DICA: Você precisa criar a tabela '${tableName}' no painel do Supabase (SQL Editor).`);
            }
          } else {
            console.log(`[Cloud Sync] ${tableName} sincronizada com sucesso.`);
          }
        }
      } catch (err) {
        console.error(`[Sync Error] Falha crítica:`, err);
      }
    }
  },

  load(key: string, defaultValue: any) {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;
    try {
      return JSON.parse(saved);
    } catch {
      return defaultValue;
    }
  },

  async syncFromCloud() {
    if (!supabase) return null;
    
    const tables = ['customers', 'catalog', 'orders', 'transactions'];
    const results: any = {};

    try {
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (!error && data) {
          results[table] = data;
          localStorage.setItem(`serviflow_${table}`, JSON.stringify(data));
        } else if (error) {
          console.error(`Erro ao baixar ${table}:`, error.message);
        }
      }
      return results;
    } catch (err) {
      console.error("[Cloud Sync] Erro ao baixar dados:", err);
      return null;
    }
  }
};
