
import * as XLSX from 'xlsx';
import { SinapiInsumoRecord, SinapiComposicaoRecord } from './sinapiDb';

export interface ParseResult {
    type: 'INSUMO' | 'COMPOSICAO';
    uf: string;
    mes_ref: string;
    modo: 'SD' | 'CD' | 'SE';
    data: any[];
}

export const sinapiParser = {
    async parseFile(file: File): Promise<ParseResult> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: "" }) as any[][];

                    const filename = file.name.toUpperCase();
                    const metadata = this.extractMetadata(jsonData, filename);
                    const type = this.detectType(jsonData);

                    if (type === 'INSUMO') {
                        const records = this.parseInsumos(jsonData, metadata);
                        resolve({ ...metadata, type, data: records });
                    } else {
                        const records = this.parseComposicoes(jsonData, metadata);
                        resolve({ ...metadata, type, data: records });
                    }
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    },

    extractMetadata(rows: any[][], filename: string) {
        let uf = 'BR';
        let mes_ref = 'N/A';
        let modo: 'SD' | 'CD' | 'SE' = 'SD';

        const ufs = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

        for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const line = String(rows[i].join(' ')).toUpperCase();
            if (line.includes('SEM DESONERAÇÃO') || line.includes('SEM DESONERACAO')) modo = 'SD';
            if (line.includes('COM DESONERAÇÃO') || line.includes('COM DESONERACAO')) modo = 'CD';
            if (line.includes('SEM ENCARGOS')) modo = 'SE';

            const dateMatch = line.match(/(\d{2}\/\d{4})/);
            if (dateMatch) mes_ref = dateMatch[1];

            for (const u of ufs) {
                if (line.includes(` ${u} `) || line.includes(`-${u}`) || (line.includes('ESTADO:') && line.includes(u))) {
                    uf = u;
                }
            }
        }

        if (uf === 'BR') {
            const ufMatch = filename.match(/_(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)/);
            if (ufMatch) uf = ufMatch[1];
        }

        return { uf, mes_ref, modo };
    },

    detectType(rows: any[][]): 'INSUMO' | 'COMPOSICAO' {
        for (let i = 0; i < Math.min(rows.length, 30); i++) {
            const line = String(rows[i].join(' ')).toUpperCase();
            if (line.includes('COMPOSIÇÕES') || line.includes('COMPOSICOES') || line.includes('CÓDIGO DA COMPOSIÇÃO')) return 'COMPOSICAO';
            if (line.includes('INSUMOS') || line.includes('CODIGO INSUMOS')) return 'INSUMO';
        }
        return 'INSUMO';
    },

    parseInsumos(rows: any[][], meta: any): SinapiInsumoRecord[] {
        let codeIdx = -1, descIdx = -1, unitIdx = -1, priceIdx = -1;
        const ufs = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

        for (let i = 0; i < Math.min(rows.length, 60); i++) {
            const row = rows[i];
            if (!row) continue;

            row.forEach((cell, idx) => {
                if (!cell) return;
                const val = String(cell).toUpperCase().trim();

                // Match specific CAIXA headers
                if (val.includes('CÓDIGO') || val.includes('CODIGO') || val === 'COD') codeIdx = idx;
                if (val.includes('DESCRIÇÃO') || val.includes('DESCRICAO')) descIdx = idx;
                if (val.includes('UNIDADE') || val === 'UND' || val === 'UN') unitIdx = idx;

                // Price detection: Look for UF abbreviations or generic "PRECO"
                if (val.includes('PREÇO') || val.includes('PRECO') || val.includes('CUSTO') || ufs.includes(val)) priceIdx = idx;
            });

            if (codeIdx !== -1 && descIdx !== -1) {
                const data = [];
                for (let j = i + 1; j < rows.length; j++) {
                    const r = rows[j];
                    if (!r || !r[codeIdx]) continue;
                    const codigo = String(r[codeIdx]).trim();
                    if (!/^\d+$/.test(codigo)) continue;

                    data.push({
                        id: `${meta.mes_ref}_${meta.uf}_${meta.modo}_INSUMO_${codigo}`,
                        ...meta,
                        codigo,
                        descricao: String(r[descIdx] || '').trim(),
                        unidade: String(r[unitIdx] || '').trim(),
                        preco: this.parseNumber(r[priceIdx])
                    });
                }
                if (data.length > 0) return data as SinapiInsumoRecord[];
            }
        }
        return [];
    },

    parseComposicoes(rows: any[][], meta: any): SinapiComposicaoRecord[] {
        let codeIdx = -1, descIdx = -1, unitIdx = -1, costIdx = -1, groupIdx = -1;

        for (let i = 0; i < Math.min(rows.length, 60); i++) {
            const row = rows[i];
            if (!row) continue;

            row.forEach((cell, idx) => {
                if (!cell) return;
                const val = String(cell).toUpperCase().trim();

                if (val.includes('CÓD') || val.includes('COD')) codeIdx = idx;
                if (val.includes('DESC')) descIdx = idx;
                if (val.includes('UNID') || val === 'UN') unitIdx = idx;
                if (val.includes('CUSTO') || val.includes('PRECO')) {
                    // Avoid picking charges % column
                    if (!val.includes('%') && !val.includes('ENCARG')) costIdx = idx;
                }
                if (val.includes('GRUPO')) groupIdx = idx;
            });

            if (codeIdx !== -1 && descIdx !== -1) {
                const data = [];
                for (let j = i + 1; j < rows.length; j++) {
                    const r = rows[j];
                    if (!r || !r[codeIdx]) continue;
                    const codigo = String(r[codeIdx]).trim();
                    if (!/^\d+$/.test(codigo)) continue;

                    data.push({
                        id: `${meta.mes_ref}_${meta.uf}_${meta.modo}_COMPOSICAO_${codigo}`,
                        ...meta,
                        codigo,
                        grupo: groupIdx !== -1 ? String(r[groupIdx] || '').trim() : '',
                        descricao: String(r[descIdx] || '').trim(),
                        unidade: String(r[unitIdx] || '').trim(),
                        custo: this.parseNumber(r[costIdx])
                    });
                }
                if (data.length > 0) return data as SinapiComposicaoRecord[];
            }
        }
        return [];
    },

    parseNumber(val: any): number {
        if (val === undefined || val === null || val === '') return 0;
        if (typeof val === 'number') return val;

        let s = String(val).toUpperCase().replace(/R\$/g, '').replace(/\s/g, '').trim();
        if (s.includes(',')) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else if ((s.match(/\./g) || []).length > 1) {
            s = s.replace(/\./g, '');
        }

        const num = parseFloat(s);
        return isNaN(num) ? 0 : num;
    }
};
