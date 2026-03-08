
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, Search, X, Trash2, Pencil, Printer, Save,
  UserPlus, Wrench, Eraser, FileText, ScrollText,
  Type, Image as ImageIcon, Zap, Upload, FileDown
} from 'lucide-react';
import RichTextEditor from './ui/RichTextEditor';
import { ServiceOrder, OrderStatus, Customer, ServiceItem, CatalogService, CompanyProfile, DescriptionBlock } from '../types';
import { useNotify } from './ToastProvider';
import CustomerManager from './CustomerManager';
import ServiceCatalog from './ServiceCatalog';
import { db } from '../services/db';
import ReportPreview from './ReportPreview';
import { buildMaintenanceOsHtml } from '../services/osPdfService';
import { compressImage } from '../services/imageUtils';
import { getContractHtml } from '../services/contractPdfService';
// DocumentPreview and ContractDocument are replaced by the unified system

interface Props {
  orders: ServiceOrder[];
  setOrders: React.Dispatch<React.SetStateAction<ServiceOrder[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  catalogServices: CatalogService[];
  setCatalogServices: React.Dispatch<React.SetStateAction<CatalogService[]>>;
  company: CompanyProfile;
}

const ServiceOrderManager: React.FC<Props> = ({ orders, setOrders, customers, setCustomers, catalogServices, company }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showFullClientForm, setShowFullClientForm] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [previewContract, setPreviewContract] = useState<ServiceOrder | null>(null);
  const [previewOS, setPreviewOS] = useState<ServiceOrder | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { notify } = useNotify();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [osTitle, setOsTitle] = useState('Execução de Serviço');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serial, setSerial] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [descriptionBlocks, setDescriptionBlocks] = useState<DescriptionBlock[]>([]);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<ServiceItem[]>([]);

  const [currentDesc, setCurrentDesc] = useState('');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [currentQty, setCurrentQty] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const activeOrders = useMemo(() => orders.filter(o => {
    if (o.osType === 'WORK') return false; // Exclude Work Orders
    if (o.status === OrderStatus.PENDING || o.status === OrderStatus.APPROVED) return false;
    return o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm);
  }), [orders, searchTerm]);

  const totalAmount = useMemo(() => items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0), [items]);

  const handleAddItem = () => {
    if (!currentDesc || currentPrice <= 0) return;
    setItems([...items, { id: Date.now().toString(), description: currentDesc, quantity: currentQty, unitPrice: currentPrice, type: 'Serviço', unit: 'un' }]);
    setCurrentDesc(''); setCurrentPrice(0); setCurrentQty(1);
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

  const handleSaveOS = async () => {
    if (isSaving) return;
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) { notify("Selecione um cliente", "error"); return; }

    const signatureData = canvasRef.current?.toDataURL();
    const existingOrder = editingOrderId ? orders.find(o => o.id === editingOrderId) : null;

    const data: ServiceOrder = {
      id: editingOrderId || db.generateId('OS'),
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      description: osTitle,
      serviceDescription: diagnosis,
      equipmentBrand: brand,
      equipmentModel: model,
      equipmentSerialNumber: serial,
      status: OrderStatus.IN_PROGRESS,
      items: items,
      totalAmount: totalAmount,
      signature: signatureData,
      descriptionBlocks,
      paymentTerms,
      deliveryTime,
      createdAt: existingOrder?.createdAt || new Date().toISOString().split('T')[0],
      dueDate: deliveryDate,
      osType: 'EQUIPMENT'
    };

    const newList = editingOrderId ? orders.map(o => o.id === editingOrderId ? data : o) : [data, ...orders];
    setOrders(newList);

    setIsSaving(true);
    try {
      const result = await db.save('serviflow_orders', newList, data);
      if (result?.success) { notify(editingOrderId ? "O.S. atualizada e sincronizada!" : "Ordem de Serviço registrada e sincronizada!"); setEditingOrderId(null); setShowForm(false); }
      else { notify("Salvo localmente. Erro ao sincronizar (veja o console)", "warning"); setEditingOrderId(null); setShowForm(false); }
    } finally { setIsSaving(false); }
  };
  // Unified OS Preview
  const handlePreviewOS = (order: ServiceOrder) => {
    setPreviewOS(order);
  };

  // NEXT_Contract
  const handlePreviewContract = (order: ServiceOrder) => {
    setPreviewContract(order);
  };

  // NEXT_InitCanvas
  const initCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let drawing = false;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;

    const start = (e: any) => {
      drawing = true;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX || e.touches[0].clientX) - rect.left;
      const y = (e.clientY || e.touches[0].clientY) - rect.top;
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e: any) => {
      if (!drawing) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX || e.touches[0].clientX) - rect.left;
      const y = (e.clientY || e.touches[0].clientY) - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stop = () => drawing = false;

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stop);
    canvas.addEventListener('touchstart', start);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stop);
  };

  useEffect(() => {
    if (showForm) {
      setTimeout(initCanvas, 500);
    }
  }, [showForm]);

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Ordens de Serviço</h2>
          <p className="text-slate-500 text-sm">Painel de execução técnica e laudos.</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingOrderId(null); setSelectedCustomerId(''); setItems([]); setOsTitle('Execução de Serviço'); setDiagnosis(''); setBrand(''); setModel(''); setSerial(''); setDescriptionBlocks([]); setPaymentTerms(''); setDeliveryTime(''); }} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700 hover:shadow-blue-900/30 transition-all flex items-center gap-2">
          <Plus className="w-5 h-5" /> Nova O.S.
        </button>
      </div>
      <div className="bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border dark:border-slate-800 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input type="text" placeholder="Buscar por cliente, equipamento ou O.S. #" className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm dark:text-slate-100 focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border dark:border-slate-800 overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 border-b dark:border-slate-800">
            <tr><th className="px-8 py-5">OS #</th><th className="px-8 py-5">CLIENTE</th><th className="px-8 py-5">EQUIPAMENTO</th><th className="px-8 py-5 text-right">AÇÕES</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {activeOrders.map(order => (
              <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 group transition-all">
                <td className="px-8 py-5 text-xs font-mono font-black text-blue-600 dark:text-blue-400">{order.id}</td>
                <td className="px-8 py-5 text-sm font-black uppercase text-slate-900 dark:text-white">{order.customerName}</td>
                <td className="px-8 py-5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">{order.equipmentBrand || 'N/A'} {order.equipmentModel}</td>
                <td className="px-8 py-5 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handlePreviewContract(order)} className="p-2 text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-white transition-colors" title="Gerar Contrato"><ScrollText className="w-4 h-4" /></button>
                  <button onClick={() => handlePreviewOS(order)} className="p-2 text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-white transition-colors" title="Visualizar/Imprimir OS"><Printer className="w-4 h-4" /></button>
                  <button onClick={() => {
                    setEditingOrderId(order.id);
                    // ... other setters ...
                    setShowForm(true);
                  }} className="p-2 text-slate-400 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={async () => {
                    // ... delete logic ...
                  }} className="p-2 text-rose-300 dark:text-rose-900/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-[1240px] h-[95vh] rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col animate-in zoom-in-95 border border-white/5 dark:border-slate-800">
            <div className="bg-white dark:bg-slate-900 px-8 py-5 border-b dark:border-slate-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 dark:bg-slate-800 p-2.5 rounded-xl text-white shadow-xl shadow-slate-200 dark:shadow-none"><Wrench className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-0.5">{editingOrderId ? `Editando O.S. ${editingOrderId}` : 'Nova Ordem de Serviço'}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md">Manutenção</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{new Date().toLocaleDateString('pt-BR')}</span>
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
                      <div className="flex justify-between items-center mb-2"><label className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest ml-1">Cliente Solicitante</label><button onClick={() => setShowFullClientForm(true)} className="text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase flex items-center gap-1 hover:underline"><UserPlus className="w-3 h-3" /> Novo</button></div>
                      <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all custom-select" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}><option value="">Selecione...</option>{customers.map(c => <option key={c.id} value={c.id} className="dark:bg-slate-900">{c.name}</option>)}</select>
                    </div>
                    <div><label className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2 block ml-1">Título da O.S.</label><input type="text" placeholder="Ex: Manutenção de Notebook" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400" value={osTitle} onChange={e => setOsTitle(e.target.value)} /></div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <h4 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b dark:border-slate-800 pb-2 mb-4">Dados do Equipamento</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div><label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">Marca/Fabricante</label><input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" value={brand} onChange={e => setBrand(e.target.value)} /></div>
                    <div><label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">Modelo</label><input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" value={model} onChange={e => setModel(e.target.value)} /></div>
                    <div><label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">Nº Série / Patrimônio</label><input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" value={serial} onChange={e => setSerial(e.target.value)} /></div>
                  </div>
                  <div><label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">Laudo Técnico / Diagnóstico</label><RichTextEditor id="diagnosis-editor" value={diagnosis} onChange={setDiagnosis} placeholder="Descreva o problema ou serviço realizado..." /></div>

                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b dark:border-slate-800 pb-2 grow mr-6">FOTOS E ANEXOS DO SERVIÇO</h4>
                    </div>
                    <div className="space-y-3">
                      {descriptionBlocks.length === 0 && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-4 group hover:border-blue-400 transition-colors cursor-pointer" onClick={addTextBlock}>
                          <div className="flex gap-4">
                            <button onClick={(e) => { e.stopPropagation(); addTextBlock(); }} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg shadow-blue-900/20 hover:scale-105 transition-all"><Type className="w-4 h-4" /> + Iniciar com Texto</button>
                            <button onClick={(e) => { e.stopPropagation(); addImageBlock(); }} className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg shadow-emerald-900/20 hover:scale-105 transition-all"><ImageIcon className="w-4 h-4" /> + Iniciar com Imagem</button>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 animate-pulse">Comece a montar o relatório fotogrÃ¡fico acima</p>
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
                                placeholder="Detalhes da foto ou texto..."
                              />
                            </div>
                          )}
                          {block.type === 'image' && (
                            <div className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center gap-2">
                              {block.content ? (
                                <div className="relative max-w-[200px]"><img src={block.content} className="w-full h-auto rounded-lg shadow-lg" /><button onClick={() => updateBlockContent(block.id, '')} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full"><Trash2 className="w-3 h-3" /></button></div>
                              ) : (
                                <label className="cursor-pointer flex flex-col items-center gap-1"><Upload className="w-5 h-5 text-blue-500" /><span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">Subir Foto</span><input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(block.id, e)} /></label>
                              )}
                            </div>
                          )}
                          <button onClick={() => setDescriptionBlocks(descriptionBlocks.filter(b => b.id !== block.id))} className="absolute -top-2 -right-2 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="flex justify-between items-center mb-4"><h4 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b dark:border-slate-800 pb-2 grow mr-4">Peças e Serviços</h4></div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                      <div className="md:col-span-6"><label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">Descrição do Item</label><input type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none" value={currentDesc} onChange={e => setCurrentDesc(e.target.value)} /></div>
                      <div className="md:col-span-2"><label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">Valor Unit.</label><input type="number" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none" value={currentPrice} onChange={e => setCurrentPrice(Number(e.target.value))} /></div>
                      <div className="md:col-span-2"><label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">Quantidade</label><input type="number" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none" value={currentQty} onChange={e => setCurrentQty(Number(e.target.value))} /></div>
                      <div className="md:col-span-2"><button onClick={handleAddItem} className="bg-blue-600 text-white w-full h-[42px] rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20"><Plus className="w-5 h-5" /></button></div>
                    </div>
                    <div className="space-y-1.5">
                      {items.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm gap-2">
                          <div className="grow">
                            <p className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase mb-1">{item.description}</p>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded px-2 py-1 border border-slate-100 dark:border-slate-800">
                                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500">QTD:</span>
                                <input type="number" className="w-12 bg-transparent text-[9px] font-black text-slate-700 dark:text-slate-300 outline-none" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} />
                              </div>
                              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded px-2 py-1 border border-slate-100 dark:border-slate-800">
                                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500">VALOR:</span>
                                <input type="number" className="w-20 bg-transparent text-[9px] font-black text-slate-700 dark:text-slate-300 outline-none" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded px-2 py-1 border border-slate-100 dark:border-slate-800">
                              <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500">TOTAL:</span>
                              <input type="number" className="w-24 bg-transparent text-[11px] font-black text-blue-600 dark:text-blue-400 outline-none text-right" value={Number((item.unitPrice * item.quantity).toFixed(2))} onChange={e => updateItemTotal(item.id, Number(e.target.value))} />
                            </div>
                            <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-slate-300 dark:text-slate-700 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {items.length > 0 && (
                      <div className="flex justify-end pt-2">
                        <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-3 flex items-center gap-4 shadow-sm">
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Subtotal dos Serviços</span>
                          <span className="text-lg font-black text-slate-900 dark:text-white whitespace-nowrap">R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {showFullClientForm && (
                  <div className="fixed inset-0 z-[60] bg-black/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border dark:border-slate-800">
                      <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center"><h3 className="font-bold dark:text-white">Novo Cliente</h3><button onClick={() => setShowFullClientForm(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"><X className="w-5 h-5" /></button></div>
                      <div className="flex-1 overflow-y-auto p-0">
                        <CustomerManager customers={customers} setCustomers={setCustomers} orders={orders} defaultOpenForm={true} onSuccess={(c) => { setSelectedCustomerId(c.id); setShowFullClientForm(false); }} onCancel={() => setShowFullClientForm(false)} />
                      </div>
                    </div>
                  </div>
                )}
                {showFullClientForm && <div className="hidden"><CustomerManager customers={customers} setCustomers={setCustomers} orders={orders} defaultOpenForm={true} onSuccess={() => { }} /></div>}
              </div>
              <div className="w-full lg:w-[380px] bg-slate-50 dark:bg-slate-900/50 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 p-8 flex flex-col shrink-0 relative overflow-hidden overflow-y-auto lg:overflow-y-hidden h-auto lg:h-full">
                <div className="mb-8 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-center relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Valor Total Estimado</p>
                  <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-1 whitespace-nowrap">R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">Peças + Mão de Obra</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm relative grow flex flex-col mb-4 min-h-[200px] lg:min-h-0">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800 flex justify-between items-center">
                    <h4 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Assinatura do Cliente</h4>
                    <button onClick={clearSignature} className="bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 p-1.5 rounded-lg transition-colors" title="Limpar"><Eraser className="w-3 h-3" /></button>
                  </div>
                  <div className="grow bg-white dark:bg-slate-950 relative cursor-crosshair h-32 lg:h-auto">
                    <canvas ref={canvasRef} width={320} height={180} className="w-full h-full touch-none" />
                    <div className="absolute bottom-2 left-0 w-full text-center pointer-events-none opacity-20"><p className="text-[8px] font-black uppercase text-slate-300 dark:text-slate-700">Área de Assinatura Digital</p></div>
                  </div>
                </div>

                <div className="space-y-3 mt-auto">
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handlePreviewOS({
                      id: editingOrderId || 'PREVIEW',
                      customerId: selectedCustomerId,
                      customerName: customers.find(c => c.id === selectedCustomerId)?.name || 'N/A',
                      customerEmail: '',
                      description: osTitle,
                      serviceDescription: diagnosis,
                      equipmentBrand: brand,
                      equipmentModel: model,
                      equipmentSerialNumber: serial,
                      status: OrderStatus.IN_PROGRESS,
                      items, totalAmount, signature: canvasRef.current?.toDataURL(), descriptionBlocks, paymentTerms, deliveryTime,
                      createdAt: new Date().toISOString(),
                      dueDate: deliveryDate || new Date().toISOString(),
                      osType: 'EQUIPMENT'
                    })} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 p-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all col-span-2"><Printer className="w-4 h-4" /> Visualizar Documento</button>
                  </div>
                  <button onClick={handleSaveOS} disabled={isSaving} className={`w-full ${isSaving ? 'bg-slate-800' : 'bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500'} text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 dark:shadow-none hover:shadow-2xl transition-all flex items-center justify-center gap-3`}>
                    <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} /> {isSaving ? 'Processando...' : 'Salvar Ordem de Serviço'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewContract && (
        <ReportPreview
          title={`Contrato - ${previewContract.id}`}
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
          filename={`Contrato-${previewContract.id}`}
          onClose={() => setPreviewContract(null)}
        />
      )}

      {previewOS && (
        <ReportPreview
          title={`Ordem de Serviço - ${previewOS.id}`}
          htmlContent={buildMaintenanceOsHtml(
            previewOS,
            customers.find(c => c.id === previewOS.customerId) || {
              name: previewOS.customerName,
              address: 'Não informado',
              document: 'N/A'
            },
            company
          )}
          filename={`OS-${previewOS.id}`}
          onClose={() => setPreviewOS(null)}
        />
      )}
    </div>
  );
};

export default ServiceOrderManager;



