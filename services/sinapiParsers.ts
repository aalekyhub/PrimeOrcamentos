
import * as XLSX from 'xlsx';
import { SinapiInsumoRecord, SinapiComposicaoRecord, SinapiComposicaoItemRecord } from './sinapiDb';

export interface ParserParams {
    file: File;
    uf: string;
    mes_ref: string;
    modo: string;
}

const normalize = (v: any) =>
    String(v ?? "")
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

export const sinapiParsers = {
    async parseInsumos({ file, uf, mes_ref, modo }: ParserParams): Promise<SinapiInsumoRecord[]> {
        const rows = await this.readSheet(file);
        const det = this.detectHeaders(rows, 'INSUMO', uf);

        if (det.codeIdx === -1 || det.descIdx === -1 || det.priceIdx === -1) {
            console.error('[sinapiParsers] Header detection failed for Insumos:', det);
            throw new Error(`Colunas obrigatórias não encontradas no arquivo de Insumos. Verifique se as colunas de "Código" e "Preço" existem.`);
        }

        const data: SinapiInsumoRecord[] = [];
        for (let j = det.headerRowIndex + 1; j < rows.length; j++) {
            const r = rows[j];
            if (!r || !r[det.codeIdx]) continue;
            const codigo = String(r[det.codeIdx]).trim();
            if (!/^\d+$/.test(codigo)) continue;

            data.push({
                id: `${mes_ref}_${uf}_${modo}_INS_${codigo}`,
                mes_ref, uf, modo,
                codigo,
                descricao: String(r[det.descIdx] || '').trim(),
                unidade: det.unitIdx !== -1 ? String(r[det.unitIdx] || '').trim() : '',
                preco_unitario: this.parseNumber(r[det.priceIdx])
            });
        }
        return data;
    },

    async parseComposicoes({ file, uf, mes_ref, modo }: ParserParams): Promise<SinapiComposicaoRecord[]> {
        const rows = await this.readSheet(file);
        const det = this.detectHeaders(rows, 'COMPOSICAO', uf);

        if (det.codeIdx === -1 || det.descIdx === -1 || det.priceIdx === -1) {
            console.error('[sinapiParsers] Header detection failed for Composições:', det);
            throw new Error(`Colunas obrigatórias não encontradas no arquivo de Composições. Verifique se as colunas de "Código" e "Custo" existem.`);
        }

        const data: SinapiComposicaoRecord[] = [];
        for (let j = det.headerRowIndex + 1; j < rows.length; j++) {
            const r = rows[j];
            if (!r || !r[det.codeIdx]) continue;
            const codigo = String(r[det.codeIdx]).trim();
            if (!/^\d+$/.test(codigo)) continue;

            data.push({
                id: `${mes_ref}_${uf}_${modo}_COMP_${codigo}`,
                mes_ref, uf, modo,
                grupo: det.groupIdx !== -1 ? String(r[det.groupIdx] || '').trim() : '',
                codigo,
                descricao: String(r[det.descIdx] || '').trim(),
                unidade: det.unitIdx !== -1 ? String(r[det.unitIdx] || '').trim() : '',
                custo_unitario: this.parseNumber(r[det.priceIdx]),
                as_pct: null
            });
        }
        return data;
    },

    async parseCoeficientes(params: ParserParams): Promise<SinapiComposicaoItemRecord[]> {
        // Fallback or legacy support if needed
        return [];
    },

    detectHeaders(rows: any[][], type: 'INSUMO' | 'COMPOSICAO', uf: string) {
        const targetUf = uf.toUpperCase().trim();
        const synonyms: Record<string, string[]> = {
            code: ["CODIGO", "COD", "CODIGO DA COMPOSICAO", "CODIGO DO INSUMO"],
            desc: ["DESCRICAO", "DESC", "DESCRICAO DA COMPOSICAO", "DESCRICAO DO INSUMO"],
            unit: ["UNIDADE", "UNID", "UN", "UND"],
            group: ["GRUPO", "CLASSE"],
            price: ["PRECO", "VALOR", "CUSTO", targetUf]
        };

        const scoreWeights = { code: 2, desc: 2, price: 2, unit: 1, group: 1 };

        let bestScore = -1;
        let bestDet = { headerRowIndex: 0, codeIdx: -1, descIdx: -1, unitIdx: -1, priceIdx: -1, groupIdx: -1 };

        const scanMax = Math.min(rows.length, 60);
        for (let i = 0; i < scanMax; i++) {
            const row = rows[i];
            if (!row || row.length < 3) continue;

            const normRow = row.map(normalize);
            const currentDet = { headerRowIndex: i, codeIdx: -1, descIdx: -1, unitIdx: -1, priceIdx: -1, groupIdx: -1 };
            let currentScore = 0;

            const usedIdx: number[] = [];

            // Match fields
            const fields: (keyof typeof synonyms)[] = ['code', 'desc', 'unit', 'group', 'price'];
            for (const field of fields) {
                const keys = synonyms[field];
                // Exact match first
                let foundAt = normRow.findIndex((v, idx) => !usedIdx.includes(idx) && keys.includes(v));

                // If price and not found, try targetUf which might be in the keys
                if (foundAt === -1) {
                    // Inclusion match
                    foundAt = normRow.findIndex((v, idx) => !usedIdx.includes(idx) && keys.some(k => v.includes(k)));
                }

                if (foundAt !== -1) {
                    // Special checks for price: avoid %, ENCARGOS
                    if (field === 'price') {
                        const val = normRow[foundAt];
                        if (val.includes('%') || val.includes('ENCARG') || val.includes('SOCIAL')) {
                            // Try another one for price
                            let altFoundAt = normRow.findIndex((v, idx) => !usedIdx.includes(idx) && idx > foundAt && keys.some(k => v.includes(k) && !v.includes('%') && !v.includes('ENCARG')));
                            if (altFoundAt !== -1) foundAt = altFoundAt;
                        }
                    }

                    (currentDet as any)[`${field}Idx`] = foundAt;
                    usedIdx.push(foundAt);
                    currentScore += (scoreWeights as any)[field];
                }
            }

            if (currentScore > bestScore) {
                bestScore = currentScore;
                bestDet = currentDet;
            }
            if (currentScore >= 7) break; // Good enough match
        }

        return bestDet;
    },

    parseNumber(val: any): number {
        if (val === undefined || val === null || val === '') return 0;
        if (typeof val === 'number') return val;

        let s = String(val).toUpperCase().replace(/R\$/g, '').replace(/\s/g, '').trim();
        if (s === '-' || !s) return 0;

        // Brazilian format handling: 1.234,56
        if (s.includes(',') && s.includes('.')) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else if (s.includes(',')) {
            s = s.replace(',', '.');
        } else if ((s.match(/\./g) || []).length > 1) {
            s = s.replace(/\./g, '');
        }

        const num = parseFloat(s);
        return isFinite(num) ? num : 0;
    },

    async readSheet(file: File): Promise<any[][]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: "" }) as any[][];
                    resolve(rows);
                } catch (err) { reject(err); }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
};
