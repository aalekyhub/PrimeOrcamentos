
import React, { useState, useMemo } from 'react';
import {
  Plus, Search, X, Trash2, Pencil, Printer, Save,
  UserPlus, Package, Type, Image as ImageIcon,
  FileText, Upload, CheckCircle
} from 'lucide-react';
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
  const [deliveryTime, setDeliveryTime] = useState('15 dias uteis');
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [descriptionBlocks, setDescriptionBlocks] = useState<DescriptionBlock[]>([]);

  const [currentDesc, setCurrentDesc] = useState('');
  const [currentUnit, setCurrentUnit] = useState('un');
  const [currentQty, setCurrentQty] = useState(1);
  const [currentPrice, setCurrentPrice] = useState(0);

  const [taxRate, setTaxRate] = useState<string | number>(0);
  const [bdiRate, setBdiRate] = useState<string | number>(0);

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

  const handlePrintPDF = (budget: ServiceOrder, mode: 'print' | 'pdf' = 'print') => {
    const customer = customers.find(c => c.id === budget.customerId) || { name: budget.customerName, address: 'Não informado', document: 'Documento não informado' };
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

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

    // Logic: BDI first, then Tax on (Subtotal + BDI)
    const bdiR = budget.bdiRate || 0;
    const taxR = budget.taxRate || 0;

    const bdiValue = subTotal * (bdiR / 100);
    const subTotalWithBDI = subTotal + bdiValue; // Accumulated base for tax
    const taxValue = subTotalWithBDI * (taxR / 100);

    const finalTotal = subTotalWithBDI + taxValue;

    const itemFontBase = company.itemsFontSize || 10;
    const itemsHtml = budget.items.map((item: ServiceItem) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 10px; font-weight: 800; text-transform: uppercase; font-size: ${itemFontBase}px; color: #0f172a;">${item.description}</td>
        <td style="padding: 12px 0; text-align: center; color: #475569; font-size: ${Math.max(8, itemFontBase - 1)}px; font-weight: bold; text-transform: uppercase;">${item.type === 'Material' ? 'MAT' : 'SERV'}</td>
        <td style="padding: 12px 0; text-align: center; font-weight: 800; color: #0f172a; font-size: ${itemFontBase}px;">${item.quantity} ${item.unit || ''}</td>
        <td style="padding: 12px 0; text-align: right; color: #475569; font-size: ${itemFontBase}px;">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 12px 10px; text-align: right; font-weight: 900; font-size: ${itemFontBase + 1}px; color: #0f172a;">R$ ${(item.unitPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      </tr>`).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Orçamento - ${budget.id}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap" rel="stylesheet">
        <style>
           body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
           @page { size: A4; margin: 0 !important; }
           .a4-container { width: 100%; margin: 0; background: white; padding-left: 15mm !important; padding-right: 15mm !important; }
           .avoid-break { break-inside: avoid; page-break-inside: avoid; }
           
           /* Premium Box Styles */
           .info-box { background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; }
           .info-label { font-size: ${Math.max(10, (company.descriptionFontSize || 10))}px; font-weight: 900; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; display: block; }
           .info-value { font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; line-height: 1.4; }
           .info-value { font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; line-height: 1.4; }
           .info-sub { font-size: 10px; color: #475569; font-weight: 600; }
           
           .section-title { font-size: 10px; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; margin-bottom: 16px; }

           @media screen { body { background: #f1f5f9; padding: 40px 0; } .a4-container { width: 210mm; margin: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border-radius: 8px; padding: 15mm !important; } }
           @media print { 
             body { background: white !important; margin: 0 !important; } 
             .a4-container { box-shadow: none !important; border: none !important; min-height: auto; position: relative; } 
             .no-screen { display: block !important; }
             .no-print { display: none !important; }
             .print-footer { position: fixed; bottom: 0; left: 0; right: 0; padding-bottom: 5mm; text-align: center; font-size: 8px; font-weight: bold; color: #475569; text-transform: uppercase; }
             .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; display: table !important; width: 100% !important; }
           }
        </style>
      </head>
      <body class="no-scrollbar">
        <table style="width: 100%;">
          <thead><tr><td style="height: ${company.printMarginTop || 15}mm;"><div style="height: ${company.printMarginTop || 15}mm; display: block;">&nbsp;</div></td></tr></thead>
          <tbody><tr><td>
            <div class="a4-container">
               <!-- Header -->
               <div class="flex justify-between items-start mb-6 border-b-2 border-slate-900 pb-4">
                   <div class="flex gap-6 items-center">
                       <div style="width: 70px; height: 70px; display: flex; align-items: center; justify-content: center;">
                           ${company.logo ? `<img src="${company.logo}" style="max-height: 100%; max-width: 100%; object-fit: contain;">` : '<div style="font-weight:900; font-size:30px; color:#2563eb;">PO</div>'}
                       </div>
                       <div>
                           <h1 style="font-size: ${company.nameFontSize || 24}px;" class="font-black text-slate-900 leading-none mb-1 uppercase tracking-tight">${company.name}</h1>
                           <p class="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none">Soluções em Gestão Profissional</p>
                            <p class="text-[8px] text-slate-600 font-bold uppercase tracking-tight mt-1">${company.cnpj || ''}</p>
                            <p class="text-[8px] text-slate-600 font-bold uppercase tracking-tight">${company.phone || ''}</p>
                       </div>
                   </div>
                   <div class="text-right">
                       <p class="text-2xl font-black text-blue-600 tracking-tighter mb-1">${budget.id}</p>
                       <p class="text-[8px] font-bold text-slate-600 uppercase tracking-widest text-right">EMISSÃO: ${emissionDate} <br> VALIDADE: ${validityDate}</p>
                   </div>
               </div>

               <!-- Boxes Grid -->
               <div class="grid grid-cols-2 gap-6 mb-6">
                   <div class="info-box">
                       <span class="info-label">Cliente / Destinatário</span>
                       <div class="info-value">${customer.name}</div>
                       <div class="info-sub mt-1">${customer.document || 'CPF/CNPJ não informado'}</div>
                   </div>
                   <div class="info-box">
                       <span class="info-label">Referência do Orçamento</span>
                       <div class="info-value">${budget.description || 'Proposta de Prestação de Serviços'}</div>
                   </div>
               </div>

               <!-- Description Blocks (Optional) -->
               <div class="mb-4">
                    <h2 class="text-sm font-black text-slate-900 tracking-tight uppercase leading-none mb-0.5">Proposta Comercial</h2>
                    <p class="text-xl font-black text-blue-600 uppercase leading-none tracking-tight">${budget.description}</p>
               </div>
               ${budget.descriptionBlocks && budget.descriptionBlocks.length > 0 ? `
               <div class="mb-8 mt-4">
                   <div class="section-title">Descrição Técnica / Escopo</div>
                   <div class="space-y-4">
                       ${budget.descriptionBlocks.map(block => block.type === 'text'
      ? `<p style="font-size: ${company.descriptionFontSize || 10}px;" class="text-slate-700 leading-relaxed text-justify font-medium whitespace-pre-wrap">${block.content}</p>`
      : `<div style="break-inside: avoid; page-break-inside: avoid;"><img src="${block.content}" style="width: 100%; border-radius: 12px; margin-top: 10px;"></div>`
    ).join('')}
                   </div>
               </div>` : ''}

               <!-- Items Table -->
               <div class="mb-8 avoid-break">

                   <div class="section-title">Detalhamento Financeiro</div>
                   <table style="width: 100%; border-collapse: collapse;">
                       <thead>
                           <tr style="border-bottom: 2px solid #0f172a;">
                               <th style="padding-bottom: 12px; font-size: ${Math.max(7, (company.itemsFontSize || 10) - 2)}px; text-transform: uppercase; color: #475569; text-align: left; font-weight: 900; letter-spacing: 0.05em;">Item / Descrição</th>
                               <th style="padding-bottom: 12px; font-size: ${Math.max(7, (company.itemsFontSize || 10) - 2)}px; text-transform: uppercase; color: #475569; text-align: center; font-weight: 900; letter-spacing: 0.05em;">Tipo</th>
                               <th style="padding-bottom: 12px; font-size: ${Math.max(7, (company.itemsFontSize || 10) - 2)}px; text-transform: uppercase; color: #475569; text-align: center; font-weight: 900; letter-spacing: 0.05em;">Qtd</th>
                               <th style="padding-bottom: 12px; font-size: ${Math.max(7, (company.itemsFontSize || 10) - 2)}px; text-transform: uppercase; color: #475569; text-align: right; font-weight: 900; letter-spacing: 0.05em;">Unitário</th>
                               <th style="padding-bottom: 12px; font-size: ${Math.max(7, (company.itemsFontSize || 10) - 2)}px; text-transform: uppercase; color: #475569; text-align: right; font-weight: 900; letter-spacing: 0.05em;">Subtotal</th>
                           </tr>
                       </thead>
                       <tbody>${itemsHtml}</tbody>
                   </table>
               </div>

               <!-- Total Bar (Dark) -->
               <div class="avoid-break mb-6">
                   <!-- Breakdown above bar -->
                   <div class="flex justify-end mb-2 gap-6 px-2">
                        <div class="text-right">
                           <span class="text-[8px] font-bold text-slate-600 uppercase block">Subtotal</span>
                           <span class="text-[10px] font-black text-slate-700 block">R$ ${subTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        ${bdiR > 0 ? `
                        <div class="text-right">
                           <span class="text-[8px] font-bold text-slate-600 uppercase block">BDI (${bdiR}%)</span>
                           <span class="text-[10px] font-black text-emerald-600 block">+ R$ ${bdiValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>` : ''}
                        ${taxR > 0 ? `
                        <div class="text-right">
                           <span class="text-[8px] font-bold text-slate-600 uppercase block">Impostos (${taxR}%)</span>
                           <span class="text-[10px] font-black text-blue-600 block">+ R$ ${taxValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>` : ''}
                   </div>
                   <div class="bg-slate-900 text-white py-3 px-6 rounded-xl flex justify-between items-center shadow-xl">
                       <span class="text-[12px] font-black uppercase tracking-widest">Investimento Total:</span>
                       <span class="text-3xl font-black text-blue-400 tracking-tighter text-right">R$ ${finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                   </div>
               </div>

               <!-- Terms & Payment -->
               <div class="avoid-break mb-6">
                   <div class="grid grid-cols-2 gap-6">
                       <div class="info-box">
                           <span class="info-label">Forma de Pagamento</span>
                           <p style="font-size: ${company.descriptionFontSize || 10}px;" class="font-bold text-slate-700 leading-relaxed mt-2">${budget.paymentTerms || 'A combinar'}</p>
                       </div>
                       <div class="info-box">
                           <span class="info-label">Prazo de Entrega / Execução</span>
                           <p style="font-size: ${company.descriptionFontSize || 10}px;" class="font-bold text-slate-700 leading-relaxed mt-2">${budget.deliveryTime || 'A combinar'}</p>
                       </div>
                   </div>
               </div>

               <!-- Acceptance Box -->
               <div class="avoid-break mb-6">
                   <div class="border border-blue-100 bg-blue-50/50 rounded-2xl p-6">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="bg-blue-600 rounded-full p-1"><svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg></div>
                            <span style="font-size: ${Math.max(10, (company.descriptionFontSize || 10))}px;" class="font-black text-blue-700 uppercase tracking-widest">Termo de Aceite e Autorização Profissional</span>
                        </div>
                        <p style="font-size: ${Math.max(9, (company.descriptionFontSize || 10) - 1)}px;" class="text-slate-700 leading-relaxed text-justify italic">
                            "Este documento constitui uma proposta comercial formal. Ao assinar abaixo, o cliente declara estar ciente e de pleno acordo com os valores, prazos e especificações técnicas descritas. Esta aceitação autoriza o início imediato dos trabalhos sob as condições estabelecidas. A contratada reserva-se o direito de renegociar valores caso a aprovação ocorra após o prazo de validade de ${validityDays} dias. Eventuais alterações de escopo solicitadas após o aceite estarão sujeitas a nova análise de custos."
                        </p>
                   </div>
               </div>

               <!-- Signature Lines -->
               <div class="avoid-break mt-auto">
                   <div style="border-bottom: 2px solid #cbd5e1; width: 40%;"></div>
                   <p class="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-2">Assinatura do Cliente / Aceite</p>
               </div>
            </div>
          </td></tr></tbody>
          <tfoot><tr><td style="height: ${company.printMarginBottom || 15}mm;"><div style="height: ${company.printMarginBottom || 15}mm; display: block;">&nbsp;</div></td></tr></tfoot>
        </table>
        <div class="print-footer no-screen"><span>Documento gerado em ${new Date().toLocaleString('pt-BR')}</span></div>
        <script>
           window.onload = function() { setTimeout(() => { window.print(); window.close(); }, 800); }
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
      items, descriptionBlocks, totalAmount, paymentTerms, deliveryTime,
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
  const loadBudgetToForm = (budget: ServiceOrder) => {
    setEditingBudgetId(budget.id);
    setSelectedCustomerId(budget.customerId);
    setItems(budget.items);
    setProposalTitle(budget.description);
    setDescriptionBlocks(budget.descriptionBlocks && budget.descriptionBlocks.length > 0 ? budget.descriptionBlocks : []);
    if (budget.paymentTerms) setPaymentTerms(budget.paymentTerms);
    if (budget.deliveryTime) setDeliveryTime(budget.deliveryTime);

    // Load taxes (Handle potential casing issues from DB)
    const b: any = budget;
    const t = b.taxRate ?? b.taxrate ?? b.tax_rate ?? 0;
    const d = b.bdiRate ?? b.bdirate ?? b.bdi_rate ?? 0;

    // Alert to confirm Values
    // alert(`Carregando Orçamento: ${budget.id}\nImposto encontrado: ${t}\nBDI encontrado: ${d}`);

    setTaxRate(t);
    setBdiRate(d);

    setShowForm(true);
  };


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-2">
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

      <div className="bg-white rounded-[2rem] border overflow-hidden shadow-sm">
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
                <td className="px-8 py-5 text-sm font-black text-slate-900">R$ {budget.totalAmount.toLocaleString('pt-BR')}</td>
                <td className="px-8 py-5 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {budget.status !== OrderStatus.APPROVED && (
                    <button onClick={async () => {
                      if (confirm("Deseja APROVAR este orçamento? Ele será convertido em Ordem de Serviço.")) {
                        const approvedBudget = { ...budget, status: OrderStatus.APPROVED };
                        const newServiceOrderId = db.generateId('OS');
                        const newServiceOrder: ServiceOrder = {
                          ...budget,
                          id: newServiceOrderId,
                          status: OrderStatus.IN_PROGRESS,
                          createdAt: new Date().toISOString(),
                          items: budget.items.map(i => ({ ...i })),
                          descriptionBlocks: budget.descriptionBlocks ? [...budget.descriptionBlocks] : [],
                          osType: 'WORK' // Automatically create as Work Order for Construction
                        };
                        const newList = orders.map(o => o.id === budget.id ? approvedBudget : o);
                        const finalList = [...newList, newServiceOrder];
                        setOrders(finalList);
                        const result = await db.save('serviflow_orders', finalList);
                        if (result?.success) notify("Orçamento APROVADO! Cópia gerada em O.S.");
                        else notify("Erro ao sincronizar.", "error");
                      }
                    }} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors" title="Aprovar">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => loadBudgetToForm(budget)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handlePrintPDF(budget)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><Printer className="w-4 h-4" /></button>
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
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-300" /></button>
            </div>
            <div className="flex-1 flex overflow-hidden relative">
              <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc] space-y-6 no-scrollbar">
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
                    <div className="flex gap-2">
                      <button onClick={addTextBlock} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 hover:bg-blue-100"><Type className="w-3.5 h-3.5" /> + TEXTO</button>
                      <button onClick={addImageBlock} className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 hover:bg-emerald-100"><ImageIcon className="w-3.5 h-3.5" /> + IMAGEM</button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {descriptionBlocks.map((block) => (
                      <div key={block.id} className="relative group">
                        {block.type === 'text' ? (
                          <textarea className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-[11px] font-medium outline-none h-24 focus:ring-2 focus:ring-blue-500 shadow-inner" value={block.content} onChange={e => updateBlockContent(block.id, e.target.value)} placeholder="Detalhes técnicos..." />
                        ) : (
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
                      <select className="w-full bg-white border-none rounded-xl p-2.5 text-[10px] font-bold text-slate-500 outline-none" onChange={e => { const s = catalogServices.find(x => x.id === e.target.value); if (s) { setCurrentDesc(s.name); setCurrentPrice(s.basePrice); setCurrentUnit(s.unit || 'un'); } }}>
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
                        <div key={item.id} className="flex justify-between items-center p-2.5 bg-white rounded-lg border border-slate-100 group">
                          <div>
                            <p className="text-[10px] font-black text-slate-900 uppercase">{item.description}</p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">{item.quantity} {item.unit} X R$ {item.unitPrice.toLocaleString('pt-BR')}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-slate-900">R$ ${(item.unitPrice * item.quantity).toLocaleString('pt-BR')}</span>
                            <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-rose-300 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
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
              <div className="w-[340px] bg-[#0f172a] text-white p-6 flex flex-col space-y-6 shrink-0 shadow-2xl relative overflow-hidden">
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
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Pagamento</label>
                    <textarea className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-[9px] font-bold text-slate-200 outline-none h-20 focus:ring-1 focus:ring-blue-500 leading-relaxed shadow-inner" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Prazo Entrega</label>
                    <input type="text" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-[9px] font-bold text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 shadow-inner" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} />
                  </div>
                </div>

                <div className="mt-auto space-y-3 relative z-10">
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handlePrintPDF({
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
    </div>
  );
};

export default BudgetManager;
