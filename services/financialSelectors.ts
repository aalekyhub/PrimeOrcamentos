import { Transaction, AccountEntry, FinancialAccount, FinancialCategory } from '../types';
import { isAporte } from './financialHelpers';

/**
 * Seletores e transformadores de dados para o módulo financeiro.
 */

export interface RealizedItem extends Transaction {
  isFromEntry?: boolean;
}

/**
 * Consolida todas as transações realizadas (Transactions + AccountEntries PAGAS).
 */
export const selectAllRealized = (
  transactions: Transaction[],
  accountEntries: AccountEntry[]
): RealizedItem[] => {
  const realizedFromEntries = accountEntries
    .filter(e => e.status === 'PAGO' && !transactions.some(t => t.entryId === e.id))
    .map(e => ({
      id: e.id,
      date: e.paymentDate || e.dueDate,
      dueDate: e.dueDate,
      amount: e.amount,
      type: (e.type === 'RECEBER' || e.type === 'INVESTIMENTO') ? 'RECEITA' : 'DESPESA' as any,
      category: e.category,
      description: e.description,
      isFromEntry: true,
      customerName: e.customerName,
      supplierName: e.supplierName,
      attachment: e.attachment,
      attachmentName: e.attachmentName
    }));

  return [...transactions, ...realizedFromEntries].sort((a, b) => b.date.localeCompare(a.date));
};

/**
 * Calcula os totais do dashboard para um determinado ano.
 */
export const selectDashboardTotals = (allRealized: RealizedItem[], selectedYear: number) => {
  const yearStr = selectedYear.toString();
  const yearEntries = allRealized.filter(t => t.date.startsWith(yearStr));

  const faturamento = yearEntries
    .filter(t => t.type === 'RECEITA' && !isAporte(t.category))
    .reduce((a, c) => a + c.amount, 0);

  const despesas = yearEntries
    .filter(t => t.type === 'DESPESA')
    .reduce((a, c) => a + c.amount, 0);

  const aportes = yearEntries
    .filter(t => isAporte(t.category))
    .reduce((a, c) => a + c.amount, 0);

  const resultadoOperacional = faturamento - despesas;
  const saldoFinal = resultadoOperacional + aportes;
  
  // Índice de Sobrevivência (Margem de segurança da operação)
  const margemSeguranca = despesas > 0 ? (faturamento / despesas) * 100 : 0;

  return {
    faturamento,
    despesas,
    aportes,
    resultadoOperacional,
    saldoFinal,
    margemSeguranca
  };
};

/**
 * Prepara os dados para o gráfico de barras mensal.
 */
export const selectChartData = (allRealized: RealizedItem[], selectedYear: number) => {
  const monthsKeys = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const yearStr = selectedYear.toString();

  return monthsKeys.map((name, index) => {
    const monthIso = String(index + 1).padStart(2, '0');
    const monthPrefix = `${yearStr}-${monthIso}`;
    const monthEntries = allRealized.filter(t => t.date.startsWith(monthPrefix));
    
    return {
      name,
      ent: monthEntries.filter(t => t.type === 'RECEITA').reduce((acc, t) => acc + t.amount, 0),
      sai: monthEntries.filter(t => t.type === 'DESPESA').reduce((acc, t) => acc + t.amount, 0)
    };
  });
};

/**
 * Identifica as maiores categorias de despesa.
 */
export const selectTopExpenses = (
  allRealized: RealizedItem[],
  categories: FinancialCategory[],
  selectedYear: number,
  limit = 5
) => {
  const yearStr = selectedYear.toString();
  const yearDespesas = allRealized.filter(t => t.type === 'DESPESA' && t.date.startsWith(yearStr));
  const totalDespesas = yearDespesas.reduce((a, c) => a + c.amount, 0);

  return categories
    .filter(c => c.type === 'DESPESA')
    .map(cat => {
      const value = yearDespesas
        .filter(t => t.category === cat.name)
        .reduce((a, c) => a + c.amount, 0);
      return {
        name: cat.name,
        value,
        percent: totalDespesas > 0 ? (value / totalDespesas) * 100 : 0
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
};

/**
 * Consolida o saldo total de todas as contas.
 */
export const selectTotalBalance = (accounts: FinancialAccount[]) => {
  return accounts.reduce((a, c) => a + c.currentBalance, 0);
};
