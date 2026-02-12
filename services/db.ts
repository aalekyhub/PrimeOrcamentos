
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL?.trim() || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY?.trim() || '';

const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http'))
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export const db = {
  isConnected: () => !!supabase,

  generateId(prefix: string) {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${random}`;
  },

  async save(key: string, data: any) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e: any) {
      console.warn(`[LocalStorage] Erro ao salvar ${key}: Limite de 5MB possivelmente excedido.`, e);
      // Se estourou o limite local E não tem supabase, é crítico.
      if (!supabase) {
        return { success: false, error: 'quota_exceeded' };
      }
    }

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
            return { success: false, error };
          }
          console.log(`[Cloud Sync] ${tableName} sincronizada com sucesso.`);
          return { success: true };
        }
        return { success: true };
      } catch (err) {
        console.error(`[Sync Error] Falha crítica:`, err);
        return { success: false, error: err };
      }
    }
    return { success: true };
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

    const tables = [
      'customers', 'catalog', 'orders', 'transactions', 'users', 'loans',
      'plans', 'plan_services', 'plan_materials', 'plan_labor', 'plan_indirects', 'plan_taxes',
      'works', 'work_services', 'work_materials', 'work_labor', 'work_indirects', 'work_taxes'
    ];
    const results: any = {};

    try {
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (!error && data) {
          results[table] = data;
          // Não gravamos no localStorage aqui para não apagar dados locais ainda não sincronizados.
          // App.tsx cuidará da mesclagem (Merge).
        } else if (error) {
          console.error(`Erro ao baixar ${table}:`, error.message);
          return { error: `Erro na tabela ${table}: ${error.message}` };
        }
      }
      return results;
    } catch (err) {
      console.error("[Cloud Sync] Erro ao baixar dados:", err);
      return null;
    }
  },

  async remove(key: string, id: string) {
    if (supabase) {
      const tableName = key.replace('serviflow_', '');
      try {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id);

        if (error) {
          console.error(`[Supabase Delete Error] Tabela: ${tableName}. Erro: ${error.message}`, error);
          return { success: false, error };
        } else {
          console.log(`[Cloud Sync] Item ${id} removido com sucesso de ${tableName}.`);
          return { success: true };
        }
      } catch (err) {
        console.error(`[Delete Error] Falha crítica ao remover item:`, err);
        return { success: false, error: err };
      }
    }
    return { success: true };
  }
};
