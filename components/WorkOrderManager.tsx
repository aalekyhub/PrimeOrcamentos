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
                @page { size: A4; margin: 10mm 0 15mm 0; }
                body { background: white !important; margin: 0 !important; padding: 0 !important; }
                .a4-container { width: 210mm !important; margin: 0 auto !important; padding: 0 15mm !important; }
            }
        </style>
    `;

    const getContractHtml = (order: ServiceOrder, customer: any) => `
        <div id="contract-content" style="background:#fff; padding: 0; margin: 0;">
          <div class="a4-container">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e2e8f0;">
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
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-bottom: 15px;">
              <div style="background:#f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #dbeafe;">
                <h4 style="font-size:10px; font-weight:900; color:#3b82f6; text-transform:uppercase; letter-spacing:1px; margin:0 0 2mm 0;">CONTRATADA</h4>
                <p style="font-size:14px; font-weight:900; color:#0f172a; text-transform:uppercase; margin:0;">${company.name}</p>
                <p style="font-size:11px; font-weight:600; color:#64748b; margin:1mm 0 0 0;">${company.address || ""}</p>
                <p style="font-size:11px; font-weight:600; color:#64748b; margin:0;">${company.email || ""}</p>
              </div>
              <div style="background:#f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #dbeafe;">
                <h4 style="font-size:10px; font-weight:900; color:#3b82f6; text-transform:uppercase; letter-spacing:1px; margin:0 0 2mm 0;">CONTRATANTE</h4>
                <p style="font-size:14px; font-weight:900; color:#0f172a; text-transform:uppercase; margin:0;">${customer.name}</p>
                <p style="font-size:11px; font-weight:600; color:#64748b; margin:1mm 0 0 0;">${(customer.document || "").replace(/\D/g, "").length <= 11 ? "CPF" : "CNPJ"}: ${customer.document || "N/A"}</p>
                <p style="font-size:11px; font-weight:600; color:#64748b; margin:0;">${customer.address || ""}, ${customer.number || ""} - ${customer.city || ""}</p>
              </div>
            </div>
    
            <!-- Introduction -->
            <div style="margin-bottom: 4mm;">
              <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0;">
                As partes acima identificadas resolvem firmar o presente Contrato de Prestação de Serviços por Empreitada Global, nos termos da legislação civil e previdenciária vigente, mediante as cláusulas e condições seguintes:
              </p>
            </div>
    
            <!-- Clauses -->
            <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
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
    
            <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 2ª – DA FORMA DE EXECUÇÃO</h4>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">2.1. A CONTRATADA executará os serviços com autonomia técnica e gerencial, utilizando meios próprios, inclusive pessoal, ferramentas, equipamentos e métodos de trabalho.</p>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">2.2. Não haverá subordinação, exclusividade, controle de jornada ou disponibilização de trabalhadores ao CONTRATANTE.</p>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">2.3. A CONTRATADA assume integral responsabilidade pela obra e pelos profissionais por ela contratados.</p>
            </div>
    
            <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 3ª – DO PREÇO E FORMA DE PAGAMENTO</h4>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">3.1. Pelos serviços objeto deste contrato, o CONTRATANTE pagará à CONTRATADA o valor global de <b style="color:#0f172a; white-space: nowrap;">R$ ${order.contractPrice && order.contractPrice > 0 ? order.contractPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : order.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>.</p>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">3.2. O pagamento será realizado da seguinte forma: <b>${order.paymentTerms || 'Conforme combinado'}</b>.</p>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">3.3. O valor contratado corresponde a preço fechado por obra certa, não estando vinculado a horas trabalhadas ou número de funcionários.</p>
            </div>
    
            <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 4ª – DAS OBRIGAÇÕES DA CONTRATADA</h4>
                <ul style="list-style-type: none; padding-left: 0; margin: 3mm 0 0 0; font-size:14px; color:#475569; line-height:1.6;">
                    <li>4.1. Executar os serviços conforme escopo contratado e normas técnicas aplicáveis.</li>
                    <li>4.2. Responsabilizar-se por seus empregados quanto a encargos trabalhistas, previdenciários e fiscais.</li>
                    <li>4.3. Manter regularidade fiscal durante a execução do contrato.</li>
                    <li>4.4. Responder por danos causados ao imóvel decorrentes de culpa comprovada.</li>
                </ul>
            </div>
    
            <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 5ª – DAS OBRIGAÇÕES DO CONTRATANTE</h4>
                <ul style="list-style-type: none; padding-left: 0; margin: 3mm 0 0 0; font-size:14px; color:#475569; line-height:1.6;">
                    <li>5.1. Garantir acesso ao local da obra.</li>
                    <li>5.2. Efetuar os pagamentos conforme pactuado.</li>
                    <li>5.3. Providenciar autorizações condominiais, quando exigidas.</li>
                </ul>
            </div>
    
            <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 6ª – DAS RESPONSABILIDADES PREVIDENCIÁRIAS E FISCAIS</h4>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">6.1. O presente contrato caracteriza empreitada total, nos termos da legislação previdenciária vigente, especialmente Lei nº 8.212/91 e IN RFB 2110/2022.</p>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 2mm 0;">6.2. Não se aplica retenção de 11% de INSS, por não se tratar de cessão de mão de obra.</p>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">6.3. A CONTRATADA é responsável pelo recolhimento de tributos incidentes sobre suas atividades.</p>
            </div>
    
            <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 7ª – DO PRAZO</h4>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">7.1. O prazo estimado para execução da obra é de <b>${order.deliveryTime || '15 dias úteis'}</b>, contados do início efetivo dos serviços.</p>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">7.2. O prazo poderá ser prorrogado em caso de: serviços adicionais, atraso de pagamento, impedimento de acesso, ou caso fortuito/força maior.</p>
            </div>
    
            <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 8ª – DA RESPONSABILIDADE TÉCNICA</h4>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0;">8.1. Quando exigido pela natureza dos serviços, será providenciada ART ou RRT por profissional habilitado.</p>
            </div>
  
            <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 9ª – DOS SERVIÇOS ADICIONAIS</h4>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">9.1. Qualquer serviço não previsto no escopo original será considerado extra e dependerá de orçamento complementar e aprovação formal do CONTRATANTE.</p>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">9.2. A execução de serviços adicionais implicará ajuste de prazo e valor mediante termo aditivo.</p>
            </div>
  
            <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 10ª – DA MULTA E INADIMPLEMENTO</h4>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0 0 2mm 0;">10.1. O atraso no pagamento implicará multa de 2% sobre o valor devido, juros de 1% ao mês e correção monetária pelo índice oficial vigente.</p>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:2mm 0 0 0;">10.2. Em caso de rescisão imotivada por parte do CONTRATANTE, será devida multa equivalente a 10% do valor restante do contrato.</p>
            </div>
    
            <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 11ª – DA RESCISÃO</h4>
                <p style="font-size:14px; color:#475569; line-height:1.6; text-align:justify; margin:0;">11.1. O contrato poderá ser rescindido por descumprimento contratual mediante notificação escrita.</p>
            </div>
    
            <div style="margin-bottom: 3.5mm; page-break-inside: avoid; break-inside: avoid-page;">
                <h4 style="font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0 0 3mm 0; padding-top: 2mm; border-bottom: 2px solid #e2e8f0; padding-bottom: 2mm;">CLÁUSULA 12ª – DO FORO</h4>
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
    <body onload="setTimeout(() => { window.print(); window.close(); }, 800);">
        ${getContractHtml(order, customer).replace('crossorigin="anonymous"', '')}
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
                            <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-all">
                                <td className="px-8 py-5 text-xs font-mono font-black text-blue-600">{order.id}</td>
                                <td className="px-8 py-5 text-sm font-black uppercase text-slate-900 dark:text-slate-100">{order.customerName}</td>
                                <td className="px-8 py-5 text-xs font-bold text-slate-400 uppercase">{order.description}</td>
                                <td className="px-8 py-5 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleDownloadPDF(order)} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Baixar Contrato"><FileDown className="w-4 h-4" /></button>
                                    <button onClick={() => handlePrintContract(order)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="Gerar Contrato"><ScrollText className="w-4 h-4" /></button>
                                    <button onClick={() => handlePrintOS(order)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="Imprimir OS"><Printer className="w-4 h-4" /></button>
                                    <button onClick={() => {
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
                                        setContractPrice(order.contractPrice || order.totalAmount || calculatedTotal || 0);
                                        setShowForm(true);
                                    }} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Editar Obra"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={async () => {
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
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-0.5">{editingOrderId ? `Editando Obra ${editingOrderId} ` : 'Nova OS de Obra'}</h3>
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
                                            <div className="flex justify-between items-center mb-2"><label className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest ml-1">Cliente</label><button onClick={() => setShowFullClientForm(true)} className="text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase flex items-center gap-1 hover:underline"><UserPlus className="w-3 h-3" /> Novo</button></div>
                                            <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all custom-select" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}><option value="">Selecione...</option>{customers.map(c => <option key={c.id} value={c.id} className="dark:bg-slate-900">{c.name}</option>)}</select>
                                        </div>
                                        <div><label className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2 block ml-1">Valor Fechado do Contrato (Receita)</label><input type="number" placeholder="R$ 0,00" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500" value={contractPrice} onChange={e => setContractPrice(Number(e.target.value))} /></div>
                                        <div className="md:col-span-2"><label className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2 block ml-1">Título da Obra</label><input type="text" placeholder="Ex: Reforma da Cozinha" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500" value={osTitle} onChange={e => setOsTitle(e.target.value)} /></div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">Observações Técnicas e Escopo Detalhado</label>
                                        <RichTextEditor
                                            value={diagnosis}
                                            onChange={setDiagnosis}
                                            placeholder="Descreva os serviços a serem executados por extenso..."
                                        />
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b dark:border-slate-800 pb-2 grow mr-6">FOTOS E ANEXOS DA OBRA</h4>
                                    </div>
                                    {descriptionBlocks.length === 0 && (
                                        <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-4 group hover:border-blue-400 transition-colors cursor-pointer" onClick={addTextBlock}>
                                            <div className="flex gap-4">
                                                <button onClick={(e) => { e.stopPropagation(); addTextBlock(); }} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg shadow-blue-900/20 hover:scale-105 transition-all"><Type className="w-4 h-4" /> + Iniciar com Texto</button>
                                                <button onClick={(e) => { e.stopPropagation(); addImageBlock(); }} className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg shadow-emerald-900/20 hover:scale-105 transition-all"><ImageIcon className="w-4 h-4" /> + Iniciar com Imagem</button>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mt-2 animate-pulse">Comece a montar o relatório da obra acima</p>
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
                                                        <div className="relative max-w-[200px]"><img src={block.content} className="w-full h-auto rounded-lg shadow-lg" /><button onClick={() => updateBlockContent(block.id, '')} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-lg"><Trash2 className="w-3 h-3" /></button></div>
                                                    ) : (
                                                        <label className="cursor-pointer flex flex-col items-center gap-1"><Upload className="w-5 h-5 text-blue-500" /><span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">Subir Foto</span><input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(block.id, e)} /></label>
                                                    )}
                                                </div>
                                            )}
                                            <button onClick={() => setDescriptionBlocks(descriptionBlocks.filter(b => b.id !== block.id))} className="absolute -top-2 -right-2 bg-slate-200 text-slate-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="w-full lg:w-[380px] bg-slate-50 dark:bg-slate-950 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 p-8 flex flex-col shrink-0 relative overflow-hidden h-auto lg:h-full">
                                <div className="mb-6 p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm text-center relative overflow-hidden">
                                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Valor do Contrato</p>
                                    <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-1 whitespace-nowrap">R$ {contractPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                </div>

                                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 mb-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase">Total de Itens</span>
                                        <span className="text-sm font-black text-slate-900 dark:text-white">{items.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase">Custo Estimado</span>
                                        <span className="text-sm font-black text-slate-900 dark:text-white">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    <button onClick={handleSaveOS} disabled={isSaving} className={`w-full ${isSaving ? 'bg-slate-800 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700'} text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 dark:shadow-none hover:shadow-2xl transition-all flex items-center justify-center gap-3`}>
                                        <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''} `} /> {isSaving ? 'Processando...' : 'Salvar Obra'}
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
        </div>
    );
};

export default WorkOrderManager;