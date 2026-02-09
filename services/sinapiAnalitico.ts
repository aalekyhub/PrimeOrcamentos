
import { sinapiDb, SinapiComposicaoRecord } from './sinapiDb';

export interface AnaliticoItem {
    tipo_item: 'INSUMO' | 'COMPOSICAO' | 'DESCONHECIDO';
    codigo_item: string;
    descricao_item: string;
    unidade_item: string;
    coeficiente: number;
    custo_unitario: number;
    custo_total: number;
}

export interface AnaliticoResult {
    composicao: SinapiComposicaoRecord | null;
    itens: AnaliticoItem[];
    total: number;
    isFallback?: boolean;
}

export const sinapiAnalitico = {
    async build(mes_ref: string, uf: string, modo: string, codigo_composicao: string): Promise<AnaliticoResult> {
        const composicao = await sinapiDb.findComposicao(mes_ref, uf, modo, codigo_composicao);
        let itensBOM = await sinapiDb.getComposicaoItens(mes_ref, uf, modo, codigo_composicao);

        let isFallback = false;
        if (itensBOM.length === 0) {
            const alternativeModos = ['SD', 'CD', 'SE'].filter(m => m !== modo);
            for (const alt of alternativeModos) {
                const altItens = await sinapiDb.getComposicaoItens(mes_ref, uf, alt, codigo_composicao);
                if (altItens.length > 0) {
                    itensBOM = altItens;
                    isFallback = true;
                    break;
                }
            }
        }

        const itens: AnaliticoItem[] = [];
        let grandTotal = 0;

        for (const item of itensBOM) {
            // Priority 1: Use direct snapshot values from the Analítico report if available and not in fallback
            let custo_unitario = (!isFallback && item.custo_unitario) ? item.custo_unitario : 0;
            let total = (!isFallback && item.custo_total) ? item.custo_total : 0;

            // Priority 2: Lookup in database if snapshot values are missing or zero
            if (custo_unitario === 0) {
                custo_unitario = await sinapiDb.getItemPrice(mes_ref, uf, modo, item.tipo_item, item.codigo_item);
                total = item.coeficiente * custo_unitario;
            } else if (total === 0) {
                total = item.coeficiente * custo_unitario;
            }

            itens.push({
                tipo_item: item.tipo_item || 'DESCONHECIDO',
                codigo_item: item.codigo_item,
                descricao_item: item.descricao_item,
                unidade_item: item.unidade_item,
                coeficiente: item.coeficiente,
                custo_unitario: custo_unitario,
                custo_total: total
            });

            grandTotal += total;
        }

        // Round grand total to match typical SINAPI report display (2 decimal places)
        const finalTotal = Math.round(grandTotal * 100) / 100;

        return {
            composicao: composicao || null,
            itens,
            total: finalTotal,
            isFallback
        };
    }
};
