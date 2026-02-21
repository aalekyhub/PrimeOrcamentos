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


    const getContractStyles = () => `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
                background: white; 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
            }
            .a4-container { width: 100%; max-width: 210mm; margin: 0 auto; padding: 0 15mm !important; background: white; }
            p, h1, h2, h3, h4, h5, h6 { margin: 0; }
            ul { list-style-type: none; padding-left: 0; margin: 3mm 0 0 0; }
            li { margin-bottom: 4px; }
            .keep-together { break-inside: avoid !important; page-break-inside: avoid !important; display: block !important; width: 100% !important; }
            
            @media print {
                @page { size: A4; margin: 10mm 0; }
                body { background: white !important; margin: 0 !important; padding: 0 !important; }
                .a4-container { width: 100% !important; margin: 0 !important; padding: 0 15mm !important; }
            }
        </style>
    `;

    const getContractHtml = (order: ServiceOrder, customer: any) => `
        <div id="contract-content" style="background:#fff; padding: 0; margin: 0;">
          <div class="a4-container">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #e2e8f0;">
              <div style="width: 120px;">
                ${company.logo ? `<img src="${company.logo}" style="max-height: 70px; width: auto; object-fit: contain;" crossorigin="anonymous" />` : ''}
              </div>
              <div style="text-align: center; flex-grow: 1;">
                <h1 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 2px; text-transform: uppercase;">${company.name}</h1>
                <p style="font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</p>
                <p style="font-size: 9px; color: #64748b; font-weight: 600;">${company.cnpj || ""} | ${company.phone || ""}</p>
              </div>
              <div style="text-align: right; width: 120px;">
                <h2 style="font-size: 24px; font-weight: 900; color: #2563eb; margin: 0; letter-spacing: -1px;">${order.id}</h2>
                <p style="font-size: 10px; font-weight: 700; color: #334155; text-transform: uppercase; margin-top: 2px;">EMISSÃO: ${new Date().toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
    
            <!-- Info Boxes -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-bottom: 20px;">
              <div style="background:#f8fafc; padding: 18px; border-radius: 12px; border: 1px solid #dbeafe;">
                <h4 style="font-size:10px; font-weight:900; color:#3b82f6; text-transform:uppercase; letter-spacing:1px; margin:0 0 2mm 0;">CONTRATADA</h4>
                <p style="font-size:14px; font-weight:900; color:#0f172a; text-transform:uppercase; margin:0;">${company.name}</p>
                <p style="font-size:11px; font-weight:600; color:#64748b; margin:1mm 0 0 0;">${company.address || ""}</p>
                <p style="font-size:11px; font-weight:600; color:#64748b; margin:0;">${company.email || ""}</p>
              </div>
              <div style="background:#f8fafc; padding: 18px; border-radius: 12px; border: 1px solid #dbeafe;">
                <h4 style="font-size:10px; font-weight:900; color:#3b82f6; text-transform:uppercase; letter-spacing:1px; margin:0 0 2mm 0;">CONTRATANTE</h4>
                <p style="font-size:14px; font-weight:900; color:#0f172a; text-transform:uppercase; margin:0;">${customer.name}</p>
                <p style="font-size:11px; font-weight:600; color:#64748b; margin:1mm 0 0 0;">${(customer.document || "").replace(/\D/g, "").length <= 11 ? "CPF" : "CNPJ"}: ${customer.document || "N/A"}</p>
                <p style="font-size:11px; font-weight:600; color:#64748b; margin:0;">${customer.address || ""}, ${customer.number || ""} - ${customer.city || ""}</p>
              </div>
            </div>
    
            <!-- Introduction -->
            <div style="margin-bottom: 5mm;">
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0;">
                As partes acima identificadas resolvem firmar o presente Contrato de Prestação de Serviços por Empreitada Global, nos termos da legislação civil e previdenciária vigente, mediante as cláusulas e condições seguintes:
              </p>
            </div>
    
            <!-- Clauses -->
            <div style="margin-bottom: 5mm; page-break-inside: avoid; break-inside: avoid-page;">
              <h4 style="font-size:16px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px; margin:0 0 10px 0; padding-top: 3mm;">CLÁUSULA 1ª – DO OBJETO</h4>
              <p style="font-size:13px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 10px 0;">
                1.1. O presente contrato tem por objeto a execução de reforma na unidade situada no endereço do CONTRATANTE, compreendendo os serviços descritos em memorial descritivo e/ou proposta comercial anexa, que passa a integrar este instrumento para todos os fins legais.
              </p>
              <div style="background:#f8fafc; padding: 15px; border-radius: 8px; border-left: 5px solid #2563eb; margin: 15px 0;">
                <p style="font-size:14px; font-weight:800; color:#1e3a8a; text-transform:uppercase; letter-spacing:0.5px; margin:0;">${order.description || ""}</p>
              </div>
              <p style="font-size:13px; color:#475569; line-height:1.6; text-align:justify; margin:10px 0 0 0;">1.2. A contratação se dá sob regime de empreitada global, com fornecimento de materiais e mão de obra, assumindo a CONTRATADA integral responsabilidade técnica, administrativa e operacional pela execução da obra.</p>
              <p style="font-size:13px; color:#475569; line-height:1.6; text-align:justify; margin:10px 0 0 0;">1.3. Não se caracteriza, em hipótese alguma, cessão ou locação de mão de obra.</p>
            </div>
    
            <div style="margin-bottom: 5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 3mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 2ª – DA FORMA DE EXECUÇÃO</h4>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">2.1. A CONTRATADA executará os serviços com autonomia técnica e gerencial, utilizando meios próprios, inclusive pessoal, ferramentas, equipamentos e métodos de trabalho.</p>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">2.2. Não haverá subordinação, exclusividade, controle de jornada ou disponibilização de trabalhadores ao CONTRATANTE.</p>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">2.3. A CONTRATADA assume integral responsabilidade pela obra e pelos profissionais por ela contratados.</p>
            </div>
    
            <div style="margin-bottom: 5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 3mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 3ª – DO PREÇO E FORMA DE PAGAMENTO</h4>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">3.1. Pelos serviços objeto deste contrato, o CONTRATANTE pagará à CONTRATADA o valor global de <b style="color:#0f172a; white-space: nowrap;">R$ ${order.contractPrice && order.contractPrice > 0 ? order.contractPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : order.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>.</p>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">3.2. O pagamento será realizado da seguinte forma: <b>${order.paymentTerms || 'Conforme combinado'}</b>.</p>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">3.3. O valor contratado corresponde a preço fechado por obra certa, não estando vinculado a horas trabalhadas ou número de funcionários.</p>
            </div>
    
            <div style="margin-bottom: 5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 3mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 4ª – DAS OBRIGAÇÕES DA CONTRATADA</h4>
                <ul style="list-style-type: none; padding-left: 0; margin: 3mm 0 0 0; font-size:14px; color:#475569; line-height:1.6;">
                    <li>4.1. Executar os serviços conforme escopo contratado e normas técnicas aplicáveis.</li>
                    <li>4.2. Responsabilizar-se por seus empregados quanto a encargos trabalhistas, previdenciários e fiscais.</li>
                    <li>4.3. Manter regularidade fiscal durante a execução do contrato.</li>
                    <li>4.4. Responder por danos causados ao imóvel decorrentes de culpa comprovada.</li>
                </ul>
            </div>
    
            <div style="margin-bottom: 5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 3mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 5ª – DAS OBRIGAÇÕES DO CONTRATANTE</h4>
                <ul style="list-style-type: none; padding-left: 0; margin: 3mm 0 0 0; font-size:14px; color:#475569; line-height:1.6;">
                    <li>5.1. Garantir acesso ao local da obra.</li>
                    <li>5.2. Efetuar os pagamentos conforme pactuado.</li>
                    <li>5.3. Providenciar autorizações condominiais, quando exigidas.</li>
                </ul>
            </div>
    
            <div style="margin-bottom: 5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 3mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 6ª – DAS RESPONSABILIDADES PREVIDENCIÁRIAS E FISCAIS</h4>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">6.1. O presente contrato caracteriza empreitada total, nos termos da legislação previdenciária vigente, especialmente Lei nº 8.212/91 e IN RFB 2110/2022.</p>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">6.2. Não se aplica retenção de 11% de INSS, por não se tratar de cessão de mão de obra.</p>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">6.3. A CONTRATADA é responsável pelo recolhimento de tributos incidentes sobre suas atividades.</p>
            </div>
    
            <div style="margin-bottom: 5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 3mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 7ª – DO PRAZO</h4>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">7.1. O prazo estimado para execução da obra é de <b>${order.deliveryTime || '15 dias úteis'}</b>, contados do início efetivo dos serviços.</p>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">7.2. O prazo poderá ser prorrogado em caso de: serviços adicionais, atraso de pagamento, impedimento de acesso, ou caso fortuito/força maior.</p>
            </div>
    
            <div style="margin-bottom: 5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 3mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 8ª – DA RESPONSABILIDADE TÉCNICA</h4>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0;">8.1. Quando exigido pela natureza dos serviços, será providenciada ART ou RRT por profissional habilitado.</p>
            </div>
  
            <div style="margin-bottom: 5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 3mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 9ª – DOS SERVIÇOS ADICIONAIS</h4>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">9.1. Qualquer serviço não previsto no escopo original será considerado extra e dependerá de orçamento complementar e aprovação formal do CONTRATANTE.</p>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">9.2. A execução de serviços adicionais implicará ajuste de prazo e valor mediante termo aditivo.</p>
            </div>
  
            <div style="margin-bottom: 5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 3mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 10ª – DA MULTA E INADIMPLEMENTO</h4>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">10.1. O atraso no pagamento implicará multa de 2% sobre o valor devido, juros de 1% ao mês e correção monetária pelo índice oficial vigente.</p>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">10.2. Em caso de rescisão imotivada por parte do CONTRATANTE, será devida multa equivalente a 10% do valor restante do contrato.</p>
            </div>
    
            <div style="margin-bottom: 5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 3mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 11ª – DA RESCISÃO</h4>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0;">11.1. O contrato poderá ser rescindido por descumprimento contratual mediante notificação escrita.</p>
            </div>
    
            <div style="margin-bottom: 5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 3mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 12ª – DO FORO</h4>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0;">12.1. Fica eleito o foro da Comarca de <b>${customer.city || 'Brasília'} - ${customer.state || 'DF'}</b> para dirimir quaisquer controvérsias oriundas deste contrato.</p>
            </div>
 
            <div style="margin-top: 10mm; font-size: 14px; color: #475569; line-height: 1.6;">
                <p>E por estarem justas e contratadas, assinam as partes o presente instrumento em duas vias de igual teor.</p>
                <p style="margin-top: 5mm;">${customer.city || 'Brasília'}/${customer.state || 'DF'}, ${new Date().getDate()} de ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())} de ${new Date().getFullYear()}.</p>
            </div>
    
            <div style="margin: 30mm 0 20mm 0; page-break-inside: avoid;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16mm; padding: 0 10mm;">
                    <div style="text-align:center; border-top: 1px solid #cbd5e1; padding-top: 3mm;">
                        <p style="font-size:9px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin:0 0 1mm 0;">CONTRATADA</p>
                        <p style="font-size:14px; font-weight:700; text-transform:uppercase; color:#0f172a; margin:0;">${company.name}</p>
                    </div>
                    <div style="text-align:center; border-top: 1px solid #cbd5e1; padding-top: 3mm;">
                        <p style="font-size:9px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin:0 0 1mm 0;">CONTRATANTE</p>
                        <p style="font-size:14px; font-weight:700; text-transform:uppercase; color:#0f172a; margin:0;">${customer.name}</p>
                    </div>
                </div>
            </div>
          </div>
        </div>
    `;

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

    const handleDownloadPDF = async (order: ServiceOrder) => {
        const customer = customers.find((c) => c.id === order.customerId) || {
            name: order.customerName,
            document: "N/A",
            address: "Endereço não informado",
            city: "",
            state: "",
            cep: "",
            number: "",
        };

        const contentHtml = getContractHtml(order, customer);

        const opt = {
            margin: [10, 0, 15, 0] as [number, number, number, number],
            filename: `Contrato - ${order.id.replace("OS-", "OS")} - ${order.description || "Proposta"}.pdf`,
            image: { type: "jpeg" as const, quality: 0.98 },
            html2canvas: {
                scale: 3,
                useCORS: true,
                allowTaint: false,
                backgroundColor: "#ffffff",
                logging: false,
                letterRendering: true,
                windowWidth: 1200,
            },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
            pagebreak: { mode: ["css", "legacy"] }
        };

        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = contentHtml;
        const style = document.createElement("style");
        style.textContent = `
            ${getContractStyles()}
            .a4-container { width: 210mm !important; }
        `;
        tempDiv.appendChild(style);
        document.body.appendChild(tempDiv);

        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            await (html2pdf()
                .set(opt)
                .from(tempDiv)
                .toPdf()
                .get('pdf')
                .then((pdf: any) => {
                    const totalPages = pdf.internal.getNumberOfPages();
                    for (let i = 1; i <= totalPages; i++) {
                        pdf.setPage(i);
                        pdf.setFontSize(10);
                        pdf.setTextColor(148, 163, 184);
                        pdf.text(
                            `Pág. ${i} / ${totalPages}`,
                            pdf.internal.pageSize.getWidth() - 15,
                            pdf.internal.pageSize.getHeight() - 10,
                            { align: "right" }
                        );
                    }
                }) as any)
                .save();
            notify("PDF gerado com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            notify("Erro ao gerar PDF. Tente novamente.", "error");
        } finally {
            document.body.removeChild(tempDiv);
        }
    };

    const handlePrintContract = (order: ServiceOrder) => {
        const customer = customers.find(c => c.id === order.customerId) || {
            name: order.customerName,
            document: 'N/A',
            address: 'Endereço não informado',
            city: '',
            state: '',
            cep: '',
            number: ''
        };
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
<!DOCTYPE html>
<html>
    <head>
        <title>Contrato - ${order.id.replace('OS-', 'OS')} - ${order.description || 'Proposta'}</title>
        ${getContractStyles()}
    </head>
    <body>
        ${getContractHtml(order, customer)}
        
        <script>
            function optimizePageBreaks() {
                const container = document.querySelector('.a4-container');
                if (!container) return;

                const titles = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
                const pageHeight = 297 * 3.78; // A4 height in px approx (~1122px)
                const marginLimit = 100; // px from bottom

                titles.forEach(title => {
                    const rect = title.getBoundingClientRect();
                    const distanceFromBottom = pageHeight - (rect.top % pageHeight);
                    
                    if (distanceFromBottom < marginLimit) {
                        title.style.pageBreakBefore = 'always';
                    }

                    // Se for uma cláusula (Cláusula Xª), tentar manter com o próximo parágrafo
                    if (title.textContent.includes('CLÁUSULA')) {
                        title.classList.add('keep-together');
                        let next = title.nextElementSibling;
                        if (next) next.classList.add('keep-together');
                    }
                });
            }

            window.onload = function() {
                optimizePageBreaks();
                setTimeout(() => {
                    window.print();
                    setTimeout(() => { window.close(); }, 500);
                }, 500);
            }
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
            < tr style = "border-bottom: 1px solid #f1f5f9;" >
                    <td style="padding: 12px 0; text-align: left; vertical-align: top;">
                        <div style="font-weight: 700; text-transform: uppercase; font-size: 11px; color: #0f172a;">${item.description}</div>
                        <div style="font-size: 9px; color: #94a3b8; font-weight: 600;">${item.type || 'GERAL'}</div>
                    </td>
                    <td style="padding: 12px 0; text-align: center; vertical-align: top; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase;">${item.unit || 'UN'}</td>
                    <td style="padding: 12px 0; text-align: center; vertical-align: top; font-weight: 700; color: #0f172a; font-size: 11px;">${item.quantity}</td>
                    <td style="padding: 12px 0; text-align: right; vertical-align: top; color: #0f172a; font-size: 11px; font-weight: 700; white-space: nowrap;">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style="padding: 12px 0; text-align: right; vertical-align: top; font-weight: 800; font-size: 12px; color: #2563eb; white-space: nowrap;">R$ ${plannedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr > `;
            }

            const actualTotal = (item.actualQuantity || 0) * (item.actualUnitPrice || 0);
            const diff = actualTotal - plannedTotal;
            const diffColor = diff > 0 ? '#e11d48' : diff < 0 ? '#059669' : '#64748b';

            return `
    < tr style = "border-bottom: 1px solid #f1f5f9;" >
                    <td style="padding: 12px 0; text-align: left; vertical-align: top;">
                        <div style="font-weight: 700; text-transform: uppercase; font-size: 11px; color: #0f172a;">${item.description}</div>
                        <div style="font-size: 9px; color: #94a3b8; font-weight: 600;">${item.type || 'GERAL'}</div>
                    </td>
                    <td style="padding: 12px 0; text-align: center; vertical-align: top; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase;">${item.unit || 'UN'}</td>
                    <td style="padding: 12px 0; text-align: center; vertical-align: top;">
                        <div style="font-weight: 700; color: #94a3b8; font-size: 8px; margin-bottom: 2px; text-transform: uppercase;">Est: ${item.quantity}</div>
                        <div style="font-weight: 800; color: #0f172a; font-size: 10px;">REAL: ${item.actualQuantity || 0}</div>
                    </td>
                    <td style="padding: 12px 0; text-align: right; vertical-align: top;">
                        <div style="color: #94a3b8; font-size: 8px; margin-bottom: 2px; font-weight: 700; text-transform: uppercase; white-space: nowrap;">Est: R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div style="color: #0f172a; font-size: 10.5px; font-weight: 800; white-space: nowrap;">REAL: R$ ${(item.actualUnitPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </td>
                    <td style="padding: 12px 0; text-align: right; vertical-align: top;">
                        <div style="font-weight: 700; font-size: 8px; color: #94a3b8; margin-bottom: 2px; text-transform: uppercase; white-space: nowrap;">Est: R$ ${plannedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div style="font-weight: 900; font-size: 12px; color: #0f172a; white-space: nowrap;">REAL: R$ ${actualTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        ${diff !== 0 ? `<div style="font-size: 9.5px; font-weight: 900; color: ${diffColor}; margin-top: 3px; font-variant-numeric: tabular-nums; white-space: nowrap;">${diff > 0 ? '+' : ''} R$ ${diff.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>` : ''}
                    </td>
                </tr > `;
        }).join('');

        const html = `
<!DOCTYPE html>
        <html>
            <head>
                <title>Relatório de Obra - ${order.id} - ${order.description || 'Obra'}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Roboto:wght@400;700&family=Montserrat:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Poppins:wght@400;700&family=Oswald:wght@400;700&family=Playfair+Display:wght@400;700&family=Nunito:wght@400;700&display=swap" rel="stylesheet">
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
                            .a4-container { box-shadow: none !important; border: none !important; min-height: auto; position: relative; width: 100% !important; padding-left: 15mm !important; padding-right: 15mm !important; }
                            .no-print { display: none !important; }
                            .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; display: block !important; width: 100% !important; } 
                            .keep-together { break-inside: avoid !important; page-break-inside: avoid !important; display: block !important; width: 100% !important; }
                        }
           
                        /* Styles for Rich Text (Quill) */
                        .ql-editor-print ul { list-style-type: disc !important; padding-left: 30px !important; margin: 12px 0 !important; }
                        .ql-editor-print ol { list-style-type: decimal !important; padding-left: 30px !important; margin: 12px 0 !important; }
                        .ql-editor-print li { display: list-item !important; margin-bottom: 4px !important; }
                        .ql-editor-print strong { font-weight: bold !important; }
                        .ql-editor-print em { font-style: italic !important; }
                        .ql-editor-print .ql-align-center { text-align: center !important; }
                        .ql-editor-print .ql-align-right { text-align: right !important; }
                        .ql-editor-print .ql-align-justify { text-align: justify !important; }

                        /* Font Classes for Print */
                        .ql-font-inter { font-family: 'Inter', sans-serif !important; }
                        .ql-font-arial { font-family: Arial, sans-serif !important; }
                        .ql-font-roboto { font-family: 'Roboto', sans-serif !important; }
                        .ql-font-serif { font-family: serif !important; }
                        .ql-font-monospace { font-family: monospace !important; }
                        .ql-font-montserrat { font-family: 'Montserrat', sans-serif !important; }
                        .ql-font-opensans { font-family: 'Open Sans', sans-serif !important; }
                        .ql-font-lato { font-family: 'Lato', sans-serif !important; }
                        .ql-font-poppins { font-family: 'Poppins', sans-serif !important; }
                        .ql-font-oswald { font-family: 'Oswald', sans-serif !important; }
                        .ql-font-playfair { font-family: 'Playfair Display', serif !important; }
                        .ql-font-nunito { font-family: 'Nunito', sans-serif !important; }

                        /* Size Classes for Print */
                        .ql-size-10px { font-size: 10px !important; }
                        .ql-size-12px { font-size: 12px !important; }
                        .ql-size-14px { font-size: 14px !important; }
                        .ql-size-16px { font-size: 16px !important; }
                        .ql-size-18px { font-size: 18px !important; }
                        .ql-size-20px { font-size: 20px !important; }
                        .ql-size-24px { font-size: 24px !important; }
                        .ql-size-32px { font-size: 32px !important; }
                    </style>
            </head>
            <body>
                <table style="width: 100%;">
                    <thead><tr><td style="height: ${company.printMarginTop || 15}mm;">&nbsp;</td></tr></thead>
                    <tbody><tr><td>
                        <div class="a4-container">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10mm; border-bottom: 3px solid #0f172a; padding-bottom: 8mm;">
                                <div style="display: flex; gap: 6mm; align-items: center;">
                                    <div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
                                        ${company.logo ? `<img src="${company.logo}" style="max-height: 100%; max-width: 100%; object-fit: contain;">` : '<div style="font-weight:900; font-size:32px; color:#2563eb;">PO</div>'}
                                    </div>
                                    <div>
                                        <h1 style="font-size:18px; font-weight:900; color:#0f172a; margin:0 0 2mm 0; text-transform:uppercase; letter-spacing:-0.5px;">${company.name}</h1>
                                        <p style="font-size:11px; font-weight:800; color:#2563eb; text-transform:uppercase; letter-spacing:1px; margin:0 0 2mm 0;">Relatório Gerencial de Obra - ${reportMode === 'estimated' ? 'ESTIMADO' : 'REAL'}</p>
                                        <p style="font-size:9px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:-0.3px; margin:0;">${company.cnpj || ''} | ${company.phone || ''}</p>
                                    </div>
                                </div>
                                <div style="text-align:right;">
                                    <div style="background:#2563eb; color:white; padding:2mm 4mm; border-radius:2mm; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:1px; margin-bottom:2mm; display:inline-block;">CONTROLE DE OBRA</div>
                                    <p style="font-size:24px; font-weight:900; color:#0f172a; letter-spacing:-1px; margin:0 0 1mm 0; white-space:nowrap;">${order.id}</p>
                                    <p style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:1px; text-align:right; margin:0;">EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}</p>
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
                                    <span class="text-xl font-black text-blue-700 block; white-space: nowrap;">R$ ${revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>

                                <!-- Card 2: Despesas (Previstas ou Reais baseadas em Medição) -->
                                <div class="card-summary bg-rose-50/50 border-rose-100 px-6 py-4">
                                    <span class="text-[10px] font-black text-rose-600 uppercase tracking-widest block mb-1">${reportMode === 'estimated' ? 'Despesas Previstas' : 'Despesas Reais (Medição)'}</span>
                                    <span class="text-xl font-black text-rose-700 block; white-space: nowrap;">R$ ${(reportMode === 'estimated' ? plannedCost : totalActualExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>

                                <!-- Card 3: Lucro (Previsto ou Real) -->
                                <div class="card-summary ${(reportMode === 'estimated' ? (revenue - plannedCost) : profitValue) >= 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'} px-6 py-4">
                                    <span class="text-[10px] font-black ${(reportMode === 'estimated' ? (revenue - plannedCost) : profitValue) >= 0 ? 'text-emerald-600' : 'text-red-600'} uppercase tracking-widest block mb-1">${reportMode === 'estimated' ? 'Lucro Previsto' : 'Lucro Real'}</span>
                                    <span class="text-xl font-black ${(reportMode === 'estimated' ? (revenue - plannedCost) : profitValue) >= 0 ? 'text-emerald-700' : 'text-red-700'} block; white-space: nowrap;">R$ ${(reportMode === 'estimated' ? (revenue - plannedCost) : profitValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                                            <td style="padding: 12px 10px; text-align: right; font-size: 12px; font-weight: 800; color: #0f172a; white-space: nowrap;">R$ ${budgetSubTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        </tr>
                                        ${order.bdiRate ? `
                             <tr style="background: #fafafa;">
                                 <td colspan="4" style="padding: 8px 10px; text-align: right; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">BDI (${order.bdiRate}%):</td>
                                 <td style="padding: 8px 10px; text-align: right; font-size: 12px; font-weight: 800; color: #0f172a; white-space: nowrap;">R$ ${bdiValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                             </tr>` : ''}
                                        ${order.taxRate ? `
                             <tr style="background: #fafafa;">
                                 <td colspan="4" style="padding: 8px 10px; text-align: right; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">Impostos (${order.taxRate}%):</td>
                                 <td style="padding: 8px 10px; text-align: right; font-size: 12px; font-weight: 800; color: #0f172a; white-space: nowrap;">R$ ${taxValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                             </tr>` : ''}
                                        <tr style="border-top: 1px solid #cbd5e1; background: #f8fafc;">
                                            <td colspan="4" style="padding: 12px 10px; text-align: right; font-size: 12px; font-weight: 900; color: #334155; text-transform: uppercase;">Total do Orçamento (Arrecadação):</td>
                                            <td style="padding: 12px 10px; text-align: right; font-size: 13px; font-weight: 900; color: #1e40af; white-space: nowrap;">R$ ${revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        </tr>
                                        <tr style="border-top: 3px solid #0f172a; background: #f1f5f9;">
                                            <td colspan="4" style="padding: 16px 10px; text-align: right; font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase;">${reportMode === 'estimated' ? 'Custo Total Estimado de Obra:' : 'Total Realizado em Obra (Medição):'}</td>
                                            <td style="padding: 16px 10px; text-align: right; font-size: 14px; font-weight: 900; color: ${reportMode === 'estimated' ? '#2563eb' : '#e11d48'}; white-space: nowrap;">R$ ${(reportMode === 'estimated' ? plannedCost : totalActualExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        </tr>
                                    </tbody>

                                </table>
                            </div>

                            ${order.descriptionBlocks && order.descriptionBlocks.length > 0 ? `
                <div class="mb-10 print-description-content">
                    <div class="section-title">DESCRIÇÃO TÉCNICA / ESCOPO</div>
                    <div class="space-y-6">
                        ${order.descriptionBlocks.map(block => {
            if (block.type === 'text') {
                return `<div class="text-slate-600 leading-relaxed text-justify ql-editor-print" style="font-size: ${company.descriptionFontSize || 14}px;">${block.content}</div>`;
            } else if (block.type === 'image') {
                return `<div class="avoid-break" style="margin: 20px 0;"><img src="${block.content}" style="width: 100%; max-height: 230mm; border-radius: 12px; border: 1px solid #e2e8f0; display: block; object-fit: contain;"></div>`;
            } else if (block.type === 'page-break') {
                return `<div style="page-break-after: always; break-after: page; height: 0; margin: 0; padding: 0;"></div>`;
            }
            return '';
        }).join('')}
                    </div>
                </div>` : ''}

                            <div style="margin-top: 120px !important;" class="avoid-break pt-24 border-t border-slate-100">
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
                <script>
                    function optimizePageBreaks() {
                        const root = document.querySelector('.print-description-content .space-y-6');
                        if (!root) return;

                        const allNodes = [];
                        Array.from(root.children).forEach(block => {
                            if (block.classList.contains('ql-editor-print')) {
                                allNodes.push(...Array.from(block.children));
                            } else {
                                allNodes.push(block);
                            }
                        });

                        for (let i = 0; i < allNodes.length - 1; i++) {
                            const el = allNodes[i];
                            let isTitle = false;
                            
                            if (el.matches('h1, h2, h3, h4, h5, h6')) isTitle = true;
                            else if (el.tagName === 'P' || el.tagName === 'DIV' || el.tagName === 'STRONG') {
                                const text = el.innerText.trim();
                                const isNumbered = /^\d+[\.\)]/.test(text);
                                const isBold = el.querySelector('strong, b') || (el.style && parseInt(el.style.fontWeight) > 500) || el.tagName === 'STRONG';
                                const isShort = text.length < 150;
                                if ((isNumbered && isBold && isShort) || (isBold && isShort && text === text.toUpperCase() && text.length > 4)) {
                                    isTitle = true;
                                }
                            }

                            if (isTitle) {
                                const nodesToWrap = [el];
                                let j = i + 1;
                                while (j < allNodes.length && nodesToWrap.length < 3) {
                                    const next = allNodes[j];
                                    const nText = next.innerText.trim();
                                    const nextIsTitle = next.matches('h1, h2, h3, h4, h5, h6') || 
                                                        (/^\d+[\.\)]/.test(nText) && (next.querySelector('strong, b') || nText === nText.toUpperCase()));
                                    if (nextIsTitle) break;
                                    nodesToWrap.push(next);
                                    j++;
                                }

                                if (nodesToWrap.length > 1) {
                                    const wrapper = document.createElement('div');
                                    wrapper.className = 'keep-together';
                                    el.parentNode.insertBefore(wrapper, el);
                                    nodesToWrap.forEach(node => wrapper.appendChild(node));
                                    i = j - 1;
                                }
                            }
                        }
                    }
                    window.onload = function() { 
                        optimizePageBreaks();
                        setTimeout(() => { window.print(); window.close(); }, 2000); 
                    }
                </script>
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
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-0.5">{editingOrderId ? `Editando Obra ${editingOrderId} ` : 'Nova OS de Obra'}</h3>
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
                                            <div>
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Observações Técnicas e Escopo Detalhado</label>
                                                <RichTextEditor
                                                    value={diagnosis}
                                                    onChange={setDiagnosis}
                                                    placeholder="Descreva os serviços a serem executados por extenso..."
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 grow mr-6">FOTOS E ANEXOS DA OBRA</h4>
                                            </div>
                                            {descriptionBlocks.length === 0 && (
                                                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-4 group hover:border-blue-400 transition-colors cursor-pointer" onClick={addTextBlock}>
                                                    <div className="flex gap-4">
                                                        <button onClick={(e) => { e.stopPropagation(); addTextBlock(); }} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg shadow-blue-100 hover:scale-105 transition-all"><Type className="w-4 h-4" /> + Iniciar com Texto</button>
                                                        <button onClick={(e) => { e.stopPropagation(); addImageBlock(); }} className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg shadow-emerald-100 hover:scale-105 transition-all"><ImageIcon className="w-4 h-4" /> + Iniciar com Imagem</button>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 animate-pulse">Comece a montar o relatório da obra acima</p>
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
                                                        <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2">
                                                            {block.content ? (
                                                                <div className="relative max-w-[200px]"><img src={block.content} className="w-full h-auto rounded-lg shadow-lg" /><button onClick={() => updateBlockContent(block.id, '')} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full"><Trash2 className="w-3 h-3" /></button></div>
                                                            ) : (
                                                                <label className="cursor-pointer flex flex-col items-center gap-1"><Upload className="w-5 h-5 text-blue-500" /><span className="text-[8px] font-black text-slate-400 uppercase">Subir Foto</span><input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(block.id, e)} /></label>
                                                            )}
                                                        </div>
                                                    )}
                                                    <button onClick={() => setDescriptionBlocks(descriptionBlocks.filter(b => b.id !== block.id))} className="absolute -top-2 -right-2 bg-slate-200 text-slate-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                            <InfoCard
                                                label="Valor do Orçamento"
                                                value={<span className="whitespace-nowrap">R$ {contractPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                                                className="bg-white"
                                                icon={<div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>}
                                            />
                                            <InfoCard
                                                label="Despesas Previstas"
                                                value={<span className="whitespace-nowrap">R$ {plannedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                                                className="bg-white"
                                                icon={<div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>}
                                            />
                                            <InfoCard
                                                label="Despesas Reais"
                                                value={<span className="whitespace-nowrap">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                                                className="bg-white"
                                                icon={<div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>}
                                            />
                                            <InfoCard
                                                label="Lucro Previsto"
                                                value={<span className="whitespace-nowrap">R$ {plannedProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                                                className="bg-white"
                                                icon={<div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>}
                                            />
                                            <InfoCard
                                                label="Lucro Real"
                                                value={<span className="whitespace-nowrap">R$ {actualProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                                                className={actualProfit >= 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}
                                                icon={<div className={`absolute top-0 left-0 w-full h-1 ${actualProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>}
                                                labelClassName={actualProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}
                                                valueClassName={actualProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}
                                            />
                                        </div>

                                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                            <div className="flex justify-between items-center mb-4"><h1 className="text-xs font-black text-slate-900 uppercase tracking-tight">1. Planejamento de Custos e Acompanhamento</h1></div>
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                                                <div className="md:col-span-3"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Descrição</label><input type="text" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none" value={currentDesc} onChange={e => setCurrentDesc(e.target.value)} placeholder="Ex: Tinta, Cimento..." /></div>
                                                <div className="md:col-span-1 text-center"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Qtd Est.</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none text-center" value={currentQty} onChange={e => setCurrentQty(Number(e.target.value))} /></div>
                                                <div className="md:col-span-1 text-center"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">UN</label><input type="text" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none text-center" value={currentUnit} onChange={e => setCurrentUnit(e.target.value)} placeholder="un" /></div>
                                                <div className="md:col-span-1 text-right"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">VL. PROJ</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none text-right" value={currentPrice} onChange={e => setCurrentPrice(Number(e.target.value))} /></div>
                                                <div className="md:col-span-1 pl-1 relative"><label className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1.5 block ml-1">TOTAL PROJ</label><div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-blue-700 text-right min-h-[42px] flex items-center justify-end whitespace-nowrap">R$ {((currentQty || 0) * (currentPrice || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div><div className="absolute -right-1 top-4 bottom-0 w-[1px] bg-slate-200 hidden md:block"></div></div>

                                                <div className="md:col-span-1 text-center"><label className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1.5 block ml-1">Qtd Real</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none text-center" value={currentActualQty} onChange={e => setCurrentActualQty(Number(e.target.value))} /></div>
                                                <div className="md:col-span-1 text-center"><label className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1.5 block ml-1">UN</label><div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none text-center min-h-[42px] flex items-center justify-center uppercase">{currentUnit || 'un'}</div></div>
                                                <div className="md:col-span-1 text-right"><label className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1.5 block ml-1">VL. REAL</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none text-right" value={currentActualPrice} onChange={e => setCurrentActualPrice(Number(e.target.value))} /></div>
                                                <div className="md:col-span-1 pl-1"><label className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5 block ml-1">TOTAL REAL</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none text-right" value={currentActual || ((currentActualQty || 0) * (currentActualPrice || 0)) || ''} onChange={e => setCurrentActual(e.target.value === '' ? 0 : Number(e.target.value))} /></div>
                                                <div className="md:col-span-1"><button onClick={handleAddItem} className="bg-slate-900 text-white w-full h-[42px] rounded-xl flex items-center justify-center hover:bg-slate-800 transition-colors shadow-lg font-bold"><Plus className="w-5 h-5" /></button></div>
                                            </div>
                                            <div className="mt-6 mb-1 grid grid-cols-12 gap-2 px-3">
                                                <div className="col-span-2"></div>
                                                <div className="col-span-4 text-center border-b border-slate-200 pb-1 mx-2"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PLANEJADO</span></div>
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
                                                            <div className="flex items-center justify-end gap-1" onClick={() => setActiveEditField(`${item.id}-price`)}>
                                                                <span className="text-xs text-blue-600 font-bold">R$</span>
                                                                {activeEditField === `${item.id}-price` ? (
                                                                    <input
                                                                        autoFocus
                                                                        type="number"
                                                                        className="bg-transparent text-xs font-bold text-blue-600 outline-none text-right appearance-none"
                                                                        style={{ width: `${(item.unitPrice.toString().length + 2) * 8}px` }}
                                                                        value={item.unitPrice}
                                                                        onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                                                                        onBlur={() => setActiveEditField(null)}
                                                                    />
                                                                ) : (
                                                                    <span className="text-xs font-bold text-blue-600 text-right cursor-pointer whitespace-nowrap">
                                                                        {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="col-span-1 text-right px-2">
                                                            <span className="text-xs font-bold text-blue-600 whitespace-nowrap">R$ {(item.quantity * item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        </div>

                                                        <div className="col-span-1 pl-1">
                                                            <input type="number" className="w-full bg-transparent text-xs font-bold text-rose-600 outline-none text-center appearance-none" value={item.actualQuantity || 0} onChange={e => updateItem(item.id, 'actualQuantity', Number(e.target.value))} />
                                                        </div>
                                                        <div className="col-span-1 text-center">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{item.unit || 'un'}</span>
                                                        </div>
                                                        <div className="col-span-1">
                                                            <div className="flex items-center justify-end gap-1" onClick={() => setActiveEditField(`${item.id}-actualPrice`)}>
                                                                <span className="text-xs text-amber-700 font-bold">R$</span>
                                                                {activeEditField === `${item.id}-actualPrice` ? (
                                                                    <input
                                                                        autoFocus
                                                                        type="number"
                                                                        className="bg-transparent text-xs font-bold text-amber-700 outline-none text-right appearance-none"
                                                                        style={{ width: `${((item.actualUnitPrice || 0).toString().length + 2) * 8}px` }}
                                                                        value={item.actualUnitPrice || 0}
                                                                        onChange={e => updateItem(item.id, 'actualUnitPrice', Number(e.target.value))}
                                                                        onBlur={() => setActiveEditField(null)}
                                                                    />
                                                                ) : (
                                                                    <span className="text-xs font-bold text-amber-700 text-right cursor-pointer whitespace-nowrap">
                                                                        {(item.actualUnitPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="col-span-2 pl-1 text-right px-2">
                                                            <span className="text-xs font-bold text-amber-700 whitespace-nowrap">R$ {((item.actualQuantity || 0) * (item.actualUnitPrice || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                            <button onClick={handleSaveOS} disabled={isSaving} className={`bg-slate-900 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 hover:shadow-2xl transition-all flex items-center justify-center gap-3 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} /> {isSaving ? 'Salvando...' : 'Salvar OS de Obra'}
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