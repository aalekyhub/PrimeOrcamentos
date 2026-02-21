
import { openDB, IDBPDatabase } from 'idb';

export interface SinapiInsumoRecord {
    id: string; // ${mes_ref}_${uf}_${modo}_INS_${codigo}
    mes_ref: string;
    uf: string;
    modo: string;
    classificacao?: string;
    codigo: string;
    descricao: string;
    unidade: string;
    origem_preco?: string;
    preco_unitario: number;
}

export interface SinapiComposicaoRecord {
    id: string; // ${mes_ref}_${uf}_${modo}_COMP_${codigo}
    mes_ref: string;
    uf: string;
    modo: string;
    grupo?: string;
    codigo: string;
    descricao: string;
    unidade: string;
    custo_unitario: number;
    as_pct: number | null;
}

export interface SinapiComposicaoItemRecord {
    id: string; // ${mes_ref}_${uf}_${modo}_ANA_${codigo_composicao}_${tipo_item}_${codigo_item}
    mes_ref: string;
    uf: string;
    modo: string;
    codigo_composicao: string;
    grupo: string;
    tipo_item: 'INSUMO' | 'COMPOSICAO';
    codigo_item: string;
    descricao_item: string;
    unidade_item: string;
    coeficiente: number;
    custo_unitario?: number;
    custo_total?: number;
    situacao?: string;
}

const DB_NAME = 'primeorcamentos_sinapi';
const DB_VERSION = 3;

// Helper to normalize text for search (remove accents and lowercase)
const normalizeText = (text: string) => {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
};

export const sinapiDb = {
    async getDb(): Promise<IDBPDatabase> {
        return openDB(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, newVersion, transaction) {
                if (!db.objectStoreNames.contains('sinapi_insumos')) {
                    const store = db.createObjectStore('sinapi_insumos', { keyPath: 'id' });
                    store.createIndex('descricao', 'descricao');
                    store.createIndex('codigo', 'codigo');
                    store.createIndex('query', ['mes_ref', 'uf', 'modo']);
                }
                if (!db.objectStoreNames.contains('sinapi_composicoes')) {
                    const store = db.createObjectStore('sinapi_composicoes', { keyPath: 'id' });
                    store.createIndex('descricao', 'descricao');
                    store.createIndex('codigo', 'codigo');
                    store.createIndex('query', ['mes_ref', 'uf', 'modo']);
                }
                if (!db.objectStoreNames.contains('sinapi_composicao_itens')) {
                    const store = db.createObjectStore('sinapi_composicao_itens', { keyPath: 'id' });
                    store.createIndex('codigo_composicao', 'codigo_composicao');
                    store.createIndex('query', ['mes_ref', 'uf', 'modo', 'codigo_composicao']);
                }
            },
        });
    },

    async clearDataset(storeName: 'sinapi_insumos' | 'sinapi_composicoes' | 'sinapi_composicao_itens', mes_ref: string, uf: string, modo: string) {
        const db = await this.getDb();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const index = store.index('query');
        const range = IDBKeyRange.only([mes_ref, uf, modo]);

        // In v2, composite index for composition_itens has 4 parts. Adjust range if needed or clear by filtering
        // For simplicity, we'll iterate or use a refined range
        let cursor = await store.openCursor();
        while (cursor) {
            const val = cursor.value;
            if (val.mes_ref === mes_ref && val.uf === uf && val.modo === modo) {
                await cursor.delete();
            }
            cursor = await cursor.continue();
        }
        await tx.done;
    },

    async saveBatch(storeName: 'sinapi_insumos' | 'sinapi_composicoes' | 'sinapi_composicao_itens', records: any[]) {
        const db = await this.getDb();
        const tx = db.transaction(storeName, 'readwrite');
        for (const record of records) {
            await tx.store.put(record);
        }
        await tx.done;
    },

    async findInsumo(mes_ref: string, uf: string, modo: string, codigo: string): Promise<SinapiInsumoRecord | undefined> {
        const db = await this.getDb();
        const id = `${mes_ref}_${uf}_${modo}_INS_${codigo}`;
        return db.get('sinapi_insumos', id);
    },

    async findComposicao(mes_ref: string, uf: string, modo: string, codigo: string): Promise<SinapiComposicaoRecord | undefined> {
        const db = await this.getDb();
        const id = `${mes_ref}_${uf}_${modo}_COMP_${codigo}`;
        return db.get('sinapi_composicoes', id);
    },

    async getComposicaoItens(mes_ref: string, uf: string, modo: string, codigo_composicao: string): Promise<SinapiComposicaoItemRecord[]> {
        const db = await this.getDb();
        const all = await db.getAllFromIndex('sinapi_composicao_itens', 'codigo_composicao', codigo_composicao);
        return all.filter(item => item.mes_ref === mes_ref && item.uf === uf && item.modo === modo);
    },

    async searchComposicoes(query: string, filters: { uf: string; mes_ref: string; modo: string }) {
        const db = await this.getDb();

        // Otimização: Busca apenas registros que batem com o mês, UF e modo selecionados
        // usando o índice 'query' composto por [mes_ref, uf, modo]
        const all = await db.getAllFromIndex('sinapi_composicoes', 'query', IDBKeyRange.only([filters.mes_ref, filters.uf, filters.modo]));

        const normalizedQuery = normalizeText(query);
        const queryTerms = normalizedQuery.split(/\s+/).filter(t => t.length > 0);

        return all.filter(item => {
            const normalizedDesc = normalizeText(item.descricao);
            const itemCode = item.codigo;

            // Check if code matches OR if all terms are in the description
            const matchesCode = queryTerms.length === 1 && itemCode.includes(queryTerms[0]);
            const matchesDescription = queryTerms.every(term => normalizedDesc.includes(term));

            return matchesCode || matchesDescription;
        }).slice(0, 50);
    },

    async getMetadata() {
        const db = await this.getDb();
        const insumos = await db.count('sinapi_insumos');
        const composicoes = await db.count('sinapi_composicoes');
        const itens = await db.count('sinapi_composicao_itens');

        // Get unique datasets
        const allInsumos = await db.getAll('sinapi_insumos');
        const datasets = new Set<string>();
        allInsumos.forEach(item => datasets.add(`${item.mes_ref} - ${item.uf} (${item.modo})`));

        return {
            insumosCount: insumos,
            composicoesCount: composicoes,
            itensCount: itens,
            datasets: Array.from(datasets)
        };
    },

    async getStoreStats(storeName: 'sinapi_insumos' | 'sinapi_composicoes' | 'sinapi_composicao_itens', mes_ref: string, uf: string, modo: string) {
        const db = await this.getDb();
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index('query');

        let count = 0;
        // count() with index range
        if (storeName === 'sinapi_composicao_itens') {
            // For items, the index 'query' might have more fields or the structure might be different
            // Let's use a simpler check for records matching the prefix or use count()
            const all = await db.getAllFromIndex(storeName, 'query', IDBKeyRange.bound([mes_ref, uf, modo], [mes_ref, uf, modo, '\uffff']));
            count = all.length;
        } else {
            count = await index.count(IDBKeyRange.only([mes_ref, uf, modo]));
        }

        return count;
    },

    async getItemPrice(mes_ref: string, uf: string, modo: string, tipo: string, codigo: string): Promise<number> {
        if (tipo === 'COMPOSICAO') {
            const comp = await this.findComposicao(mes_ref, uf, modo, codigo);
            if (comp) return comp.custo_unitario;
        }
        const insumo = await this.findInsumo(mes_ref, uf, modo, codigo);
        if (insumo) return insumo.preco_unitario;

        // Final fallback: check the other table just in case the type was mislabeled
        if (tipo === 'INSUMO') {
            const comp = await this.findComposicao(mes_ref, uf, modo, codigo);
            if (comp) return comp.custo_unitario;
        } else {
            const insumo = await this.findInsumo(mes_ref, uf, modo, codigo);
            if (insumo) return insumo.preco_unitario;
        }

        return 0;
    },

    async updateInsumoPrice(id: string, newPrice: number) {
        const db = await this.getDb();
        const record = await db.get('sinapi_insumos', id);
        if (record) {
            record.preco_unitario = newPrice;
            await db.put('sinapi_insumos', record);
        }
    },

    async updateComposicaoPrice(id: string, newPrice: number) {
        const db = await this.getDb();
        const record = await db.get('sinapi_composicoes', id);
        if (record) {
            record.custo_unitario = newPrice;
            await db.put('sinapi_composicoes', record);
        }
    },

    async updateComposicaoItemPrice(id: string, newPrice: number) {
        const db = await this.getDb();
        const record = await db.get('sinapi_composicao_itens', id);
        if (record) {
            record.custo_unitario = newPrice;
            record.custo_total = record.coeficiente * newPrice;
            await db.put('sinapi_composicao_itens', record);
        } else {
            console.warn(`[sinapiDb] Registro não encontrado para atualização: ${id}`);
        }
    }
};
