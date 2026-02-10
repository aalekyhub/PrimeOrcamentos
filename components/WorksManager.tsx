import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import {
    Building2, Users, Truck, HardHat, FileText,
    Plus, Trash2, Save, ChevronRight, Calculator,
    PieChart, ArrowRight, DollarSign, Calendar, Pencil, Check, X, Printer
} from 'lucide-react';
import { useNotify } from './ToastProvider';
import { db } from '../services/db';
import {
    WorkHeader, WorkService, WorkMaterial,
    WorkLabor, WorkIndirect, Customer,
    PlannedService, PlannedMaterial,
    PlannedLabor, PlannedIndirect
} from '../types';

interface Props {
    customers: Customer[];
    embeddedPlanId?: string | null;
    onBack?: () => void;
}

const WorksManager: React.FC<Props> = ({ customers, embeddedPlanId, onBack }) => {
    // State
    const [works, setWorks] = useState<WorkHeader[]>([]);
    const [activeWorkId, setActiveWorkId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { notify } = useNotify();

    // Active Work Data
    const [currentWork, setCurrentWork] = useState<WorkHeader | null>(null);
    const [services, setServices] = useState<WorkService[]>([]);
    const [materials, setMaterials] = useState<WorkMaterial[]>([]);
    const [labor, setLabor] = useState<WorkLabor[]>([]);
    const [indirects, setIndirects] = useState<WorkIndirect[]>([]);

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);

    // UI State
    const [activeTab, setActiveTab] = useState<'dados' | 'servicos' | 'recursos' | 'resumo'>('dados');
    const [resourceTab, setResourceTab] = useState<'material' | 'mo' | 'indireto'>('material');
    // Ref to prevent infinite loop on creation
    const creationAttemptedRef = useRef<{ [key: string]: boolean }>({});

    // Load works on mount
    useEffect(() => {
        loadWorks();
    }, []);

    // Effect to handle Embedded Mode
    useEffect(() => {
        if (embeddedPlanId && works.length >= 0) {
            // Check if work already exists for this plan
            let work = works.find(w => w.plan_id === embeddedPlanId);

            // Should created/updated only if not exists or if exists but is empty/uninitialized
            if (!work) {
                // Check if we already attempted to create this specific work in this session
                if (creationAttemptedRef.current[embeddedPlanId]) {
                    return;
                }

                const localWorks = db.load('serviflow_works', []) as WorkHeader[];
                work = localWorks.find(w => w.plan_id === embeddedPlanId);

                if (!work) {
                    // Mark as attempted to prevent loop
                    creationAttemptedRef.current[embeddedPlanId] = true;

                    // Auto-create from Plan
                    const plans = db.load('serviflow_plans', []) as any[];
                    const plan = plans.find(p => p.id === embeddedPlanId);

                    if (plan) {
                        const newWorkId = db.generateId('OBRA');
                        work = {
                            id: newWorkId,
                            plan_id: embeddedPlanId,
                            name: plan.name,
                            client_id: plan.client_id,
                            address: plan.address,
                            status: 'Em Andamento',
                            start_date: new Date().toISOString()
                        };

                        // CLONE logic is shared below
                        importPlanItems(embeddedPlanId, newWorkId);

                        // Save Work Header
                        const newWorks = [...localWorks, work];
                        db.save('serviflow_works', newWorks);
                        setWorks(newWorks);
                    }
                }
            } else {
                // WORK EXISTS
                // We do NOT auto-import here anymore to avoid performance issues.
                // User can click "Importar do Planejamento" manually.
            }

            if (work) {
                if (activeWorkId !== work.id) {
                    setActiveWorkId(work.id);
                    setCurrentWork(work);
                    loadWorkDetails(work.id);
                }
            }
        }
    }, [embeddedPlanId, works, activeWorkId]); // Added activeWorkId to dependencies

    // Helper to clone items
    const importPlanItems = (planId: string, workId: string) => {
        let importedCount = 0;

        // 1. Services
        const planServices = (db.load('serviflow_plan_services', []) as PlannedService[]).filter(s => s.plan_id === planId);
        const allWorkServices = db.load('serviflow_work_services', []) as WorkService[];
        const existingServiceIds = new Set(allWorkServices.filter(s => s.work_id === workId).map(s => s.plan_service_id));

        const newWorkServices: WorkService[] = planServices
            .filter(s => !existingServiceIds.has(s.id))
            .map(s => ({
                id: db.generateId('WSVC'),
                work_id: workId,
                plan_service_id: s.id,
                description: s.description,
                unit: s.unit,
                quantity: 0,
                unit_labor_cost: 0,
                unit_material_cost: 0,
                unit_indirect_cost: 0,
                total_cost: 0,
                status: 'Pendente'
            }));

        if (newWorkServices.length > 0) {
            db.save('serviflow_work_services', [...allWorkServices, ...newWorkServices]);
            importedCount += newWorkServices.length;
        }

        // 2. Materials
        const planMaterials = (db.load('serviflow_plan_materials', []) as PlannedMaterial[]).filter(m => m.plan_id === planId);
        const allWorkMaterials = db.load('serviflow_work_materials', []) as WorkMaterial[];
        // We can't easily track by ID since materials don't have a specific `plan_material_id` field in WorkMaterial type yet,
        // but we can check if we already have materials for this work. 
        // If the list is empty locally (which is the case we are fixing), we import.
        // If not empty, we might duplicate. Ideally we should add `plan_material_id` to WorkMaterial.
        // For now, let's just check if ANY materials exist for this work. If so, we assume they are imported.
        // BUT user might have added some manually?
        // Let's rely on the button logic: it shows if materials.length === 0.
        // So we only import if we really have 0 materials?
        // Or better: Check if the specific material name already exists? Not perfect but better.

        const existingMaterialNames = new Set(allWorkMaterials.filter(m => m.work_id === workId).map(m => m.material_name));

        const newWorkMaterials: WorkMaterial[] = planMaterials
            .filter(m => !existingMaterialNames.has(m.material_name)) // Avoid exact duplicates by name
            .map(m => ({
                id: db.generateId('WMAT'),
                work_id: workId,
                material_name: m.material_name,
                unit: m.unit || 'un',
                quantity: 0,
                unit_cost: 0,
                total_cost: 0
            }));

        if (newWorkMaterials.length > 0) {
            db.save('serviflow_work_materials', [...allWorkMaterials, ...newWorkMaterials]);
            importedCount += newWorkMaterials.length;
        }

        // 3. Labor
        const planLabor = (db.load('serviflow_plan_labor', []) as PlannedLabor[]).filter(l => l.plan_id === planId);
        const allWorkLabor = db.load('serviflow_work_labor', []) as WorkLabor[];
        const existingLaborRoles = new Set(allWorkLabor.filter(l => l.work_id === workId).map(l => l.role));

        const newWorkLabor: WorkLabor[] = planLabor
            .filter(l => !existingLaborRoles.has(l.role))
            .map(l => ({
                id: db.generateId('WLBR'),
                work_id: workId,
                role: l.role,
                cost_type: l.cost_type,
                quantity: 0,
                unit_cost: 0,
                total_cost: 0
            }));

        if (newWorkLabor.length > 0) {
            db.save('serviflow_work_labor', [...allWorkLabor, ...newWorkLabor]);
            importedCount += newWorkLabor.length;
        }

        // 4. Indirects
        const planIndirects = (db.load('serviflow_plan_indirects', []) as PlannedIndirect[]).filter(i => i.plan_id === planId);
        const allWorkIndirects = db.load('serviflow_work_indirects', []) as WorkIndirect[];
        const existingIndirects = new Set(allWorkIndirects.filter(i => i.work_id === workId).map(i => i.description));

        const newWorkIndirects: WorkIndirect[] = planIndirects
            .filter(i => !existingIndirects.has(i.description))
            .map(i => ({
                id: db.generateId('WIND'),
                work_id: workId,
                category: i.category,
                description: i.description,
                value: 0
            }));

        if (newWorkIndirects.length > 0) {
            db.save('serviflow_work_indirects', [...allWorkIndirects, ...newWorkIndirects]);
            importedCount += newWorkIndirects.length;
        }

        // Update local state
        if (importedCount > 0) {
            notify(`${importedCount} novos itens sincronizados do planejamento!`, "success");
            loadWorkDetails(workId);
        } else {
            notify("Todos os itens do planejamento já foram importados.", "info");
        }
    };

    const loadWorks = async () => {
        const localWorks = db.load('serviflow_works', []) as WorkHeader[];
        setWorks(localWorks);
    };

    const loadWorkDetails = (workId: string) => {
        const allServices = db.load('serviflow_work_services', []) as WorkService[];
        setServices(allServices.filter(s => s.work_id === workId));

        const allMaterials = db.load('serviflow_work_materials', []) as WorkMaterial[];
        setMaterials(allMaterials.filter(m => m.work_id === workId));

        const allLabor = db.load('serviflow_work_labor', []) as WorkLabor[];
        setLabor(allLabor.filter(l => l.work_id === workId));

        const allIndirects = db.load('serviflow_work_indirects', []) as WorkIndirect[];
        setIndirects(allIndirects.filter(i => i.work_id === workId));
    };

    const handleCreateWork = () => {
        const newWork: WorkHeader = {
            id: db.generateId('OBRA'),
            name: 'Nova Obra',
            client_id: '',
            address: '',
            status: 'Em Andamento',
            start_date: new Date().toISOString()
        };
        // Use functional state update to prevent race conditions
        setWorks(prev => [newWork, ...prev]);
        setActiveWorkId(newWork.id);
        setCurrentWork(newWork);
        setServices([]);
        setMaterials([]);
        setLabor([]);
        setIndirects([]);
        setActiveTab('dados');
    };

    const handleSave = async () => {
        if (!currentWork) return;
        setLoading(true);

        // Calculate Totals Realized
        const totalMat = materials.reduce((acc, m) => acc + (m.total_cost || 0), 0) +
            services.reduce((acc, s) => acc + (Number(s.unit_material_cost) * Number(s.quantity)), 0);

        const currentTotal = totalMat +
            labor.reduce((acc, i) => acc + i.total_cost, 0) +
            indirects.reduce((acc, i) => acc + i.value, 0);

        const updatedWork = {
            ...currentWork,
            total_real_cost: currentTotal,
            total_material_cost: totalMat
            // In a real app we'd update other totals too
        };

        // DANGER: Loading list from state 'works' might be outdated if we just created a new work 
        // or if multiple tabs are open. Load FRESH from DB before merging.
        const currentLocalWorks = db.load('serviflow_works', []) as WorkHeader[];
        const updatedWorks = currentLocalWorks.map(w => w.id === currentWork.id ? updatedWork : w);

        // If it's a new work not yet in the DB list, append it
        if (!currentLocalWorks.find(w => w.id === currentWork.id)) {
            updatedWorks.unshift(updatedWork);
        }

        // Save to DB
        await db.save('serviflow_works', updatedWorks);

        // 1. Services
        const allServices = db.load('serviflow_work_services', []) as WorkService[];
        const otherServices = allServices.filter(s => s.work_id !== currentWork.id);
        const servicesToSave = [...otherServices, ...services.map(s => ({ ...s, work_id: currentWork.id }))];
        await db.save('serviflow_work_services', servicesToSave);

        // 2. Materials
        const allMaterials = db.load('serviflow_work_materials', []) as WorkMaterial[];
        const otherMaterials = allMaterials.filter(m => m.work_id !== currentWork.id);
        const materialsToSave = [...otherMaterials, ...materials.map(m => ({ ...m, work_id: currentWork.id }))];
        await db.save('serviflow_work_materials', materialsToSave);

        // 3. Labor
        const allLabor = db.load('serviflow_work_labor', []) as WorkLabor[];
        const otherLabor = allLabor.filter(l => l.work_id !== currentWork.id);
        const laborToSave = [...otherLabor, ...labor.map(l => ({ ...l, work_id: currentWork.id }))];
        await db.save('serviflow_work_labor', laborToSave);

        // 4. Indirects
        const allIndirects = db.load('serviflow_work_indirects', []) as WorkIndirect[];
        const otherIndirects = allIndirects.filter(i => i.work_id !== currentWork.id);
        const indirectsToSave = [...otherIndirects, ...indirects.map(i => ({ ...i, work_id: currentWork.id }))];
        await db.save('serviflow_work_indirects', indirectsToSave);

        setWorks(updatedWorks);

        notify("Obra atualizada com sucesso!", "success");
        setLoading(false);
    };

    const handlePrintMaterials = () => {
        if (!currentWork || materials.length === 0) return;

        const printWindow = document.createElement('div');
        printWindow.innerHTML = `
            <div style="font-family: sans-serif; padding: 40px; color: #334155;">
                <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px;">
                    <div>
                        <h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em;">Lista de Materiais</h1>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px; font-weight: 700;">OBRA: ${currentWork.name.toUpperCase()}</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 0; color: #94a3b8; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;">Documento de Obra</p>
                        <p style="margin: 5px 0 0 0; color: #475569; font-size: 12px; font-weight: 600;">Data: ${new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                            <th style="padding: 12px; text-align: left; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; width: 60px;">Qtd</th>
                            <th style="padding: 12px; text-align: left; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; width: 60px;">Und</th>
                            <th style="padding: 12px; text-align: left; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Descrição do Material</th>
                            <th style="padding: 12px; text-align: right; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; width: 100px;">Unitário</th>
                            <th style="padding: 12px; text-align: right; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; width: 120px;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${materials.map(m => `
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 12px; font-size: 12px; color: #334155; font-weight: 600;">${m.quantity}</td>
                                <td style="padding: 12px; font-size: 12px; color: #64748b;">${m.unit}</td>
                                <td style="padding: 12px; font-size: 12px; color: #0f172a; font-weight: 700;">${m.material_name}</td>
                                <td style="padding: 12px; font-size: 12px; color: #64748b; text-align: right;">R$ ${m.unit_cost.toFixed(2)}</td>
                                <td style="padding: 12px; font-size: 12px; color: #0f172a; font-weight: 700; text-align: right;">R$ ${m.total_cost.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="display: flex; justify-content: flex-end;">
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; min-width: 250px; text-align: right;">
                        <p style="margin: 0; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 0.05em;">Total Investido em Materiais</p>
                        <p style="margin: 0; font-size: 24px; font-weight: 800; color: #059669;">R$ ${totalMaterial.toFixed(2)}</p>
                    </div>
                </div>
                
                <div style="margin-top: 80px; border-top: 1px dashed #e2e8f0; padding-top: 20px; text-align: center;">
                    <p style="font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.3em; font-weight: 800;">Gerado por Prime Orçamentos - Gestão de Obras</p>
                </div>
            </div>
        `;

        const opt = {
            margin: [10, 10, 10, 10] as [number, number, number, number],
            filename: `Material_Obra_${currentWork.name.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 } as any,
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } as any
        };

        html2pdf().set(opt).from(printWindow).save();
    };

    const handlePrintFull = () => {
        if (!currentWork) return;

        const customer = customers.find(c => c.id === currentWork.client_id);
        const totalServices = services.reduce((acc, s) => acc + s.total_cost, 0);

        const printWindow = document.createElement('div');
        printWindow.innerHTML = `
            <div style="font-family: sans-serif; padding: 30px; color: #1e293b; max-width: 800px; margin: 0 auto; background: white;">
                <!-- HEADER -->
                <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px;">
                    <div>
                        <h1 style="margin: 0; color: #0f172a; font-size: 26px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em;">Relatório Executivo de Obra</h1>
                        <p style="margin: 5px 0 0 0; color: #059669; font-size: 16px; font-weight: 700;">${currentWork.name.toUpperCase()}</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 0; color: #94a3b8; font-size: 10px; font-weight: 800; text-transform: uppercase;">Emissão: ${new Date().toLocaleDateString('pt-BR')}</p>
                        <p style="margin: 5px 0 0 0; color: #475569; font-size: 11px;">ID: ${currentWork.id}</p>
                    </div>
                </div>

                <!-- INFO GRID -->
                <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <div>
                        <p style="margin: 0 0 5px 0; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Cliente</p>
                        <p style="margin: 0; font-size: 14px; color: #0f172a; font-weight: 600;">${customer?.name || 'Não Informado'}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 5px 0; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Status da Obra</p>
                        <p style="margin: 0; font-size: 14px; color: #0f172a; font-weight: 600;">${currentWork.status}</p>
                    </div>
                    <div style="grid-column: span 2;">
                        <p style="margin: 0 0 5px 0; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Endereço da Execução</p>
                        <p style="margin: 0; font-size: 14px; color: #0f172a; font-weight: 600;">${currentWork.address || 'Não Informado'}</p>
                    </div>
                </div>

                <!-- SEÇÃO SERVIÇOS -->
                ${services.length > 0 ? `
                <div style="margin-bottom: 30px;">
                    <h3 style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; border-left: 4px solid #10b981; padding-left: 10px; margin-bottom: 15px;">1. Serviços Executados</h3>
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
                    <h3 style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 15px;">2. Insumos e Materiais</h3>
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
                    <h3 style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; border-left: 4px solid #f59e0b; padding-left: 10px; margin-bottom: 15px;">3. Recursos Humanos / Mão de Obra</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                                <th style="padding: 10px; text-align: left; font-size: 10px; color: #64748b;">FUNÇÃO / TIPO</th>
                                <th style="padding: 10px; text-align: center; font-size: 10px; color: #64748b; width: 100px;">CARGA</th>
                                <th style="padding: 10px; text-align: right; font-size: 10px; color: #64748b; width: 100px;">CUSTO TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${labor.map(l => `
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 10px; font-size: 11px; font-weight: 600;">${l.role}</td>
                                    <td style="padding: 10px; font-size: 11px; text-align: center;">${l.quantity} ${l.cost_type}</td>
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
                    <h3 style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; border-left: 4px solid #6366f1; padding-left: 10px; margin-bottom: 15px;">4. Custos Indiretos e Operacionais</h3>
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

                <!-- PAGE BREAK FOR SUMMARY IF NEEDED -->
                <div style="page-break-before: always;"></div>

                <!-- RESUMO FINANCEIRO FINAL -->
                <div style="margin-top: 20px;">
                    <h3 style="font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 20px; text-align: center;">Resumo Financeiro Consolidado</h3>
                    
                    <div style="background: #0f172a; color: white; padding: 30px; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                        <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 20px; border-bottom: 1px solid #334155; padding-bottom: 20px; margin-bottom: 20px;">
                            <div>
                                <p style="margin: 0; font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Total em Serviços</p>
                                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 700;">R$ ${totalServices.toFixed(2)}</p>
                            </div>
                            <div>
                                <p style="margin: 0; font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Materiais (Adicionais)</p>
                                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 700;">R$ ${materials.reduce((acc, m) => acc + m.total_cost, 0).toFixed(2)}</p>
                            </div>
                            <div>
                                <p style="margin: 0; font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Mão de Obra (Adicional)</p>
                                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 700;">R$ ${labor.reduce((acc, l) => acc + l.total_cost, 0).toFixed(2)}</p>
                            </div>
                            <div>
                                <p style="margin: 0; font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Custos Indiretos</p>
                                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 700;">R$ ${totalIndirect.toFixed(2)}</p>
                            </div>
                        </div>
                        
                        <div style="text-align: right;">
                            <p style="margin: 0; font-size: 12px; color: #10b981; font-weight: 800; text-transform: uppercase;">Investimento Total Realizado</p>
                            <p style="margin: 5px 0 0 0; font-size: 36px; font-weight: 800; color: #10b981;">R$ ${(totalServices + materials.reduce((acc, m) => acc + m.total_cost, 0) + labor.reduce((acc, l) => acc + l.total_cost, 0) + totalIndirect).toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                <!-- FOOTER -->
                <div style="margin-top: 100px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                    <p style="margin: 0; font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.2em; font-weight: 700;">Este documento é um registro de custos parciais da execução da obra.</p>
                    <p style="margin: 10px 0 0 0; font-size: 10px; color: #64748b; font-weight: 800;">PRIME ORÇAMENTOS - GESTÃO DE OBRAS</p>
                </div>
            </div>
        `;

        const opt = {
            margin: [10, 10, 10, 10] as [number, number, number, number],
            filename: `Relatorio_Obra_${currentWork.name.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 } as any,
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } as any,
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        html2pdf().set(opt).from(printWindow).save();
    };

    const totalMaterial = useMemo(() => {
        const fromMats = materials.reduce((acc, i) => acc + i.total_cost, 0);
        const fromSvcs = services.reduce((acc, s) => acc + (s.unit_material_cost * s.quantity), 0);
        return fromMats + fromSvcs;
    }, [materials, services]);

    const totalLabor = useMemo(() => {
        const fromLabor = labor.reduce((acc, i) => acc + i.total_cost, 0);
        const fromSvcs = services.reduce((acc, s) => acc + (s.unit_labor_cost * s.quantity), 0);
        return fromLabor + fromSvcs;
    }, [labor, services]);

    const totalIndirect = useMemo(() => indirects.reduce((acc, i) => acc + i.value, 0), [indirects]);
    const totalGeneral = totalMaterial + totalLabor + totalIndirect;

    if (embeddedPlanId && !currentWork) {
        return <div className="p-10 text-center text-slate-500">Preparando ambiente de execução...</div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto p-6">
            {/* Header / List */}
            {(!activeWorkId && !embeddedPlanId) ? (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-emerald-800">Gestão de Obras (Realizado)</h1>
                        <button onClick={handleCreateWork} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700">
                            <Plus size={20} /> Nova Obra
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {works.map(work => (
                            <div key={work.id}
                                className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-emerald-400 transition-all group relative">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-lg text-slate-800">{work.name}</span>
                                    <span className={`px - 2 py - 1 rounded text - xs font - bold ${work.status === 'Concluída' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-50 text-orange-700'} `}>
                                        {work.status}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 mb-4 truncate">{work.address || 'Sem endereço'}</p>
                                <div className="flex justify-between text-xs text-slate-400 mb-4">
                                    <span>{new Date(work.start_date).toLocaleDateString()}</span>
                                    <span>ID: {work.id}</span>
                                </div>
                                <div className="pt-4 border-t border-slate-100 flex justify-end">
                                    <button
                                        onClick={() => { setActiveWorkId(work.id); setCurrentWork(work); }}
                                        className="text-emerald-600 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-colors w-full"
                                    >
                                        Gerenciar Obra
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-xl min-h-[80vh] flex flex-col">
                    {/* Editor Header */}
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50 rounded-t-2xl">
                        <div className="flex items-center gap-4">
                            {!embeddedPlanId && (
                                <button onClick={() => setActiveWorkId(null)} className="text-emerald-400 hover:text-emerald-600">
                                    <ArrowRight className="rotate-180" />
                                </button>
                            )}
                            <div>
                                <h2 className="text-xl font-bold text-emerald-900 flex items-center gap-2">
                                    <HardHat className="text-emerald-600" />
                                    {currentWork?.name}
                                </h2>
                                <p className="text-xs text-emerald-600 uppercase tracking-widest font-semibold flex items-center gap-1">
                                    <Calendar size={12} /> Início: {new Date(currentWork?.start_date || '').toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {/* MANUAL IMPORT BUTTON */}
                            {currentWork?.plan_id && (services.length === 0 || materials.length === 0 || labor.length === 0) && (
                                <button
                                    onClick={() => importPlanItems(currentWork.plan_id!, currentWork.id)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-blue-700 shadow-md animate-pulse"
                                >
                                    <ArrowRight size={16} /> Importar/Sincronizar Planejamento
                                </button>
                            )}

                            <button onClick={handleSave} className="px-4 py-2 bg-emerald-700 text-white rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-emerald-800 shadow-md">
                                <Save size={16} /> Salvar
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-200 px-6">
                        {[
                            { id: 'dados', label: 'Dados da Obra', icon: FileText },
                            { id: 'servicos', label: 'Serviços Realizados', icon: Building2 },
                            { id: 'recursos', label: 'Gastos Detalhados', icon: Truck },
                            { id: 'resumo', label: 'Resumo Financeiro', icon: PieChart },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px - 6 py - 4 text - sm font - bold flex items - center gap - 2 border - b - 2 transition - colors ${activeTab === tab.id ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                                    } `}
                            >
                                <tab.icon size={16} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="p-8 flex-1 bg-slate-50/50">
                        {activeTab === 'dados' && currentWork && (
                            <div className="max-w-2xl mx-auto space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Obra</label>
                                        <input
                                            type="text"
                                            value={currentWork.name}
                                            onChange={e => setCurrentWork({ ...currentWork, name: e.target.value.toUpperCase() })}
                                            className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-200 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                                        <select
                                            value={currentWork.status}
                                            onChange={e => setCurrentWork({ ...currentWork, status: e.target.value as any })}
                                            className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-700 outline-none"
                                        >
                                            <option value="Em Andamento">Em Andamento</option>
                                            <option value="Pausada">Pausada</option>
                                            <option value="Concluída">Concluída</option>
                                        </select>
                                    </div>
                                </div>
                                {/* Customer Select */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente</label>
                                    <select
                                        value={currentWork.client_id}
                                        onChange={e => setCurrentWork({ ...currentWork, client_id: e.target.value })}
                                        className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-700"
                                    >
                                        <option value="">Selecione...</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Endereço da Obra</label>
                                    <input
                                        type="text"
                                        value={currentWork.address}
                                        onChange={e => setCurrentWork({ ...currentWork, address: e.target.value })}
                                        className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-700"
                                        placeholder="Local da execução"
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'servicos' && (
                            <div className="max-w-4xl mx-auto">
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Building2 size={18} /> Lançar Serviço Realizado</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                        <div className="md:col-span-4">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                                            <input type="text" id="svc_desc" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="Ex: Pintura Realizada" />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Un</label>
                                            <input type="text" id="svc_unit" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="m²" />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Qtd</label>
                                            <input type="number" id="svc_qty" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="0" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">R$ Mat (Real)</label>
                                            <input type="number" id="svc_mat" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="0.00" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">R$ M.O. (Real)</label>
                                            <input type="number" id="svc_lab" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="0.00" />
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

                                                    const newSvc: WorkService = {
                                                        id: db.generateId('WSVC'),
                                                        work_id: currentWork?.id || '',
                                                        description: desc.toUpperCase(),
                                                        unit,
                                                        quantity: qty,
                                                        unit_material_cost: mat, // Actual cost!
                                                        unit_labor_cost: lab,     // Actual cost!
                                                        unit_indirect_cost: 0,
                                                        total_cost: qty * (mat + lab),
                                                        status: 'Concluído'
                                                    };
                                                    setServices([...services, newSvc]);

                                                    // Reset
                                                    (document.getElementById('svc_desc') as HTMLInputElement).value = '';
                                                    (document.getElementById('svc_qty') as HTMLInputElement).value = '';
                                                    (document.getElementById('svc_mat') as HTMLInputElement).value = '';
                                                    (document.getElementById('svc_lab') as HTMLInputElement).value = '';
                                                }}
                                                className="w-full bg-emerald-600 text-white p-2 rounded hover:bg-emerald-700 font-bold text-sm flex items-center justify-center gap-1"
                                            >
                                                <Plus size={16} /> Lançar
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {services.map(svc => (
                                        <div key={svc.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center group">
                                            {editingId === svc.id ? (
                                                <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                                                    <div className="col-span-4">
                                                        <input
                                                            className="w-full text-xs p-1 border rounded"
                                                            defaultValue={svc.description}
                                                            id={`edit_desc_${svc.id} `}
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <input
                                                            type="number"
                                                            className="w-full text-xs p-1 border rounded"
                                                            defaultValue={svc.quantity}
                                                            placeholder="Qtd"
                                                            id={`edit_qty_${svc.id} `}
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <input
                                                            type="number"
                                                            className="w-full text-xs p-1 border rounded"
                                                            defaultValue={svc.unit_material_cost}
                                                            placeholder="Mat"
                                                            id={`edit_mat_${svc.id} `}
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <input
                                                            type="number"
                                                            className="w-full text-xs p-1 border rounded"
                                                            defaultValue={svc.unit_labor_cost}
                                                            placeholder="M.O."
                                                            id={`edit_lab_${svc.id} `}
                                                        />
                                                    </div>
                                                    <div className="col-span-2 flex gap-1 justify-end">
                                                        <button
                                                            onClick={() => {
                                                                const newDesc = (document.getElementById(`edit_desc_${svc.id} `) as HTMLInputElement).value;
                                                                const newQty = parseFloat((document.getElementById(`edit_qty_${svc.id} `) as HTMLInputElement).value) || 0;
                                                                const newMat = parseFloat((document.getElementById(`edit_mat_${svc.id} `) as HTMLInputElement).value) || 0;
                                                                const newLab = parseFloat((document.getElementById(`edit_lab_${svc.id} `) as HTMLInputElement).value) || 0;

                                                                const updated = services.map(s => s.id === svc.id ? {
                                                                    ...s,
                                                                    description: newDesc.toUpperCase(),
                                                                    quantity: newQty,
                                                                    unit_material_cost: newMat,
                                                                    unit_labor_cost: newLab,
                                                                    total_cost: newQty * (newMat + newLab)
                                                                } : s);
                                                                setServices(updated);
                                                                // Save to DB immediately or wait for big save? Let's verify requirement. 
                                                                // User usually wants immediate feedback but standard is big save. 
                                                                // But to keep consistency with "delete", let's update state and rely on main Save button or auto-save if we implement it.
                                                                // Actually, delete is just state update. So this is fine.
                                                                setEditingId(null);
                                                            }}
                                                            className="text-green-600 hover:bg-green-50 p-1 rounded"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingId(null)}
                                                            className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-slate-800">{svc.description}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {svc.quantity} {svc.unit} • Mat: R$ {svc.unit_material_cost.toFixed(2)} • M.O: R$ {svc.unit_labor_cost.toFixed(2)}
                                                        </p>
                                                    </div>
                                                    <div className="text-right flex items-center gap-4">
                                                        <p className="font-bold text-emerald-600">R$ {svc.total_cost.toFixed(2)}</p>
                                                        <button onClick={() => setEditingId(svc.id)} className="text-blue-400 hover:text-blue-600">
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button onClick={() => setServices(services.filter(s => s.id !== svc.id))} className="text-slate-300 hover:text-red-500">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                    {services.length === 0 && (
                                        <div className="text-center py-8">
                                            <p className="text-slate-400 mb-2">Nenhum serviço lançado ainda.</p>
                                            {!currentWork?.plan_id && <p className="text-xs text-slate-300">Essa obra não está vinculada a um planejamento.</p>}
                                            {currentWork?.plan_id && (
                                                <button
                                                    onClick={() => importPlanItems(currentWork.plan_id!, currentWork.id)}
                                                    className="text-blue-500 hover:underline text-sm font-bold"
                                                >
                                                    Importar Itens do Planejamento
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'recursos' && (
                            <div className="max-w-4xl mx-auto">
                                <div className="flex gap-2 mb-6 justify-center">
                                    <button onClick={() => setResourceTab('material')} className={`px - 4 py - 1.5 rounded - full text - xs font - bold transition - all ${resourceTab === 'material' ? 'bg-emerald-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50'} `}>Materiais</button>
                                    <button onClick={() => setResourceTab('mo')} className={`px - 4 py - 1.5 rounded - full text - xs font - bold transition - all ${resourceTab === 'mo' ? 'bg-emerald-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50'} `}>Mão de Obra</button>
                                    <button onClick={() => setResourceTab('indireto')} className={`px - 4 py - 1.5 rounded - full text - xs font - bold transition - all ${resourceTab === 'indireto' ? 'bg-emerald-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50'} `}>Indiretos</button>
                                </div>

                                {/* MATERIAIS CABEÇALHO COM BOTÃO IMPRIMIR */}
                                {resourceTab === 'material' && (
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Truck size={18} /> Materiais da Obra</h3>
                                            {materials.length > 0 && (
                                                <button
                                                    onClick={handlePrintMaterials}
                                                    className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
                                                >
                                                    <Printer size={16} /> Imprimir Lista
                                                </button>
                                            )}
                                        </div>
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                                <div className="md:col-span-5">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Material</label>
                                                    <input type="text" id="mat_name" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="Ex: Cimento CP-II" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Qtd</label>
                                                    <input type="number" id="mat_qty" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="0" />
                                                </div>
                                                <div className="md:col-span-1">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Und</label>
                                                    <input type="text" id="mat_unit" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="un" />
                                                </div>
                                                <div className="md:col-span-1">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Custo Unit.</label>
                                                    <input type="number" id="mat_cost" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="0.00" />
                                                </div>
                                                <div className="md:col-span-3">
                                                    <button
                                                        onClick={() => {
                                                            const name = (document.getElementById('mat_name') as HTMLInputElement).value;
                                                            const qty = parseFloat((document.getElementById('mat_qty') as HTMLInputElement).value) || 0;
                                                            const unit = (document.getElementById('mat_unit') as HTMLInputElement).value || 'un';
                                                            const cost = parseFloat((document.getElementById('mat_cost') as HTMLInputElement).value) || 0;
                                                            if (!name) return notify("Nome obrigatório", "error");

                                                            setMaterials([...materials, {
                                                                id: db.generateId('MAT'),
                                                                work_id: currentWork?.id || '',
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
                                                        className="w-full bg-emerald-600 text-white p-2 rounded hover:bg-emerald-700 font-bold text-sm"
                                                    >
                                                        Adicionar Material
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {materials.map(m => (
                                                <div key={m.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center text-sm">
                                                    {editingId === m.id ? (
                                                        <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                                                            <div className="col-span-5">
                                                                <input
                                                                    className="w-full text-xs p-1 border rounded"
                                                                    defaultValue={m.material_name}
                                                                    id={`edit_mname_${m.id} `}
                                                                />
                                                            </div>
                                                            <div className="col-span-2">
                                                                <input
                                                                    type="number"
                                                                    className="w-full text-xs p-1 border rounded"
                                                                    defaultValue={m.quantity}
                                                                    placeholder="Qtd"
                                                                    id={`edit_mqty_${m.id} `}
                                                                />
                                                            </div>
                                                            <div className="col-span-2">
                                                                <input
                                                                    className="w-full text-xs p-1 border rounded"
                                                                    defaultValue={m.unit}
                                                                    placeholder="Und"
                                                                    id={`edit_munit_${m.id} `}
                                                                />
                                                            </div>
                                                            <div className="col-span-1">
                                                                <input
                                                                    type="number"
                                                                    className="w-full text-xs p-1 border rounded"
                                                                    defaultValue={m.unit_cost}
                                                                    placeholder="Unit"
                                                                    id={`edit_mcost_${m.id} `}
                                                                />
                                                            </div>
                                                            <div className="col-span-2 flex gap-1 justify-end">
                                                                <button
                                                                    onClick={() => {
                                                                        const newName = (document.getElementById(`edit_mname_${m.id} `) as HTMLInputElement).value;
                                                                        const newQty = parseFloat((document.getElementById(`edit_mqty_${m.id} `) as HTMLInputElement).value) || 0;
                                                                        const newUnit = (document.getElementById(`edit_munit_${m.id} `) as HTMLInputElement).value || 'un';
                                                                        const newCost = parseFloat((document.getElementById(`edit_mcost_${m.id} `) as HTMLInputElement).value) || 0;

                                                                        const updated = materials.map(item => item.id === m.id ? {
                                                                            ...item,
                                                                            material_name: newName.toUpperCase(),
                                                                            unit: newUnit,
                                                                            quantity: newQty,
                                                                            unit_cost: newCost,
                                                                            total_cost: newQty * newCost
                                                                        } : item);
                                                                        setMaterials(updated);
                                                                        setEditingId(null);
                                                                    }}
                                                                    className="text-green-600 hover:bg-green-50 p-1 rounded"
                                                                >
                                                                    <Check size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingId(null)}
                                                                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span className="flex items-center gap-1">
                                                                <b>{m.quantity}{m.unit}</b>
                                                                <span className="text-slate-400 mx-1">|</span>
                                                                <span>{m.material_name}</span>
                                                                <span className="text-[10px] text-slate-400 ml-2">(R$ {m.unit_cost.toFixed(2)})</span>
                                                            </span>
                                                            <div className="flex items-center gap-4">
                                                                <span className="font-bold">R$ {m.total_cost.toFixed(2)}</span>
                                                                <Pencil size={14} className="cursor-pointer text-blue-400 hover:text-blue-600" onClick={() => setEditingId(m.id)} />
                                                                <Trash2 size={14} className="cursor-pointer text-slate-400 hover:text-red-500" onClick={() => setMaterials(materials.filter(x => x.id !== m.id))} />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* LABOR TAB */}
                                {resourceTab === 'mo' && (
                                    <div>
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                                <div className="md:col-span-4">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Função</label>
                                                    <input type="text" id="mo_role" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="Ex: Pedreiro" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                                                    <select id="mo_type" className="w-full p-2 border border-slate-200 rounded text-sm">
                                                        <option value="Diária">Diária</option>
                                                        <option value="Hora">Hora</option>
                                                        <option value="Empreitada">Empreitada</option>
                                                    </select>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Qtd (Dias/H)</label>
                                                    <input type="number" id="mo_qty" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="0" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Custo Unit.</label>
                                                    <input type="number" id="mo_cost" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="0.00" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <button
                                                        onClick={() => {
                                                            const role = (document.getElementById('mo_role') as HTMLInputElement).value;
                                                            const type = (document.getElementById('mo_type') as HTMLInputElement).value as any;
                                                            const qty = parseFloat((document.getElementById('mo_qty') as HTMLInputElement).value) || 0;
                                                            const cost = parseFloat((document.getElementById('mo_cost') as HTMLInputElement).value) || 0;
                                                            if (!role) return notify("Função obrigatória", "error");

                                                            setLabor([...labor, {
                                                                id: db.generateId('LBR'),
                                                                work_id: currentWork?.id || '',
                                                                role: role.toUpperCase(),
                                                                cost_type: type,
                                                                quantity: qty,
                                                                unit_cost: cost,
                                                                charges_percent: 0,
                                                                total_cost: qty * cost
                                                            }]);
                                                            (document.getElementById('mo_role') as HTMLInputElement).value = '';
                                                            (document.getElementById('mo_qty') as HTMLInputElement).value = '';
                                                            (document.getElementById('mo_cost') as HTMLInputElement).value = '';
                                                        }}
                                                        className="w-full bg-emerald-600 text-white p-2 rounded hover:bg-emerald-700 font-bold text-sm"
                                                    >
                                                        Adicionar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {labor.map(l => (
                                                <div key={l.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center text-sm">
                                                    {editingId === l.id ? (
                                                        <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                                                            <div className="col-span-4">
                                                                <input
                                                                    className="w-full text-xs p-1 border rounded"
                                                                    defaultValue={l.role}
                                                                    id={`edit_lrole_${l.id} `}
                                                                />
                                                            </div>
                                                            <div className="col-span-2">
                                                                <select
                                                                    className="w-full text-xs p-1 border rounded"
                                                                    defaultValue={l.cost_type}
                                                                    id={`edit_ltype_${l.id} `}
                                                                >
                                                                    <option value="Diária">Diária</option>
                                                                    <option value="Hora">Hora</option>
                                                                    <option value="Empreitada">Empreitada</option>
                                                                </select>
                                                            </div>
                                                            <div className="col-span-2">
                                                                <input
                                                                    type="number"
                                                                    className="w-full text-xs p-1 border rounded"
                                                                    defaultValue={l.quantity}
                                                                    placeholder="Qtd"
                                                                    id={`edit_lqty_${l.id} `}
                                                                />
                                                            </div>
                                                            <div className="col-span-2">
                                                                <input
                                                                    type="number"
                                                                    className="w-full text-xs p-1 border rounded"
                                                                    defaultValue={l.unit_cost}
                                                                    placeholder="Unit"
                                                                    id={`edit_lcost_${l.id} `}
                                                                />
                                                            </div>
                                                            <div className="col-span-2 flex gap-1 justify-end">
                                                                <button
                                                                    onClick={() => {
                                                                        const newRole = (document.getElementById(`edit_lrole_${l.id} `) as HTMLInputElement).value;
                                                                        const newType = (document.getElementById(`edit_ltype_${l.id} `) as HTMLInputElement).value as any;
                                                                        const newQty = parseFloat((document.getElementById(`edit_lqty_${l.id} `) as HTMLInputElement).value) || 0;
                                                                        const newCost = parseFloat((document.getElementById(`edit_lcost_${l.id} `) as HTMLInputElement).value) || 0;

                                                                        const updated = labor.map(item => item.id === l.id ? {
                                                                            ...item,
                                                                            role: newRole.toUpperCase(),
                                                                            cost_type: newType,
                                                                            quantity: newQty,
                                                                            unit_cost: newCost,
                                                                            total_cost: newQty * newCost
                                                                        } : item);
                                                                        setLabor(updated);
                                                                        setEditingId(null);
                                                                    }}
                                                                    className="text-green-600 hover:bg-green-50 p-1 rounded"
                                                                >
                                                                    <Check size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingId(null)}
                                                                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span>{l.quantity} {l.cost_type}(s) de <b>{l.role}</b></span>
                                                            <div className="flex items-center gap-4">
                                                                <span className="font-bold">R$ {l.total_cost.toFixed(2)}</span>
                                                                <Pencil size={14} className="cursor-pointer text-blue-400 hover:text-blue-600" onClick={() => setEditingId(l.id)} />
                                                                <Trash2 size={14} className="cursor-pointer text-slate-400 hover:text-red-500" onClick={() => setLabor(labor.filter(x => x.id !== l.id))} />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* INDIRECTS TAB */}
                                {resourceTab === 'indireto' && (
                                    <div>
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                                <div className="md:col-span-3">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
                                                    <select id="ind_cat" className="w-full p-2 border border-slate-200 rounded text-sm">
                                                        <option>Transporte</option>
                                                        <option>Alimentação</option>
                                                        <option>EPI</option>
                                                        <option>Equipamentos</option>
                                                        <option>Taxas</option>
                                                        <option>Outros</option>
                                                    </select>
                                                </div>
                                                <div className="md:col-span-6">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                                                    <input type="text" id="ind_desc" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="Ex: Combustível ida/volta" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor</label>
                                                    <input type="number" id="ind_val" className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="0.00" />
                                                </div>
                                                <div className="md:col-span-1">
                                                    <button
                                                        onClick={() => {
                                                            const cat = (document.getElementById('ind_cat') as HTMLInputElement).value;
                                                            const desc = (document.getElementById('ind_desc') as HTMLInputElement).value;
                                                            const val = parseFloat((document.getElementById('ind_val') as HTMLInputElement).value) || 0;

                                                            setIndirects([...indirects, {
                                                                id: db.generateId('IND'),
                                                                work_id: currentWork?.id || '',
                                                                category: cat,
                                                                description: desc.toUpperCase(),
                                                                value: val
                                                            }]);
                                                            (document.getElementById('ind_desc') as HTMLInputElement).value = '';
                                                            (document.getElementById('ind_val') as HTMLInputElement).value = '';
                                                        }}
                                                        className="w-full bg-emerald-600 text-white p-2 rounded hover:bg-emerald-700 font-bold text-sm flex justify-center"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {indirects.map(i => (
                                                <div key={i.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center text-sm">
                                                    {editingId === i.id ? (
                                                        <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                                                            <div className="col-span-3">
                                                                <select
                                                                    className="w-full text-xs p-1 border rounded"
                                                                    defaultValue={i.category}
                                                                    id={`edit_icat_${i.id} `}
                                                                >
                                                                    <option>Transporte</option>
                                                                    <option>Alimentação</option>
                                                                    <option>EPI</option>
                                                                    <option>Equipamentos</option>
                                                                    <option>Taxas</option>
                                                                    <option>Outros</option>
                                                                </select>
                                                            </div>
                                                            <div className="col-span-6">
                                                                <input
                                                                    className="w-full text-xs p-1 border rounded"
                                                                    defaultValue={i.description}
                                                                    id={`edit_idesc_${i.id} `}
                                                                />
                                                            </div>
                                                            <div className="col-span-2">
                                                                <input
                                                                    type="number"
                                                                    className="w-full text-xs p-1 border rounded"
                                                                    defaultValue={i.value}
                                                                    placeholder="Valor"
                                                                    id={`edit_ival_${i.id} `}
                                                                />
                                                            </div>
                                                            <div className="col-span-1 flex gap-1 justify-end">
                                                                <button
                                                                    onClick={() => {
                                                                        const newCat = (document.getElementById(`edit_icat_${i.id} `) as HTMLInputElement).value;
                                                                        const newDesc = (document.getElementById(`edit_idesc_${i.id} `) as HTMLInputElement).value;
                                                                        const newVal = parseFloat((document.getElementById(`edit_ival_${i.id} `) as HTMLInputElement).value) || 0;

                                                                        const updated = indirects.map(item => item.id === i.id ? {
                                                                            ...item,
                                                                            category: newCat,
                                                                            description: newDesc.toUpperCase(),
                                                                            value: newVal
                                                                        } : item);
                                                                        setIndirects(updated);
                                                                        setEditingId(null);
                                                                    }}
                                                                    className="text-green-600 hover:bg-green-50 p-1 rounded"
                                                                >
                                                                    <Check size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingId(null)}
                                                                    className="text-red-500 hover:bg-red-50 p-1 rounded"
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
                                                                <Pencil size={14} className="cursor-pointer text-blue-400 hover:text-blue-600" onClick={() => setEditingId(i.id)} />
                                                                <Trash2 size={14} className="cursor-pointer text-slate-400 hover:text-red-500" onClick={() => setIndirects(indirects.filter(x => x.id !== i.id))} />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'resumo' && (
                            <div className="max-w-4xl mx-auto space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Gasto com Materiais</span>
                                        <span className="text-2xl font-bold text-slate-800">R$ {totalMaterial.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Gasto com Mão de Obra</span>
                                        <span className="text-2xl font-bold text-slate-800">R$ {totalLabor.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Custos Indiretos</span>
                                        <span className="text-2xl font-bold text-slate-800">R$ {totalIndirect.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={handlePrintFull}
                                        className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-3 hover:bg-slate-50 transition-all shadow-sm group"
                                    >
                                        <Printer size={20} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                                        Imprimir Relatório Completo da Obra
                                    </button>
                                </div>

                                <div className="bg-emerald-900 text-white p-8 rounded-2xl flex justify-between items-center shadow-xl">
                                    <div>
                                        <p className="text-emerald-200 text-sm font-bold uppercase tracking-widest mb-1">Custo Total Realizado</p>
                                        <p className="text-4xl font-bold">R$ {totalGeneral.toFixed(2)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-emerald-300">Valores consolidados da execução</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorksManager;
