
import * as XLSX from 'xlsx';
import { SinapiComposicaoItemRecord } from './sinapiDb';

export interface AnaliticoParserParams {
    file: File;
    uf: string;
    mes_ref: string;
    modo: string; // "SE", "SD", "CD"
}

type HeaderDetection = {
    headerRowIndex: number;
    compCodeIdx: number;
    tipoItemIdx: number;
    itemCodeIdx: number;
    descIdx: number;
    unitIdx: number;
    coefIdx: number;
    groupIdx: number;
    situacaoIdx: number;
    priceIdx: number;
    totalIdx: number;
};

const normalize = (v: any) =>
    String(v ?? "")
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

const isNumericCode = (v: string) => /^\d+$/.test(v);

export const sinapiAnaliticoParser = {
    async parseAnalitico({ file, uf, mes_ref, modo }: AnaliticoParserParams): Promise<SinapiComposicaoItemRecord[]> {
        const rows = await this.readSheet(file, "ANALITICO");
        const det = this.detectHeaders(rows);

        if (det.compCodeIdx === -1 || det.tipoItemIdx === -1 || det.itemCodeIdx === -1 || det.coefIdx === -1) {
            console.error('[sinapiAnaliticoParser] Header detection failed:', det);
            throw new Error(`Colunas obrigatórias não encontradas no arquivo "Analítico". Verifique os nomes das colunas.`);
        }

        const records: SinapiComposicaoItemRecord[] = [];
        let lastSeenCompCode = "";
        let headerRowsCount = 0;
        let skippedRowsCount = 0;

        for (let i = det.headerRowIndex + 1; i < rows.length; i++) {
            const r = rows[i];
            if (!r || r.length === 0) continue;

            const tipo_item_raw = normalize(r[det.tipoItemIdx]);
            const raw_comp_code = String(r[det.compCodeIdx] ?? "").trim();
            const item_code = String(r[det.itemCodeIdx] ?? "").trim();

            // Case: Title row for a composition (has comp code, no item code)
            if (raw_comp_code && !item_code && isNumericCode(raw_comp_code)) {
                lastSeenCompCode = raw_comp_code;
                headerRowsCount++;
                continue;
            }

            // Case: Item row inside a composition (must have an item code)
            if (item_code && isNumericCode(item_code)) {
                const codigo_composicao = lastSeenCompCode || raw_comp_code;
                if (!codigo_composicao || !isNumericCode(codigo_composicao)) {
                    skippedRowsCount++;
                    continue;
                }

                const coeficiente = this.parseNumber(r[det.coefIdx]);
                if (!Number.isFinite(coeficiente) || coeficiente === 0) {
                    skippedRowsCount++;
                    continue;
                }

                // Map any type that doesn't start with 'COMP' as 'INSUMO' for simplicity
                const tipo_item = tipo_item_raw.includes("COMP") ? "COMPOSICAO" : "INSUMO";

                records.push({
                    id: `${mes_ref}_${uf}_${modo}_ANA_${codigo_composicao}_${tipo_item}_${item_code}`,
                    mes_ref,
                    uf,
                    modo,
                    codigo_composicao,
                    grupo: det.groupIdx !== -1 ? String(r[det.groupIdx] ?? "").trim() : "",
                    tipo_item,
                    codigo_item: item_code,
                    descricao_item: det.descIdx !== -1 ? String(r[det.descIdx] ?? "").trim() : "",
                    unidade_item: det.unitIdx !== -1 ? String(r[det.unitIdx] || "").trim() : "",
                    coeficiente,
                    custo_unitario: det.priceIdx !== -1 ? this.parseNumber(r[det.priceIdx]) : undefined,
                    custo_total: det.totalIdx !== -1 ? this.parseNumber(r[det.totalIdx]) : undefined,
                    situacao: det.situacaoIdx !== -1 ? String(r[det.situacaoIdx] || "").trim() : "",
                });
            } else {
                if (tipo_item_raw || item_code) skippedRowsCount++;
            }
        }

        console.log(`[sinapiAnaliticoParser] Import summary: ${records.length} items, ${headerRowsCount} composition headers, ${skippedRowsCount} skipped rows.`);

        if (records.length === 0) {
            throw new Error(`Importação resultou em 0 itens. Verifique se o arquivo contém linhas identificadas como INSUMO ou COMPOSICAO.`);
        }

        return records;
    },

    detectHeaders(rows: any[][]): HeaderDetection {
        const synonyms: Record<string, string[]> = {
            comp: ["CODIGO DA COMPOSICAO", "CODIGO COMPOSICAO", "COD COMPOSICAO", "CODIGO", "COMPOSICAO"],
            tipo: ["TIPO ITEM", "TIPO DO ITEM", "TIPO"],
            item: ["CODIGO DO ITEM", "CODIGO ITEM", "COD ITEM", "CODIGO INSUMO", "COD INSUMO", "ITEM"],
            desc: ["DESCRICAO DO ITEM", "DESCRICAO ITEM", "DESCRICAO", "DESC"],
            unit: ["UNIDADE", "UN", "UNID"],
            coef: ["COEFICIENTE", "COEF", "QUANTIDADE", "QTD"],
            grupo: ["GRUPO", "CLASSE"],
            situ: ["SITUACAO", "SIT", "STATUS"],
            price: ["CUSTO UNITARIO", "PRECO UNITARIO", "VALOR UNITARIO", "VALOR", "CUSTO UNIT"],
            total: ["CUSTO TOTAL", "VALOR TOTAL", "TOTAL"],
        };

        let headerRowIndex = -1;
        let bestScore = -1;
        let bestDet: Partial<HeaderDetection> = {};

        const scanMax = Math.min(rows.length, 60);

        for (let i = 0; i < scanMax; i++) {
            const row = rows[i] || [];
            if (row.length < 4) continue;

            const normRow = row.map(normalize);
            const usedIdx: number[] = [];
            const currentDet: Partial<HeaderDetection> = {};

            const fields: { key: keyof typeof synonyms, target: keyof HeaderDetection }[] = [
                { key: 'tipo', target: 'tipoItemIdx' },
                { key: 'comp', target: 'compCodeIdx' },
                { key: 'item', target: 'itemCodeIdx' },
                { key: 'coef', target: 'coefIdx' },
                { key: 'desc', target: 'descIdx' },
                { key: 'unit', target: 'unitIdx' },
                { key: 'grupo', target: 'groupIdx' },
                { key: 'situ', target: 'situacaoIdx' },
                { key: 'price', target: 'priceIdx' },
                { key: 'total', target: 'totalIdx' }
            ];

            fields.forEach(f => {
                const keys = synonyms[f.key];
                // Exact match first
                let foundAt = normRow.findIndex((v, idx) => !usedIdx.includes(idx) && keys.includes(v));
                // Include match second
                if (foundAt === -1) {
                    foundAt = normRow.findIndex((v, idx) => !usedIdx.includes(idx) && keys.some(k => v.includes(k)));
                }

                if (foundAt !== -1) {
                    currentDet[f.target] = foundAt;
                    usedIdx.push(foundAt);
                } else {
                    currentDet[f.target] = -1;
                }
            });

            const score =
                ((currentDet.compCodeIdx ?? -1) !== -1 ? 2 : 0) +
                ((currentDet.tipoItemIdx ?? -1) !== -1 ? 2 : 0) +
                ((currentDet.itemCodeIdx ?? -1) !== -1 ? 2 : 0) +
                ((currentDet.coefIdx ?? -1) !== -1 ? 2 : 0) +
                ((currentDet.descIdx ?? -1) !== -1 ? 1 : 0);

            if (score > bestScore) {
                bestScore = score;
                headerRowIndex = i;
                bestDet = currentDet;
            }
            if (score >= 9) break;
        }

        return {
            headerRowIndex: headerRowIndex === -1 ? 0 : headerRowIndex,
            compCodeIdx: bestDet.compCodeIdx ?? -1,
            tipoItemIdx: bestDet.tipoItemIdx ?? -1,
            itemCodeIdx: bestDet.itemCodeIdx ?? -1,
            descIdx: bestDet.descIdx ?? -1,
            unitIdx: bestDet.unitIdx ?? -1,
            coefIdx: bestDet.coefIdx ?? -1,
            groupIdx: bestDet.groupIdx ?? -1,
            situacaoIdx: bestDet.situacaoIdx ?? -1,
            priceIdx: bestDet.priceIdx ?? -1,
            totalIdx: bestDet.totalIdx ?? -1,
        };
    },

    parseNumber(v: any): number {
        if (v === null || v === undefined || v === '') return 0;
        if (typeof v === "number") return v;
        let s = String(v).trim().replace(/[^\d.,-]/g, "");
        if (!s || s === '-') return 0;
        if (s.includes(",") && s.includes(".")) {
            s = s.replace(/\./g, "").replace(",", ".");
        } else if (s.includes(",")) {
            s = s.replace(",", ".");
        } else if ((s.match(/\./g) || []).length > 1) {
            s = s.replace(/\./g, "");
        }
        const n = parseFloat(s);
        return isFinite(n) ? n : 0;
    },

    async readSheet(file: File, sheetName: string): Promise<any[][]> {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { type: "array" });
        const candidates = [sheetName, "ANALÍTICO", "ANALITICO", "Analítico", "Analitico"];
        const foundName = wb.SheetNames.find((n) => candidates.includes(n.toUpperCase())) || wb.SheetNames[0];
        const ws = wb.Sheets[foundName];
        return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false }) as any[][];
    }
};
