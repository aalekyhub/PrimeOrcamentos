
import { BdiConfig, SinapiInsumo, SinapiComposicao } from '../types';
import * as XLSX from 'xlsx';

/**
 * Calculates the BDI percentage based on the SINAPI/TCU formula:
 * BDI = { [ ( (1 + AC + S + G + R) * (1 + DF) * (1 + L) ) / (1 - I) ] - 1 } * 100
 */
export const calculateBDI = (config: Omit<BdiConfig, 'id' | 'name' | 'total'>): number => {
    const ac = config.ac / 100;
    const s = config.s / 100;
    const g = config.g / 100;
    const r = config.r / 100;
    const df = config.df / 100;
    const l = config.l / 100;
    const i = (config.iss + config.pis + config.cofins + config.cprb) / 100;

    const bdi = (((1 + ac + s + g + r) * (1 + df) * (1 + l)) / (1 - i)) - 1;
    return Number((bdi * 100).toFixed(2));
};

/**
 * Parses a SINAPI Excel file (.xlsx or .xls)
 */
export const parseSinapiExcel = async (file: File): Promise<SinapiInsumo[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                const results: SinapiInsumo[] = [];

                let codeIdx = -1;
                let descIdx = -1;
                let unitIdx = -1;
                let priceIdx = -1;

                // Header detection (looks for keywords in the first 25 rows)
                for (let i = 0; i < Math.min(jsonData.length, 25); i++) {
                    const row = jsonData[i];
                    if (!row) continue;

                    let foundInRow = false;
                    row.forEach((cell, idx) => {
                        if (!cell) return;
                        const val = String(cell).toUpperCase();
                        if (val.includes('CÓDIGO') || val.includes('CODIGO')) { codeIdx = idx; foundInRow = true; }
                        if (val.includes('DESCRIÇÃO') || val.includes('DESCRICAO')) { descIdx = idx; foundInRow = true; }
                        if (val.includes('UNIDADE') || val.includes('UND') || val === 'UN') { unitIdx = idx; foundInRow = true; }
                        if (val.includes('CUSTO') || val.includes('PREÇO') || val.includes('PRECO')) { priceIdx = idx; foundInRow = true; }
                    });

                    if (codeIdx !== -1 && descIdx !== -1) {
                        // Found header! Process subsequent rows
                        for (let j = i + 1; j < jsonData.length; j++) {
                            const dataRow = jsonData[j];
                            if (!dataRow || !dataRow[codeIdx]) continue;

                            const codigo = String(dataRow[codeIdx]).trim();
                            // Validate if code is numeric (typical for SINAPI)
                            if (!/^\d+$/.test(codigo)) continue;

                            results.push({
                                codigo,
                                descricao: String(dataRow[descIdx] || '').trim(),
                                unidade: String(dataRow[unitIdx] || '').trim(),
                                precoMedio: parseFloat(String(dataRow[priceIdx] || '0').replace(',', '.')) || 0
                            });
                        }
                        break;
                    }
                }
                resolve(results);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Parses a SINAPI Insumos CSV string (Legacy support)
 */
export const parseSinapiInsumoCSV = (csvText: string): SinapiInsumo[] => {
    const lines = csvText.split('\n');
    const items: SinapiInsumo[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(';');
        if (parts.length >= 4) {
            items.push({
                codigo: parts[0].trim(),
                descricao: parts[1].trim(),
                unidade: parts[2].trim(),
                precoMedio: parseFloat(parts[3].replace(',', '.')) || 0
            });
        }
    }
    return items;
};
