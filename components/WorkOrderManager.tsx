
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
    const [items, setItems] = useState<ServiceItem[]>([]);

    const [currentDesc, setCurrentDesc] = useState('');
    const [currentPrice, setCurrentPrice] = useState(0);
    const [currentQty, setCurrentQty] = useState(1);

    // Financial State
    const [activeTab, setActiveTab] = useState<'details' | 'financial'>('details');
    const [expenseDesc, setExpenseDesc] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseCategory, setExpenseCategory] = useState('');
    const [taxRate, setTaxRate] = useState<number>(0);
    const [bdiRate, setBdiRate] = useState<number>(0);

    // Edit Expense State
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [editExpenseDesc, setEditExpenseDesc] = useState('');
    const [editExpenseAmount, setEditExpenseAmount] = useState('');
    const [editExpenseCategory, setEditExpenseCategory] = useState('');

    const workExpenses = useMemo(() => {
        if (!editingOrderId) return [];
        return transactions.filter(t => t.relatedOrderId === editingOrderId && t.type === 'DESPESA');
    }, [transactions, editingOrderId]);

    const totalExpenses = useMemo(() => workExpenses.reduce((acc, t) => acc + t.amount, 0), [workExpenses]);
    const totalAmount = useMemo(() => {
        const subtotal = items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
        const bdiValue = subtotal * (bdiRate / 100);
        const subtotalWithBDI = subtotal + bdiValue;
        const taxValue = subtotalWithBDI * (taxRate / 100);
        return subtotalWithBDI + taxValue;
    }, [items, bdiRate, taxRate]);

    const profit = useMemo(() => totalAmount - totalExpenses, [totalAmount, totalExpenses]);

    const handleAddExpense = async () => {
        if (!editingOrderId || !expenseAmount || !expenseDesc) return;
        const newExpense: Transaction = {
            id: `T-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            amount: Number(expenseAmount),
            type: 'DESPESA',
            category: expenseCategory || 'Geral',
            description: expenseDesc,
            relatedOrderId: editingOrderId
        };
        const newList = [newExpense, ...transactions];
        setTransactions(newList);
        await db.save('serviflow_transactions', newList);
        setExpenseAmount('');
        setExpenseDesc('');
        setExpenseCategory('');
        notify("Despesa lançada!");
    };

    const handleDeleteExpense = async (id: string) => {
        if (confirm("Remover esta despesa?")) {
            const newList = transactions.filter(t => t.id !== id);
            setTransactions(newList);
            await db.remove('serviflow_transactions', id);
            await db.save('serviflow_transactions', newList);
        }
    };

    const handleUpdateExpense = async (id: string) => {
        if (!editExpenseAmount || !editExpenseDesc) return;
        const updatedTransactions = transactions.map(t =>
            t.id === id ? {
                ...t,
                description: editExpenseDesc,
                amount: Number(editExpenseAmount),
                category: editExpenseCategory || 'Geral'
            } : t
        );
        setTransactions(updatedTransactions);
        await db.save('serviflow_transactions', updatedTransactions);
        setEditingExpenseId(null);
        notify("Despesa atualizada!");
    };

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Filter for WORK orders
    const activeOrders = useMemo(() => orders.filter(o => {
        if (o.osType !== 'WORK') return false; // Only Work Orders
        if (o.status === OrderStatus.PENDING || o.status === OrderStatus.APPROVED) return false;
        return o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm);
    }), [orders, searchTerm]);

    const subtotal = useMemo(() => items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0), [items]);

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
            status: OrderStatus.IN_PROGRESS,
            items: items,
            totalAmount: totalAmount,
            signature: signatureData,
            descriptionBlocks,
            paymentTerms,
            deliveryTime,
            createdAt: existingOrder?.createdAt || new Date().toISOString().split('T')[0],
            dueDate: deliveryDate,
            taxRate: taxRate,
            bdiRate: bdiRate,
            osType: 'WORK' // Explicitly set as WORK
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
        const finalTotal = subTotalWithBDI + taxValue;

        const itemsHtml = order.items.map((item: ServiceItem) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 10px; font-weight: 600; text-transform: uppercase; font-size: 10px; color: #0f172a;">${item.description}</td>
        <td style="padding: 12px 0; text-align: center; color: #94a3b8; font-size: 9px; font-weight: 600; text-transform: uppercase;">${item.unit || 'UN'}</td>
        <td style="padding: 12px 0; text-align: center; font-weight: 600; color: #0f172a; font-size: 10px;">${item.quantity}</td>
        <td style="padding: 12px 0; text-align: right; color: #64748b; font-size: 10px;">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 12px 10px; text-align: right; font-weight: 600; font-size: 11px; color: #0f172a;">R$ ${(item.unitPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      </tr>`).join('');

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>OS - ${order.id.replace('OS-', 'OS')} - ${order.description || 'Obra'}</title>
         <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap" rel="stylesheet">
        <style>
           body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
           @page { size: A4; margin: 0 !important; }
           .a4-container { width: 100%; margin: 0; background: white; padding-left: 15mm !important; padding-right: 15mm !important; }
           .avoid-break { break-inside: avoid; page-break-inside: avoid; }
           .info-box { background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; }
           .info-label { font-size: 9px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; display: block; }
           .info-value { font-size: 11px; font-weight: 700; color: #0f172a; text-transform: uppercase; line-height: 1.4; }
           .info-sub { font-size: 10px; color: #64748b; font-weight: 500; }
           .section-title { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; margin-bottom: 16px; }
           @media screen { body { background: #f1f5f9; padding: 40px 0; } .a4-container { width: 210mm; margin: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border-radius: 8px; padding: 15mm !important; } }
           @media print { body { background: white !important; margin: 0 !important; } .a4-container { box-shadow: none !important; border: none !important; min-height: auto; position: relative; } .no-screen { display: block !important; } .no-print { display: none !important; } .print-footer { display: none !important; } .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; display: table !important; width: 100% !important; } }
        </style>
      </head>
      <body class="no-scrollbar">
        <table style="width: 100%;">
          <thead><tr><td style="height: ${company.printMarginTop || 15}mm;"><div style="height: ${company.printMarginTop || 15}mm; display: block;">&nbsp;</div></td></tr></thead>
          <tbody><tr><td>
            <div class="a4-container">
               <div class="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
                   <div class="flex gap-6 items-center">
                       <div style="width: 70px; height: 70px; display: flex; align-items: center; justify-content: center;">
                           ${company.logo ? `<img src="${company.logo}" style="max-height: 100%; max-width: 100%; object-fit: contain;">` : '<div style="font-weight:700; font-size:30px; color:#2563eb;">PO</div>'}
                       </div>
                       <div>
                           <h1 class="text-2xl font-bold text-slate-900 leading-none mb-1 uppercase tracking-tight">${company.name}</h1>
                           <p class="text-[9px] font-bold text-blue-600 uppercase tracking-widest leading-none">Soluções em Construção e Reforma</p>
                           <p class="text-[8px] text-slate-400 font-medium uppercase tracking-tight mt-2">${company.cnpj || ''} | ${company.phone || ''}</p>
                       </div>
                   </div>
                   <div class="text-right">
                       <div class="bg-[#0f172a] text-white px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest mb-2 inline-block shadow-sm whitespace-nowrap">ORDEM DE SERVIÇO</div>
                       <p class="text-3xl font-bold text-[#0f172a] tracking-tighter mb-1 whitespace-nowrap">OS-${order.id.replace('OS-', '')}</p>
                       <p class="text-[9px] font-medium text-slate-500 uppercase tracking-widest text-right">ABERTURA: ${formatDate(order.createdAt)}</p>
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
                   <div class="section-title">Materiais e Mão de Obra</div>
                   <table style="width: 100%; border-collapse: collapse;">
                       <thead>
                           <tr style="border-bottom: 2px solid #0f172a;">
                               <th style="padding-bottom: 12px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: left; font-weight: 700; letter-spacing: 0.05em;">Descrição</th>
                               <th style="padding-bottom: 12px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: center; font-weight: 700; letter-spacing: 0.05em;">UN</th>
                               <th style="padding-bottom: 12px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: center; font-weight: 700; letter-spacing: 0.05em;">Qtd</th>
                               <th style="padding-bottom: 12px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right; font-weight: 700; letter-spacing: 0.05em;">Unitário</th>
                               <th style="padding-bottom: 12px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right; font-weight: 700; letter-spacing: 0.05em;">Total</th>
                           </tr>
                       </thead>
                       <tbody>${itemsHtml}</tbody>
                   </table>
               </div>

                <div class="avoid-break mb-12">
                   <div class="flex justify-end mb-2 gap-6 px-2">
                        <div class="text-right">
                           <span class="text-[8px] font-medium text-slate-600 uppercase block">Subtotal</span>
                           <span class="text-[10px] font-bold text-slate-700 block">R$ ${subTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        ${order.bdiRate ? `
                        <div class="text-right">
                           <span class="text-[8px] font-medium text-slate-600 uppercase block">BDI (${order.bdiRate}%)</span>
                           <span class="text-[10px] font-bold text-emerald-600 block">+ R$ ${bdiValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>` : ''}
                        ${order.taxRate ? `
                        <div class="text-right">
                           <span class="text-[8px] font-medium text-slate-600 uppercase block">Impostos (${order.taxRate}%)</span>
                           <span class="text-[10px] font-bold text-blue-600 block">+ R$ ${taxValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>` : ''}
                   </div>
                   <div class="bg-slate-900 text-white p-6 rounded-xl flex justify-between items-center shadow-xl">
                       <span class="text-[12px] font-bold uppercase tracking-widest">INVESTIMENTO TOTAL:</span>
                       <span class="text-3xl font-bold text-white tracking-tighter text-right">R$ ${finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                   </div>
                </div>

               <div class="avoid-break mt-auto pt-8">
                   <div class="grid grid-cols-2 gap-16 px-10">
                       <div class="text-center">
                           <div style="border-top: 1px solid #cbd5e1; margin-bottom: 8px;"></div>
                           <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Responsável Técnico</p>
                           <p class="text-[10px] font-bold uppercase text-slate-900">${company.name}</p>
                       </div>
                       <div class="text-center relative">
                           ${order.signature ? `<img src="${order.signature}" style="max-height: 50px; position: absolute; top: -45px; left: 50%; transform: translateX(-50%);">` : ''}
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
                    <div class="text-[14px] font-black text-blue-600 uppercase tracking-widest mb-0.5">CONTRATO</div>
                    <h2 class="text-3xl font-black text-slate-900 tracking-tighter">${order.id}</h2>
                    <div class="mt-2 space-y-0.5"><p class="text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}</p></div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-5">
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-100"><h4 class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">CONTRATADA</h4><p class="text-sm font-bold text-slate-900 uppercase">${company.name}</p><p class="text-[11px] text-slate-500 uppercase">${company.address || ''}</p><p class="text-[11px] text-slate-500 uppercase">${company.email || ''}</p></div>
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-100"><h4 class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">CONTRATANTE</h4><p class="text-sm font-bold text-slate-900 uppercase">${customer.name}</p><p class="text-[11px] text-slate-500 uppercase">${(customer.document || '').replace(/\D/g, '').length <= 11 ? 'CPF' : 'CNPJ'}: ${formatDocument(customer.document || '') || 'N/A'}</p><p class="text-[11px] text-slate-500 uppercase">${customer.address || ''}, ${customer.number || ''} - ${customer.city || ''}</p></div>
            </div>


            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;"><h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA PRIMEIRA – OBJETO DO CONTRATO</h4><p class="text-[14px] text-slate-600 leading-relaxed text-justify">O presente contrato tem por objeto a prestação dos serviços técnicos descritos abaixo, a serem realizados pela CONTRATADA à CONTRATANTE:</p><div class="bg-blue-50/50 p-4 rounded-xl border-l-4 border-blue-500 mt-4"><p class="text-[14px] font-bold text-blue-900 uppercase tracking-wide">${order.description}</p></div></div>
            
            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;"><h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA SEGUNDA – VALORES E PAGAMENTO</h4><p class="text-[14px] text-slate-600 leading-relaxed text-justify">Pelos serviços contratados, a CONTRATANTE pagará o valor total de <b class="text-slate-900">R$ ${order.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>. Condições: ${order.paymentTerms || 'Conforme combinado'}.</p></div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;"><h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA TERCEIRA – PRAZO</h4><p class="text-[14px] text-slate-600 leading-relaxed text-justify">O prazo para execução dos serviços será de <b>${order.deliveryTime || 'conforme demanda'}</b>, contado a partir da assinatura deste contrato ou da emissão de ordem de serviço. <br>O prazo poderá ser prorrogado mediante acordo entre as partes, sem que isso caracterize descumprimento contratual.</p></div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA QUARTA – OBRIGAÇÕES DA CONTRATADA</h4>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">São obrigações da CONTRATADA:</p>
                <ul class="list-disc pl-5 mt-3 text-[14px] text-slate-600 leading-relaxed space-y-2">
                    <li>Executar os serviços com zelo, qualidade e profissionalismo;</li>
                    <li>Cumprir as condições acordadas neste contrato;</li>
                    <li>Responder por eventuais danos comprovadamente causados por falha na execução dos serviços;</li>
                    <li>Manter regularidade fiscal e legal durante a vigência do contrato, quando exigível.</li>
                </ul>
            </div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA QUINTA – OBRIGAÇÕES DA CONTRATANTE</h4>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">São obrigações da CONTRATANTE:</p>
                <ul class="list-disc pl-5 mt-3 text-[14px] text-slate-600 leading-relaxed space-y-2">
                    <li>Fornecer as informações necessárias à execução dos serviços;</li>
                    <li>Permitir o acesso da CONTRATADA ao local, quando aplicável;</li>
                    <li>Efetuar os pagamentos nos prazos ajustados;</li>
                    <li>Não interferir indevidamente na execução técnica dos serviços.</li>
                </ul>
            </div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;"><h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA SEXTA – VÍNCULO TRABALHISTA</h4><p class="text-[14px] text-slate-600 leading-relaxed text-justify">O presente contrato não gera qualquer vínculo empregatício entre a CONTRATANTE e os empregados, prepostos ou subcontratados da CONTRATADA, sendo esta a única responsável por encargos trabalhistas, previdenciários, fiscais e sociais.</p></div>
            
            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;"><h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA SÉTIMA – RESPONSABILIDADE</h4><p class="text-[14px] text-slate-600 leading-relaxed text-justify">A CONTRATADA será responsável apenas pelos danos diretamente causados por culpa ou dolo na execução dos serviços, não se responsabilizando por danos decorrentes de mau uso, intervenções de terceiros, informações incorretas fornecidas pela CONTRATANTE ou fatos alheios à sua atuação.</p></div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;"><h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA OITAVA – RESCISÃO</h4><p class="text-[14px] text-slate-600 leading-relaxed text-justify">O presente contrato poderá ser rescindido por qualquer das partes, a qualquer tempo, mediante comunicação escrita com antecedência mínima de <b>30 dias</b>, sem ônus, desde que não haja serviços em andamento ou valores pendentes.<br>Em caso de descumprimento contratual, a parte prejudicada poderá rescindir o contrato de forma imediata.</p></div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;"><h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA NONA – CONFIDENCIALIDADE</h4><p class="text-[14px] text-slate-600 leading-relaxed text-justify">As partes comprometem-se a manter sigilo sobre informações técnicas, comerciais ou estratégicas a que tiverem acesso em razão deste contrato.</p></div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;"><h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA DÉCIMA – DISPOSIÇÕES GERAIS</h4><p class="text-[14px] text-slate-600 leading-relaxed text-justify">Este contrato constitui o acordo integral entre as partes, substituindo quaisquer entendimentos anteriores, verbais ou escritos.<br>Qualquer alteração deverá ser feita por escrito e assinada por ambas as partes.</p></div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;"><h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA DÉCIMA PRIMEIRA – FORO</h4><p class="text-[14px] text-slate-600 leading-relaxed text-justify">Fica eleito o foro da Comarca de <b>${customer.city || 'São Paulo'} - ${customer.state || 'SP'}</b>, com renúncia a qualquer outro, por mais privilegiado que seja.</p></div>

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
            <div class="flex justify-between items-start mb-8">
                <div class="flex gap-4">
                    <div class="w-16 h-16 shrink-0 flex items-center justify-center overflow-hidden">
                        ${company.logo ? `<img src="${company.logo}" style="height: 100%; object-fit: contain;">` : `<div style="width: 64px; height: 64px; background: #2563eb; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white;"><svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>`}
                    </div>
                    <div>
                        <h1 class="text-xl font-bold text-slate-900 leading-none mb-1 uppercase tracking-tight">${company.name}</h1>
                        <p class="text-[9px] font-bold text-blue-600 uppercase tracking-widest">${company.tagline || 'Soluções em Gestão e Manutenção Profissional'}</p>
                        <p class="text-[8px] text-slate-400 font-medium uppercase tracking-tight mt-1">${company.cnpj || ''} | ${company.phone || ''}</p>
                    </div>
                </div>
                <div class="text-right">
                    <div class="bg-blue-600 text-white px-4 py-1 rounded text-[8px] font-bold uppercase tracking-widest mb-1 inline-flex items-center justify-center">CONTRATO</div>
                    <h2 class="text-3xl font-bold text-slate-900 tracking-tighter">${order.id}</h2>
                    <div class="mt-2 space-y-0.5"><p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-right">EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}</p></div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-5">
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-100"><h4 class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">CONTRATADA</h4><p class="text-sm font-bold text-slate-900 uppercase">${company.name}</p><p class="text-[11px] text-slate-500 uppercase">${company.address || ''}</p><p class="text-[11px] text-slate-500 uppercase">${company.email || ''}</p></div>
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-100"><h4 class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">CONTRATANTE</h4><p class="text-sm font-bold text-slate-900 uppercase">${customer.name}</p><p class="text-[11px] text-slate-500 uppercase">${(customer.document || '').replace(/\D/g, '').length <= 11 ? 'CPF' : 'CNPJ'}: ${formatDocument(customer.document || '') || 'N/A'}</p><p class="text-[11px] text-slate-500 uppercase">${customer.address || ''}, ${customer.number || ''} - ${customer.city || ''}</p></div>
            </div>


            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;"><h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA PRIMEIRA – OBJETO DO CONTRATO</h4><p class="text-[14px] text-slate-600 leading-relaxed text-justify">O presente contrato tem por objeto a prestação dos serviços técnicos descritos abaixo, a serem realizados pela CONTRATADA à CONTRATANTE:</p><div class="bg-blue-50/50 p-4 rounded-xl border-l-4 border-blue-500 mt-4"><p class="text-[14px] font-bold text-blue-900 uppercase tracking-wide">${order.description}</p></div></div>
            
            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;"><h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA SEGUNDA – VALORES E PAGAMENTO</h4><p class="text-[14px] text-slate-600 leading-relaxed text-justify">Pelos serviços contratados, a CONTRATANTE pagará o valor total de <b class="text-slate-900">R$ ${order.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>. Condições: ${order.paymentTerms || 'Conforme combinado'}.</p></div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;"><h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA TERCEIRA – PRAZO</h4><p class="text-[14px] text-slate-600 leading-relaxed text-justify">O prazo para execução dos serviços será de <b>${order.deliveryTime || 'conforme demanda'}</b>, contado a partir da assinatura deste contrato ou da emissão de ordem de serviço. <br>O prazo poderá ser prorrogado mediante acordo entre as partes, sem que isso caracterize descumprimento contratual.</p></div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA QUARTA – OBRIGAÇÕES DA CONTRATADA</h4>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">São obrigações da CONTRATADA:</p>
                <ul class="list-disc pl-5 mt-3 text-[14px] text-slate-600 leading-relaxed space-y-2">
                    <li>Executar os serviços com zelo, qualidade e profissionalismo;</li>
                    <li>Cumprir as condições acordadas neste contrato;</li>
                    <li>Responder por eventuais danos comprovadamente causados por falha na execução dos serviços;</li>
                    <li>Manter regularidade fiscal e legal durante a vigência do contrato, quando exigível.</li>
                </ul>
            </div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;">
                <h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA QUINTA – OBRIGAÇÕES DA CONTRATANTE</h4>
                <p class="text-[14px] text-slate-600 leading-relaxed text-justify">São obrigações da CONTRATANTE:</p>
                <ul class="list-disc pl-5 mt-3 text-[14px] text-slate-600 leading-relaxed space-y-2">
                    <li>Fornecer as informações necessárias à execução dos serviços;</li>
                    <li>Permitir o acesso da CONTRATADA ao local, quando aplicável;</li>
                    <li>Efetuar os pagamentos nos prazos ajustados;</li>
                    <li>Não interferir indevidamente na execução técnica dos serviços.</li>
                </ul>
            </div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;"><h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA SEXTA – VÍNCULO TRABALHISTA</h4><p class="text-[14px] text-slate-600 leading-relaxed text-justify">O presente contrato não gera qualquer vínculo empregatício entre a CONTRATANTE e os empregados, prepostos ou subcontratados da CONTRATADA, sendo esta a única responsável por encargos trabalhistas, previdenciários, fiscais e sociais.</p></div>
            
            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;"><h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA SÉTIMA – RESPONSABILIDADE</h4><p class="text-[14px] text-slate-600 leading-relaxed text-justify">A CONTRATADA será responsável apenas pelos danos diretamente causados por culpa ou dolo na execução dos serviços, não se responsabilizando por danos decorrentes de mau uso, intervenções de terceiros, informações incorretas fornecidas pela CONTRATANTE ou fatos alheios à sua atuação.</p></div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;"><h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA OITAVA – RESCISÃO</h4><p class="text-[14px] text-slate-600 leading-relaxed text-justify">O presente contrato poderá ser rescindido por qualquer das partes, a qualquer tempo, mediante comunicação escrita com antecedência mínima de <b>30 dias</b>, sem ônus, desde que não haja serviços em andamento ou valores pendentes.<br>Em caso de descumprimento contratual, a parte prejudicada poderá rescindir o contrato de forma imediata.</p></div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;"><h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA NONA – CONFIDENCIALIDADE</h4><p class="text-[14px] text-slate-600 leading-relaxed text-justify">As partes comprometem-se a manter sigilo sobre informações técnicas, comerciais ou estratégicas a que tiverem acesso em razão deste contrato.</p></div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;"><h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA DÉCIMA – DISPOSIÇÕES GERAIS</h4><p class="text-[14px] text-slate-600 leading-relaxed text-justify">Este contrato constitui o acordo integral entre as partes, substituindo quaisquer entendimentos anteriores, verbais ou escritos.<br>Qualquer alteração deverá ser feita por escrito e assinada por ambas as partes.</p></div>

            <div className="mb-10" style="page-break-inside: avoid; break-inside: avoid;"><h4 class="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 pt-6 border-b pb-2" style="page-break-after: avoid; break-after: avoid;">CLÁUSULA DÉCIMA PRIMEIRA – FORO</h4><p class="text-[14px] text-slate-600 leading-relaxed text-justify">Fica eleito o foro da Comarca de <b>${customer.city || 'São Paulo'} - ${customer.state || 'SP'}</b>, com renúncia a qualquer outro, por mais privilegiado que seja.</p></div>

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

    const handlePrintWorkReport = (order: ServiceOrder) => {
        const customer = customers.find(c => c.id === order.customerId) || { name: order.customerName, address: 'Não informado', document: 'N/A' };
        const workExpenses = transactions.filter(t => t.relatedOrderId === order.id && t.type === 'DESPESA');
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
        const finalTotal = subTotalWithBDI + taxValue; // This is the Revenue
        const totalExp = workExpenses.reduce((acc, t) => acc + t.amount, 0);
        const profitValue = finalTotal - totalExp;

        const itemsHtml = order.items.map((item: ServiceItem) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 10px; font-weight: 600; text-transform: uppercase; font-size: 11px; color: #0f172a;">${item.description}</td>
        <td style="padding: 12px 0; text-align: center; color: #94a3b8; font-size: 10px; font-weight: 600; text-transform: uppercase;">${item.unit || 'UN'}</td>
        <td style="padding: 12px 0; text-align: center; font-weight: 600; color: #0f172a; font-size: 11px;">${item.quantity}</td>
        <td style="padding: 12px 0; text-align: right; color: #64748b; font-size: 11px;">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 12px 10px; text-align: right; font-weight: 600; font-size: 12px; color: #0f172a;">R$ ${(item.unitPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      </tr>`).join('');

        const expensesHtml = workExpenses.length > 0 ? workExpenses.map((t: Transaction) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 10px; font-size: 11px; color: #64748b; font-weight: 500;">${formatDate(t.date)}</td>
        <td style="padding: 10px 0; font-weight: 600; text-transform: uppercase; font-size: 11px; color: #0f172a;">${t.description}</td>
        <td style="padding: 10px 0; font-size: 10px; font-weight: 600; text-transform: uppercase; color: #94a3b8;">${t.category || 'GERAL'}</td>
        <td style="padding: 10px 10px; text-align: right; font-weight: 700; font-size: 11px; color: #e11d48;">R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      </tr>`).join('') : `<tr><td colspan="4" style="padding: 24px; text-align: center; font-size: 11px; color: #94a3b8; font-style: italic;">Nenhuma despesa lançada nesta obra.</td></tr>`;

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Obra - ${order.id} - ${order.description || 'Obra'}</title>
         <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
           body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; color: #0f172a; }
           @page { size: A4; margin: 0 !important; }
           .a4-container { width: 100%; margin: 0; background: white; padding-left: 15mm !important; padding-right: 15mm !important; }
           .avoid-break { break-inside: avoid; page-break-inside: avoid; }
           .info-box { background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; }
           .info-label { font-size: 11px; font-weight: 800; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; display: block; }
           .info-value { font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; line-height: 1.2; }
           .section-title { font-size: 14px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 8px; border-bottom: 2px solid #f1f5f9; margin-bottom: 16px; margin-top: 32px; }
           .card-summary { padding: 12px; border-radius: 12px; border: 1px solid transparent; }
           @media print { body { background: white !important; margin: 0 !important; } .a4-container { box-shadow: none !important; border: none !important; min-height: auto; position: relative; } .no-print { display: none !important; } .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; display: table !important; width: 100% !important; } }
        </style>
      </head>
      <body>
        <table style="width: 100%;">
          <thead><tr><td style="height: ${company.printMarginTop || 15}mm;">&nbsp;</td></tr></thead>
          <tbody><tr><td>
            <div class="a4-container">
                <div class="flex justify-between items-start mb-10 border-b-2 border-slate-900 pb-8">
                    <div class="flex gap-6 items-center">
                        <div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
                            ${company.logo ? `<img src="${company.logo}" style="max-height: 100%; max-width: 100%; object-fit: contain;">` : '<div style="font-weight:900; font-size:32px; color:#2563eb;">PO</div>'}
                        </div>
                        <div>
                            <h1 class="text-2xl font-black text-slate-900 leading-none mb-1.5 uppercase tracking-tight">${company.name}</h1>
                            <p class="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest leading-none">Relatório Gerencial de Obra</p>
                            <p class="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-2">${company.cnpj || ''} | ${company.phone || ''}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="bg-blue-600 text-white px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest mb-1.5 shadow-sm inline-block">CONTROLE DE OBRA</div>
                        <p class="text-3xl font-black text-[#0f172a] tracking-tighter mb-0.5">${order.id}</p>
                        <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}</p>
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
               <div class="grid grid-cols-3 gap-3 mb-8">
                   <div class="card-summary bg-blue-50 border-blue-100">
                       <span class="text-[8px] font-black text-blue-600 uppercase tracking-widest block mb-1">Receita Total (Investimento)</span>
                       <span class="text-lg font-black text-blue-700 block">R$ ${finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                   </div>
                   <div class="card-summary bg-rose-50 border-rose-100">
                       <span class="text-[8px] font-black text-rose-600 uppercase tracking-widest block mb-1">Despesas Realizadas (Custos)</span>
                       <span class="text-lg font-black text-rose-700 block">R$ ${totalExp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                   </div>
                   <div class="card-summary ${profitValue >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}">
                       <span class="text-[8px] font-black ${profitValue >= 0 ? 'text-emerald-600' : 'text-red-600'} uppercase tracking-widest block mb-1">Resultado (Lucro Bruto)</span>
                       <span class="text-lg font-black ${profitValue >= 0 ? 'text-emerald-700' : 'text-red-700'} block">R$ ${profitValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                   </div>
               </div>

               <div class="section-title">Histórico Detalhado de Despesas</div>
               <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                   <thead>
                       <tr style="border-bottom: 2px solid #0f172a;">
                           <th style="padding-bottom: 8px; font-size: 10px; text-transform: uppercase; color: #94a3b8; text-align: left; font-weight: 800; letter-spacing: 0.05em; width: 90px;">Data</th>
                           <th style="padding-bottom: 8px; font-size: 10px; text-transform: uppercase; color: #94a3b8; text-align: left; font-weight: 800; letter-spacing: 0.05em;">Descrição do Gasto</th>
                           <th style="padding-bottom: 8px; font-size: 10px; text-transform: uppercase; color: #94a3b8; text-align: left; font-weight: 800; letter-spacing: 0.05em; width: 120px;">Categoria</th>
                           <th style="padding-bottom: 8px; font-size: 10px; text-transform: uppercase; color: #94a3b8; text-align: right; font-weight: 800; letter-spacing: 0.05em; width: 120px;">Valor</th>
                       </tr>
                   </thead>
                   <tbody>
                       ${expensesHtml}
                       <tr style="border-top: 2px solid #0f172a;">
                           <td colspan="3" style="padding: 12px 10px; text-align: right; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b;">Total de Despesas Realizadas:</td>
                           <td style="padding: 12px 10px; text-align: right; font-size: 13px; font-weight: 900; color: #e11d48;">R$ ${totalExp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                       </tr>
                   </tbody>
               </table>

               <div class="avoid-break mt-8">
                   <div class="section-title">Itens Orcamentados / Escopo</div>
                   <table style="width: 100%; border-collapse: collapse;">
                       <thead>
                           <tr style="border-bottom: 2px solid #0f172a;">
                               <th style="padding-bottom: 8px; font-size: 10px; text-transform: uppercase; color: #94a3b8; text-align: left; font-weight: 800;">Descrição</th>
                               <th style="padding-bottom: 8px; font-size: 10px; text-transform: uppercase; color: #94a3b8; text-align: center; font-weight: 800; width: 50px;">UN</th>
                               <th style="padding-bottom: 8px; font-size: 10px; text-transform: uppercase; color: #94a3b8; text-align: center; font-weight: 800; width: 50px;">Qtd</th>
                               <th style="padding-bottom: 8px; font-size: 10px; text-transform: uppercase; color: #94a3b8; text-align: right; font-weight: 800; width: 100px;">Unitário</th>
                               <th style="padding-bottom: 8px; font-size: 10px; text-transform: uppercase; color: #94a3b8; text-align: right; font-weight: 800; width: 110px;">Total</th>
                           </tr>
                       </thead>
                       <tbody>${itemsHtml}</tbody>
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

               <div class="avoid-break mt-12 pt-12 border-t border-slate-100">
                   <div class="flex justify-center px-8">
                       <div class="text-center w-64">
                           <div style="border-top: 1px solid #cbd5e1; margin-bottom: 6px;"></div>
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

    const initCanvas = () => {

        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let drawing = false;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        const start = (e: any) => { drawing = true; const rect = canvas.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo((e.clientX || e.touches[0].clientX) - rect.left, (e.clientY || e.touches[0].clientY) - rect.top); };
        const draw = (e: any) => { if (!drawing) return; const rect = canvas.getBoundingClientRect(); ctx.lineTo((e.clientX || e.touches[0].clientX) - rect.left, (e.clientY || e.touches[0].clientY) - rect.top); ctx.stroke(); };
        const stop = () => drawing = false;
        canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', draw); canvas.addEventListener('mouseup', stop);
        canvas.addEventListener('touchstart', start); canvas.addEventListener('touchmove', draw); canvas.addEventListener('touchend', stop);
    };

    useEffect(() => { if (showForm) setTimeout(initCanvas, 500); }, [showForm]);
    const clearSignature = () => { canvasRef.current?.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); };

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
                                    <button onClick={() => handlePrintWorkReport(order)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Relatório de Obra"><FileText className="w-4 h-4" /></button>
                                    <button onClick={() => handlePrintOS(order)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="Imprimir OS"><Printer className="w-4 h-4" /></button>
                                    <button onClick={() => {
                                        setEditingOrderId(order.id);
                                        setSelectedCustomerId(order.customerId);
                                        setItems(order.items);
                                        setOsTitle(order.description);
                                        setDiagnosis(order.serviceDescription || '');
                                        setDeliveryDate(order.dueDate);
                                        setDescriptionBlocks(order.descriptionBlocks || []);
                                        setPaymentTerms(order.paymentTerms || '');
                                        setDeliveryTime(order.deliveryTime || '');
                                        setTaxRate(order.taxRate || 0);
                                        setBdiRate(order.bdiRate || 0);
                                        setActiveTab('financial');
                                        setShowForm(true);
                                    }} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors" title="Gestão Financeira"><Wallet className="w-4 h-4" /></button>
                                    <button onClick={() => {
                                        setEditingOrderId(order.id);
                                        setSelectedCustomerId(order.customerId);
                                        setItems(order.items);
                                        setOsTitle(order.description);
                                        setDiagnosis(order.serviceDescription || '');
                                        setDeliveryDate(order.dueDate);
                                        setDescriptionBlocks(order.descriptionBlocks || []);
                                        setPaymentTerms(order.paymentTerms || '');
                                        setDeliveryTime(order.deliveryTime || '');
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
                                                <div><label className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2 block ml-1">Título da Obra</label><input type="text" placeholder="Ex: Reforma da Cozinha" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400" value={osTitle} onChange={e => setOsTitle(e.target.value)} /></div>
                                            </div>
                                        </div>

                                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                            <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Detalhamento do Escopo / Observações</label><textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-700 outline-none h-24 focus:ring-2 focus:ring-blue-500 shadow-inner" placeholder="Descreva os serviços a serem executados..." value={diagnosis} onChange={e => setDiagnosis(e.target.value)} /></div>
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

                                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                            <div className="flex justify-between items-center mb-4"><h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 grow mr-4">Itens da Obra</h4></div>
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                                                    <div className="md:col-span-6"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Descrição</label><input type="text" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none" value={currentDesc} onChange={e => setCurrentDesc(e.target.value)} /></div>
                                                    <div className="md:col-span-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Valor</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none" value={currentPrice} onChange={e => setCurrentPrice(Number(e.target.value))} /></div>
                                                    <div className="md:col-span-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Qtd</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none" value={currentQty} onChange={e => setCurrentQty(Number(e.target.value))} /></div>
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
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal da Obra</span>
                                                            <span className="text-lg font-black text-slate-900">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor da Obra (Receita)</p>
                                                <p className="text-2xl font-black text-blue-600">R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                <div className="flex gap-4 mt-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-[7px] font-black text-slate-400 uppercase">BDI: {bdiRate}%</span>
                                                        <span className="text-[7px] font-black text-slate-400 uppercase">Imp: {taxRate}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Total de Gastos (Despesas)</p>
                                                <p className="text-2xl font-black text-rose-600">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                            <div className={`p-6 rounded-[2rem] border shadow-sm ${profit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                                <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Lucro Estimado</p>
                                                <p className={`text-2xl font-black ${profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                        </div>

                                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Lançar Novo Custo / Despesa</h4>
                                            <div className="grid grid-cols-12 gap-3 items-end bg-slate-50 p-4 rounded-xl">
                                                <div className="col-span-4">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Descrição do Gasto</label>
                                                    <input type="text" className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-bold" placeholder="Ex: Compra de Cimento" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} />
                                                </div>
                                                <div className="col-span-3">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Categoria</label>
                                                    <input type="text" className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-bold" placeholder="Ex: Material" value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} />
                                                </div>
                                                <div className="col-span-3">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Valor (R$)</label>
                                                    <input type="number" className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-bold" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
                                                </div>
                                                <div className="col-span-2">
                                                    <button onClick={handleAddExpense} className="w-full bg-slate-900 text-white p-2.5 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors">Lançar</button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                                            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Histórico de Despesas</h4>
                                            </div>
                                            <div className="divide-y divide-slate-100">
                                                {workExpenses.length === 0 ? (
                                                    <p className="p-8 text-center text-xs text-slate-400 font-medium italic">Nenhuma despesa lançada para esta obra.</p>
                                                ) : (
                                                    workExpenses.map(t => (
                                                        <div key={t.id} className="p-4 hover:bg-slate-50 transition-colors">
                                                            {editingExpenseId === t.id ? (
                                                                <div className="grid grid-cols-12 gap-3 items-end bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                                                                    <div className="col-span-4">
                                                                        <label className="text-[7px] font-bold text-blue-400 uppercase mb-1 block">Descrição</label>
                                                                        <input type="text" className="w-full p-2 rounded-lg border border-blue-200 text-[10px] font-bold outline-none" value={editExpenseDesc} onChange={e => setEditExpenseDesc(e.target.value)} />
                                                                    </div>
                                                                    <div className="col-span-3">
                                                                        <label className="text-[7px] font-bold text-blue-400 uppercase mb-1 block">Categoria</label>
                                                                        <input type="text" className="w-full p-2 rounded-lg border border-blue-200 text-[10px] font-bold outline-none" value={editExpenseCategory} onChange={e => setEditExpenseCategory(e.target.value)} />
                                                                    </div>
                                                                    <div className="col-span-3">
                                                                        <label className="text-[7px] font-bold text-blue-400 uppercase mb-1 block">Valor (R$)</label>
                                                                        <input type="number" className="w-full p-2 rounded-lg border border-blue-200 text-[10px] font-bold outline-none" value={editExpenseAmount} onChange={e => setEditExpenseAmount(e.target.value)} />
                                                                    </div>
                                                                    <div className="col-span-2 flex gap-1">
                                                                        <button onClick={() => handleUpdateExpense(t.id)} className="flex-1 bg-emerald-500 text-white p-2 rounded-lg hover:bg-emerald-600 transition-colors"><CheckCircle className="w-4 h-4 mx-auto" /></button>
                                                                        <button onClick={() => setEditingExpenseId(null)} className="flex-1 bg-slate-200 text-slate-500 p-2 rounded-lg hover:bg-slate-300 transition-colors"><X className="w-4 h-4 mx-auto" /></button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex justify-between items-center group">
                                                                    <div>
                                                                        <p className="text-xs font-black text-slate-900 uppercase">{t.description}</p>
                                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{t.date} • {t.category}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-4">
                                                                        <span className="text-sm font-black text-rose-600">- R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button onClick={() => {
                                                                                setEditingExpenseId(t.id);
                                                                                setEditExpenseDesc(t.description);
                                                                                setEditExpenseAmount(t.amount.toString());
                                                                                setEditExpenseCategory(t.category || '');
                                                                            }} className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                                                                            <button onClick={() => handleDeleteExpense(t.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                            </div>
                            <div className="w-full lg:w-[380px] bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 p-8 flex flex-col shrink-0 relative overflow-hidden overflow-y-auto lg:overflow-y-hidden h-auto lg:h-full">
                                <div className="mb-8 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm text-center relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Total da Obra</p>
                                    <div className="text-4xl font-black text-slate-900 tracking-tighter mb-1">R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                </div>

                                <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm relative grow flex flex-col mb-4 min-h-[200px] lg:min-h-0">
                                    <div className="p-3 bg-slate-50 border-b flex justify-between items-center">
                                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Assinatura do Cliente</h4>
                                        <button onClick={clearSignature} className="bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-600 p-1.5 rounded-lg transition-colors" title="Limpar"><Eraser className="w-3 h-3" /></button>
                                    </div>
                                    <div className="grow bg-white relative cursor-crosshair h-32 lg:h-auto">
                                        <canvas ref={canvasRef} width={320} height={180} className="w-full h-full touch-none" />
                                    </div>
                                </div>

                                <div className="space-y-3 mt-auto">
                                    <button onClick={handleSaveOS} disabled={isSaving} className={`w-full ${isSaving ? 'bg-slate-800 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'} text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 hover:shadow-2xl transition-all flex items-center justify-center gap-3`}>
                                        <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} /> {isSaving ? 'Salvando...' : 'Salvar OS de Obra'}
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

export default WorkOrderManager;
