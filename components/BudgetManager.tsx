
import React, { useState, useMemo, useEffect } from 'react';
import { printBudget, downloadBudgetPdf } from '../services/budgetPdfService';
import {
  Plus, Search, X, Trash2, Pencil, Printer, Save,
  UserPlus, Package, Type, Image as ImageIcon,
  FileText, Upload, CheckCircle, Zap, FileDown, Copy, Database,
  ChevronUp, ChevronDown, GripVertical
} from 'lucide-react';
import RichTextEditor from './ui/RichTextEditor';
import { ServiceOrder, OrderStatus, Customer, ServiceItem, CatalogService, CompanyProfile, DescriptionBlock } from '../types';
import { useNotify } from './ToastProvider';
import CustomerManager from './CustomerManager';
import ServiceCatalog from './ServiceCatalog';
import { db } from '../services/db';
import { compressImage } from '../services/imageUtils';
import BudgetList from './budget/BudgetList';
import BudgetDescriptionEditor from './budget/BudgetDescriptionEditor';
import BudgetSummarySidebar from './budget/BudgetSummarySidebar';
import BudgetItemsEditor from './budget/BudgetItemsEditor';

interface Props {
  orders: ServiceOrder[];
  setOrders: React.Dispatch<React.SetStateAction<ServiceOrder[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  catalogServices: CatalogService[];
  setCatalogServices: React.Dispatch<React.SetStateAction<CatalogService[]>>;
  company: CompanyProfile;
  prefilledData: any;
  onPrefilledDataConsumed: () => void;
}

const BudgetManager: React.FC<Props> = ({
  orders,
  setOrders,
  customers,
  setCustomers,
  catalogServices,
  setCatalogServices,
  company,
  prefilledData,
  onPrefilledDataConsumed
}) => {
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

  // Handle Prefilled Data from Planning
  useEffect(() => {
    if (prefilledData) {
      const { plan, services, totalMaterial, totalLabor, totalIndirect } = prefilledData;

      // 1. Set Customer
      setSelectedCustomerId(plan.client_id || '');

      // 2. Set Title
      setProposalTitle(plan.name || '');

      // 2.1 Set BDI and Taxes
      if (typeof prefilledData.bdiRate === 'number') setBdiRate(prefilledData.bdiRate);
      if (typeof prefilledData.taxRate === 'number') setTaxRate(prefilledData.taxRate);

      // 3. Map items
      const newItems: ServiceItem[] = [];

      // Add services
      if (services && services.length > 0) {
        services.forEach((s: any) => {
          newItems.push({
            id: db.generateId('ITEM'),
            description: s.description,
            quantity: s.quantity,
            unitPrice: s.unit_labor_cost + s.unit_material_cost,
            unit: s.unit,
            type: 'Serviço'
          });
        });
      }

      // Add summary items for direct costs if needed
      if (totalMaterial > 0) {
        newItems.push({
          id: db.generateId('ITEM'),
          description: 'TOTAL DE MATERIAIS E INSUMOS (PREVISTO)',
          quantity: 1,
          unitPrice: totalMaterial,
          unit: 'un',
          type: 'Material'
        });
      }

      if (totalLabor > 0) {
        newItems.push({
          id: db.generateId('ITEM'),
          description: 'TOTAL DE MÃO DE OBRA (PREVISTO)',
          quantity: 1,
          unitPrice: totalLabor,
          unit: 'un',
          type: 'Serviço'
        });
      }

      if (totalIndirect > 0) {
        newItems.push({
          id: db.generateId('ITEM'),
          description: 'CUSTOS INDIRETOS E OPERACIONAIS (PREVISTO)',
          quantity: 1,
          unitPrice: totalIndirect,
          unit: 'un',
          type: 'Serviço'
        });
      }

      setItems(newItems);

      // 4. Open form
      setShowForm(true);
      setEditingBudgetId(null); // Ensure it's a new budget

      // 5. Consume data
      onPrefilledDataConsumed();

      notify("Dados do planejamento importados com sucesso!");
    }
  }, [prefilledData, onPrefilledDataConsumed, notify]);

  const subtotal = useMemo(() => items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0), [items]);
  const totalAmount = useMemo(() => {
    const bdi = Number(bdiRate) || 0;
    const tax = Number(taxRate) || 0;

    // 1. Calculate base with Mark-up for BDI (standard behavior)
    const bdiValue = subtotal * (bdi / 100);
    const subtotalWithBDI = subtotal + bdiValue;

    // 2. Apply Gross Up for Taxes (incidência sobre o total)
    // Formula: Total = (Custo + BDI) / (1 - Taxas%)
    const taxFactor = Math.max(0.01, 1 - (tax / 100));
    return subtotalWithBDI / taxFactor;
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

  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    setItems(newItems);
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

  const handlePrint = (budget: ServiceOrder) => {
    const cust = customers.find(c => c.id === budget.customerId);
    printBudget(budget, company, cust?.document);
  };

  const handleGeneratePDF = (budget: ServiceOrder) => {
    const cust = customers.find(c => c.id === budget.customerId);
    downloadBudgetPdf(budget, company, cust?.document, notify);
  };



  const handleSave = async () => {
    if (isSaving) return;
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) { notify("Selecione um cliente", "error"); return; }
    if (items.length === 0) { notify("Adicione itens ao Orçamento", "error"); return; }

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
      // Optimization: pass 'data' as third argument to sync ONLY this budget to Supabase
      const result = await db.save('serviflow_orders', newList, data);
      if (result?.success) {
        notify("Orçamento salvo e sincronizado!");
        setTimeout(() => setShowForm(false), 1500);
      } else if ((result as any)?.error === 'quota_exceeded') {
        notify("ERRO DE ARMAZENAMENTO: Limite excedido.", "error");
      } else {
        notify(`Salvo localmente. Erro Sync: ${((result as any)?.error)?.message || JSON.stringify((result as any)?.error)}`, "warning");
        setShowForm(false);
      }
    } finally { setIsSaving(false); }
  };

  // Helper to load existing budget data into form

  const handleDraftPrint = () => {
    handlePrint({
      customerId: selectedCustomerId,
      customerName: customers.find(c => c.id === selectedCustomerId)?.name || 'N/A',
      customerEmail: customers.find(c => c.id === selectedCustomerId)?.email || '',
      items, totalAmount, description: proposalTitle, descriptionBlocks, paymentTerms, deliveryTime,
      id: editingBudgetId || 'ORC-XXXX',
      status: OrderStatus.PENDING,
      taxRate: Number(taxRate) || 0, bdiRate: Number(bdiRate) || 0,
      createdAt: editingBudgetId ? (orders.find(o => o.id === editingBudgetId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      dueDate: editingBudgetId ? (orders.find(o => o.id === editingBudgetId)?.dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  };

  const handleDraftDownload = () => {
    handleGeneratePDF({
      customerId: selectedCustomerId,
      customerName: customers.find(c => c.id === selectedCustomerId)?.name || 'N/A',
      customerEmail: customers.find(c => c.id === selectedCustomerId)?.email || '',
      items, totalAmount, description: proposalTitle, descriptionBlocks, paymentTerms, deliveryTime,
      id: editingBudgetId || 'ORC-XXXX',
      status: OrderStatus.PENDING,
      taxRate: Number(taxRate) || 0, bdiRate: Number(bdiRate) || 0,
      createdAt: editingBudgetId ? (orders.find(o => o.id === editingBudgetId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      dueDate: editingBudgetId ? (orders.find(o => o.id === editingBudgetId)?.dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  };

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
    if (isClone) notify("Orçamento clonado! Voce esta editando uma nova copia.");
  };



  const handleApproveBudget = async (budget: ServiceOrder) => {
    if (confirm("Deseja APROVAR este Orçamento? Ele sera convertido em Ordem de Serviço.")) {
    }
  };

  const handleDeleteBudget = async (budget: ServiceOrder) => {
    if (confirm("Deseja excluir este Orçamento? Esta ação também removerá os dados da nuvem.")) {
      const idToDelete = budget.id;
      setOrders(prev => prev.filter(o => o.id !== idToDelete));
      const result = await db.remove('serviflow_orders', idToDelete);
      if (result?.success) { notify("Orçamento removido da nuvem com sucesso."); }
      else { notify("Removido localmente, mas houve erro ao sincronizar.", "error"); }
    }
  };

  const handleNewBudget = () => {
    setEditingBudgetId(null);
    setItems([]);
    setProposalTitle('');
    setTaxRate(0);
    setBdiRate(0);
    setShowForm(true);
  };
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {!showForm && (
        <BudgetList
          orders={orders}
          onNewBudget={handleNewBudget}
          onApprove={handleApproveBudget}
          onDuplicate={(budget) => loadBudgetToForm(budget, true)}
          onEdit={(budget) => loadBudgetToForm(budget)}
          onPrint={handlePrint}
          onDownloadPdf={handleGeneratePDF}
          onDelete={handleDeleteBudget}
        />
      )}

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-[1240px] h-[95vh] rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="px-8 py-4 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-950/20"><FileText className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-0.5">Elaboração de Orçamento Prime</h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em]">Configuração de Documento Comercial</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {!editingBudgetId && (
                  <button onClick={() => setShowImportModal(true)} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all">
                    <Database className="w-4 h-4" /> Importar de Existente
                  </button>
                )}
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="w-6 h-6 text-slate-300 dark:text-slate-600" /></button>
              </div>
            </div>
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden overflow-y-auto lg:overflow-y-hidden relative">
              <div className="flex-1 lg:overflow-y-auto p-6 bg-[#f8fafc] dark:bg-slate-950 space-y-6 no-scrollbar">
                <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase ml-1">Cliente</label>
                        <button onClick={() => setShowFullClientForm(true)} className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase flex items-center gap-1 hover:underline">
                          <UserPlus className="w-3 h-3" /> Cadastrar Cliente
                        </button>
                      </div>
                      <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                        <option value="">Selecione o cliente...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase mb-2 block ml-1">Título da Proposta</label>
                      <input type="text" placeholder="Ex: Reforma Geral de Ar-Condicionado" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-500" value={proposalTitle} onChange={e => setProposalTitle(e.target.value)} />
                    </div>
                  </div>
                </div>

                <BudgetDescriptionEditor blocks={descriptionBlocks} setBlocks={setDescriptionBlocks} />

                <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b dark:border-slate-800 pb-2 grow mr-6">ITENS DO Orçamento</h4>
                    <button onClick={() => setShowFullServiceForm(true)} className="text-blue-600 dark:text-blue-400 text-[8px] font-black uppercase flex items-center gap-1 hover:underline tracking-widest"><Package className="w-3 h-3" /> CATALOGO</button>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 space-y-4">
                    <div>
                      <label className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-1.5">Puxar do Catalogo</label>
                      <select className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-2.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 outline-none" value={selectedCatalogId} onChange={e => {
                        const id = e.target.value;
                        setSelectedCatalogId(id);
                        const s = catalogServices.find(x => x.id === id);
                        if (s) { setCurrentDesc(s.name); setCurrentPrice(s.basePrice); setCurrentUnit(s.unit || 'un'); }
                      }}>
                        <option value="">Selecione para preencher...</option>
                        {catalogServices.map(s => <option key={s.id} value={s.id}>{s.name} (R$ {s.basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                      <div className="md:col-span-6">
                        <label className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase mb-1.5 block ml-1">Descrição</label>
                        <input type="text" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-500" value={currentDesc} onChange={e => setCurrentDesc(e.target.value)} />
                      </div>
                      <div className="w-24"><label className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase mb-1.5 block text-center">Unit</label><input type="text" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs font-black text-center outline-none uppercase text-slate-900 dark:text-slate-100" value={currentUnit} onChange={e => setCurrentUnit(e.target.value)} /></div>
                      <div className="w-24"><label className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase mb-1.5 block text-center">Qtd</label><input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs font-black text-center outline-none text-slate-900 dark:text-slate-100" value={currentQty} onChange={e => setCurrentQty(Number(e.target.value))} /></div>
                      <div className="w-32"><label className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase mb-1.5 block ml-1">Preço (R$)</label><input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs font-black outline-none text-slate-900 dark:text-slate-100" value={currentPrice} onChange={e => setCurrentPrice(Number(e.target.value))} /></div>
                      <div className="md:col-span-1">
                        <button onClick={handleAddItem} className="bg-blue-600 text-white w-full h-[58px] rounded-xl flex items-center justify-center hover:scale-105 transition-all shadow-md shadow-blue-950/30"><Plus className="w-6 h-6" /></button>
                      </div>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                      {items.map((item, index) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => setDraggedItemIndex(index)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (draggedItemIndex !== null && draggedItemIndex !== index) {
                              const newItems = [...items];
                              const draggedItem = newItems[draggedItemIndex];
                              newItems.splice(draggedItemIndex, 1);
                              newItems.splice(index, 0, draggedItem);
                              setItems(newItems);
                              setDraggedItemIndex(index);
                            }
                          }}
                          onDragEnd={() => setDraggedItemIndex(null)}
                          className={`flex justify-between items-center p-2.5 rounded-lg border group gap-2 transition-all ${draggedItemIndex === index ? 'opacity-50 bg-blue-50 dark:bg-blue-900/20 border-blue-200' : 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 hover:border-blue-200 cursor-default'}`}
                        >
                          <div className="flex items-center gap-2 grow">
                            <div className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 shrink-0">
                              <GripVertical size={14} />
                            </div>
                            <div className="grow">
                              <p className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase mb-1">{item.description}</p>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded px-2 py-1 border border-slate-100 dark:border-slate-700">
                                  <span className="text-[8px] font-bold text-slate-400">QTD:</span>
                                  <input type="number" className="w-12 bg-transparent text-[9px] font-black text-slate-700 dark:text-slate-200 outline-none" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} />
                                </div>
                                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded px-2 py-1 border border-slate-100 dark:border-slate-700">
                                  <span className="text-[8px] font-bold text-slate-400">VALOR:</span>
                                  <input type="number" className="w-20 bg-transparent text-[9px] font-black text-slate-700 dark:text-slate-200 outline-none" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded px-2 py-1 border border-slate-100 dark:border-slate-700">
                              <span className="text-[8px] font-bold text-slate-400">TOTAL:</span>
                              <input type="number" className="w-24 bg-transparent text-[11px] font-black text-blue-600 dark:text-blue-400 outline-none text-right" value={Number((item.unitPrice * item.quantity).toFixed(2))} onChange={e => updateItemTotal(item.id, Number(e.target.value))} />
                            </div>
                            <div className="flex flex-col gap-0">
                              <button onClick={() => moveItem(items.indexOf(item), 'up')} disabled={items.indexOf(item) === 0} className="text-slate-300 hover:text-blue-500 disabled:opacity-0 transition-all"><ChevronUp className="w-3 h-3" /></button>
                              <button onClick={() => moveItem(items.indexOf(item), 'down')} disabled={items.indexOf(item) === items.length - 1} className="text-slate-300 hover:text-blue-500 disabled:opacity-0 transition-all"><ChevronDown className="w-3 h-3" /></button>
                            </div>
                            <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-rose-300 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {items.length > 0 && (
                      <div className="flex justify-end pt-2">
                        <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-3 flex items-center gap-4 shadow-sm">
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Subtotal dos Itens</span>
                          <span className="text-lg font-black text-slate-900 dark:text-white whitespace-nowrap">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
              <BudgetSummarySidebar
                bdiRate={bdiRate}
                setBdiRate={setBdiRate}
                taxRate={taxRate}
                setTaxRate={setTaxRate}
                subtotal={subtotal}
                totalAmount={totalAmount}
                paymentTerms={paymentTerms}
                setPaymentTerms={setPaymentTerms}
                deliveryTime={deliveryTime}
                setDeliveryTime={setDeliveryTime}
                onShowPayment={() => setShowPaymentModal(true)}
                onPrint={handleDraftPrint}
                onDownload={handleDraftDownload}
                onSave={handleSave}
              />
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
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[80vh] border dark:border-slate-800">
            <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Importar Dados de Orçamento</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Selecione um Orçamento para copiar itens e descrição</p>
              </div>
              <button onClick={() => setShowImportModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-rose-500" /></button>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por cliente ou título..."
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                  value={importSearch}
                  onChange={e => setImportSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar bg-white dark:bg-slate-900">
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
                    className="w-full text-left p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group flex justify-between items-center"
                  >
                    <div>
                      <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">{budget.id}</p>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{budget.description}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{budget.customerName}</p>
                    </div>
                    <Plus className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                  </button>
                ))
              }
              {orders.filter(o => (o.status === OrderStatus.PENDING || o.status === OrderStatus.APPROVED)).length === 0 && (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhum Orçamento disponivel para importação</p>
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
    const currency = (val: number) => `R$${'\u00A0'}${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (type === 'vista') {
      text = `Pagamento + vista com desconto na aprovao do Orçamento. Total: ${currency(totalValue)}.`;
    } else if (type === 'conclusao') {
      text = `Pagamento integral ${currency(totalValue)} a ser realizado aps entrega t+cnica e aprovao dos serviços.`;
    } else if (type === 'parcelado') {
      const remainder = totalValue - entryValue;
      const parcValue = installments > 0 ? remainder / installments : 0;

      text = `Entrada de ${currency(entryValue)} na aprova��o.`;
      if (installments > 0) {
        text += `\nSaldo restante de ${currency(remainder)} dividido em ${installments}x de ${currency(parcValue)} (30/${installments > 1 ? '60/90...' : ' dias'}).`;
      }
    }
    setPreview(text);
  }, [type, entryValue, installments, totalValue]);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 border dark:border-slate-800">
        <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Condição de Pagamento</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-rose-500" /></button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Tipo de Negociação</label>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setType('vista')} className={`p-3 rounded-xl border text-xs font-bold uppercase transition-all ${type === 'vista' ? 'bg-blue-600 border-blue-600 text-white ring-2 ring-blue-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>+ Vista</button>
              <button onClick={() => setType('parcelado')} className={`p-3 rounded-xl border text-xs font-bold uppercase transition-all ${type === 'parcelado' ? 'bg-blue-600 border-blue-600 text-white ring-2 ring-blue-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Parcelado</button>
              <button onClick={() => setType('conclusao')} className={`p-3 rounded-xl border text-xs font-bold uppercase transition-all ${type === 'conclusao' ? 'bg-blue-600 border-blue-600 text-white ring-2 ring-blue-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Entrega</button>
            </div>
          </div>

          {type === 'parcelado' && (
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="col-span-2">
                <div className="flex justify-between mb-1"><span className="text-[10px] font-bold text-slate-400 uppercase">Valor Total</span> <span className="text-[10px] font-black text-slate-900 dark:text-white whitespace-nowrap">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (entryValue / totalValue) * 100)}%` }}></div></div>
              </div>
              <div className="grid grid-cols-2 gap-2 col-span-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Entrada (%)</label>
                  <input type="number" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" value={percentValue} onChange={e => {
                    const val = Number(e.target.value);
                    setPercentValue(val);
                    setEntryValue(totalValue * (val / 100));
                  }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Entrada (R$)</label>
                  <input type="number" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" value={entryValue} onChange={e => {
                    const val = Number(e.target.value);
                    setEntryValue(val);
                    if (totalValue > 0) setPercentValue(Number(((val / totalValue) * 100).toFixed(1)));
                  }} />
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Parcelas</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setInstallments(Math.max(1, installments - 1))} className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-slate-600 dark:text-slate-400">-</button>
                  <span className="flex-1 text-center font-black text-slate-900 dark:text-white text-lg">{installments}x</span>
                  <button onClick={() => setInstallments(installments + 1)} className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-slate-600 dark:text-slate-400">+</button>
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

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancelar</button>
          <button onClick={() => onConfirm(preview, percentValue)} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wide shadow-md shadow-blue-950/20 transition-all active:scale-95">Aplicar Texto</button>
        </div>
      </div>
    </div>
  );


};

export default BudgetManager;

