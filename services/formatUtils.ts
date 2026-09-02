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

const EXTENSO_UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const EXTENSO_DEZ_A_DEZENOVE = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const EXTENSO_DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const EXTENSO_CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

// Converte um número de 0 a 999 para extenso, sem a palavra de escala (mil/milhão).
const tresDigitosPorExtenso = (n: number): string => {
    if (n === 0) return '';
    if (n === 100) return 'cem';

    const centena = Math.floor(n / 100);
    const resto = n % 100;
    const partes: string[] = [];

    if (centena > 0) partes.push(EXTENSO_CENTENAS[centena]);

    if (resto > 0) {
        if (resto < 10) partes.push(EXTENSO_UNIDADES[resto]);
        else if (resto < 20) partes.push(EXTENSO_DEZ_A_DEZENOVE[resto - 10]);
        else {
            const dezena = Math.floor(resto / 10);
            const unidade = resto % 10;
            partes.push(unidade === 0 ? EXTENSO_DEZENAS[dezena] : `${EXTENSO_DEZENAS[dezena]} e ${EXTENSO_UNIDADES[unidade]}`);
        }
    }

    return partes.join(' e ');
};

// Converte um número inteiro não negativo para extenso, agrupando em
// milhares/milhões/bilhões, com "e"/vírgula entre grupos seguindo a
// convenção usual do português (ex: "mil e seiscentos", "doze mil,
// trezentos e quarenta e cinco").
const inteiroPorExtenso = (n: number): string => {
    if (n === 0) return 'zero';

    const escalas: { valor: number; texto: (qtd: number) => string }[] = [
        { valor: 1_000_000_000, texto: (qtd) => (qtd === 1 ? 'um bilhão' : `${tresDigitosPorExtenso(qtd)} bilhões`) },
        { valor: 1_000_000, texto: (qtd) => (qtd === 1 ? 'um milhão' : `${tresDigitosPorExtenso(qtd)} milhões`) },
        { valor: 1_000, texto: (qtd) => (qtd === 1 ? 'mil' : `${tresDigitosPorExtenso(qtd)} mil`) },
    ];

    let restante = n;
    const grupos: { texto: string; valor: number }[] = [];

    for (const escala of escalas) {
        const qtd = Math.floor(restante / escala.valor);
        if (qtd > 0) {
            grupos.push({ texto: escala.texto(qtd), valor: qtd * escala.valor });
            restante -= qtd * escala.valor;
        }
    }

    if (restante > 0) {
        grupos.push({ texto: tresDigitosPorExtenso(restante), valor: restante });
    }

    if (grupos.length === 1) return grupos[0].texto;

    const ultimo = grupos[grupos.length - 1];
    const usaE = ultimo.valor < 100 || (ultimo.valor % 100 === 0 && ultimo.valor < 1000);
    const inicio = grupos.slice(0, -1).map(g => g.texto).join(', ');

    return `${inicio}${usaE ? ' e ' : ', '}${ultimo.texto}`;
};

/**
 * Escreve um valor monetário por extenso, em português (ex: 1600 ->
 * "mil e seiscentos reais"). Usado nas cláusulas de preço dos contratos.
 */
export const valorPorExtenso = (valor: number): string => {
    const absoluto = Math.abs(toNumber(valor));
    const inteiro = Math.floor(absoluto);
    const centavos = Math.round((absoluto - inteiro) * 100);

    const textoInteiro = inteiroPorExtenso(inteiro);
    // "de" é obrigatório entre milhão(ões)/bilhão(ões) e o substantivo
    // seguinte quando não sobra resto depois deles (ex: "um milhão DE reais").
    const precisaDe = /(milhão|milhões|bilhão|bilhões)$/.test(textoInteiro);
    const textoReais = `${textoInteiro}${precisaDe ? ' de' : ''} ${inteiro === 1 ? 'real' : 'reais'}`;

    if (centavos === 0) return textoReais;

    const textoCentavos = `${inteiroPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`;
    return `${textoReais} e ${textoCentavos}`;
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
