
import * as XLSX from 'xlsx';
import { SinapiInsumoRecord, SinapiComposicaoRecord, SinapiComposicaoItemRecord } from './sinapiDb';

export interface ParserParams {
    file: File;
    uf: string;
    mes_ref: string;
    modo: string;
}

export const sinapiParsers = {
    async parseInsumos({ file, uf, mes_ref, modo }: ParserParams): Promise<SinapiInsumoRecord[]> {
        const rows = await this.readSheet(file);
        const { codeIdx, descIdx, unitIdx, priceIdx, classIdx, lblIdx } = this.detectInsumoHeaders(rows, uf);

        if (codeIdx === -1 || descIdx === -1 || priceIdx === -1) {
            throw new Error(`Colunas obrigatórias não encontradas. Verifique se a coluna "${uf}" e "Código" existem.`);
        }

        return rows.slice(lblIdx + 1).map(r => {
            const codigo = String(r[codeIdx] || '').trim();
            if (!/^\d+$/.test(codigo)) return null;

            return {
                id: `${mes_ref}_${uf}_${modo}_INS_${codigo}`,
                mes_ref, uf, modo,
                classificacao: classIdx !== -1 ? String(r[classIdx] || '').trim() : '',
                codigo,
                descricao: String(r[descIdx] || '').trim(),
                unidade: String(r[unitIdx] || '').trim(),
                origem_preco: '',
                preco_unitario: this.parseNumber(r[priceIdx])
            };
        }).filter(r => r !== null) as SinapiInsumoRecord[];
    },

    async parseComposicoes({ file, uf, mes_ref, modo }: ParserParams): Promise<SinapiComposicaoRecord[]> {
        const rows = await this.readSheet(file);
        const { codeIdx, descIdx, unitIdx, costIdx, asIdx, groupIdx, lblIdx } = this.detectComposicaoHeaders(rows, uf);

        if (codeIdx === -1 || descIdx === -1 || costIdx === -1) {
            throw new Error(`Colunas obrigatórias não encontradas. Verifique se a coluna de custo para "${uf}" existe.`);
        }

        return rows.slice(lblIdx + 1).map(r => {
            const codigo = String(r[codeIdx] || '').trim();
            if (!/^\d+$/.test(codigo)) return null;

            return {
                id: `${mes_ref}_${uf}_${modo}_COMP_${codigo}`,
                mes_ref, uf, modo,
                grupo: groupIdx !== -1 ? String(r[groupIdx] || '').trim() : '',
                codigo,
                descricao: String(r[descIdx] || '').trim(),
                unidade: String(r[unitIdx] || '').trim(),
                custo_unitario: this.parseNumber(r[costIdx]),
                as_pct: asIdx !== -1 ? this.parseNumber(r[asIdx]) : null
            };
        }).filter(r => r !== null) as SinapiComposicaoRecord[];
    },

    async parseCoeficientes({ file, uf, mes_ref, modo }: ParserParams): Promise<SinapiComposicaoItemRecord[]> {
        const rows = await this.readSheet(file);
        const { compCodeIdx, itemCodeIdx, itemDescIdx, itemUnitIdx, coefIdx, catIdx, lblIdx } = this.detectCoeficienteHeaders(rows, uf);

        if (compCodeIdx === -1 || itemCodeIdx === -1 || coefIdx === -1) {
            throw new Error(`Colunas obrigatórias não encontradas. Verifique se a coluna de coeficiente para "${uf}" existe.`);
        }

        return rows.slice(lblIdx + 1).map(r => {
            const codigo_composicao = String(r[compCodeIdx] || '').trim();
            const codigo_item = String(r[itemCodeIdx] || '').trim();
            if (!/^\d+$/.test(codigo_composicao) || !/^\d+$/.test(codigo_item)) return null;

            return {
                id: `${mes_ref}_${uf}_${modo}_BOM_${codigo_composicao}_${codigo_item}`,
                mes_ref, uf, modo,
                codigo_composicao,
                codigo_item,
                descricao_item: String(r[itemDescIdx] || '').trim(),
                unidade_item: String(r[itemUnitIdx] || '').trim(),
                categoria: catIdx !== -1 ? String(r[catIdx] || '').trim() : '',
                coeficiente: this.parseNumber(r[coefIdx])
            };
        }).filter(r => r !== null) as SinapiComposicaoItemRecord[];
    },

    async readSheet(file: File): Promise<any[][]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const isCsv = file.name.toLowerCase().endsWith('.csv');

            reader.onload = (e) => {
                try {
                    const result = e.target?.result;
                    if (!result) return resolve([]);

                    const data = new Uint8Array(result as ArrayBuffer);
                    let workbook;

                    if (isCsv) {
                        const decoder = new TextDecoder('utf-8');
                        const sample = decoder.decode(data.slice(0, 5000));
                        const semiCount = (sample.match(/;/g) || []).length;
                        const commaCount = (sample.match(/,/g) || []).length;

                        const options: any = { type: 'array' };
                        if (semiCount > commaCount) options.FS = ';';

                        workbook = XLSX.read(data, options);
                    } else {
                        workbook = XLSX.read(data, { type: 'array' });
                    }

                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: "" }) as any[][];

                    if (isCsv && rows.length > 0 && rows[0].length === 1 && String(rows[0][0]).includes(';')) {
                        const manualRows = rows.map(r => String(r[0]).split(';'));
                        return resolve(manualRows);
                    }

                    resolve(rows);
                } catch (err) { reject(err); }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    },

    detectInsumoHeaders(rows: any[][], uf: string) {
        let codeIdx = -1, descIdx = -1, unitIdx = -1, priceIdx = -1, classIdx = -1;
        const target = uf.toUpperCase().trim();

        const lblIdx = rows.findIndex(r => {
            const s = r.join(' ').toUpperCase();
            return (s.includes('CÓD') || s.includes('COD')) && s.includes('DESC') && (s.includes('INSUMO') || s.includes('PRECO') || s.includes('PREÇO'));
        });

        if (lblIdx === -1) return { codeIdx, descIdx, unitIdx, priceIdx, classIdx, lblIdx: -1 };

        const labels = rows[lblIdx];
        const top = lblIdx > 0 ? rows[lblIdx - 1] : [];
        let curUf = '';

        // Strategy skip: find the LAST column that matches the UF and seems like a price
        // In SDReports, there are often 3 columns for each UF: Base, Direct, and Total. We want the Total.
        for (let i = labels.length - 1; i >= 0; i--) {
            const l = String(labels[i] || '').toUpperCase().trim();
            const t = String(top[i] || '').toUpperCase().trim();

            if (/^[A-Z]{2}$/.test(t)) curUf = t;
            else if (/^[A-Z]{2}$/.test(l) && l.length === 2) curUf = l;

            if (codeIdx === -1 && (l.includes('CÓD') || l.includes('COD'))) codeIdx = i;
            if (descIdx === -1 && l.includes('DESC')) descIdx = i;
            if (unitIdx === -1 && (l.includes('UNID') || l === 'UN')) unitIdx = i;
            if (classIdx === -1 && l.includes('CLASSIF')) classIdx = i;

            const isUfMatch = curUf === target || l.includes(target) || t.includes(target);
            const isExclude = l.includes('%') || l.includes('AS ') || l === 'AS';

            if (priceIdx === -1 && isUfMatch && !isExclude) {
                // Prioritize columns that sound like the final price
                if (l.includes('PRECO') || l.includes('PREÇO') || l.includes('CUSTO') || l.includes('VALOR') || l === target || t === target || !l) {
                    priceIdx = i;
                }
            }
        }

        // Correct indices if search from right messed up mandatory ones
        if (codeIdx === -1 || descIdx === -1) {
            for (let i = 0; i < labels.length; i++) {
                const l = String(labels[i] || '').toUpperCase();
                if (codeIdx === -1 && (l.includes('CÓD') || l.includes('COD'))) codeIdx = i;
                if (descIdx === -1 && l.includes('DESC')) descIdx = i;
            }
        }

        return { codeIdx, descIdx, unitIdx, priceIdx, classIdx, lblIdx };
    },

    detectComposicaoHeaders(rows: any[][], uf: string) {
        let codeIdx = -1, descIdx = -1, unitIdx = -1, costIdx = -1, asIdx = -1, groupIdx = -1;
        const target = uf.toUpperCase().trim();

        const lblIdx = rows.findIndex(r => {
            const s = r.map(c => String(c || '')).join(' ').toUpperCase();
            return (s.includes('CÓD') || s.includes('COD')) && (s.includes('COMP') || s.includes('ITEM')) && s.includes('DESC');
        });

        if (lblIdx === -1) return { codeIdx, descIdx, unitIdx, costIdx, asIdx, groupIdx, lblIdx: -1 };

        const labels = rows[lblIdx];
        const top = lblIdx > 0 ? rows[lblIdx - 1] : [];
        let curUf = '';

        // Search from right to left to find the "Total Cost with Social Charges" (last relevant UF column)
        for (let i = labels.length - 1; i >= 0; i--) {
            const l = String(labels[i] || '').toUpperCase().trim();
            const t = String(top[i] || '').toUpperCase().trim();

            if (/^[A-Z]{2}$/.test(t)) curUf = t;
            else if (/^[A-Z]{2}$/.test(l) && l.length === 2) curUf = l;

            if (codeIdx === -1 && (l.includes('CÓD') || l.includes('COD'))) codeIdx = i;
            if (descIdx === -1 && l.includes('DESC')) descIdx = i;
            if (unitIdx === -1 && (l.includes('UNID') || l === 'UN')) unitIdx = i;
            if (groupIdx === -1 && l.includes('GRUP')) groupIdx = i;

            const isUfMatch = curUf === target || l.includes(target) || t.includes(target);
            const isEncargos = l.includes('%') || l.includes('AS') || l.includes('ENCARG');

            if (costIdx === -1 && isUfMatch && !isEncargos) {
                if (l.includes('CUSTO') || l.includes('PRECO') || l.includes('PREÇO') || l === target || t === target || !l) {
                    costIdx = i;
                }
            } else if (asIdx === -1 && isEncargos) {
                asIdx = i;
            }
        }

        // Final fallback for missing required indices
        if (groupIdx === -1) groupIdx = 0;
        if (codeIdx === -1) {
            for (let i = 0; i < labels.length; i++) {
                const l = String(labels[i] || '').toUpperCase();
                if (l.includes('CÓD') || l.includes('COD')) { codeIdx = i; break; }
            }
        }
        if (descIdx === -1) {
            for (let i = 0; i < labels.length; i++) {
                const l = String(labels[i] || '').toUpperCase();
                if (l.includes('DESC')) { descIdx = i; break; }
            }
        }
        if (costIdx === -1 && labels.length >= 5) costIdx = labels.length - 2; // Usually the penultimate

        return { codeIdx, descIdx, unitIdx, costIdx, asIdx, groupIdx, lblIdx };
    },

    detectCoeficienteHeaders(rows: any[][], uf: string) {
        let compCodeIdx = -1, itemCodeIdx = -1, itemDescIdx = -1, itemUnitIdx = -1, coefIdx = -1, catIdx = -1;
        const target = uf.toUpperCase().trim();

        const lblIdx = rows.findIndex(r => {
            // Safer join handling null/undefined
            const s = r.map(c => String(c || '')).join(' ').toUpperCase();
            return (s.includes('CÓD') || s.includes('COD')) && (s.includes('FAMIL') || s.includes('COMP'));
        });

        if (lblIdx === -1) return { compCodeIdx, itemCodeIdx, itemDescIdx, itemUnitIdx, coefIdx, catIdx, lblIdx: -1 };

        const labels = rows[lblIdx];
        const top = lblIdx > 0 ? rows[lblIdx - 1] : [];
        let curUf = '';

        for (let i = 0; i < labels.length; i++) {
            const l = String(labels[i] || '').toUpperCase().trim();
            const t = String(top[i] || '').toUpperCase().trim();

            if (/^[A-Z]{2}$/.test(t)) curUf = t;
            else if (/^[A-Z]{2}$/.test(l) && l.length === 2) curUf = l;

            if ((l.includes('CÓD') || l.includes('COD')) && (l.includes('FAMIL') || l.includes('COMP'))) compCodeIdx = i;
            if ((l.includes('CÓD') || l.includes('COD')) && (l.includes('INSUMO') || l.includes('ITEM'))) itemCodeIdx = i;
            if (l.includes('DESC')) itemDescIdx = i;
            if (l.includes('UNID') || l === 'UN') itemUnitIdx = i;
            if (l.includes('CATEGOR')) catIdx = i;

            if ((curUf === target || l === target || t === target) && coefIdx === -1) {
                if (l === target || l.includes('COE') || l.includes('VALOR') || t === target || !l || /^[0-9,.]+$/.test(l)) {
                    coefIdx = i;
                }
            }
        }
        return { compCodeIdx, itemCodeIdx, itemDescIdx, itemUnitIdx, coefIdx, catIdx, lblIdx };
    },

    parseNumber(val: any): number {
        if (val === undefined || val === null || val === '') return 0;
        if (val === '-') return 0;

        if (typeof val === 'number') return val;

        let s = String(val).toUpperCase().replace(/R\$/g, '').replace(/\s/g, '').trim();

        // Remove trailing dash if it follows a number (common in BR reports like '158,23 -')
        if (s.endsWith('-') && s.length > 1) {
            s = s.substring(0, s.length - 1).trim();
        }

        let multiplier = 1;
        if (s.startsWith('-')) {
            multiplier = -1;
            s = s.substring(1).trim();
        }

        if (s.includes(',')) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else if ((s.match(/\./g) || []).length > 1) {
            s = s.replace(/\./g, '');
        }

        const num = parseFloat(s);
        return (isNaN(num) ? 0 : num) * multiplier;
    }
};
