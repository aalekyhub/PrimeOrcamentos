
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

    const itemsHtml = budget.items.map((item: any) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; font-weight: 800; text-transform: uppercase; font-size: 11px; color: #1e293b;">${item.description}</td>
        <td style="padding: 10px 0; text-align: center; color: #94a3b8; font-size: 9px; font-weight: bold; text-transform: uppercase;">SERVIÇO</td>
        <td style="padding: 10px 0; text-align: center; font-weight: 800; color: #1e293b; font-size: 11px;">${item.unit || 'un'}</td>
        <td style="padding: 10px 0; text-align: center; font-weight: 800; color: #1e293b; font-size: 11px;">${item.quantity}</td>
        <td style="padding: 10px 0; text-align: right; color: #64748b; font-size: 11px;">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 10px 0; text-align: right; font-weight: 900; font-size: 12px; color: #1e293b;">R$ ${(item.unitPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      </tr>`).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Proposta Comercial ${budget.id}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      </head>
      <body class="p-10 font-sans">
        <h1 class="text-2xl font-black mb-4 uppercase tracking-tighter">${company.name}</h1>
        <div class="border-b-2 border-slate-900 mb-6"></div>
        <div class="mb-6 flex justify-between">
            <div><p class="text-[10px] font-black uppercase text-slate-400">Cliente</p><p class="font-bold text-lg">${budget.customerName}</p></div>
            <div class="text-right"><p class="text-[10px] font-black uppercase text-slate-400">Orçamento</p><p class="font-bold text-blue-600">${budget.id}</p></div>
        </div>
        <table class="w-full mb-8">
          <thead class="bg-slate-900 text-white text-[10px] uppercase">
            <tr><th class="p-2 text-left">Item</th><th class="p-2 text-center">Un</th><th class="p-2 text-center">Qtd</th><th class="p-2 text-right">Unitário</th><th class="p-2 text-right">Subtotal</th></tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="bg-slate-900 text-white p-6 rounded-xl flex justify-between items-center">
            <span class="font-black text-xs tracking-widest uppercase">Investimento Total:</span>
            <span class="text-3xl font-black tracking-tighter">R$ ${budget.totalAmount.toLocaleString('pt-BR')}</span>
        </div>
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

    const data: ServiceOrder = {
      id: editingBudgetId || `ORC-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      description: proposalTitle || 'REFORMA DE PINTURA',
      status: OrderStatus.PENDING,
      items, descriptionBlocks, totalAmount, paymentTerms, deliveryTime,
      createdAt: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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
                <button onClick={() => { setEditingBudgetId(budget.id); setSelectedCustomerId(budget.customerId); setItems(budget.items); setProposalTitle(budget.description); setDescriptionBlocks(budget.descriptionBlocks || []); setPaymentTerms(budget.paymentTerms || ''); setDeliveryTime(budget.deliveryTime || ''); setShowForm(true); }} className="p-2 text-slate-300 hover:text-blue-600 transition-colors bg-slate-50 rounded-xl"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handlePrintPDF(budget)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors bg-slate-50 rounded-xl"><Printer className="w-4 h-4" /></button>
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
                        <label className="text-[12px] font-bold text-blue-600 uppercase">Cliente</label>
                        <button onClick={() => setShowFullClientForm(true)} className="text-blue-600 text-[10px] font-black uppercase flex items-center gap-1 hover:underline">
                          <UserPlus className="w-3 h-3" /> Cadastrar Cliente
                        </button>
                      </div>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                        <option value="">Selecione o cliente...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[12px] font-bold text-blue-600 uppercase mb-2 block">Título da Proposta</label>
                      <input type="text" placeholder="Ex: Reforma Geral de Ar-Condicionado" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none" value={proposalTitle} onChange={e => setProposalTitle(e.target.value)} />
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
                        <label className="text-[12px] font-bold text-blue-600 uppercase mb-2 block">Descrição</label>
                        <input type="text" className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs font-bold outline-none" value={currentDesc} onChange={e => setCurrentDesc(e.target.value)} />
                      </div>
                      <div className="w-24"><label className="text-[12px] font-bold text-blue-600 uppercase mb-2 block text-center">Unit</label><input type="text" className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs font-black text-center outline-none uppercase" value={currentUnit} onChange={e => setCurrentUnit(e.target.value)} /></div>
                      <div className="w-24"><label className="text-[12px] font-bold text-blue-600 uppercase mb-2 block text-center">Qtd</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs font-black text-center outline-none" value={currentQty} onChange={e => setCurrentQty(Number(e.target.value))} /></div>
                      <div className="w-32"><label className="text-[12px] font-bold text-blue-600 uppercase mb-2 block">Preço (R$)</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs font-black outline-none" value={currentPrice} onChange={e => setCurrentPrice(Number(e.target.value))} /></div>
                      <div className="md:col-span-1">
                        <button onClick={handleAddItem} className="bg-blue-600 text-white w-full h-[38px] rounded-lg flex items-center justify-center hover:scale-105 transition-all shadow-xl"><Plus className="w-4 h-4" /></button>
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
