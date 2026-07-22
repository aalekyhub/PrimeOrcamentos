import { ServiceItem, ServiceOrder } from '../types';

export const financeUtils = {
    /**
     * Calcula o subtotal de uma lista de itens (Qtd * Preço Unitário)
     */
    calculateSubtotal: (items: ServiceItem[]): number => {
        return items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    },

    /**
     * Calcula o valor do BDI sobre o subtotal
     */
    calculateBDI: (subtotal: number, bdiRate: number | undefined): number => {
        if (!bdiRate) return 0;
        return subtotal * (bdiRate / 100);
    },

    /**
     * Preço final "por dentro": o subtotal com BDI é dividido pelo complemento
     * de impostos+INSS, para que o valor líquido depois de descontar os
     * tributos ainda cubra o custo com BDI. Única fonte da fórmula de
     * fechamento de orçamento — usada na tela de criação (BudgetManager),
     * no PDF da proposta e no PDF da Ordem de Serviço, para os três nunca
     * mais divergirem entre si.
     */
    calculateGrossTotal: (
        subtotal: number,
        bdiRate: number | undefined,
        taxRate: number | undefined,
        inssRate: number | undefined
    ): number => {
        const bdiValue = financeUtils.calculateBDI(subtotal, bdiRate);
        const subtotalWithBDI = subtotal + bdiValue;
        const totalRate = (taxRate || 0) + (inssRate || 0);
        if (totalRate >= 100) return subtotalWithBDI;
        const taxFactor = 1 - totalRate / 100;
        if (taxFactor <= 0) return subtotalWithBDI;
        return subtotalWithBDI / taxFactor;
    },

    /**
     * Calcula o investimento total final: usa o preço fechado com o cliente
     * se houver, senão o total já salvo no orçamento, e só recalcula do zero
     * como último recurso (orçamento antigo sem totalAmount salvo).
     */
    calculateFinalTotal: (order: ServiceOrder): number => {
        if (order.contractPrice && order.contractPrice > 0) return order.contractPrice;
        if (order.totalAmount && order.totalAmount > 0) return order.totalAmount;
        const subtotal = financeUtils.calculateSubtotal(order.items);
        return financeUtils.calculateGrossTotal(subtotal, order.bdiRate, order.taxRate, order.inssRate);
    },

    /**
     * Retorna todos os valores detalhados de uma ordem, para exibição em PDF.
     * BDI e a fatia de impostos/INSS são derivados a partir do mesmo total
     * final usado em todo o resto do app, então subtotal + bdi + impostos +
     * inss sempre soma exatamente o valor final exibido.
     */
    getDetailedFinancials: (order: ServiceOrder) => {
        const subtotal = financeUtils.calculateSubtotal(order.items);
        const bdiValue = financeUtils.calculateBDI(subtotal, order.bdiRate);
        const finalTotal = financeUtils.calculateFinalTotal(order);

        const taxRate = order.taxRate || 0;
        const inssRate = order.inssRate || 0;
        const totalRate = taxRate + inssRate;
        const taxAndInssValue = Math.max(0, finalTotal - subtotal - bdiValue);
        const taxValue = totalRate > 0 ? taxAndInssValue * (taxRate / totalRate) : 0;
        const inssValue = totalRate > 0 ? taxAndInssValue * (inssRate / totalRate) : 0;

        return {
            subtotal,
            bdiValue,
            taxValue,
            inssValue,
            plannedCost: finalTotal,
            finalTotal
        };
    }
};
