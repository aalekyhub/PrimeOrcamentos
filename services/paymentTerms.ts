import { roundMoney } from './formatUtils';

export type PaymentKind = 'vista' | 'parcelado' | 'conclusao';

const currency = (val: number) =>
  `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const buildPaymentText = (kind: PaymentKind, total: number, entry = 0, installments = 1): string => {
  if (kind === 'vista') {
    return `Pagamento à vista na aprovação do orçamento. Total: ${currency(total)}.`;
  }
  if (kind === 'conclusao') {
    return `Pagamento integral de ${currency(total)} a ser realizado após entrega técnica e aprovação dos serviços.`;
  }

  entry = roundMoney(entry);
  const remainder = roundMoney(Math.max(0, total - entry));
  const parcValue = installments > 0 ? remainder / installments : 0;

  let text = `Entrada de ${currency(entry)} na aprovação.`;
  if (installments === 1) {
    text += `\nSaldo restante de ${currency(remainder)}, na conclusão dos serviços prestados.`;
  } else if (installments > 1) {
    text += `\nSaldo restante de ${currency(remainder)} dividido em ${installments}x de ${currency(parcValue)}.`;
  }
  return text;
};

const parseMoney = (raw: string) => Number(raw.replace(/\./g, '').replace(',', '.'));

const MONEY = '(\\d{1,3}(?:\\.\\d{3})*,\\d{2})';
const RE_VISTA = new RegExp(`^Pagamento à vista na aprovação do orçamento\\. Total: R\\$ ${MONEY}\\.$`);
const RE_CONCLUSAO = new RegExp(`^Pagamento integral de R\\$ ${MONEY} a ser realizado após entrega técnica e aprovação dos serviços\\.$`);
const RE_PARCELADO = new RegExp(
  `^Entrada de R\\$ ${MONEY} na aprovação\\.\\nSaldo restante de R\\$ ${MONEY}` +
  `(?:, na conclusão dos serviços prestados|` +
  ` dividido em (\\d+)x de R\\$ ${MONEY})\\.$`
);

/**
 * Se o texto foi gerado pelo gerador de condição de pagamento (e não editado à mão),
 * recalcula-o para o novo total, mantendo o tipo, as parcelas e a proporção da entrada.
 * Texto digitado manualmente não é reconhecido e volta como está (null = nada a fazer).
 */
export const refreshPaymentText = (text: string, newTotal: number, entryPercent?: number): string | null => {
  if (!text || !(newTotal > 0)) return null;
  const normalized = text.replace(/\r\n/g, '\n').trim();
  const total = roundMoney(newTotal);

  let next: string | null = null;

  const vista = RE_VISTA.exec(normalized);
  const conclusao = RE_CONCLUSAO.exec(normalized);
  const parcelado = RE_PARCELADO.exec(normalized);

  if (vista) {
    next = buildPaymentText('vista', total);
  } else if (conclusao) {
    next = buildPaymentText('conclusao', total);
  } else if (parcelado) {
    const oldEntry = parseMoney(parcelado[1]);
    const oldTotal = oldEntry + parseMoney(parcelado[2]);
    const installments = parcelado[3] ? Number(parcelado[3]) : 1;

    // O percentual salvo vale se bater com a entrada escrita; senão deduz-se do próprio texto.
    let percent = oldTotal > 0 ? (oldEntry / oldTotal) * 100 : 0;
    if (entryPercent !== undefined && Math.abs(roundMoney((oldTotal * entryPercent) / 100) - oldEntry) <= 0.01) {
      percent = entryPercent;
    }

    next = buildPaymentText('parcelado', total, roundMoney((total * percent) / 100), installments);
  }

  return next !== null && next !== normalized ? next : null;
};
