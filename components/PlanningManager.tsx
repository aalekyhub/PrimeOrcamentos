import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import {
    Building2, Users, Truck, HardHat, FileText,
    Plus, Trash2, Save, ChevronRight, Calculator,
    PieChart, ArrowRight, DollarSign, Pencil, Check, X, Printer, Percent, Eye, Archive,
    ChevronUp, ChevronDown, GripVertical
} from 'lucide-react';
import { useNotify } from './ToastProvider';
import { db } from '../services/db';
import ReportPreview from './ReportPreview';
import {
    PlanningHeader, PlannedService, PlannedMaterial,
    PlannedLabor, PlannedIndirect, PlanTax, Customer
} from '../types';

interface Props {
    customers: Customer[];
    onGenerateBudget?: (plan: PlanningHeader, services: PlannedService[], totalMat: number, totalLab: number, totalInd: number) => void;
    embeddedPlanId?: string | null;
    onBack?: () => void;
    onPlanCreated?: (plan: PlanningHeader) => void;
}

const PlanningManager: React.FC<Props> = ({ customers, onGenerateBudget, embeddedPlanId, onBack, onPlanCreated }) => {
    // State
    const [plans, setPlans] = useState<PlanningHeader[]>([]);
    const [activePlanId, setActivePlanId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const { notify } = useNotify();

    // Active Plan Data
    const [currentPlan, setCurrentPlan] = useState<PlanningHeader | null>(null);
    const [services, setServices] = useState<PlannedService[]>([]);
    const [materials, setMaterials] = useState<PlannedMaterial[]>([]);
    const [labor, setLabor] = useState<PlannedLabor[]>([]);
    const [indirects, setIndirects] = useState<PlannedIndirect[]>([]);
    const [taxes, setTaxes] = useState<PlanTax[]>([]);

    // Edit Temp States
    const [editDesc, setEditDesc] = useState('');
    const [editUnit, setEditUnit] = useState('');
    const [editQty, setEditQty] = useState(0);
    const [editPrice1, setEditPrice1] = useState(0); // Material / Unit Price
    const [editPrice2, setEditPrice2] = useState(0); // Labor / Extra

    const [activeTab, setActiveTab] = useState<'dados' | 'servicos' | 'recursos' | 'resumo'>('dados');
    const [resourceTab, setResourceTab] = useState<'material' | 'mo' | 'indireto' | 'impostos'>('material');

    const [draggedSvcIndex, setDraggedSvcIndex] = useState<number | null>(null);
    const [draggedMatIndex, setDraggedMatIndex] = useState<number | null>(null);
    const [draggedLabIndex, setDraggedLabIndex] = useState<number | null>(null);
    const [draggedIndIndex, setDraggedIndIndex] = useState<number | null>(null);

    const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);

    // Preview UI State
    const [showPreview, setShowPreview] = useState(false);
    const [previewContent, setPreviewContent] = useState({ title: '', html: '', filename: '' });

    // Ref to prevent infinite loop on creation
    const creationAttemptedRef = useRef(false);

    // Load plans on mount
    useEffect(() => {
        loadPlans();
    }, []);

    // Effect to handle Embedded Mode
    // Effect to handle Embedded Mode
    useEffect(() => {
        if (embeddedPlanId) {
            if (embeddedPlanId === 'new') {
                if (!creationAttemptedRef.current) {
                    creationAttemptedRef.current = true;
                    handleCreatePlan();
                }
            } else if (plans.length > 0) {
                creationAttemptedRef.current = false; // Reset for future usage
                const plan = plans.find(p => p.id === embeddedPlanId);
                if (plan) {
                    if (activePlanId !== plan.id) {
                        setActivePlanId(plan.id);
                        setCurrentPlan(plan);
                        loadPlanDetails(plan.id);
                    }
                }
            }
        }
    }, [embeddedPlanId, plans, activePlanId]); // Added activePlanId to dependency

    const loadPlans = async () => {
        const localPlans = db.load('serviflow_plans', []) as PlanningHeader[];
        setPlans(localPlans);
    };

    const loadPlanDetails = (planId: string) => {
        // Load sub-items
        const allServices = db.load('serviflow_plan_services', []) as PlannedService[];
        // Filter for this plan
        setServices(allServices.filter(s => s.plan_id === planId));
        const allMaterials = db.load('serviflow_plan_materials', []) as PlannedMaterial[];
        setMaterials(allMaterials.filter(m => m.plan_id === planId));
        const allLabor = db.load('serviflow_plan_labor', []) as PlannedLabor[];
        setLabor(allLabor.filter(l => l.plan_id === planId));
        const allIndirects = db.load('serviflow_plan_indirects', []) as PlannedIndirect[];
        setIndirects(allIndirects.filter(i => i.plan_id === planId));
        const allTaxes = db.load('serviflow_plan_taxes', []) as PlanTax[];
        setTaxes(allTaxes.filter(t => t.plan_id === planId));
    };

    const handleCreatePlan = () => {
        const newPlan: PlanningHeader = {
            id: db.generateId('PLAN'),
            name: 'Nova Obra',
            client_id: '',
            address: '',
            type: 'Reforma',
            status: 'Planejamento',
            created_at: new Date().toISOString()
        };
        // Save to DB immediately to persist? Or just local state?
        // Original code just setPlans. But for unified view to see it if we reload, we might need to save.
        // But usually we save on "Save".
        // Let's keep it local for now, but update the parent.

        if (onPlanCreated) {
            onPlanCreated(newPlan);
        }

        // Use functional state update to prevent race conditions
        setPlans(prev => [newPlan, ...prev]);
        setActivePlanId(newPlan.id);
        setCurrentPlan(newPlan);
        setServices([]);
        setMaterials([]);
        setLabor([]);
        setIndirects([]);
        setTaxes([]);
        setActiveTab('dados');
    };

    const handleSave = async () => {
        if (!currentPlan) return;
        setLoading(true);

        // Calculate Totals
        const totalMat = materials.reduce((acc, m) => acc + (m.total_cost || 0), 0) +
            services.reduce((acc, s) => acc + (s.unit_material_cost * s.quantity), 0); // Simplified aggregation

        // DANGER: Loading list from state 'plans' might be outdated if we just created a new plan 
        // or if multiple tabs are open. Load FRESH from DB before merging.
        const currentLocalPlans = db.load('serviflow_plans', []) as PlanningHeader[];
        const updatedPlans = currentLocalPlans.map(p => p.id === currentPlan.id ? currentPlan : p);

        // If it's a new plan not yet in the DB list, append it
        if (!currentLocalPlans.find(p => p.id === currentPlan.id)) {
            updatedPlans.unshift(currentPlan);
        }

        // Save to DB
        await db.save('serviflow_plans', updatedPlans);

        // Save sub-lists (materials, labor, indirects)
        // Need to load existing ones and merge/replace? 
        // For simplicity in this local-first approach, we load ALL, filter OUT current plan's items, and append NEW ones.
        // This is safer than just overwriting with current state if we had a real backend, but here:

        // 1. Materials
        const allMaterials = db.load('serviflow_plan_materials', []) as PlannedMaterial[];
        const otherMaterials = allMaterials.filter(m => m.plan_id !== currentPlan.id);
        const materialsToSave = [...otherMaterials, ...materials.map(m => ({ ...m, plan_id: currentPlan.id }))];
        await db.save('serviflow_plan_materials', materialsToSave);

        // 2. Labor
        const allLabor = db.load('serviflow_plan_labor', []) as PlannedLabor[];
        const otherLabor = allLabor.filter(l => l.plan_id !== currentPlan.id);
        const laborToSave = [...otherLabor, ...labor.map(l => ({ ...l, plan_id: currentPlan.id }))];
        await db.save('serviflow_plan_labor', laborToSave);

        // 3. Indirects
        const allIndirects = db.load('serviflow_plan_indirects', []) as PlannedIndirect[];
        const otherIndirects = allIndirects.filter(i => i.plan_id !== currentPlan.id);
        const indirectsToSave = [...otherIndirects, ...indirects.map(i => ({ ...i, plan_id: currentPlan.id }))];
        await db.save('serviflow_plan_indirects', indirectsToSave);

        // 4. Taxes
        const allTaxes = db.load('serviflow_plan_taxes', []) as PlanTax[];
        const otherTaxes = allTaxes.filter(t => t.plan_id !== currentPlan.id);
        const taxesToSave = [...otherTaxes, ...taxes.map(t => ({ ...t, plan_id: currentPlan.id }))];
        await db.save('serviflow_plan_taxes', taxesToSave);

        // Also update Services correctly (filter out old, add new)
        const allServices = db.load('serviflow_plan_services', []) as PlannedService[];
        const otherServices = allServices.filter(s => s.plan_id !== currentPlan.id);
        const servicesToSave = [...otherServices, ...services.map(s => ({ ...s, plan_id: currentPlan.id }))];
        await db.save('serviflow_plan_services', servicesToSave);

        // Update local state so the list reflects changes immediately
        setPlans(updatedPlans);

        notify("Planejamento salvo com sucesso!", "success");
        setLoading(false);
    };

    const handleDeleteService = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

        const updatedServices = services.filter(s => s.id !== id);
        setServices(updatedServices);

        await db.remove('serviflow_plan_services', id);

        if (currentPlan) {
            const allServices = db.load('serviflow_plan_services', []) as PlannedService[];
            const otherServices = allServices.filter(s => s.plan_id !== currentPlan.id);
            const servicesToSave = [...otherServices, ...updatedServices];
            await db.save('serviflow_plan_services', servicesToSave);
        }
        notify("Serviço excluído", "success");
    };

    const handleDeleteMaterial = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este material?')) return;

        const updatedMaterials = materials.filter(m => m.id !== id);
        setMaterials(updatedMaterials);

        await db.remove('serviflow_plan_materials', id);

        if (currentPlan) {
            const allMaterials = db.load('serviflow_plan_materials', []) as PlannedMaterial[];
            const otherMaterials = allMaterials.filter(m => m.plan_id !== currentPlan.id);
            const materialsToSave = [...otherMaterials, ...updatedMaterials];
            await db.save('serviflow_plan_materials', materialsToSave);
        }
        notify("Material excluído", "success");
    };

    const handleDeleteLabor = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este item de mão de obra?')) return;

        const updatedLabor = labor.filter(l => l.id !== id);
        setLabor(updatedLabor);

        await db.remove('serviflow_plan_labor', id);

        if (currentPlan) {
            const allLabor = db.load('serviflow_plan_labor', []) as PlannedLabor[];
            const otherLabor = allLabor.filter(l => l.plan_id !== currentPlan.id);
            const laborToSave = [...otherLabor, ...updatedLabor];
            await db.save('serviflow_plan_labor', laborToSave);
        }
        notify("Mão de obra excluída", "success");
    };

    const handleDeleteIndirect = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este custo indireto?')) return;

        const updatedIndirects = indirects.filter(i => i.id !== id);
        setIndirects(updatedIndirects);

        await db.remove('serviflow_plan_indirects', id);

        if (currentPlan) {
            const allIndirects = db.load('serviflow_plan_indirects', []) as PlannedIndirect[];
            const otherIndirects = allIndirects.filter(i => i.plan_id !== currentPlan.id);
            const indirectsToSave = [...otherIndirects, ...updatedIndirects];
            await db.save('serviflow_plan_indirects', indirectsToSave);
        }
        notify("Custo indireto excluído", "success");
    };

    const handleDeleteTax = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este imposto?')) return;

        const updatedTaxes = taxes.filter(t => t.id !== id);
        setTaxes(updatedTaxes);

        await db.remove('serviflow_plan_taxes', id);

        if (currentPlan) {
            const allTaxes = db.load('serviflow_plan_taxes', []) as PlanTax[];
            const otherTaxes = allTaxes.filter(t => t.plan_id !== currentPlan.id);
            const taxesToSave = [...otherTaxes, ...updatedTaxes];
            await db.save('serviflow_plan_taxes', taxesToSave);
        }
        notify("Imposto excluído", "success");
    };


    const generateFullReportHtml = () => {
        if (!currentPlan) return '';

        const customer = customers.find(c => c.id === currentPlan.client_id);
        const company = db.load('serviflow_company', {
            name: 'PRIME SERVIÇOS E MANUTENÇÃO LTDA',
            logo: '',
            cnpj: '12.345.678/0001-90',
            phone: '',
            email: '',
            address: ''
        });

        // Use component-level calculated values to ensure consistency with UI
        // These values (totalServices, totalMaterial, etc.) are already calculated in the component body
        // and include correct tax logic (BDI, Gross Up).
        // note: variable names in component are 'totalMaterial' (singular) vs 'totalMaterials' (plural) in this function
        // so we need to map them correctly or just use the component variables directly if they are in scope.

        // However, this function shadows them with local variables. Let's REMOVE local declarations 
        // and use the component state/memo values directly.

        // The component uses:
        // totalServices
        // totalMaterial (singular)
        // totalLabor
        // totalIndirect
        // totalTaxes (calculated with Gross Up) 
        // totalGeneral (calculated with Gross Up)

        // Let's alias them to match the function's expected names or update the usage.
        const totalMaterials = totalMaterial; // Alias component's singular to local plural
        // totalServices, totalLabor, totalIndirect are same/similar.
        // totalTaxes and totalGeneral from component scope are what we want.

        return `
            <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                    <tr>
                        <td style="padding: 0;">
                           <div class="a4-container" style="padding-bottom: 10px !important; border-bottom: 2px solid #e2e8f0; margin-bottom: 10px;">
                                <div style="display: flex; justify-content: space-between; align-items: start;">
                                    <div>
                                        <h1 style="margin: 0; color: #1e40af; font-size: 26px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em;">Planejamento Executivo de Obra</h1>
                                        <p style="margin: 5px 0 0 0; color: #3b82f6; font-size: 16px; font-weight: 700;">${currentPlan.name.toUpperCase()}</p>
                                    </div>
                                    <div style="text-align: right;">
                                        <p style="margin: 0; color: #94a3b8; font-size: 10px; font-weight: 800; text-transform: uppercase;">Emissão: ${new Date().toLocaleDateString('pt-BR')}</p>
                                        <p style="margin: 5px 0 0 0; color: #475569; font-size: 11px;">ID: ${currentPlan.id}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="a4-container">
                                <!-- INFO GRID -->
                                <div style="display: flex; flex-wrap: wrap; gap: 24px; margin-bottom: 32px; background: #f1f5f9; padding: 24px; border-radius: 8px; border-bottom: 2px solid #cbd5e1; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                                    <div style="flex: 1; min-width: 200px;">
                                        <p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Cliente</p>
                                        <p style="margin: 0; font-size: 14px; color: #0f172a; font-weight: 700;">${customer?.name || 'Não Informado'}</p>
                                    </div>
                                    <div style="flex: 1; min-width: 200px;">
                                        <p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Tipo de Obra</p>
                                        <p style="margin: 0; font-size: 14px; color: #0f172a; font-weight: 700;">${currentPlan.type}</p>
                                    </div>
                                    <div style="width: 100%;">
                                        <p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Endereço Previsto</p>
                                        <p style="margin: 0; font-size: 14px; color: #0f172a; font-weight: 700;">${currentPlan.address || 'Não Informado'}</p>
                                    </div>
                                </div>

                                <!-- COLORFUL UI CARDS (Print Version) -->
                                <div style="display: flex; gap: 16px; margin-bottom: 20px;">
                                    <!-- Materials (Green) -->
                                    ${totalMaterials > 0 ? `
                                    <div style="flex: 1; min-width: 140px; background: #ecfdf5; border-bottom: 3px solid #10b981; border-radius: 8px; padding: 16px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                            <span style="font-size: 9px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.05em;">Materiais</span>
                                            <div style="background: #d1fae5; padding: 4px; border-radius: 4px;">
                                                <span style="color: #059669; font-size: 10px; font-weight: 800;">M</span>
                                            </div>
                                        </div>
                                        <span style="font-size: 18px; font-weight: 800; color: #064e3b; display: block;">R$ ${totalMaterials.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    ` : ''}

                                    <!-- Labor (Amber) -->
                                    ${totalLabor > 0 ? `
                                    <div style="flex: 1; min-width: 140px; background: #fffbeb; border-bottom: 3px solid #f59e0b; border-radius: 8px; padding: 16px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                            <span style="font-size: 9px; font-weight: 700; color: #d97706; text-transform: uppercase; letter-spacing: 0.05em;">Mão de Obra</span>
                                            <div style="background: #fef3c7; padding: 4px; border-radius: 4px;">
                                                <span style="color: #d97706; font-size: 10px; font-weight: 800;">MO</span>
                                            </div>
                                        </div>
                                        <span style="font-size: 18px; font-weight: 800; color: #78350f; display: block;">R$ ${totalLabor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    ` : ''}

                                    <!-- Indirects (Slate) -->
                                    ${totalIndirect > 0 ? `
                                    <div style="flex: 1; min-width: 140px; background: #f8fafc; border-bottom: 3px solid #94a3b8; border-radius: 8px; padding: 16px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                            <span style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Indiretos</span>
                                            <div style="background: #e2e8f0; padding: 4px; border-radius: 4px;">
                                                <span style="color: #475569; font-size: 10px; font-weight: 800;">I</span>
                                            </div>
                                        </div>
                                        <span style="font-size: 18px; font-weight: 800; color: #1e293b; display: block;">R$ ${totalIndirect.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    ` : ''}

                                    <!-- Taxes (Blue) - Conditional Render -->
                                    ${totalTaxes > 0 ? `
                                    <div style="flex: 1; min-width: 140px; background: #eff6ff; border-bottom: 3px solid #3b82f6; border-radius: 8px; padding: 16px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                            <span style="font-size: 9px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.05em;">Impostos</span>
                                            <div style="background: #dbeafe; padding: 4px; border-radius: 4px;">
                                                <span style="color: #2563eb; font-size: 10px; font-weight: 800;">%</span>
                                            </div>
                                        </div>
                                        <span style="font-size: 18px; font-weight: 800; color: #1e3a8a; display: block;">R$ ${totalTaxes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    ` : ''}
                                </div>

                                <!-- TOTAL COST FOOTER CARD -->
                                <div style="margin-bottom: 32px; background: #064e3b; color: white; padding: 12px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                                    <p style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; color: #a7f3d0;">CUSTO TOTAL PREVISTO</p>
                                    <p style="font-size: 22px; font-weight: 800; margin: 0;">R$ ${totalGeneral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                
                                <!-- SEÇÃO SERVIÇOS -->
                                ${services.length > 0 ? `
                                <div style="margin-bottom: 40px;">
                                    <h3 style="font-size: 14px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 20px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">1. Serviços Planejados</h3>
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <thead>
                                            <tr>
                                                <th style="padding: 12px 0; text-align: left; font-size: 10px; color: #64748b; border-bottom: 2px solid #e2e8f0;">DESCRIÇÃO</th>
                                                <th style="padding: 12px 0; text-align: center; font-size: 10px; color: #64748b; width: 60px; border-bottom: 2px solid #e2e8f0;">QTD</th>
                                                <th style="padding: 12px 0; text-align: center; font-size: 10px; color: #64748b; width: 40px; border-bottom: 2px solid #e2e8f0;">UND</th>
                                                <th style="padding: 12px 0; text-align: right; font-size: 10px; color: #64748b; width: 120px; border-bottom: 2px solid #e2e8f0;">TOTAL</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${services.map(s => `
                                                <tr>
                                                    <td style="padding: 12px 0; font-size: 11px; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${s.description}</td>
                                                    <td style="padding: 12px 0; font-size: 11px; text-align: center; border-bottom: 1px solid #f1f5f9;">${s.quantity}</td>
                                                    <td style="padding: 12px 0; font-size: 11px; text-align: center; border-bottom: 1px solid #f1f5f9;">${s.unit}</td>
                                                    <td style="padding: 12px 0; font-size: 11px; text-align: right; font-weight: 700; border-bottom: 1px solid #f1f5f9;">R$ ${s.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                ` : ''}
                
                                <!-- SEÇÃO MATERIAIS -->
                                ${materials.length > 0 ? `
                                <div style="margin-bottom: 40px;">
                                    <h3 style="font-size: 14px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 20px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">2. Insumos e Materiais</h3>
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <thead>
                                            <tr>
                                                <th style="padding: 12px 0; text-align: left; font-size: 10px; color: #64748b; border-bottom: 2px solid #e2e8f0;">MATERIAL</th>
                                                <th style="padding: 12px 0; text-align: center; font-size: 10px; color: #64748b; width: 60px; border-bottom: 2px solid #e2e8f0;">QTD</th>
                                                <th style="padding: 12px 0; text-align: center; font-size: 10px; color: #64748b; width: 40px; border-bottom: 2px solid #e2e8f0;">UND</th>
                                                <th style="padding: 12px 0; text-align: right; font-size: 10px; color: #64748b; width: 120px; border-bottom: 2px solid #e2e8f0;">VALOR</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${materials.map(m => `
                                                <tr>
                                                    <td style="padding: 12px 0; font-size: 11px; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${m.material_name}</td>
                                                    <td style="padding: 12px 0; font-size: 11px; text-align: center; border-bottom: 1px solid #f1f5f9;">${m.quantity}</td>
                                                    <td style="padding: 12px 0; font-size: 11px; text-align: center; border-bottom: 1px solid #f1f5f9;">${m.unit}</td>
                                                    <td style="padding: 12px 0; font-size: 11px; text-align: right; font-weight: 700; border-bottom: 1px solid #f1f5f9;">R$ ${m.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                ` : ''}
                
                                <!-- SEÇÃO MÃO DE OBRA -->
                                ${labor.length > 0 ? `
                                <div style="margin-bottom: 40px;">
                                    <h3 style="font-size: 14px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 20px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">3. Recursos Humanos / Mão de Obra</h3>
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <thead>
                                            <tr>
                                                <th style="padding: 12px 0; text-align: left; font-size: 10px; color: #64748b; border-bottom: 2px solid #e2e8f0;">FUNÇÃO / TIPO</th>
                                                <th style="padding: 12px 0; text-align: center; font-size: 10px; color: #64748b; width: 60px; border-bottom: 2px solid #e2e8f0;">QTD</th>
                                                <th style="padding: 12px 0; text-align: center; font-size: 10px; color: #64748b; width: 80px; border-bottom: 2px solid #e2e8f0;">UND</th>
                                                <th style="padding: 12px 0; text-align: right; font-size: 10px; color: #64748b; width: 120px; border-bottom: 2px solid #e2e8f0;">CUSTO TOTAL</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${labor.map(l => `
                                                <tr>
                                                    <td style="padding: 12px 0; font-size: 11px; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${l.role} | (${l.cost_type})</td>
                                                    <td style="padding: 12px 0; font-size: 11px; text-align: center; border-bottom: 1px solid #f1f5f9;">${l.quantity}</td>
                                                    <td style="padding: 12px 0; font-size: 11px; text-align: center; border-bottom: 1px solid #f1f5f9;">${l.unit || '-'}</td>
                                                    <td style="padding: 12px 0; font-size: 11px; text-align: right; font-weight: 700; border-bottom: 1px solid #f1f5f9;">R$ ${l.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                ` : ''}
                
                                <!-- SEÇÃO CUSTOS INDIRETOS -->
                                ${indirects.length > 0 ? `
                                <div style="margin-bottom: 40px;">
                                    <h3 style="font-size: 14px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 20px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">4. Custos Indiretos e Operacionais</h3>
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <thead>
                                            <tr>
                                                <th style="padding: 12px 0; text-align: left; font-size: 10px; color: #64748b; border-bottom: 2px solid #e2e8f0;">CATEGORIA</th>
                                                <th style="padding: 12px 0; text-align: left; font-size: 10px; color: #64748b; border-bottom: 2px solid #e2e8f0;">DESCRIÇÃO</th>
                                                <th style="padding: 12px 0; text-align: right; font-size: 10px; color: #64748b; width: 120px; border-bottom: 2px solid #e2e8f0;">VALOR</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${indirects.map(i => `
                                                <tr>
                                                    <td style="padding: 12px 0; font-size: 11px; font-weight: 600; color: #64748b; border-bottom: 1px solid #f1f5f9;">${i.category}</td>
                                                    <td style="padding: 12px 0; font-size: 11px; border-bottom: 1px solid #f1f5f9;">${i.description}</td>
                                                    <td style="padding: 12px 0; font-size: 11px; text-align: right; font-weight: 700; border-bottom: 1px solid #f1f5f9;">R$ ${i.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                ` : ''}
                

                            </div>
                        </td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td style="padding: 0;">
                            <div class="a4-container" style="padding-top: 20px !important; border-top: 1px solid #e2e8f0; margin-top: 20px; text-align: center;">
                                <p style="margin: 0; font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.2em; font-weight: 700;">Este documento é um planejamento estimativo da execução da obra.</p>
                                <p style="margin: 10px 0 0 0; font-size: 10px; color: #64748b; font-weight: 800;">${company.name.toUpperCase()} - PLANEJAMENTO DE OBRAS</p>
                            </div>
                        </td>
                    </tr>
                </tfoot>
            </table>
        `;
    };

    const handlePrintFull = () => {
        if (!currentPlan) return;
        const html = generateFullReportHtml();
        const element = document.createElement('div');
        element.style.position = 'absolute';
        element.style.left = '-10000px';
        element.style.top = '0';
        element.style.width = '210mm';
        element.style.background = 'white';
        element.style.zIndex = '1';
        element.style.opacity = '1';
        element.innerHTML = html;
        document.body.appendChild(element);

        // Ensure all images are loaded
        const images = Array.from(element.querySelectorAll('img'));
        const imagePromises = images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
            });
        });

        Promise.all(imagePromises).finally(() => {
            setTimeout(() => {
                const opt = {
                    margin: [10, 10, 10, 10] as [number, number, number, number],
                    filename: `Planejamento_Obra_${currentPlan.name.replace(/\s+/g, '_')}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 } as any,
                    html2canvas: {
                        scale: 3,
                        useCORS: true,
                        letterRendering: true,
                        scrollX: 0,
                        scrollY: 0,
                        windowWidth: 794,
                        windowHeight: element.scrollHeight
                    },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } as any,
                    pagebreak: { mode: ['css', 'legacy'] }
                };

                // @ts-ignore
                html2pdf().set(opt).from(element).save().then(() => {
                    if (document.body.contains(element)) document.body.removeChild(element);
                }).catch((err: any) => {
                    console.error("PDF Error:", err);
                    if (document.body.contains(element)) document.body.removeChild(element);
                });
            }, 2000);
        });
    };

    const handlePreviewFull = () => {
        if (!currentPlan) return;
        setPreviewContent({
            title: 'Planejamento Executivo de Obra',
            html: generateFullReportHtml(),
            filename: `Planejamento_${currentPlan.name.replace(/\s+/g, '_')}.pdf`
        });
        setShowPreview(true);
    };

    // Calculations
    const totalServices = useMemo(() => services.reduce((acc, s) => acc + s.total_cost, 0), [services]);
    const totalMaterial = useMemo(() => materials.reduce((acc, i) => acc + i.total_cost, 0), [materials]);
    const totalLabor = useMemo(() => labor.reduce((acc, i) => acc + i.total_cost, 0), [labor]);
    const totalIndirect = useMemo(() => indirects.reduce((acc, i) => acc + i.value, 0), [indirects]);

    // Calculate Taxes
    const totalDirect = totalServices + totalMaterial + totalLabor + totalIndirect;

    // Separate BDI as the first layer of calculation
    const bdiTax = useMemo(() => taxes.find(t => t.name === 'BDI'), [taxes]);
    const otherTaxes = useMemo(() => taxes.filter(t => t.name !== 'BDI'), [taxes]);

    const bdiValue = useMemo(() => {
        if (!bdiTax) return 0;
        return bdiTax.rate > 0 ? (totalDirect * (bdiTax.rate / 100)) : bdiTax.value;
    }, [bdiTax, totalDirect]);

    // Líquido Desejado = Custo Direto + BDI
    const desiredLiquid = totalDirect + bdiValue;

    // Fator de Gross Up (1 - soma das alíquotas das outras taxas)
    const taxFactor = useMemo(() => {
        const sumRates = otherTaxes.reduce((acc, t) => acc + (t.rate > 0 ? (t.rate / 100) : 0), 0);
        return Math.max(0.01, 1 - sumRates); // Evita divisão por zero
    }, [otherTaxes]);

    // Total Geral (Nota Fiscal) = (Líquido + Taxas Fixas) / Fator
    const totalGeneral = useMemo(() => {
        const sumFixed = otherTaxes.reduce((acc, t) => acc + (t.rate > 0 ? 0 : t.value), 0);
        return (desiredLiquid + sumFixed) / taxFactor;
    }, [desiredLiquid, otherTaxes, taxFactor]);

    const totalTaxes = useMemo(() => totalGeneral - totalDirect, [totalGeneral, totalDirect]);

    if (embeddedPlanId && !currentPlan) {
        return <div className="p-10 text-center text-slate-500">Carregando planejamento...</div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto p-6">
            {/* Header / List */}
            {(!activePlanId && !embeddedPlanId) ? (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-slate-800">Planejamento de Obras</h1>
                        <button onClick={handleCreatePlan} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
                            <Plus size={20} /> Nova Obra
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {plans.map(plan => (
                            <div key={plan.id}
                                className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-blue-400 transition-all group relative">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-lg text-slate-800">{plan.name}</span>
                                    <span className={`px - 2 py - 1 rounded text - xs font - bold ${plan.status === 'Concluído' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'} `}>
                                        {plan.status}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 mb-4">{plan.type}</p>
                                <div className="flex justify-between text-xs text-slate-400 mb-4">
                                    <span>{new Date(plan.created_at).toLocaleDateString()}</span>
                                    <span>ID: {plan.id}</span>
                                </div>
                                <div className="pt-4 border-t border-slate-100 flex justify-end">
                                    <button
                                        onClick={() => { setActivePlanId(plan.id); setCurrentPlan(plan); }}
                                        className="text-blue-600 font-bold text-sm bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors w-full"
                                    >
                                        Editar Planejamento
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-xl min-h-[80vh] flex flex-col">
                    {/* Fixed Editor Header & Tabs & Forms */}
                    <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
                        {/* Editor Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50 rounded-t-2xl">
                            <div className="flex items-center gap-4">
                                {!embeddedPlanId && (
                                    <button onClick={() => setActivePlanId(null)} className="text-blue-400 hover:text-blue-600">
                                        <ArrowRight className="rotate-180" />
                                    </button>
                                )}
                                <div>
                                    <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                                        <HardHat className="text-blue-600" />
                                        {currentPlan?.name}
                                    </h2>
                                    <p className="text-xs text-blue-600 uppercase tracking-widest font-semibold">{currentPlan?.type} • PLANEJAMENTO DE CUSTO</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-blue-700 shadow-md">
                                    <Save size={16} /> Salvar
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex px-6 bg-white overflow-x-auto">
                            {[
                                { id: 'dados', label: 'Dados da Obra', icon: FileText },
                                { id: 'servicos', label: 'Serviços', icon: Building2 },
                                { id: 'recursos', label: 'Gastos Detalhados', icon: Truck },
                                { id: 'resumo', label: 'Resumo de Custo', icon: PieChart },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <tab.icon size={16} /> {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Sub-Header forms for Add (Fixed) */}
                        {activeTab === 'servicos' && (
                            <div className="p-6 border-t border-slate-100 bg-white">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider"><Building2 size={16} /> Adicionar Serviço</h3>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                    <div className="md:col-span-4">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descrição</label>
                                        <input type="text" id="svc_desc" className="w-full p-2 border border-slate-200 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Ex: Pintura de Parede" />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Un</label>
                                        <input type="text" id="svc_unit" className="w-full p-2 border border-slate-200 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="m²" />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Qtd</label>
                                        <input type="number" id="svc_qty" className="w-full p-2 border border-slate-200 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="0" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unit. Mat.</label>
                                        <input type="number" id="svc_mat" className="w-full p-2 border border-slate-200 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="0.00" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unit. M.O.</label>
                                        <input type="number" id="svc_lab" className="w-full p-2 border border-slate-200 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="0.00" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <button
                                            onClick={() => {
                                                const desc = (document.getElementById('svc_desc') as HTMLInputElement).value;
                                                const unit = (document.getElementById('svc_unit') as HTMLInputElement).value;
                                                const qty = parseFloat((document.getElementById('svc_qty') as HTMLInputElement).value) || 0;
                                                const mat = parseFloat((document.getElementById('svc_mat') as HTMLInputElement).value) || 0;
                                                const lab = parseFloat((document.getElementById('svc_lab') as HTMLInputElement).value) || 0;

                                                if (!desc) return notify("Descrição obrigatória", "error");

                                                const newSvc: PlannedService = {
                                                    id: db.generateId('SVC'),
                                                    plan_id: currentPlan?.id || '',
                                                    description: desc.toUpperCase(),
                                                    unit,
                                                    quantity: qty,
                                                    unit_material_cost: mat,
                                                    unit_labor_cost: lab,
                                                    unit_indirect_cost: 0,
                                                    total_cost: qty * (mat + lab)
                                                };
                                                setServices([...services, newSvc]);

                                                // Reset fields
                                                (document.getElementById('svc_desc') as HTMLInputElement).value = '';
                                                (document.getElementById('svc_unit') as HTMLInputElement).value = '';
                                                (document.getElementById('svc_qty') as HTMLInputElement).value = '';
                                                (document.getElementById('svc_mat') as HTMLInputElement).value = '';
                                                (document.getElementById('svc_lab') as HTMLInputElement).value = '';
                                            }}
                                            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold text-xs h-9 flex items-center justify-center gap-1 shadow-sm"
                                        >
                                            <Plus size={14} /> ADICIONAR
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'recursos' && (
                            <div className="px-6 pb-4 border-t border-slate-100 bg-white">
                                <div className="flex gap-1.5 my-3 justify-center">
                                    {[{ id: 'material', label: 'Materiais' }, { id: 'mo', label: 'Mão de Obra' }, { id: 'indireto', label: 'Indiretos' }, { id: 'impostos', label: 'Impostos' }].map(r => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => setResourceTab(r.id as any)}
                                            className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all uppercase tracking-wider ${resourceTab === r.id ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:bg-blue-50'
                                                }`}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    {resourceTab === 'material' && (
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                            <div className="md:col-span-5">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Material</label>
                                                <input type="text" id="mat_name" className="w-full p-2 border border-slate-200 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Ex: Cimento CP-II" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Qtd</label>
                                                <input type="number" id="mat_qty" className="w-full p-2 border border-slate-200 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="0" />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Und</label>
                                                <input type="text" id="mat_unit" className="w-full p-2 border border-slate-200 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="un" />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Custo Unit.</label>
                                                <input type="number" id="mat_cost" className="w-full p-2 border border-slate-200 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="0.00" />
                                            </div>
                                            <div className="md:col-span-3">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const name = (document.getElementById('mat_name') as HTMLInputElement).value;
                                                        const qty = parseFloat((document.getElementById('mat_qty') as HTMLInputElement).value) || 0;
                                                        const unit = (document.getElementById('mat_unit') as HTMLInputElement).value || 'un';
                                                        const cost = parseFloat((document.getElementById('mat_cost') as HTMLInputElement).value) || 0;
                                                        if (!name) return notify("Nome obrigatório", "error");

                                                        setMaterials([...materials, {
                                                            id: db.generateId('MAT'),
                                                            plan_id: currentPlan?.id,
                                                            material_name: name.toUpperCase(),
                                                            unit: unit,
                                                            quantity: qty,
                                                            unit_cost: cost,
                                                            total_cost: qty * cost
                                                        }]);
                                                        (document.getElementById('mat_name') as HTMLInputElement).value = '';
                                                        (document.getElementById('mat_qty') as HTMLInputElement).value = '';
                                                        (document.getElementById('mat_unit') as HTMLInputElement).value = '';
                                                        (document.getElementById('mat_cost') as HTMLInputElement).value = '';
                                                    }}
                                                    className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold text-xs h-9 shadow-sm"
                                                >
                                                    ADICIONAR MATERIAL
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {resourceTab === 'mo' && (
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                            <div className="md:col-span-4">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Função</label>
                                                <input type="text" id="mo_role" className="w-full p-2 border border-slate-200 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Ex: Pedreiro" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo</label>
                                                <select id="mo_type" className="w-full p-2 border border-slate-200 rounded text-sm h-9 outline-none">
                                                    <option value="Diária">Diária</option>
                                                    <option value="Hora">Hora</option>
                                                    <option value="Empreitada">Empreitada</option>
                                                </select>
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Qtd</label>
                                                <input type="number" id="mo_qty" className="w-full p-2 border border-slate-200 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="0" />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">UN</label>
                                                <input type="text" id="mo_unit" className="w-full p-2 border border-slate-200 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="un" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Custo Unit.</label>
                                                <input type="number" id="mo_cost" className="w-full p-2 border border-slate-200 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="0.00" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const role = (document.getElementById('mo_role') as HTMLInputElement).value;
                                                        const type = (document.getElementById('mo_type') as HTMLSelectElement).value;
                                                        const qty = parseFloat((document.getElementById('mo_qty') as HTMLInputElement).value) || 0;
                                                        const unit = (document.getElementById('mo_unit') as HTMLInputElement).value || 'un';
                                                        const cost = parseFloat((document.getElementById('mo_cost') as HTMLInputElement).value) || 0;
                                                        if (!role) return notify("Função obrigatória", "error");

                                                        setLabor([...labor, {
                                                            id: db.generateId('LBR'),
                                                            plan_id: currentPlan?.id,
                                                            role: role.toUpperCase(),
                                                            cost_type: type as any,
                                                            unit: unit,
                                                            quantity: qty,
                                                            unit_cost: cost,
                                                            charges_percent: 0,
                                                            total_cost: qty * cost
                                                        }]);
                                                        (document.getElementById('mo_role') as HTMLInputElement).value = '';
                                                        (document.getElementById('mo_qty') as HTMLInputElement).value = '';
                                                        (document.getElementById('mo_unit') as HTMLInputElement).value = '';
                                                        (document.getElementById('mo_cost') as HTMLInputElement).value = '';
                                                    }}
                                                    className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold text-xs h-9 shadow-sm"
                                                >
                                                    ADICIONAR M.O.
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {resourceTab === 'indireto' && (
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                            <div className="md:col-span-3">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Categoria</label>
                                                <select id="ind_cat" className="w-full p-2 border border-slate-200 rounded text-sm h-9 outline-none">
                                                    <option>Transporte</option>
                                                    <option>Alimentação</option>
                                                    <option>EPI</option>
                                                    <option>Equipamentos</option>
                                                    <option>Taxas</option>
                                                    <option>Outros</option>
                                                </select>
                                            </div>
                                            <div className="md:col-span-6">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descrição</label>
                                                <input type="text" id="ind_desc" className="w-full p-2 border border-slate-200 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Ex: Combustível ida/volta" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Valor</label>
                                                <input type="number" id="ind_val" className="w-full p-2 border border-slate-200 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="0.00" />
                                            </div>
                                            <div className="md:col-span-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const cat = (document.getElementById('ind_cat') as HTMLInputElement).value;
                                                        const desc = (document.getElementById('ind_desc') as HTMLInputElement).value;
                                                        const val = parseFloat((document.getElementById('ind_val') as HTMLInputElement).value) || 0;

                                                        if (!desc) return notify("Descrição obrigatória", "error");

                                                        setIndirects([...indirects, {
                                                            id: db.generateId('IND'),
                                                            plan_id: currentPlan?.id,
                                                            category: cat,
                                                            description: desc.toUpperCase(),
                                                            value: val
                                                        }]);
                                                        (document.getElementById('ind_desc') as HTMLInputElement).value = '';
                                                        (document.getElementById('ind_val') as HTMLInputElement).value = '';
                                                    }}
                                                    className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold text-xs h-9 shadow-sm flex items-center justify-center"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {resourceTab === 'impostos' && (
                                        <div className="space-y-6">
                                            {/* Predefined Taxes Grid */}
                                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                        <Percent size={14} className="text-blue-500" /> Impostos e BDI Padrãonizados
                                                    </h4>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const defaults = [
                                                                { name: 'ISS', rate: 5 },
                                                                { name: 'PIS', rate: 0.65 },
                                                                { name: 'COFINS', rate: 3 },
                                                                { name: 'INSS', rate: 3.5 }
                                                            ];

                                                            let newTaxes = [...taxes];
                                                            defaults.forEach(def => {
                                                                const idx = newTaxes.findIndex(t => t.name === def.name);
                                                                if (idx !== -1) {
                                                                    newTaxes[idx] = { ...newTaxes[idx], rate: def.rate, value: 0 };
                                                                } else {
                                                                    newTaxes.push({
                                                                        id: db.generateId('TAX'),
                                                                        plan_id: currentPlan?.id || '',
                                                                        name: def.name,
                                                                        rate: def.rate,
                                                                        value: 0
                                                                    });
                                                                }
                                                            });
                                                            setTaxes(newTaxes);
                                                            notify("Impostos padrão carregados!", "success");
                                                        }}
                                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-tighter bg-blue-50 px-2 py-1 rounded"
                                                    >
                                                        Carregar Padrão (ISS/PIS/COF/INS)
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                    {[
                                                        { name: 'BDI', label: 'BDI (%)', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                                                        { name: 'ISS', label: 'ISS (%)', color: 'bg-blue-50 text-blue-700 border-blue-100' },
                                                        { name: 'PIS', label: 'PIS (%)', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                                                        { name: 'COFINS', label: 'COFINS (%)', color: 'bg-slate-50 text-slate-700 border-slate-100' },
                                                        { name: 'INSS', label: 'INSS (%)', color: 'bg-orange-50 text-orange-700 border-orange-100' }
                                                    ].map(tax => (
                                                        <div key={tax.name} className={`p - 3 rounded - lg border ${tax.color} `}>
                                                            <label className="block text-[10px] font-bold uppercase mb-1 opacity-70">{tax.label}</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className="w-full bg-white/50 border border-black/5 rounded p-1 text-sm font-bold outline-none focus:ring-2 focus:ring-black/5"
                                                                value={taxes.find(t => t.name === tax.name)?.rate || ''}
                                                                placeholder="0.00"
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    const newTaxes = [...taxes];
                                                                    const idx = newTaxes.findIndex(t => t.name === tax.name);
                                                                    if (idx !== -1) {
                                                                        newTaxes[idx] = { ...newTaxes[idx], rate: val, value: 0 };
                                                                    } else {
                                                                        newTaxes.push({
                                                                            id: db.generateId('TAX'),
                                                                            plan_id: currentPlan?.id || '',
                                                                            name: tax.name,
                                                                            rate: val,
                                                                            value: 0
                                                                        });
                                                                    }
                                                                    setTaxes(newTaxes);
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Custom Tax Form */}
                                            <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Outras Taxas / Impostos Personalizados</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                                    <div className="md:col-span-7">
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome do Item</label>
                                                        <input type="text" id="tax_name" className="w-full p-2 border border-slate-200 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Ex: Taxa Administrativa" />
                                                    </div>
                                                    <div className="md:col-span-3">
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Taxa (%)</label>
                                                        <input
                                                            type="number"
                                                            id="tax_rate"
                                                            className="w-full p-2 border border-slate-200 rounded text-sm h-9 focus:ring-2 focus:ring-blue-100 outline-none"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const name = (document.getElementById('tax_name') as HTMLInputElement).value;
                                                                const rate = parseFloat((document.getElementById('tax_rate') as HTMLInputElement).value) || 0;

                                                                if (!name) return notify("Nome obrigatório", "error");

                                                                setTaxes([...taxes, {
                                                                    id: db.generateId('TAX'),
                                                                    plan_id: currentPlan?.id || '',
                                                                    name: name.toUpperCase(),
                                                                    rate: rate,
                                                                    value: 0
                                                                }]);

                                                                (document.getElementById('tax_name') as HTMLInputElement).value = '';
                                                                (document.getElementById('tax_rate') as HTMLInputElement).value = '';
                                                            }}
                                                            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold text-xs h-9 shadow-sm flex items-center justify-center gap-2"
                                                        >
                                                            <Plus size={16} /> ADICIONAR
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-span-full mt-2">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Detalhamento dos Custos Indiretos / BDI</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {taxes.filter(t => (t.rate > 0 || t.value > 0)).map(t => (
                                                        <div key={t.id} className="bg-white p-3 rounded-lg border border-slate-100 flex justify-between items-center shadow-sm">
                                                            <div>
                                                                <span className="font-black text-xs text-slate-700">{t.name}</span>
                                                                <span className="text-[10px] font-bold text-slate-400 ml-2">
                                                                    {t.rate > 0 ? `${t.rate}% ` : `R$ ${t.value.toFixed(2)} `}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <span className="font-bold text-xs text-blue-600">
                                                                    R$ {(t.rate > 0 ? (t.name === 'BDI' ? totalDirect : totalGeneral) * (t.rate / 100) : t.value).toFixed(2)}
                                                                </span>
                                                                <button onClick={() => handleDeleteTax(t.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {taxes.filter(t => (t.rate > 0 || t.value > 0)).length === 0 && <p className="col-span-full text-center py-4 text-xs text-slate-400 italic">Nenhum custo indireto configurado.</p>}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Helper Functions */}
                    <div className="hidden">
                        {(() => {
                            (window as any).moveItem = (list: any[], setList: Function, index: number, direction: 'up' | 'down') => {
                                const newIndex = direction === 'up' ? index - 1 : index + 1;
                                if (newIndex < 0 || newIndex >= list.length) return;
                                const newList = [...list];
                                [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
                                setList(newList);
                            };
                            (window as any).handleDragOver = (e: React.DragEvent, index: number, draggedIndex: number | null, list: any[], setList: Function, setDraggedIndex: Function) => {
                                e.preventDefault();
                                if (draggedIndex !== null && draggedIndex !== index) {
                                    const newList = [...list];
                                    const draggedItem = newList[draggedIndex];
                                    newList.splice(draggedIndex, 1);
                                    newList.splice(index, 0, draggedItem);
                                    setList(newList);
                                    setDraggedIndex(index);
                                }
                            };
                            return null;
                        })()}
                    </div>


                    {/* Content */}
                    <div className="p-8 flex-1 bg-slate-50/50">
                        {activeTab === 'dados' && currentPlan && (
                            <div className="max-w-2xl mx-auto space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Obra</label>
                                        <input
                                            type="text"
                                            value={currentPlan.name}
                                            onChange={e => setCurrentPlan({ ...currentPlan, name: e.target.value.toUpperCase() })}
                                            className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                                        <select
                                            value={currentPlan.type}
                                            onChange={e => setCurrentPlan({ ...currentPlan, type: e.target.value })}
                                            className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-700"
                                        >
                                            <option>Reforma</option>
                                            <option>Manutenção</option>
                                            <option>Construção</option>
                                            <option>Retrofit</option>
                                            <option>Instalação</option>
                                        </select>
                                    </div>
                                </div>
                                {/* Customer Select */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente</label>
                                    <select
                                        value={currentPlan.client_id}
                                        onChange={e => setCurrentPlan({ ...currentPlan, client_id: e.target.value })}
                                        className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-700"
                                    >
                                        <option value="">Selecione...</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Endereço</label>
                                    <input
                                        type="text"
                                        value={currentPlan.address}
                                        onChange={e => setCurrentPlan({ ...currentPlan, address: e.target.value })}
                                        className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-700"
                                        placeholder="Local da execução"
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'servicos' && (
                            <div className="max-w-4xl mx-auto">

                                <div className="space-y-2">
                                    {services.map((svc, index) => (
                                        <div
                                            key={svc.id}
                                            draggable={editingId !== svc.id}
                                            onDragStart={() => setDraggedSvcIndex(index)}
                                            onDragOver={(e) => (window as any).handleDragOver(e, index, draggedSvcIndex, services, setServices, setDraggedSvcIndex)}
                                            onDragEnd={() => setDraggedSvcIndex(null)}
                                            className={`bg-white p-4 rounded-xl border transition-all flex justify-between items-center group hover:border-blue-300 ${draggedSvcIndex === index ? 'opacity-50 bg-blue-50 border-blue-200 shadow-inner' : 'border-slate-200 shadow-sm'}`}
                                        >
                                            {editingId === svc.id ? (
                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                                                    <div className="md:col-span-4">
                                                        <input
                                                            type="text"
                                                            value={editDesc}
                                                            onChange={e => setEditDesc(e.target.value.toUpperCase())}
                                                            className="w-full p-2 border border-slate-200 rounded text-sm font-bold"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-1">
                                                        <input
                                                            type="text"
                                                            value={editUnit}
                                                            onChange={e => setEditUnit(e.target.value)}
                                                            className="w-full p-2 border border-slate-200 rounded text-sm"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <input
                                                            type="number"
                                                            value={editQty}
                                                            onChange={e => setEditQty(parseFloat(e.target.value) || 0)}
                                                            className="w-full p-2 border border-slate-200 rounded text-sm"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <input
                                                            type="number"
                                                            value={editPrice1}
                                                            onChange={e => setEditPrice1(parseFloat(e.target.value) || 0)}
                                                            className="w-full p-2 border border-slate-200 rounded text-sm"
                                                            placeholder="Mat."
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <input
                                                            type="number"
                                                            value={editPrice2}
                                                            onChange={e => setEditPrice2(parseFloat(e.target.value) || 0)}
                                                            className="w-full p-2 border border-slate-200 rounded text-sm"
                                                            placeholder="M.O."
                                                        />
                                                    </div>
                                                    <div className="md:col-span-1 flex gap-1">
                                                        <button
                                                            onClick={() => {
                                                                const updated = services.map(s => s.id === svc.id ? {
                                                                    ...s,
                                                                    description: editDesc,
                                                                    unit: editUnit,
                                                                    quantity: editQty,
                                                                    unit_material_cost: editPrice1,
                                                                    unit_labor_cost: editPrice2,
                                                                    total_cost: editQty * (editPrice1 + editPrice2)
                                                                } : s);
                                                                setServices(updated);
                                                                setEditingId(null);
                                                            }}
                                                            className="text-green-600 p-1 hover:bg-green-50 rounded"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingId(null)}
                                                            className="text-red-600 p-1 hover:bg-red-50 rounded"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-3 grow">
                                                        <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0">
                                                            <GripVertical size={18} />
                                                        </div>
                                                        <div className="grow">
                                                            <p className="font-bold text-slate-800">{svc.description}</p>
                                                            <p className="text-xs text-slate-500">
                                                                {svc.quantity} {svc.unit} x (Mat: {svc.unit_material_cost.toFixed(2)} + MO: {svc.unit_labor_cost.toFixed(2)})
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right mr-4 shrink-0">
                                                        <p className="text-sm font-bold text-slate-800">R$ {svc.total_cost.toFixed(2)}</p>
                                                    </div>
                                                    <div className="flex gap-1 shrink-0">
                                                        <div className="flex items-center gap-1 mr-2">
                                                            <button onClick={() => (window as any).moveItem(services, setServices, index, 'up')} disabled={index === 0} className="text-slate-300 hover:text-blue-500 disabled:opacity-0 transition-colors"><ChevronUp size={16} /></button>
                                                            <button onClick={() => (window as any).moveItem(services, setServices, index, 'down')} disabled={index === services.length - 1} className="text-slate-300 hover:text-blue-500 disabled:opacity-0 transition-colors"><ChevronDown size={16} /></button>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setEditingId(svc.id);
                                                                setEditDesc(svc.description);
                                                                setEditUnit(svc.unit);
                                                                setEditQty(svc.quantity);
                                                                setEditPrice1(svc.unit_material_cost);
                                                                setEditPrice2(svc.unit_labor_cost);
                                                            }}
                                                            className="text-slate-300 hover:text-blue-500 p-2"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteService(svc.id)}
                                                            className="text-slate-300 hover:text-red-500 p-2"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                    {services.length === 0 && (
                                        <div className="text-center py-10 text-slate-400">Nenhum serviço planejado ainda.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'recursos' && (
                            <div className="max-w-4xl mx-auto space-y-6">
                                {resourceTab === 'material' && (
                                    <div className="space-y-2">
                                        {materials.length > 0 && (
                                            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200 mb-2">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        checked={selectedMaterials.length === materials.length && materials.length > 0}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedMaterials(materials.map(m => m.id));
                                                            } else {
                                                                setSelectedMaterials([]);
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-xs font-semibold text-slate-600">
                                                        {selectedMaterials.length} selecionado(s)
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    {selectedMaterials.length > 0 && (
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm(`Excluir ${selectedMaterials.length} materiais selecionados?`)) {
                                                                    setMaterials(materials.filter(m => !selectedMaterials.includes(m.id)));
                                                                    setSelectedMaterials([]);
                                                                    notify("Materiais removidos!");
                                                                }
                                                            }}
                                                            className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded text-[10px] font-bold hover:bg-red-100 transition-colors border border-red-100"
                                                        >
                                                            <Trash2 size={12} /> Excluir Selecionados
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm("Deseja realmente excluir TODOS os materiais desta lista?")) {
                                                                setMaterials([]);
                                                                setSelectedMaterials([]);
                                                                notify("Lista de materiais limpa!");
                                                            }
                                                        }}
                                                        className="flex items-center gap-1 px-2 py-1 bg-slate-200 text-slate-700 rounded text-[10px] font-bold hover:bg-slate-300 transition-colors"
                                                    >
                                                        <Archive size={12} /> Limpar Lista
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {materials.map((m, index) => (
                                            <div
                                                key={m.id}
                                                draggable={editingId !== m.id}
                                                onDragStart={() => setDraggedMatIndex(index)}
                                                onDragOver={(e) => (window as any).handleDragOver(e, index, draggedMatIndex, materials, setMaterials, setDraggedMatIndex)}
                                                onDragEnd={() => setDraggedMatIndex(null)}
                                                className={`bg-white p-3 rounded-lg border flex justify-between items-center text-sm transition-all ${draggedMatIndex === index ? 'opacity-50 bg-blue-50 border-blue-200 shadow-inner' : (selectedMaterials.includes(m.id) ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200 shadow-sm')}`}
                                            >
                                                {editingId === m.id ? (
                                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 items-center mr-2">
                                                        <div className="md:col-span-5">
                                                            <input
                                                                type="text"
                                                                value={editDesc}
                                                                onChange={e => setEditDesc(e.target.value.toUpperCase())}
                                                                className="w-full p-2 border border-slate-200 rounded text-xs font-bold"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <input
                                                                type="number"
                                                                value={editQty}
                                                                onChange={e => setEditQty(parseFloat(e.target.value) || 0)}
                                                                className="w-full p-2 border border-slate-200 rounded text-xs"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-1">
                                                            <input
                                                                type="text"
                                                                value={editUnit}
                                                                onChange={e => setEditUnit(e.target.value)}
                                                                className="w-full p-2 border border-slate-200 rounded text-xs"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-3">
                                                            <input
                                                                type="number"
                                                                value={editPrice1}
                                                                onChange={e => setEditPrice1(parseFloat(e.target.value) || 0)}
                                                                className="w-full p-2 border border-slate-200 rounded text-xs font-bold"
                                                                placeholder="Custo Unit."
                                                            />
                                                        </div>
                                                        <div className="md:col-span-1 flex gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    const updated = materials.map(item => item.id === m.id ? {
                                                                        ...item,
                                                                        material_name: editDesc,
                                                                        quantity: editQty,
                                                                        unit: editUnit,
                                                                        unit_cost: editPrice1,
                                                                        total_cost: editQty * editPrice1
                                                                    } : item);
                                                                    setMaterials(updated);
                                                                    setEditingId(null);
                                                                }}
                                                                className="text-green-600 p-1 hover:bg-green-50 rounded"
                                                            >
                                                                <Check size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingId(null)}
                                                                className="text-red-600 p-1 hover:bg-red-50 rounded"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center gap-3 grow">
                                                            <input
                                                                type="checkbox"
                                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                                checked={selectedMaterials.includes(m.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedMaterials([...selectedMaterials, m.id]);
                                                                    } else {
                                                                        setSelectedMaterials(selectedMaterials.filter(id => id !== m.id));
                                                                    }
                                                                }}
                                                            />
                                                            <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0">
                                                                <GripVertical size={16} />
                                                            </div>
                                                            <div className="grow">
                                                                <span><b>{m.material_name}</b> | (R$ {m.unit_cost.toFixed(2)}) {m.quantity}{m.unit}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs shrink-0">
                                                            <span className="font-bold">R$ {m.total_cost.toFixed(2)}</span>
                                                            <div className="flex gap-1 mr-2">
                                                                <button onClick={() => (window as any).moveItem(materials, setMaterials, index, 'up')} disabled={index === 0} className="text-slate-300 hover:text-blue-500 disabled:opacity-0 transition-colors"><ChevronUp size={14} /></button>
                                                                <button onClick={() => (window as any).moveItem(materials, setMaterials, index, 'down')} disabled={index === materials.length - 1} className="text-slate-300 hover:text-blue-500 disabled:opacity-0 transition-colors"><ChevronDown size={14} /></button>
                                                            </div>
                                                            <Pencil
                                                                size={14}
                                                                className="cursor-pointer text-slate-400 hover:text-blue-500"
                                                                onClick={() => {
                                                                    setEditingId(m.id);
                                                                    setEditDesc(m.material_name);
                                                                    setEditQty(m.quantity);
                                                                    setEditUnit(m.unit);
                                                                    setEditPrice1(m.unit_cost);
                                                                }}
                                                            />
                                                            <Trash2
                                                                size={14}
                                                                className="cursor-pointer text-slate-400 hover:text-red-500"
                                                                onClick={() => handleDeleteMaterial(m.id)}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {resourceTab === 'mo' && (
                                    <div className="space-y-2">
                                        {labor.map((l, index) => (
                                            <div
                                                key={l.id}
                                                draggable={editingId !== l.id}
                                                onDragStart={() => setDraggedLabIndex(index)}
                                                onDragOver={(e) => (window as any).handleDragOver(e, index, draggedLabIndex, labor, setLabor, setDraggedLabIndex)}
                                                onDragEnd={() => setDraggedLabIndex(null)}
                                                className={`bg-white p-3 rounded-lg border flex justify-between items-center text-sm transition-all ${draggedLabIndex === index ? 'opacity-50 bg-blue-50 border-blue-200 shadow-inner' : 'border-slate-200 shadow-sm'}`}
                                            >
                                                {editingId === l.id ? (
                                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 items-center mr-2">
                                                        <div className="md:col-span-4">
                                                            <input
                                                                type="text"
                                                                value={editDesc}
                                                                onChange={e => setEditDesc(e.target.value.toUpperCase())}
                                                                className="w-full p-2 border border-slate-200 rounded text-xs font-bold"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <select
                                                                value={l.cost_type}
                                                                onChange={e => {
                                                                    const updated = labor.map(item => item.id === l.id ? { ...item, cost_type: e.target.value as any } : item);
                                                                    setLabor(updated);
                                                                }}
                                                                className="w-full p-2 border border-slate-200 rounded text-xs"
                                                            >
                                                                <option value="Diária">Diária</option>
                                                                <option value="Hora">Hora</option>
                                                                <option value="Empreitada">Empreitada</option>
                                                            </select>
                                                        </div>
                                                        <div className="md:col-span-1">
                                                            <input
                                                                type="number"
                                                                value={editQty}
                                                                onChange={e => setEditQty(parseFloat(e.target.value) || 0)}
                                                                className="w-full p-2 border border-slate-200 rounded text-xs"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-1">
                                                            <input
                                                                type="text"
                                                                value={editUnit}
                                                                onChange={e => setEditUnit(e.target.value)}
                                                                placeholder="un"
                                                                className="w-full p-2 border border-slate-200 rounded text-xs"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <input
                                                                type="number"
                                                                value={editPrice1}
                                                                onChange={e => setEditPrice1(parseFloat(e.target.value) || 0)}
                                                                className="w-full p-2 border border-slate-200 rounded text-xs font-bold"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-1 flex gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    const updated = labor.map(item => item.id === l.id ? {
                                                                        ...item,
                                                                        role: editDesc,
                                                                        unit: editUnit,
                                                                        quantity: editQty,
                                                                        unit_cost: editPrice1,
                                                                        total_cost: editQty * editPrice1
                                                                    } : item);
                                                                    setLabor(updated);
                                                                    setEditingId(null);
                                                                }}
                                                                className="text-green-600 p-1 hover:bg-green-50 rounded"
                                                            >
                                                                <Check size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingId(null)}
                                                                className="text-red-600 p-1 hover:bg-red-50 rounded"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center gap-2 grow">
                                                            <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0">
                                                                <GripVertical size={16} />
                                                            </div>
                                                            <div className="grow">
                                                                <span><b>{l.role}</b> | ({l.cost_type}) {l.quantity}{l.unit || 'un'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs shrink-0">
                                                            <span className="font-bold">R$ {l.total_cost.toFixed(2)}</span>
                                                            <div className="flex gap-1 mr-2">
                                                                <button onClick={() => (window as any).moveItem(labor, setLabor, index, 'up')} disabled={index === 0} className="text-slate-300 hover:text-blue-500 disabled:opacity-0 transition-colors"><ChevronUp size={14} /></button>
                                                                <button onClick={() => (window as any).moveItem(labor, setLabor, index, 'down')} disabled={index === labor.length - 1} className="text-slate-300 hover:text-blue-500 disabled:opacity-0 transition-colors"><ChevronDown size={14} /></button>
                                                            </div>
                                                            <Pencil
                                                                size={14}
                                                                className="cursor-pointer text-slate-400 hover:text-blue-500"
                                                                onClick={() => {
                                                                    setEditingId(l.id);
                                                                    setEditDesc(l.role);
                                                                    setEditUnit(l.unit || 'un'); // Now editUnit is the UN field
                                                                    setEditQty(l.quantity);
                                                                    setEditPrice1(l.unit_cost);
                                                                }}
                                                            />
                                                            <Trash2
                                                                size={14}
                                                                className="cursor-pointer text-slate-400 hover:text-red-500"
                                                                onClick={() => handleDeleteLabor(l.id)}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {resourceTab === 'indireto' && (
                                    <div className="space-y-2">
                                        {indirects.map((i, index) => (
                                            <div
                                                key={i.id}
                                                draggable={editingId !== i.id}
                                                onDragStart={() => setDraggedIndIndex(index)}
                                                onDragOver={(e) => (window as any).handleDragOver(e, index, draggedIndIndex, indirects, setIndirects, setDraggedIndIndex)}
                                                onDragEnd={() => setDraggedIndIndex(null)}
                                                className={`bg-white p-3 rounded-lg border flex justify-between items-center text-sm transition-all ${draggedIndIndex === index ? 'opacity-50 bg-blue-50 border-blue-200 shadow-inner' : 'border-slate-200 shadow-sm'}`}
                                            >
                                                {editingId === i.id ? (
                                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 items-center mr-2">
                                                        <div className="md:col-span-3">
                                                            <select
                                                                value={editUnit}
                                                                onChange={e => setEditUnit(e.target.value)}
                                                                className="w-full p-2 border border-slate-200 rounded text-xs"
                                                            >
                                                                <option>Transporte</option>
                                                                <option>Alimentação</option>
                                                                <option>EPI</option>
                                                                <option>Equipamentos</option>
                                                                <option>Taxas</option>
                                                                <option>Outros</option>
                                                            </select>
                                                        </div>
                                                        <div className="md:col-span-6">
                                                            <input
                                                                type="text"
                                                                value={editDesc}
                                                                onChange={e => setEditDesc(e.target.value.toUpperCase())}
                                                                className="w-full p-2 border border-slate-200 rounded text-xs font-bold"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <input
                                                                type="number"
                                                                value={editPrice1}
                                                                onChange={e => setEditPrice1(parseFloat(e.target.value) || 0)}
                                                                className="w-full p-2 border border-slate-200 rounded text-xs font-bold"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-1 flex gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    const updated = indirects.map(item => item.id === i.id ? {
                                                                        ...item,
                                                                        category: editUnit,
                                                                        description: editDesc,
                                                                        value: editPrice1
                                                                    } : item);
                                                                    setIndirects(updated);
                                                                    setEditingId(null);
                                                                }}
                                                                className="text-green-600 p-1 hover:bg-green-50 rounded"
                                                            >
                                                                <Check size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingId(null)}
                                                                className="text-red-600 p-1 hover:bg-red-50 rounded"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center gap-2 grow">
                                                            <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0">
                                                                <GripVertical size={16} />
                                                            </div>
                                                            <div className="grow">
                                                                <span>[{i.category}] <b>{i.description}</b></span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs shrink-0">
                                                            <span className="font-bold">R$ {i.value.toFixed(2)}</span>
                                                            <div className="flex gap-1 mr-2">
                                                                <button onClick={() => (window as any).moveItem(indirects, setIndirects, index, 'up')} disabled={index === 0} className="text-slate-300 hover:text-blue-500 disabled:opacity-0 transition-colors"><ChevronUp size={14} /></button>
                                                                <button onClick={() => (window as any).moveItem(indirects, setIndirects, index, 'down')} disabled={index === indirects.length - 1} className="text-slate-300 hover:text-blue-500 disabled:opacity-0 transition-colors"><ChevronDown size={14} /></button>
                                                            </div>
                                                            <Pencil
                                                                size={14}
                                                                className="cursor-pointer text-slate-400 hover:text-blue-500"
                                                                onClick={() => {
                                                                    setEditingId(i.id);
                                                                    setEditUnit(i.category);
                                                                    setEditDesc(i.description);
                                                                    setEditPrice1(i.value);
                                                                }}
                                                            />
                                                            <Trash2
                                                                size={14}
                                                                className="cursor-pointer text-slate-400 hover:text-red-500"
                                                                onClick={() => handleDeleteIndirect(i.id)}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}


                        {activeTab === 'resumo' && (
                            <div className="max-w-4xl mx-auto">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">

                                    <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200 shadow-sm transition-all hover:shadow-md">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Materiais</span>
                                            <div className="bg-emerald-100 p-1.5 rounded-lg">
                                                <Truck size={16} className="text-emerald-600" />
                                            </div>
                                        </div>
                                        <span className="text-2xl font-black text-emerald-900">R$ {totalMaterial.toFixed(2)}</span>
                                        <p className="text-[10px] text-emerald-600 mt-1 font-medium">Insumos + Materiais de Serviços</p>
                                    </div>

                                    <div className="bg-amber-50 p-6 rounded-xl border border-amber-200 shadow-sm transition-all hover:shadow-md">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Total Mão de Obra</span>
                                            <div className="bg-amber-100 p-1.5 rounded-lg">
                                                <HardHat size={16} className="text-amber-600" />
                                            </div>
                                        </div>
                                        <span className="text-2xl font-black text-amber-900">R$ {totalLabor.toFixed(2)}</span>
                                        <p className="text-[10px] text-amber-600 mt-1 font-medium">Equipe Própria + Terceirizada</p>
                                    </div>

                                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Indiretos</span>
                                            <div className="bg-slate-200 p-1.5 rounded-lg">
                                                <Archive size={16} className="text-slate-600" />
                                            </div>
                                        </div>
                                        <span className="text-2xl font-black text-slate-800">R$ {totalIndirect.toFixed(2)}</span>
                                        <p className="text-[10px] text-slate-500 mt-1 font-medium">Custos Administrativos</p>
                                    </div>

                                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 shadow-sm transition-all hover:shadow-md">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Impostos</span>
                                            <div className="bg-blue-100 p-1.5 rounded-lg">
                                                <Percent size={16} className="text-blue-600" />
                                            </div>
                                        </div>
                                        <span className="text-2xl font-black text-blue-900">R$ {totalTaxes.toFixed(2)}</span>
                                        <p className="text-[10px] text-blue-600 mt-1 font-medium">Baseado no BDI e Taxas</p>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 mb-6">
                                    <button
                                        onClick={handlePreviewFull}
                                        className="bg-white border border-slate-200 text-slate-600 px-6 py-4 rounded-2xl text-base font-black flex items-center gap-4 hover:bg-slate-50 transition-all shadow-md group border-b-4 border-b-blue-600 active:border-b-0 active:translate-y-1"
                                    >
                                        <div className="bg-blue-100 p-2 rounded-xl group-hover:scale-110 transition-transform">
                                            <Eye size={24} className="text-blue-600" />
                                        </div>
                                        <div className="text-left">
                                            <span className="block text-slate-800 leading-none">Visualizar e Gerar PDF</span>
                                            <span className="text-[10px] text-slate-400 uppercase tracking-widest leading-none font-bold">Relatório Completo</span>
                                        </div>
                                    </button>
                                </div>

                                <div className="bg-slate-900 text-white p-8 rounded-2xl flex justify-between items-center shadow-xl">
                                    <div>
                                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Custo Previsto Total</p>
                                        <p className="text-4xl font-bold">R$ {totalGeneral.toFixed(2)}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (onGenerateBudget) {
                                                onGenerateBudget(currentPlan, services, totalMaterial, totalLabor, totalIndirect);
                                            } else {
                                                notify("Função de gerar orçamento não disponível neste modo.", "info");
                                            }
                                        }}
                                        className={`bg - blue - 600 hover: bg - blue - 500 text - white px - 6 py - 3 rounded - xl font - bold shadow - lg flex items - center gap - 2 transition - all transform hover: scale - 105 ${!onGenerateBudget ? 'opacity-50 cursor-not-allowed' : ''} `}
                                    >
                                        <Calculator size={20} /> Gerar Orçamento
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div >
            )
            }
            <ReportPreview
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                title={previewContent.title}
                htmlContent={previewContent.html}
                filename={previewContent.filename}
            />
        </div >
    );
};

export default PlanningManager;
