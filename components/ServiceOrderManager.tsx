
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, Search, X, Trash2, Pencil, Printer, Save,
  UserPlus, Wrench, Eraser, FileText, ScrollText,
  Type, Image as ImageIcon, Zap, Upload, FileDown
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

const ServiceOrderManager: React.FC<Props> = ({ orders, setOrders, customers, setCustomers, catalogServices, company }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showFullClientForm, setShowFullClientForm] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
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
      const result = await db.save('serviflow_orders', newList);
      if (result?.success) { notify(editingOrderId ? "O.S. atualizada e sincronizada!" : "Ordem de Serviço registrada e sincronizada!"); setEditingOrderId(null); setShowForm(false); }
      else { notify("Salvo localmente. Erro ao sincronizar (veja o console)", "warning"); setEditingOrderId(null); setShowForm(false); }
    } finally { setIsSaving(false); }
  };
  // NEXT_PrintOS
  const handlePrintOS = (order: ServiceOrder, mode: 'print' | 'pdf' = 'print') => {
    const customer = customers.find(c => c.id === order.customerId) || { name: order.customerName, address: 'Não informado', document: 'N/A' };
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

    // Logic: BDI first, then Tax on (Subtotal + BDI)
    const subTotal = order.items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
    const bdiValue = order.bdiRate ? subTotal * (order.bdiRate / 100) : 0;
    const subTotalWithBDI = subTotal + bdiValue;
    const taxValue = order.taxRate ? subTotalWithBDI * (order.taxRate / 100) : 0;
    const finalTotal = subTotalWithBDI + taxValue; // Calculate proactively, though order.totalAmount might be used if trusted

    const itemsHtml = order.items.map((item: ServiceItem) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 10px; font-weight: 800; text-transform: uppercase; font-size: 10px; color: #0f172a;">${item.description}</td>
        <td style="padding: 12px 0; text-align: center; color: #94a3b8; font-size: 9px; font-weight: bold; text-transform: uppercase;">${item.unit || 'UN'}</td>
        <td style="padding: 12px 0; text-align: center; font-weight: 800; color: #0f172a; font-size: 10px;">${item.quantity}</td>
        <td style="padding: 12px 0; text-align: right; color: #64748b; font-size: 10px;">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 12px 10px; text-align: right; font-weight: 900; font-size: 11px; color: #0f172a;">R$ ${(item.unitPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      </tr>`).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ordem de Serviço - ${order.id}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap" rel="stylesheet">
        <style>
           body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
           @page { size: A4; margin: 0 !important; }
           .a4-container { width: 100%; margin: 0; background: white; padding-left: 15mm !important; padding-right: 15mm !important; }
           .avoid-break { break-inside: avoid; page-break-inside: avoid; }
           
           /* Premium Box Styles */
           .info-box { background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; }
           .info-label { font-size: 9px; font-weight: 900; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; display: block; }
           .info-value { font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; line-height: 1.4; }
           .info-sub { font-size: 10px; color: #64748b; font-weight: 600; }
           
           .section-title { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; margin-bottom: 16px; }

           @media screen { body { background: #f1f5f9; padding: 40px 0; } .a4-container { width: 210mm; margin: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border-radius: 8px; padding: 15mm !important; } }
           @media print { 
             body { background: white !important; margin: 0 !important; } 
             .a4-container { box-shadow: none !important; border: none !important; min-height: auto; position: relative; } 
             .no-screen { display: block !important; }
             .no-print { display: none !important; }
             .print-footer { position: fixed; bottom: 0; left: 0; right: 0; padding-bottom: 5mm; text-align: center; font-size: 8px; font-weight: bold; color: #94a3b8; text-transform: uppercase; }
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
               <div class="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
                   <div class="flex gap-6 items-center">
                       <div style="width: 70px; height: 70px; display: flex; align-items: center; justify-content: center;">
                           ${company.logo ? `<img src="${company.logo}" style="max-height: 100%; max-width: 100%; object-fit: contain;">` : '<div style="font-weight:900; font-size:30px; color:#2563eb;">PO</div>'}
                       </div>
                       <div>
                           <h1 class="text-2xl font-black text-slate-900 leading-none mb-1 uppercase tracking-tight">${company.name}</h1>
                           <p class="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none">Soluções em Gestão Profissional</p>
                           <p class="text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-2">${company.cnpj || ''} | ${company.phone || ''}</p>
                       </div>
                   </div>
                   <div class="text-right">
                       <div class="bg-slate-900 text-white px-3 py-1 rounded text-[8px] font-black uppercase tracking-widest mb-2 inline-block">Ordem de Serviço</div>
                       <p class="text-3xl font-black text-slate-900 tracking-tighter mb-1">${order.id}</p>
                       <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-right">ABERTURA: ${formatDate(order.createdAt)}</p>
                   </div>
               </div>

               <!-- Boxes Grid (Customer & Equipment) -->
               <div class="grid grid-cols-2 gap-6 mb-12">
                   <div class="info-box">
                       <span class="info-label">Cliente / Solicitante</span>
                       <div class="info-value">${customer.name}</div>
                       <div class="info-sub mt-1">${customer.document || 'Documento não inf.'}</div>
                   </div>
                   <div class="info-box">
                       <span class="info-label">Dados do Equipamento / Objeto</span>
                       <div class="info-value">${order.equipmentBrand || ''} ${order.equipmentModel || 'Não especificado'}</div>
                       <div class="info-sub mt-1">SÉRIE: ${order.equipmentSerialNumber || 'N/A'}</div>
                   </div>
               </div>

               <!-- Technical Report -->
               <div class="mb-12">
                   <div class="section-title">Relatório Técnico / Diagnóstico</div>
                   <div class="info-box bg-slate-50 border border-slate-100">
                       <p class="text-[10px] text-slate-600 leading-relaxed italic whitespace-pre-wrap">${order.serviceDescription || 'Nenhum laudo técnico registrado.'}</p>
                   </div>
               </div>

               ${order.descriptionBlocks && order.descriptionBlocks.length > 0 ? `
               <div class="mb-12">
                   <div class="section-title">Anexos e Fotos</div>
                   <div class="space-y-4">
                       ${order.descriptionBlocks.map(block => {
      if (block.type === 'text') {
        return `<p class="text-slate-700 leading-relaxed text-justify font-medium whitespace-pre-wrap text-[10px] mb-4">${block.content}</p>`;
      } else if (block.type === 'image') {
        return `<div style="break-inside: avoid; page-break-inside: avoid; margin: 15px 0;"><img src="${block.content}" style="width: 100%; max-height: 230mm; border-radius: 12px; object-fit: contain;"></div>`;
      } else if (block.type === 'page-break') {
        return `<div style="page-break-after: always; break-after: page; height: 0; margin: 0; padding: 0;"></div>`;
      }
      return '';
    }).join('')}
                   </div>
               </div>` : ''}

               <!-- Items Table -->
               <div class="mb-8">
                   <div class="section-title">Peças, Materiais e Serviços</div>
                   <table style="width: 100%; border-collapse: collapse;">
                       <thead>
                           <tr style="border-bottom: 2px solid #0f172a;">
                               <th style="padding-bottom: 12px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: left; font-weight: 900; letter-spacing: 0.05em;">Descrição</th>
                               <th style="padding-bottom: 12px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: center; font-weight: 900; letter-spacing: 0.05em;">UN</th>
                               <th style="padding-bottom: 12px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: center; font-weight: 900; letter-spacing: 0.05em;">Qtd</th>
                               <th style="padding-bottom: 12px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right; font-weight: 900; letter-spacing: 0.05em;">Unitário</th>
                               <th style="padding-bottom: 12px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right; font-weight: 900; letter-spacing: 0.05em;">Total</th>
                           </tr>
                       </thead>
                       <tbody>${itemsHtml}</tbody>
                   </table>
               </div>

               <!-- Total Bar (Dark) -->
               <div class="avoid-break mb-12">
                   <!-- Breakdown ABOVE the bar (Per user request) -->
                   <div class="flex justify-end mb-2 gap-6 px-2">
                        <div class="text-right">
                           <span class="text-[8px] font-bold text-slate-400 uppercase block">Subtotal</span>
                           <span class="text-[10px] font-black text-slate-600 block">R$ ${subTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        ${order.bdiRate ? `
                        <div class="text-right">
                           <span class="text-[8px] font-bold text-slate-400 uppercase block">BDI (${order.bdiRate}%)</span>
                           <span class="text-[10px] font-black text-emerald-600 block">+ R$ ${bdiValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>` : ''}
                        ${order.taxRate ? `
                        <div class="text-right">
                           <span class="text-[8px] font-bold text-slate-400 uppercase block">Impostos (${order.taxRate}%)</span>
                           <span class="text-[10px] font-black text-blue-600 block">+ R$ ${taxValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>` : ''}
                   </div>
                   <div class="bg-slate-900 text-white p-6 rounded-xl flex justify-between items-center shadow-xl">
                       <span class="text-[12px] font-black uppercase tracking-widest">Valor Total:</span>
                       <span class="text-3xl font-black text-white tracking-tighter text-right">R$ ${finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                   </div>
               </div>

               <!-- Legal / Guarantee -->
               <div class="avoid-break mb-12">
                   <div class="border-l-4 border-blue-600 bg-blue-50/40 p-6 rounded-xl">
                       <h5 class="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2">Garantia e Notas Legais</h5>
                       <p class="text-[9px] text-slate-700 leading-tight mb-2"><b>• GARANTIA TÉCNICA:</b> 90 dias para os serviços executados (Art. 26 CDC).</p>
                       <p class="text-[9px] text-rose-600 font-bold uppercase leading-tight"><b>• ATENÇÃO:</b> Equipamentos não retirados em até 30 dias após aviso de conclusão estarão sujeitos a taxas de armazenamento ou descarte legal.</p>
                   </div>
               </div>

               <!-- Signatures -->
               <div class="avoid-break mt-auto pt-8">
                   <div class="grid grid-cols-2 gap-16 px-10">
                       <div class="text-center">
                           <div style="border-top: 1px solid #cbd5e1; margin-bottom: 8px;"></div>
                           <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsável Técnico</p>
                           <p class="text-[10px] font-black uppercase text-slate-900">${company.name}</p>
                       </div>
                       <div class="text-center relative">
                           ${order.signature ? `<img src="${order.signature}" style="max-height: 50px; position: absolute; top: -45px; left: 50%; transform: translateX(-50%);">` : ''}
                           <div style="border-top: 1px solid #cbd5e1; margin-bottom: 8px;"></div>
                           <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Assinatura do Cliente</p>
                           <p class="text-[10px] font-black uppercase text-slate-900">${order.customerName}</p>
                       </div>
                   </div>
               </div>
            </div>
          </td></tr></tbody>
          <tfoot><tr><td style="height: ${company.printMarginBottom || 15}mm;"><div style="height: ${company.printMarginBottom || 15}mm; display: block;">&nbsp;</div></td></tr></tfoot>
        </table>
        <div class="print-footer no-screen"><span>Página 1 de 1</span></div>
        <script>
           window.onload = function() { setTimeout(() => { window.print(); window.close(); }, 800); }
        </script>
      </body>
      </html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // NEXT_Contract
  const handlePrintContract = (order: ServiceOrder) => {
    const customer = customers.find(c => c.id === order.customerId) || { name: order.customerName, document: 'N/A', address: 'Endereço não informado', city: '', state: '', cep: '' };
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Contrato - ${order.id}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; counter-reset: page 1; }
        @page { size: A4; margin: 0 !important; }
        .a4-container { width: 100%; margin: 0; background: white; padding-left: 15mm !important; padding-right: 15mm !important; }
        .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        @media screen { body { background: #f1f5f9; padding: 40px 0; } .a4-container { width: 210mm; margin: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border-radius: 8px; padding: 15mm !important; } }
        @media print { body { background: white !important; margin: 0 !important; } .a4-container { box-shadow: none !important; border: none !important; min-height: auto; position: relative; } .no-print { display: none !important; } * { box-shadow: none !important; } .print-footer { position: fixed; bottom: 0; left: 0; right: 0; height: 15mm; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: #94a3b8; text-transform: uppercase; background: white; } .print-footer::after { content: "Página " counter(page); } .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; display: table !important; width: 100% !important; } }
      </style>
    </head>
    <body class="no-scrollbar">
      <table style="width: 100%;">
        <thead><tr><td style="height: ${company.printMarginTop || 15}mm;"><div style="height: ${company.printMarginTop || 15}mm; display: block;">&nbsp;</div></td></tr></thead>
        <tbody><tr><td>
          <div class="a4-container">
            <div class="flex justify-between items-start mb-8">
                <div class="flex gap-4">
                    <div class="w-16 h-16 shrink-0 flex items-center justify-center overflow-hidden">
                        ${company.logo ? `<img src="${company.logo}" style="height: 100%; object-fit: contain;">` : `<div style="width: 64px; height: 64px; background: #2563eb; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white;"><svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>`}
                    </div>
                    <div>
                        <h1 class="text-xl font-black text-slate-900 leading-none mb-1 uppercase tracking-tight">${company.name}</h1>
                        <p class="text-[9px] font-black text-blue-600 uppercase tracking-widest">${company.tagline || 'Soluções em Gestão e Manutenção Profissional'}</p>
                        <p class="text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-1">${company.cnpj || ''} | ${company.phone || ''}</p>
                    </div>
                </div>
                <div class="text-right">
                    <div class="bg-blue-600 text-white px-4 py-1 rounded text-[8px] font-black uppercase tracking-widest mb-1 inline-block">CONTRATO</div>
                    <h2 class="text-3xl font-black text-slate-900 tracking-tighter">${order.id}</h2>
                    <div class="mt-2 space-y-0.5"><p class="text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}</p></div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-8">
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-100"><h4 class="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">CONTRATADA</h4><p class="text-[10px] font-black text-slate-900 uppercase">${company.name}</p><p class="text-[9px] text-slate-500 uppercase">${company.address || ''}</p><p class="text-[9px] text-slate-500 uppercase">${company.email || ''}</p></div>
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-100"><h4 class="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">CONTRATANTE</h4><p class="text-[10px] font-black text-slate-900 uppercase">${customer.name}</p><p class="text-[9px] text-slate-500 uppercase">DOC: ${customer.document || 'N/A'}</p><p class="text-[9px] text-slate-500 uppercase">${customer.address || ''}, ${customer.number || ''} - ${customer.city || ''}</p></div>
            </div>

            <div class="mb-6"><h4 class="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-2 border-b pb-1">1. OBJETO DO CONTRATO</h4><p class="text-[10px] text-slate-600 leading-relaxed text-justify">O presente contrato tem por objeto a prestação dos serviços técnicos descritos abaixo, a serem realizados pela CONTRATADA à CONTRATANTE:</p><div class="bg-blue-50/50 p-4 rounded-lg border-l-4 border-blue-500 mt-2"><p class="text-[10px] font-bold text-blue-900 uppercase">${order.description}</p><p class="text-[9px] text-blue-700 mt-1">${order.items.map(i => `${i.quantity}x ${i.description}`).join(', ')}</p></div></div>
            
            <div class="mb-6"><h4 class="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-2 border-b pb-1">2. VALORES E PAGAMENTO</h4><p class="text-[10px] text-slate-600 leading-relaxed text-justify">Pelos serviços contratados, a CONTRATANTE pagará o valor total de <b class="text-slate-900">R$ ${order.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>. Condições: ${order.paymentTerms || 'Conforme combinado'}.</p></div>

            <div class="mb-6"><h4 class="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-2 border-b pb-1">3. PRAZOS E GARANTIA</h4><p class="text-[10px] text-slate-600 leading-relaxed text-justify">O prazo estimado é de <b>${order.deliveryTime || 'A combinar'}</b>. A garantia dos serviços é de 90 dias (Art. 26 CDC).</p></div>
            
            <div class="mb-6"><h4 class="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-2 border-b pb-1">4. DIREITOS E OBRIGAÇÕES</h4><p class="text-[10px] text-slate-600 leading-relaxed text-justify">4.1. A CONTRATADA compromete-se a executar os serviços com qualidade técnica, utilizando mão-de-obra qualificada.<br>4.2. A garantia dos serviços prestados é de 90 (noventa) dias, conforme Art. 26 do Código de Defesa do Consumidor.<br>4.3. A CONTRATANTE deve fornecer as condições necessárias (acesso, energia, etc.) para a execução dos trabalhos.</p></div>

            <div class="mb-6"><h4 class="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-2 border-b pb-1">5. FORO</h4><p class="text-[10px] text-slate-600 leading-relaxed text-justify">Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer dúvidas oriundas deste contrato.</p></div>

            <div class="avoid-break mt-12 mb-8">
              <div class="grid grid-cols-2 gap-16 px-10">
                <div class="text-center border-t border-slate-300 pt-3"><p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">CONTRATADA</p><p class="text-[10px] font-black uppercase text-slate-900">${company.name}</p></div>
                <div class="text-center border-t border-slate-300 pt-3 relative"><p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">CONTRATANTE</p><p class="text-[10px] font-black uppercase text-slate-900">${customer.name}</p></div>
              </div>
            </div>
          </div>
        </td></tr></tbody>
        <tfoot><tr><td style="height: ${company.printMarginBottom || 15}mm;"><div style="height: ${company.printMarginBottom || 15}mm; display: block;">&nbsp;</div></td></tr></tfoot>
      </table>
      <div class="print-footer no-screen"><span>Documento gerado em ${new Date().toLocaleString('pt-BR')} -&nbsp;</span></div>
      <script>
         window.onload = function() { setTimeout(() => { window.print(); window.close(); }, 800); }
      </script>
    </body>
    </html>`;
    printWindow.document.write(html);
    printWindow.document.close();
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
        <button onClick={() => { setShowForm(true); setEditingOrderId(null); setSelectedCustomerId(''); setItems([]); setOsTitle('Execução de Serviço'); setDiagnosis(''); setBrand(''); setModel(''); setSerial(''); setDescriptionBlocks([]); setPaymentTerms(''); setDeliveryTime(''); }} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
          <Plus className="w-5 h-5" /> Nova O.S.
        </button>
      </div>
      <div className="bg-white p-4 rounded-[1.5rem] border shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Buscar por cliente, equipamento ou O.S. #" className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border overflow-hidden shadow-sm overflow-x-auto">
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
                  <button onClick={() => handlePrintContract(order)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="Gerar Contrato"><ScrollText className="w-4 h-4" /></button>
                  <button onClick={() => handlePrintOS(order)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><Printer className="w-4 h-4" /></button>
                  <button onClick={() => {
                    setEditingOrderId(order.id);
                    setSelectedCustomerId(order.customerId);
                    setItems(order.items);
                    setOsTitle(order.description);
                    setDiagnosis(order.serviceDescription || '');
                    setBrand(order.equipmentBrand || '');
                    setModel(order.equipmentModel || '');
                    setSerial(order.equipmentSerialNumber || '');
                    setDeliveryDate(order.dueDate);
                    setDescriptionBlocks(order.descriptionBlocks || []);
                    setPaymentTerms(order.paymentTerms || '');
                    setDeliveryTime(order.deliveryTime || '');
                    setShowForm(true);
                  }} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={async () => {
                    if (confirm("Excluir esta O.S.? Esta ação também removerá os dados da nuvem.")) {
                      const idToDelete = order.id;
                      setOrders(p => p.filter(x => x.id !== idToDelete));
                      const result = await db.remove('orders', idToDelete);
                      if (result?.success) {
                        notify("O.S. removida da nuvem com sucesso.");
                      } else {
                        notify("Removido localmente, mas houve um erro ao sincronizar com a nuvem.", "error");
                      }
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
            <div className="bg-white px-8 py-5 border-b flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 p-2.5 rounded-xl text-white shadow-xl shadow-slate-200"><Wrench className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-0.5">{editingOrderId ? `Editando O.S. ${editingOrderId}` : 'Nova Ordem de Serviço'}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">Manutenção</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{new Date().toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#f8fafc] no-scrollbar">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-2"><label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">Cliente Solicitante</label><button onClick={() => setShowFullClientForm(true)} className="text-blue-600 text-[9px] font-black uppercase flex items-center gap-1 hover:underline"><UserPlus className="w-3 h-3" /> Novo</button></div>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all custom-select" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}><option value="">Selecione...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                    </div>
                    <div><label className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2 block ml-1">Título da O.S.</label><input type="text" placeholder="Ex: Manutenção de Notebook" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400" value={osTitle} onChange={e => setOsTitle(e.target.value)} /></div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-4">Dados do Equipamento</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Marca/Fabricante</label><input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" value={brand} onChange={e => setBrand(e.target.value)} /></div>
                    <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Modelo</label><input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" value={model} onChange={e => setModel(e.target.value)} /></div>
                    <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Nº Série / Patrimônio</label><input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" value={serial} onChange={e => setSerial(e.target.value)} /></div>
                  </div>
                  <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Laudo Técnico / Diagnóstico</label><textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-700 outline-none h-24 focus:ring-2 focus:ring-blue-500 shadow-inner" placeholder="Descreva o problema ou serviço realizado..." value={diagnosis} onChange={e => setDiagnosis(e.target.value)} /></div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 mt-6">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 grow mr-6">FOTOS E ANEXOS DO SERVIÇO</h4>
                      <div className="flex gap-2">
                        <button onClick={addTextBlock} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 hover:bg-blue-100"><Type className="w-3.5 h-3.5" /> + TEXTO</button>
                        <button onClick={addImageBlock} className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 hover:bg-emerald-100"><ImageIcon className="w-3.5 h-3.5" /> + IMAGEM</button>
                        <button onClick={addPageBreak} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 hover:bg-slate-200"><Zap className="w-3.5 h-3.5" /> + QUEBRA</button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {descriptionBlocks.map((block) => (
                        <div key={block.id} className="relative group">
                          {block.type === 'text' ? (
                            <textarea className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-[11px] font-medium outline-none h-24 focus:ring-2 focus:ring-blue-500 shadow-inner" value={block.content} onChange={e => updateBlockContent(block.id, e.target.value)} placeholder="Detalhes da foto ou texto..." />
                          ) : block.type === 'image' ? (
                            <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2">
                              {block.content ? (
                                <div className="relative max-w-[200px]"><img src={block.content} className="w-full h-auto rounded-lg shadow-lg" /><button onClick={() => updateBlockContent(block.id, '')} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full"><Trash2 className="w-3 h-3" /></button></div>
                              ) : (
                                <label className="cursor-pointer flex flex-col items-center gap-1"><Upload className="w-5 h-5 text-blue-500" /><span className="text-[8px] font-black text-slate-400 uppercase">Subir Foto</span><input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(block.id, e)} /></label>
                              )}
                            </div>
                          ) : (
                            <div className="w-full bg-slate-100 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="bg-slate-900 p-2 rounded-lg text-white"><Zap className="w-3 h-3" /></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quebra de Página Forçada</span>
                              </div>
                              <button onClick={() => setDescriptionBlocks(descriptionBlocks.filter(b => b.id !== block.id))} className="text-rose-300 hover:text-rose-600 p-1"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                          {block.type !== 'page-break' && (
                            <button onClick={() => setDescriptionBlocks(descriptionBlocks.filter(b => b.id !== block.id))} className="absolute -top-2 -right-2 bg-slate-200 text-slate-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-4"><h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 grow mr-4">Peças e Serviços</h4></div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                      <div className="md:col-span-6"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Descrição do Item</label><input type="text" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none" value={currentDesc} onChange={e => setCurrentDesc(e.target.value)} /></div>
                      <div className="md:col-span-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Valor Unit.</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none" value={currentPrice} onChange={e => setCurrentPrice(Number(e.target.value))} /></div>
                      <div className="md:col-span-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Quantidade</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none" value={currentQty} onChange={e => setCurrentQty(Number(e.target.value))} /></div>
                      <div className="md:col-span-2"><button onClick={handleAddItem} className="bg-blue-600 text-white w-full h-[42px] rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"><Plus className="w-5 h-5" /></button></div>
                    </div>
                    <div className="space-y-1.5">
                      {items.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 shadow-sm gap-2">
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
                            <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {items.length > 0 && (
                      <div className="flex justify-end pt-2">
                        <div className="bg-white border-2 border-slate-100 rounded-2xl px-6 py-3 flex items-center gap-4 shadow-sm">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal dos Serviços</span>
                          <span className="text-lg font-black text-slate-900">R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {showFullClientForm && (
                  <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                      <div className="p-4 border-b flex justify-between items-center"><h3 className="font-bold">Novo Cliente</h3><button onClick={() => setShowFullClientForm(false)}><X className="w-5 h-5" /></button></div>
                      <div className="flex-1 overflow-y-auto p-0">
                        <CustomerManager customers={customers} setCustomers={setCustomers} orders={orders} defaultOpenForm={true} onSuccess={(c) => { setSelectedCustomerId(c.id); setShowFullClientForm(false); }} onCancel={() => setShowFullClientForm(false)} />
                      </div>
                    </div>
                  </div>
                )}
                {showFullClientForm && <div className="hidden"><CustomerManager customers={customers} setCustomers={setCustomers} orders={orders} defaultOpenForm={true} onSuccess={() => { }} /></div>}
              </div>
              <div className="w-full lg:w-[380px] bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 p-8 flex flex-col shrink-0 relative overflow-hidden overflow-y-auto lg:overflow-y-hidden h-auto lg:h-full">
                <div className="mb-8 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm text-center relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor Total Estimado</p>
                  <div className="text-4xl font-black text-slate-900 tracking-tighter mb-1">R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Peças + Mão de Obra</p>
                </div>

                <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm relative grow flex flex-col mb-4 min-h-[200px] lg:min-h-0">
                  <div className="p-3 bg-slate-50 border-b flex justify-between items-center">
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Assinatura do Cliente</h4>
                    <button onClick={clearSignature} className="bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-600 p-1.5 rounded-lg transition-colors" title="Limpar"><Eraser className="w-3 h-3" /></button>
                  </div>
                  <div className="grow bg-white relative cursor-crosshair h-32 lg:h-auto">
                    <canvas ref={canvasRef} width={320} height={180} className="w-full h-full touch-none" />
                    <div className="absolute bottom-2 left-0 w-full text-center pointer-events-none opacity-20"><p className="text-[8px] font-black uppercase text-slate-300">Área de Assinatura Digital</p></div>
                  </div>
                </div>

                <div className="space-y-3 mt-auto">
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handlePrintOS({
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
                      dueDate: deliveryDate || new Date().toISOString()
                    })} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 p-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all"><Printer className="w-4 h-4" /> Imprimir</button>
                    <button onClick={() => handlePrintOS({
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
                      dueDate: deliveryDate || new Date().toISOString()
                    }, 'pdf')} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 p-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all"><FileText className="w-4 h-4" /> PDF</button>
                  </div>
                  <button onClick={handleSaveOS} disabled={isSaving} className={`w-full ${isSaving ? 'bg-slate-800 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'} text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 hover:shadow-2xl transition-all flex items-center justify-center gap-3`}>
                    <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} /> {isSaving ? 'Processando...' : 'Salvar Ordem de Serviço'}
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

export default ServiceOrderManager;
