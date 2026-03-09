import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  X,
  Trash2,
  UserPlus,
  Package,
  FileText,
  Database,
  ChevronUp,
  ChevronDown,
  GripVertical,
  ScrollText
} from 'lucide-react';
import { ServiceOrder, OrderStatus, Customer, ServiceItem, CatalogService, CompanyProfile, DescriptionBlock } from '../types';
import { useNotify } from './ToastProvider';
import CustomerManager from './CustomerManager';
import ServiceCatalog from './ServiceCatalog';
import { db } from '../services/db';
import BudgetList from './budget/BudgetList';
import BudgetDescriptionEditor from './budget/BudgetDescriptionEditor';
import BudgetSummarySidebar from './budget/BudgetSummarySidebar';
import ReportPreview from './ReportPreview';
import { generateBudgetReportHtml } from '../services/budgetPdfService';
import { getContractHtml } from '../services/contractPdfService';
// DocumentPreview and BudgetDocument are replaced by the unified system

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

const DEFAULT_PAYMENT_TERMS = '50% à vista, 25% com 30 dias, 25% restante na conclusão';
const DEFAULT_DELIVERY_TIME = '15 dias úteis';

const getTodayIsoDate = () => new Date().toISOString().split('T')[0];
const getFutureIsoDate = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const safeNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

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
  const [previewBudget, setPreviewBudget] = useState<ServiceOrder | null>(null);
  const [previewContract, setPreviewContract] = useState<ServiceOrder | null>(null);
  const { notify } = useNotify();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [proposalTitle, setProposalTitle] = useState('');
  const [paymentTerms, setPaymentTerms] = useState(DEFAULT_PAYMENT_TERMS);
  const [paymentEntryPercent, setPaymentEntryPercent] = useState<number>(30);
  const [deliveryTime, setDeliveryTime] = useState(DEFAULT_DELIVERY_TIME);
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

  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState<number | null>(null);

  const resetForm = useCallback(() => {
    setEditingBudgetId(null);
    setSelectedCustomerId('');
    setProposalTitle('');
    setPaymentTerms(DEFAULT_PAYMENT_TERMS);
    setPaymentEntryPercent(30);
    setDeliveryTime(DEFAULT_DELIVERY_TIME);
    setItems([]);
    setDescriptionBlocks([]);
    setCurrentDesc('');
    setCurrentUnit('un');
    setCurrentQty(1);
    setCurrentPrice(0);
    setTaxRate(0);
    setBdiRate(0);
    setSelectedCatalogId('');
  }, []);

  const budgets = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return orders.filter(o => {
      const validStatus = o.status === OrderStatus.PENDING || o.status === OrderStatus.APPROVED;
      if (!validStatus) return false;
      if (!term) return true;

      return (
        o.customerName.toLowerCase().includes(term) ||
        o.id.toLowerCase().includes(term) ||
        (o.description || '').toLowerCase().includes(term)
      );
    });
  }, [orders, searchTerm]);

  useEffect(() => {
    if (!prefilledData) return;

    resetForm();

    const { plan, services, totalMaterial, totalLabor, totalIndirect } = prefilledData;

    setSelectedCustomerId(plan?.client_id || '');
    setProposalTitle(plan?.name || '');

    if (typeof prefilledData.bdiRate === 'number') setBdiRate(prefilledData.bdiRate);
    if (typeof prefilledData.taxRate === 'number') setTaxRate(prefilledData.taxRate);

    const newItems: ServiceItem[] = [];

    if (Array.isArray(services) && services.length > 0) {
      services.forEach((s: any) => {
        newItems.push({
          id: db.generateId('ITEM'),
          description: s.description,
          quantity: safeNumber(s.quantity) || 1,
          unitPrice: safeNumber(s.unit_labor_cost) + safeNumber(s.unit_material_cost),
          unit: s.unit || 'un',
          type: 'Serviço'
        });
      });
    }

    if (safeNumber(totalMaterial) > 0) {
      newItems.push({
        id: db.generateId('ITEM'),
        description: 'TOTAL DE MATERIAIS E INSUMOS (PREVISTO)',
        quantity: 1,
        unitPrice: safeNumber(totalMaterial),
        unit: 'un',
        type: 'Material'
      });
    }

    if (safeNumber(totalLabor) > 0) {
      newItems.push({
        id: db.generateId('ITEM'),
        description: 'TOTAL DE MÃO DE OBRA (PREVISTO)',
        quantity: 1,
        unitPrice: safeNumber(totalLabor),
        unit: 'un',
        type: 'Serviço'
      });
    }

    if (safeNumber(totalIndirect) > 0) {
      newItems.push({
        id: db.generateId('ITEM'),
        description: 'CUSTOS INDIRETOS E OPERACIONAIS (PREVISTO)',
        quantity: 1,
        unitPrice: safeNumber(totalIndirect),
        unit: 'un',
        type: 'Serviço'
      });
    }

    setItems(newItems);
    setShowForm(true);
    setEditingBudgetId(null);
    onPrefilledDataConsumed();
    notify('Dados do planejamento importados com sucesso!');
  }, [prefilledData, onPrefilledDataConsumed, notify, resetForm]);

  const subtotal = useMemo(() => {
    return items.reduce((acc, i) => acc + safeNumber(i.unitPrice) * safeNumber(i.quantity), 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    const bdi = safeNumber(bdiRate);
    const tax = safeNumber(taxRate);

    const bdiValue = subtotal * (bdi / 100);
    const subtotalWithBDI = subtotal + bdiValue;

    if (tax >= 100) return subtotalWithBDI;

    const taxFactor = 1 - tax / 100;
    if (taxFactor <= 0) return subtotalWithBDI;

    return subtotalWithBDI / taxFactor;
  }, [subtotal, taxRate, bdiRate]);

  const buildBudgetFromForm = useCallback((): ServiceOrder | null => {
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) return null;

    const existingBudget = editingBudgetId ? orders.find(o => o.id === editingBudgetId) : null;
    const validityDays = company.defaultProposalValidity || 15;

    return {
      id: editingBudgetId || db.generateId('ORC'),
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      description: proposalTitle || 'REFORMA DE PINTURA',
      status: existingBudget?.status || OrderStatus.PENDING,
      items,
      descriptionBlocks,
      totalAmount,
      paymentTerms,
      deliveryTime,
      paymentEntryPercent,
      taxRate: safeNumber(taxRate),
      bdiRate: safeNumber(bdiRate),
      createdAt: existingBudget?.createdAt || getTodayIsoDate(),
      dueDate: existingBudget?.dueDate || getFutureIsoDate(validityDays)
    };
  }, [
    customers,
    selectedCustomerId,
    editingBudgetId,
    orders,
    company.defaultProposalValidity,
    proposalTitle,
    items,
    descriptionBlocks,
    totalAmount,
    paymentTerms,
    deliveryTime,
    paymentEntryPercent,
    taxRate,
    bdiRate
  ]);

  const handleAddItem = useCallback(() => {
    if (!currentDesc.trim()) {
      notify('Informe a descrição do item.', 'error');
      return;
    }

    if (currentQty <= 0) {
      notify('A quantidade deve ser maior que zero.', 'error');
      return;
    }

    if (currentPrice <= 0) {
      notify('O preço deve ser maior que zero.', 'error');
      return;
    }

    const newItem: ServiceItem = {
      id: db.generateId('ITEM'),
      description: currentDesc.trim(),
      quantity: currentQty,
      unitPrice: currentPrice,
      unit: currentUnit || 'un',
      type: 'Serviço'
    };

    setItems(prev => [...prev, newItem]);
    setCurrentDesc('');
    setCurrentPrice(0);
    setCurrentQty(1);
    setCurrentUnit('un');
    setSelectedCatalogId('');
  }, [currentDesc, currentPrice, currentQty, currentUnit, notify]);

  const updateItem = useCallback((id: string, field: keyof ServiceItem, value: any) => {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  }, []);

  const updateItemTotal = useCallback((id: string, total: number) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;

        const quantity = safeNumber(item.quantity);
        if (quantity <= 0) return item;

        return { ...item, unitPrice: total / quantity };
      })
    );
  }, []);

  const moveItem = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    setItems(newItems);
  }, [items]);

  const reorderItems = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;

    setItems(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }, []);

  const handlePreviewBudget = useCallback((budget: ServiceOrder) => {
    setPreviewBudget(budget);
  }, []);

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    if (safeNumber(taxRate) >= 100) {
      notify('A taxa não pode ser maior ou igual a 100%.', 'error');
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) {
      notify('Selecione um cliente', 'error');
      return;
    }

    if (items.length === 0) {
      notify('Adicione itens ao orçamento', 'error');
      return;
    }

    const data = buildBudgetFromForm();
    if (!data) {
      notify('Não foi possível montar o orçamento.', 'error');
      return;
    }

    const newList = editingBudgetId ? orders.map(o => (o.id === editingBudgetId ? data : o)) : [data, ...orders];
    setOrders(newList);

    setIsSaving(true);
    try {
      const result = await db.save('serviflow_orders', newList, data);
      if (result?.success) {
        notify('Orçamento salvo e sincronizado!');
      } else if ((result as any)?.error === 'quota_exceeded') {
        notify('ERRO DE ARMAZENAMENTO: limite excedido.', 'error');
      } else {
        notify(`Salvo localmente. Erro de sync: ${((result as any)?.error)?.message || JSON.stringify((result as any)?.error)}`, 'warning');
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving,
    taxRate,
    customers,
    selectedCustomerId,
    items.length,
    buildBudgetFromForm,
    editingBudgetId,
    orders,
    setOrders,
    notify
  ]);

  const handlePreviewDraft = useCallback(() => {
    const budget = buildBudgetFromForm();
    if (!budget) {
      notify('Preencha os dados (cliente e itens) para visualizar o rascunho.', 'error');
      return;
    }
    setPreviewBudget(budget);
  }, [buildBudgetFromForm, notify]);

  const loadBudgetToForm = useCallback((budget: ServiceOrder, isClone = false) => {
    setShowImportModal(false);
    resetForm();

    setEditingBudgetId(isClone ? null : budget.id);
    setSelectedCustomerId(budget.customerId);
    setItems(budget.items.map(item => ({ ...item, id: db.generateId('ITEM') })));
    setProposalTitle(isClone ? `${budget.description} (CÓPIA)` : budget.description || '');
    setDescriptionBlocks(
      budget.descriptionBlocks && budget.descriptionBlocks.length > 0
        ? budget.descriptionBlocks.map(block => ({ ...block, id: db.generateId('BLK') }))
        : []
    );

    if (budget.paymentTerms) setPaymentTerms(budget.paymentTerms);
    if (budget.deliveryTime) setDeliveryTime(budget.deliveryTime);
    setPaymentEntryPercent(budget.paymentEntryPercent ?? 30);

    const b: any = budget;
    const t = b.taxRate ?? b.taxrate ?? b.tax_rate ?? 0;
    const d = b.bdiRate ?? b.bdirate ?? b.bdi_rate ?? 0;

    setTaxRate(t);
    setBdiRate(d);
    setShowForm(true);

    if (isClone) notify('Orçamento clonado! Você está editando uma nova cópia.');
  }, [notify, resetForm]);

  const handleApproveBudget = useCallback(async (budget: ServiceOrder) => {
    if (!window.confirm('Deseja APROVAR este orçamento? Ele será convertido em Ordem de Serviço.')) return;

    const updatedBudget = { ...budget, status: OrderStatus.APPROVED };
    const newList = orders.map(o => (o.id === budget.id ? updatedBudget : o));
    setOrders(newList);

    const result = await db.save('serviflow_orders', newList, updatedBudget);
    if (result?.success) {
      notify('Orçamento aprovado com sucesso!');
    } else {
      notify('Aprovado localmente, mas houve falha na sincronização.', 'warning');
    }
  }, [orders, setOrders, notify]);

  const handleDeleteBudget = useCallback(async (budget: ServiceOrder) => {
    if (!window.confirm('Deseja excluir este orçamento? Esta ação também removerá os dados da nuvem.')) return;

    const idToDelete = budget.id;
    setOrders(prev => prev.filter(o => o.id !== idToDelete));

    const result = await db.remove('serviflow_orders', idToDelete);
    if (result?.success) {
      notify('Orçamento removido da nuvem com sucesso.');
    } else {
      notify('Removido localmente, mas houve erro ao sincronizar.', 'error');
    }
  }, [setOrders, notify]);

  const handleNewBudget = useCallback(() => {
    resetForm();
    setShowForm(true);
  }, [resetForm]);

  const handleGenerateContract = (budget: ServiceOrder) => {
    setPreviewContract(budget);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {!showForm && (
        <BudgetList
          orders={budgets}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onNewBudget={handleNewBudget}
          onApprove={handleApproveBudget}
          onDuplicate={(budget) => loadBudgetToForm(budget, true)}
          onEdit={(budget) => loadBudgetToForm(budget)}
          onPrint={handlePreviewBudget}
          onGenerateContract={handleGenerateContract}
          onDelete={handleDeleteBudget}
        />
      )}

      {previewContract && (
        <ReportPreview
          title={`CONTRATO - ${previewContract.id} - ${previewContract.description}`}
          htmlContent={getContractHtml(
            previewContract,
            customers.find(c => c.id === previewContract.customerId) || {
              name: previewContract.customerName,
              document: 'N/A',
              address: 'Endereço não informado',
              city: '',
              state: '',
              cep: '',
              number: ''
            },
            company
          )}
          filename={`CONTRATO - ${previewContract.id} - ${previewContract.description}`}
          onClose={() => setPreviewContract(null)}
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
                    <h4 className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b dark:border-slate-800 pb-2 grow mr-6">ITENS DO ORÇAMENTO</h4>
                    <button onClick={() => setShowFullServiceForm(true)} className="text-blue-600 dark:text-blue-400 text-[8px] font-black uppercase flex items-center gap-1 hover:underline tracking-widest"><Package className="w-3 h-3" /> CATÁLOGO</button>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 space-y-4">
                    <div>
                      <label className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-1.5">Puxar do Catálogo</label>
                      <select
                        className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-2.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 outline-none"
                        value={selectedCatalogId}
                        onChange={e => {
                          const id = e.target.value;
                          setSelectedCatalogId(id);
                          const s = catalogServices.find(x => x.id === id);
                          if (s) {
                            setCurrentDesc(s.name);
                            setCurrentPrice(s.basePrice);
                            setCurrentUnit(s.unit || 'un');
                          }
                        }}
                      >
                        <option value="">Selecione para preencher...</option>
                        {catalogServices.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} (R$ {s.basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                      <div className="md:col-span-6">
                        <label className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase mb-1.5 block ml-1">Descrição</label>
                        <input type="text" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-500" value={currentDesc} onChange={e => setCurrentDesc(e.target.value)} />
                      </div>
                      <div className="w-24">
                        <label className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase mb-1.5 block text-center">Unit</label>
                        <input type="text" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs font-black text-center outline-none uppercase text-slate-900 dark:text-slate-100" value={currentUnit} onChange={e => setCurrentUnit(e.target.value)} />
                      </div>
                      <div className="w-24">
                        <label className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase mb-1.5 block text-center">Qtd</label>
                        <input type="number" min={1} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs font-black text-center outline-none text-slate-900 dark:text-slate-100" value={currentQty} onChange={e => setCurrentQty(Math.max(0, Number(e.target.value)))} />
                      </div>
                      <div className="w-32">
                        <label className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase mb-1.5 block ml-1">Preço (R$)</label>
                        <input type="number" min={0} step="0.01" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs font-black outline-none text-slate-900 dark:text-slate-100" value={currentPrice} onChange={e => setCurrentPrice(Math.max(0, Number(e.target.value)))} />
                      </div>
                      <div className="md:col-span-1">
                        <button onClick={handleAddItem} className="bg-blue-600 text-white w-full h-[58px] rounded-xl flex items-center justify-center hover:scale-105 transition-all shadow-md shadow-blue-950/30"><Plus className="w-6 h-6" /></button>
                      </div>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                      {items.map((item, index) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => {
                            setDraggedItemIndex(index);
                            setDragOverItemIndex(index);
                          }}
                          onDragEnter={() => setDragOverItemIndex(index)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedItemIndex !== null) reorderItems(draggedItemIndex, index);
                            setDraggedItemIndex(null);
                            setDragOverItemIndex(null);
                          }}
                          onDragEnd={() => {
                            setDraggedItemIndex(null);
                            setDragOverItemIndex(null);
                          }}
                          className={`flex justify-between items-center p-2.5 rounded-lg border group gap-2 transition-all ${dragOverItemIndex === index ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200' : 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 hover:border-blue-200 cursor-default'}`}
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
                                  <input type="number" min={1} className="w-12 bg-transparent text-[9px] font-black text-slate-700 dark:text-slate-200 outline-none" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Math.max(1, Number(e.target.value)))} />
                                </div>
                                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded px-2 py-1 border border-slate-100 dark:border-slate-700">
                                  <span className="text-[8px] font-bold text-slate-400">VALOR:</span>
                                  <input type="number" min={0} step="0.01" className="w-20 bg-transparent text-[9px] font-black text-slate-700 dark:text-slate-200 outline-none" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Math.max(0, Number(e.target.value)))} />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded px-2 py-1 border border-slate-100 dark:border-slate-700">
                              <span className="text-[8px] font-bold text-slate-400">TOTAL:</span>
                              <input type="number" min={0} step="0.01" className="w-24 bg-transparent text-[11px] font-black text-blue-600 dark:text-blue-400 outline-none text-right" value={Number((safeNumber(item.unitPrice) * safeNumber(item.quantity)).toFixed(2))} onChange={e => updateItemTotal(item.id, Math.max(0, Number(e.target.value)))} />
                            </div>
                            <div className="flex flex-col gap-0">
                              <button onClick={() => moveItem(index, 'up')} disabled={index === 0} className="text-slate-300 hover:text-blue-500 disabled:opacity-0 transition-all"><ChevronUp className="w-3 h-3" /></button>
                              <button onClick={() => moveItem(index, 'down')} disabled={index === items.length - 1} className="text-slate-300 hover:text-blue-500 disabled:opacity-0 transition-all"><ChevronDown className="w-3 h-3" /></button>
                            </div>
                            <button onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} className="text-rose-300 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
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
                  <div className="fixed inset-0 z-[60] bg-white overflow-y-auto p-6">
                    <CustomerManager customers={customers} setCustomers={setCustomers} orders={orders} defaultOpenForm={true} onSuccess={(c) => { setSelectedCustomerId(c.id); setShowFullClientForm(false); }} onCancel={() => setShowFullClientForm(false)} />
                  </div>
                )}

                {showFullServiceForm && (
                  <div className="fixed inset-0 z-[60] bg-white overflow-y-auto p-6">
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
                onPrint={handlePreviewDraft}
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
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Selecione um orçamento para copiar itens e descrição</p>
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
                .filter(o => {
                  const validStatus = o.status === OrderStatus.PENDING || o.status === OrderStatus.APPROVED;
                  if (!validStatus) return false;

                  const term = importSearch.trim().toLowerCase();
                  if (!term) return true;

                  return (
                    o.customerName.toLowerCase().includes(term) ||
                    (o.description || '').toLowerCase().includes(term) ||
                    o.id.toLowerCase().includes(term)
                  );
                })
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
                ))}

              {orders.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.APPROVED).length === 0 && (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhum orçamento disponível para importação</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {previewBudget && (
        <ReportPreview
          title={`${previewBudget.id} - ${previewBudget.description}`}
          htmlContent={generateBudgetReportHtml(
            previewBudget,
            company,
            customers.find(c => c.id === previewBudget.customerId)?.document
          )}
          filename={`${previewBudget.id} - ${previewBudget.description}`}
          onClose={() => setPreviewBudget(null)}
        />
      )}
    </div>
  );
};

const PaymentTypeModal: React.FC<{
  onClose: () => void;
  onConfirm: (text: string, percent: number) => void;
  totalValue: number;
  initialPercent?: number;
}> = ({ onClose, onConfirm, totalValue, initialPercent }) => {
  const [type, setType] = useState<'vista' | 'parcelado' | 'conclusao'>('parcelado');
  const [entryValue, setEntryValue] = useState(0);
  const [percentValue, setPercentValue] = useState(initialPercent || 30);
  const [installments, setInstallments] = useState(3);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (totalValue > 0) {
      const p = initialPercent || 30;
      setEntryValue(totalValue * (p / 100));
      setPercentValue(p);
    }
  }, [totalValue, initialPercent]);

  useEffect(() => {
    let text = '';
    const currency = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (type === 'vista') {
      text = `Pagamento à vista na aprovação do orçamento. Total: ${currency(totalValue)}.`;
    } else if (type === 'conclusao') {
      text = `Pagamento integral de ${currency(totalValue)} a ser realizado após entrega técnica e aprovação dos serviços.`;
    } else {
      const remainder = Math.max(0, totalValue - entryValue);
      const parcValue = installments > 0 ? remainder / installments : 0;

      text = `Entrada de ${currency(entryValue)} na aprovação.`;
      if (installments > 0) {
        text += `\nSaldo restante de ${currency(remainder)} dividido em ${installments}x de ${currency(parcValue)}.`;
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
              <button onClick={() => setType('vista')} className={`p-3 rounded-xl border text-xs font-bold uppercase transition-all ${type === 'vista' ? 'bg-blue-600 border-blue-600 text-white ring-2 ring-blue-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>À Vista</button>
              <button onClick={() => setType('parcelado')} className={`p-3 rounded-xl border text-xs font-bold uppercase transition-all ${type === 'parcelado' ? 'bg-blue-600 border-blue-600 text-white ring-2 ring-blue-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Parcelado</button>
              <button onClick={() => setType('conclusao')} className={`p-3 rounded-xl border text-xs font-bold uppercase transition-all ${type === 'conclusao' ? 'bg-blue-600 border-blue-600 text-white ring-2 ring-blue-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Entrega</button>
            </div>
          </div>

          {type === 'parcelado' && (
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="col-span-2">
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Valor Total</span>
                  <span className="text-[10px] font-black text-slate-900 dark:text-white whitespace-nowrap">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${totalValue > 0 ? Math.min(100, (entryValue / totalValue) * 100) : 0}%` }}></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 col-span-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Entrada (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                    value={percentValue}
                    onChange={e => {
                      const val = Math.max(0, Math.min(100, Number(e.target.value)));
                      setPercentValue(val);
                      setEntryValue(totalValue * (val / 100));
                    }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Entrada (R$)</label>
                  <input
                    type="number"
                    min={0}
                    max={totalValue}
                    step="0.01"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                    value={entryValue}
                    onChange={e => {
                      const val = Math.max(0, Math.min(totalValue, Number(e.target.value)));
                      setEntryValue(val);
                      if (totalValue > 0) setPercentValue(Number(((val / totalValue) * 100).toFixed(1)));
                    }}
                  />
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
            <div className="bg-slate-800 text-slate-200 p-4 rounded-xl text-sm font-medium leading-relaxed border border-slate-700 min-h-[80px] whitespace-pre-line">
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
