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
import { usePrintOS } from '../hooks/usePrintOS';
import { financeUtils } from '../services/financeUtils';
import InfoCard from './ui/InfoCard';
import RichTextEditor from './ui/RichTextEditor';

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
  const { handlePrintOS } = usePrintOS(customers, company);

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

  // Financial State
  const [activeTab, setActiveTab] = useState<'details' | 'financial'>('details');
  const [taxRate, setTaxRate] = useState<number>(0);
  const [bdiRate, setBdiRate] = useState<number>(0);

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

  const plannedCost = useMemo(() => financeUtils.calculateSubtotal(items), [items]);

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

  const subtotal = useMemo(() => financeUtils.calculateSubtotal(items), [items]);

  const addTextBlock = () => setDescriptionBlocks([...descriptionBlocks, { id: Date.now().toString(), type: 'text', content: '' }]);
  const addImageBlock = () => setDescriptionBlocks([...descriptionBlocks, { id: Date.now().toString(), type: 'image', content: '' }]);
  const addPageBreak = () => setDescriptionBlocks([...descriptionBlocks, { id: Date.now().toString(), type: 'page-break', content: 'QUEBRA DE PÃ GINA' }]);
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


  const handleDownloadPDF = (order: ServiceOrder) => {
    const customer = customers.find(c => c.id === order.customerId) || { name: order.customerName, document: 'N/A', address: 'Endereço não informado', city: '', state: '', cep: '' };

    const html = `
    < !DOCTYPE html >
        <html>
            <head>
                <title>Contrato - ${order.id}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap" rel="stylesheet">
                    <style>
                        * {box - sizing: border-box; }
                        body {font - family: 'Inter', sans-serif; margin: 0; padding: 0; }
                        .a4-container {width: 100%; background: white; }
                        .avoid-break { break-inside: avoid; page-break-inside: avoid; }
                    </style>
            </head>
            <body class="no-scrollbar">
                <div id="contract-content">
                    <div class="a4-container">
                        <div class="flex justify-between items-start mb-10 border-b-[3px] border-slate-900 pb-8">
                            <div class="flex gap-6 items-center">
                                <div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
                                    ${company.logo ?\`<img src="${company.logo}" style="max-height: 100%; max-width: 100%; object-fit: contain;">\` : '<div style="font-weight:900; font-size:32px; color:#2563eb;">PO</div>'}
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
        </html>\`;

        // PDF Generation Options
        const opt = {
            margin: 15,
            filename: \`Contrato - \${order.id.replace('OS-', 'OS')} - \${order.description || 'Proposta'}.pdf\`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 3, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        // Use a hidden div to process HTML for PDF (must be in DOM and visible for layout)
        const worker = document.createElement('div');
        worker.style.position = 'absolute';
        worker.style.left = '-9999px';
        worker.style.top = '0';
        worker.style.width = '210mm';
        worker.innerHTML = html;
        document.body.appendChild(worker);

        // Apply optimizations manually (scripts in innerHTML don't run)
        // Apply optimizations manually
        html2pdf().from(worker).set(opt).save().then(() => {
            document.body.removeChild(worker);
        });
    };

    const handlePrintWorkReport = (order: ServiceOrder, type: 'estimated' | 'real') => {
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

        const { subtotal, bdiValue, taxValue, finalTotal } = financeUtils.getDetailedFinancials(order);

        const itemsHtml = order.costItems?.map((item) => {
            const estimatedTotal = item.quantity * item.unitPrice;
            const actualTotal = item.actualValue || ((item.actualQuantity || 0) * (item.actualUnitPrice || 0));
            const diff = estimatedTotal - actualTotal;

            if (type === 'estimated') {
                return `
      < tr style = "border-bottom: 1px solid #f1f5f9;" >
            <td style="padding: 10px 0; text-align: left; vertical-align: middle;">
                <div style="font-weight: 700; text-transform: uppercase; font-size: 11px; color: #0f172a;">${item.description}</div>
            </td>
            <td style="padding: 10px 0; text-align: center; vertical-align: middle; color: #64748b; font-size: 10px; font-weight: 700;">${(item.type || 'MAT').toUpperCase()}</td>
            <td style="padding: 10px 0; text-align: center; vertical-align: middle; color: #0f172a; font-size: 11px; font-weight: 700;">${item.quantity} ${item.unit || 'un'}</td>
            <td style="padding: 10px 0; text-align: right; vertical-align: middle; color: #64748b; font-size: 10px; font-weight: 700;">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td style="padding: 10px 0; text-align: right; vertical-align: middle; font-weight: 800; font-size: 12px; color: #0f172a;">R$ ${estimatedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          </tr > `;
            } else {
                return `
  < tr style = "border-bottom: 1px solid #f1f5f9;" >
            <td style="padding: 10px 0; text-align: left; vertical-align: middle;">
                <div style="font-weight: 800; text-transform: uppercase; font-size: 10px; color: #0f172a;">${item.description}</div>
            </td>
            <td style="padding: 10px 0; text-align: center; vertical-align: middle; color: #0f172a; font-size: 10px; font-weight: 700;">${item.quantity}</td>
            <td style="padding: 10px 0; text-align: right; vertical-align: middle; color: #3b82f6; font-size: 10px; font-weight: 700;">R$ ${estimatedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td style="padding: 10px 0; text-align: center; vertical-align: middle; color: #0f172a; font-size: 10px; font-weight: 700;">${item.actualQuantity || 0}</td>
            <td style="padding: 10px 0; text-align: right; vertical-align: middle; color: #e11d48; font-size: 10px; font-weight: 800;">R$ ${actualTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td style="padding: 10px 0; text-align: right; vertical-align: middle; font-weight: 900; font-size: 11px; color: ${diff >= 0 ? '#059669' : '#e11d48'};">R$ ${diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          </tr > `;
            }
        }).join('') || '';

        const html = `
  < !DOCTYPE html >
    <html>
      <head>
        <title>Relatório de Obra - ${order.id}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            body {font - family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page {size: A4; margin: 15mm; }
            .info-box {background: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; }
            .info-label {font - size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; display: block; }
            .info-value {font - size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
          </style>
      </head>
      <body>
        <div class="flex justify-between items-start mb-8 border-b-[3px] border-slate-900 pb-6">
          <div class="flex gap-6 items-center">
            <div style="width: 70px; height: 70px; display: flex; align-items: center; justify-content: center;">
              ${company.logo ?\`<img src="${company.logo}" style="max-height: 100%; max-width: 100%; object-fit: contain;">\` : '<div style="font-weight:900; font-size:28px; color:#2563eb;">PO</div>'}
            </div>
            <div>
              <h1 class="text-2xl font-black text-slate-900 leading-none mb-2 uppercase tracking-tight">${company.name}</h1>
              <p class="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest leading-none mb-2">Relatório de Acompanhamento de Obra</p>
              <p class="text-[8px] text-slate-400 font-bold uppercase tracking-tight">${company.cnpj || ''} | ${company.phone || ''}</p>
            </div>
          </div>
          <div class="text-right">
            <div class="${type === 'estimated' ? 'bg-blue-600' : 'bg-rose-600'} text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-2 shadow-md inline-block">RELATÓRIO ${type === 'estimated' ? 'ESTIMADO' : 'REALIZADO'}</div>
            <p class="text-xl font-black text-[#0f172a] tracking-tighter mb-1 whitespace-nowrap">${order.id}</p>
            <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-right">DATA: ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-8">
          <div class="info-box"><span class="info-label">Cliente</span><div class="info-value">${customer.name}</div></div>
          <div class="info-box"><span class="info-label">Descrição do Projeto</span><div class="info-value">${order.description}</div></div>
        </div>

        <div class="mb-8">
          <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b-2 border-slate-100 pb-2">RESUMO FINANCEIRO</div>
          <div class="grid grid-cols-4 gap-4">
            <div class="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
              <span class="text-[8px] font-black text-blue-600 uppercase tracking-widest block mb-1">Total Orçado</span>
              <span class="text-lg font-black text-blue-900 leading-none">R$ ${plannedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="bg-rose-50 border border-rose-100 p-4 rounded-2xl">
              <span class="text-[8px] font-black text-rose-600 uppercase tracking-widest block mb-1">Total Realizado</span>
              <span class="text-lg font-black text-rose-900 leading-none">R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
              <span class="text-[8px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Valor Contrato</span>
              <span class="text-lg font-black text-emerald-900 leading-none">R$ ${revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="bg-slate-900 p-4 rounded-2xl shadow-lg">
              <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Resultado Atual</span>
              <span class="text-lg font-black text-white leading-none">R$ ${actualProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div class="mb-10">
          <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b-2 border-slate-100 pb-2">DETALHAMENTO DOS ITENS</div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #0f172a;">
                ${type === 'estimated' ? `
                            <th style="padding-bottom: 8px; font-size: 9px; text-transform: uppercase; color: #94a3b8; text-align: left; font-weight: 800;">Descrição do Item</th>
                            <th style="padding-bottom: 8px; font-size: 9px; text-transform: uppercase; color: #94a3b8; text-align: center; font-weight: 800;">Tipo</th>
                            <th style="padding-bottom: 8px; font-size: 9px; text-transform: uppercase; color: #94a3b8; text-align: center; font-weight: 800;">Qtd</th>
                            <th style="padding-bottom: 8px; font-size: 9px; text-transform: uppercase; color: #94a3b8; text-align: right; font-weight: 800;">Vlr Unit.</th>
                            <th style="padding-bottom: 8px; font-size: 9px; text-transform: uppercase; color: #94a3b8; text-align: right; font-weight: 800;">Total Orçado</th>
                        ` : `
                            <th style="padding-bottom: 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: left; font-weight: 800; width: 40%">Descrição</th>
                            <th style="padding-bottom: 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: center; font-weight: 800;">Qtd Orc</th>
                            <th style="padding-bottom: 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right; font-weight: 800;">Vlr Orc</th>
                            <th style="padding-bottom: 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: center; font-weight: 800;">Qtd Real</th>
                            <th style="padding-bottom: 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right; font-weight: 800;">Vlr Real</th>
                            <th style="padding-bottom: 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right; font-weight: 800;">Saldo</th>
                        `}
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
        </div>

        <div class="mt-20 pt-10 border-t border-slate-100 flex justify-between items-center opacity-70">
          <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">ServiFlow - Gestão de Obras Inteligente</p>
          <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Página 1 de 1</p>
        </div>
        <script>window.onload = function() {setTimeout(function () { window.print(); window.close(); }, 500); }</script>
      </body>
    </html>\`;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handleEditOrder = (order: ServiceOrder) => {
        setEditingOrderId(order.id);
        setSelectedCustomerId(order.customerId);
        setOsTitle(order.description);
        setDiagnosis(order.serviceDescription || '');
        setDescriptionBlocks(order.descriptionBlocks || []);
        setPaymentTerms(order.paymentTerms || '');
        setDeliveryTime(order.deliveryTime || '');
        setDeliveryDate(order.dueDate || new Date().toISOString().split('T')[0]);
        setContractPrice(order.contractPrice || order.totalAmount);
        setTaxRate(order.taxRate || 0);
        setBdiRate(order.bdiRate || 0);
        setItems(order.costItems || order.items); // Use costItems if available, otherwise budget items
        setShowForm(true);
        setActiveTab('details');
    };


    return (
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
            {/* Header section com stats */}
            <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-slate-900 p-2.5 rounded-2xl shadow-xl shadow-slate-200">
                            <HardHat className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Gestão de Obras</h2>
                    </div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Acompanhamento técnico e financeiro em tempo real</p>
                </div>

                <div className="flex gap-4">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="BUSCAR OBRA OU CLIENTE..."
                            className="bg-white border-2 border-slate-100 rounded-2xl py-3 pl-12 pr-6 text-xs font-black uppercase tracking-widest outline-none focus:border-slate-900 transition-all w-full md:w-[350px] shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Grid de Obras Ativas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {activeOrders.map(order => (
                    <div key={order.id} className="group bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-300/50 transition-all duration-500 overflow-hidden flex flex-col">
                        <div className="p-8 pb-4">
                            <div className="flex justify-between items-start mb-6">
                                <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    {order.id}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setSelectedOrderForReport(order); setShowReportTypeModal(true); }} className="p-2.5 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm" title="Relatório de Obra"><FileText className="w-4 h-4" /></button>
                                    <button onClick={() => handleDownloadPDF(order)} className="p-2.5 bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm" title="Gerar Contrato (PDF)"><ScrollText className="w-4 h-4" /></button>
                                    <button onClick={() => handleEditOrder(order)} className="p-2.5 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm"><Pencil className="w-4 h-4" /></button>
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-slate-900 uppercase leading-tight mb-2 group-hover:text-blue-600 transition-colors">{order.description}</h3>
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.customerName}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Investimento</span>
                                    <span className="text-sm font-black text-slate-900 leading-none">R$ {(order.contractPrice || order.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Previsão</span>
                                    <span className="text-sm font-black text-slate-900 leading-none">{order.dueDate ? new Date(order.dueDate).toLocaleDateString('pt-BR') : 'A definir'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto bg-slate-50/50 px-8 py-5 flex items-center justify-between border-t border-slate-50">
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                    {[1, 2].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200"></div>)}
                                </div>
                                <span className="text-[9px] font-black text-slate-400 uppercase">Equipe Ativa</span>
                            </div>
                            <button onClick={() => handlePrintOS(order)} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
                                <span className="text-[10px] font-black uppercase tracking-widest">Imprimir OS</span>
                                <Printer className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Card de Nova Obra (Botão) */}
                <button
                    onClick={() => { setEditingOrderId(null); setOsTitle('Execução de Obra'); setDiagnosis(''); setSelectedCustomerId(''); setItems([]); setContractPrice(0); setShowForm(true); }}
                    className="group border-4 border-dashed border-slate-100 rounded-[2.5rem] p-8 flex flex-col items-center justify-center min-h-[300px] hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-500"
                >
                    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-100 group-hover:scale-110 group-hover:bg-blue-600 transition-all duration-500 mb-6">
                        <Plus className="w-8 h-8 text-slate-900 group-hover:text-white" />
                    </div>
                    <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Nova Obra</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Iniciar acompanhamento</span>
                </button>
            </div>

            {/* Modal de Formulário */}
            {showForm && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-6xl h-full max-h-[900px] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="bg-white px-10 py-8 border-b flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-5">
                                <div className="bg-slate-900 p-3.5 rounded-2xl shadow-lg">
                                    <HardHat className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        className="text-2xl font-black text-slate-900 uppercase tracking-tight outline-none w-[400px] border-b-2 border-transparent focus:border-blue-500 transition-all"
                                        value={osTitle}
                                        onChange={(e) => setOsTitle(e.target.value)}
                                        placeholder="TÍTULO DA OBRA"
                                    />
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{editingOrderId || 'NOVA ORDEM'}</span>
                                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Painel de Controle</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-3 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
                        </div>

                        {/* Modal Tabs */}
                        <div className="px-10 py-4 bg-slate-50/50 flex gap-4 border-b shrink-0">
                            <button onClick={() => setActiveTab('details')} className={`flex items - center gap - 2 px - 6 py - 2.5 rounded - xl text - [10px] font - black uppercase tracking - widest transition - all ${ activeTab === 'details' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100' } `}>
                                <ScrollText className="w-4 h-4" /> Dados Gerais
                            </button>
                            <button onClick={() => setActiveTab('financial')} className={`flex items - center gap - 2 px - 6 py - 2.5 rounded - xl text - [10px] font - black uppercase tracking - widest transition - all ${ activeTab === 'financial' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100' } `}>
                                <Wallet className="w-4 h-4" /> Gestão Financeira
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto no-scrollbar">
                            <div className="p-10">
                                {activeTab === 'details' ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                        <div className="space-y-8">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Cliente</label>
                                                    <button onClick={() => setShowFullClientForm(true)} className="flex items-center gap-2 text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"><UserPlus className="w-4 h-4" /> Novo Cliente</button>
                                                </div>
                                                <select
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 uppercase outline-none focus:border-slate-900 transition-all shadow-sm appearance-none cursor-pointer"
                                                    value={selectedCustomerId}
                                                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                                                >
                                                    <option value="">Selecione o Cliente...</option>
                                                    {customers.map(c => <option key={c.id} value={c.id} className="font-bold">{c.name}</option>)}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Valor do Contrato (R$)</label>
                                                    <div className="relative group">
                                                        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-blue-600 font-bold">R$</div>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-blue-50/30 border-2 border-blue-100 rounded-2xl py-4 pl-14 pr-6 text-base font-black text-blue-900 outline-none focus:border-blue-500 transition-all shadow-sm"
                                                            value={contractPrice}
                                                            onChange={(e) => setContractPrice(Number(e.target.value))}
                                                            placeholder="0,00"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Entrega (Prazo)</label>
                                                    <input
                                                        type="date"
                                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 outline-none focus:border-slate-900 transition-all shadow-sm"
                                                        value={deliveryDate}
                                                        onChange={(e) => setDeliveryDate(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Observações Técnicas</label>
                                                <RichTextEditor
                                                    content={diagnosis}
                                                    onChange={setDiagnosis}
                                                    placeholder="DESCREVA O ESCOPO TÉCNICO E DETALHES IMPORTANTES DA OBRA..."
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-8">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Fotos / Anexos</label>
                                                    <div className="flex gap-2">
                                                        <button onClick={addImageBlock} className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg hover:scale-105 transition-all"><ImageIcon className="w-4 h-4" /></button>
                                                        <button onClick={addTextBlock} className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"><Type className="w-4 h-4" /></button>
                                                        <button onClick={addPageBreak} className="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-all" title="Add Quebra de Página"><Zap className="w-4 h-4" /></button>
                                                    </div>
                                                </div>

                                                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 no-scrollbar">
                                                    {descriptionBlocks.map(block => (
                                                        <div key={block.id} className="group relative bg-slate-50 rounded-3xl p-6 border-2 border-slate-100 hover:border-blue-200 transition-all">
                                                            <button onClick={() => setDescriptionBlocks(prev => prev.filter(b => b.id !== block.id))} className="absolute -top-3 -right-3 bg-white border-2 border-slate-100 text-rose-500 p-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all"><X className="w-4 h-4" /></button>

                                                            {block.type === 'text' && (
                                                                <textarea
                                                                    className="w-full bg-transparent text-sm font-bold text-slate-700 placeholder-slate-300 outline-none min-h-[100px] resize-none"
                                                                    value={block.content}
                                                                    onChange={(e) => updateBlockContent(block.id, e.target.value)}
                                                                    placeholder="NOTAS ADICIONAIS..."
                                                                />
                                                            )}

                                                            {block.type === 'image' && (
                                                                <div className="flex flex-col items-center gap-4">
                                                                    {block.content ? (
                                                                        <img src={block.content} className="max-h-[250px] rounded-2xl object-contain shadow-md" alt="Anexo" />
                                                                    ) : (
                                                                        <div className="w-full h-40 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 bg-white/50">
                                                                            <Upload className="w-8 h-8 text-slate-300 mb-2" />
                                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload de Foto da Obra</span>
                                                                        </div>
                                                                    )}
                                                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(block.id, e)} className="text-[10px] font-black text-slate-400 file:bg-slate-900 file:text-white file:border-0 file:px-4 file:py-2 file:rounded-lg file:mr-4 file:cursor-pointer" />
                                                                </div>
                                                            )}

                                                            {block.type === 'page-break' && (
                                                                <div className="flex items-center justify-center gap-4 py-2 opacity-50">
                                                                    <div className="h-[1px] flex-1 bg-amber-300"></div>
                                                                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest whitespace-nowrap">QUEBRA DE PÃ GINA PDF</span>
                                                                    <div className="h-[1px] flex-1 bg-amber-300"></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {descriptionBlocks.length === 0 && (
                                                        <div className="text-center py-20 opacity-20">
                                                            <ImageIcon className="w-16 h-16 mx-auto mb-4" />
                                                            <p className="text-xs font-black uppercase tracking-widest">Nenhuma foto ou anexo adicionado</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="animate-in slide-in-from-right duration-500">
                                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
                                            <InfoCard title="Receita (Contrato)" value={revenue} color="emerald" icon={<ScrollText />} />
                                            <InfoCard title="Custo Orçado" value={plannedCost} color="blue" icon={<HardHat />} />
                                            <InfoCard title="Custo Real (Gasto)" value={totalExpenses} color="rose" icon={<Wallet />} />
                                            <div className={`p - 6 rounded - [2rem] border - 2 shadow - xl ${ actualProfit >= 0 ? 'bg-slate-900 border-slate-800' : 'bg-rose-900 border-rose-800' } `}>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p - 2 rounded - xl ${ actualProfit >= 0 ? 'bg-slate-800' : 'bg-rose-800' } `}><Zap className="w-5 h-5 text-white" /></div>
                                                    <div className={`px - 3 py - 1 rounded - full text - [9px] font - black uppercase tracking - widest ${ actualProfit >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/10 text-white' } `}>Lucro Atual</div>
                                                </div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Resultado Líquido</p>
                                                <p className="text-2xl font-black text-white leading-none">R$ {actualProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm">
                                            <div className="mb-8 grid grid-cols-12 gap-6">
                                                <div className="col-span-4">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Descrição do Custo</label>
                                                    <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-6 text-xs font-bold text-slate-900 uppercase block outline-none focus:border-slate-900 transition-all" value={currentDesc} onChange={e => setCurrentDesc(e.target.value)} placeholder="EX: CIMENTO, MÃO DE OBRA PEDREIRO..." />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block text-center">Qtde</label>
                                                    <input type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-xs font-bold text-slate-900 text-center block outline-none focus:border-slate-900 transition-all" value={currentQty} onChange={e => setCurrentQty(Number(e.target.value))} />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block text-center">Unid</label>
                                                    <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-2 text-xs font-bold text-slate-900 text-center block outline-none focus:border-slate-900 transition-all uppercase" value={currentUnit} onChange={e => setCurrentUnit(e.target.value)} />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block text-right">Vlr Orçado</label>
                                                    <input type="number" className="w-full bg-blue-50/50 border-2 border-blue-100 rounded-2xl py-3 px-6 text-xs font-bold text-blue-900 text-right block outline-none focus:border-blue-500 transition-all" value={currentPrice} onChange={e => setCurrentPrice(Number(e.target.value))} />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block text-right">Vlr Realizado</label>
                                                    <input type="number" className="w-full bg-rose-50/50 border-2 border-rose-100 rounded-2xl py-3 px-6 text-xs font-bold text-rose-900 text-right block outline-none focus:border-rose-500 transition-all" value={currentActual === '' ? '' : currentActual} onChange={e => setCurrentActual(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Total gasto" />
                                                </div>
                                                <div className="col-span-2 flex items-end">
                                                    <button onClick={handleAddItem} className="w-full bg-slate-900 text-white rounded-2xl py-3 text-xs font-black uppercase tracking-widest hover:bg-slate-800 hover:scale-105 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Adicionar</button>
                                                </div>
                                            </div>

                                            <div className="mb-4 grid grid-cols-12 gap-1 px-3">
                                                <div className="col-span-5 text-center border-b border-blue-100 pb-1 mx-2"><span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">PLANEJADO</span></div>
                                                <div className="col-span-5 text-center border-b border-rose-100 pb-1 mx-2"><span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">REALIZADO</span></div>
                                                <div className="col-span-1"></div>
                                            </div>
                                            <div className="mb-2 grid grid-cols-12 gap-1 px-3">
                                                <div className="col-span-2"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DESCRIÇÃO</span></div>
                                                <div className="col-span-1 text-center"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">QTD</span></div>
                                                <div className="col-span-1 text-center"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">UN</span></div>
                                                <div className="col-span-1 text-right pr-2"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">VL. PROJ</span></div>
                                                <div className="col-span-1 text-right pr-2"><span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">TOTAL PROJ</span></div>
                                                <div className="col-span-1 text-center"><span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">QTD</span></div>
                                                <div className="col-span-1 text-center"><span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">UN</span></div>
                                                <div className="col-span-1 text-right pr-2"><span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">VL. REAL</span></div>
                                                <div className="col-span-2 text-right pr-2"><span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">TOTAL REAL</span></div>
                                                <div className="col-span-1"></div>
                                            </div>
                                            <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                                                {items.map(item => (
                                                    <div key={item.id} className="grid grid-cols-12 gap-1 items-center py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors px-3">
                                                        <div className="col-span-2">
                                                            <input type="text" className="w-full bg-transparent text-xs font-bold text-slate-700 uppercase outline-none" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} />
                                                        </div>
                                                        <div className="col-span-1 pl-1">
                                                            <input type="number" className="w-full bg-transparent text-xs font-bold text-slate-600 outline-none text-center appearance-none" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} />
                                                        </div>
                                                        <div className="col-span-1">
                                                            <input type="text" className="w-full bg-transparent text-xs font-bold text-slate-400 outline-none text-center uppercase" value={item.unit || 'un'} onChange={e => updateItem(item.id, 'unit', e.target.value)} />
                                                        </div>
                                                        <div className="col-span-1">
                                                            <div className="flex items-center justify-end gap-1" onClick={() => setActiveEditField(`${ item.id } -price`)}>
                                                                <span className="text-xs text-blue-600 font-bold">R$</span>
                                                                {activeEditField === `${ item.id } -price` ? (
                                                                    <input
                                                                        autoFocus
                                                                        type="number"
                                                                        className="bg-transparent text-xs font-bold text-blue-600 outline-none text-right appearance-none"
                                                                        style={{ width: `${ (item.unitPrice.toString().length + 2) * 8 } px` }}
                                                                        value={item.unitPrice}
                                                                        onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                                                                        onBlur={() => setActiveEditField(null)}
                                                                    />
                                                                ) : (
                                                                    <span className="text-xs font-bold text-blue-600 text-right cursor-pointer">
                                                                        {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="col-span-1 text-right px-2">
                                                            <span className="text-xs font-bold text-blue-600">R$ {(item.quantity * item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                        </div>

                                                        <div className="col-span-1 pl-1">
                                                            <input type="number" className="w-full bg-transparent text-xs font-bold text-rose-600 outline-none text-center appearance-none" value={item.actualQuantity || 0} onChange={e => updateItem(item.id, 'actualQuantity', Number(e.target.value))} />
                                                        </div>
                                                        <div className="col-span-1 text-center">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{item.unit || 'un'}</span>
                                                        </div>
                                                        <div className="col-span-1">
                                                            <div className="flex items-center justify-end gap-1" onClick={() => setActiveEditField(`${ item.id } -actualPrice`)}>
                                                                <span className="text-xs text-amber-700 font-bold">R$</span>
                                                                {activeEditField === `${ item.id } -actualPrice` ? (
                                                                    <input
                                                                        autoFocus
                                                                        type="number"
                                                                        className="bg-transparent text-xs font-bold text-amber-700 outline-none text-right appearance-none"
                                                                        style={{ width: `${ ((item.actualUnitPrice || 0).toString().length + 2) * 8 } px` }}
                                                                        value={item.actualUnitPrice || 0}
                                                                        onChange={e => updateItem(item.id, 'actualUnitPrice', Number(e.target.value))}
                                                                        onBlur={() => setActiveEditField(null)}
                                                                    />
                                                                ) : (
                                                                    <span className="text-xs font-bold text-amber-700 text-right cursor-pointer">
                                                                        {(item.actualUnitPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="col-span-2 pl-1 text-right px-2">
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
                                )}
                            </div>
                        </div>

                        <div className="bg-white px-8 py-5 border-t flex justify-end shrink-0">
                            <button onClick={handleSaveOS} disabled={isSaving} className={`bg - slate - 900 text - white px - 12 py - 4 rounded - 2xl font - black uppercase tracking - widest text - xs shadow - xl shadow - slate - 200 hover: shadow - 2xl transition - all flex items - center justify - center gap - 3 ${ isSaving ? 'opacity-50 cursor-not-allowed' : '' } `}>
                                <Save className={`w - 4 h - 4 ${ isSaving ? 'animate-pulse' : '' } `} /> {isSaving ? 'Salvando...' : 'Salvar OS de Obra'}
                            </button>
                        </div>
                    </div>
                </div>
            )
            }
            {
                showFullClientForm && (
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
                )
            }
            {
                showReportTypeModal && selectedOrderForReport && (
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
                )
            }
        </div >
    );
};

export default WorkOrderManager;
