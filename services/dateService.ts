/**
 * Retorna a data atual no formato YYYY-MM-DD usando o fuso horário local.
 * Isso evita o problema de "pular um dia" que ocorre com .toISOString() tarde da noite.
 */
export const getTodayIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formata um objeto Date para YYYY-MM-DD no fuso horário local.
 */
export const formatLocalDateIso = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Adiciona dias a uma data (ou à data atual) e retorna no formato YYYY-MM-DD local.
 */
export const addDaysToDate = (days: number, fromDate: Date = new Date()) => {
  const result = new Date(fromDate);
  result.setDate(result.getDate() + days);
  return formatLocalDateIso(result);
};
