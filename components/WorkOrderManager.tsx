// html2pdf is no longer used
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Plus, Search, X, Trash2, Printer, Save, FileDown,
    UserPlus, HardHat, Eraser, FileText, ScrollText, Wallet,
    Type, Image as ImageIcon, Zap, Upload, CheckCircle
} from 'lucide-react';
import { ServiceOrder, OrderStatus, Customer, ServiceItem, CatalogService, CompanyProfile, DescriptionBlock, Transaction } from '../types';
import { useNotify } from './ToastProvider';
import CustomerManager from './CustomerManager';
import { db } from '../services/db';
import { formatDocument } from '../services/validation';
import { financeUtils } from '../services/financeUtils';
import InfoCard from './ui/InfoCard';
import RichTextEditor from './ui/RichTextEditor';
import { usePrintOS } from '../hooks/usePrintOS';
import { compressImage } from '../services/imageUtils';
import ReportPreview from './ReportPreview';
import { getContractHtml } from '../services/contractPdfService';
import { buildOsHtml } from '../services/osPdfService';
// DocumentPreview, ContractDocument are replaced by the unified system

interface Props {
    orders: ServiceOrder[];
    setOrders: React.Dispatch<React.SetStateAction<ServiceOrder[]>>;
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    catalogServices: CatalogService[];
    setCatalogServices: React.Dispatch<React.SetStateAction<CatalogService[]>>;
    company: CompanyProfile;
    transactions: Transaction[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

const WorkOrderManager: React.FC<Props> = ({ orders, setOrders, customers, setCustomers, company, transactions, setTransactions }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showFullClientForm, setShowFullClientForm] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const [previewContract, setPreviewContract] = useState<ServiceOrder | null>(null);
    const [previewOS, setPreviewOS] = useState<ServiceOrder | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { notify } = useNotify();
    const { getOSHtml } = usePrintOS(customers, company);

    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [osTitle, setOsTitle] = useState('Execução de Obra');
    const [diagnosis, setDiagnosis] = useState(''); // description of work
    const [descriptionBlocks, setDescriptionBlocks] = useState<DescriptionBlock[]>([]);
    const [paymentTerms, setPaymentTerms] = useState('');
    const [deliveryTime, setDeliveryTime] = useState('');
    const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
    const [contractPrice, setContractPrice] = useState<number>(0);
    const [items, setItems] = useState<ServiceItem[]>([]);

    const [currentDesc, setCurrentDesc] = useState('');
    const [currentPrice, setCurrentPrice] = useState(0);
    const [currentQty, setCurrentQty] = useState(1);
    const [currentUnit, setCurrentUnit] = useState('un');
    const [activeEditField, setActiveEditField] = useState<string | null>(null);

    // Current Item Real Fields (Medição)
    const [currentActualQty, setCurrentActualQty] = useState<number>(0);
    const [currentActualPrice, setCurrentActualPrice] = useState<number>(0);
    const [currentActual, setCurrentActual] = useState<number | ''>('');


    // Filter for WORK orders
    const activeOrders = useMemo(() => orders.filter(o => {
        if (o.osType !== 'WORK') return false; // Only Work Orders
        if (o.status === OrderStatus.PENDING || o.status === OrderStatus.APPROVED) return false;
        return o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm);
    }), [orders, searchTerm]);

    const subtotal = useMemo(() => financeUtils.calculateSubtotal(items), [items]);

    const addTextBlock = () => setDescriptionBlocks([...descriptionBlocks, { id: Date.now().toString(), type: 'text', content: '' }]);
    const addImageBlock = () => setDescriptionBlocks([...descriptionBlocks, { id: Date.now().toString(), type: 'image', content: '' }]);
    const addPageBreak = () => setDescriptionBlocks([...descriptionBlocks, { id: Date.now().toString(), type: 'page-break', content: 'QUEBRA DE PÁGINA' }]);
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

    const handleAddItem = () => {
        if (!currentDesc) return;
        setItems([...items, {
            id: Date.now().toString(),
            description: currentDesc,
            quantity: currentQty || 1,
            unitPrice: currentPrice || 0,
            type: 'Serviço',
            unit: currentUnit || 'un',
            actualValue: (currentActual === '' ? 0 : currentActual) || ((currentActualQty || 0) * (currentActualPrice || 0)),
            actualQuantity: currentActualQty || 0,
            actualUnitPrice: currentActualPrice || 0
        }]);
        setCurrentDesc(''); setCurrentPrice(0); setCurrentQty(1); setCurrentUnit('un'); setCurrentActual('');
        setCurrentActualQty(0); setCurrentActualPrice(0);
        notify("Item adicionado");
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

    const handleSaveOS = async () => {
        if (isSaving) return;
        const customer = customers.find(c => c.id === selectedCustomerId);
        if (!customer) { notify("Selecione um cliente", "error"); return; }

        const existingOrder = editingOrderId ? orders.find(o => o.id === editingOrderId) : null;

        const data: ServiceOrder = {
            id: editingOrderId || db.generateId('OS'),
            customerId: customer.id,
            customerName: customer.name,
            customerEmail: customer.email,
            description: osTitle,
            serviceDescription: diagnosis,
            status: OrderStatus.IN_PROGRESS,
            items: existingOrder?.items || items, // Preserve original budget items
            costItems: items, // Save current list as Planned Costs
            descriptionBlocks,
            paymentTerms,
            deliveryTime,
            createdAt: existingOrder?.createdAt || new Date().toISOString().split('T')[0],
            dueDate: deliveryDate,
            osType: 'WORK',
            contractPrice: contractPrice,
            totalAmount: contractPrice // Use contract price as total amount
        };

        const newList = editingOrderId ? orders.map(o => o.id === editingOrderId ? data : o) : [data, ...orders];
        setOrders(newList);

        setIsSaving(true);
        try {
            const result = await db.save('serviflow_orders', newList, data);
            if (result?.success) { notify(editingOrderId ? "OS de Obra atualizada!" : "OS de Obra registrada!"); setEditingOrderId(null); setShowForm(false); }
            else { notify("Salvo localmente. Erro ao sincronizar.", "warning"); setEditingOrderId(null); setShowForm(false); }
        } finally { setIsSaving(false); }
    };

    const waitImages = async (root: HTMLElement) => {
        const imgs = Array.from(root.querySelectorAll("img"));
        await Promise.all(
            imgs.map(async (img) => {
                try {
                    // força CORS quando possível
                    img.crossOrigin = "anonymous";
                    if (img.complete) return;
                    await new Promise<void>((res) => {
                        img.onload = () => res();
                        img.onerror = () => res(); // não trava o PDF por imagem quebrada
                    });
                } catch {
                    /* ignore */
                }
            })
        );
    };

    const handlePreviewContract = (order: ServiceOrder) => {
        setPreviewContract(order);
    };

    const handlePreviewOS = (order: ServiceOrder) => {
        setPreviewOS(order);
    };


    useEffect(() => { /* Signature Removed */ }, [showForm]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">OS de Obra</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Gestão de reformas e construções.</p>
                </div>
                <button onClick={() => {
                    setShowForm(true);
                    setEditingOrderId(null);
                    setSelectedCustomerId('');
                    setItems([]);
                    setOsTitle('Reforma / Obra');
                    setDiagnosis('');
                    setDescriptionBlocks([]);
                    setPaymentTerms('');
                    setDeliveryTime('');
                    setContractPrice(0);
                }} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-2xl shadow-blue-900/20 hover:bg-blue-700 transition-all flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Nova Obra
                </button>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Buscar por cliente ou obra..." className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase text-slate-400 border-b dark:border-slate-800">
                        <tr><th className="px-8 py-5">OS #</th><th className="px-8 py-5">CLIENTE</th><th className="px-8 py-5">OBRA / DESCRIÇÃO</th><th className="px-8 py-5 text-right">AÇÕES</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {activeOrders.map(order => (
                            <tr key={order.id} onClick={() => {
                                setEditingOrderId(order.id);
                                setSelectedCustomerId(order.customerId);
                                setItems(order.costItems || []);
                                setOsTitle(order.description);
                                setDiagnosis(order.serviceDescription || '');
                                setDeliveryDate(order.dueDate);
                                setDescriptionBlocks(order.descriptionBlocks || []);
                                setPaymentTerms(order.paymentTerms || '');
                                setDeliveryTime(order.deliveryTime || '');
                                const calculatedTotal = order.items?.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0) || 0;
                                const finalPrice = order.contractPrice || order.totalAmount || calculatedTotal || 0;
                                setContractPrice(Math.round(finalPrice * 100) / 100);
                                setShowForm(true);
                            }} className="hover:bg-blue-50/60 dark:hover:bg-slate-800/50 group transition-all cursor-pointer">
                                <td className="px-8 py-5 text-xs font-mono font-black text-blue-600 dark:text-blue-400">{order.id}</td>
                                <td className="px-8 py-5 text-sm font-black uppercase text-slate-900 dark:text-white">{order.customerName}</td>
                                <td className="px-8 py-5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">{order.description || 'N/A'} - {order.serviceDescription || ''}</td>
                                <td className="px-8 py-5 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); handlePreviewOS(order); }} className="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="Imprimir OS"><Printer className="w-4 h-4" /></button>
                                    <button onClick={async (e) => {
                                        e.stopPropagation();
                                        if (confirm("Excluir esta OS de Obra?")) {
                                            const idToDelete = order.id;
                                            setOrders(p => p.filter(x => x.id !== idToDelete));
                                            await db.remove('serviflow_orders', idToDelete);
                                            notify("OS removida.");
                                        }
                                    }} className="p-2 text-rose-300 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-[1240px] h-[95vh] rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
                        <div className="bg-white dark:bg-slate-900 px-8 py-5 border-b dark:border-slate-800 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-900 dark:bg-slate-800 p-2.5 rounded-xl text-white shadow-xl shadow-slate-200 dark:shadow-none"><HardHat className="w-5 h-5" /></div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-0.5">{editingOrderId ? `Editando Obra ${editingOrderId}` : 'Nova OS de Obra'}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md">Construção Civil</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setShowForm(false)} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400 dark:text-slate-500" /></button>
                        </div>

                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#f8fafc] dark:bg-slate-950 no-scrollbar">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest ml-1">Cliente</label>
                                                <button onClick={() => setShowFullClientForm(true)} className="text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase flex items-center gap-1 hover:underline"><UserPlus className="w-3 h-3" /> Novo</button>
                                            </div>
                                            <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all custom-select" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                                                <option value="">Selecione...</option>
                                                {customers.map(c => <option key={c.id} value={c.id} className="dark:bg-slate-900">{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2 block ml-1">Título da Obra</label>
                                            <input type="text" placeholder="Ex: Reforma da Cozinha" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500" value={osTitle} onChange={e => setOsTitle(e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">Observações Técnicas e Escopo Detalhado</label>
                                    <RichTextEditor value={diagnosis} onChange={setDiagnosis} placeholder="Descreva os serviços a serem executados por extenso..." />
                                </div>

                                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                                    <div className="flex justify-between items-center mb-4"><h4 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b dark:border-slate-800 pb-2 grow mr-4">Peças e Serviços</h4></div>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-[1fr_110px_80px_56px] gap-2 items-end">
                                            <div className="min-w-0">
                                                <label className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase mb-1.5 h-4 flex items-center ml-1">Descrição do Item</label>
                                                <textarea
                                                    placeholder="Descreva o item ou serviço..."
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none resize-none h-[58px]"
                                                    value={currentDesc}
                                                    onChange={e => setCurrentDesc(e.target.value)}
                                                />
                                            </div>
                                            <div className="text-center">
                                                <label className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase mb-1.5 h-4 flex items-center justify-center">Valor Unit.</label>
                                                <input type="number" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 h-[58px] text-xs font-black text-center outline-none text-slate-900 dark:text-slate-100" value={currentPrice} onChange={e => setCurrentPrice(Number(e.target.value))} />
                                            </div>
                                            <div className="text-center">
                                                <label className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase mb-1.5 h-4 flex items-center justify-center">Quantidade</label>
                                                <input type="number" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 h-[58px] text-xs font-black text-center outline-none text-slate-900 dark:text-slate-100" value={currentQty} onChange={e => setCurrentQty(Number(e.target.value))} />
                                            </div>
                                            <div>
                                                <button onClick={handleAddItem} className="bg-blue-600 text-white w-full h-[58px] rounded-xl flex items-center justify-center hover:bg-blue-700 hover:scale-105 transition-all shadow-lg shadow-blue-900/20"><Plus className="w-5 h-5" /></button>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            {items.map(item => (
                                                <div key={item.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm gap-2">
                                                    <div className="grow flex flex-col gap-1.5">
                                                        <textarea
                                                            className="w-full bg-transparent text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase outline-none focus:bg-slate-50 dark:focus:bg-slate-800/50 rounded p-1 -ml-1 transition-all resize-none break-words leading-tight"
                                                            value={item.description}
                                                            onChange={e => updateItem(item.id, 'description', e.target.value)}
                                                            rows={Math.max(1, Math.min(4, Math.ceil(item.description.length / 50)))}
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded px-2.5 h-[30px] border border-slate-100 dark:border-slate-800">
                                                                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500">QTD:</span>
                                                                <input type="number" className="w-12 bg-transparent text-[9px] font-black text-slate-700 dark:text-slate-300 outline-none" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} />
                                                            </div>
                                                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded px-2.5 h-[30px] border border-slate-100 dark:border-slate-800">
                                                                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500">VALOR:</span>
                                                                <input type="number" className="w-20 bg-transparent text-[9px] font-black text-slate-700 dark:text-slate-300 outline-none" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} />
                                                            </div>
                                                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded px-2.5 h-[30px] border border-slate-100 dark:border-slate-800 ml-auto group-hover:border-blue-200 transition-colors">
                                                                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500">TOTAL:</span>
                                                                <input type="number" className="w-24 bg-transparent text-[11px] font-black text-blue-600 dark:text-blue-400 outline-none text-right" value={Number((item.unitPrice * item.quantity).toFixed(2))} onChange={e => updateItemTotal(item.id, Number(e.target.value))} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-slate-300 dark:text-slate-700 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b dark:border-slate-800 pb-2 grow mr-6">FOTOS E ANEXOS DA OBRA</h4>
                                    </div>
                                    {descriptionBlocks.length === 0 && (
                                        <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-4 group hover:border-blue-400 transition-colors cursor-pointer" onClick={addTextBlock}>
                                            <div className="flex gap-4">
                                                <button onClick={(e) => { e.stopPropagation(); addTextBlock(); }} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg shadow-blue-900/20 hover:scale-105 transition-all"><Type className="w-4 h-4" /> + Texto</button>
                                                <button onClick={(e) => { e.stopPropagation(); addImageBlock(); }} className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg shadow-emerald-900/20 hover:scale-105 transition-all"><ImageIcon className="w-4 h-4" /> + Imagem</button>
                                            </div>
                                        </div>
                                    )}
                                    {descriptionBlocks.map((block) => (
                                        <div key={block.id} className="relative group p-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            {block.type === 'text' && (
                                                <RichTextEditor
                                                    id={block.id}
                                                    value={block.content}
                                                    onChange={(content) => updateBlockContent(block.id, content)}
                                                    onAddText={addTextBlock}
                                                    onAddImage={addImageBlock}
                                                    placeholder="Detalhes da foto ou texto..."
                                                />
                                            )}
                                            {block.type === 'image' && (
                                                <div className="w-full flex flex-col items-center justify-center gap-2">
                                                    {block.content ? (
                                                        <div className="relative max-w-[400px]">
                                                            <img src={block.content} className="w-full h-auto rounded-lg shadow-lg" />
                                                            <button onClick={() => updateBlockContent(block.id, '')} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-lg"><Trash2 className="w-3 h-3" /></button>
                                                        </div>
                                                    ) : (
                                                        <label className="cursor-pointer flex flex-col items-center gap-1 p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl w-full">
                                                            <Upload className="w-8 h-8 text-blue-500" />
                                                            <span className="text-[10px] font-black text-slate-400 uppercase">Subir Foto</span>
                                                            <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(block.id, e)} />
                                                        </label>
                                                    )}
                                                </div>
                                            )}
                                            <button onClick={() => setDescriptionBlocks(descriptionBlocks.filter(b => b.id !== block.id))} className="absolute -top-2 -right-2 bg-white dark:bg-slate-700 text-rose-500 p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="w-full lg:w-[380px] bg-slate-50 dark:bg-slate-950 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 p-8 flex flex-col shrink-0 relative overflow-hidden h-auto lg:h-full">
                                <div className="mb-6 p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm text-center relative overflow-hidden">
                                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Valor Total Fechado</p>
                                    <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-1 whitespace-nowrap">R$ {contractPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                    <p className="text-[8px] text-slate-400">Total Receita do Contrato</p>
                                </div>

                                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 mb-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase">Total de Itens</span>
                                        <span className="text-sm font-black text-slate-900 dark:text-white">{items.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Subtotal de Custos</span>
                                        <span className="text-lg font-black text-slate-900 dark:text-white">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    <button onClick={handleSaveOS} disabled={isSaving} className={`w-full ${isSaving ? 'bg-slate-800 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700'} text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 dark:shadow-none hover:shadow-2xl transition-all flex items-center justify-center gap-3`}>
                                        <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''} `} />
                                        {isSaving ? 'Processando...' : 'Salvar Obra'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showFullClientForm && (
                <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800">
                        <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-slate-900 dark:text-white">Novo Cliente</h3>
                            <button onClick={() => setShowFullClientForm(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400 dark:text-slate-500" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-0 no-scrollbar">
                            <CustomerManager
                                customers={customers}
                                setCustomers={setCustomers}
                                orders={orders}
                                defaultOpenForm={true}
                                onSuccess={(c) => { setSelectedCustomerId(c.id); setShowFullClientForm(false); }}
                                onCancel={() => setShowFullClientForm(false)}
                            />
                        </div>
                    </div>
                </div>
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

            {previewOS && (
                <ReportPreview
                    title={`${previewOS.id} - OS DE OBRA - ${previewOS.description}`}
                    htmlContent={buildOsHtml(
                        previewOS,
                        customers.find(c => c.id === previewOS.customerId) || {
                            name: previewOS.customerName,
                            address: 'Não informado',
                            document: 'N/A'
                        },
                        company
                    )}
                    filename={`${previewOS.id} - OS DE OBRA - ${previewOS.description}`}
                    onClose={() => setPreviewOS(null)}
                />
            )}
        </div>
    );
};

export default WorkOrderManager;