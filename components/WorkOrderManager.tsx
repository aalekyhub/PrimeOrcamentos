
// @ts-ignore
import html2pdf from 'html2pdf.js';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Plus, Search, X, Trash2, Pencil, Printer, Save, FileDown,
    UserPlus, HardHat, Eraser, FileText, ScrollText, Wallet,
    Type, Image as ImageIcon, Zap, Upload, CheckCircle
} from 'lucide-react';
import { ServiceOrder, OrderStatus, Customer, ServiceItem, CatalogService, CompanyProfile, DescriptionBlock, Transaction } from '../types';
import { useNotify } from './ToastProvider';
import CustomerManager from './CustomerManager';
import { db } from '../services/db';
import { formatDocument } from '../services/validation';
import { compressImage } from '../services/imageUtils';

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
    const [isSaving, setIsSaving] = useState(false);
    const { notify } = useNotify();

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
    const [currentActual, setCurrentActual] = useState<number | ''>('');

    // Financial State
    const [activeTab, setActiveTab] = useState<'details' | 'financial'>('details');
    const [taxRate, setTaxRate] = useState<number>(0);
    const [bdiRate, setBdiRate] = useState<number>(0);

    // Current Item Real Fields (Medição)
    const [currentActualQty, setCurrentActualQty] = useState<number>(0);
    const [currentActualPrice, setCurrentActualPrice] = useState<number>(0);

    // Report State
    const [showReportTypeModal, setShowReportTypeModal] = useState(false);
    const [selectedOrderForReport, setSelectedOrderForReport] = useState<ServiceOrder | null>(null);


    const totalExpenses = useMemo(() => items.reduce((acc, i) => acc + (i.actualQuantity ? (i.actualQuantity * (i.actualUnitPrice || 0)) : (i.actualValue || 0)), 0), [items]);
    const expensesByCategory = useMemo(() => {
        const groups: { [key: string]: number } = {};
        items.forEach(i => {
            const val = i.actualQuantity ? (i.actualQuantity * (i.actualUnitPrice || 0)) : (i.actualValue || 0);
            if (val && val > 0) {
                const cat = (i.type || 'Geral').toUpperCase();
                groups[cat] = (groups[cat] || 0) + val;
            }
        });
        return groups;
    }, [items]);

    const plannedCost = useMemo(() => {
        return items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
    }, [items]);

    const revenue = contractPrice || 0;

    const plannedProfit = useMemo(() => revenue - plannedCost, [revenue, plannedCost]);
    const actualProfit = useMemo(() => revenue - totalExpenses, [revenue, totalExpenses]);
    const executionVariance = useMemo(() => plannedCost - totalExpenses, [plannedCost, totalExpenses]);


    // Filter for WORK orders
    const activeOrders = useMemo(() => orders.filter(o => {
        if (o.osType !== 'WORK') return false; // Only Work Orders
        if (o.status === OrderStatus.PENDING || o.status === OrderStatus.APPROVED) return false;
        return o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm);
    }), [orders, searchTerm]);

    const subtotal = useMemo(() => items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0), [items]);

    const addTextBlock = () => setDescriptionBlocks([...descriptionBlocks, { id: Date.now().toString(), type: 'text', content: '' }]);
    const addImageBlock = () => setDescriptionBlocks([...descriptionBlocks, { id: Date.now().toString(), type: 'image', content: '' }]);
    const addPageBreak = () => setDescriptionBlocks([...descriptionBlocks, { id: Date.now().toString(), type: 'page-break', content: 'QUEBRA DE PÃGINA' }]);
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
            unit: 'un',
            actualValue: (currentActual === '' ? 0 : currentActual) || ((currentActualQty || 0) * (currentActualPrice || 0)),
            actualQuantity: currentActualQty || 0,
            actualUnitPrice: currentActualPrice || 0
        }]);
        setCurrentDesc(''); setCurrentPrice(0); setCurrentQty(1); setCurrentActual('');
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
            totalAmount: revenue,
            descriptionBlocks,
            paymentTerms,
            deliveryTime,
            createdAt: existingOrder?.createdAt || new Date().toISOString().split('T')[0],
            dueDate: deliveryDate,
            taxRate: taxRate,
            bdiRate: bdiRate,
            osType: 'WORK',
            contractPrice: contractPrice
        };

        const newList = editingOrderId ? orders.map(o => o.id === editingOrderId ? data : o) : [data, ...orders];
        setOrders(newList);

        setIsSaving(true);
        try {
            const result = await db.save('serviflow_orders', newList);
            if (result?.success) { notify(editingOrderId ? "OS de Obra atualizada!" : "OS de Obra registrada!"); setEditingOrderId(null); setShowForm(false); }
            else { notify("Salvo localmente. Erro ao sincronizar.", "warning"); setEditingOrderId(null); setShowForm(false); }
        } finally { setIsSaving(false); }
    };

    const handlePrintOS = (order: ServiceOrder, mode: 'print' | 'pdf' = 'print') => {
        // Reuse logic from ServiceOrderManager but customized for Work
        // For brevity, using simplified print logic here, ideally this should be a shared utility or duplicated fully if needed.
        // I will implement a robust version similar to ServiceOrderManager but without equipment fields.

        const customer = customers.find(c => c.id === order.customerId) || { name: order.customerName, address: 'Não informado', document: 'N/A' };
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const formatDate = (dateStr: string) => {
            try { const d = new Date(dateStr); return isNaN(d.getTime()) ? new Date().toLocaleDateString('pt-BR') : d.toLocaleDateString('pt-BR'); }
            catch { return new Date().toLocaleDateString('pt-BR'); }
        };

        const subTotal = order.items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
        const bdiValue = order.bdiRate ? subTotal * (order.bdiRate / 100) : 0;
        const subTotalWithBDI = subTotal + bdiValue;
        const taxValue = order.taxRate ? subTotalWithBDI * (order.taxRate / 100) : 0;
        const plannedCost = subTotalWithBDI + taxValue; // Planned Expenses
        const finalTotal = order.contractPrice && order.contractPrice > 0 ? order.contractPrice : plannedCost; // Use Contract Price if available

        const itemsHtml = order.items.map((item: ServiceItem) => {
            const actualTotal = (item.actualQuantity || 0) * (item.actualUnitPrice || 0);
            const plannedTotal = item.quantity * item.unitPrice;
            const diff = actualTotal - plannedTotal;
            const diffColor = diff > 0 ? '#e11d48' : diff < 0 ? '#059669' : '#64748b';

            return `
        <td style="padding: 12px 10px; text-align: left; vertical-align: top;">
            <div style="font-weight: 800; text-transform: uppercase; font-size: 10px; color: #0f172a; line-height: 1.2;">${item.description}</div>
            <div style="font-size: 7.5px; color: #94a3b8; font-weight: 700; margin-top: 3px; letter-spacing: 0.05em;">${item.type || 'GERAL'}</div>
        </td>
        <td style="padding: 12px 0; text-align: center; vertical-align: top; color: #64748b; font-size: 9px; font-weight: 700; text-transform: uppercase;">${item.unit || 'UN'}</td>
        <td style="padding: 12px 0; text-align: center; vertical-align: top;">
            <div style="font-weight: 700; color: #94a3b8; font-size: 7.5px; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.05em;">Est: ${item.quantity}</div>
            <div style="font-weight: 800; color: #0f172a; font-size: 9.5px;">REAL: ${item.actualQuantity || 0}</div>
        </td>
        <td style="padding: 12px 0; text-align: right; vertical-align: top;">
            <div style="color: #94a3b8; font-size: 7.5px; margin-bottom: 2px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Est: R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div style="color: #0f172a; font-size: 9.5px; font-weight: 800;">REAL: R$ ${(item.actualUnitPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </td>
        <td style="padding: 12px 10px; text-align: right; vertical-align: top;">
            <div style="font-weight: 700; font-size: 7.5px; color: #94a3b8; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.05em;">Est: R$ ${plannedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div style="font-weight: 900; font-size: 11px; color: #0f172a;">REAL: R$ ${actualTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            ${diff !== 0 ? `<div style="font-size: 8.5px; font-weight: 900; color: ${diffColor}; margin-top: 3px; font-variant-numeric: tabular-nums;">${diff > 0 ? '+' : ''} R$ ${diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>` : ''}
        </td>
      </tr>`;
        }).join('');

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>OS - ${order.id.replace('OS-', '')} - ${order.description || 'Obra'}</title>
         <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
           * { box-sizing: border-box; }
           body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
           @page { size: A4; margin: 0 !important; }
           .a4-container { width: 100%; margin: 0; background: white; padding-left: 15mm !important; padding-right: 15mm !important; }
           .avoid-break { break-inside: avoid; page-break-inside: avoid; }
           .info-box { background: #f8fafc; border-radius: 12px; padding: 22px; border: 1px solid #e2e8f0; }
           .info-label { font-size: 10px; font-weight: 800; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; display: block; }
           .info-value { font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; line-height: 1.4; }
           .info-sub { font-size: 11px; color: #64748b; font-weight: 600; }
           .section-title { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; margin-bottom: 16px; }
           @media screen { body { background: #f1f5f9; padding: 40px 0; } .a4-container { width: 210mm; margin: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border-radius: 8px; padding: 15mm !important; } }
           @media print { 
             body { background: white !important; margin: 0 !important; } 
             .a4-container { box-shadow: none !important; border: none !important; min-height: auto; position: relative; width: 100% !important; padding-left: 20mm !important; padding-right: 20mm !important; } 
             .no-screen { display: block !important; } 
             .no-print { display: none !important; } 
             .print-footer { display: none !important; } 
             .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; display: table !important; width: 100% !important; } 
           }
        </style>
      </head>
      <body class="no-scrollbar">
        <table style="width: 100%;">
          <thead><tr><td style="height: ${company.printMarginTop || 15}mm;"><div style="height: ${company.printMarginTop || 15}mm; display: block;">&nbsp;</div></td></tr></thead>
          <tbody><tr><td>
            <div class="a4-container">
               <div class="flex justify-between items-start mb-12 border-b-[3px] border-slate-900 pb-8">
                   <div class="flex gap-6 items-center">
                       <div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
                           ${company.logo ? `<img src="${company.logo}" style="max-height: 100%; max-width: 100%; object-fit: contain;">` : '<div style="font-weight:900; font-size:32px; color:#2563eb;">PO</div>'}
                       </div>
                       <div>
                           <h1 class="text-3xl font-black text-slate-900 leading-none mb-2 uppercase tracking-tight">${company.name}</h1>
                           <p class="text-[11px] font-extrabold text-blue-600 uppercase tracking-widest leading-none mb-2">Ordem de Serviço de Obra / Reforma</p>
                           <p class="text-[9px] text-slate-400 font-bold uppercase tracking-tight">${company.cnpj || ''} | ${company.phone || ''}</p>
                       </div>
                   </div>
                   <div class="text-right">
                       <div class="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest mb-2 shadow-md inline-block">ORDEM DE SERVIÇO</div>
                       <p class="text-2xl font-black text-[#0f172a] tracking-tighter mb-1 whitespace-nowrap">${order.id}</p>
                       <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">ABERTURA: ${formatDate(order.createdAt)}</p>
                   </div>
               </div>

               <div class="grid grid-cols-2 gap-6 mb-12">
                   <div class="info-box">
                       <span class="info-label">Cliente / Solicitante</span>
                       <div class="info-value">${customer.name}</div>
                       <div class="info-sub mt-1">${customer.document || 'Documento não inf.'}</div>
                   </div>
                   <div class="info-box">
                       <span class="info-label">Detalhes da Obra</span>
                       <div class="info-value">${order.description}</div>
                       <div class="info-sub mt-1">Previsão: ${order.deliveryTime || order.dueDate ? formatDate(order.dueDate) : 'A combinar'}</div>
                   </div>
               </div>

                <div class="mb-12">
                    <div class="section-title">Escopo dos Serviços</div>
                    <div class="info-box bg-slate-50 border border-slate-100">
                        <p class="text-[14px] text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">${order.serviceDescription || 'Nenhuma observação técnica registrada.'}</p>
                    </div>
                </div>

               ${order.descriptionBlocks && order.descriptionBlocks.length > 0 ? `
               <div class="mb-12">
                   <div class="section-title">Anexos e Fotos</div>
                   <div class="space-y-4">
                       ${order.descriptionBlocks.map(block => {
            if (block.type === 'text') {
                return `<p class="text-slate-800 leading-relaxed text-justify font-medium whitespace-pre-wrap text-[14px] mb-4">${block.content}</p>`;
            } else if (block.type === 'image') {
                return `<div style="break-inside: avoid; page-break-inside: avoid; margin: 15px 0;"><img src="${block.content}" style="width: 100%; max-height: 230mm; border-radius: 12px; object-fit: contain;"></div>`;
            } else if (block.type === 'page-break') {
                return `<div style="page-break-after: always; break-after: page; height: 0; margin: 0; padding: 0;"></div>`;
            }
            return '';
        }).join('')}
                   </div>
               </div>` : ''}

                <div class="mb-8">
                    <div class="section-title">Previsão de Gastos (Materiais e Mão de Obra)</div>
                    <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                        <thead>
                            <tr style="border-bottom: 2px solid #0f172a;">
                                <th style="padding-bottom: 12px; font-size: 9px; text-transform: uppercase; color: #94a3b8; text-align: left; font-weight: 800; letter-spacing: 0.1em; width: 38%;">Descrição</th>
                                <th style="padding-bottom: 12px; font-size: 9px; text-transform: uppercase; color: #94a3b8; text-align: center; font-weight: 800; letter-spacing: 0.1em; width: 7%;">UN</th>
                                <th style="padding-bottom: 12px; font-size: 9px; text-transform: uppercase; color: #94a3b8; text-align: center; font-weight: 800; letter-spacing: 0.1em; width: 15%;">Qtd</th>
                                <th style="padding-bottom: 12px; font-size: 9px; text-transform: uppercase; color: #94a3b8; text-align: right; font-weight: 800; letter-spacing: 0.1em; width: 22%;">Unitário</th>
                                <th style="padding-bottom: 12px; font-size: 9px; text-transform: uppercase; color: #94a3b8; text-align: right; font-weight: 800; letter-spacing: 0.1em; width: 18%;">Total</th>
                            </tr>
                        </thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>
                </div>
                <!-- Detalhamento de Impostos e BDI -->
                <div class="mt-8 mb-2 flex justify-end items-end gap-8 px-4 avoid-break">
                    <div style="text-align: right;">
                        <p style="font-size: 7px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.05em;">Subtotal</p>
                        <p style="font-size: 11px; font-weight: 800; color: #0f172a; margin: 0;">R$ ${subTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    ${order.bdiRate ? `
                    <div style="text-align: right;">
                        <p style="font-size: 7px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.05em;">BDI (${order.bdiRate}%)</p>
                        <p style="font-size: 11px; font-weight: 800; color: #059669; margin: 0;">+ R$ ${bdiValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>` : ''}
                    ${order.taxRate ? `
                    <div style="text-align: right;">
                        <p style="font-size: 7px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.05em;">Impostos (${order.taxRate}%)</p>
                        <p style="font-size: 11px; font-weight: 800; color: #2563eb; margin: 0;">+ R$ ${taxValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>` : ''}
                </div>

                <div class="avoid-break bg-[#0f172a] text-white p-5 rounded-xl shadow-xl relative overflow-hidden" style="display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 20px;">
                   <div class="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
                   <div style="min-width: 0;">
                       <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; line-height: 1;">
                           INVESTIMENTO TOTAL:
                       </p>
                       ${order.paymentTerms ? `<p style="font-size: 8px; font-weight: 700; color: #93c5fd; text-transform: uppercase; margin-top: 4px; line-height: 1.3; opacity: 0.9;">${order.paymentTerms}</p>` : ''}
                   </div>
                   <div style="text-align: right; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 20px;">
                       <p style="font-size: 26px; font-weight: 900; letter-spacing: -0.05em; line-height: 1; margin: 0; white-space: nowrap;">
                           R$ ${finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                       </p>
                   </div>
               </div>
                <div class="avoid-break mt-auto pt-16">
                   <div class="grid grid-cols-2 gap-16 px-10">
                       <div class="text-center">
                           <div style="border-top: 1px solid #cbd5e1; margin-bottom: 8px;"></div>
                           <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Responsável Técnico</p>
                           <p class="text-[10px] font-bold uppercase text-slate-900">${company.name}</p>
                       </div>
                        <div class="text-center relative">
                            <div style="border-top: 1px solid #cbd5e1; margin-bottom: 8px;"></div>
                            <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assinatura do Cliente</p>
                            <p class="text-[10px] font-bold uppercase text-slate-900">${order.customerName}</p>
                        </div>
                   </div>
               </div>
            </div>
          </td></tr></tbody>
          <tfoot><tr><td style="height: ${company.printMarginBottom || 15}mm;"><div style="height: ${company.printMarginBottom || 15}mm; display: block;">&nbsp;</div></td></tr></tfoot>
        </table>
        <div class="print-footer no-screen"><span>Página 1 de 1</span></div>
        <script>window.onload = function() { setTimeout(() => { window.print(); window.close(); }, 800); }</script>
      </body>
      </html>`;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handleDownloadPDF = (order: ServiceOrder) => {
        const customer = customers.find(c => c.id === order.customerId) || { name: order.customerName, document: 'N/A', address: 'Endereço não informado', city: '', state: '', cep: '' };

        const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Contrato - ${order.id}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; }
        .a4-container { width: 100%; background: white; }
        .avoid-break { break-inside: avoid; page-break-inside: avoid; }
      </style>
    </head>
    <body class="no-scrollbar">
      <div id="contract-content">
          <div class="a4-container">
               <div class="flex justify-between items-start mb-10 border-b-[3px] border-slate-900 pb-8">
                   <div class="flex gap-6 items-center">
                       <div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
                           ${company.logo ? `<img src="${company.logo}" style="max-height: 100%; max-width: 100%; object-fit: contain;">` : '<div style="font-weight:900; font-size:32px; color:#2563eb;">PO</div>'}
                       </div>
                       <div>
                           <h1 class="text-3xl font-black text-slate-900 leading-none mb-2 uppercase tracking-tight">${company.name}</h1>
                           <p class="text-[11px] font-extrabold text-blue-600 uppercase tracking-widest leading-none mb-2">Contrato de Prestação de Serviços</p>
                           <p class="text-[9px] text-slate-400 font-bold uppercase tracking-tight">${company.cnpj || ''} | ${company.phone || ''}</p>
                       </div>
                   </div>
                   <div class="text-right">
                       <div class="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest mb-2 shadow-md inline-block">CONTRATO</div>
                       <p class="text-4xl font-black text-[#0f172a] tracking-tighter mb-1 whitespace-nowrap">${order.id}</p>
                       <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}</p>
                   </div>
               </div>

            <div class="grid grid-cols-2 gap-4 mb-8">
              <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100"><h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CONTRATADA</h4><p class="text-base font-black text-slate-900 uppercase">${company.name}</p><p class="text-xs font-bold text-slate-500 uppercase mt-1">${company.address || ''}</p><p class="text-xs font-bold text-slate-500 uppercase">${company.email || ''}</p></div>
              <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100"><h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CONTRATANTE</h4><p class="text-base font-black text-slate-900 uppercase">${customer.name}</p><p class="text-xs font-bold text-slate-500 uppercase mt-1">${(customer.document || '').replace(/\D/g, '').length <= 11 ? 'CPF' : 'CNPJ'}: ${formatDocument(customer.document || '') || 'N/A'}</p><p class="text-xs font-bold text-slate-500 uppercase">${customer.address || ''}, ${customer.number || ''} - ${customer.city || ''}</p></div>
            </div>



            <div className="mb-10">
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">As partes acima identificadas resolvem firmar o presente Contrato de Prestação de Serviços por Empreitada Global, nos termos da legislação civil e previdenciária vigente, mediante as cláusulas e condições seguintes:</p>
            </div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA 1ª – DO OBJETO</h4>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">1.1. O presente contrato tem por objeto a execução de reforma em unidade residencial, situada no endereço do CONTRATANTE, compreendendo os serviços descritos abaixo, os quais serão executados por empreitada global, com responsabilidade técnica, administrativa e operacional integral da CONTRATADA.</p>
                <div class="bg-blue-50/50 p-4 rounded-xl border-l-4 border-blue-500 mt-4">
                    <p class="text-[14px] font-bold text-blue-900 uppercase tracking-wide">${order.description}</p>
                </div>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify mt-4">1.2. A execução dos serviços será realizada por obra certa, com preço previamente ajustado, não se caracterizando, em hipótese alguma, cessão ou locação de mão de obra.</p>
            </div>
            
            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA 2ª – DA FORMA DE EXECUÇÃO (EMPREITADA GLOBAL)</h4>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">2.1. A CONTRATADA executará os serviços com autonomia técnica e gerencial, utilizando meios próprios, inclusive pessoal, ferramentas, equipamentos e métodos de trabalho.</p>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify mt-2">2.2. Não haverá qualquer tipo de subordinação, exclusividade, controle de jornada ou disponibilização de trabalhadores ao CONTRATANTE.</p>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify mt-2">2.3. A CONTRATADA assume total responsabilidade pela execução da obra, respondendo integralmente pelos serviços contratados.</p>
            </div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA 3ª – DO PREÇO E DA FORMA DE PAGAMENTO</h4>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">3.1. Pelos serviços objeto deste contrato, o CONTRATANTE pagará à CONTRATADA o valor global de <b class="text-slate-900">R$ ${order.contractPrice && order.contractPrice > 0 ? order.contractPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : order.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>.</p>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify mt-2">3.2. O pagamento será efetuado da seguinte forma: <b>${order.paymentTerms || 'Conforme combinado'}</b>.</p>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify mt-2">3.3. O valor contratado corresponde ao preço fechado da obra, não estando vinculado a horas trabalhadas, número de funcionários ou fornecimento de mão de obra.</p>
            </div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA 4ª – DAS OBRIGAÇÕES DA CONTRATADA</h4>
                <ul class="list-disc pl-5 mt-3 text-[14px] text-slate-600 leading-relaxed space-y-2">
                    <li>4.1. Executar os serviços conforme o escopo contratado e normas técnicas aplicáveis.</li>
                    <li>4.2. Responsabilizar-se integralmente por seus empregados, prepostos ou subcontratados, inclusive quanto a encargos trabalhistas, previdenciários, fiscais e securitários.</li>
                    <li>4.3. Manter seus tributos, contribuições e obrigações legais em dia.</li>
                    <li>4.4. Responder por danos eventualmente causados ao imóvel durante a execução dos serviços.</li>
                </ul>
            </div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA 5ª – DAS OBRIGAÇÕES DO CONTRATANTE</h4>
                <ul class="list-disc pl-5 mt-3 text-[14px] text-slate-600 leading-relaxed space-y-2">
                    <li>5.1. Garantir o acesso da CONTRATADA ao local da obra.</li>
                    <li>5.2. Efetuar os pagamentos conforme acordado.</li>
                    <li>5.3. Fornecer, quando necessário, autorizações do condomínio para execução dos serviços.</li>
                </ul>
            </div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA 6ª – DAS RESPONSABILIDADES PREVIDENCIÁRIAS E FISCAIS</h4>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">6.1. As partes reconhecem que o presente contrato caracteriza empreitada global de obra, nos termos da legislação vigente, não se aplicando a retenção de 11% (onze por cento) de INSS, conforme disposto na Lei nº 8.212/91 e Instrução Normativa RFB nº 971/2009.</p>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify mt-2">6.2. A CONTRATADA é a única responsável pelo recolhimento de seus tributos e contribuições incidentes sobre suas atividades.</p>
            </div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA 7ª – DO PRAZO</h4>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">7.1. O prazo estimado para execução da obra é de <b>${order.deliveryTime || 'conforme demanda'}</b>, contado a partir do início efetivo dos serviços, podendo ser ajustado mediante comum acordo entre as partes.</p>
            </div>
            
            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA 8ª – DA RESPONSABILIDADE TÉCNICA</h4>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">8.1. Quando aplicável, a CONTRATADA providenciará a emissão de ART/RRT, assumindo a responsabilidade técnica pela execução dos serviços.</p>
            </div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA 9ª – DA RESCISÃO</h4>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">9.1. O presente contrato poderá ser rescindido por descumprimento de quaisquer de suas cláusulas, mediante notificação por escrito.</p>
            </div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA 10ª – DO FORO</h4>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">10.1. Fica eleito o foro da comarca de <b>${customer.city || 'São Paulo'} - ${customer.state || 'SP'}</b>, para dirimir quaisquer controvérsias oriundas deste contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.</p>
            </div>

            <div class="mb-8" style="padding-top: 30mm; padding-bottom: 20mm; page-break-inside: avoid; break-inside: avoid;">
              <div class="grid grid-cols-2 gap-16 px-10">
                <div class="text-center border-t border-slate-300 pt-3" style="page-break-inside: avoid; break-inside: avoid;"><p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">CONTRATADA</p><p class="text-sm font-bold uppercase text-slate-900">${company.name}</p></div>
                <div class="text-center border-t border-slate-300 pt-3 relative" style="page-break-inside: avoid; break-inside: avoid;"><p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">CONTRATANTE</p><p class="text-sm font-bold uppercase text-slate-900">${customer.name}</p></div>
              </div>
            </div>
          </div>
      </div>
    </body>
    </html>`;

        // PDF Generation Options
        const opt = {
            margin: 15,
            filename: `Contrato - ${order.id.replace('OS-', 'OS')} - ${order.description || 'Proposta'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 3, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        // @ts-ignore
        html2pdf().set(opt).from(html).toPdf().get('pdf').then(function (pdf: any) {
            var totalPages = pdf.internal.getNumberOfPages();
            for (var i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFontSize(10);
                pdf.setTextColor(148, 163, 184); // #94a3b8
                pdf.text('PÁGINA ' + i + ' DE ' + totalPages, pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
            }
            pdf.save(opt.filename);
        });
    };

    const handlePrintContract = (order: ServiceOrder) => {
        const customer = customers.find(c => c.id === order.customerId) || { name: order.customerName, document: 'N/A', address: 'Endereço não informado', city: '', state: '', cep: '' };
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Contrato - ${order.id.replace('OS-', 'OS')} - ${order.description || 'Proposta'}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
        @page { size: A4; margin: 0 !important; }
        .a4-container { width: 100%; margin: 0; background: white; padding-left: 15mm !important; padding-right: 15mm !important; }
        .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        @media screen { body { background: #f1f5f9; padding: 40px 0; } .a4-container { width: 210mm; margin: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border-radius: 8px; padding: 15mm !important; } }
        @media print { body { background: white !important; margin: 0 !important; } .a4-container { box-shadow: none !important; border: none !important; min-height: auto; position: relative; } .no-print { display: none !important; } * { box-shadow: none !important; } .print-footer { display: none !important; } .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; display: table !important; width: 100% !important; } }
      </style>
    </head>
    <body class="no-scrollbar">
      <table style="width: 100%;">
        <thead><tr><td style="height: ${company.printMarginTop || 15}mm;"><div style="height: ${company.printMarginTop || 15}mm; display: block;">&nbsp;</div></td></tr></thead>
        <tbody><tr><td>
          <div class="a4-container">
               <div class="flex justify-between items-start mb-10 border-b-[3px] border-slate-900 pb-8">
                   <div class="flex gap-6 items-center">
                       <div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
                           ${company.logo ? `<img src="${company.logo}" style="max-height: 100%; max-width: 100%; object-fit: contain;">` : '<div style="font-weight:900; font-size:32px; color:#2563eb;">PO</div>'}
                       </div>
                       <div>
                           <h1 class="text-3xl font-black text-slate-900 leading-none mb-2 uppercase tracking-tight">${company.name}</h1>
                           <p class="text-[11px] font-extrabold text-blue-600 uppercase tracking-widest leading-none mb-2">Contrato de Prestação de Serviços</p>
                           <p class="text-[9px] text-slate-400 font-bold uppercase tracking-tight">${company.cnpj || ''} | ${company.phone || ''}</p>
                       </div>
                   </div>
                   <div class="text-right">
                       <div class="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest mb-2 shadow-md inline-block">CONTRATO</div>
                       <p class="text-4xl font-black text-[#0f172a] tracking-tighter mb-1 whitespace-nowrap">${order.id}</p>
                       <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}</p>
                   </div>
               </div>

            <div class="grid grid-cols-2 gap-4 mb-8">
              <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100"><h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CONTRATADA</h4><p class="text-base font-black text-slate-900 uppercase">${company.name}</p><p class="text-xs font-bold text-slate-500 uppercase mt-1">${company.address || ''}</p><p class="text-xs font-bold text-slate-500 uppercase">${company.email || ''}</p></div>
              <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100"><h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CONTRATANTE</h4><p class="text-base font-black text-slate-900 uppercase">${customer.name}</p><p class="text-xs font-bold text-slate-500 uppercase mt-1">${(customer.document || '').replace(/\D/g, '').length <= 11 ? 'CPF' : 'CNPJ'}: ${formatDocument(customer.document || '') || 'N/A'}</p><p class="text-xs font-bold text-slate-500 uppercase">${customer.address || ''}, ${customer.number || ''} - ${customer.city || ''}</p></div>
            </div>

            <div className="mb-10">
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">As partes acima identificadas resolvem firmar o presente Contrato de Prestação de Serviços por Empreitada Global, nos termos da legislação civil e previdenciária vigente, mediante as cláusulas e condições seguintes:</p>
            </div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA 1ª – DO OBJETO</h4>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">1.1. O presente contrato tem por objeto a execução de reforma em unidade residencial, situada no endereço do CONTRATANTE, compreendendo os serviços descritos abaixo, os quais serão executados por empreitada global, com responsabilidade técnica, administrativa e operacional integral da CONTRATADA.</p>
                <div class="bg-blue-50/50 p-4 rounded-xl border-l-4 border-blue-500 mt-4">
                    <p class="text-[14px] font-bold text-blue-900 uppercase tracking-wide">${order.description}</p>
                </div>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify mt-4">1.2. A execução dos serviços será realizada por obra certa, com preço previamente ajustado, não se caracterizando, em hipótese alguma, cessão ou locação de mão de obra.</p>
            </div>
            
            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA 2ª – DA FORMA DE EXECUÇÃO (EMPREITADA GLOBAL)</h4>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">2.1. A CONTRATADA executará os serviços com autonomia técnica e gerencial, utilizando meios próprios, inclusive pessoal, ferramentas, equipamentos e métodos de trabalho.</p>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify mt-2">2.2. Não haverá qualquer tipo de subordinação, exclusividade, controle de jornada ou disponibilização de trabalhadores ao CONTRATANTE.</p>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify mt-2">2.3. A CONTRATADA assume total responsabilidade pela execução da obra, respondendo integralmente pelos serviços contratados.</p>
            </div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA 3ª – DO PREÇO E DA FORMA DE PAGAMENTO</h4>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">3.1. Pelos serviços objeto deste contrato, o CONTRATANTE pagará à CONTRATADA o valor global de <b class="text-slate-900">R$ ${order.contractPrice && order.contractPrice > 0 ? order.contractPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : order.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>.</p>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify mt-2">3.2. O pagamento será efetuado da seguinte forma: <b>${order.paymentTerms || 'Conforme combinado'}</b>.</p>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify mt-2">3.3. O valor contratado corresponde ao preço fechado da obra, não estando vinculado a horas trabalhadas, número de funcionários ou fornecimento de mão de obra.</p>
            </div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA 4ª – DAS OBRIGAÇÕES DA CONTRATADA</h4>
                <ul class="list-disc pl-5 mt-3 text-[14px] text-slate-600 leading-relaxed space-y-2">
                    <li>4.1. Executar os serviços conforme o escopo contratado e normas técnicas aplicáveis.</li>
                    <li>4.2. Responsabilizar-se integralmente por seus empregados, prepostos ou subcontratados, inclusive quanto a encargos trabalhistas, previdenciários, fiscais e securitários.</li>
                    <li>4.3. Manter seus tributos, contribuições e obrigações legais em dia.</li>
                    <li>4.4. Responder por danos eventualmente causados ao imóvel durante a execução dos serviços.</li>
                </ul>
            </div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA 5ª – DAS OBRIGAÇÕES DO CONTRATANTE</h4>
                <ul class="list-disc pl-5 mt-3 text-[14px] text-slate-600 leading-relaxed space-y-2">
                    <li>5.1. Garantir o acesso da CONTRATADA ao local da obra.</li>
                    <li>5.2. Efetuar os pagamentos conforme acordado.</li>
                    <li>5.3. Fornecer, quando necessário, autorizações do condomínio para execução dos serviços.</li>
                </ul>
            </div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA 6ª – DAS RESPONSABILIDADES PREVIDENCIÁRIAS E FISCAIS</h4>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">6.1. As partes reconhecem que o presente contrato caracteriza empreitada global de obra, nos termos da legislação vigente, não se aplicando a retenção de 11% (onze por cento) de INSS, conforme disposto na Lei nº 8.212/91 e Instrução Normativa RFB nº 971/2009.</p>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify mt-2">6.2. A CONTRATADA é a única responsável pelo recolhimento de seus tributos e contribuições incidentes sobre suas atividades.</p>
            </div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA 7ª – DO PRAZO</h4>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">7.1. O prazo estimado para execução da obra é de <b>${order.deliveryTime || 'conforme demanda'}</b>, contado a partir do início efetivo dos serviços, podendo ser ajustado mediante comum acordo entre as partes.</p>
            </div>
            
            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA 8ª – DA RESPONSABILIDADE TÉCNICA</h4>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">8.1. Quando aplicável, a CONTRATADA providenciará a emissão de ART/RRT, assumindo a responsabilidade técnica pela execução dos serviços.</p>
            </div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA 9ª – DA RESCISÃO</h4>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">9.1. O presente contrato poderá ser rescindido por descumprimento de quaisquer de suas cláusulas, mediante notificação por escrito.</p>
            </div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA 10ª – DO FORO</h4>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">10.1. Fica eleito o foro da comarca de <b>${customer.city || 'São Paulo'} - ${customer.state || 'SP'}</b>, para dirimir quaisquer controvérsias oriundas deste contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.</p>
            </div>

            <div class="mb-8" style="padding-top: 50mm; page-break-inside: avoid; break-inside: avoid;">
              <div class="grid grid-cols-2 gap-16 px-10">
                <div class="text-center border-t border-slate-300 pt-3"><p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">CONTRATADA</p><p class="text-sm font-bold uppercase text-slate-900">${company.name}</p></div>
                <div class="text-center border-t border-slate-300 pt-3 relative"><p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">CONTRATANTE</p><p class="text-sm font-bold uppercase text-slate-900">${customer.name}</p></div>
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

    const handlePrintWorkReport = (order: ServiceOrder, reportMode: 'estimated' | 'real') => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const customer = customers.find(c => c.id === order.customerId) || { name: order.customerName, document: 'N/A', city: '', state: '' };

        const formatDate = (dateStr: string) => {
            try { const d = new Date(dateStr); return isNaN(d.getTime()) ? new Date().toLocaleDateString('pt-BR') : d.toLocaleDateString('pt-BR'); }
            catch { return new Date().toLocaleDateString('pt-BR'); }
        };

        // --- CALCULAÇÕES FINANCEIRAS ---
        const revenue = order.contractPrice || order.totalAmount || 0; // O que o cliente paga
        const plannedCost = (order.costItems || []).reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0); // O que a empresa gasta (planejado)

        // NOVO: Despesas Reais agora baseadas na Medição (CostItems) para alinhar com o Dashboard
        const totalActualExpenses = (order.costItems || []).reduce((acc, i) => acc + (i.actualQuantity ? (i.actualQuantity * (i.actualUnitPrice || 0)) : (i.actualValue || 0)), 0);

        const profitValue = revenue - totalActualExpenses; // Lucro Real (baseado em medição)
        const plannedProfit = revenue - plannedCost; // Lucro Previsto

        // Valores do Orçamento Original (para referência se necessário)
        const budgetSubTotal = order.items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
        const bdiValue = order.bdiRate ? budgetSubTotal * (order.bdiRate / 100) : 0;
        const taxValue = order.taxRate ? (budgetSubTotal + bdiValue) * (order.taxRate / 100) : 0;

        // Gerar HTML da Tabela de Itens (Sempre usando costItems para consistência na Obra)
        const itemsHtml = (order.costItems || []).map((item: ServiceItem) => {
            const plannedTotal = item.quantity * item.unitPrice;

            if (reportMode === 'estimated') {
                return `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 12px 10px; text-align: left; vertical-align: top;">
                        <div style="font-weight: 700; text-transform: uppercase; font-size: 11px; color: #0f172a;">${item.description}</div>
                        <div style="font-size: 9px; color: #94a3b8; font-weight: 600;">${item.type || 'GERAL'}</div>
                    </td>
                    <td style="padding: 12px 0; text-align: center; vertical-align: top; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase;">${item.unit || 'UN'}</td>
                    <td style="padding: 12px 0; text-align: center; vertical-align: top; font-weight: 700; color: #0f172a; font-size: 11px;">${item.quantity}</td>
                    <td style="padding: 12px 0; text-align: right; vertical-align: top; color: #0f172a; font-size: 11px; font-weight: 700;">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td style="padding: 12px 10px; text-align: right; vertical-align: top; font-weight: 800; font-size: 12px; color: #2563eb;">R$ ${plannedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>`;
            }

            const actualTotal = (item.actualQuantity || 0) * (item.actualUnitPrice || 0);
            const diff = actualTotal - plannedTotal;
            const diffColor = diff > 0 ? '#e11d48' : diff < 0 ? '#059669' : '#64748b';

            return `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 12px 10px; text-align: left; vertical-align: top;">
                        <div style="font-weight: 700; text-transform: uppercase; font-size: 11px; color: #0f172a;">${item.description}</div>
                        <div style="font-size: 9px; color: #94a3b8; font-weight: 600;">${item.type || 'GERAL'}</div>
                    </td>
                    <td style="padding: 12px 0; text-align: center; vertical-align: top; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase;">${item.unit || 'UN'}</td>
                    <td style="padding: 12px 0; text-align: center; vertical-align: top;">
                        <div style="font-weight: 700; color: #94a3b8; font-size: 8px; margin-bottom: 2px; text-transform: uppercase;">Est: ${item.quantity}</div>
                        <div style="font-weight: 800; color: #0f172a; font-size: 10px;">REAL: ${item.actualQuantity || 0}</div>
                    </td>
                    <td style="padding: 12px 0; text-align: right; vertical-align: top;">
                        <div style="color: #94a3b8; font-size: 8px; margin-bottom: 2px; font-weight: 700; text-transform: uppercase;">Est: R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        <div style="color: #0f172a; font-size: 10.5px; font-weight: 800;">REAL: R$ ${(item.actualUnitPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    </td>
                    <td style="padding: 12px 10px; text-align: right; vertical-align: top;">
                        <div style="font-weight: 700; font-size: 8px; color: #94a3b8; margin-bottom: 2px; text-transform: uppercase;">Est: R$ ${plannedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        <div style="font-weight: 900; font-size: 12px; color: #0f172a;">REAL: R$ ${actualTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        ${diff !== 0 ? `<div style="font-size: 9.5px; font-weight: 900; color: ${diffColor}; margin-top: 3px; font-variant-numeric: tabular-nums;">${diff > 0 ? '+' : ''} R$ ${diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>` : ''}
                    </td>
                </tr>`;
        }).join('');

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Obra - ${order.id} - ${order.description || 'Obra'}</title>
         <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
           * { box-sizing: border-box; }
           body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; color: #0f172a; }
           @page { size: A4; margin: 0 !important; }
           .a4-container { width: 100%; margin: 0; background: white; padding-left: 15mm !important; padding-right: 15mm !important; }
           .avoid-break { break-inside: avoid; page-break-inside: avoid; }
           .info-box { background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; }
           .info-label { font-size: 11px; font-weight: 800; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; display: block; }
           .info-value { font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; line-height: 1.2; }
           .section-title { font-size: 14px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 8px; border-bottom: 2px solid #f1f5f9; margin-bottom: 16px; margin-top: 32px; }
           .card-summary { padding: 12px; border-radius: 12px; border: 1px solid transparent; }
           @media print { 
             body { background: white !important; margin: 0 !important; } 
             .a4-container { box-shadow: none !important; border: none !important; min-height: auto; position: relative; width: 100% !important; padding-left: 20mm !important; padding-right: 20mm !important; } 
             .no-print { display: none !important; } 
             .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; display: table !important; width: 100% !important; } 
           }
        </style>
      </head>
      <body>
        <table style="width: 100%;">
          <thead><tr><td style="height: ${company.printMarginTop || 15}mm;">&nbsp;</td></tr></thead>
          <tbody><tr><td>
            <div class="a4-container">
                <div class="flex justify-between items-start mb-10 border-b-[3px] border-slate-900 pb-8">
                    <div class="flex gap-6 items-center">
                        <div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
                            ${company.logo ? `<img src="${company.logo}" style="max-height: 100%; max-width: 100%; object-fit: contain;">` : '<div style="font-weight:900; font-size:32px; color:#2563eb;">PO</div>'}
                        </div>
                        <div>
                            <h1 class="text-3xl font-black text-slate-900 leading-none mb-2 uppercase tracking-tight">${company.name}</h1>
                            <p class="text-[11px] font-extrabold text-blue-600 uppercase tracking-widest leading-none mb-2">Relatório Gerencial de Obra - ${reportMode === 'estimated' ? 'ESTIMADO' : 'REAL'}</p>
                            <p class="text-[9px] text-slate-400 font-bold uppercase tracking-tight">${company.cnpj || ''} | ${company.phone || ''}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest mb-2 shadow-md inline-block">CONTROLE DE OBRA</div>
                        <p class="text-2xl font-black text-[#0f172a] tracking-tighter mb-1">${order.id}</p>
                        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>

               <div class="grid grid-cols-2 gap-4 mb-8">
                   <div class="info-box">
                       <span class="info-label">Contratante / Cliente</span>
                       <div class="info-value">${customer.name}</div>
                       <div class="text-[11px] text-slate-400 font-bold mt-1.5 uppercase">${customer.document || 'DOC NÃO INF.'}</div>
                   </div>
                   <div class="info-box">
                       <span class="info-label">Identificação da Obra</span>
                       <div class="info-value">${order.description}</div>
                       <div class="text-[11px] text-slate-400 font-bold mt-1.5 uppercase">Início: ${formatDate(order.createdAt)} | Entrega: ${order.dueDate ? formatDate(order.dueDate) : 'A COMBINAR'}</div>
                   </div>
               </div>

               <div class="section-title">Resumo Financeiro da Obra</div>
                <div class="grid grid-cols-3 gap-4 mb-10">
                    <!-- Card 1: Valor do Orçamento (Receita) -->
                    <div class="card-summary bg-blue-50/50 border-blue-100 px-6 py-4">
                        <span class="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Valor do Orçamento</span>
                        <span class="text-xl font-black text-blue-700 block">R$ ${revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <!-- Card 2: Despesas (Previstas ou Reais baseadas em Medição) -->
                    <div class="card-summary bg-rose-50/50 border-rose-100 px-6 py-4">
                        <span class="text-[10px] font-black text-rose-600 uppercase tracking-widest block mb-1">${reportMode === 'estimated' ? 'Despesas Previstas' : 'Despesas Reais (Medição)'}</span>
                        <span class="text-xl font-black text-rose-700 block">R$ ${(reportMode === 'estimated' ? plannedCost : totalActualExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <!-- Card 3: Lucro (Previsto ou Real) -->
                    <div class="card-summary ${(reportMode === 'estimated' ? (revenue - plannedCost) : profitValue) >= 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'} px-6 py-4">
                        <span class="text-[10px] font-black ${(reportMode === 'estimated' ? (revenue - plannedCost) : profitValue) >= 0 ? 'text-emerald-600' : 'text-red-600'} uppercase tracking-widest block mb-1">${reportMode === 'estimated' ? 'Lucro Previsto' : 'Lucro Real'}</span>
                        <span class="text-xl font-black ${(reportMode === 'estimated' ? (revenue - plannedCost) : profitValue) >= 0 ? 'text-emerald-700' : 'text-red-700'} block">R$ ${(reportMode === 'estimated' ? (revenue - plannedCost) : profitValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>





                <div class="avoid-break mt-6">
                    <div class="section-title">${reportMode === 'estimated' ? 'DETALHAMENTO DE CUSTOS ESTIMADOS' : 'COMPARATIVO DE ITENS (ORÇADO VS REAL)'}</div>
                    <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                       <thead>
                           <tr style="border-bottom: 2px solid #0f172a;">
                               <th style="padding-bottom: 10px; font-size: 10px; text-transform: uppercase; color: #94a3b8; text-align: left; font-weight: 800; width: 38%;">Descrição</th>
                               <th style="padding-bottom: 10px; font-size: 10px; text-transform: uppercase; color: #94a3b8; text-align: center; font-weight: 800; width: 7%;">UN</th>
                               <th style="padding-bottom: 10px; font-size: 10px; text-transform: uppercase; color: #94a3b8; text-align: center; font-weight: 800; width: 15%;">Qtd</th>
                               <th style="padding-bottom: 10px; font-size: 10px; text-transform: uppercase; color: #94a3b8; text-align: right; font-weight: 800; width: 22%;">Unitário</th>
                               <th style="padding-bottom: 10px; font-size: 10px; text-transform: uppercase; color: #94a3b8; text-align: right; font-weight: 800; width: 18%;">Total</th>
                           </tr>
                       </thead>
                       <tbody>
                             ${itemsHtml}
                             <tr style="border-top: 1px solid #f1f5f9; background: #fafafa;">
                                 <td colspan="4" style="padding: 12px 10px; text-align: right; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">Subtotal dos Itens (Orçamento):</td>
                                 <td style="padding: 12px 10px; text-align: right; font-size: 12px; font-weight: 800; color: #0f172a;">R$ ${budgetSubTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                             </tr>
                             ${order.bdiRate ? `
                             <tr style="background: #fafafa;">
                                 <td colspan="4" style="padding: 8px 10px; text-align: right; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">BDI (${order.bdiRate}%):</td>
                                 <td style="padding: 8px 10px; text-align: right; font-size: 12px; font-weight: 800; color: #0f172a;">R$ ${bdiValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                             </tr>` : ''}
                             ${order.taxRate ? `
                             <tr style="background: #fafafa;">
                                 <td colspan="4" style="padding: 8px 10px; text-align: right; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">Impostos (${order.taxRate}%):</td>
                                 <td style="padding: 8px 10px; text-align: right; font-size: 12px; font-weight: 800; color: #0f172a;">R$ ${taxValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                             </tr>` : ''}
                              <tr style="border-top: 1px solid #cbd5e1; background: #f8fafc;">
                                  <td colspan="4" style="padding: 12px 10px; text-align: right; font-size: 12px; font-weight: 900; color: #334155; text-transform: uppercase;">Total do Orçamento (Arrecadação):</td>
                                  <td style="padding: 12px 10px; text-align: right; font-size: 13px; font-weight: 900; color: #1e40af;">R$ ${revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              </tr>
                              <tr style="border-top: 3px solid #0f172a; background: #f1f5f9;">
                                  <td colspan="4" style="padding: 16px 10px; text-align: right; font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase;">${reportMode === 'estimated' ? 'Custo Total Estimado de Obra:' : 'Total Realizado em Obra (Medição):'}</td>
                                  <td style="padding: 16px 10px; text-align: right; font-size: 14px; font-weight: 900; color: ${reportMode === 'estimated' ? '#2563eb' : '#e11d48'};">R$ ${(reportMode === 'estimated' ? plannedCost : totalActualExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              </tr>
                        </tbody>

                   </table>
               </div>

                ${order.descriptionBlocks && order.descriptionBlocks.length > 0 ? `
               <div class="mt-8">
                   <div class="space-y-4">
                       ${order.descriptionBlocks.map(block => {
            if (block.type === 'image') {
                return `<div class="avoid-break" style="margin: 10px 0;"><img src="${block.content}" style="width: 100%; max-height: 180mm; border-radius: 8px; border: 1px solid #f1f5f9; object-fit: contain;"></div>`;
            } else if (block.type === 'page-break') {
                return `<div style="page-break-after: always; height: 0;"></div>`;
            }
            return '';
        }).join('')}
                   </div>
               </div>` : ''}

               <div class="avoid-break mt-32 pt-12 border-t border-slate-100">
                   <div class="flex justify-center px-8">
                       <div class="text-center w-80">
                           <div style="border-top: 1px solid #cbd5e1; margin-bottom: 60px;"></div>
                           <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsável Técnico</p>
                           <p class="text-[12px] font-black uppercase text-slate-900">${company.name}</p>
                       </div>
                   </div>
               </div>
            </div>
          </td></tr></tbody>
          <tfoot><tr><td style="height: ${company.printMarginBottom || 15}mm;">&nbsp;</td></tr></tfoot>
        </table>
        <script>window.onload = function() { setTimeout(() => { window.print(); window.close(); }, 800); }</script>
      </body>
      </html>`;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    useEffect(() => { /* Signature Removed */ }, [showForm]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">OS de Obra</h2>
                    <p className="text-slate-500 text-sm">Gestão de reformas e construções.</p>
                </div>
                <button onClick={() => {
                    setShowForm(true);
                    setActiveTab('details');
                    setEditingOrderId(null);
                    setSelectedCustomerId('');
                    setItems([]);
                    setOsTitle('Reforma / Obra');
                    setDiagnosis('');
                    setDescriptionBlocks([]);
                    setPaymentTerms('');
                    setDeliveryTime('');
                    setContractPrice(0);
                    setTaxRate(0);
                    setBdiRate(0);
                }} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Nova Obra
                </button>
            </div>
            <div className="bg-white p-4 rounded-[1.5rem] border shadow-sm">
                <div className="relative">
                    <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Buscar por cliente ou obra..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
                        <tr><th className="px-8 py-5">OS #</th><th className="px-8 py-5">CLIENTE</th><th className="px-8 py-5">OBRA / DESCRIÇÃO</th><th className="px-8 py-5 text-right">AÇÕES</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {activeOrders.map(order => (
                            <tr key={order.id} className="hover:bg-slate-50 group transition-all">
                                <td className="px-8 py-5 text-xs font-mono font-black text-blue-600">{order.id}</td>
                                <td className="px-8 py-5 text-sm font-black uppercase text-slate-900">{order.customerName}</td>
                                <td className="px-8 py-5 text-xs font-bold text-slate-400 uppercase">{order.description}</td>
                                <td className="px-8 py-5 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleDownloadPDF(order)} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Baixar Contrato"><FileDown className="w-4 h-4" /></button>
                                    <button onClick={() => handlePrintContract(order)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="Gerar Contrato"><ScrollText className="w-4 h-4" /></button>
                                    <button onClick={() => { setSelectedOrderForReport(order); setShowReportTypeModal(true); }} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Relatório de Obra"><FileText className="w-4 h-4" /></button>
                                    <button onClick={() => handlePrintOS(order)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="Imprimir OS"><Printer className="w-4 h-4" /></button>
                                    <button onClick={() => {
                                        setEditingOrderId(order.id);
                                        setSelectedCustomerId(order.customerId);
                                        setItems(order.costItems || []); // Load COST items (empty initially)
                                        setOsTitle(order.description);
                                        setDiagnosis(order.serviceDescription || '');
                                        setDeliveryDate(order.dueDate);
                                        setDescriptionBlocks(order.descriptionBlocks || []);
                                        setPaymentTerms(order.paymentTerms || '');
                                        setDeliveryTime(order.deliveryTime || '');
                                        const calculatedTotal = order.items?.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0) || 0;
                                        setContractPrice(order.contractPrice || order.totalAmount || calculatedTotal || 0);
                                        setTaxRate(order.taxRate || 0);
                                        setBdiRate(order.bdiRate || 0);
                                        setActiveTab('financial');
                                        setShowForm(true);
                                    }} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors" title="Gestão Financeira"><Wallet className="w-4 h-4" /></button>
                                    <button onClick={() => {
                                        setEditingOrderId(order.id);
                                        setSelectedCustomerId(order.customerId);
                                        setItems(order.costItems || []); // Load COST items (empty initially)
                                        setOsTitle(order.description);
                                        setDiagnosis(order.serviceDescription || '');
                                        setDeliveryDate(order.dueDate);
                                        setDescriptionBlocks(order.descriptionBlocks || []);
                                        setPaymentTerms(order.paymentTerms || '');
                                        setDeliveryTime(order.deliveryTime || '');
                                        const calculatedTotal = order.items?.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0) || 0;
                                        setContractPrice(order.contractPrice || order.totalAmount || calculatedTotal || 0);
                                        setTaxRate(order.taxRate || 0);
                                        setBdiRate(order.bdiRate || 0);
                                        setShowForm(true);
                                    }} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={async () => {
                                        if (confirm("Excluir esta OS de Obra?")) {
                                            const idToDelete = order.id;
                                            setOrders(p => p.filter(x => x.id !== idToDelete));
                                            await db.remove('orders', idToDelete);
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
                    <div className="bg-slate-50 w-full max-w-[1240px] h-[95vh] rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col animate-in zoom-in-95">
                        <div className="bg-white px-8 py-5 border-b flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-900 p-2.5 rounded-xl text-white shadow-xl shadow-slate-200"><HardHat className="w-5 h-5" /></div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-0.5">{editingOrderId ? `Editando Obra ${editingOrderId}` : 'Nova OS de Obra'}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">Construção Civil</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setShowForm(false)} className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
                        </div>

                        {/* Tabs */}
                        {editingOrderId && (
                            <div className="bg-white px-8 border-b flex gap-6">
                                <button onClick={() => setActiveTab('details')} className={`py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Detalhes da Obra</button>
                                <button onClick={() => setActiveTab('financial')} className={`py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'financial' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Gestão Financeira</button>
                            </div>
                        )}

                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#f8fafc] no-scrollbar">
                                {activeTab === 'details' ? (
                                    <>
                                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <div className="flex justify-between items-center mb-2"><label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">Cliente</label><button onClick={() => setShowFullClientForm(true)} className="text-blue-600 text-[9px] font-black uppercase flex items-center gap-1 hover:underline"><UserPlus className="w-3 h-3" /> Novo</button></div>
                                                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all custom-select" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}><option value="">Selecione...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                                                </div>
                                                <div><label className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2 block ml-1">Valor Fechado do Contrato (Receita)</label><input type="number" placeholder="R$ 0,00" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400" value={contractPrice} onChange={e => setContractPrice(Number(e.target.value))} /></div>
                                                <div className="md:col-span-2"><label className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2 block ml-1">Título da Obra</label><input type="text" placeholder="Ex: Reforma da Cozinha" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400" value={osTitle} onChange={e => setOsTitle(e.target.value)} /></div>
                                            </div>
                                        </div>

                                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                            <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Observações Técnicas e Escopo Detalhado</label><textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-700 outline-none h-24 focus:ring-2 focus:ring-blue-500 shadow-inner" placeholder="Descreva os serviços a serem executados por extenso..." value={diagnosis} onChange={e => setDiagnosis(e.target.value)} /></div>
                                        </div>

                                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 grow mr-6">FOTOS E ANEXOS DA OBRA</h4>
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
                                    </>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-center">
                                                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor do Orçamento</p>
                                                <p className="text-xl font-black text-blue-600 leading-none">R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-center">
                                                <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Despesas Previstas</p>
                                                <p className="text-xl font-black text-amber-600 leading-none">R$ {plannedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-center">
                                                <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Despesas Reais</p>
                                                <p className="text-xl font-black text-rose-600 leading-none">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-center">
                                                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Lucro Previsto</p>
                                                <p className="text-xl font-black text-indigo-600 leading-none">R$ {plannedProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                            <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden flex flex-col justify-center ${actualProfit >= 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                                                <div className={`absolute top-0 left-0 w-full h-1 ${actualProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${actualProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Lucro Real</p>
                                                <p className={`text-xl font-black leading-none ${actualProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>R$ {actualProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                        </div>

                                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                            <div className="flex justify-between items-center mb-4"><h1 className="text-xs font-black text-slate-900 uppercase tracking-tight">1. Planejamento de Custos e Acompanhamento</h1></div>
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                                                    <div className="md:col-span-3"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Descrição</label><input type="text" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none" value={currentDesc} onChange={e => setCurrentDesc(e.target.value)} placeholder="Ex: Tinta, Cimento..." /></div>
                                                    <div className="md:col-span-1 text-center"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Qtd Est.</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none text-center" value={currentQty} onChange={e => setCurrentQty(Number(e.target.value))} /></div>
                                                    <div className="md:col-span-1 text-right"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">VALOR ESTIM.</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none text-right" value={currentPrice} onChange={e => setCurrentPrice(Number(e.target.value))} /></div>
                                                    <div className="md:col-span-2 border-l pl-2"><label className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1.5 block ml-1">Total Est.</label><div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-blue-700 text-right min-h-[42px] flex items-center justify-end">R$ {((currentQty || 0) * (currentPrice || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div></div>

                                                    <div className="md:col-span-1 text-center border-l pl-2"><label className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1.5 block ml-1">Qtd Real</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none text-center" value={currentActualQty} onChange={e => setCurrentActualQty(Number(e.target.value))} /></div>
                                                    <div className="md:col-span-1 text-right"><label className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1.5 block ml-1">VALOR REAL</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none text-right" value={currentActualPrice} onChange={e => setCurrentActualPrice(Number(e.target.value))} /></div>
                                                    <div className="md:col-span-2 border-l pl-2"><label className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5 block ml-1">Total Real</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none text-right" value={currentActual || ((currentActualQty || 0) * (currentActualPrice || 0)) || ''} onChange={e => setCurrentActual(e.target.value === '' ? 0 : Number(e.target.value))} /></div>
                                                    <div className="md:col-span-1"><button onClick={handleAddItem} className="bg-slate-900 text-white w-full h-[42px] rounded-xl flex items-center justify-center hover:bg-slate-800 transition-colors shadow-lg font-bold"><Plus className="w-5 h-5" /></button></div>
                                                </div>
                                                <div className="mt-6 mb-1 grid grid-cols-12 gap-2 px-3">
                                                    <div className="col-span-3"></div>
                                                    <div className="col-span-4 text-center border-b border-slate-200 pb-1 mx-2"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PLANEJADO</span></div>
                                                    <div className="col-span-4 text-center border-b border-rose-100 pb-1 mx-2"><span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">REALIZADO</span></div>
                                                    <div className="col-span-1"></div>
                                                </div>
                                                <div className="mb-2 grid grid-cols-12 gap-1 px-3">
                                                    <div className="col-span-3"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DESCRIÇÃO</span></div>
                                                    <div className="col-span-1 text-center"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">QTD</span></div>
                                                    <div className="col-span-1 text-right pr-2"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">UNIT</span></div>
                                                    <div className="col-span-2 text-right pr-4"><span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">TOTAL</span></div>
                                                    <div className="col-span-1 text-center border-l border-rose-100 pl-1"><span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">QTD</span></div>
                                                    <div className="col-span-1 text-right pr-2"><span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">UNIT</span></div>
                                                    <div className="col-span-2 text-right pr-4"><span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">TOTAL</span></div>
                                                    <div className="col-span-1"></div>
                                                </div>
                                                <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                                                    {items.map(item => (
                                                        <div key={item.id} className="grid grid-cols-12 gap-1 items-center py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors px-3">
                                                            <div className="col-span-3">
                                                                <input type="text" className="w-full bg-transparent text-xs font-bold text-slate-700 uppercase outline-none" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} />
                                                            </div>
                                                            <div className="col-span-1 border-l border-slate-100 pl-1">
                                                                <input type="number" className="w-full bg-transparent text-xs font-bold text-slate-600 outline-none text-center appearance-none" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} />
                                                            </div>
                                                            <div className="col-span-1">
                                                                <input type="number" className="w-full bg-transparent text-xs font-bold text-slate-600 outline-none text-right appearance-none" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} />
                                                            </div>
                                                            <div className="col-span-2 text-right px-2">
                                                                <span className="text-xs font-bold text-blue-600">R$ {(item.quantity * item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                            </div>

                                                            <div className="col-span-1 border-l border-rose-100 pl-1">
                                                                <input type="number" className="w-full bg-transparent text-xs font-bold text-rose-600 outline-none text-center appearance-none" value={item.actualQuantity || 0} onChange={e => updateItem(item.id, 'actualQuantity', Number(e.target.value))} />
                                                            </div>
                                                            <div className="col-span-1">
                                                                <input type="number" className="w-full bg-transparent text-xs font-bold text-rose-600 outline-none text-right appearance-none" value={item.actualUnitPrice || 0} onChange={e => updateItem(item.id, 'actualUnitPrice', Number(e.target.value))} />
                                                            </div>
                                                            <div className="col-span-2 border-l border-amber-100 pl-1 text-right px-2">
                                                                <span className="text-xs font-bold text-amber-700">R$ {((item.actualQuantity || 0) * (item.actualUnitPrice || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                            <div className="col-span-1 flex justify-center">
                                                                <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white px-8 py-5 border-t flex justify-end shrink-0">
                            <button onClick={handleSaveOS} disabled={isSaving} className={`bg-slate-900 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 hover:shadow-2xl transition-all flex items-center justify-center gap-3 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} /> {isSaving ? 'Salvando...' : 'Salvar OS de Obra'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showFullClientForm && (
                <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold">Novo Cliente</h3>
                            <button onClick={() => setShowFullClientForm(false)}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-0">
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
            {showReportTypeModal && selectedOrderForReport && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 transform animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Tipo de Relatório</h3>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Selecione para imprimir</p>
                            </div>
                            <button onClick={() => setShowReportTypeModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <button
                                onClick={() => { handlePrintWorkReport(selectedOrderForReport, 'estimated'); setShowReportTypeModal(false); }}
                                className="group flex items-center gap-4 p-5 bg-blue-50 hover:bg-blue-600 rounded-3xl transition-all border border-blue-100 text-left"
                            >
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-600 group-hover:scale-110 transition-transform">
                                    <ScrollText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-black text-blue-900 group-hover:text-white uppercase text-sm tracking-tight">RELATÓRIO DO ESTIMADO</h4>
                                    <p className="text-blue-600/70 group-hover:text-white/80 text-[10px] font-bold uppercase">Apenas planejamento e custos orçados</p>
                                </div>
                            </button>

                            <button
                                onClick={() => { handlePrintWorkReport(selectedOrderForReport, 'real'); setShowReportTypeModal(false); }}
                                className="group flex items-center gap-4 p-5 bg-emerald-50 hover:bg-emerald-600 rounded-3xl transition-all border border-emerald-100 text-left"
                            >
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-600 group-hover:scale-110 transition-transform">
                                    <CheckCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-black text-emerald-900 group-hover:text-white uppercase text-sm tracking-tight">RELATÓRIO DO REAL</h4>
                                    <p className="text-emerald-600/70 group-hover:text-white/80 text-[10px] font-bold uppercase">Custos orçados vs Realizados e Resultado</p>
                                </div>
                            </button>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">ServiFlow v2.0</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkOrderManager;


