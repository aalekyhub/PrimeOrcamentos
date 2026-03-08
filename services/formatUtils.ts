export const escapeHtml = (unsafe: unknown): string => {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

export const toNumber = (val: any): number => {
    if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
    if (val === null || val === undefined || val === '') return 0;

    const raw = String(val).trim();

    if (raw.includes(',')) {
        const normalizedBR = raw.replace(/\./g, '').replace(',', '.');
        const num = Number(normalizedBR);
        return Number.isFinite(num) ? num : 0;
    }

    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
};

export const roundMoney = (value: number): number => {
    return Math.round((value + Number.EPSILON) * 100) / 100;
};

export const formatMoney = (val: any): string => {
    const num = toNumber(val);
    return num.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

export const formatQty = (val: any): string => {
    const num = toNumber(val);
    if (Number.isInteger(num)) return String(num);
    return num.toLocaleString('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3
    });
};

export const formatDateBR = (dateStr?: string): string => {
    if (!dateStr) return new Date().toLocaleDateString('pt-BR');

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR');
};
