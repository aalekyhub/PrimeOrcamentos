
import * as XLSX from 'xlsx';
import { SinapiComposicaoItemRecord } from './sinapiDb';

export interface AnaliticoParserParams {
    file: File;
    uf: string;
    mes_ref: string; // "YYYY/MM"
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
        .replace(/[\u0300-\u036f]/g, ""); // remove acentos

const isNumericCode = (v: string) => /^\d+$/.test(v);

export const sinapiAnaliticoParser = {
    async parseAnalitico({
        file,
        uf,
        mes_ref,
        modo,
    }: AnaliticoParserParams): Promise<SinapiComposicaoItemRecord[]> {
        const rows = await this.readSheet(file, "ANALITICO");

        const det = this.detectHeaders(rows);

        // Obrigatórias mínimas
        if (det.compCodeIdx === -1 || det.tipoItemIdx === -1 || det.itemCodeIdx === -1 || det.coefIdx === -1) {
            throw new Error(`Colunas obrigatórias não encontradas na aba/arquivo "Analítico".`);
        }

        const records: SinapiComposicaoItemRecord[] = [];
        let lastSeenCompCode = "";

        for (let i = det.headerRowIndex + 1; i < rows.length; i++) {
            const r = rows[i];
            if (!r || r.length === 0) continue;

            const tipo_item_raw = normalize(r[det.tipoItemIdx]);
            const raw_comp_code = String(r[det.compCodeIdx] ?? "").trim();
            const item_code = String(r[det.itemCodeIdx] ?? "").trim();

            // Linha "título" da composição (código da composição aparece sozinho)
            if (raw_comp_code && !item_code && isNumericCode(raw_comp_code)) {
                lastSeenCompCode = raw_comp_code;
                continue;
            }

            // Linhas de item
            if (tipo_item_raw === "INSUMO" || tipo_item_raw === "COMPOSICAO" || tipo_item_raw === "COMPOSIÇÃO") {
                const codigo_composicao = lastSeenCompCode || raw_comp_code;
                if (!codigo_composicao || !isNumericCode(codigo_composicao)) continue;
                if (!item_code || !isNumericCode(item_code)) continue;

                const coeficiente = this.parseNumber(r[det.coefIdx]);
                if (!Number.isFinite(coeficiente) || coeficiente === 0) {
                    // coef 0 acontece em ruídos — ignore
                    continue;
                }

                const tipo_item = (tipo_item_raw.startsWith("INS") ? "INSUMO" : "COMPOSICAO") as "INSUMO" | "COMPOSICAO";

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
                    unidade_item: det.unitIdx !== -1 ? String(r[det.unitIdx] ?? "").trim() : "",
                    coeficiente,
                    custo_unitario: det.priceIdx !== -1 ? this.parseNumber(r[det.priceIdx]) : undefined,
                    custo_total: det.totalIdx !== -1 ? this.parseNumber(r[det.totalIdx]) : undefined,
                    situacao: det.situacaoIdx !== -1 ? String(r[det.situacaoIdx] ?? "").trim() : "",
                });
            }
        }

        if (records.length === 0) {
            throw new Error(
                `Importação resultou em 0 itens. Verifique se o arquivo está na aba "Analítico" e se contém linhas de INSUMO/COMPOSICAO.`
            );
        }

        return records;
    },

    detectHeaders(rows: any[][]): HeaderDetection {
        // sinônimos (normalize remove acentos) - Ordem de importância: mais específico primeiro
        const synonyms: Record<string, string[]> = {
            comp: ["CODIGO DA COMPOSICAO", "CODIGO COMPOSICAO", "COD COMPOSICAO", "CODIGO", "COMPOSICAO", "COD COMPOSICAO SINAPI"],
            tipo: ["TIPO ITEM", "TIPO DO ITEM", "TIPO_DE_ITEM", "TIPO"],
            item: ["CODIGO DO ITEM", "CODIGO ITEM", "COD ITEM", "CODIGO INSUMO", "COD INSUMO", "ITEM"],
            desc: ["DESCRICAO DO ITEM", "DESCRICAO ITEM", "DESCRICAO", "DESCRICAO DO INSUMO"],
            unit: ["UNIDADE", "UN", "UNID"],
            coef: ["COEFICIENTE", "COEF", "COEFICIENTE (QTDE)", "QUANTIDADE", "QTD"],
            grupo: ["GRUPO", "GRUPO/CLASSE", "GRUPO CLASSE", "CLASSE"],
            situ: ["SITUACAO DO ITEM", "SITUACAO", "SIT", "STATUS"],
            price: ["CUSTO UNITARIO", "PRECO UNITARIO", "PRECO", "VALOR UNITARIO", "CUSTO UNIT"],
            total: ["CUSTO TOTAL", "VALOR TOTAL", "PRECO TOTAL", "TOTAL"],
        };

        let headerRowIndex = -1;
        let bestScore = -1;
        let bestMap: Partial<HeaderDetection> = {};

        const scanMax = Math.min(rows.length, 80);

        for (let i = 0; i < scanMax; i++) {
            const row = rows[i] || [];
            if (row.length < 3) continue;

            const normRow = row.map(normalize);

            // Pass 1: Exata; Pass 2: Inclusão
            const findIdx = (keys: string[], usedIndices: number[]) => {
                // Tenta exato primeiro
                for (let c = 0; c < normRow.length; c++) {
                    if (usedIndices.includes(c)) continue;
                    const cell = normRow[c];
                    if (!cell) continue;
                    if (keys.some(k => cell === k)) return c;
                }
                // Tenta inclusão
                for (let c = 0; c < normRow.length; c++) {
                    if (usedIndices.includes(c)) continue;
                    const cell = normRow[c];
                    if (!cell) continue;
                    if (keys.some(k => cell.includes(k))) return c;
                }
                return -1;
            };

            const used: number[] = [];
            const map: Partial<HeaderDetection> = {};

            // Ordem importa para evitar conflitos (ex: "TIPO ITEM" vs "ITEM")
            const findAndMark = (key: keyof typeof synonyms) => {
                const idx = findIdx(synonyms[key], used);
                if (idx !== -1) used.push(idx);
                return idx;
            };

            map.tipoItemIdx = findAndMark('tipo');
            map.compCodeIdx = findAndMark('comp');
            map.itemCodeIdx = findAndMark('item');
            map.coefIdx = findAndMark('coef');
            map.descIdx = findAndMark('desc');
            map.unitIdx = findAndMark('unit');
            map.groupIdx = findAndMark('grupo');
            map.situacaoIdx = findAndMark('situ');
            map.priceIdx = findAndMark('price');
            map.totalIdx = findAndMark('total');

            const score =
                ((map.compCodeIdx ?? -1) !== -1 ? 1 : 0) +
                ((map.tipoItemIdx ?? -1) !== -1 ? 1 : 0) +
                ((map.itemCodeIdx ?? -1) !== -1 ? 1 : 0) +
                ((map.coefIdx ?? -1) !== -1 ? 1 : 0) +
                ((map.descIdx ?? -1) !== -1 ? 1 : 0);

            if (score > bestScore) {
                bestScore = score;
                headerRowIndex = i;
                bestMap = map;
            }

            if (score >= 5) break;
        }

        return {
            headerRowIndex: headerRowIndex === -1 ? 0 : headerRowIndex,
            compCodeIdx: (bestMap.compCodeIdx ?? -1),
            tipoItemIdx: (bestMap.tipoItemIdx ?? -1),
            itemCodeIdx: (bestMap.itemCodeIdx ?? -1),
            descIdx: (bestMap.descIdx ?? -1),
            unitIdx: (bestMap.unitIdx ?? -1),
            coefIdx: (bestMap.coefIdx ?? -1),
            groupIdx: (bestMap.groupIdx ?? -1),
            situacaoIdx: (bestMap.situacaoIdx ?? -1),
            priceIdx: (bestMap.priceIdx ?? -1),
            totalIdx: (bestMap.totalIdx ?? -1),
        };
    },

    parseNumber(v: any): number {
        if (v === null || v === undefined || v === '') return 0;
        if (typeof v === "number") return v;

        let s = String(v).trim();
        if (!s || s === '-') return 0;

        // remove R$, espaços e etc
        s = s.replace(/[^\d.,-]/g, "");

        // pt-BR: 1.234,56 -> 1234.56
        const hasComma = s.includes(",");
        const hasDot = s.includes(".");

        if (hasComma && hasDot) {
            s = s.replace(/\./g, "").replace(",", ".");
        } else if (hasComma && !hasDot) {
            s = s.replace(",", ".");
        }
        const n = Number(s);
        return Number.isFinite(n) ? n : 0;
    },

    async readSheet(file: File, sheetName: string): Promise<any[][]> {
        const ext = (file.name.split(".").pop() || "").toLowerCase();

        if (ext === "csv") {
            const text = await this.readFileAsTextSmart(file);
            const wb = XLSX.read(text, { type: "string" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
        }

        // xlsx
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { type: "array" });

        // tenta com e sem acento
        const candidates = [
            sheetName,
            "ANALÍTICO",
            "ANALITICO",
            "Analítico",
            "Analitico",
        ];

        const foundName =
            wb.SheetNames.find((n) => candidates.includes(n)) ||
            wb.SheetNames.find((n) => normalize(n) === "ANALITICO") ||
            wb.SheetNames[0];

        const ws = wb.Sheets[foundName];
        return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false }) as any[][];
    },

    async readFileAsTextSmart(file: File): Promise<string> {
        try {
            return await file.text();
        } catch {
            // ignore
        }

        const buf = await file.arrayBuffer();
        try {
            return new TextDecoder("utf-8").decode(buf);
        } catch {
            return new TextDecoder("latin1").decode(buf);
        }
    },
};
