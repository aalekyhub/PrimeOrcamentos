import { ServiceOrder, CompanyProfile, Customer } from '../types';
import { buildOsHtml } from '../services/osPdfService';

export const usePrintOS = (customers: Customer[], company: CompanyProfile) => {
  const handlePrintOS = (order: ServiceOrder) => {
    const customer = customers.find(c => c.id === order.customerId) || { name: order.customerName, address: 'Não informado', document: 'N/A' };
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = buildOsHtml(order, customer, company);
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return { handlePrintOS };
};

