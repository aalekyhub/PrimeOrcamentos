
import React, { useState, useMemo } from 'react';
import {
  Plus, Search, X, Trash2, Pencil, Printer, Save,
  UserPlus, Package, Type, Image as ImageIcon, CheckCircle2,
  Layout, FileText, Upload
} from 'lucide-react';
import { ServiceOrder, OrderStatus, Customer, ServiceItem, CatalogService, CompanyProfile, DescriptionBlock } from '../types';
import { useNotify } from './ToastProvider';
import CustomerManager from './CustomerManager';
import ServiceCatalog from './ServiceCatalog';
import { db } from '../services/db';

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
  const { notify } = useNotify();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [proposalTitle, setProposalTitle] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('50% avista, 25% com 30 dias,, 25% restante na conclusão');
  const [deliveryTime, setDeliveryTime] = useState('15 dias uteis');
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [descriptionBlocks, setDescriptionBlocks] = useState<DescriptionBlock[]>([]);

  const [currentDesc, setCurrentDesc] = useState('');
  const [currentUnit, setCurrentUnit] = useState('un');
  const [currentQty, setCurrentQty] = useState(1);
  const [currentPrice, setCurrentPrice] = useState(0);

  const budgets = useMemo(() => orders.filter(o =>
    o.status === OrderStatus.PENDING && (o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm))
  ), [orders, searchTerm]);

  const totalAmount = useMemo(() => items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0), [items]);

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

  const addTextBlock = () => setDescriptionBlocks([...descriptionBlocks, { id: Date.now().toString(), type: 'text', content: '' }]);
  const addImageBlock = () => setDescriptionBlocks([...descriptionBlocks, { id: Date.now().toString(), type: 'image', content: '' }]);
  const updateBlockContent = (id: string, content: string) => setDescriptionBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));

  const handleImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updateBlockContent(id, reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePrintPDF = (budget: any) => {
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

    const itemsHtml = budget.items.map((item: any) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 0; font-weight: 800; text-transform: uppercase; font-size: 11px; color: #0f172a;">${item.description}</td>
        <td style="padding: 12px 0; text-align: center; color: #94a3b8; font-size: 9px; font-weight: bold; text-transform: uppercase;">SERVIÇO</td>
        <td style="padding: 12px 0; text-align: center; font-weight: 800; color: #0f172a; font-size: 11px;">${item.quantity}</td>
        <td style="padding: 12px 0; text-align: right; color: #64748b; font-size: 11px;">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 12px 0; text-align: right; font-weight: 900; font-size: 12px; color: #0f172a;">R$ ${(item.unitPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      </tr>`).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title> </title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
          @page { size: A4; margin: 0 !important; }
          .a4-container { 
            width: 100%; 
            margin: 0; 
            background: white;
            padding-left: 15mm !important;
            padding-right: 15mm !important;
          }
          .logo-box { width: 64px; height: 64px; background: #2563eb; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
          
          @media screen {
            body { background: #f1f5f9; padding: 40px 0; }
            .a4-container { width: 210mm; margin: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border-radius: 8px; padding: 15mm !important; }
          }
          
          @media print {
            body { background: white !important; }
            .a4-container { box-shadow: none !important; border: none !important; min-height: 297mm; position: relative; }
            .no-print { display: none !important; }
            * { box-shadow: none !important; }
            .print-footer { position: fixed; bottom: 0; left: 0; right: 0; padding-bottom: 5mm; text-align: center; font-size: 8px; font-weight: bold; color: #94a3b8; text-transform: uppercase; }
          }
        </style>
      </head>
      <body class="no-scrollbar">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr><td><div style="height: ${company.printMarginTop || 15}mm;"></div></td></tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div class="a4-container">
                  <!-- HEADER -->
          <div class="flex justify-between items-start mb-6">
            <div class="flex gap-4">
              <div class="w-16 h-16 shrink-0 flex items-center justify-center overflow-hidden">
                ${company.logo ? `<img src="${company.logo}" style="height: 100%; object-fit: contain;">` : `
                  <div class="logo-box">
                    <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                  </div>
                `}
              </div>
              <div>
                <h1 class="text-xl font-black text-slate-900 leading-none mb-1 uppercase tracking-tight">${company.name}</h1>
                <p class="text-[9px] font-black text-blue-600 uppercase tracking-widest">${company.tagline || 'Soluções em Gestão e Manutenção Profissional'}</p>
                <p class="text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-1">${company.cnpj || ''} | ${company.phone || ''}</p>
              </div>
            </div>
            <div class="text-right">
              <h2 class="text-xl font-black text-slate-900 leading-tight uppercase">Proposta<br>Comercial</h2>
              <p class="text-blue-600 font-black text-lg mt-1">${budget.id}</p>
              <div class="mt-2 space-y-0.5">
                <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">EMISSÃO: ${emissionDate}</p>
                <p class="text-[8px] font-black text-blue-600 uppercase tracking-widest">VALIDADE: ${validityDate}</p>
              </div>
            </div>
          </div>
          <div class="border-b-2 border-slate-900 mb-6"></div>

          <!-- CLIENTE -->
          <div class="mb-6 grid grid-cols-2 gap-4">
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <h3 class="text-[9px] font-black text-blue-700 uppercase tracking-widest mb-1.5 ml-1">Cliente / Destinatário</h3>
              <p class="text-xs font-black text-slate-900 uppercase">${budget.customerName}</p>
              <p class="text-[9px] text-slate-500 font-bold mt-1 uppercase">${customer.document || ''}</p>
            </div>
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <h3 class="text-[9px] font-black text-blue-700 uppercase tracking-widest mb-1.5 ml-1">Referência do Orçamento</h3>
              <p class="text-xs font-black text-slate-900 uppercase">${budget.description || 'Execução de Serviços'}</p>
            </div>
          </div>

          <!-- DESCRIÇÃO TÉCNICA -->
          ${budget.descriptionBlocks && budget.descriptionBlocks.length > 0 ? `
            <div class="mb-8">
              <h3 class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-1">Descrição Técnica / Escopo</h3>
              <div class="space-y-4">
                ${budget.descriptionBlocks.map((block: any) => block.type === 'text' ? `
                  <p class="text-[10px] text-slate-700 leading-relaxed italic avoid-break">${block.content}</p>
                ` : `
                  <div class="py-2 flex justify-center avoid-break"><img src="${block.content}" class="max-w-[80%] h-auto rounded-xl shadow-sm border border-slate-100"></div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- TABELA DE ITENS -->
          <div class="mb-6">
            <h3 class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-1">Detalhamento Financeiro</h3>
            <table class="w-full text-left">
              <thead>
                <tr class="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b-[2px] border-slate-900">
                  <th class="pb-2">Item / Descrição</th>
                  <th class="pb-2 text-center">Tipo</th>
                  <th class="pb-2 text-center">Qtd</th>
                  <th class="pb-2 text-right">Unitário</th>
                  <th class="pb-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
          </div>

          <!-- TOTAL BAR -->
          <div class="bg-slate-900 text-white p-6 rounded-xl flex justify-between items-center mb-6">
            <span class="font-black text-xs tracking-widest uppercase">Investimento Total:</span>
            <span class="text-3xl font-black tracking-tighter text-blue-400">R$ ${budget.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>

          <!-- FORMA PGTO / PRAZO -->
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="space-y-4">
              <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100 h-full">
                <h3 class="text-[9px] font-black text-blue-700 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1">Forma de Pagamento</h3>
                <p class="text-[11px] font-bold text-slate-700 leading-relaxed">${budget.paymentTerms || 'A combinar'}</p>
              </div>
            </div>
            <div class="space-y-4">
              <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100 h-full">
                <h3 class="text-[9px] font-black text-blue-700 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1">Prazo de Entrega / Execução</h3>
                <p class="text-[11px] font-bold text-slate-700 leading-relaxed">${budget.deliveryTime || 'A combinar'}</p>
              </div>
            </div>
          </div>

          <!-- TERMOS LEGAIS -->
          <div class="bg-blue-50/50 border border-blue-100 p-8 rounded-3xl mb-6 relative overflow-hidden avoid-break">
            <div class="flex items-center gap-2 mb-4">
              <svg class="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <h3 class="text-[10px] font-black text-blue-600 uppercase tracking-widest">Termo de Aceite e Autorização Profissional</h3>
            </div>
            <p class="text-[10px] text-slate-600 leading-relaxed italic pr-12">
              "Este documento constitui uma proposta comercial formal. Ao assinar abaixo, o cliente declara estar ciente e de pleno acordo com os valores, prazos e especificações técnicas descritas. Esta aceitação autoriza o início imediato dos trabalhos sob as condições estabelecidas. A contratada reserva-se o direito de renegociar valores caso a aprovação ocorra após o prazo de validade de 30 dias. Eventuais alterações de escopo solicitadas após o aceite estarão sujeitas a nova análise de custos."
            </p>
          </div>

          <div class="border-b border-slate-200 mb-6"></div>

          <!-- ASSINATURA -->
          <div class="max-w-[300px] border-t border-slate-400 pt-2 mb-10 avoid-break">
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assinatura do Cliente / Aceite</p>
          </div>

          <!-- FOOTER -->
          <div class="flex justify-between items-end border-t-4 border-slate-900 pt-4 avoid-break">
            <div>
              <p class="text-xs font-black text-slate-900 uppercase leading-none">${company.name}</p>
              <div class="mt-2 flex gap-1">
                <span class="text-[8px] font-black text-slate-400 uppercase">DATA DO ACEITE:</span>
                <span class="text-[8px] font-black text-slate-300 uppercase underline decoration-slate-200 decoration-2 underline-offset-4">____/____/________</span>
              </div>
            </div>
            <p class="text-[8px] font-bold text-slate-300 uppercase italic text-right">Documento comercial gerado eletronicamente por ${company.name}</p>
          <!-- RODAPÉ DE PÁGINA -->
          <div class="print-footer no-screen">
            <span>Página 1 de 1</span>
                  </div>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr><td><div style="height: ${company.printMarginBottom || 15}mm;"></div></td></tr>
            </tfoot>
          </table>

          <script>window.onload=()=>{setTimeout(()=>{window.print();window.close();},500);}</script>
        </body>
      </html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleSave = () => {
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) { notify("Selecione um cliente", "error"); return; }
    if (items.length === 0) { notify("Adicione itens ao orçamento", "error"); return; }

    const existingBudget = editingBudgetId ? orders.find(o => o.id === editingBudgetId) : null;

    const data: ServiceOrder = {
      id: editingBudgetId || `ORC-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      description: proposalTitle || 'REFORMA DE PINTURA',
      status: OrderStatus.PENDING,
      items, descriptionBlocks, totalAmount, paymentTerms, deliveryTime,
      createdAt: existingBudget?.createdAt || new Date().toISOString().split('T')[0],
      dueDate: existingBudget?.dueDate || new Date(Date.now() + (company.defaultProposalValidity || 15) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    setOrders(prev => editingBudgetId ? prev.map(o => o.id === editingBudgetId ? data : o) : [data, ...prev]);
    setShowForm(false);
    notify("Proposta Comercial registrada com sucesso!");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Propostas Comerciais</h2>
          <p className="text-slate-500 text-sm">Crie orçamentos profissionais.</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingBudgetId(null); setSelectedCustomerId(''); setItems([]); setProposalTitle(''); setDescriptionBlocks([]); }} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2">
          <Plus className="w-5 h-5" /> Nova Proposta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map(budget => (
          <div key={budget.id} className="bg-white rounded-[1.5rem] border-l-[6px] border-blue-600 p-6 flex flex-col group relative shadow-sm hover:shadow-xl transition-all">
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase w-fit mb-4 tracking-widest">{budget.id}</span>
            <h4 className="font-black text-slate-900 mb-1 uppercase truncate">{budget.customerName}</h4>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight mb-6 line-clamp-1">{budget.description}</p>
            <div className="mt-auto pt-4 border-t flex justify-between items-center">
              <span className="font-black text-slate-900 text-base">R$ {budget.totalAmount.toLocaleString('pt-BR')}</span>
              <div className="flex gap-1">
                <button onClick={() => {
                  setEditingBudgetId(budget.id);
                  setSelectedCustomerId(budget.customerId);
                  setItems(budget.items);
                  setProposalTitle(budget.description);
                  setDescriptionBlocks(budget.descriptionBlocks && budget.descriptionBlocks.length > 0 ? budget.descriptionBlocks : []);
                  if (budget.paymentTerms) setPaymentTerms(budget.paymentTerms);
                  if (budget.deliveryTime) setDeliveryTime(budget.deliveryTime);
                  setShowForm(true);
                }} className="p-2 text-slate-300 hover:text-blue-600 transition-colors bg-slate-50 rounded-xl"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handlePrintPDF(budget)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors bg-slate-50 rounded-xl"><Printer className="w-4 h-4" /></button>
                <button onClick={async () => {
                  if (confirm("Deseja excluir este orçamento? Esta ação também removerá os dados da nuvem.")) {
                    const idToDelete = budget.id;
                    setOrders(prev => prev.filter(o => o.id !== idToDelete));
                    const result = await db.remove('orders', idToDelete);
                    if (result?.success) {
                      notify("Orçamento removido da nuvem com sucesso.");
                    } else {
                      notify("Removido localmente, mas houve um erro ao sincronizar com a nuvem.", "error");
                    }
                  }
                }} className="p-2 text-slate-300 hover:text-rose-600 transition-colors bg-slate-50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
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
                            <span className="text-xs font-black text-slate-900">R$ {(item.unitPrice * item.quantity).toLocaleString('pt-BR')}</span>
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
                      items, totalAmount, description: proposalTitle, descriptionBlocks, paymentTerms, deliveryTime,
                      id: editingBudgetId || 'ORC-XXXX'
                    })} className="bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl font-black uppercase text-[8px] flex flex-col items-center gap-1 transition-all border border-slate-700 group">
                      <Printer className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" /> IMPRIMIR
                    </button>
                    <button onClick={() => notify("PDF Gerado!", "info")} className="bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl font-black uppercase text-[8px] flex flex-col items-center gap-1 transition-all border border-slate-700 group">
                      <FileText className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" /> PDF
                    </button>
                  </div>
                  <button onClick={handleSave} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-[0.15em] text-[9px] shadow-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" /> REGISTRAR ORÇAMENTO
                  </button>
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
