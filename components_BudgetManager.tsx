
import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, X, Trash2, Pencil, Printer, Mail, Save, 
  UserPlus, Package, Type, Image as ImageIcon, CheckCircle2, 
  Info, Layout, FileText
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
  
  // Estado do Formulário
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [proposalTitle, setProposalTitle] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('50% avista, 25% com 30 dias,, 25% restante na conclusão');
  const [deliveryTime, setDeliveryTime] = useState('15 dias uteis');
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [descriptionBlocks, setDescriptionBlocks] = useState<DescriptionBlock[]>([]);
  
  // Campos de entrada de item
  const [currentDesc, setCurrentDesc] = useState('');
  const [currentUnit, setCurrentUnit] = useState('UN');
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
    setCurrentDesc('');
    setCurrentPrice(0);
    setCurrentQty(1);
    notify("Item adicionado");
  };

  const addTextBlock = () => {
    const newBlock: DescriptionBlock = { id: Date.now().toString(), type: 'text', content: '' };
    setDescriptionBlocks([...descriptionBlocks, newBlock]);
  };

  const addImageBlock = () => {
    const newBlock: DescriptionBlock = { id: Date.now().toString(), type: 'image', content: '' };
    setDescriptionBlocks([...descriptionBlocks, newBlock]);
  };

  const handlePrintPDF = (budget: ServiceOrder | any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const itemsHtml = budget.items.map((item: any) => `
      <tr style="border-bottom: 1px solid #eee; font-size: 12px;">
        <td style="padding: 10px; font-weight: bold; text-transform: uppercase;">${item.description}</td>
        <td style="padding: 10px; text-align: center;">${item.quantity} ${item.unit || 'un'}</td>
        <td style="padding: 10px; text-align: right;">R$ ${item.unitPrice.toLocaleString('pt-BR')}</td>
        <td style="padding: 10px; text-align: right; font-weight: 900;">R$ ${(item.unitPrice * item.quantity).toLocaleString('pt-BR')}</td>
      </tr>`).join('');

    const html = `<html><head><meta charset="UTF-8"><script src="https://cdn.tailwindcss.com"></script></head><body class="p-10 font-sans">
      <div class="flex justify-between border-b-4 border-slate-900 pb-4 mb-8">
        <div><h1 class="text-2xl font-black">${company.name}</h1><p class="text-xs text-slate-500">${company.cnpj}</p></div>
        <div class="text-right"><h2 class="text-xl font-bold">ORÇAMENTO ${budget.id}</h2><p class="text-xs text-slate-500">${budget.createdAt}</p></div>
      </div>
      <div class="mb-8 p-4 bg-slate-50 rounded-xl border font-bold uppercase">CLIENTE: ${budget.customerName}</div>
      <h3 class="text-center text-blue-600 font-black text-xl mb-6 uppercase border-y py-2 border-blue-100">${budget.description}</h3>
      <table class="w-full mb-8"><thead><tr class="bg-slate-900 text-white text-[10px] uppercase tracking-widest"><th class="p-2 text-left">ITEM</th><th class="p-2">QTD</th><th class="p-2 text-right">UNIT</th><th class="p-2 text-right">TOTAL</th></tr></thead><tbody>${itemsHtml}</tbody></table>
      <div class="bg-slate-900 text-white p-6 rounded-xl flex justify-between items-center"><span class="font-bold">TOTAL DO INVESTIMENTO</span><span class="text-2xl font-black">R$ ${budget.totalAmount.toLocaleString('pt-BR')}</span></div>
      <script>window.onload=()=>{setTimeout(()=>{window.print();window.close();},500);}</script></body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleSave = () => {
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) { notify("Selecione um cliente", "error"); return; }
    if (items.length === 0) { notify("Adicione itens ao orçamento", "error"); return; }

    const data: ServiceOrder = {
      id: editingBudgetId || `ORC-${Date.now().toString().slice(-4)}`,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      description: proposalTitle || 'Proposta de Manutenção',
      status: OrderStatus.PENDING,
      items: items,
      descriptionBlocks: descriptionBlocks,
      totalAmount: totalAmount,
      paymentTerms: paymentTerms,
      deliveryTime: deliveryTime,
      createdAt: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    if (editingBudgetId) {
      setOrders(prev => prev.map(o => o.id === editingBudgetId ? data : o));
    } else {
      setOrders(prev => [data, ...prev]);
    }
    
    setShowForm(false);
    setEditingBudgetId(null);
    notify("Orçamento registrado!");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Propostas Comerciais</h2>
          <p className="text-slate-500 text-sm">Gerencie seus orçamentos e negociações.</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingBudgetId(null); setSelectedCustomerId(''); setItems([]); setProposalTitle(''); setDescriptionBlocks([]); }} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
          <Plus className="w-5 h-5 inline mr-1" /> Nova Proposta
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border shadow-sm">
        <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input type="text" placeholder="Buscar por cliente ou código..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map(budget => (
          <div key={budget.id} className="bg-white rounded-2xl border-l-4 border-l-blue-600 border-y border-r border-slate-200 p-6 flex flex-col h-full shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase">{budget.id}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditingBudgetId(budget.id); setSelectedCustomerId(budget.customerId); setItems(budget.items); setProposalTitle(budget.description); setPaymentTerms(budget.paymentTerms || ''); setDeliveryTime(budget.deliveryTime || ''); setDescriptionBlocks(budget.descriptionBlocks || []); setShowForm(true); }} className="p-2 text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => confirm("Excluir?") && setOrders(prev => prev.filter(o => o.id !== budget.id))} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <h4 className="font-bold text-slate-900 mb-1 uppercase truncate">{budget.customerName}</h4>
            <p className="text-xs text-slate-500 mb-4 h-8 line-clamp-2">{budget.description}</p>
            <div className="mt-auto pt-4 border-t flex justify-between items-center">
               <span className="font-black text-slate-900">R$ {budget.totalAmount.toLocaleString('pt-BR')}</span>
               <div className="flex gap-1">
                 <button onClick={() => handlePrintPDF(budget)} className="p-2 text-slate-900 hover:bg-slate-100 rounded-lg"><Printer className="w-5 h-5" /></button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[1200px] h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="px-10 py-6 border-b flex justify-between items-center bg-white shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Nova Proposta Comercial</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Configuração Técnica Profissional</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-300" /></button>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
              <div className="flex-1 overflow-y-auto p-10 bg-[#f8fafc] space-y-10 no-scrollbar">
                {/* IDENTIFICAÇÃO */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificação</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Cliente</label>
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
                      <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Título da Proposta</label>
                      <input type="text" placeholder="Ex: Reforma Geral de Ar-Condicionado" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none" value={proposalTitle} onChange={e => setProposalTitle(e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* DESCRIÇÃO TÉCNICA */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição Técnica</h4>
                    <div className="flex gap-2">
                      <button onClick={addTextBlock} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-blue-100"><Type className="w-3.5 h-3.5" /> + Texto</button>
                      <button onClick={addImageBlock} className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-emerald-100"><ImageIcon className="w-3.5 h-3.5" /> + Imagem</button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {descriptionBlocks.map(block => (
                      <div key={block.id} className="relative group">
                        {block.type === 'text' ? (
                          <textarea className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium outline-none min-h-[100px]" placeholder="Digite o detalhamento..." value={block.content} onChange={e => setDescriptionBlocks(descriptionBlocks.map(b => b.id === block.id ? {...b, content: e.target.value} : b))} />
                        ) : (
                          <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 text-slate-300 font-black uppercase text-[10px] tracking-widest"><ImageIcon className="w-8 h-8" /> Espaço p/ Imagem</div>
                        )}
                        <button onClick={() => setDescriptionBlocks(descriptionBlocks.filter(b => b.id !== block.id))} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ITENS */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens do Orçamento</h4>
                    <button onClick={() => setShowFullServiceForm(true)} className="text-emerald-600 text-[10px] font-black uppercase flex items-center gap-1 hover:underline">
                      <Package className="w-3 h-3" /> Cadastrar Serviços
                    </button>
                  </div>
                  <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                    <label className="text-[10px] font-black text-blue-600 uppercase">Selecionar do Catálogo</label>
                    <select className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-500 outline-none" onChange={e => { const s = catalogServices.find(x => x.id === e.target.value); if(s) { setCurrentDesc(s.name); setCurrentPrice(s.basePrice); setCurrentUnit(s.unit || 'UN'); } }}>
                      <option value="">Pesquisar serviço...</option>
                      {catalogServices.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.basePrice.toLocaleString()}</option>)}
                    </select>
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Descrição</label>
                        <input type="text" className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs font-bold outline-none" value={currentDesc} onChange={e => setCurrentDesc(e.target.value)} />
                      </div>
                      <div className="w-24"><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block text-center">Unit</label><input type="text" className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs font-black text-center outline-none uppercase" value={currentUnit} onChange={e => setCurrentUnit(e.target.value)} /></div>
                      <div className="w-24"><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block text-center">Qtd</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs font-black text-center outline-none" value={currentQty} onChange={e => setCurrentQty(Number(e.target.value))} /></div>
                      <div className="w-32"><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Preço (R$)</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs font-black outline-none" value={currentPrice} onChange={e => setCurrentPrice(Number(e.target.value))} /></div>
                      <button onClick={handleAddItem} className="bg-blue-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 transition-all"><Plus className="w-6 h-6" /></button>
                    </div>
                    <div className="divide-y border-t pt-4">
                      {items.map(item => (
                        <div key={item.id} className="py-3 flex justify-between items-center group">
                          <div className="text-xs"><span className="font-black uppercase text-slate-700">{item.description}</span><span className="text-slate-400 ml-2 font-bold">{item.quantity} {item.unit} x R$ {item.unitPrice.toLocaleString()}</span></div>
                          <div className="flex items-center gap-4"><span className="font-black text-slate-900">R$ {(item.unitPrice * item.quantity).toLocaleString()}</span><button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-rose-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* MODAL FULL CLIENT */}
                {showFullClientForm && (
                  <div className="absolute inset-0 z-50 overflow-hidden bg-white/60 backdrop-blur-md">
                    <div className="h-full flex flex-col p-10">
                       <CustomerManager customers={customers} setCustomers={setCustomers} orders={orders} defaultOpenForm={true} onSuccess={(c) => { setSelectedCustomerId(c.id); setShowFullClientForm(false); }} onCancel={() => setShowFullClientForm(false)} />
                    </div>
                  </div>
                )}

                {/* MODAL FULL SERVICE */}
                {showFullServiceForm && (
                  <div className="absolute inset-0 z-50 overflow-hidden bg-white/60 backdrop-blur-md">
                    <div className="h-full flex flex-col p-10">
                       <ServiceCatalog services={catalogServices} setServices={setCatalogServices} company={company} defaultOpenForm={true} onSuccess={(s) => { setCurrentDesc(s.name); setCurrentPrice(s.basePrice); setCurrentUnit(s.unit || 'un'); setShowFullServiceForm(false); }} />
                    </div>
                  </div>
                )}
              </div>

              {/* SIDEBAR RESUMO */}
              <div className="w-[380px] bg-[#0f172a] text-white p-10 flex flex-col space-y-8 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Layout className="w-40 h-40" /></div>
                <div><h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Investimento Estimado</h4><div className="flex justify-between items-baseline border-b border-slate-800 pb-4"><span className="text-sm font-bold text-slate-300">Total da Proposta</span><span className="text-4xl font-black text-blue-400 tracking-tighter">R$ {totalAmount.toLocaleString('pt-BR')}</span></div></div>
                <div className="space-y-6"><div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Condições de Pagamento</label><textarea className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-300 outline-none focus:ring-1 focus:ring-blue-500 min-h-[100px]" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} /></div><div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Prazo de Entrega</label><input type="text" className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-300 outline-none" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} /></div></div>
                <div className="mt-auto space-y-4">
                  <div className="grid grid-cols-2 gap-3"><button onClick={() => handlePrintPDF({ customerName: customers.find(c => c.id === selectedCustomerId)?.name || 'N/A', items, totalAmount, description: proposalTitle, id: 'NOVO', createdAt: new Date().toLocaleDateString() })} className="bg-slate-800 hover:bg-slate-700 text-white p-5 rounded-2xl font-black uppercase text-[10px] flex flex-col items-center gap-2 transition-all"><Printer className="w-5 h-5 text-blue-400" /> Imprimir</button><button onClick={() => notify("PDF Gerado!", "info")} className="bg-slate-800 hover:bg-slate-700 text-white p-5 rounded-2xl font-black uppercase text-[10px] flex flex-col items-center gap-2 transition-all"><FileText className="w-5 h-5 text-emerald-400" /> Salvar PDF</button></div>
                  <button onClick={handleSave} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-blue-900/50 hover:bg-blue-500 transition-all flex items-center justify-center gap-3"><Save className="w-5 h-5" /> Registrar Proposta</button>
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
