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
let _tombstones: Set<string> = new Set();
let _realtimeChannel: any = null;

const SMALL_KEYS = [
  'serviflow_session',
  'serviflow_dark_mode',
  'serviflow_company',
  'serviflow_tombstones',
  'serviflow_users'
];

const TOMBSTONE_KEYS = new Set([
  'serviflow_orders',
  'serviflow_plans',
  'serviflow_works',
  'serviflow_customers',
  'serviflow_transactions',
  'serviflow_loans'
]);

const CLOUD_TABLES = [
  'customers', 'catalog', 'orders', 'transactions', 'users', 'loans', 'company',
  'plans', 'plan_services', 'plan_materials', 'plan_labor', 'plan_indirects', 'plan_taxes',
  'works', 'work_services', 'work_materials', 'work_labor', 'work_indirects', 'work_taxes'
];

const REALTIME_TABLES = ['orders', 'plans', 'works'];

const getStorageKeyFromTable = (table: string) => `serviflow_${table}`;

const persistTombstones = () => {
  try {
    localStorage.setItem('serviflow_tombstones', JSON.stringify(Array.from(_tombstones)));
  } catch (err) {
    console.warn('[Tombstones] Falha ao salvar tombstones no localStorage.', err);
  }
};

const isItemDeleted = (item: any) => {
  if (!item || !item.id) return false;
  return _tombstones.has(item.id);
};

const filterDeletedItems = (data: any) => {
  if (!Array.isArray(data)) return data;
  return data.filter((item: any) => !isItemDeleted(item));
};

const applyTombstonesToCache = () => {
  Object.keys(_cache).forEach((key) => {
    if (Array.isArray(_cache[key])) {
      _cache[key] = _cache[key].filter((item: any) => !isItemDeleted(item));
    }
  });
};

const persistKeyLocally = async (key: string, data: any) => {
  try {
    const idb = await getDB();
    await idb.put(STORE_NAME, data, key);

    if (SMALL_KEYS.includes(key) || key.length < 50) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (lsError) {
        console.warn(`[LocalStorage Quota] Falha ao espelhar ${key}, mas salvo no IDB.`);
      }
    }
  } catch (e) {
    console.error(`[Storage Error] Falha crítica ao salvar ${key}:`, e);
  }
};

const registerRemoteDeletion = async (tableName: string, recordId: string) => {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('deleted_records')
      .insert({
        table_name: tableName,
        record_id: recordId
      });

    if (error) {
      console.error(`[Deleted Records] Erro ao registrar exclusão de ${tableName}/${recordId}: ${error.message}`);
    }
  } catch (err) {
    console.error(`[Deleted Records] Falha crítica ao registrar exclusão de ${tableName}/${recordId}:`, err);
  }
};

const syncDeletedRecordsFromCloud = async () => {
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('deleted_records')
      .select('table_name, record_id, deleted_at');

    if (error) {
      console.error(`[Deleted Records] Erro ao baixar exclusões: ${error.message}`);
      return;
    }

    const deletedRows = data || [];

    for (const row of deletedRows) {
      const storageKey = getStorageKeyFromTable(row.table_name);
      _tombstones.add(row.record_id);

      if (Array.isArray(_cache[storageKey])) {
        _cache[storageKey] = _cache[storageKey].filter((item: any) => item?.id !== row.record_id);
      }
    }

    persistTombstones();

    for (const key of Object.keys(_cache)) {
      await persistKeyLocally(key, _cache[key]);
    }
  } catch (err) {
    console.error('[Deleted Records] Falha crítica ao sincronizar exclusões:', err);
  }
};

const persistArrayKey = async (key: string) => {
  if (!Array.isArray(_cache[key])) return;
  await persistKeyLocally(key, _cache[key]);
};

const upsertIntoCacheArray = async (key: string, row: any) => {
  if (!row?.id) return;
  if (_tombstones.has(row.id)) return;

  const current = Array.isArray(_cache[key]) ? [..._cache[key]] : [];
  const index = current.findIndex((item: any) => item?.id === row.id);

  if (index >= 0) {
    current[index] = row;
  } else {
    current.push(row);
  }

  _cache[key] = filterDeletedItems(current);
  await persistArrayKey(key);
};

const removeFromCacheArray = async (key: string, id: string) => {
  if (!Array.isArray(_cache[key])) {
    _cache[key] = [];
  } else {
    _cache[key] = _cache[key].filter((item: any) => item?.id !== id);
  }

  await persistArrayKey(key);
};

const handleRemoteDeletion = async (tableName: string, recordId: string) => {
  const storageKey = getStorageKeyFromTable(tableName);
  _tombstones.add(recordId);
  persistTombstones();
  await removeFromCacheArray(storageKey, recordId);
};

const bindRealtimeForTable = (channel: any, tableName: string) => {
  const storageKey = getStorageKeyFromTable(tableName);

  channel
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: tableName },
      async (payload: any) => {
        const row = payload?.new;
        if (!row?.id) return;
        if (_tombstones.has(row.id)) return;
        await upsertIntoCacheArray(storageKey, row);
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: tableName },
      async (payload: any) => {
        const row = payload?.new;
        if (!row?.id) return;
        if (_tombstones.has(row.id)) return;
        await upsertIntoCacheArray(storageKey, row);
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: tableName },
      async (payload: any) => {
        const row = payload?.old;
        if (!row?.id) return;
        await handleRemoteDeletion(tableName, row.id);
      }
    );
};

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

  keys.forEach((key, index) => {
    _cache[key as string] = values[index];
  });

  const savedTombstones = localStorage.getItem('serviflow_tombstones');
  if (savedTombstones) {
    try {
      _tombstones = new Set(JSON.parse(savedTombstones));
    } catch {
      _tombstones = new Set();
    }
  }

  const localStorageKeys = Object.keys(localStorage);
  const migratableKeys = localStorageKeys.filter(k => k.startsWith('serviflow_'));

  if (migratableKeys.length > 0) {
    console.log(`[Migration] Encontradas ${migratableKeys.length} chaves no LocalStorage. Migrando para IDB...`);
    for (const key of migratableKeys) {
      const isMissingInIDB = _cache[key] === undefined;

      if (isMissingInIDB) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            if (parsed && (!Array.isArray(parsed) || parsed.length > 0)) {
              _cache[key] = parsed;
              await db.put(STORE_NAME, parsed, key);
              console.log(`[Migration] Dados migrados do LocalStorage para: ${key}`);
            }
          } catch {
            console.warn(`[Migration] Erro ao migrar chave ${key}`);
          }
        }
      }
    }
  }

  applyTombstonesToCache();

  for (const key of Object.keys(_cache)) {
    await persistKeyLocally(key, _cache[key]);
  }

  await syncDeletedRecordsFromCloud();
};

// Pre-initialize and export the promise so we can await it if needed
export const initPromise = initCache().catch(console.error);

export const startRealtimeSync = async () => {
  if (!supabase) return { success: false, error: 'Sem conexão com Supabase' };

  try {
    await syncDeletedRecordsFromCloud();

    if (_realtimeChannel) {
      await supabase.removeChannel(_realtimeChannel);
      _realtimeChannel = null;
    }

    const channel = supabase.channel('primeorcamentos-realtime');

    for (const tableName of REALTIME_TABLES) {
      bindRealtimeForTable(channel, tableName);
    }

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'deleted_records' },
      async (payload: any) => {
        const row = payload?.new;
        if (!row?.table_name || !row?.record_id) return;
        await handleRemoteDeletion(row.table_name, row.record_id);
      }
    );

    _realtimeChannel = channel;

    _realtimeChannel.subscribe((status: string) => {
      console.log('[Realtime]', status);
    });

    return { success: true };
  } catch (err) {
    console.error('[Realtime] Falha ao iniciar sincronização em tempo real:', err);
    return { success: false, error: err };
  }
};

export const stopRealtimeSync = async () => {
  if (!supabase || !_realtimeChannel) return { success: true };

  try {
    await supabase.removeChannel(_realtimeChannel);
    _realtimeChannel = null;
    return { success: true };
  } catch (err) {
    console.error('[Realtime] Falha ao encerrar canal:', err);
    return { success: false, error: err };
  }
};

export const db = {
  isConnected: () => !!supabase,

  generateId(prefix: string) {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${random}`;
  },

  async save(key: string, data: any, singleItem?: any, skipCloud: boolean = false) {
    const sanitizedData = filterDeletedItems(data);
    const sanitizedSingleItem = Array.isArray(singleItem)
      ? filterDeletedItems(singleItem)
      : (isItemDeleted(singleItem) ? null : singleItem);

    _cache[key] = sanitizedData;

    await persistKeyLocally(key, sanitizedData);

    if (supabase && !skipCloud) {
      (async () => {
        const tableName = key.replace('serviflow_', '');
        try {
          const rawPayload = sanitizedSingleItem
            ? (Array.isArray(sanitizedSingleItem) ? sanitizedSingleItem : [sanitizedSingleItem])
            : (Array.isArray(sanitizedData) ? sanitizedData : [sanitizedData]);

          const payload = rawPayload.filter((item: any) => {
            if (!item) return false;
            if (!item.id) return true;
            return !_tombstones.has(item.id);
          });

          if (payload.length > 0) {
            console.log(`[Sync Background] Iniciando para ${tableName}...`);
            const conflictKey = tableName === 'users' ? 'email' : 'id';
            const { error } = await supabase
              .from(tableName)
              .upsert(payload, { onConflict: conflictKey });

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

    return { success: true };
  },

  async saveLocal(key: string, data: any) {
    return this.save(key, data, null, true);
  },

  load(key: string, defaultValue: any) {
    if (_cache[key] !== undefined) {
      return _cache[key];
    }

    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;

    try {
      const data = JSON.parse(saved);
      const sanitized = filterDeletedItems(data);
      return (sanitized === null || sanitized === undefined) ? defaultValue : sanitized;
    } catch {
      return defaultValue;
    }
  },

  async syncFromCloud() {
    if (!supabase) return null;

    const results: any = {};
    const errors: any = {};

    try {
      await syncDeletedRecordsFromCloud();

      const fetchPromises = CLOUD_TABLES.map(async (table) => {
        const { data, error } = await supabase.from(table).select('*');
        if (error) {
          console.error(`Erro ao baixar ${table}:`, error.message);
          return { table, error: error.message };
        }
        return { table, data };
      });

      const responses = await Promise.all(fetchPromises);

      for (const response of responses) {
        if ('error' in response) {
          errors[response.table] = response.error;
          continue;
        }

        const storageKey = getStorageKeyFromTable(response.table);
        const sanitizedData = filterDeletedItems(response.data);
        results[response.table] = sanitizedData;

        _cache[storageKey] = sanitizedData;
        await persistKeyLocally(storageKey, sanitizedData);
      }

      return { results, errors };
    } catch (err) {
      console.error('[Cloud Sync] Erro ao baixar dados:', err);
      return { results: {}, errors: { global: (err as any).message } };
    }
  },

  async remove(key: string, id: string) {
    const tableName = key.replace('serviflow_', '');

    if (TOMBSTONE_KEYS.has(key)) {
      _tombstones.add(id);
      persistTombstones();
    }

    if (Array.isArray(_cache[key])) {
      _cache[key] = _cache[key].filter((item: any) => item.id !== id);
    }

    try {
      const idb = await getDB();
      if (Array.isArray(_cache[key])) {
        await idb.put(STORE_NAME, _cache[key], key);
        localStorage.setItem(key, JSON.stringify(_cache[key]));
      } else {
        await idb.delete(STORE_NAME, key);
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.error(`[Storage Delete Error] ${e}`);
    }

    if (supabase) {
      try {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id);

        if (error) {
          console.error(`[Supabase Delete Error] Tabela: ${tableName}. Erro: ${error.message}`);
          return { success: false, error };
        }

        if (TOMBSTONE_KEYS.has(key)) {
          await registerRemoteDeletion(tableName, id);
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
    let deletedCount = 0;
    const tableName = key.replace('serviflow_', '');

    if (TOMBSTONE_KEYS.has(key) && column === 'id') {
      _tombstones.add(value);
      persistTombstones();
    }

    if (Array.isArray(_cache[key])) {
      const initialLength = _cache[key].length;
      _cache[key] = _cache[key].filter((item: any) => item[column] !== value);
      deletedCount = initialLength - _cache[key].length;
    }

    try {
      const idb = await getDB();
      if (Array.isArray(_cache[key])) {
        await idb.put(STORE_NAME, _cache[key], key);
        localStorage.setItem(key, JSON.stringify(_cache[key]));
      } else {
        await idb.delete(STORE_NAME, key);
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.error(`[Storage Delete Error] ${e}`);
      if (Array.isArray(_cache[key])) {
        localStorage.setItem(key, JSON.stringify(_cache[key]));
      }
    }

    if (supabase) {
      try {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq(column, value);

        if (error) {
          if (
            error.code === 'PGRST116' ||
            error.message.includes('relation') ||
            error.message.includes('does not exist')
          ) {
            console.warn(`[Supabase Delete] Tabela ${tableName} não existe. Ignorando.`);
          } else {
            console.error(`[Supabase Delete Error] Tabela: ${tableName}. Erro: ${error.message}`);
            throw new Error(`Falha na nuvem: ${error.message}`);
          }
        }

        if (TOMBSTONE_KEYS.has(key) && column === 'id') {
          await registerRemoteDeletion(tableName, value);
        }
      } catch (err) {
        console.warn(`[Delete] Erro ignorado ou tratado para ${tableName}:`, err);
      }
    }

    return { success: true, deletedCount };
  },

  async forceUploadAll() {
    if (!supabase) return { success: false, error: 'Sem conexão com Supabase' };

    await syncDeletedRecordsFromCloud();

    const keys = [
      'serviflow_customers', 'serviflow_catalog', 'serviflow_orders', 'serviflow_transactions',
      'serviflow_users', 'serviflow_loans', 'serviflow_plans', 'serviflow_plan_services',
      'serviflow_plan_materials', 'serviflow_plan_labor', 'serviflow_plan_indirects', 'serviflow_plan_taxes',
      'serviflow_works', 'serviflow_work_services', 'serviflow_work_materials', 'serviflow_work_labor',
      'serviflow_work_indirects', 'serviflow_work_taxes'
    ];

    let totalUpdated = 0;

    for (const key of keys) {
      const data = filterDeletedItems(_cache[key] || []);
      if (Array.isArray(data) && data.length > 0) {
        const tableName = key.replace('serviflow_', '');
        const payload = data.filter((item: any) => !isItemDeleted(item));
        if (payload.length === 0) continue;

        const conflictKey = tableName === 'users' ? 'email' : 'id';
        const { error } = await supabase.from(tableName).upsert(payload, { onConflict: conflictKey });
        if (!error) totalUpdated += payload.length;
      }
    }

    return { success: true, count: totalUpdated };
  },

  isDeleted(id: string) {
    return _tombstones.has(id);
  },

  async refreshDeletedRecords() {
    await syncDeletedRecordsFromCloud();
    return { success: true };
  },

  async clearAll() {
    const idb = await getDB();
    await idb.clear(STORE_NAME);
    _cache = {};
    _tombstones = new Set();
    localStorage.removeItem('serviflow_tombstones');
    return { success: true };
  }
};