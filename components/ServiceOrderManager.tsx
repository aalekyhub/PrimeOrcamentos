
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, Search, X, Trash2, Pencil, Printer, Save,
  UserPlus, Wrench, Calendar, Gavel, Package, Eraser
} from 'lucide-react';
import { ServiceOrder, OrderStatus, Customer, ServiceItem, CatalogService, CompanyProfile } from '../types';
import { useNotify } from './ToastProvider';
import CustomerManager from './CustomerManager';
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

const ServiceOrderManager: React.FC<Props> = ({ orders, setOrders, customers, setCustomers, catalogServices, company }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showFullClientForm, setShowFullClientForm] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const { notify } = useNotify();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [osTitle, setOsTitle] = useState('Execução de Serviço');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serial, setSerial] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<ServiceItem[]>([]);

  const [currentDesc, setCurrentDesc] = useState('');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [currentQty, setCurrentQty] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const activeOrders = useMemo(() => orders.filter(o => {
    if (o.status === OrderStatus.PENDING) return false;
    return o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm);
  }), [orders, searchTerm]);

  const totalAmount = useMemo(() => items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0), [items]);

  const handleAddItem = () => {
    if (!currentDesc || currentPrice <= 0) return;
    setItems([...items, { id: Date.now().toString(), description: currentDesc, quantity: currentQty, unitPrice: currentPrice, type: 'Serviço', unit: 'un' }]);
    setCurrentDesc(''); setCurrentPrice(0); setCurrentQty(1);
    notify("Item adicionado");
  };

  const handleSaveOS = () => {
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) { notify("Selecione um cliente", "error"); return; }

    const signatureData = canvasRef.current?.toDataURL();

    const existingOrder = editingOrderId ? orders.find(o => o.id === editingOrderId) : null;

    const data: ServiceOrder = {
      id: editingOrderId || `OS-${Math.floor(1000 + Math.random() * 9000)}`,
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
      createdAt: existingOrder?.createdAt || new Date().toISOString().split('T')[0],
      dueDate: deliveryDate
    };

    if (editingOrderId) {
      setOrders(prev => prev.map(o => o.id === editingOrderId ? data : o));
    } else {
      setOrders(prev => [data, ...prev]);
    }
    setShowForm(false);
    notify("O.S. salva com sucesso!");
  };

  const handlePrintOS = (order: ServiceOrder) => {
    const customer = customers.find(c => c.id === order.customerId) || { name: order.customerName, address: 'Não informado', document: 'N/A' };
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = order.items.map((item: any) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 8px 0; font-weight: 800; text-transform: uppercase; font-size: 11px; color: #1e293b;">${item.description}</td>
        <td style="padding: 8px 0; text-align: center; color: #94a3b8; font-size: 10px;">${item.unit || 'un'}</td>
        <td style="padding: 8px 0; text-align: center; font-weight: 800; font-size: 11px;">${item.quantity}</td>
        <td style="padding: 8px 0; text-align: right; color: #64748b; font-size: 11px;">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 900; font-size: 12px; color: #1e293b;">R$ ${(item.unitPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      </tr>`).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>O.S. ${order.id}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
          @page { size: A4; margin: 15mm; }
          .a4-container { width: 100%; margin: 0; background: white; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
          
          @media screen {
            body { background: #f1f5f9; padding: 40px 0; }
            .a4-container { width: 210mm; margin: auto; padding: 15mm; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border-radius: 8px; }
          }
          
          @media print {
            body { background: white !important; }
            .a4-container { box-shadow: none !important; border: none !important; padding: 0 !important; }
            .no-print { display: none !important; }
            * { box-shadow: none !important; }
          }
        </style>
      </head>
      <body class="no-scrollbar">
        <div class="a4-container">
          <!-- TOP DIVIDER -->
          <div class="border-b-2 border-slate-900 mb-8"></div>

          <!-- HEADER -->
          <div class="flex justify-between items-start mb-8">
            <div class="flex gap-4">
              <div class="w-16 h-16 shrink-0 flex items-center justify-center overflow-hidden">
                ${company.logo ? `<img src="${company.logo}" style="height: 100%; object-fit: contain;">` : `
                  <div style="width: 64px; height: 64px; background: #2563eb; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white;">
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
              <div class="bg-slate-900 text-white px-4 py-1 rounded text-[8px] font-black uppercase tracking-widest mb-1 inline-block">ORDEM DE SERVIÇO</div>
              <h2 class="text-3xl font-black text-slate-900 tracking-tighter">${order.id}</h2>
              <div class="mt-2 space-y-0.5">
                <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">
                  ABERTURA: ${(() => {
        try {
          const d = new Date(order.createdAt);
          return isNaN(d.getTime()) ? new Date().toLocaleDateString('pt-BR') : d.toLocaleDateString('pt-BR');
        } catch {
          return new Date().toLocaleDateString('pt-BR');
        }
      })()}
                </p>
              </div>
            </div>
          </div>
          <div class="border-t-[2px] border-slate-900 mb-4"></div>
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h4 class="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">CLIENTE / DESTINATÁRIO</h4>
              <p class="text-[11px] font-black text-slate-900 uppercase">${order.customerName}</p>
            </div>
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h4 class="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">DADOS DO EQUIPAMENTO</h4>
              <p class="text-[10px] font-black text-slate-900 uppercase">${order.equipmentBrand || 'N/A'} ${order.equipmentModel || ''}</p>
              <p class="text-[8px] font-bold text-slate-400 uppercase">SÉRIE: ${order.equipmentSerialNumber || 'N/A'}</p>
            </div>
          </div>
          <div class="mb-6">
            <h4 class="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-2 border-b pb-1">RELATÓRIO TÉCNICO / DIAGNÓSTICO</h4>
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[80px]">
              <p class="text-[10px] text-slate-600 leading-relaxed italic">${order.serviceDescription || 'Nenhum laudo informado.'}</p>
            </div>
          </div>
          <div class="mb-6">
            <h4 class="text-[9px] font-black text-slate-900 uppercase tracking-widest border-b pb-1 mb-2">PEÇAS, MATERIAIS E MÃO DE OBRA</h4>
            <table class="w-full text-left">
              <thead>
                <tr class="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  <th class="py-2">DESCRIÇÃO</th><th class="py-2 text-center">UN</th><th class="py-2 text-center">QTD</th><th class="py-2 text-right">UNITÁRIO</th><th class="py-2 text-right">SUBTOTAL</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
          </div>
          <div class="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center mb-6">
            <span class="text-[9px] font-black uppercase tracking-widest">VALOR TOTAL DA ORDEM</span>
            <span class="text-2xl font-black text-blue-400 tracking-tighter text-right">R$ ${order.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div class="border-l-4 border-blue-600 bg-blue-50/40 p-6 rounded-xl mb-12">
            <h5 class="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2">NOTAS LEGAIS E GARANTIA (CDC / PROCON)</h5>
            <p class="text-[9px] text-slate-700 leading-tight"><b>• GARANTIA:</b> Conforme Art. 26 do CDC, este serviço possui garantia técnica de 90 dias.</p>
            <p class="text-[9px] text-rose-600 font-bold mt-1 uppercase leading-tight"><b>• ADVERTÊNCIA:</b> Equipamentos não retirados em até 30 dias serão considerados abandonados.</p>
          </div>
          <!-- SIGNATURE AND FOOTER -->
          <div class="mt-8">
            <!-- SIGNATURE -->
            <div class="grid grid-cols-2 gap-16 px-10 mb-8 avoid-break">
              <div class="text-center border-t border-slate-300 pt-3">
                <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsável Técnico</p>
                <p class="text-[10px] font-black uppercase text-slate-900">${company.name}</p>
              </div>
              <div class="text-center border-t border-slate-300 pt-3 relative">
                 ${order.signature ? `<img src="${order.signature}" style="max-height: 50px; position: absolute; top: -45px; left: 50%; transform: translateX(-50%);">` : ''}
                 <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Assinatura do Cliente</p>
                 <p class="text-[10px] font-black uppercase text-slate-900">${order.customerName}</p>
              </div>
            </div>

            <!-- FOOTER -->
            <div class="flex justify-between items-end border-t-4 border-slate-900 pt-4 avoid-break">
              <div>
                <p class="text-xs font-black text-slate-900 uppercase leading-none">${company.name}</p>
              </div>
              <p class="text-[8px] font-bold text-slate-300 uppercase italic text-right">Documento técnico gerado eletronicamente</p>
            </div>
          </div>
        </div>
        <script>window.onload=()=>{setTimeout(()=>{window.print();window.close();},500);}</script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

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
        <button onClick={() => { setShowForm(true); setEditingOrderId(null); setSelectedCustomerId(''); setItems([]); setOsTitle('Execução de Serviço'); setDiagnosis(''); setBrand(''); setModel(''); setSerial(''); }} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
          <Plus className="w-5 h-5" /> Nova O.S.
        </button>
      </div>

      <div className="bg-white p-4 rounded-[1.5rem] border shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Buscar por cliente, equipamento ou O.S. #" className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
            <tr><th className="px-8 py-5">OS #</th><th className="px-8 py-5">CLIENTE</th><th className="px-8 py-5">EQUIPAMENTO</th><th className="px-8 py-5 text-right">AÇÕES</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activeOrders.map(order => (
              <tr key={order.id} className="hover:bg-slate-50 group transition-all">
                <td className="px-8 py-5 text-xs font-mono font-black text-blue-600">{order.id}</td>
                <td className="px-8 py-5 text-sm font-black uppercase text-slate-900">{order.customerName}</td>
                <td className="px-8 py-5 text-xs font-bold text-slate-400 uppercase">{order.equipmentBrand || 'N/A'} {order.equipmentModel}</td>
                <td className="px-8 py-5 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handlePrintOS(order)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><Printer className="w-4 h-4" /></button>
                  <button onClick={() => { setEditingOrderId(order.id); setSelectedCustomerId(order.customerId); setItems(order.items); setOsTitle(order.description); setDiagnosis(order.serviceDescription || ''); setBrand(order.equipmentBrand || ''); setModel(order.equipmentModel || ''); setSerial(order.equipmentSerialNumber || ''); setDeliveryDate(order.dueDate); setShowForm(true); }} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => {
                    if (confirm("Excluir esta O.S.? Esta ação também removerá os dados da nuvem.")) {
                      setOrders(p => p.filter(x => x.id !== order.id));
                      db.remove('orders', order.id);
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
          <div className="bg-slate-50 w-full max-w-[1240px] h-[95vh] rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col animate-in zoom-in-95">

            {/* CABEÇALHO DA MODAL - COMPACTO */}
            <div className="px-8 py-4 bg-white border-b flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-xl shadow-blue-100">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-none mb-0.5">OS #{editingOrderId || 'NOVA'}</h3>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">Relatório Técnico Profissional</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-300" />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* COLUNA DO FORMULÁRIO (ESQUERDA) - ESPAÇAMENTO REDUZIDO */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">

                {/* DADOS INICIAIS */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dados Iniciais</h4>
                    <button onClick={() => setShowFullClientForm(true)} className="text-blue-600 text-[9px] font-black uppercase flex items-center gap-1 hover:underline tracking-widest"><UserPlus className="w-3 h-3" /> NOVO CLIENTE</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Selecionar Cliente</label>
                      <select className="w-full bg-slate-50 border-none rounded-xl p-3.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                        <option value="">Escolha um cliente...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Título do Serviço</label>
                      <input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500" value={osTitle} onChange={e => setOsTitle(e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* EQUIPAMENTO */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Informações do Equipamento</h4>
                  <div className="grid grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Marca</label><input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500" value={brand} onChange={e => setBrand(e.target.value)} /></div>
                    <div><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Modelo</label><input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500" value={model} onChange={e => setModel(e.target.value)} /></div>
                    <div><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Nº Série</label><input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500" value={serial} onChange={e => setSerial(e.target.value)} /></div>
                  </div>
                </div>

                {/* DIAGNÓSTICO */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Diagnóstico Técnico</h4>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <textarea className="w-full bg-slate-50 border-none rounded-xl p-4 text-xs font-medium h-32 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Descreva o laudo técnico detalhado..." />
                  </div>
                </div>

                {/* SERVIÇOS E PEÇAS */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Serviços e Peças</h4>
                    <button className="text-blue-600 text-[9px] font-black uppercase flex items-center gap-1 hover:underline tracking-widest"><Package className="w-3 h-3" /> CATÁLOGO</button>
                  </div>
                  <div className="bg-white p-6 rounded-[1.8rem] border border-slate-100 shadow-sm space-y-5">
                    <div className="space-y-2">
                      <label className="text-[8px] font-black text-blue-600 uppercase tracking-widest ml-1">Puxar do Catálogo</label>
                      <select className="w-full bg-slate-50 border-none rounded-xl p-3 text-[10px] font-bold text-slate-500 outline-none" onChange={e => { const s = catalogServices.find(x => x.id === e.target.value); if (s) { setCurrentDesc(s.name); setCurrentPrice(s.basePrice); } }}>
                        <option value="">Selecione para preencher automaticamente...</option>
                        {catalogServices.map(s => <option key={s.id} value={s.id}>{s.name} (R$ {s.basePrice.toLocaleString()})</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      <div className="md:col-span-6">
                        <label className="text-[8px] font-black text-slate-400 uppercase mb-2 block ml-1">Descrição</label>
                        <input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold outline-none" value={currentDesc} onChange={e => setCurrentDesc(e.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[8px] font-black text-slate-400 uppercase mb-2 block text-center">Qtd</label>
                        <input type="number" className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-black text-center outline-none" value={currentQty} onChange={e => setCurrentQty(Number(e.target.value))} />
                      </div>
                      <div className="md:col-span-3">
                        <label className="text-[8px] font-black text-slate-400 uppercase mb-2 block ml-1">Preço (R$)</label>
                        <input type="number" className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-black outline-none" value={currentPrice} onChange={e => setCurrentPrice(Number(e.target.value))} />
                      </div>
                      <div className="md:col-span-1">
                        <button onClick={handleAddItem} className="bg-blue-600 text-white w-full h-[46px] rounded-xl flex items-center justify-center hover:scale-105 transition-all shadow-xl shadow-blue-100"><Plus className="w-5 h-5" /></button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                      {items.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100 group">
                          <div>
                            <p className="text-[11px] font-black text-slate-900 uppercase">{item.description}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{item.quantity} {item.unit} X R$ {item.unitPrice.toLocaleString('pt-BR')}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-black text-slate-900 tracking-tighter">R$ {(item.unitPrice * item.quantity).toLocaleString('pt-BR')}</span>
                            <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="p-1.5 text-rose-300 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
              </div>

              {/* COLUNA RESUMO (DIREITA) - COMPACTO */}
              <div className="w-[360px] bg-[#0f172a] text-white p-8 flex flex-col space-y-6 shrink-0 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none rotate-12"><Wrench className="w-56 h-56" /></div>

                <div className="relative z-10 space-y-6">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Resumo Financeiro</h4>
                  <div className="space-y-1 border-b border-slate-800 pb-6">
                    <p className="text-xs font-bold text-slate-400">Total O.S.</p>
                    <p className="text-[36px] font-black text-blue-400 tracking-tighter leading-none">R$ {totalAmount.toLocaleString('pt-BR')}</p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block">Entrega</label>
                    <div className="relative">
                      <Calendar className="absolute right-4 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
                      <input type="date" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 shadow-inner" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
                    </div>
                  </div>

                  <div className="bg-blue-900/20 border border-blue-500/20 p-5 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-blue-400">
                      <Gavel className="w-4 h-4" />
                      <span className="text-[9px] font-black uppercase tracking-[0.1em]">Normas</span>
                    </div>
                    <ul className="space-y-2 text-[9px] text-blue-300/80 leading-tight font-black uppercase italic">
                      <li>• GARANTIA 90 DIAS.</li>
                      <li className="text-rose-400/80">• PRAZO 30 DIAS.</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-auto space-y-4 relative z-10">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Assinatura</h4>
                      <button onClick={clearSignature} className="text-slate-500 hover:text-white transition-colors"><Eraser className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="bg-slate-50 rounded-xl h-28 overflow-hidden relative border border-slate-800/20">
                      <canvas ref={canvasRef} width={300} height={112} className="w-full h-full cursor-crosshair" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button onClick={handleSaveOS} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-[0_15px_30px_rgba(37,99,235,0.25)] hover:bg-blue-500 transition-all flex items-center justify-center gap-3 active:scale-95 group">
                      <Save className="w-5 h-5 group-hover:scale-110 transition-transform" /> SALVAR
                    </button>
                    <button onClick={() => {
                      const orderData = {
                        id: editingOrderId || 'ORC-TEMP',
                        customerName: customers.find(c => c.id === selectedCustomerId)?.name || 'N/A',
                        customerId: selectedCustomerId,
                        items, totalAmount, equipmentBrand: brand, equipmentModel: model, equipmentSerialNumber: serial,
                        serviceDescription: diagnosis, createdAt: new Date().toISOString()
                      } as ServiceOrder;
                      handlePrintOS(orderData);
                    }} className="w-full bg-slate-800 hover:bg-slate-700 py-3.5 rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-2.5 transition-all border border-slate-700 active:scale-95 group">
                      <Printer className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" /> IMPRIMIR
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

export default ServiceOrderManager;
