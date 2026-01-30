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
     * Calcula o custo planejado total (Subtotal + BDI + Impostos)
     */
    calculatePlannedCost: (subtotal: number, bdiValue: number, taxValue: number): number => {
        return subtotal + bdiValue + taxValue;
    },

    /**
     * Calcula o investimento total final (Preço de Contrato ou Custo Planejado)
     */
    calculateFinalTotal: (order: ServiceOrder): number => {
        const subtotal = financeUtils.calculateSubtotal(order.items);
        const bdiValue = financeUtils.calculateBDI(subtotal, order.bdiRate);
        const taxValue = financeUtils.calculateTaxes(subtotal, bdiValue, order.taxRate);
        const plannedCost = financeUtils.calculatePlannedCost(subtotal, bdiValue, taxValue);

        return order.contractPrice && order.contractPrice > 0 ? order.contractPrice : plannedCost;
    },

    /**
     * Retorna todos os valores detalhados de uma ordem
     */
    getDetailedFinancials: (order: ServiceOrder) => {
        const subtotal = financeUtils.calculateSubtotal(order.items);
        const bdiValue = financeUtils.calculateBDI(subtotal, order.bdiRate);
        const taxValue = financeUtils.calculateTaxes(subtotal, bdiValue, order.taxRate);
        const plannedCost = financeUtils.calculatePlannedCost(subtotal, bdiValue, taxValue);
        const finalTotal = order.contractPrice && order.contractPrice > 0 ? order.contractPrice : plannedCost;

        return {
            subtotal,
            bdiValue,
            taxValue,
            plannedCost,
            finalTotal
        };
    }
};
