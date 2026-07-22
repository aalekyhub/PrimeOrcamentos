
import { Customer, CatalogService } from '../types';

/**
 * Limpa formatação de documentos (CPF/CNPJ)
 */
export const cleanDocument = (doc: string): string => {
  return doc.replace(/\D/g, '');
};

/**
 * Verifica se um cliente com o mesmo documento já existe
 */
export const checkDuplicateCustomer = (
  document: string, 
  customers: Customer[], 
  excludeId?: string | null
): Customer | null => {
  const cleanDoc = cleanDocument(document);
  if (!cleanDoc) return null;
  
  return customers.find(c => 
    cleanDocument(c.document) === cleanDoc && c.id !== excludeId
  ) || null;
};

/**
 * Verifica se um serviço com o mesmo nome já existe
 */
export const checkDuplicateService = (
  name: string, 
  services: CatalogService[], 
  excludeId?: string | null
): CatalogService | null => {
  const normalizedName = name.trim().toLowerCase();
  if (!normalizedName) return null;

  return services.find(s => 
    s.name.trim().toLowerCase() === normalizedName && s.id !== excludeId
  ) || null;
};

/**
 * Valida o dígito verificador de um CPF
 */
export const isValidCPF = (doc: string): boolean => {
  const cpf = cleanDocument(doc);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (check !== parseInt(cpf[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return check === parseInt(cpf[10], 10);
};

/**
 * Valida o dígito verificador de um CNPJ
 */
export const isValidCNPJ = (doc: string): boolean => {
  const cnpj = cleanDocument(doc);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDigit = (base: string) => {
    let pos = base.length - 7;
    let sum = 0;
    for (let i = base.length; i >= 1; i--) {
      sum += parseInt(base[base.length - i], 10) * pos--;
      if (pos < 2) pos = 9;
    }
    const result = sum % 11;
    return result < 2 ? 0 : 11 - result;
  };

  const firstDigit = calcDigit(cnpj.substring(0, 12));
  if (firstDigit !== parseInt(cnpj[12], 10)) return false;

  const secondDigit = calcDigit(cnpj.substring(0, 13));
  return secondDigit === parseInt(cnpj[13], 10);
};

/**
 * Valida CPF (11 dígitos) ou CNPJ (14 dígitos) pelo dígito verificador
 */
export const isValidDocument = (doc: string): boolean => {
  const clean = cleanDocument(doc);
  if (clean.length === 11) return isValidCPF(clean);
  if (clean.length === 14) return isValidCNPJ(clean);
  return false;
};

/**
 * Formata CPF/CNPJ para exibição
 */
export const formatDocument = (doc: string): string => {
  const clean = cleanDocument(doc);
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  } else if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return doc;
};
