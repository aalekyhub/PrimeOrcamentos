/**
 * Serviços de validação e formatação para o módulo financeiro.
 */

/**
 * Identifica se uma categoria é um Aporte ou Empréstimo de Sócios.
 */
export const isAporte = (category: string | undefined): boolean => {
  if (!category) return false;
  const cat = category.toLowerCase();
  return cat.includes('aporte') || cat.includes('emprestimo') || cat.includes('empréstimo');
};

/**
 * Retorna as classes de cor de acordo com o status do lançamento.
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'PAGO': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
    case 'ATRASADO': return 'text-rose-500 bg-rose-50 border-rose-100';
    case 'CANCELADO': return 'text-slate-400 bg-slate-50 border-slate-100';
    default: return 'text-amber-500 bg-amber-50 border-amber-100';
  }
};

/**
 * Formata um número para o padrão monetário brasileiro.
 */
export const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).replace('R$', 'R$ ');
};

/**
 * Formata um número simples com separadores de milhar.
 */
export const formatNumber = (amount: number): string => {
  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};
