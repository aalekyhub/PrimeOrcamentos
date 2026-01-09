
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
