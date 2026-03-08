import { ServiceOrder, CompanyProfile, Customer } from '../types';
import { buildOsHtml } from '../services/osPdfService';

export const usePrintOS = (customers: Customer[], company: CompanyProfile) => {
  const getOSHtml = (order: ServiceOrder) => {
    const customer = customers.find(c => c.id === order.customerId) || {
      name: order.customerName,
      address: 'Não informado',
      document: 'N/A'
    };
    return buildOsHtml(order, customer, company);
  };

  return { getOSHtml };
};

