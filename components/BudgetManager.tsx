
import React, { useState, useMemo } from 'react';
import html2pdf from 'html2pdf.js';
import {
  Plus, Search, X, Trash2, Pencil, Printer, Save,
  UserPlus, Package, Type, Image as ImageIcon,
  FileText, Upload, CheckCircle, Zap, FileDown, Copy, Database
} from 'lucide-react';
import RichTextEditor from './ui/RichTextEditor';
import { ServiceOrder, OrderStatus, Customer, ServiceItem, CatalogService, CompanyProfile, DescriptionBlock } from '../types';
import { useNotify } from './ToastProvider';
import CustomerManager from './CustomerManager';
import ServiceCatalog from './ServiceCatalog';
import { db } from '../services/db';
import { compressImage } from '../services/imageUtils';

interface Props {
  orders: ServiceOrder[];
  setOrders: React.Dispatch<React.SetStateAction<ServiceOrder[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  catalogServices: CatalogService[];
  setCatalogServices: React.Dispatch<React.SetStateAction<CatalogService[]>>;
  company: CompanyProfile;
}

const BudgetManager: React.FC<Props> = ({ orders, setOrders, customers, setCustomers, catalogServices, setCatalogServices, company }) => {
  const [showForm, setShowForm] = useState(false);
  const [showFullClientForm, setShowFullClientForm] = useState(false);
  const [showFullServiceForm, setShowFullServiceForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { notify } = useNotify();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [proposalTitle, setProposalTitle] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('50% avista, 25% com 30 dias, 25% restante na conclusão');
  const [paymentEntryPercent, setPaymentEntryPercent] = useState<number>(30);
  const [deliveryTime, setDeliveryTime] = useState('15 dias uteis');
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [descriptionBlocks, setDescriptionBlocks] = useState<DescriptionBlock[]>([]);

  const [currentDesc, setCurrentDesc] = useState('');
  const [currentUnit, setCurrentUnit] = useState('un');
  const [currentQty, setCurrentQty] = useState(1);
  const [currentPrice, setCurrentPrice] = useState(0);

  const [taxRate, setTaxRate] = useState<string | number>(0);
  const [bdiRate, setBdiRate] = useState<string | number>(0);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSearch, setImportSearch] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCatalogId, setSelectedCatalogId] = useState('');


  const budgets = useMemo(() => orders.filter(o =>
    (o.status === OrderStatus.PENDING || o.status === OrderStatus.APPROVED) && (o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm))
  ), [orders, searchTerm]);

  const subtotal = useMemo(() => items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0), [items]);
  const totalAmount = useMemo(() => {
    const bdi = Number(bdiRate) || 0;
    const tax = Number(taxRate) || 0;
    const bdiValue = subtotal * (bdi / 100);
    const subtotalWithBDI = subtotal + bdiValue;
    const taxValue = subtotalWithBDI * (tax / 100);
    return subtotalWithBDI + taxValue;
  }, [subtotal, taxRate, bdiRate]);

  const handleAddItem = () => {
    if (!currentDesc || currentPrice <= 0) return;
    const newItem: ServiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: currentDesc,
      quantity: currentQty,
      unitPrice: currentPrice,
      unit: currentUnit,
      type: 'Serviço'
    };
    setItems([...items, newItem]);
    setCurrentDesc(''); setCurrentPrice(0); setCurrentQty(1);
    setSelectedCatalogId('');
  };

  const updateItem = (id: string, field: keyof ServiceItem, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const updateItemTotal = (id: string, total: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const quantity = item.quantity || 1;
        return { ...item, unitPrice: total / quantity };
      }
      return item;
    }));
  };

  // NEXT_Methods
  const addTextBlock = () => setDescriptionBlocks([...descriptionBlocks, { id: Date.now().toString(), type: 'text', content: '' }]);
  const addImageBlock = () => setDescriptionBlocks([...descriptionBlocks, { id: Date.now().toString(), type: 'image', content: '' }]);
  const updateBlockContent = (id: string, content: string) => setDescriptionBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));

  const handleImageUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file);
        updateBlockContent(id, compressedBase64);
      } catch (error) {
        console.error("Erro ao comprimir imagem:", error);
        notify("Erro ao processar imagem. Tente uma menor.", "error");
      }
    }
  };

  const getBudgetHtml = (budget: ServiceOrder) => {
    const customer = customers.find(c => c.id === budget.customerId) || { name: budget.customerName, address: 'Não informado', document: 'Documento não informado' };

    const formatDate = (dateStr: string) => {
      try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? new Date().toLocaleDateString('pt-BR') : d.toLocaleDateString('pt-BR');
      } catch {
        return new Date().toLocaleDateString('pt-BR');
      }
    };

    const emissionDate = formatDate(budget.createdAt);
    const validityDays = company.defaultProposalValidity || 15;
    const validityDate = budget.dueDate ? formatDate(budget.dueDate) : formatDate(new Date(new Date(budget.createdAt || Date.now()).getTime() + validityDays * 24 * 60 * 60 * 1000).toISOString());

    const subTotal = budget.items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
    const bdiR = budget.bdiRate || 0;
    const taxR = budget.taxRate || 0;
    const bdiValue = subTotal * (bdiR / 100);
    const subTotalWithBDI = subTotal + bdiValue;
    const taxValue = subTotalWithBDI * (taxR / 100);
    const finalTotal = subTotalWithBDI + taxValue;

    const itemFontBase = company.itemsFontSize || 12; // Slightly smaller base for print fit
    const itemsHtml = budget.items.map((item: ServiceItem) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 16px 0; font-weight: 600; text-transform: uppercase; font-size: ${itemFontBase}px; color: #334155; width: 55%; vertical-align: top;">${item.description}</td>
        <td style="padding: 16px 0; text-align: center; font-weight: 600; color: #475569; font-size: ${itemFontBase}px; width: 10%; vertical-align: top;">${item.quantity} ${item.unit || ''}</td>
        <td style="padding: 16px 0; text-align: right; color: #475569; font-size: ${itemFontBase}px; width: 17.5%; vertical-align: top;">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 16px 0; text-align: right; font-weight: 700; font-size: ${itemFontBase}px; color: #0f172a; width: 17.5%; vertical-align: top;">R$ ${(item.unitPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      </tr>`).join('');

    return `
      <table style="width: 100%; border-collapse: collapse; font-family: 'Inter', sans-serif;">
        <thead>
            <tr>
                <td style="height: 20mm; border: none; padding: 0;"><div style="height: 20mm;">&nbsp;</div></td>
            </tr>
        </thead>
        <tfoot>
            <tr>
                <td style="height: 15mm; border: none; padding: 0;"><div style="height: 15mm;">&nbsp;</div></td>
            </tr>
        </tfoot>
        <tbody>
          <tr>
            <td style="padding: 0;">
              <div class="a4-container">
                  <!-- Header Content (First Page Only - positioned absolutely or relatively within the first page flow) -->
                  <!-- Since we have a thead spacer, this header will appear AFTER the 20mm spacer on the first page, which is correct. -->
                  <div style="padding-bottom: 25px !important; border-bottom: 3px solid #000; margin-bottom: 40px;">
                     <div style="display: flex; justify-content: space-between; align-items: center;">
                         <div style="display: flex; gap: 24px; align-items: center;">
                             <div style="width: 80px; display: flex; align-items: center; justify: flex-start;">
                                 ${company.logo ? `<img src="${company.logo}" style="max-height: 80px; max-width: 100%; object-fit: contain;">` : '<div style="font-weight:900; font-size:32px; color:#1e3a8a;">PRIME</div>'}
                             </div>
                             <div>
                                 <h1 style="font-size: 18px; font-weight: 800; color: #0f172a; line-height: 1.2; margin: 0 0 2px 0; text-transform: uppercase;">${company.name}</h1>
                                 <p style="margin: 0; font-size: 11px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.02em;">Soluções em Gestão Profissional</p>
                                  <p style="margin: 4px 0 0 0; font-size: 10px; color: #64748b; font-weight: 500;">${company.cnpj || ''} | ${company.phone || ''}</p>
                             </div>
                         </div>
                         <div style="text-align: right;">
                             <p style="margin: 0; font-size: 24px; font-weight: 800; color: #2563eb;">${budget.id}</p>
                             <p style="margin: 4px 0 0 0; font-size: 10px; font-weight: 700; color: #334155; text-transform: uppercase;">EMISSÃO: ${emissionDate}</p>
                             <p style="margin: 2px 0 0 0; font-size: 10px; font-weight: 700; color: #334155; text-transform: uppercase;">VALIDADE: ${validityDate}</p>
                         </div>
                     </div>
                  </div>

                 <!-- Boxes Grid -->
                 <div style="display: flex; gap: 24px; margin-bottom: 40px;">
                     <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
                         <span style="font-size: 10px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">CLIENTE / DESTINATÁRIO</span>
                         <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; line-height: 1.4;">${customer.name}</div>
                         <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-top: 4px;">${customer.document || 'CPF/CNPJ não informado'}</div>
                     </div>
                     <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
                         <span style="font-size: 10px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">REFERÊNCIA DO ORÇAMENTO</span>
                         <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; line-height: 1.4;">${budget.description || 'PROPOSTA COMERCIAL'}</div>
                     </div>
                 </div>
  
                 <!-- Description Blocks -->
                 <div style="margin-bottom: 32px;">
                       <h2 style="margin: 0 0 8px 0; font-size: 11px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.02em;">PROPOSTA COMERCIAL</h2>
                       <p style="margin: 0; font-size: 20px; font-weight: 800; color: #2563eb; text-transform: uppercase; line-height: 1.3;">${budget.description}</p>
                 </div>
                 
                 ${budget.descriptionBlocks && budget.descriptionBlocks.length > 0 ? `
                  <div style="margin-bottom: 48px;" class="print-description-content">
                    <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; margin-bottom: 24px;">DESCRIÇÃO DOS SERVIÇOS</div>
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                      ${budget.descriptionBlocks.map(block => {
      if (block.type === 'text') {
        return `<div class="ql-editor-print" style="font-size: ${company.descriptionFontSize || 14}px; color: #334155; line-height: 1.6; text-align: justify;">${block.content}</div>`;
      } else if (block.type === 'image') {
        return `<div style="margin: 24px 0; break-inside: avoid; page-break-inside: avoid; display: block; text-align: center;"><img src="${block.content}" style="width: auto; max-width: 100%; border-radius: 8px; display: block; margin: 0 auto; object-fit: contain; max-height: 250mm;"></div>`;
      } else if (block.type === 'page-break') {
        return `<div style="page-break-after: always; break-after: page; height: 0;"></div>`;
      }
      return '';
    }).join('')}
                    </div>
                  </div>` : ''}
  
                  <!-- Items Table -->
                   <div style="margin-bottom: 40px; break-inside: avoid;">
                       <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 12px; margin-bottom: 8px;">DETALHAMENTO FINANCEIRO</div>
                       <table style="width: 100%; border-collapse: collapse;">
                          <thead>
                              <tr style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                                  <th style="padding: 12px 0; font-size: 10px; text-transform: uppercase; color: #64748b; text-align: left; font-weight: 800; width: 55%; letter-spacing: 0.05em;">ITEM / DESCRIÇÃO</th>
                                  <th style="padding: 12px 0; font-size: 10px; text-transform: uppercase; color: #64748b; text-align: center; font-weight: 800; width: 10%; letter-spacing: 0.05em;">QTD</th>
                                  <th style="padding: 12px 0; font-size: 10px; text-transform: uppercase; color: #64748b; text-align: right; font-weight: 800; width: 17.5%; letter-spacing: 0.05em;">UNITÁRIO</th>
                                  <th style="padding: 12px 0; font-size: 10px; text-transform: uppercase; color: #64748b; text-align: right; font-weight: 800; width: 17.5%; letter-spacing: 0.05em;">SUBTOTAL</th>
                              </tr>
                          </thead>
                          <tbody>${itemsHtml}</tbody>
                      </table>
                  </div>
  
                 <!-- Total Bar -->
                 <div style="margin-bottom: 32px; break-inside: avoid;">
                       <div style="display: flex; justify-content: flex-end; margin-bottom: 12px; gap: 40px;">
                           <div style="text-align: right;">
                              <span style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; letter-spacing: 0.05em; margin-bottom: 4px;">SUBTOTAL</span>
                              <span style="font-size: 14px; font-weight: 700; color: #334155; display: block;">R$ ${subTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                           </div>
                           ${bdiR > 0 ? `
                           <div style="text-align: right;">
                              <span style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; letter-spacing: 0.05em; margin-bottom: 4px;">BDI (${bdiR}%)</span>
                              <span style="font-size: 14px; font-weight: 700; color: #10b981; display: block;">+ R$ ${bdiValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                           </div>` : ''}
                           ${taxR > 0 ? `
                           <div style="text-align: right;">
                              <span style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; letter-spacing: 0.05em; margin-bottom: 4px;">IMPOSTOS (${taxR}%)</span>
                              <span style="font-size: 14px; font-weight: 700; color: #3b82f6; display: block;">+ R$ ${taxValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                           </div>` : ''}
                       </div>
                       <div style="background: #0f172a; color: white; padding: 24px 32px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center;">
                           <span style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;">INVESTIMENTO TOTAL:</span>
                           <span style="font-size: 36px; font-weight: 800; letter-spacing: -0.05em; line-height: 1;">R$ ${finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                       </div>
                 </div>
  
                 <!-- Terms & Payment -->
                 <div style="margin-bottom: 24px; break-inside: avoid;">
                     <div style="display: flex; gap: 24px;">
                         <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
                             <span style="font-size: 10px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">FORMA DE PAGAMENTO</span>
                             <p style="margin: 0; font-size: 12px; font-weight: 600; color: #334155; line-height: 1.5;">${budget.paymentTerms || 'A combinar'}</p>
                         </div>
                         <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
                             <span style="font-size: 10px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">PRAZO DE ENTREGA / EXECUÇÃO</span>
                             <p style="margin: 0; font-size: 12px; font-weight: 600; color: #334155; line-height: 1.5;">${budget.deliveryTime || 'A combinar'}</p>
                         </div>
                     </div>
                 </div>
  
                 <!-- Acceptance Box -->
                 <div style="margin-bottom: 32px; break-inside: avoid;">
                     <div style="border: 1px solid #bfdbfe; background: #eff6ff; border-radius: 16px; padding: 32px;">
                          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                              <div style="background: #2563eb; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">✓</div>
                              <span style="font-size: 13px; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: 0.05em;">TERMO DE ACEITE E AUTORIZAÇÃO PROFISSIONAL</span>
                          </div>
                          <p style="margin: 0; font-size: 12px; color: #1e3a8a; line-height: 1.6; text-align: justify; font-weight: 500;">
                              "Ao assinar abaixo, o cliente declara estar ciente e de pleno acordo com os valores, prazos e especificações descritas. Esta aceitação autoriza o início imediato dos trabalhos sob as condições estabelecidas. Validade: ${validityDays} dias."
                          </p>
                     </div>
                 </div>
  
                 <!-- Signature Lines -->
                  <div style="margin-top: 60px; break-inside: avoid;">
                     <div style="border-bottom: 2px solid #cbd5e1; width: 400px; max-width: 100%;"></div>
                     <p style="margin: 12px 0 0 0; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">ASSINATURA DO CLIENTE / ACEITE</p>
                 </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    `;
  };


  const handlePrint = (budget: ServiceOrder) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = getBudgetHtml(budget);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Orçamento - ${budget.id} - ${budget.description}</title>
         <script src="https://cdn.tailwindcss.com"></script>
         <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap" rel="stylesheet">
        <style>
           * { box-sizing: border-box; }
           body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
           @page { size: A4; margin: 0 !important; }
           .a4-container { width: 100%; margin: 0; background: white; padding-left: 15mm !important; padding-right: 15mm !important; padding-top: 15mm !important; padding-bottom: 15mm !important; }
           .avoid-break { break-inside: avoid; page-break-inside: avoid; }
           .keep-together { break-inside: avoid !important; page-break-inside: avoid !important; display: block !important; width: 100% !important; }
           
           @media screen { 
             body { background: #f1f5f9; padding: 40px 0; } 
             .a4-container { width: 210mm; margin: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border-radius: 8px; padding: 15mm; } 
           }
           @media print { 
             @page { margin: 0; size: A4; } /* Reset page margin to give full control to container */
             body { background: white !important; margin: 0 !important; padding: 0 !important; } 
              .a4-container { 
                  box-shadow: none !important; 
                  border: none !important; 
                  width: 100% !important; 
                  padding: 0 15mm !important; /* Side margins only. Vertical margins handled by thead/tfoot spacers */
                  margin: 0 !important; 
              }
             table { break-inside: auto; width: 100%; }
             tr { break-inside: avoid; break-after: auto; }
             thead { display: table-header-group; } 
             tfoot { display: table-footer-group; }
             .no-print { display: none !important; } 
           }

            /* Shared Rich Text / Quill Styles */
            .ql-editor-print ul { list-style-type: disc !important; padding-left: 30px !important; margin: 12px 0 !important; }
            .ql-editor-print ol { list-style-type: decimal !important; padding-left: 30px !important; margin: 12px 0 !important; }
            .ql-editor-print li { display: list-item !important; margin-bottom: 4px !important; }
            .ql-editor-print strong, .ql-editor-print b { font-weight: bold !important; color: #000 !important; }
            .ql-editor-print h1, .ql-editor-print h2, .ql-editor-print h3, .ql-editor-print h4 { font-weight: 800 !important; color: #0f172a !important; margin-top: 20px !important; margin-bottom: 10px !important; break-after: avoid !important; }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
           function optimizePageBreaks() {
             const root = document.querySelector('.print-description-content');
             if (!root) return;
             const content = root.querySelector('div');
             if (!content) return;

             const allNodes = [];
             Array.from(content.children).forEach(block => {
               if (block.classList.contains('ql-editor-print')) {
                  allNodes.push(...Array.from(block.children));
               } else {
                  allNodes.push(block);
               }
             });

             for (let i = 0; i < allNodes.length - 1; i++) {
               const el = allNodes[i];
               let isTitle = false;
               
               if (el.matches('h1, h2, h3, h4, h5, h6')) isTitle = true;
               else if (el.tagName === 'P' || el.tagName === 'DIV' || el.tagName === 'STRONG') {
                  const text = el.innerText.trim();
                  const isNumbered = /^\\d+(\\.\\d+)*[\\.\\s\\)]/.test(text);
                  const isBold = el.querySelector('strong, b') || (el.style && parseInt(el.style.fontWeight) > 600) || el.tagName === 'STRONG';
                  const isShort = text.length < 150;
                  if ((isNumbered && isBold && isShort) || (isBold && isShort && text === text.toUpperCase() && text.length > 4)) {
                    isTitle = true;
                  }
               }

               if (isTitle) {
                 const nodesToWrap = [el];
                 let j = i + 1;
                 while (j < allNodes.length && nodesToWrap.length < 3) {
                   const next = allNodes[j];
                   if (next.matches('h1, h2, h3, h4, h5, h6')) break;
                   nodesToWrap.push(next);
                   j++;
                 }

                 if (nodesToWrap.length > 1) {
                   const wrapper = document.createElement('div');
                   wrapper.className = 'keep-together';
                   el.parentNode.insertBefore(wrapper, el);
                   nodesToWrap.forEach(node => wrapper.appendChild(node));
                   i = j - 1;
                 }
               }
             }
           }
           window.onload = function() { 
             optimizePageBreaks();
             setTimeout(() => { 
                window.print(); 
                if (window.matchMedia) {
                    var mediaQueryList = window.matchMedia('print');
                    mediaQueryList.addListener(function(mql) {
                        if (!mql.matches) {
                            // window.close(); // Optional: close after print
                        }
                    });
                }
             }, 1000); 
           }
        </script>
      </body>
      </html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };


  const handleSave = async () => {
    if (isSaving) return;
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) { notify("Selecione um cliente", "error"); return; }
    if (items.length === 0) { notify("Adicione itens ao orçamento", "error"); return; }

    const existingBudget = editingBudgetId ? orders.find(o => o.id === editingBudgetId) : null;

    const data: ServiceOrder = {
      id: editingBudgetId || db.generateId('ORC'),
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      description: proposalTitle || 'REFORMA DE PINTURA',
      status: OrderStatus.PENDING,
      items, descriptionBlocks, totalAmount, paymentTerms, deliveryTime, paymentEntryPercent,
      taxRate: Number(taxRate) || 0, // Ensure number
      bdiRate: Number(bdiRate) || 0, // Ensure number
      createdAt: existingBudget?.createdAt || new Date().toISOString().split('T')[0],
      dueDate: existingBudget?.dueDate || new Date(Date.now() + (company.defaultProposalValidity || 15) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    const newList = editingBudgetId ? orders.map(o => o.id === editingBudgetId ? data : o) : [data, ...orders];
    setOrders(newList);

    setIsSaving(true);
    try {
      const result = await db.save('serviflow_orders', newList);
      if (result?.success) {
        notify("Orçamento salvo e sincronizado!");
        setTimeout(() => setShowForm(false), 1500);
      } else if (result?.error === 'quota_exceeded') {
        notify("ERRO DE ARMAZENAMENTO: Limite excedido.", "error");
      } else {
        notify(`Salvo localmente. Erro Sync: ${result?.error?.message || JSON.stringify(result?.error)}`, "warning");
        setShowForm(false);
      }
    } finally { setIsSaving(false); }
  };

  // Helper to load existing budget data into form
  const loadBudgetToForm = (budget: ServiceOrder, isClone = false) => {
    setShowImportModal(false);
    setEditingBudgetId(isClone ? null : budget.id);
    setSelectedCustomerId(budget.customerId);
    setItems(budget.items.map(item => ({ ...item, id: db.generateId('ITEM') })));
    setProposalTitle(isClone ? `${budget.description} (CÓPIA)` : budget.description || '');
    setDescriptionBlocks(budget.descriptionBlocks && budget.descriptionBlocks.length > 0
      ? budget.descriptionBlocks.map(block => ({ ...block, id: Math.random().toString(36).substr(2, 9) }))
      : []);

    if (budget.paymentTerms) setPaymentTerms(budget.paymentTerms);
    if (budget.deliveryTime) setDeliveryTime(budget.deliveryTime);
    setPaymentEntryPercent(budget.paymentEntryPercent ?? 30);

    // Load taxes (Handle potential casing issues from DB)
    const b: any = budget;
    const t = b.taxRate ?? b.taxrate ?? b.tax_rate ?? 0;
    const d = b.bdiRate ?? b.bdirate ?? b.bdi_rate ?? 0;

    setTaxRate(t);
    setBdiRate(d);

    setShowForm(true);
    if (isClone) notify("Orçamento clonado! Você está editando uma nova cópia.");
  };


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
            Orçamentos <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">{orders.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.APPROVED).length}</span>
          </h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Gerencie suas propostas comerciais</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button onClick={() => {
            setEditingBudgetId(null);
            setItems([]);
            setProposalTitle('');
            setTaxRate(0);
            setBdiRate(0);
            setShowForm(true);
          }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all flex items-center gap-2 active:scale-95">
            <Plus className="w-4 h-4" /> Novo Orçamento
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-[1.5rem] border shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Buscar por cliente ou orçamento..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
            <tr>
              <th className="px-8 py-5">ORÇ #</th>
              <th className="px-8 py-5">CLIENTE</th>
              <th className="px-8 py-5">DESCRIÇÃO</th>
              <th className="px-8 py-5">VALOR</th>
              <th className="px-8 py-5 text-right">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {budgets.map(budget => (
              <tr key={budget.id} className="hover:bg-slate-50 group transition-all">
                <td className="px-8 py-5 text-xs font-mono font-black text-blue-600">
                  <div className="flex items-center gap-2">
                    {budget.id}
                    {budget.status === OrderStatus.APPROVED && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                  </div>
                </td>
                <td className="px-8 py-5 text-sm font-black uppercase text-slate-900">{budget.customerName}</td>
                <td className="px-8 py-5 text-xs font-bold text-slate-400 uppercase">{budget.description}</td>
                <td className="px-8 py-5 text-sm font-black text-slate-900">R$ {budget.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-8 py-5 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {budget.status !== OrderStatus.APPROVED && (
                    <button onClick={async () => {
                      if (confirm("Deseja APROVAR este orçamento? Ele será convertido em Ordem de Serviço.")) {
                        const approvedBudget = { ...budget, status: OrderStatus.APPROVED };
                        const newServiceOrderId = budget.id.replace('ORC', 'OS');

                        // Check if an OS with this ID already exists
                        const existingOSIndex = orders.findIndex(o =>
                          (o.osType === 'WORK' && o.originBudgetId === budget.id) ||
                          o.id === newServiceOrderId
                        );

                        let finalList;
                        if (existingOSIndex !== -1) {
                          // Update existing OS
                          const previousOS = orders[existingOSIndex];
                          const updatedOS = {
                            ...previousOS,
                            items: budget.items.map(i => ({ ...i })),
                            descriptionBlocks: budget.descriptionBlocks ? [...budget.descriptionBlocks] : [],
                            totalAmount: budget.totalAmount,
                            taxRate: budget.taxRate,
                            bdiRate: budget.bdiRate,
                            description: budget.description,
                            paymentTerms: budget.paymentTerms,
                            deliveryTime: budget.deliveryTime,
                            customerName: budget.customerName,
                            customerEmail: budget.customerEmail,
                            originBudgetId: budget.id // Ensure it's linked
                          };

                          const newList = orders.map(o => o.id === budget.id ? approvedBudget : o);
                          finalList = newList.map(o => o.id === previousOS.id ? updatedOS : o);
                        } else {
                          // Create new OS
                          const newServiceOrder: ServiceOrder = {
                            ...budget,
                            id: newServiceOrderId,
                            status: OrderStatus.IN_PROGRESS,
                            createdAt: new Date().toISOString(),
                            items: budget.items.map(i => ({ ...i })),
                            descriptionBlocks: budget.descriptionBlocks ? [...budget.descriptionBlocks] : [],
                            osType: 'WORK',
                            originBudgetId: budget.id
                          };
                          const newList = orders.map(o => o.id === budget.id ? approvedBudget : o);
                          finalList = [...newList, newServiceOrder];
                        }

                        setOrders(finalList);
                        const result = await db.save('serviflow_orders', finalList);
                        if (result?.success) notify(existingOSIndex !== -1 ? "O.S. atualizada com novos dados do orçamento!" : "Orçamento APROVADO! Cópia gerada em O.S.");
                        else notify("Erro ao sincronizar.", "error");
                      }
                    }} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors" title="Aprovar">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => loadBudgetToForm(budget, true)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Duplicar"><Copy className="w-4 h-4" /></button>
                  <button onClick={() => loadBudgetToForm(budget)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Editar"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handlePrint(budget)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="Imprimir"><Printer className="w-4 h-4" /></button>
                  <button onClick={async () => {
                    if (confirm("Deseja excluir este orçamento? Esta ação também removerá os dados da nuvem.")) {
                      const idToDelete = budget.id;
                      setOrders(prev => prev.filter(o => o.id !== idToDelete));
                      const result = await db.remove('orders', idToDelete);
                      if (result?.success) { notify("Orçamento removido da nuvem com sucesso."); }
                      else { notify("Removido localmente, mas houve um erro ao sincronizar com a nuvem.", "error"); }
                    }
                  }} className="p-2 text-rose-300 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[1240px] h-[95vh] rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="px-8 py-4 border-b flex justify-between items-center bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-xl text-white shadow-xl shadow-blue-100"><FileText className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-0.5">Elaboração de Orçamento Prime</h3>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">Configuração de Documento Comercial</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {!editingBudgetId && (
                  <button onClick={() => setShowImportModal(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all">
                    <Database className="w-4 h-4" /> Importar de Existente
                  </button>
                )}
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-300" /></button>
              </div>
            </div>
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden overflow-y-auto lg:overflow-y-hidden relative">
              <div className="flex-1 lg:overflow-y-auto p-6 bg-[#f8fafc] space-y-6 no-scrollbar">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[11px] font-black text-blue-700 uppercase ml-1">Cliente</label>
                        <button onClick={() => setShowFullClientForm(true)} className="text-blue-600 text-[10px] font-black uppercase flex items-center gap-1 hover:underline">
                          <UserPlus className="w-3 h-3" /> Cadastrar Cliente
                        </button>
                      </div>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-900 outline-none" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                        <option value="">Selecione o cliente...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-blue-700 uppercase mb-2 block ml-1">Título da Proposta</label>
                      <input type="text" placeholder="Ex: Reforma Geral de Ar-Condicionado" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-500" value={proposalTitle} onChange={e => setProposalTitle(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 grow mr-6">DESCRIÇÃO TÉCNICA</h4>
                  </div>
                  <div className="space-y-3">
                    {descriptionBlocks.length === 0 && (
                      <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center gap-4 group hover:border-blue-400 transition-colors cursor-pointer" onClick={addTextBlock}>
                        <div className="flex gap-4">
                          <button onClick={(e) => { e.stopPropagation(); addTextBlock(); }} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg shadow-blue-100 hover:scale-105 transition-all"><Type className="w-4 h-4" /> + Iniciar com Texto</button>
                          <button onClick={(e) => { e.stopPropagation(); addImageBlock(); }} className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg shadow-emerald-100 hover:scale-105 transition-all"><ImageIcon className="w-4 h-4" /> + Iniciar com Imagem</button>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 animate-pulse">Comece a montar o escopo técnico acima</p>
                      </div>
                    )}
                    {descriptionBlocks.map((block) => (
                      <div key={block.id} className="relative group">
                        {block.type === 'text' && (
                          <div className="flex-1">
                            <RichTextEditor
                              id={block.id}
                              value={block.content}
                              onChange={(content) => updateBlockContent(block.id, content)}
                              onAddText={addTextBlock}
                              onAddImage={addImageBlock}
                              placeholder="Descreva aqui os detalhes técnicos do serviço..."
                            />
                          </div>
                        )}
                        {block.type === 'image' && (
                          <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2">
                            {block.content ? (
                              <div className="relative max-w-[200px]"><img src={block.content} className="w-full h-auto rounded-lg shadow-lg" /><button onClick={() => updateBlockContent(block.id, '')} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full"><Trash2 className="w-3 h-3" /></button></div>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center gap-1"><Upload className="w-5 h-5 text-blue-500" /><span className="text-[8px] font-black text-slate-400 uppercase">Subir Foto</span><input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(block.id, e)} /></label>
                            )}
                          </div>
                        )}
                        <button onClick={() => setDescriptionBlocks(descriptionBlocks.filter(b => b.id !== block.id))} className="absolute -top-2 -right-2 bg-slate-900 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 grow mr-6">ITENS DO ORÇAMENTO</h4>
                    <button onClick={() => setShowFullServiceForm(true)} className="text-blue-600 text-[8px] font-black uppercase flex items-center gap-1 hover:underline tracking-widest"><Package className="w-3 h-3" /> CATÁLOGO</button>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                    <div>
                      <label className="text-[8px] font-black text-blue-600 uppercase tracking-widest block mb-1.5">Puxar do Catálogo</label>
                      <select className="w-full bg-white border-none rounded-xl p-2.5 text-[10px] font-bold text-slate-500 outline-none" value={selectedCatalogId} onChange={e => {
                        const id = e.target.value;
                        setSelectedCatalogId(id);
                        const s = catalogServices.find(x => x.id === id);
                        if (s) { setCurrentDesc(s.name); setCurrentPrice(s.basePrice); setCurrentUnit(s.unit || 'un'); }
                      }}>
                        <option value="">Selecione para preencher...</option>
                        {catalogServices.map(s => <option key={s.id} value={s.id}>{s.name} (R$ {s.basePrice.toLocaleString()})</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                      <div className="md:col-span-6">
                        <label className="text-[11px] font-black text-blue-700 uppercase mb-1.5 block ml-1">Descrição</label>
                        <input type="text" className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs font-bold text-slate-900 outline-none placeholder:text-slate-500" value={currentDesc} onChange={e => setCurrentDesc(e.target.value)} />
                      </div>
                      <div className="w-24"><label className="text-[11px] font-black text-blue-700 uppercase mb-1.5 block text-center">Unit</label><input type="text" className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs font-black text-center outline-none uppercase text-slate-900" value={currentUnit} onChange={e => setCurrentUnit(e.target.value)} /></div>
                      <div className="w-24"><label className="text-[11px] font-black text-blue-700 uppercase mb-1.5 block text-center">Qtd</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs font-black text-center outline-none text-slate-900" value={currentQty} onChange={e => setCurrentQty(Number(e.target.value))} /></div>
                      <div className="w-32"><label className="text-[11px] font-black text-blue-700 uppercase mb-1.5 block ml-1">Preço (R$)</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs font-black outline-none text-slate-900" value={currentPrice} onChange={e => setCurrentPrice(Number(e.target.value))} /></div>
                      <div className="md:col-span-1">
                        <button onClick={handleAddItem} className="bg-blue-600 text-white w-full h-[58px] rounded-xl flex items-center justify-center hover:scale-105 transition-all shadow-xl"><Plus className="w-6 h-6" /></button>
                      </div>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                      {items.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-2.5 bg-white rounded-lg border border-slate-100 group gap-2">
                          <div className="grow">
                            <p className="text-[10px] font-black text-slate-900 uppercase mb-1">{item.description}</p>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-slate-50 rounded px-2 py-1 border border-slate-100">
                                <span className="text-[8px] font-bold text-slate-400">QTD:</span>
                                <input type="number" className="w-12 bg-transparent text-[9px] font-black text-slate-700 outline-none" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} />
                              </div>
                              <div className="flex items-center gap-1 bg-slate-50 rounded px-2 py-1 border border-slate-100">
                                <span className="text-[8px] font-bold text-slate-400">VALOR:</span>
                                <input type="number" className="w-20 bg-transparent text-[9px] font-black text-slate-700 outline-none" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1 bg-slate-50 rounded px-2 py-1 border border-slate-100">
                              <span className="text-[8px] font-bold text-slate-400">TOTAL:</span>
                              <input type="number" className="w-24 bg-transparent text-[11px] font-black text-blue-600 outline-none text-right" value={Number((item.unitPrice * item.quantity).toFixed(2))} onChange={e => updateItemTotal(item.id, Number(e.target.value))} />
                            </div>
                            <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-rose-300 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {items.length > 0 && (
                      <div className="flex justify-end pt-2">
                        <div className="bg-white border-2 border-slate-100 rounded-2xl px-6 py-3 flex items-center gap-4 shadow-sm">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal dos Itens</span>
                          <span className="text-lg font-black text-slate-900">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {showFullClientForm && (
                  <div className="absolute inset-0 z-[60] bg-white overflow-y-auto p-6">
                    <CustomerManager customers={customers} setCustomers={setCustomers} orders={orders} defaultOpenForm={true} onSuccess={(c) => { setSelectedCustomerId(c.id); setShowFullClientForm(false); }} onCancel={() => setShowFullClientForm(false)} />
                  </div>
                )}
                {showFullServiceForm && (
                  <div className="absolute inset-0 z-[60] bg-white overflow-y-auto p-6">
                    <ServiceCatalog services={catalogServices} setServices={setCatalogServices} company={company} defaultOpenForm={true} onSuccess={(s) => { setCurrentDesc(s.name); setCurrentPrice(s.basePrice); setCurrentUnit(s.unit || 'un'); setShowFullServiceForm(false); }} />
                  </div>
                )}
              </div>
              <div className="w-full lg:w-[340px] bg-[#0f172a] text-white p-6 flex flex-col space-y-6 shrink-0 shadow-2xl relative overflow-hidden h-auto lg:h-full">
                <div className="relative z-10">
                  <h4 className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Investimento Total</h4>

                  {/* Tax & BDI Inputs */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div>
                      <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">BDI (%)</label>
                      <input type="number" className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-xs font-bold text-slate-200 outline-none focus:ring-1 focus:ring-blue-500" value={bdiRate} onChange={e => setBdiRate(e.target.value)} placeholder="0%" />
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Impostos (%)</label>
                      <input type="number" className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-xs font-bold text-slate-200 outline-none focus:ring-1 focus:ring-blue-500" value={taxRate} onChange={e => setTaxRate(e.target.value)} placeholder="0%" />
                    </div>
                  </div>

                  <div className="space-y-1 mb-4 text-[10px] text-slate-400">
                    <div className="flex justify-between"><span>Subtotal:</span> <span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                    {bdiRate > 0 && <div className="flex justify-between text-emerald-400"><span>+ BDI:</span> <span>R$ {(subtotal * (bdiRate / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>}
                    {taxRate > 0 && <div className="flex justify-between text-blue-400"><span>+ Impostos:</span> <span>R$ {((subtotal + (subtotal * (bdiRate / 100))) * (taxRate / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>}
                  </div>

                  <div className="flex justify-between items-baseline border-b border-slate-800 pb-4">
                    <span className="text-[32px] font-black text-blue-400 tracking-tighter leading-none">R$ {totalAmount.toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                <div className="space-y-4 relative z-10">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Pagamento</label>
                      <button onClick={() => setShowPaymentModal(true)} className="text-[8px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest flex items-center gap-1 transition-colors">
                        <Zap className="w-3 h-3" /> Gerar
                      </button>
                    </div>
                    <textarea className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-[9px] font-bold text-slate-200 outline-none h-20 focus:ring-1 focus:ring-blue-500 leading-relaxed shadow-inner" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Prazo Entrega</label>
                    <input type="text" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-[9px] font-bold text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 shadow-inner" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} />
                  </div>
                </div>

                <div className="mt-auto space-y-3 relative z-10">
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handlePrint({
                      customerId: selectedCustomerId,
                      customerName: customers.find(c => c.id === selectedCustomerId)?.name || 'N/A',
                      customerEmail: customers.find(c => c.id === selectedCustomerId)?.email || '',
                      items, totalAmount, description: proposalTitle, descriptionBlocks, paymentTerms, deliveryTime,
                      id: editingBudgetId || 'ORC-XXXX',
                      status: OrderStatus.PENDING,
                      taxRate, bdiRate, // Pass rates to print
                      createdAt: new Date().toISOString(),
                      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    })} className="bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl font-black uppercase text-[8px] flex flex-col items-center gap-1 transition-all border border-slate-700 group">
                      <Printer className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" /> IMPRIMIR
                    </button>
                    <button onClick={handleSave} className="col-span-2 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black uppercase tracking-[0.15em] text-[11px] shadow-xl transition-all flex items-center justify-center gap-2">
                      <Save className="w-5 h-5" /> REGISTRAR
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showPaymentModal && (
        <PaymentTypeModal
          onClose={() => setShowPaymentModal(false)}
          onConfirm={(text, percent) => {
            setPaymentTerms(text);
            setPaymentEntryPercent(percent);
            setShowPaymentModal(false);
          }}
          totalValue={totalAmount}
          initialPercent={paymentEntryPercent}
        />
      )}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight">Importar Dados de Orçamento</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Selecione um orçamento para copiar itens e descrição</p>
              </div>
              <button onClick={() => setShowImportModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-rose-500" /></button>
            </div>

            <div className="p-4 bg-white border-b">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por cliente ou título..."
                  className="w-full bg-slate-100 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                  value={importSearch}
                  onChange={e => setImportSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
              {orders
                .filter(o =>
                  (o.status === OrderStatus.PENDING || o.status === OrderStatus.APPROVED) &&
                  (o.customerName.toLowerCase().includes(importSearch.toLowerCase()) ||
                    o.description.toLowerCase().includes(importSearch.toLowerCase()))
                )
                .map(budget => (
                  <button
                    key={budget.id}
                    onClick={() => loadBudgetToForm(budget, true)}
                    className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-blue-400 hover:bg-blue-50 transition-all group flex justify-between items-center"
                  >
                    <div>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{budget.id}</p>
                      <p className="font-bold text-slate-900">{budget.description}</p>
                      <p className="text-xs text-slate-500 font-medium">{budget.customerName}</p>
                    </div>
                    <Plus className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                  </button>
                ))
              }
              {orders.filter(o => (o.status === OrderStatus.PENDING || o.status === OrderStatus.APPROVED)).length === 0 && (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhum orçamento disponível para importação</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Sub-component for Payment Logic to keep main file clean(er)
const PaymentTypeModal: React.FC<{
  onClose: () => void,
  onConfirm: (text: string, percent: number) => void,
  totalValue: number,
  initialPercent?: number
}> = ({ onClose, onConfirm, totalValue, initialPercent }) => {
  const [type, setType] = useState<'vista' | 'parcelado' | 'conclusao'>('parcelado');
  const [entryValue, setEntryValue] = useState(0);
  const [percentValue, setPercentValue] = useState(initialPercent || 30);
  const [installments, setInstallments] = useState(3);
  const [preview, setPreview] = useState('');

  // Auto-calculate defaults when opening
  React.useEffect(() => {
    if (totalValue > 0) {
      const p = initialPercent || 30;
      setEntryValue(totalValue * (p / 100));
      setPercentValue(p);
    }
  }, [totalValue, initialPercent]);

  // Update preview effect
  React.useEffect(() => {
    let text = '';
    const currency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (type === 'vista') {
      text = `Pagamento à vista com desconto na aprovação do orçamento. Total: ${currency(totalValue)}.`;
    } else if (type === 'conclusao') {
      text = `Pagamento integral ${currency(totalValue)} a ser realizado após entrega técnica e aprovação dos serviços.`;
    } else if (type === 'parcelado') {
      const remainder = totalValue - entryValue;
      const parcValue = installments > 0 ? remainder / installments : 0;

      text = `Entrada de ${currency(entryValue)} na aprovação.`;
      if (installments > 0) {
        text += `\nSaldo restante de ${currency(remainder)} dividido em ${installments}x de ${currency(parcValue)} (30/${installments > 1 ? '60/90...' : ' dias'}).`;
      }
    }
    setPreview(text);
  }, [type, entryValue, installments, totalValue]);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-black text-slate-800 uppercase tracking-tight">Condição de Pagamento</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-rose-500" /></button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Tipo de Negociação</label>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setType('vista')} className={`p-3 rounded-xl border text-xs font-bold uppercase transition-all ${type === 'vista' ? 'bg-blue-600 border-blue-600 text-white ring-2 ring-blue-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>À Vista</button>
              <button onClick={() => setType('parcelado')} className={`p-3 rounded-xl border text-xs font-bold uppercase transition-all ${type === 'parcelado' ? 'bg-blue-600 border-blue-600 text-white ring-2 ring-blue-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Parcelado</button>
              <button onClick={() => setType('conclusao')} className={`p-3 rounded-xl border text-xs font-bold uppercase transition-all ${type === 'conclusao' ? 'bg-blue-600 border-blue-600 text-white ring-2 ring-blue-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Entrega</button>
            </div>
          </div>

          {type === 'parcelado' && (
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="col-span-2">
                <div className="flex justify-between mb-1"><span className="text-[10px] font-bold text-slate-400 uppercase">Valor Total</span> <span className="text-[10px] font-black text-slate-900">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (entryValue / totalValue) * 100)}%` }}></div></div>
              </div>
              <div className="grid grid-cols-2 gap-2 col-span-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Entrada (%)</label>
                  <input type="number" className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" value={percentValue} onChange={e => {
                    const val = Number(e.target.value);
                    setPercentValue(val);
                    setEntryValue(totalValue * (val / 100));
                  }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Entrada (R$)</label>
                  <input type="number" className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" value={entryValue} onChange={e => {
                    const val = Number(e.target.value);
                    setEntryValue(val);
                    if (totalValue > 0) setPercentValue(Number(((val / totalValue) * 100).toFixed(1)));
                  }} />
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Parcelas</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setInstallments(Math.max(1, installments - 1))} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 font-bold text-slate-600">-</button>
                  <span className="flex-1 text-center font-black text-slate-900 text-lg">{installments}x</span>
                  <button onClick={() => setInstallments(installments + 1)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 font-bold text-slate-600">+</button>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Prévia do Texto</label>
            <div className="bg-slate-800 text-slate-200 p-4 rounded-xl text-sm font-medium leading-relaxed border border-slate-700 min-h-[80px]">
              {preview}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-xs font-bold uppercase text-slate-500 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
          <button onClick={() => onConfirm(preview, percentValue)} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wide shadow-lg shadow-blue-200 transition-all active:scale-95">Aplicar Texto</button>
        </div>
      </div>
    </div>
  );


};

export default BudgetManager;
