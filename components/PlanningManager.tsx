import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import {
    Building2, Users, Truck, HardHat, FileText,
    Plus, Trash2, Save, ChevronRight, Calculator,
    PieChart, ArrowRight, DollarSign, Pencil, Check, X, Printer, Percent
} from 'lucide-react';
import { useNotify } from './ToastProvider';
import { db } from '../services/db';
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

    // UI State
    const [activeTab, setActiveTab] = useState<'dados' | 'servicos' | 'recursos' | 'resumo'>('dados');
    const [resourceTab, setResourceTab] = useState<'material' | 'mo' | 'indireto' | 'impostos'>('material');

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


    const handlePrintFull = () => {
        if (!currentPlan) return;

        const customer = customers.find(c => c.id === currentPlan.client_id);
        const totalServices = services.reduce((acc, s) => acc + s.total_cost, 0);

        const printWindow = document.createElement('div');
        printWindow.innerHTML = `
            <div style="font-family: sans-serif; padding: 30px; color: #1e293b; max-width: 800px; margin: 0 auto; background: white;">
                <!-- HEADER -->
                <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px;">
                    <div>
                        <h1 style="margin: 0; color: #1e40af; font-size: 26px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em;">Planejamento Executivo de Obra</h1>
                        <p style="margin: 5px 0 0 0; color: #3b82f6; font-size: 16px; font-weight: 700;">${currentPlan.name.toUpperCase()}</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 0; color: #94a3b8; font-size: 10px; font-weight: 800; text-transform: uppercase;">Emissão: ${new Date().toLocaleDateString('pt-BR')}</p>
                        <p style="margin: 5px 0 0 0; color: #475569; font-size: 11px;">ID: ${currentPlan.id}</p>
                    </div>
                </div>

                <!-- INFO GRID -->
                <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <div>
                        <p style="margin: 0 0 5px 0; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Cliente</p>
                        <p style="margin: 0; font-size: 14px; color: #0f172a; font-weight: 600;">${customer?.name || 'Não Informado'}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 5px 0; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Tipo de Obra</p>
                        <p style="margin: 0; font-size: 14px; color: #0f172a; font-weight: 600;">${currentPlan.type}</p>
                    </div>
                    <div style="grid-column: span 2;">
                        <p style="margin: 0 0 5px 0; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Endereço Previsto</p>
                        <p style="margin: 0; font-size: 14px; color: #0f172a; font-weight: 600;">${currentPlan.address || 'Não Informado'}</p>
                    </div>
                </div>

                <!-- SEÇÃO SERVIÇOS -->
                ${services.length > 0 ? `
                <div style="margin-bottom: 30px;">
                    <h3 style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 15px;">1. Serviços Planejados</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                                <th style="padding: 10px; text-align: left; font-size: 10px; color: #64748b;">DESCRIÇÃO</th>
                                <th style="padding: 10px; text-align: center; font-size: 10px; color: #64748b; width: 60px;">QTD</th>
                                <th style="padding: 10px; text-align: center; font-size: 10px; color: #64748b; width: 40px;">UND</th>
                                <th style="padding: 10px; text-align: right; font-size: 10px; color: #64748b; width: 100px;">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${services.map(s => `
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 10px; font-size: 11px; font-weight: 600;">${s.description}</td>
                                    <td style="padding: 10px; font-size: 11px; text-align: center;">${s.quantity}</td>
                                    <td style="padding: 10px; font-size: 11px; text-align: center;">${s.unit}</td>
                                    <td style="padding: 10px; font-size: 11px; text-align: right; font-weight: 700;">R$ ${s.total_cost.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ` : ''}

                <!-- SEÇÃO MATERIAIS -->
                ${materials.length > 0 ? `
                <div style="margin-bottom: 30px;">
                    <h3 style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 15px;">2. Insumos e Materiais (Previstos)</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                                <th style="padding: 10px; text-align: left; font-size: 10px; color: #64748b;">MATERIAL</th>
                                <th style="padding: 10px; text-align: center; font-size: 10px; color: #64748b; width: 60px;">QTD</th>
                                <th style="padding: 10px; text-align: center; font-size: 10px; color: #64748b; width: 40px;">UND</th>
                                <th style="padding: 10px; text-align: right; font-size: 10px; color: #64748b; width: 100px;">VALOR</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${materials.map(m => `
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 10px; font-size: 11px; font-weight: 600;">${m.material_name}</td>
                                    <td style="padding: 10px; font-size: 11px; text-align: center;">${m.quantity}</td>
                                    <td style="padding: 10px; font-size: 11px; text-align: center;">${m.unit}</td>
                                    <td style="padding: 10px; font-size: 11px; text-align: right; font-weight: 700;">R$ ${m.total_cost.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ` : ''}

                <!-- SEÇÃO MÃO DE OBRA -->
                ${labor.length > 0 ? `
                <div style="margin-bottom: 30px;">
                    <h3 style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 15px;">3. Recursos Humanos / Mão de Obra</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                                <th style="padding: 10px; text-align: left; font-size: 10px; color: #64748b;">FUNÇÃO / TIPO</th>
                                <th style="padding: 10px; text-align: center; font-size: 10px; color: #64748b; width: 60px;">QTD</th>
                                <th style="padding: 10px; text-align: center; font-size: 10px; color: #64748b; width: 80px;">UND</th>
                                <th style="padding: 10px; text-align: right; font-size: 10px; color: #64748b; width: 100px;">CUSTO TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${labor.map(l => `
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 10px; font-size: 11px; font-weight: 600;">${l.role}</td>
                                    <td style="padding: 10px; font-size: 11px; text-align: center;">${l.quantity}</td>
                                    <td style="padding: 10px; font-size: 11px; text-align: center;">${l.cost_type}</td>
                                    <td style="padding: 10px; font-size: 11px; text-align: right; font-weight: 700;">R$ ${l.total_cost.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ` : ''}

                <!-- SEÇÃO CUSTOS INDIRETOS -->
                ${indirects.length > 0 ? `
                <div style="margin-bottom: 30px;">
                    <h3 style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 15px;">4. Custos Indiretos e Operacionais</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                                <th style="padding: 10px; text-align: left; font-size: 10px; color: #64748b;">CATEGORIA</th>
                                <th style="padding: 10px; text-align: left; font-size: 10px; color: #64748b;">DESCRIÇÃO</th>
                                <th style="padding: 10px; text-align: right; font-size: 10px; color: #64748b; width: 120px;">VALOR</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${indirects.map(i => `
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 10px; font-size: 11px; font-weight: 600;">${i.category}</td>
                                    <td style="padding: 10px; font-size: 11px;">${i.description}</td>
                                    <td style="padding: 10px; font-size: 11px; text-align: right; font-weight: 700;">R$ ${i.value.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ` : ''}

                <!-- RESUMO FINANCEIRO FINAL -->
                <div style="margin-top: 20px; page-break-inside: avoid;">
                    <h3 style="font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 20px; text-align: center;">Estimativa de Custo Consolidada</h3>
                    
                    <div style="background: #1e3a8a; color: white; padding: 30px; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                        <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 20px; border-bottom: 1px solid #3b82f6; padding-bottom: 20px; margin-bottom: 20px;">
                            <div>
                                <p style="margin: 0; font-size: 10px; color: #bfdbfe; text-transform: uppercase; letter-spacing: 0.05em;">Total em Serviços</p>
                                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 700;">R$ ${totalServices.toFixed(2)}</p>
                            </div>
                            <div>
                                <p style="margin: 0; font-size: 10px; color: #bfdbfe; text-transform: uppercase; letter-spacing: 0.05em;">Materiais (Adicionais)</p>
                                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 700;">R$ ${materials.reduce((acc, m) => acc + m.total_cost, 0).toFixed(2)}</p>
                            </div>
                            <div>
                                <p style="margin: 0; font-size: 10px; color: #bfdbfe; text-transform: uppercase; letter-spacing: 0.05em;">Mão de Obra (Adicional)</p>
                                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 700;">R$ ${labor.reduce((acc, l) => acc + l.total_cost, 0).toFixed(2)}</p>
                            </div>
                            <div>
                                <p style="margin: 0; font-size: 10px; color: #bfdbfe; text-transform: uppercase; letter-spacing: 0.05em;">Custos Indiretos</p>
                                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 700;">R$ ${totalIndirect.toFixed(2)}</p>
                            </div>
                            <div style="grid-column: span 2; border-top: 1px dashed #3b82f6; pt-4; mt-4">
                                <p style="margin: 0; font-size: 10px; color: #bfdbfe; text-transform: uppercase; letter-spacing: 0.05em;">Impostos / Taxas</p>
                                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 700;">R$ ${totalTaxes.toFixed(2)}</p>
                            </div>
                        </div>
                        
                        <div style="text-align: right;">
                            <p style="margin: 0; font-size: 12px; color: #93c5fd; font-weight: 800; text-transform: uppercase;">Custo Total Previsto</p>
                            <p style="margin: 5px 0 0 0; font-size: 36px; font-weight: 800; color: white;">R$ ${totalGeneral.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                <!-- FOOTER -->
                <div style="margin-top: 60px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                    <p style="margin: 0; font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.2em; font-weight: 700;">Este documento é um planejamento estimativo da execução da obra.</p>
                    <p style="margin: 10px 0 0 0; font-size: 10px; color: #64748b; font-weight: 800;">PRIME ORÇAMENTOS - PLANEJAMENTO DE OBRAS</p>
                </div>
            </div>
        `;

        const opt = {
            margin: [10, 10, 10, 10] as [number, number, number, number],
            filename: `Planejamento_Obra_${currentPlan.name.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 } as any,
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } as any,
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        html2pdf().set(opt).from(printWindow).save();
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
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${plan.status === 'Concluído' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
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
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <div className="flex items-center gap-4">
                                {!embeddedPlanId && (
                                    <button onClick={() => setActivePlanId(null)} className="text-slate-400 hover:text-slate-600">
                                        <ArrowRight className="rotate-180" />
                                    </button>
                                )}
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                        <HardHat className="text-blue-600" />
                                        {currentPlan?.name}
                                    </h2>
                                    <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">{currentPlan?.type} • PLANEJAMENTO DE CUSTO</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleSave} className="px-4 py-2 bg-slate-800 text-white rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-slate-900 shadow-md">
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
                                            className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all uppercase tracking-wider ${resourceTab === r.id ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
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
                                                        <Percent size={14} className="text-blue-500" /> Impostos e BDI Padronizados
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
                                                        <div key={tax.name} className={`p-3 rounded-lg border ${tax.color}`}>
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
                                                                    {t.rate > 0 ? `${t.rate}%` : `R$ ${t.value.toFixed(2)}`}
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
                                    {services.map(svc => (
                                        <div key={svc.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-blue-300">
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
                                                    <div className="flex-1">
                                                        <p className="font-bold text-slate-800">{svc.description}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {svc.quantity} {svc.unit} x (Mat: {svc.unit_material_cost.toFixed(2)} + MO: {svc.unit_labor_cost.toFixed(2)})
                                                        </p>
                                                    </div>
                                                    <div className="text-right mr-4">
                                                        <p className="text-sm font-bold text-slate-800">R$ {svc.total_cost.toFixed(2)}</p>
                                                    </div>
                                                    <div className="flex gap-1">
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
                                        {materials.map(m => (
                                            <div key={m.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center text-sm">
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
                                                        <span><b>{m.material_name}</b> | (R$ {m.unit_cost.toFixed(2)}) {m.quantity}{m.unit}</span>
                                                        <div className="flex items-center gap-4">
                                                            <span className="font-bold">R$ {m.total_cost.toFixed(2)}</span>
                                                            <div className="flex gap-2">
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
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {resourceTab === 'mo' && (
                                    <div className="space-y-2">
                                        {labor.map(l => (
                                            <div key={l.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center text-sm">
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
                                                        <span><b>{l.role}</b> | ({l.cost_type}) {l.quantity}{l.unit || 'un'}</span>
                                                        <div className="flex items-center gap-4">
                                                            <span className="font-bold">R$ {l.total_cost.toFixed(2)}</span>
                                                            <div className="flex gap-2">
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
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {resourceTab === 'indireto' && (
                                    <div className="space-y-2">
                                        {indirects.map(i => (
                                            <div key={i.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center text-sm">
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
                                                        <span>[{i.category}] <b>{i.description}</b></span>
                                                        <div className="flex items-center gap-4">
                                                            <span className="font-bold">R$ {i.value.toFixed(2)}</span>
                                                            <div className="flex gap-2">
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
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Total Materiais</span>
                                        <span className="text-2xl font-bold text-slate-800">R$ {totalMaterial.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Total Mão de Obra</span>
                                        <span className="text-2xl font-bold text-slate-800">R$ {totalLabor.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Total Indiretos</span>
                                        <span className="text-2xl font-bold text-slate-800">R$ {totalIndirect.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
                                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Total Impostos</span>
                                        <span className="text-2xl font-bold text-slate-800">R$ {totalTaxes.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 mb-6">
                                    <button
                                        onClick={handlePrintFull}
                                        className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-3 hover:bg-slate-50 transition-all shadow-sm group"
                                    >
                                        <Printer size={20} className="text-blue-600 group-hover:scale-110 transition-transform" />
                                        Imprimir Planejamento Completo
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
                                        className={`bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 ${!onGenerateBudget ? 'opacity-50 cursor-not-allowed' : ''}`}
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
        </div >
    );
};

export default PlanningManager;
