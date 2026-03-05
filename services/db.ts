
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
  const [keys, values] = await Promise.all([
    db.getAllKeys(STORE_NAME),
    db.getAll(STORE_NAME)
  ]);

  // Load everything into cache in one go
  keys.forEach((key, index) => {
    _cache[key as string] = values[index];
  });

  // Check for migration from LocalStorage (Legacy)
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

  async save(key: string, data: any, singleItem?: any, skipCloud: boolean = false) {
    // 1. Update Cache immediately for synchronous consistency
    _cache[key] = data;

    // 2. Save to IndexedDB (always full list for offline reliability)
    try {
      const idb = await getDB();
      await idb.put(STORE_NAME, data, key);
    } catch (e) {
      console.error(`[IDB Error] Falha ao salvar ${key} no IndexedDB:`, e);
    }

    // 3. Sync to Supabase in the background if available and skipCloud is false
    if (supabase && !skipCloud) {
      // Create an IIFE to handle the background sync without awaiting it
      (async () => {
        const tableName = key.replace('serviflow_', '');
        try {
          // Optimization: If singleItem is provided, sync ONLY that item
          const payload = singleItem
            ? (Array.isArray(singleItem) ? singleItem : [singleItem])
            : (Array.isArray(data) ? data : [data]);

          if (payload.length > 0) {
            console.log(`[Sync Background] Iniciando para ${tableName}...`);
            const { error } = await supabase
              .from(tableName)
              .upsert(payload, { onConflict: 'id' });

            if (error) {
              console.error(`[Supabase Error] Tabela: ${tableName}. Erro: ${error.message}`);
            } else {
              console.log(`[Sync Background] ${tableName} atualizado com sucesso.`);
            }
          }
        } catch (err) {
          console.error(`[Sync Error Background] Falha crítica no Supabase para ${tableName}:`, err);
        }
      })();
    }

    // Return success immediately after local save
    return { success: true };
  },

  // Helper for local-only saves (useful during cloud sync to avoid feedback loops)
  async saveLocal(key: string, data: any) {
    return this.save(key, data, null, true);
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
      // Parallelize fetching for significantly better performance
      const fetchPromises = tables.map(async (table) => {
        const { data, error } = await supabase.from(table).select('*');
        if (error) {
          console.error(`Erro ao baixar ${table}:`, error.message);
          return { table, error };
        }
        return { table, data };
      });

      const responses = await Promise.all(fetchPromises);

      for (const response of responses) {
        if ('error' in response) {
          // If any critical table fails, we might want to know, but let's keep going for others
          // Unless it's a critical error we want to bubble up
          continue;
        }
        results[response.table] = response.data;
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
  },

  async deleteByCondition(key: string, column: string, value: any) {
    // 1. Remove from cache if it's an array field
    let deletedCount = 0;
    if (Array.isArray(_cache[key])) {
      const initialLength = _cache[key].length;
      _cache[key] = _cache[key].filter((item: any) => item[column] !== value);
      deletedCount = initialLength - _cache[key].length;
    }

    // 2. Remove from IndexedDB
    try {
      const idb = await getDB();
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
          .eq(column, value);

        if (error) {
          console.error(`[Supabase Delete Error] Tabela: ${tableName}. Erro: ${error.message}`);
          return { success: false, error };
        }
      } catch (err) {
        console.error(`[Delete Error] Falha crítica ao remover do Supabase:`, err);
        return { success: false, error: err };
      }
    }
    return { success: true, deletedCount };
  }
};
