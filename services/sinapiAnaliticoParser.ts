
import * as XLSX from 'xlsx';
import { SinapiComposicaoItemRecord } from './sinapiDb';

export interface AnaliticoParserParams {
    file: File;
    uf: string;
    mes_ref: string;
    modo: string; // "SE" or others
}

export const sinapiAnaliticoParser = {
    async parseAnalitico({ file, uf, mes_ref, modo }: AnaliticoParserParams): Promise<SinapiComposicaoItemRecord[]> {
        const rows = await this.readSheet(file, 'Analítico');
        const {
            compCodeIdx,
            tipoItemIdx,
            itemCodeIdx,
            descIdx,
            unitIdx,
            coefIdx,
            groupIdx,
            situacaoIdx,
            priceIdx,
            totalIdx,
            lblIdx
        } = this.detectHeaders(rows);

        if (compCodeIdx === -1 || tipoItemIdx === -1 || itemCodeIdx === -1 || coefIdx === -1) {
            throw new Error(`Colunas obrigatórias não encontradas no arquivo "Analítico". Verifique o formato do arquivo.`);
        }

        const records: SinapiComposicaoItemRecord[] = [];

        let lastSeenCompCode = '';

        // Start from the row after headers
        for (let i = lblIdx + 1; i < rows.length; i++) {
            const r = rows[i];
            if (!r) continue;

            const tipo_item = String(r[tipoItemIdx] || '').toUpperCase().trim();
            const raw_comp_code = String(r[compCodeIdx] || '').trim();
            const item_code = String(r[itemCodeIdx] || '').trim();

            // If we find a code in the comp column but no item code, it's the start of a new block
            if (raw_comp_code && !item_code && /^\d+$/.test(raw_comp_code)) {
                lastSeenCompCode = raw_comp_code;
                continue;
            }

            // If it's an item row, we need a composition code to attach it to
            if (tipo_item === 'INSUMO' || tipo_item === 'COMPOSICAO') {
                const codigo_composicao = lastSeenCompCode || raw_comp_code;
                const codigo_item = item_code;
                const coeficiente = this.parseNumber(r[coefIdx]);

                if (!codigo_composicao || !codigo_item || !/^\d+$/.test(codigo_item)) continue;

                const record: SinapiComposicaoItemRecord = {
                    id: `${mes_ref}_${uf}_${modo}_ANA_${codigo_composicao}_${tipo_item}_${codigo_item}`,
                    mes_ref,
                    uf,
                    modo,
                    codigo_composicao,
                    grupo: groupIdx !== -1 ? String(r[groupIdx] || '').trim() : '',
                    tipo_item: tipo_item as 'INSUMO' | 'COMPOSICAO',
                    codigo_item,
                    descricao_item: descIdx !== -1 ? String(r[descIdx] || '').trim() : '',
                    unidade_item: unitIdx !== -1 ? String(r[unitIdx] || '').trim() : '',
                    coeficiente,
                    custo_unitario: priceIdx !== -1 ? this.parseNumber(r[priceIdx]) : undefined,
                    custo_total: totalIdx !== -1 ? this.parseNumber(r[totalIdx]) : undefined,
                    situacao: situacaoIdx !== -1 ? String(r[situacaoIdx] || '').trim() : ''
                };

                records.push(record);
            }
        }

        return records;
    },

    async readSheet(file: File, sheetName: string): Promise<any[][]> {
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

                    let worksheet = workbook.Sheets[sheetName];
                    if (!worksheet) {
                        // Fallback to first sheet if "Analítico" not found by name
                        worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    }

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

    detectHeaders(rows: any[][]) {
        let compCodeIdx = -1, tipoItemIdx = -1, itemCodeIdx = -1, descIdx = -1, unitIdx = -1, coefIdx = -1, groupIdx = -1, situacaoIdx = -1, priceIdx = -1, totalIdx = -1;

        // Find the header row by looking for unique SINAPI column combinations
        const lblIdx = rows.findIndex(r => {
            const s = r.map(c => String(c || '').toUpperCase()).join(' ');
            const hasCod = s.includes('CÓD') || s.includes('COD');
            const hasItem = s.includes('ITEM') || s.includes('INSUMO');
            const hasCoef = s.includes('COEF');
            return hasCod && hasItem && hasCoef;
        });

        if (lblIdx !== -1) {
            const rowMain = rows[lblIdx];
            const rowSub = (lblIdx + 1 < rows.length) ? rows[lblIdx + 1] : [];

            // Search columns from right to left to prioritize 'Total' costs/prices (the ones with charges)
            for (let i = rowMain.length - 1; i >= 0; i--) {
                const cell = rowMain[i];
                const sub = rowSub[i] || '';
                const l1 = String(cell || '').toUpperCase().trim();
                const l2 = String(sub || '').toUpperCase().trim();
                const combined = `${l1} ${l2}`.trim();

                if (groupIdx === -1 && combined.includes('GRUPO')) groupIdx = i;

                // Specific keyword or position based detection
                if (compCodeIdx === -1 && (combined.includes('CÓD') || combined.includes('COD')) && combined.includes('COMP')) {
                    compCodeIdx = i;
                } else if (itemCodeIdx === -1 && (combined.includes('CÓD') || combined.includes('COD')) && (combined.includes('ITEM') || combined.includes('INSUMO'))) {
                    itemCodeIdx = i;
                }

                if (tipoItemIdx === -1 && combined.includes('TIPO') && combined.includes('ITEM')) tipoItemIdx = i;
                if (descIdx === -1 && combined.includes('DESC')) descIdx = i;
                if (unitIdx === -1 && (combined.includes('UNID') || combined === 'UN')) unitIdx = i;
                if (coefIdx === -1 && combined.includes('COEF')) coefIdx = i;
                if (situacaoIdx === -1 && (combined.includes('SITUAC') || combined.includes('SITUAÇ'))) situacaoIdx = i;

                if (priceIdx === -1 && (combined.includes('UNIT') || combined.includes('UNID')) && (combined.includes('CUSTO') || combined.includes('PREÇO') || combined.includes('PRECO') || combined.includes('VALOR'))) {
                    priceIdx = i;
                }
                if (totalIdx === -1 && (combined.includes('TOTAL') || combined.includes('SUBTOTAL')) && (combined.includes('CUSTO') || combined.includes('PREÇO') || combined.includes('PRECO') || combined.includes('VALOR'))) {
                    totalIdx = i;
                }

                // Super fallback: if one is 'UNITARIO' and another is 'TOTAL'
                if (priceIdx === -1 && combined === 'UNITARIO') priceIdx = i;
                if (totalIdx === -1 && combined === 'TOTAL') totalIdx = i;
            }

            // Specific layout fallback for "Relatório Analítico" PDF-to-Excel (which often has Price at index 6 and Total at index 7)
            if (priceIdx === -1 && coefIdx !== -1 && rowMain.length > coefIdx + 1) priceIdx = coefIdx + 1;
            if (totalIdx === -1 && priceIdx !== -1 && rowMain.length > priceIdx + 1) totalIdx = priceIdx + 1;

            // Manual Fallback for the standard 7-8 column layouts seen in images
            if (compCodeIdx === -1) {
                if (rowMain.length === 7) {
                    compCodeIdx = 0; tipoItemIdx = 1; itemCodeIdx = 2; descIdx = 3; unitIdx = 4; coefIdx = 5; situacaoIdx = 6;
                } else if (rowMain.length >= 8) {
                    groupIdx = 0; compCodeIdx = 1; tipoItemIdx = 2; itemCodeIdx = 3; descIdx = 4; unitIdx = 5; coefIdx = 6; situacaoIdx = 7;
                }
            }

            // Absolute fail-safes
            if (compCodeIdx === -1) compCodeIdx = 0;
            if (tipoItemIdx === -1) tipoItemIdx = 1;
            if (itemCodeIdx === -1) itemCodeIdx = 2;
        }

        return { compCodeIdx, tipoItemIdx, itemCodeIdx, descIdx, unitIdx, coefIdx, groupIdx, situacaoIdx, priceIdx, totalIdx, lblIdx };
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
