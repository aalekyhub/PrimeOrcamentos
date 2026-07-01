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
     * Calcula o valor dos impostos sobre o subtotal + BDI
     */
    calculateTaxes: (subtotal: number, bdiValue: number, taxRate: number | undefined): number => {
        if (!taxRate) return 0;
        return (subtotal + bdiValue) * (taxRate / 100);
    },

    /**
     * Calcula o valor do INSS sobre o subtotal + BDI
     */
    calculateINSS: (subtotal: number, bdiValue: number, inssRate: number | undefined): number => {
        if (!inssRate) return 0;
        return (subtotal + bdiValue) * (inssRate / 100);
    },

    /**
     * Calcula o custo planejado total (Subtotal + BDI + Impostos + INSS)
     */
    calculatePlannedCost: (subtotal: number, bdiValue: number, taxValue: number, inssValue: number): number => {
        return subtotal + bdiValue + taxValue + inssValue;
    },

    /**
     * Calcula o investimento total final (Preço de Contrato ou Custo Planejado)
     */
    calculateFinalTotal: (order: ServiceOrder): number => {
        const subtotal = financeUtils.calculateSubtotal(order.items);
        const bdiValue = financeUtils.calculateBDI(subtotal, order.bdiRate);
        const taxValue = financeUtils.calculateTaxes(subtotal, bdiValue, order.taxRate);
        const inssValue = financeUtils.calculateINSS(subtotal, bdiValue, order.inssRate);
        const plannedCost = financeUtils.calculatePlannedCost(subtotal, bdiValue, taxValue, inssValue);

        return order.contractPrice && order.contractPrice > 0 ? order.contractPrice : plannedCost;
    },

    /**
     * Retorna todos os valores detalhados de uma ordem
     */
    getDetailedFinancials: (order: ServiceOrder) => {
        const subtotal = financeUtils.calculateSubtotal(order.items);
        const bdiValue = financeUtils.calculateBDI(subtotal, order.bdiRate);
        const taxValue = financeUtils.calculateTaxes(subtotal, bdiValue, order.taxRate);
        const inssValue = financeUtils.calculateINSS(subtotal, bdiValue, order.inssRate);
        const plannedCost = financeUtils.calculatePlannedCost(subtotal, bdiValue, taxValue, inssValue);
        const finalTotal = order.contractPrice && order.contractPrice > 0 ? order.contractPrice : plannedCost;

        return {
            subtotal,
            bdiValue,
            taxValue,
            inssValue,
            plannedCost,
            finalTotal
        };
    }
};
