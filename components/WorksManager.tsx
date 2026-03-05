import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import {
    Building2, Users, Truck, HardHat, FileText,
    Plus, Trash2, Save, ChevronRight, Calculator,
    PieChart, ArrowRight, DollarSign, Calendar, Pencil, Check, X, Printer, Percent, Eye, Archive,
    ChevronUp, ChevronDown, GripVertical, AlertCircle, CheckCircle
} from 'lucide-react';
import { useNotify } from './ToastProvider';
import { db } from '../services/db';
import ReportPreview from './ReportPreview';
import {
    WorkHeader, WorkService, WorkMaterial,
    WorkLabor, WorkIndirect, Customer,
    PlannedService, PlannedMaterial,
    PlannedLabor, PlannedIndirect, WorkTax, PlanTax
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
    const [taxes, setTaxes] = useState<WorkTax[]>([]);
    const [company, setCompany] = useState<any>({});

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDesc, setEditDesc] = useState('');
    const [editUnit, setEditUnit] = useState('');
    const [editQty, setEditQty] = useState(0);
    const [editPrice1, setEditPrice1] = useState(0);
    const [editPrice2, setEditPrice2] = useState(0);

    const [activeTab, setActiveTab] = useState<'dados' | 'servicos' | 'recursos' | 'resumo'>('dados');
    const [resourceTab, setResourceTab] = useState<'material' | 'mo' | 'indireto' | 'impostos'>('material');

    // Drag and Drop State
    const [draggedSvcIndex, setDraggedSvcIndex] = useState<number | null>(null);
    const [draggedMatIndex, setDraggedMatIndex] = useState<number | null>(null);
    const [draggedLabIndex, setDraggedLabIndex] = useState<number | null>(null);
    const [draggedIndIndex, setDraggedIndIndex] = useState<number | null>(null);

    const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
    const [selectedLabor, setSelectedLabor] = useState<string[]>([]);
    const [selectedIndirects, setSelectedIndirects] = useState<string[]>([]);
    const [selectedTaxes, setSelectedTaxes] = useState<string[]>([]);

    // Preview UI State
    const [showPreview, setShowPreview] = useState(false);
    const [previewContent, setPreviewContent] = useState({ title: '', html: '', filename: '' });

    // Ref to prevent infinite loop on creation
    const creationAttemptedRef = useRef<{ [key: string]: boolean }>({});

    // Load works on mount
    useEffect(() => {
        loadWorks();
        const storedCompany = db.load('serviflow_company', {});
        setCompany(storedCompany);
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
                        db.save('serviflow_works', newWorks, work);
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

    const importPlanItems = async (planId: string, workId: string) => {
        let importedCount = 0;

        // 1. Services
        const planServices = (db.load('serviflow_plan_services', []) as PlannedService[]).filter(s => s.plan_id === planId);
        const allWorkServices = db.load('serviflow_work_services', []) as WorkService[];
        const existingServicePlanIds = new Set(allWorkServices.filter(s => s.work_id === workId).map(s => s.plan_service_id));

        const newWorkServices: WorkService[] = planServices
            .filter(s => !existingServicePlanIds.has(s.id))
            .map(s => ({
                id: db.generateId('WSVC'),
                work_id: workId,
                plan_service_id: s.id,
                description: s.description,
                unit: s.unit,
                quantity: s.quantity || 0,
                unit_labor_cost: s.unit_labor_cost || 0,
                unit_material_cost: s.unit_material_cost || 0,
                unit_indirect_cost: s.unit_indirect_cost || 0,
                total_cost: s.total_cost || 0,
                status: 'Pendente'
            }));

        if (newWorkServices.length > 0) {
            await db.save('serviflow_work_services', [...allWorkServices, ...newWorkServices], newWorkServices);
            importedCount += newWorkServices.length;
        }

        // 2. Materials
        const planMaterials = (db.load('serviflow_plan_materials', []) as PlannedMaterial[]).filter(m => m.plan_id === planId);
        const allWorkMaterials = db.load('serviflow_work_materials', []) as WorkMaterial[];
        const existingMaterialPlanIds = new Set(allWorkMaterials.filter(m => m.work_id === workId && m.plan_material_id).map(m => m.plan_material_id));

        const newWorkMaterials: WorkMaterial[] = planMaterials
            .filter(m => !existingMaterialPlanIds.has(m.id))
            .map(m => ({
                id: db.generateId('WMAT'),
                work_id: workId,
                plan_material_id: m.id,
                material_name: m.material_name,
                unit: m.unit || 'un',
                quantity: m.quantity || 0,
                unit_cost: m.unit_cost || 0,
                total_cost: m.total_cost || 0
            }));

        if (newWorkMaterials.length > 0) {
            await db.save('serviflow_work_materials', [...allWorkMaterials, ...newWorkMaterials], newWorkMaterials);
            importedCount += newWorkMaterials.length;
        }

        // 3. Labor
        const planLabor = (db.load('serviflow_plan_labor', []) as PlannedLabor[]).filter(l => l.plan_id === planId);
        const allWorkLabor = db.load('serviflow_work_labor', []) as WorkLabor[];
        const existingLaborPlanIds = new Set(allWorkLabor.filter(l => l.work_id === workId && l.plan_labor_id).map(l => l.plan_labor_id));

        const newWorkLabor: WorkLabor[] = planLabor
            .filter(l => !existingLaborPlanIds.has(l.id))
            .map(l => ({
                id: db.generateId('WLBR'),
                work_id: workId,
                plan_labor_id: l.id,
                role: l.role,
                cost_type: l.cost_type,
                unit: l.unit || 'un',
                quantity: l.quantity || 0,
                unit_cost: l.unit_cost || 0,
                total_cost: l.total_cost || 0
            }));

        if (newWorkLabor.length > 0) {
            await db.save('serviflow_work_labor', [...allWorkLabor, ...newWorkLabor], newWorkLabor);
            importedCount += newWorkLabor.length;
        }

        // 4. Indirects
        const planIndirects = (db.load('serviflow_plan_indirects', []) as PlannedIndirect[]).filter(i => i.plan_id === planId);
        const allWorkIndirects = db.load('serviflow_work_indirects', []) as WorkIndirect[];
        const existingIndirectPlanIds = new Set(allWorkIndirects.filter(i => i.work_id === workId && i.plan_indirect_id).map(i => i.plan_indirect_id));

        const newWorkIndirects: WorkIndirect[] = planIndirects
            .filter(i => !existingIndirectPlanIds.has(i.id))
            .map(i => ({
                id: db.generateId('WIND'),
                work_id: workId,
                plan_indirect_id: i.id,
                category: i.category,
                description: i.description,
                value: i.value || 0
            }));

        if (newWorkIndirects.length > 0) {
            await db.save('serviflow_work_indirects', [...allWorkIndirects, ...newWorkIndirects], newWorkIndirects);
            importedCount += newWorkIndirects.length;
        }

        // 5. Taxes
        const planTaxes = (db.load('serviflow_plan_taxes', []) as PlanTax[]).filter(t => t.plan_id === planId);
        const allWorkTaxes = db.load('serviflow_work_taxes', []) as WorkTax[];
        const existingTaxPlanIds = new Set(allWorkTaxes.filter(t => t.work_id === workId && t.plan_tax_id).map(t => t.plan_tax_id));

        const newWorkTaxes: WorkTax[] = planTaxes
            .filter(t => !existingTaxPlanIds.has(t.id))
            .map(t => ({
                id: db.generateId('WTAX'),
                work_id: workId,
                plan_tax_id: t.id,
                name: t.name,
                rate: t.rate,
                value: t.value || 0
            }));

        if (newWorkTaxes.length > 0) {
            await db.save('serviflow_work_taxes', [...allWorkTaxes, ...newWorkTaxes], newWorkTaxes);
            importedCount += newWorkTaxes.length;
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

        const allTaxes = db.load('serviflow_work_taxes', []) as WorkTax[];
        setTaxes(allTaxes.filter(t => t.work_id === workId));
    };

    // Listen for cloud sync completion to refresh detail views
    useEffect(() => {
        const handleSync = () => {
            loadWorks();
            if (activeWorkId) loadWorkDetails(activeWorkId);
        };
        window.addEventListener('db-sync-complete', handleSync);
        return () => window.removeEventListener('db-sync-complete', handleSync);
    }, [activeWorkId]);

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
        setTaxes([]);
        setActiveTab('dados');
    };

    const handleDeleteWork = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!confirm('AVISO: Isso excluirá PERMANENTEMENTE esta obra e todos os seus lançamentos de serviços e recursos. Deseja continuar?')) return;

        try {
            setLoading(true);

            // 2. Perform Physical Deletions (Local + Cloud)
            await (db as any).deleteByCondition('serviflow_works', 'id', id);
            await (db as any).deleteByCondition('serviflow_work_services', 'work_id', id);
            await (db as any).deleteByCondition('serviflow_work_materials', 'work_id', id);
            await (db as any).deleteByCondition('serviflow_work_labor', 'work_id', id);
            await (db as any).deleteByCondition('serviflow_work_indirects', 'work_id', id);
            await (db as any).deleteByCondition('serviflow_work_taxes', 'work_id', id);

            // 3. Update state
            setWorks(prev => prev.filter(w => w.id !== id));
            notify("Obra excluída com sucesso.", "success");
        } catch (error) {
            notify("Erro ao excluir obra.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDuplicateWork = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!confirm('Deseja criar uma cópia desta obra com todos os seus serviços e recursos?')) return;

        try {
            setLoading(true);

            // 1. Load Source Work Header
            const allWorks = db.load('serviflow_works', []) as WorkHeader[];
            const sourceWork = allWorks.find(w => w.id === id);
            if (!sourceWork) return notify("Obra original não encontrada.", "error");

            // 2. Create New Work Header
            const newWorkId = db.generateId('OBRA');
            const newWork: WorkHeader = {
                ...sourceWork,
                id: newWorkId,
                name: `CÓPIA - ${sourceWork.name}`,
                start_date: new Date().toISOString()
            };

            // 3. Duplicate Items
            // Services
            const allServices = db.load('serviflow_work_services', []) as WorkService[];
            const sourceServices = allServices.filter(s => s.work_id === id);
            const newServices = sourceServices.map(s => ({ ...s, id: db.generateId('WSVC'), work_id: newWorkId }));

            // Materials
            const allMaterials = db.load('serviflow_work_materials', []) as WorkMaterial[];
            const sourceMaterials = allMaterials.filter(m => m.work_id === id);
            const newMaterials = sourceMaterials.map(m => ({ ...m, id: db.generateId('WMAT'), work_id: newWorkId }));

            // Labor
            const allLabor = db.load('serviflow_work_labor', []) as WorkLabor[];
            const sourceLabor = allLabor.filter(l => l.work_id === id);
            const newLabor = sourceLabor.map(l => ({ ...l, id: db.generateId('WLBR'), work_id: newWorkId }));

            // Indirects
            const allIndirects = db.load('serviflow_work_indirects', []) as WorkIndirect[];
            const sourceIndirects = allIndirects.filter(i => i.work_id === id);
            const newIndirects = sourceIndirects.map(i => ({ ...i, id: db.generateId('WIND'), work_id: newWorkId }));

            // Taxes
            const allTaxes = db.load('serviflow_work_taxes', []) as WorkTax[];
            const sourceTaxes = allTaxes.filter(t => t.work_id === id);
            const newTaxes = sourceTaxes.map(t => ({ ...t, id: db.generateId('WTAX'), work_id: newWorkId }));

            // 4. Save everything
            await db.save('serviflow_works', [newWork, ...allWorks], newWork);
            await db.save('serviflow_work_services', [...allServices, ...newServices], newServices);
            await db.save('serviflow_work_materials', [...allMaterials, ...newMaterials], newMaterials);
            await db.save('serviflow_work_labor', [...allLabor, ...newLabor], newLabor);
            await db.save('serviflow_work_indirects', [...allIndirects, ...newIndirects], newIndirects);
            await db.save('serviflow_work_taxes', [...allTaxes, ...newTaxes], newTaxes);

            // 5. Update state
            setWorks(prev => [newWork, ...prev]);
            notify("Obra duplicada com sucesso!", "success");

        } catch (error) {
            notify("Erro ao duplicar obra.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentWork) return;
        setLoading(true);

        // Calculate Totals Realized
        const totalMat = materials.reduce((acc, m) => acc + (m.total_cost || 0), 0) +
            services.reduce((acc, s) => acc + (Number(s.unit_material_cost) * Number(s.quantity)), 0);

        const currentTotal = totalMat +
            labor.reduce((acc, i) => acc + i.total_cost, 0) +
            indirects.reduce((acc, i) => acc + i.value, 0) +
            taxes.reduce((acc, t) => {
                const base = totalMat + labor.reduce((a, l) => a + l.total_cost, 0) + indirects.reduce((a, i) => a + i.value, 0);
                return acc + (t.rate > 0 ? base * (t.rate / 100) : t.value);
            }, 0);

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
        await db.save('serviflow_works', updatedWorks, updatedWork);

        // 1. Services
        const allServices = db.load('serviflow_work_services', []) as WorkService[];
        const otherServices = allServices.filter(s => s.work_id !== currentWork.id);
        const currentWorkServices = services.map(s => ({ ...s, work_id: currentWork.id }));
        const servicesToSave = [...otherServices, ...currentWorkServices];
        await db.save('serviflow_work_services', servicesToSave, currentWorkServices);

        // 2. Materials
        const allMaterials = db.load('serviflow_work_materials', []) as WorkMaterial[];
        const otherMaterials = allMaterials.filter(m => m.work_id !== currentWork.id);
        const currentWorkMaterials = materials.map(m => ({ ...m, work_id: currentWork.id }));
        const materialsToSave = [...otherMaterials, ...currentWorkMaterials];
        await db.save('serviflow_work_materials', materialsToSave, currentWorkMaterials);

        // 3. Labor
        const allLabor = db.load('serviflow_work_labor', []) as WorkLabor[];
        const otherLabor = allLabor.filter(l => l.work_id !== currentWork.id);
        const currentWorkLabor = labor.map(l => ({ ...l, work_id: currentWork.id }));
        const laborToSave = [...otherLabor, ...currentWorkLabor];
        await db.save('serviflow_work_labor', laborToSave, currentWorkLabor);

        // 4. Indirects
        const allIndirects = db.load('serviflow_work_indirects', []) as WorkIndirect[];
        const otherIndirects = allIndirects.filter(i => i.work_id !== currentWork.id);
        const currentWorkIndirects = indirects.map(i => ({ ...i, work_id: currentWork.id }));
        const indirectsToSave = [...otherIndirects, ...currentWorkIndirects];
        await db.save('serviflow_work_indirects', indirectsToSave, currentWorkIndirects);

        // 5. Taxes
        const allTaxes = db.load('serviflow_work_taxes', []) as WorkTax[];
        const otherTaxes = allTaxes.filter(t => t.work_id !== currentWork.id);
        const currentWorkTaxes = taxes.map(t => ({ ...t, work_id: currentWork.id }));
        const taxesToSave = [...otherTaxes, ...currentWorkTaxes];
        await db.save('serviflow_work_taxes', taxesToSave, currentWorkTaxes);

        setWorks(updatedWorks);

        notify("Obra atualizada com sucesso!", "success");
        setLoading(false);
    };

    const handleDeleteService = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

        // 1. Remove from state
        const updatedServices = services.filter(s => s.id !== id);
        setServices(updatedServices);

        // 2. Remove from Supabase
        await db.remove('serviflow_work_services', id);

        // 3. Update Local Storage (via save)
        if (currentWork) {
            const allServices = db.load('serviflow_work_services', []) as WorkService[];
            const otherServices = allServices.filter(s => s.work_id !== currentWork.id);
            const servicesToSave = [...otherServices, ...updatedServices];
            await db.save('serviflow_work_services', servicesToSave);
        }
        notify("Serviço excluído", "success");
    };

    const handleDeleteMaterial = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este material?')) return;

        // 1. Remove from state
        const updatedMaterials = materials.filter(m => m.id !== id);
        setMaterials(updatedMaterials);

        // 2. Remove from Supabase
        await db.remove('serviflow_work_materials', id);

        // 3. Update Local Storage
        if (currentWork) {
            const allMaterials = db.load('serviflow_work_materials', []) as WorkMaterial[];
            const otherMaterials = allMaterials.filter(m => m.work_id !== currentWork.id);
            const materialsToSave = [...otherMaterials, ...updatedMaterials];
            await db.save('serviflow_work_materials', materialsToSave);
        }
        notify("Material excluído", "success");
    };

    const handleDeleteLabor = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este item de mão de obra?')) return;

        const updatedLabor = labor.filter(l => l.id !== id);
        setLabor(updatedLabor);

        await db.remove('serviflow_work_labor', id);

        if (currentWork) {
            const allLabor = db.load('serviflow_work_labor', []) as WorkLabor[];
            const otherLabor = allLabor.filter(l => l.work_id !== currentWork.id);
            const laborToSave = [...otherLabor, ...updatedLabor];
            await db.save('serviflow_work_labor', laborToSave);
        }
        notify("Mão de obra excluída", "success");
    };

    const handleDeleteIndirect = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este custo indireto?')) return;

        const updatedIndirects = indirects.filter(i => i.id !== id);
        setIndirects(updatedIndirects);

        await db.remove('serviflow_work_indirects', id);

        if (currentWork) {
            const allIndirects = db.load('serviflow_work_indirects', []) as WorkIndirect[];
            const otherIndirects = allIndirects.filter(i => i.work_id !== currentWork.id);
            const indirectsToSave = [...otherIndirects, ...updatedIndirects];
            await db.save('serviflow_work_indirects', indirectsToSave);
        }
        notify("Custo indireto excluído", "success");
    };

    const handleDeleteTax = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este imposto?')) return;

        const updatedTaxes = taxes.filter(t => t.id !== id);
        setTaxes(updatedTaxes);

        await db.remove('serviflow_work_taxes', id);

        if (currentWork) {
            const allTaxes = db.load('serviflow_work_taxes', []) as WorkTax[];
            const otherTaxes = allTaxes.filter(t => t.work_id !== currentWork.id);
            const taxesToSave = [...otherTaxes, ...updatedTaxes];
            await db.save('serviflow_work_taxes', taxesToSave);
        }
        notify("Imposto excluído", "success");
    };

    const handleAddTax = (name: string, rate: number, value: number) => {
        if (!currentWork) return;
        const newTax: WorkTax = {
            id: db.generateId('WTAX'),
            work_id: currentWork.id,
            name,
            rate,
            value: rate > 0 ? 0 : value
        };
        const newTaxes = [...taxes, newTax];
        setTaxes(newTaxes);

        // Immediate persistence for adding? Or wait for save?
        // To be consistent with others (except delete), we wait for save. But usually tabs items are added locally.
        // However, deletions are immediate.
        notify("Imposto adicionado (lembre-se de salvar)", "success");
    };

    const handleLoadDefaultTaxes = () => {
        if (!currentWork) return;
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
                    id: db.generateId('WTAX'),
                    work_id: currentWork.id,
                    name: def.name,
                    rate: def.rate,
                    value: 0
                });
            }
        });

        setTaxes(newTaxes);
        notify("Impostos padrão carregados!", "success");
    };


    const generateMaterialsReportHtml = () => {
        if (!currentWork || materials.length === 0) return '';

        return `
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
                            <th style="padding: 12px; text-align: right; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; width: 100px;">Vl. Unit.</th>
                            <th style="padding: 12px; text-align: right; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; width: 120px;">Vl. Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${materials.map(m => `
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 12px; font-size: 12px; color: #334155; font-weight: 600;">${m.quantity}</td>
                                <td style="padding: 12px; font-size: 12px; color: #64748b;">${m.unit}</td>
                                <td style="padding: 12px; font-size: 12px; color: #0f172a; font-weight: 700;">${m.material_name}</td>
                                <td style="padding: 12px; font-size: 12px; color: #64748b; text-align: right; white-space: nowrap;">R$ ${m.unit_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td style="padding: 12px; font-size: 12px; color: #0f172a; font-weight: 700; text-align: right; white-space: nowrap;">R$ ${m.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="display: flex; justify-content: flex-end;">
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; min-width: 250px; text-align: right;">
                        <p style="margin: 0; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 0.05em;">Total Investido em Materiais</p>
                        <p style="margin: 0; font-size: 24px; font-weight: 800; color: #059669; white-space: nowrap;">R$ ${totalMaterial.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                </div>
                
                <div style="margin-top: 80px; border-top: 1px dashed #e2e8f0; padding-top: 20px; text-align: center;">
                    <p style="font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.3em; font-weight: 800;">Gerado por Prime Orçamentos - Gestão de Obras</p>
                </div>
            </div>
        `;
    };


    const generateFullReportHtml = () => {
        if (!currentWork) return '';

        const customer = customers.find(c => c.id === currentWork.client_id);

        return `
            <div style="width: 100%; background: white; font-family: sans-serif; padding: 15mm;">
                <!-- HEADER SECTION -->
                <div class="report-header" style="padding-bottom: 25px !important; border-bottom: 3px solid #000; margin-bottom: 25px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="display: flex; gap: 20px; align-items: center;">
                            <div style="width: 70px; height: 70px; display: flex; align-items: center; justify-content: center;">
                                ${company.logo ? `<img src="${company.logo}" style="max-height: 100%; max-width: 100%; object-fit: contain;">` : '<div style="font-weight:900; font-size:28px; color:#059669;">PO</div>'}
                            </div>
                            <div>
                                <h1 style="font-size:16px; font-weight:900; color:#0f172a; margin:0 0 1mm 0; text-transform:uppercase; letter-spacing:-0.5px;">${company.name}</h1>
                                <p style="font-size:14px; font-weight:800; color:#0f172a; margin:0 0 1mm 0;">OBRA: ${currentWork.name}</p>
                                <p style="font-size:10px; font-weight:800; color:#059669; text-transform:uppercase; letter-spacing:1px; margin:0 0 1mm 0;">Executivo de Obra / Realizado</p>
                                <p style="font-size:8px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:-0.3px; margin:0;">${company.cnpj || ''} | ${company.phone || ''}</p>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="background:#059669; color:white; padding:1.5mm 3mm; border-radius:1.5mm; font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:1px; margin-bottom:1.5mm; display:inline-block;">EXECUÇÃO</div>
                            <p style="font-size:18px; font-weight:900; color:#0f172a; letter-spacing:-0.5px; margin:0 0 0.5mm 0; white-space:nowrap;">${currentWork.id}</p>
                            <p style="font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:1px; text-align:right; margin:0;">EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>
                </div>

                <!-- INFO GRID -->
                <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; background: #f8fafc; padding: 16px; border-radius: 6px; border: 1.5px solid #e2e8f0; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    <div style="flex: 1; min-width: 150px;">
                        <p style="margin: 0 0 4px 0; font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Cliente</p>
                        <p style="margin: 0; font-size: 12px; color: #0f172a; font-weight: 700;">${customer?.name || 'Não Informado'}</p>
                    </div>
                    <div style="flex: 1; min-width: 150px;">
                        <p style="margin: 0 0 4px 0; font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Status da Obra</p>
                        <p style="margin: 0; font-size: 12px; color: #0f172a; font-weight: 700;">${currentWork.status}</p>
                    </div>
                    <div style="width: 100%;">
                        <p style="margin: 0 0 4px 0; font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Endereço da Obra</p>
                        <p style="margin: 0; font-size: 12px; color: #0f172a; font-weight: 700;">${currentWork.address || 'Não Informado'}</p>
                    </div>
                </div>

                <!-- COLORFUL CARDS -->
                <div style="display: flex; gap: 12px; margin-bottom: 25px;">
                    ${totalMaterial > 0 ? `
                    <div style="flex: 1; background: #ecfdf5; border-bottom: 2px solid #10b981; border-radius: 6px; padding: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                        <span style="font-size: 8px; font-weight: 700; color: #059669; text-transform: uppercase;">Materiais</span>
                        <span style="font-size: 16px; font-weight: 800; color: #064e3b; display: block; white-space: nowrap;">R$ ${totalMaterial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>` : ''}
                    ${totalLabor > 0 ? `
                    <div style="flex: 1; background: #fffbeb; border-bottom: 2px solid #f59e0b; border-radius: 6px; padding: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                        <span style="font-size: 8px; font-weight: 700; color: #d97706; text-transform: uppercase;">Mão de Obra</span>
                        <span style="font-size: 16px; font-weight: 800; color: #78350f; display: block; white-space: nowrap;">R$ ${totalLabor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>` : ''}
                    ${(totalIndirect + totalTaxes) > 0 ? `
                    <div style="flex: 1; background: #ecfdf5; border-bottom: 2px solid #10b981; border-radius: 6px; padding: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                        <span style="font-size: 8px; font-weight: 700; color: #059669; text-transform: uppercase;">Impostos</span>
                        <span style="font-size: 16px; font-weight: 800; color: #064e3b; display: block; white-space: nowrap;">R$ ${(totalIndirect + totalTaxes).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>` : ''}
                </div>

                <!-- TOTAL BOX -->
                <div style="margin-bottom: 30px; background: #064e3b; color: white; padding: 12px 16px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                    <p style="font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0; letter-spacing: 0.1em; color: #a7f3d0;">CUSTO TOTAL EXECUTADO</p>
                    <p style="font-size: 18px; font-weight: 900; margin: 0; white-space: nowrap;">R$ ${totalGeneral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>

                <!-- SECTIONS -->
                ${services.length > 0 ? `
                <div style="margin-bottom: 30px; page-break-inside: auto;">
                    <h3 style="font-size: 14px; font-weight: 800; color: #064e3b; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0;">1. Serviços Executados</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid #e2e8f0;">
                                <th style="padding: 10px 0; text-align: left; font-size: 10px; color: #64748b;">DESCRIÇÃO</th>
                                <th style="padding: 10px 0; text-align: center; font-size: 10px; color: #64748b; width: 60px;">QTD</th>
                                <th style="padding: 10px 0; text-align: center; font-size: 10px; color: #64748b; width: 40px;">UND</th>
                                <th style="padding: 10px 0; text-align: right; font-size: 10px; color: #64748b; width: 80px;">VL. UNIT.</th>
                                <th style="padding: 10px 0; text-align: right; font-size: 10px; color: #64748b; width: 100px;">VL. TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${services.map(s => `
                                <tr style="border-bottom: 1px solid #f1f5f9; page-break-inside: avoid;">
                                    <td style="padding: 10px 0; font-size: 11px; font-weight: 600;">${s.description}</td>
                                    <td style="padding: 10px 0; font-size: 11px; text-align: center;">${s.quantity}</td>
                                    <td style="padding: 10px 0; font-size: 11px; text-align: center;">${s.unit}</td>
                                    <td style="padding: 10px 0; font-size: 11px; text-align: right;">R$ ${s.unit_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    <td style="padding: 10px 0; font-size: 11px; text-align: right; font-weight: 700;">R$ ${s.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>` : ''}

                <!-- MATERIALS -->
                ${materials.length > 0 ? `
                <div style="margin-bottom: 30px; page-break-inside: auto;">
                    <h3 style="font-size: 14px; font-weight: 800; color: #064e3b; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0;">2. Insumos e Materiais</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid #e2e8f0;">
                                <th style="padding: 10px 0; text-align: left; font-size: 10px; color: #64748b;">MATERIAL</th>
                                <th style="padding: 10px 0; text-align: center; font-size: 10px; color: #64748b; width: 60px;">QTD</th>
                                <th style="padding: 10px 0; text-align: center; font-size: 10px; color: #64748b; width: 40px;">UND</th>
                                <th style="padding: 10px 0; text-align: right; font-size: 10px; color: #64748b; width: 80px;">VL. UNIT.</th>
                                <th style="padding: 10px 0; text-align: right; font-size: 10px; color: #64748b; width: 100px;">VL. TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${materials.map(m => `
                                <tr style="border-bottom: 1px solid #f1f5f9; page-break-inside: avoid;">
                                    <td style="padding: 10px 0; font-size: 11px; font-weight: 600;">${m.material_name}</td>
                                    <td style="padding: 10px 0; font-size: 11px; text-align: center;">${m.quantity}</td>
                                    <td style="padding: 10px 0; font-size: 11px; text-align: center;">${m.unit}</td>
                                    <td style="padding: 10px 0; font-size: 11px; text-align: right;">R$ ${m.unit_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    <td style="padding: 10px 0; font-size: 11px; text-align: right; font-weight: 700;">R$ ${m.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>` : ''}

                <!-- LABOR -->
                ${labor.length > 0 ? `
                <div style="margin-bottom: 30px; page-break-before: always; break-before: page; padding-top: 15mm;">
                    <h3 style="font-size: 14px; font-weight: 800; color: #064e3b; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0;">3. Mão de Obra</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid #e2e8f0;">
                                <th style="padding: 10px 0; text-align: left; font-size: 10px; color: #64748b;">FUNÇÃO / TIPO</th>
                                <th style="padding: 10px 0; text-align: center; font-size: 10px; color: #64748b; width: 60px;">QTD</th>
                                <th style="padding: 10px 0; text-align: center; font-size: 10px; color: #64748b; width: 40px;">UND</th>
                                <th style="padding: 10px 0; text-align: right; font-size: 10px; color: #64748b; width: 100px;">VL. TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${labor.map(l => `
                                <tr style="border-bottom: 1px solid #f1f5f9; page-break-inside: avoid;">
                                    <td style="padding: 10px 0; font-size: 11px; font-weight: 600;">${l.role} | (${l.cost_type})</td>
                                    <td style="padding: 10px 0; font-size: 11px; text-align: center;">${l.quantity}</td>
                                    <td style="padding: 10px 0; font-size: 11px; text-align: center;">${l.unit || 'un'}</td>
                                    <td style="padding: 10px 0; font-size: 11px; text-align: right; font-weight: 700;">R$ ${l.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>` : ''}

                <div class="report-footer" style="padding-top: 20px; border-top: 1px solid #e2e8f0; margin-top: 20px; text-align: center; page-break-inside: avoid;">
                    <p style="margin: 0; font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.2em; font-weight: 700;">Este documento é um registro de custos parciais da execução da obra.</p>
                    <p style="margin: 10px 0 0 0; font-size: 10px; color: #64748b; font-weight: 800;">${company.name.toUpperCase()} - GESTÃO DE OBRAS</p>
                </div>
            </div>
        `;
    };


    const handlePreviewMaterials = () => {
        if (!currentWork || materials.length === 0) return;
        setPreviewContent({
            title: 'Lista de Materiais',
            html: generateMaterialsReportHtml(),
            filename: `Material_Obra_${currentWork.name.replace(/\s+/g, '_')}.pdf`
        });
        setShowPreview(true);
    };

    const handlePreviewFull = () => {
        if (!currentWork) return;
        setPreviewContent({
            title: 'Relatório Completo de Obra',
            html: generateFullReportHtml(),
            filename: `Relatorio_Completo_${currentWork.name.replace(/\s+/g, '_')}.pdf`
        });
        setShowPreview(true);
    };

    const handlePrintFull = () => {
        if (!currentWork) return;
        const html = generateFullReportHtml();
        const element = document.createElement('div');
        element.style.position = 'absolute';
        element.style.left = '-10000px';
        element.style.top = '0';
        element.style.width = '210mm';
        element.style.padding = '0';
        element.style.margin = '0';
        element.style.background = 'white';
        element.innerHTML = html;
        document.body.appendChild(element);

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
                    margin: 0,
                    filename: `Execucao_${currentWork.name.replace(/\s+/g, '_')}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: "#ffffff",
                        windowWidth: element.scrollWidth,
                        windowHeight: element.scrollHeight,
                        scrollY: 0,
                        scrollX: 0,
                    },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                    pagebreak: { mode: 'css' }
                };

                // @ts-ignore
                html2pdf().set(opt).from(element).save().then(() => {
                    if (document.body.contains(element)) document.body.removeChild(element);
                }).catch((err: any) => {
                    console.error("PDF Error:", err);
                    if (document.body.contains(element)) document.body.removeChild(element);
                });
            }, 500);
        });
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

    // Total Direct Costs (Base for Taxes)
    const totalDirect = useMemo(() => totalMaterial + totalLabor + totalIndirect, [totalMaterial, totalLabor, totalIndirect]);

    // Separate BDI as the first layer of calculation
    const bdiTax = useMemo(() => taxes.find(t => t.name === 'BDI'), [taxes]);
    const otherTaxes = useMemo(() => taxes.filter(t => t.name !== 'BDI'), [taxes]);

    const bdiValue = useMemo(() => {
        if (!bdiTax) return 0;
        return bdiTax.rate > 0 ? (totalDirect * (bdiTax.rate / 100)) : bdiTax.value;
    }, [bdiTax, totalDirect]);

    // Líquido Desejado = Custo Direto + BDI
    const desiredLiquid = useMemo(() => totalDirect + bdiValue, [totalDirect, bdiValue]);

    // Fator de Gross Up (1 - soma das alíquotas das outras taxas)
    const taxFactor = useMemo(() => {
        const sumRates = otherTaxes.reduce((acc, t) => acc + (t.rate > 0 ? (t.rate / 100) : 0), 0);
        return Math.max(0.01, 1 - sumRates);
    }, [otherTaxes]);

    // Total Geral (Nota Fiscal) = (Líquido + Taxas Fixas) / Fator
    const totalGeneral = useMemo(() => {
        const sumFixed = otherTaxes.reduce((acc, t) => acc + (t.rate > 0 ? 0 : t.value), 0);
        return (desiredLiquid + sumFixed) / taxFactor;
    }, [desiredLiquid, otherTaxes, taxFactor]);

    const totalTaxes = useMemo(() => totalGeneral - totalDirect, [totalGeneral, totalDirect]);

    if (embeddedPlanId && !currentWork) {
        return <div className="p-10 text-center text-slate-500">Preparando ambiente de execução...</div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto p-6">
            {/* Header / List */}
            {(!activeWorkId && !embeddedPlanId) ? (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tighter">Gestão de Obras</h1>
                        <button onClick={handleCreateWork} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 shadow-md shadow-green-950/20">
                            <Plus size={20} /> Nova Obra
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {works.map(work => (
                            <div key={work.id}
                                className="bg-white dark:bg-slate-900/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-green-400 transition-all group relative">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1 min-w-0">
                                        <span className="font-bold text-lg text-slate-800 dark:text-slate-100 block truncate leading-tight uppercase tracking-tight">{work.name}</span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em]">{work.id}</span>
                                    </div>
                                    <div className="flex gap-1 ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => handleDuplicateWork(work.id, e)}
                                            className="p-2 text-slate-400 dark:text-slate-600 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-full transition-all"
                                            title="Duplicar Obra"
                                        >
                                            <Archive size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteWork(work.id, e)}
                                            className="p-2 text-slate-400 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-all"
                                            title="Excluir Obra"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center mb-5">
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate flex-1 pr-2">{work.address || 'Sem endereço configurado'}</p>
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${work.status === 'Concluída' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'}`}>
                                        {work.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mb-4">
                                    <Calendar size={12} className="text-green-500" />
                                    <span>Iniciada em {new Date(work.start_date).toLocaleDateString()}</span>
                                </div>
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                    <button
                                        onClick={() => { setActiveWorkId(work.id); setCurrentWork(work); loadWorkDetails(work.id); }}
                                        className="text-green-600 dark:text-green-400 font-bold text-sm bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors w-full"
                                    >
                                        Editar Execução
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl min-h-[80vh] flex flex-col border dark:border-slate-800 overflow-hidden">
                    {/* Fixed Editor Header & Tabs */}
                    <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
                        {/* Editor Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-green-50 dark:bg-green-900/20">
                            <div className="flex items-center gap-4">
                                {!embeddedPlanId && (
                                    <button onClick={() => setActiveWorkId(null)} className="text-green-400 hover:text-green-600 p-1">
                                        <ArrowRight className="rotate-180" size={20} />
                                    </button>
                                )}
                                <div>
                                    <h2 className="text-xl font-bold text-green-900 dark:text-green-100 flex items-center gap-2">
                                        <HardHat className="text-green-600 dark:text-green-400" />
                                        {currentWork.name}
                                    </h2>
                                    <p className="text-xs text-green-600 dark:text-green-400 uppercase tracking-widest font-semibold">{currentWork.status} • GESTÃO DE EXECUÇÃO</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {currentWork?.plan_id && (
                                    <button
                                        onClick={() => importPlanItems(currentWork.plan_id!, currentWork.id)}
                                        className="px-4 py-2 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-green-200 transition-all border border-green-200 dark:border-green-800"
                                    >
                                        <ArrowRight className="rotate-180" size={16} /> Sincronizar
                                    </button>
                                )}
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-green-700 shadow-md shadow-green-950/20"
                                >
                                    <Save size={16} /> Salvar
                                </button>
                            </div>
                        </div>

                        <div className="flex px-6 bg-white dark:bg-slate-900 overflow-x-auto no-scrollbar">
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
                                    className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-green-600 text-green-600 dark:text-green-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    <tab.icon size={16} /> {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Sub-Header forms for Add (Fixed) */}
                        {activeTab === 'servicos' && (
                            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">Adicionar Serviço</h3>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                    <div className="md:col-span-4">
                                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Descrição</label>
                                        <input type="text" id="svc_desc" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900 outline-none text-slate-900 dark:text-slate-100" placeholder="Ex: Pintura de Parede" />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Un</label>
                                        <input type="text" id="svc_unit" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900 outline-none text-slate-900 dark:text-slate-100" placeholder="m²" />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Qtd</label>
                                        <input type="number" id="svc_qty" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900 outline-none text-slate-900 dark:text-slate-100" placeholder="0" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Unit. Mat.</label>
                                        <input type="number" id="svc_mat" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900 outline-none text-slate-900 dark:text-slate-100" placeholder="0.00" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Unit. M.O.</label>
                                        <input type="number" id="svc_lab" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900 outline-none text-slate-900 dark:text-slate-100" placeholder="0.00" />
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
                                                    unit_material_cost: mat,
                                                    unit_labor_cost: lab,
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
                                            className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 font-bold text-xs h-9 flex items-center justify-center gap-1 shadow-md shadow-green-950/20"
                                        >
                                            <Plus size={14} /> ADICIONAR
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'recursos' && (
                            <div className="px-6 pb-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                <div className="flex gap-1.5 my-3 justify-center">
                                    {[{ id: 'material', label: 'Materiais' }, { id: 'mo', label: 'Mão de Obra' }, { id: 'indireto', label: 'Indiretos' }, { id: 'impostos', label: 'Impostos' }].map(r => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => setResourceTab(r.id as any)}
                                            className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all uppercase tracking-wider ${resourceTab === r.id ? 'bg-green-600 dark:bg-green-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-green-50 dark:hover:bg-green-900/30'}`}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                    {resourceTab === 'material' && (
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                            <div className="md:col-span-5">
                                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Material</label>
                                                <input type="text" id="mat_name" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900 outline-none text-slate-700 dark:text-slate-100" placeholder="Ex: Cimento CP-II" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Qtd</label>
                                                <input type="number" id="mat_qty" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900 outline-none text-slate-700 dark:text-slate-100" placeholder="0" />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Und</label>
                                                <input type="text" id="mat_unit" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900 outline-none text-slate-700 dark:text-slate-100" placeholder="un" />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Custo Unit.</label>
                                                <input type="number" id="mat_cost" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900 outline-none text-slate-700 dark:text-slate-100" placeholder="0.00" />
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
                                                    className="w-full bg-green-600 dark:bg-green-500 text-white p-2 rounded hover:bg-green-700 dark:hover:bg-green-400 font-bold text-xs h-9 shadow-sm"
                                                >
                                                    ADICIONAR MATERIAL
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {resourceTab === 'mo' && (
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                            <div className="md:col-span-4">
                                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Função</label>
                                                <input type="text" id="mo_role" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900 outline-none text-slate-700 dark:text-slate-100" placeholder="Ex: Pedreiro" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Tipo</label>
                                                <select id="mo_type" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 outline-none text-slate-700 dark:text-slate-100">
                                                    <option value="Diária">Diária</option>
                                                    <option value="Hora">Hora</option>
                                                    <option value="Empreitada">Empreitada</option>
                                                </select>
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Qtd</label>
                                                <input type="number" id="mo_qty" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900 outline-none text-slate-700 dark:text-slate-100" placeholder="0" />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">UN</label>
                                                <input type="text" id="mo_un" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900 outline-none text-slate-700 dark:text-slate-100" placeholder="un" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Custo Unit.</label>
                                                <input type="number" id="mo_cost" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900 outline-none text-slate-700 dark:text-slate-100" placeholder="0.00" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const role = (document.getElementById('mo_role') as HTMLInputElement).value;
                                                        const type = (document.getElementById('mo_type') as HTMLInputElement).value as any;
                                                        const qty = parseFloat((document.getElementById('mo_qty') as HTMLInputElement).value) || 0;
                                                        const unit = (document.getElementById('mo_un') as HTMLInputElement).value || 'un';
                                                        const cost = parseFloat((document.getElementById('mo_cost') as HTMLInputElement).value) || 0;
                                                        if (!role) return notify("Função obrigatória", "error");

                                                        setLabor([...labor, {
                                                            id: db.generateId('LBR'),
                                                            work_id: currentWork?.id || '',
                                                            role: role.toUpperCase(),
                                                            cost_type: type,
                                                            unit: unit,
                                                            quantity: qty,
                                                            unit_cost: cost,
                                                            charges_percent: 0,
                                                            total_cost: qty * cost
                                                        }]);
                                                        (document.getElementById('mo_role') as HTMLInputElement).value = '';
                                                        (document.getElementById('mo_qty') as HTMLInputElement).value = '';
                                                        (document.getElementById('mo_un') as HTMLInputElement).value = '';
                                                        (document.getElementById('mo_cost') as HTMLInputElement).value = '';
                                                    }}
                                                    className="w-full bg-green-600 dark:bg-green-500 text-white p-2 rounded hover:bg-green-700 dark:hover:bg-green-400 font-bold text-xs h-9 shadow-sm"
                                                >
                                                    ADICIONAR M.O.
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {resourceTab === 'indireto' && (
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                            <div className="md:col-span-3">
                                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Categoria</label>
                                                <select id="ind_cat" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 outline-none text-slate-700 dark:text-slate-100">
                                                    <option>Transporte</option>
                                                    <option>Alimentação</option>
                                                    <option>EPI</option>
                                                    <option>Equipamentos</option>
                                                    <option>Taxas</option>
                                                    <option>Outros</option>
                                                </select>
                                            </div>
                                            <div className="md:col-span-6">
                                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Descrição</label>
                                                <input type="text" id="ind_desc" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900 outline-none text-slate-700 dark:text-slate-100" placeholder="Ex: Combustível ida/volta" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor</label>
                                                <input type="number" id="ind_val" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900 outline-none text-slate-700 dark:text-slate-100" placeholder="0.00" />
                                            </div>
                                            <div className="md:col-span-1">
                                                <button
                                                    type="button"
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
                                                    className="w-full bg-green-600 dark:bg-green-500 text-white p-2 rounded hover:bg-green-700 dark:hover:bg-green-400 font-bold text-xs h-9 flex items-center justify-center shadow-sm"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-8 flex-1 bg-slate-50/50 dark:bg-slate-900/30">
                        {activeTab === 'dados' && currentWork && (
                            <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome Identificador da Obra</label>
                                        <input
                                            type="text"
                                            value={currentWork.name}
                                            onChange={e => setCurrentWork({ ...currentWork, name: e.target.value.toUpperCase() })}
                                            className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-green-500/20 dark:focus:ring-green-500/10 outline-none shadow-sm transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Status de Execução</label>
                                        <select
                                            value={currentWork.status}
                                            onChange={e => setCurrentWork({ ...currentWork, status: e.target.value as any })}
                                            className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-100 outline-none shadow-sm cursor-pointer appearance-none transition-all focus:ring-2 focus:ring-green-500/20"
                                        >
                                            <option value="Em Andamento">Em Andamento</option>
                                            <option value="Pausada">Pausada</option>
                                            <option value="Concluída">Concluída</option>
                                        </select>
                                    </div>
                                </div>
                                {/* Customer Select */}
                                <div className="space-y-1.5">
                                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cliente Vinculado</label>
                                    <select
                                        value={currentWork.client_id}
                                        onChange={e => {
                                            const clientId = e.target.value;
                                            const customer = customers.find(c => c.id === clientId);
                                            setCurrentWork({
                                                ...currentWork,
                                                client_id: clientId,
                                                client_name: customer ? customer.name : ''
                                            });
                                        }}
                                        className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-100 outline-none shadow-sm cursor-pointer transition-all focus:ring-2 focus:ring-green-500/20"
                                    >
                                        <option value="">Selecione um cliente...</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Endereço da Obra</label>
                                    <input
                                        type="text"
                                        value={currentWork.address}
                                        onChange={e => setCurrentWork({ ...currentWork, address: e.target.value })}
                                        className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-100 outline-none shadow-sm transition-all focus:ring-2 focus:ring-green-500/20"
                                        placeholder="Ex: Rua, Número, Bairro, Cidade..."
                                    />
                                </div>
                                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed">
                                        Nota: Os dados preenchidos aqui são utilizados nos cabeçalhos de todos os relatórios e documentos gerados para esta obra.
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'servicos' && (
                            <div className="max-w-4xl mx-auto space-y-2 p-4">
                                {services.map((svc) => (
                                    <div
                                        key={svc.id}
                                        className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center transition-all group hover:border-green-300 dark:hover:border-green-500 shadow-sm"
                                    >
                                        {editingId === svc.id ? (
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                                                <div className="md:col-span-4">
                                                    <input
                                                        type="text"
                                                        value={editDesc}
                                                        onChange={e => setEditDesc(e.target.value)}
                                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm font-bold text-slate-900 dark:text-slate-100 uppercase"
                                                    />
                                                </div>
                                                <div className="md:col-span-1">
                                                    <input
                                                        type="text"
                                                        value={editUnit}
                                                        onChange={e => setEditUnit(e.target.value)}
                                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-slate-100"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <input
                                                        type="number"
                                                        value={editQty}
                                                        onChange={e => setEditQty(parseFloat(e.target.value) || 0)}
                                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-slate-100"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <input
                                                        type="number"
                                                        value={editPrice1}
                                                        onChange={e => setEditPrice1(parseFloat(e.target.value) || 0)}
                                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-300"
                                                        placeholder="Mat"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <input
                                                        type="number"
                                                        value={editPrice2}
                                                        onChange={e => setEditPrice2(parseFloat(e.target.value) || 0)}
                                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-300"
                                                        placeholder="MO"
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
                                                        className="text-green-600 p-1 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                                                    >
                                                        <CheckCircle size={16} />
                                                    </button>
                                                    <button onClick={() => setEditingId(null)} className="text-red-600 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-3 grow">
                                                    <div className="grow text-slate-900 dark:text-slate-100 text-sm">
                                                        <span className="whitespace-nowrap">
                                                            <b className="dark:text-green-400 uppercase">{svc.description}</b> | {svc.quantity} {svc.unit} x R$ {(svc.unit_material_cost + svc.unit_labor_cost).toFixed(2)}
                                                        </span>
                                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-semibold mt-0.5 opacity-60">
                                                            <span>Mat: R$ {svc.unit_material_cost.toFixed(2)}</span>
                                                            <span className="w-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"></span>
                                                            <span>MO: R$ {svc.unit_labor_cost.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100">R$ {svc.total_cost.toFixed(2)}</p>
                                                    </div>
                                                    <div className="flex gap-1 border-l pl-3 border-slate-100 dark:border-slate-800">
                                                        <button
                                                            onClick={() => {
                                                                setEditingId(svc.id);
                                                                setEditDesc(svc.description);
                                                                setEditUnit(svc.unit);
                                                                setEditQty(svc.quantity);
                                                                setEditPrice1(svc.unit_material_cost);
                                                                setEditPrice2(svc.unit_labor_cost);
                                                            }}
                                                            className="p-1.5 text-slate-300 hover:text-green-500 transition-colors"
                                                        >
                                                            <Pencil size={18} />
                                                        </button>
                                                        <button onClick={() => handleDeleteService(svc.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                                {services.length === 0 && (
                                    <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhum serviço lançado.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'recursos' && (
                            <div className="max-w-4xl mx-auto space-y-6">
                                {/* MATERIAL TAB CONTENT */}
                                {resourceTab === 'material' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tighter text-lg">Insumos e Materiais</h3>
                                            {materials.length > 0 && (
                                                <button
                                                    onClick={handlePreviewMaterials}
                                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
                                                >
                                                    <Eye size={18} className="text-green-600" /> Visualizar Lista
                                                </button>
                                            )}
                                        </div>

                                        {materials.length > 0 && (
                                            <div className="flex items-center justify-between bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mb-4 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded-md border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-green-600 focus:ring-green-500 cursor-pointer"
                                                        checked={selectedMaterials.length === materials.length && materials.length > 0}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedMaterials(materials.map(m => m.id));
                                                            else setSelectedMaterials([]);
                                                        }}
                                                    />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {selectedMaterials.length} SELECIONADO(S)
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    {selectedMaterials.length > 0 && (
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm(`Excluir ${selectedMaterials.length} materiais selecionados?`)) {
                                                                    const idsToRemove = [...selectedMaterials];
                                                                    setMaterials(materials.filter(m => !idsToRemove.includes(m.id)));
                                                                    setSelectedMaterials([]);
                                                                    Promise.all(idsToRemove.map(id => db.remove('serviflow_work_materials', id)));
                                                                    notify("Materiais removidos!");
                                                                }
                                                            }}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-all border border-red-100 dark:border-red-800"
                                                        >
                                                            <Trash2 size={12} /> Excluir Selecionados
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm("Deseja realmente excluir TODOS os materiais desta lista?")) {
                                                                setMaterials([]);
                                                                setSelectedMaterials([]);
                                                                db.deleteByCondition('serviflow_work_materials', 'work_id', currentWork.id);
                                                                notify("Lista de materiais limpa!");
                                                            }
                                                        }}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
                                                    >
                                                        <Archive size={12} /> Limpar Lista
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            {materials.map((m, index) => (
                                                editingId === m.id ? (
                                                    <div key={m.id} className="bg-white dark:bg-slate-900/50 p-3 rounded-lg border border-green-400 flex justify-between items-center text-sm shadow-md transition-all">
                                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 items-center mr-2">
                                                            <div className="md:col-span-8">
                                                                <input
                                                                    type="text"
                                                                    value={editDesc}
                                                                    onChange={e => setEditDesc(e.target.value)}
                                                                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 uppercase"
                                                                    placeholder="DESCRIÇÃO DO MATERIAL"
                                                                />
                                                            </div>
                                                            <div className="md:col-span-1">
                                                                <input
                                                                    type="text"
                                                                    value={editUnit}
                                                                    onChange={e => setEditUnit(e.target.value)}
                                                                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 uppercase"
                                                                    placeholder="UN"
                                                                />
                                                            </div>
                                                            <div className="md:col-span-1">
                                                                <input
                                                                    type="number"
                                                                    value={editQty}
                                                                    onChange={e => setEditQty(parseFloat(e.target.value) || 0)}
                                                                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-slate-100"
                                                                />
                                                            </div>
                                                            <div className="md:col-span-1">
                                                                <input
                                                                    type="number"
                                                                    value={editPrice1}
                                                                    onChange={e => setEditPrice1(parseFloat(e.target.value) || 0)}
                                                                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-slate-100"
                                                                    placeholder="Custo Unit."
                                                                />
                                                            </div>
                                                            <div className="md:col-span-1 flex gap-1">
                                                                <button
                                                                    onClick={() => {
                                                                        const upMaterial = {
                                                                            ...m,
                                                                            material_name: editDesc.toUpperCase(),
                                                                            quantity: editQty,
                                                                            unit: editUnit.toUpperCase(),
                                                                            unit_cost: editPrice1,
                                                                            total_cost: editQty * editPrice1
                                                                        };
                                                                        const updated = materials.map(item => item.id === m.id ? upMaterial : item);
                                                                        setMaterials(updated);
                                                                        const allMaterial = db.load('serviflow_work_materials', []) as WorkMaterial[];
                                                                        const finalMaterials = allMaterial.map(item => item.id === m.id ? upMaterial : item);
                                                                        db.save('serviflow_work_materials', finalMaterials, [upMaterial]);
                                                                        setEditingId(null);
                                                                        notify("Material atualizado!");
                                                                    }}
                                                                    className="text-green-600 p-1 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                                                                >
                                                                    <Check size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingId(null)}
                                                                    className="text-red-600 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div key={m.id} className="bg-white dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm shadow-sm transition-all hover:border-green-400 group">
                                                        <div className="flex items-center gap-3 grow">
                                                            <input
                                                                type="checkbox"
                                                                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500 bg-white dark:bg-slate-900"
                                                                checked={selectedMaterials.includes(m.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setSelectedMaterials([...selectedMaterials, m.id]);
                                                                    else setSelectedMaterials(selectedMaterials.filter(id => id !== m.id));
                                                                }}
                                                            />
                                                            <div className="grow text-slate-900 dark:text-slate-100 min-w-0">
                                                                <span className="break-words"><b className="dark:text-green-400 uppercase">{m.material_name}</b> | (R$ {m.unit_cost.toFixed(2)}) {m.quantity} {m.unit}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs shrink-0">
                                                            <div className="w-32 text-right">
                                                                <span className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">R$ {m.total_cost.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => {
                                                                    setEditingId(m.id);
                                                                    setEditDesc(m.material_name);
                                                                    setEditQty(m.quantity);
                                                                    setEditUnit(m.unit);
                                                                    setEditPrice1(m.unit_cost);
                                                                }} className="p-1.5 text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-all"><Pencil size={14} /></button>
                                                                <button onClick={() => handleDeleteMaterial(m.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            ))}
                                            {materials.length > 0 && (
                                                <div className="flex justify-end items-center p-4 bg-green-50/50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/30 mt-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-green-600/60 dark:text-green-400/60 uppercase tracking-[0.2em]">Total Materiais</span>
                                                        <span className="text-xl font-black text-green-700 dark:text-green-400">R$ {totalMaterial.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {materials.length === 0 && (
                                                <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhum material lançado ainda.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* LABOR TAB CONTENT */}
                                {resourceTab === 'mo' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tighter text-lg">Mão de Obra</h3>
                                        </div>

                                        {labor.length > 0 && (
                                            <div className="flex items-center justify-between bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mb-4 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded-md border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-green-600 focus:ring-green-500 cursor-pointer"
                                                        checked={selectedLabor.length === labor.length && labor.length > 0}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedLabor(labor.map(l => l.id));
                                                            else setSelectedLabor([]);
                                                        }}
                                                    />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {selectedLabor.length} SELECIONADO(S)
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    {selectedLabor.length > 0 && (
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm(`Excluir ${selectedLabor.length} itens de mão de obra selecionados?`)) {
                                                                    const idsToRemove = [...selectedLabor];
                                                                    setLabor(labor.filter(l => !idsToRemove.includes(l.id)));
                                                                    setSelectedLabor([]);
                                                                    Promise.all(idsToRemove.map(id => db.remove('serviflow_work_labor', id)));
                                                                    notify("Mão de obra removida!");
                                                                }
                                                            }}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-all border border-red-100 dark:border-red-800"
                                                        >
                                                            <Trash2 size={12} /> Excluir Selecionados
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm("Deseja realmente excluir TODA a mão de obra desta lista?")) {
                                                                setLabor([]);
                                                                setSelectedLabor([]);
                                                                db.deleteByCondition('serviflow_work_labor', 'work_id', currentWork.id);
                                                                notify("Lista de mão de obra limpa!");
                                                            }
                                                        }}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
                                                    >
                                                        <Archive size={12} /> Limpar Lista
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            {labor.map((l, index) => (
                                                editingId === l.id ? (
                                                    <div key={l.id} className="bg-white dark:bg-slate-900/50 p-3 rounded-lg border border-green-400 flex justify-between items-center text-sm shadow-md transition-all">
                                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 items-center mr-2">
                                                            <div className="md:col-span-8">
                                                                <input
                                                                    type="text"
                                                                    value={editDesc}
                                                                    onChange={e => setEditDesc(e.target.value)}
                                                                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 uppercase"
                                                                    placeholder="FUNÇÃO / CARGO"
                                                                />
                                                            </div>
                                                            <div className="md:col-span-1">
                                                                <input
                                                                    type="text"
                                                                    value={editUnit}
                                                                    onChange={e => setEditUnit(e.target.value)}
                                                                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 uppercase"
                                                                    placeholder="UN"
                                                                />
                                                            </div>
                                                            <div className="md:col-span-1">
                                                                <input
                                                                    type="number"
                                                                    value={editQty}
                                                                    onChange={e => setEditQty(parseFloat(e.target.value) || 0)}
                                                                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-slate-100"
                                                                />
                                                            </div>
                                                            <div className="md:col-span-1">
                                                                <input
                                                                    type="number"
                                                                    value={editPrice1}
                                                                    onChange={e => setEditPrice1(parseFloat(e.target.value) || 0)}
                                                                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-slate-100"
                                                                    placeholder="Custo Unit."
                                                                />
                                                            </div>
                                                            <div className="md:col-span-1 flex gap-1">
                                                                <button
                                                                    onClick={() => {
                                                                        const upLabor = {
                                                                            ...l,
                                                                            role: editDesc.toUpperCase(),
                                                                            quantity: editQty,
                                                                            unit: editUnit.toUpperCase(),
                                                                            unit_cost: editPrice1,
                                                                            total_cost: editQty * editPrice1
                                                                        };
                                                                        const updated = labor.map(item => item.id === l.id ? upLabor : item);
                                                                        setLabor(updated);
                                                                        const allLabor = db.load('serviflow_work_labor', []) as WorkLabor[];
                                                                        const finalLabor = allLabor.map(item => item.id === l.id ? upLabor : item);
                                                                        db.save('serviflow_work_labor', finalLabor, [upLabor]);
                                                                        setEditingId(null);
                                                                        notify("Mão de obra atualizada!");
                                                                    }}
                                                                    className="text-green-600 p-1 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                                                                >
                                                                    <Check size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingId(null)}
                                                                    className="text-red-600 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div key={l.id} className="bg-white dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm shadow-sm transition-all hover:border-green-400 group">
                                                        <div className="flex items-center gap-3 grow">
                                                            <input
                                                                type="checkbox"
                                                                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500 bg-white dark:bg-slate-900"
                                                                checked={selectedLabor.includes(l.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setSelectedLabor([...selectedLabor, l.id]);
                                                                    else setSelectedLabor(selectedLabor.filter(id => id !== l.id));
                                                                }}
                                                            />
                                                            <div className="grow text-slate-900 dark:text-slate-100 min-w-0">
                                                                <span className="break-words"><b className="dark:text-amber-400 uppercase">{l.role}</b> | ({l.cost_type}) {l.quantity}{l.unit || 'un'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs shrink-0">
                                                            <div className="w-32 text-right">
                                                                <span className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">R$ {l.total_cost.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => {
                                                                    setEditingId(l.id);
                                                                    setEditDesc(l.role);
                                                                    setEditUnit(l.unit || 'un');
                                                                    setEditQty(l.quantity);
                                                                    setEditPrice1(l.unit_cost);
                                                                    setEditPrice2(0);
                                                                }} className="p-1.5 text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-all"><Pencil size={14} /></button>
                                                                <button onClick={() => handleDeleteLabor(l.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            ))}
                                            {labor.length > 0 && (
                                                <div className="flex justify-end items-center p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30 mt-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-amber-600/60 dark:text-amber-400/60 uppercase tracking-[0.2em]">Total Mão de Obra</span>
                                                        <span className="text-xl font-black text-amber-700 dark:text-amber-400">R$ {totalLabor.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {labor.length === 0 && (
                                                <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhuma mão de obra lançada.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* INDIRECT TAB CONTENT */}
                                {resourceTab === 'indireto' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tighter text-lg">Custos Indiretos</h3>
                                        </div>

                                        {indirects.length > 0 && (
                                            <div className="flex items-center justify-between bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mb-4 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded-md border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-green-600 focus:ring-green-500 cursor-pointer"
                                                        checked={selectedIndirects.length === indirects.length && indirects.length > 0}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedIndirects(indirects.map(i => i.id));
                                                            else setSelectedIndirects([]);
                                                        }}
                                                    />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {selectedIndirects.length} SELECIONADO(S)
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    {selectedIndirects.length > 0 && (
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm(`Excluir ${selectedIndirects.length} custos indiretos selecionados?`)) {
                                                                    const idsToRemove = [...selectedIndirects];
                                                                    setIndirects(indirects.filter(i => !idsToRemove.includes(i.id)));
                                                                    setSelectedIndirects([]);
                                                                    Promise.all(idsToRemove.map(id => db.remove('serviflow_work_indirects', id)));
                                                                    notify("Custos indiretos removidos!");
                                                                }
                                                            }}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-all border border-red-100 dark:border-red-800"
                                                        >
                                                            <Trash2 size={12} /> Excluir Selecionados
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm("Deseja realmente excluir TODOS os custos indiretos desta lista?")) {
                                                                setIndirects([]);
                                                                setSelectedIndirects([]);
                                                                db.deleteByCondition('serviflow_work_indirects', 'work_id', currentWork.id);
                                                                notify("Lista de custos indiretos limpa!");
                                                            }
                                                        }}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
                                                    >
                                                        <Archive size={12} /> Limpar Lista
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            {indirects.map((i, index) => (
                                                editingId === i.id ? (
                                                    <div key={i.id} className="bg-white dark:bg-slate-900/50 p-3 rounded-lg border border-green-400 flex justify-between items-center text-sm shadow-md transition-all">
                                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 items-center mr-2">
                                                            <div className="md:col-span-3">
                                                                <select
                                                                    value={editUnit}
                                                                    onChange={e => setEditUnit(e.target.value)}
                                                                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100"
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
                                                                    onChange={e => setEditDesc(e.target.value)}
                                                                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-slate-100 uppercase"
                                                                    placeholder="DESCRIÇÃO"
                                                                />
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <input
                                                                    type="number"
                                                                    value={editPrice1}
                                                                    onChange={e => setEditPrice1(parseFloat(e.target.value) || 0)}
                                                                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-slate-100"
                                                                />
                                                            </div>
                                                            <div className="md:col-span-1 flex gap-1">
                                                                <button
                                                                    onClick={() => {
                                                                        const upIndirect = {
                                                                            ...i,
                                                                            category: editUnit,
                                                                            description: editDesc.toUpperCase(),
                                                                            value: editPrice1
                                                                        };
                                                                        const updated = indirects.map(item => item.id === i.id ? upIndirect : item);
                                                                        setIndirects(updated);
                                                                        const allInd = db.load('serviflow_work_indirects', []) as WorkIndirect[];
                                                                        const finalInd = allInd.map(item => item.id === i.id ? upIndirect : item);
                                                                        db.save('serviflow_work_indirects', finalInd, [upIndirect]);
                                                                        setEditingId(null);
                                                                        notify("Custo indireto atualizado!");
                                                                    }}
                                                                    className="text-green-600 p-1 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                                                                >
                                                                    <Check size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingId(null)}
                                                                    className="text-red-600 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div key={i.id} className="bg-white dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm shadow-sm transition-all hover:border-green-400 group">
                                                        <div className="flex items-center gap-3 grow">
                                                            <input
                                                                type="checkbox"
                                                                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500 bg-white dark:bg-slate-900"
                                                                checked={selectedIndirects.includes(i.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setSelectedIndirects([...selectedIndirects, i.id]);
                                                                    else setSelectedIndirects(selectedIndirects.filter(id => id !== i.id));
                                                                }}
                                                            />
                                                            <div className="grow text-slate-900 dark:text-slate-100 min-w-0">
                                                                <span className="break-words"><b className="text-slate-400 dark:text-slate-500">[{i.category}]</b> <b>{i.description}</b></span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs shrink-0">
                                                            <div className="w-32 text-right">
                                                                <span className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">R$ {i.value.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => {
                                                                    setEditingId(i.id);
                                                                    setEditDesc(i.description);
                                                                    setEditUnit(i.category);
                                                                    setEditPrice1(i.value);
                                                                }} className="p-1.5 text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-all"><Pencil size={14} /></button>
                                                                <button onClick={() => handleDeleteIndirect(i.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            ))}
                                            {indirects.length > 0 && (
                                                <div className="flex justify-end items-center p-4 bg-slate-100/50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700 mt-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-slate-500/60 dark:text-slate-400/60 uppercase tracking-[0.2em]">Total Indiretos</span>
                                                        <span className="text-xl font-black text-slate-700 dark:text-slate-200">R$ {totalIndirect.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {indirects.length === 0 && (
                                                <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhum custo indireto lançado.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {resourceTab === 'impostos' && (
                                    <div className="space-y-6">
                                        {/* Predefined Taxes Grid */}
                                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                    <Percent size={14} className="text-green-500 dark:text-green-400" /> Impostos e BDI Padronizados
                                                </h4>
                                                <button
                                                    type="button"
                                                    onClick={handleLoadDefaultTaxes}
                                                    className="text-[10px] font-bold text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 uppercase tracking-tighter bg-green-50 dark:bg-green-900/40 px-2 py-1 rounded transition-colors"
                                                >
                                                    Carregar Padrão (ISS/PIS/COF/INS)
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                {[
                                                    { name: 'BDI', label: 'BDI (%)', color: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800' },
                                                    { name: 'ISS', label: 'ISS (%)', color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800' },
                                                    { name: 'PIS', label: 'PIS (%)', color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' },
                                                    { name: 'COFINS', label: 'COFINS (%)', color: 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-700' },
                                                    { name: 'INSS', label: 'INSS (%)', color: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-800' }
                                                ].map(tax => (
                                                    <div key={tax.name} className={`p-3 rounded-lg border ${tax.color} `}>
                                                        <label className="block text-[10px] font-bold uppercase mb-1 opacity-70">{tax.label}</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="w-full bg-white/50 dark:bg-slate-900/50 border border-black/5 dark:border-white/5 rounded p-1 text-sm font-bold outline-none focus:ring-2 focus:ring-black/5 text-slate-900 dark:text-slate-100"
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
                                                                        id: db.generateId('WTAX'),
                                                                        work_id: currentWork?.id || '',
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
                                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Outras Taxas / Impostos Personalizados</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                                <div className="md:col-span-7">
                                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome do Item</label>
                                                    <input type="text" id="tax_name" className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900 outline-none text-slate-900 dark:text-slate-100" placeholder="Ex: Taxa Administrativa" />
                                                </div>
                                                <div className="md:col-span-3">
                                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Taxa (%)</label>
                                                    <input
                                                        type="number"
                                                        id="tax_rate"
                                                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm h-9 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900 outline-none text-slate-900 dark:text-slate-100"
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
                                                                id: db.generateId('WTAX'),
                                                                work_id: currentWork?.id || '',
                                                                name: name.toUpperCase(),
                                                                rate: rate,
                                                                value: 0
                                                            }]);

                                                            (document.getElementById('tax_name') as HTMLInputElement).value = '';
                                                            (document.getElementById('tax_rate') as HTMLInputElement).value = '';
                                                        }}
                                                        className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 font-bold text-xs h-9 shadow-md shadow-green-950/20 flex items-center justify-center gap-2"
                                                    >
                                                        <Plus size={16} /> ADICIONAR
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-span-full mt-2">
                                            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Detalhamento dos Custos Indiretos / BDI</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {taxes.filter(t => (t.rate > 0 || t.value > 0)).map(t => (
                                                    <div key={t.id} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center shadow-sm">
                                                        <div>
                                                            <span className="font-black text-xs text-slate-700 dark:text-slate-200">{t.name}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 ml-2">
                                                                {t.rate > 0 ? `${t.rate}% ` : `R$ ${t.value.toFixed(2)} `}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="font-bold text-xs text-green-600 dark:text-green-400">
                                                                R$ {(t.rate > 0 ? (t.name === 'BDI' ? totalDirect : totalGeneral) * (t.rate / 100) : t.value).toFixed(2)}
                                                            </span>
                                                            <button onClick={() => handleDeleteTax(t.id)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors">
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
                        )}

                        {activeTab === 'resumo' && (
                            <div className="max-w-4xl mx-auto space-y-8 pb-12">
                                {/* Summary Cards Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                                    {/* Materiais */}
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm transition-all hover:shadow-md">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Materiais</span>
                                            <div className="bg-emerald-100 dark:bg-emerald-900/40 p-1.5 rounded-lg">
                                                <Truck size={16} className="text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                        </div>
                                        <span className="text-2xl font-black text-emerald-900 dark:text-emerald-100 whitespace-nowrap">R$ {totalMaterial.toFixed(2)}</span>
                                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">Insumos + Materiais de Serviços</p>
                                    </div>
                                    {/* Mão de Obra */}
                                    <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm transition-all hover:shadow-md">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Total Mão de Obra</span>
                                            <div className="bg-amber-100 dark:bg-amber-900/40 p-1.5 rounded-lg">
                                                <HardHat size={16} className="text-amber-600 dark:text-amber-400" />
                                            </div>
                                        </div>
                                        <span className="text-2xl font-black text-amber-900 dark:text-amber-100 whitespace-nowrap">R$ {totalLabor.toFixed(2)}</span>
                                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium">Equipe Própria + Terceirizada</p>
                                    </div>
                                    {/* Indiretos */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Indiretos</span>
                                            <div className="bg-slate-200 dark:bg-slate-700 p-1.5 rounded-lg">
                                                <Archive size={16} className="text-slate-600 dark:text-slate-300" />
                                            </div>
                                        </div>
                                        <span className="text-2xl font-black text-slate-800 dark:text-slate-100 whitespace-nowrap">R$ {totalIndirect.toFixed(2)}</span>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Custos Administrativos</p>
                                    </div>
                                    {/* Impostos */}
                                    <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800 shadow-sm transition-all hover:shadow-md">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">Total Impostos</span>
                                            <div className="bg-green-100 dark:bg-green-900/40 p-1.5 rounded-lg">
                                                <Percent size={16} className="text-green-600 dark:text-green-400" />
                                            </div>
                                        </div>
                                        <span className="text-2xl font-black text-green-900 dark:text-green-100 whitespace-nowrap">R$ {totalTaxes.toFixed(2)}</span>
                                        <p className="text-[10px] text-green-600 dark:text-green-400 mt-1 font-medium">Baseado no BDI e Taxas</p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={handlePreviewFull}
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 px-6 py-4 rounded-2xl text-base font-bold flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-md group border-b-4 border-b-green-600 active:border-b-0 active:translate-y-1"
                                    >
                                        <div className="bg-green-100 dark:bg-green-900/40 p-2 rounded-xl group-hover:scale-110 transition-transform">
                                            <Eye size={24} className="text-green-600 dark:text-green-400" />
                                        </div>
                                        <div className="text-left">
                                            <span className="block text-slate-800 dark:text-slate-100 leading-none">Visualizar e Gerar PDF</span>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none font-bold">Relatório Completo</span>
                                        </div>
                                    </button>
                                </div>

                                {/* Total Cost Block */}
                                <div className="bg-slate-900 text-white p-8 rounded-2xl flex justify-between items-center shadow-xl">
                                    <div>
                                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Custo Executado Total</p>
                                        <p className="text-4xl font-bold whitespace-nowrap">R$ {totalGeneral.toFixed(2)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1 opacity-50">Baseado em Entradas Reais</p>
                                        <div className="flex items-center gap-2 text-green-400 font-bold">
                                            <Calculator size={20} />
                                            <span>Valores Consolidados</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <ReportPreview
                        isOpen={showPreview}
                        onClose={() => setShowPreview(false)}
                        title={previewContent.title}
                        htmlContent={previewContent.html}
                        filename={previewContent.filename}
                    />
                </div>
            )}
        </div>
    );
};

export default WorksManager;
