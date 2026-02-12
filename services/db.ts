
import { createClient } from '@supabase/supabase-js';
import { openDB, IDBPDatabase } from 'idb';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL?.trim() || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY?.trim() || '';

const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http'))
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const DB_NAME = 'PrimeOrcamentosDB';
const DB_VERSION = 1;
const STORE_NAME = 'keyvalue';

let _dbPromise: Promise<IDBPDatabase> | null = null;
let _cache: Record<string, any> = {};

// Helper to get the DB instance
const getDB = () => {
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return _dbPromise;
};

// Initialize cache from IDB and LocalStorage (migration)
const initCache = async () => {
  const db = await getDB();
  const allKeys = await db.getAllKeys(STORE_NAME);

  // Load everything from IDB into cache
  for (const key of allKeys) {
    const value = await db.get(STORE_NAME, key);
    _cache[key as string] = value;
  }

  // Check for migration from LocalStorage
  const localStorageKeys = Object.keys(localStorage);
  const migratableKeys = localStorageKeys.filter(k => k.startsWith('serviflow_'));

  if (migratableKeys.length > 0) {
    console.log(`[Migration] Encontradas ${migratableKeys.length} chaves no LocalStorage. Migrando para IDB...`);
    for (const key of migratableKeys) {
      if (!_cache[key]) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            await db.put(STORE_NAME, parsed, key);
            _cache[key] = parsed;
          } catch (e) {
            console.warn(`[Migration] Erro ao migrar chave ${key}`);
          }
        }
      }
      // Opcional: localStorage.removeItem(key) após garantir migração segura.
      // Por enquanto, manteremos no localStorage como backup até validação.
    }
  }
};

// Pre-initialize
initCache().catch(console.error);

export const db = {
  isConnected: () => !!supabase,

  generateId(prefix: string) {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${random}`;
  },

  async save(key: string, data: any) {
    // 1. Update Cache immediately for synchronous consistency
    _cache[key] = data;

    // 2. Save to IndexedDB
    try {
      const idb = await getDB();
      await idb.put(STORE_NAME, data, key);
    } catch (e) {
      console.error(`[IDB Error] Falha ao salvar ${key} no IndexedDB:`, e);
    }

    // 3. Sync to Supabase if available
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
          return { success: true };
        }
      } catch (err) {
        console.error(`[Sync Error] Falha crítica no Supabase:`, err);
        return { success: false, error: err };
      }
    }
    return { success: true };
  },

  load(key: string, defaultValue: any) {
    // Sync reading from cache. 
    // If cache not yet loaded, fallback to localStorage temporarily for fast first boot
    if (_cache[key] !== undefined) {
      return _cache[key];
    }

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
          // Note: App.tsx merges these and calls db.save(), which updates IDB and cache.
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
    // 1. Remove from cache if it's an array field
    if (Array.isArray(_cache[key])) {
      _cache[key] = _cache[key].filter((item: any) => item.id !== id);
    }

    // 2. Remove from IndexedDB
    try {
      const idb = await getDB();
      // If the field is one table (like company), we might remove the whole key or just part of it.
      // But serviflow_orders for example stores all orders in one key.
      // If so, we just put back the filtered array.
      if (Array.isArray(_cache[key])) {
        await idb.put(STORE_NAME, _cache[key], key);
      }
    } catch (e) {
      console.error(`[IDB Delete Error] ${e}`);
    }

    // 3. Remove from Supabase
    if (supabase) {
      const tableName = key.replace('serviflow_', '');
      try {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id);

        if (error) {
          console.error(`[Supabase Delete Error] Tabela: ${tableName}. Erro: ${error.message}`);
          return { success: false, error };
        }
        return { success: true };
      } catch (err) {
        console.error(`[Delete Error] Falha crítica ao remover do Supabase:`, err);
        return { success: false, error: err };
      }
    }
    return { success: true };
  }
};
