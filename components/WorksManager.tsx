import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Building2, Truck, HardHat, FileText,
    Plus, Trash2, Save, ArrowRight, Calculator,
    PieChart, Calendar, Pencil, Check, X, Percent, Eye, Archive, Copy, TrendingUp
} from 'lucide-react';
import { useNotify } from './ToastProvider';
import { db } from '../services/db';
import ReportPreview from './ReportPreview';
import { AutoSave } from './AutoSave';
import {
    WorkHeader, WorkService, WorkMaterial,
    WorkLabor, WorkIndirect, Customer,
    PlannedService, WorkTax, CompanyProfile
} from '../types';
import { buildExecutionReportHtml, EXECUTION_THEME } from '../services/reportPdfService';

interface Props {
    customers: Customer[];
    company: any;
    embeddedPlanId?: string | null;
    onBack?: () => void;
}

// ==================== HOOKS PERSONALIZADOS ====================

const useWorkCalculations = (
    services: WorkService[],
    materials: WorkMaterial[],
    labor: WorkLabor[],
    indirects: WorkIndirect[],
    taxes: WorkTax[]
) => {
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

    const totalIndirect = useMemo(() => {
        const fromIndirects = indirects.reduce((acc, i) => acc + i.value, 0);
        const fromSvcs = services.reduce((acc, s) => acc + (s.unit_indirect_cost * s.quantity), 0);
        return fromIndirects + fromSvcs;
    }, [indirects, services]);

    const totalDirect = useMemo(
        () => totalMaterial + totalLabor + totalIndirect,
        [totalMaterial, totalLabor, totalIndirect]
    );

    const bdiTax = useMemo(() => taxes.find(t => t.name === 'BDI'), [taxes]);
    const otherTaxes = useMemo(() => taxes.filter(t => t.name !== 'BDI'), [taxes]);

    const bdiValue = useMemo(() => {
        if (!bdiTax) return 0;
        return bdiTax.rate > 0 ? (totalDirect * (bdiTax.rate / 100)) : bdiTax.value;
    }, [bdiTax, totalDirect]);

    const desiredLiquid = totalDirect + bdiValue;

    const taxFactor = useMemo(() => {
        const sumRates = otherTaxes.reduce((acc, t) => acc + (t.rate > 0 ? (t.rate / 100) : 0), 0);
        return Math.max(0.01, 1 - sumRates);
    }, [otherTaxes]);

    const totalGeneral = useMemo(() => {
        const sumFixed = otherTaxes.reduce((acc, t) => acc + (t.rate > 0 ? 0 : t.value), 0);
        return (desiredLiquid + sumFixed) / taxFactor;
    }, [desiredLiquid, otherTaxes, taxFactor]);

    const individualTaxValues = useMemo(() => {
        return otherTaxes.map(t => ({
            name: t.name,
            value: t.rate > 0 ? (totalGeneral * (t.rate / 100)) : t.value
        }));
    }, [otherTaxes, totalGeneral]);

    const totalCharges = useMemo(() => totalGeneral - totalDirect, [totalGeneral, totalDirect]);
    const otherTaxesValue = useMemo(() => totalCharges - bdiValue, [totalCharges, bdiValue]);

    return {
        totalMaterial,
        totalLabor,
        totalIndirect,
        totalDirect,
        totalGeneral,
        totalTaxes: totalCharges,
        bdiValue,
        otherTaxesValue,
        individualTaxValues
    };
};

const useItemManager = <T extends { id: string; work_id?: string }>(
    storageKey: string,
    setItems: React.Dispatch<React.SetStateAction<T[]>>,
    currentWorkId?: string
) => {
    const { notify } = useNotify();

    const addItem = useCallback((newItem: Omit<T, 'id' | 'work_id'>) => {
        const item = {
            ...newItem,
            id: db.generateId(storageKey.split('_').pop()?.toUpperCase() || 'ITEM'),
            work_id: currentWorkId
        } as T;

        setItems(prev => [...prev, item]);
        return item;
    }, [currentWorkId, setItems, storageKey]);

    const updateItem = useCallback((id: string, updates: Partial<T>) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    }, [setItems]);

    const deleteItem = useCallback(async (id: string, confirmMessage: string) => {
        if (!confirm(confirmMessage)) return false;
        setItems(prev => prev.filter(item => item.id !== id));
        await db.remove(storageKey, id);
        notify('Item removido com sucesso', 'success');
        return true;
    }, [storageKey, setItems, notify]);

    const deleteMultiple = useCallback(async (ids: string[], itemName: string) => {
        if (!confirm(`Excluir ${ids.length} ${itemName}(s) selecionado(s)?`)) return false;
        setItems(prev => prev.filter(item => !ids.includes(item.id)));
        await Promise.all(ids.map(id => db.remove(storageKey, id)));
        notify(`${ids.length} ${itemName}(s) removidos`, 'success');
        return true;
    }, [storageKey, setItems, notify]);

    const clearAll = useCallback(async (confirmMessage: string) => {
        if (!confirm(confirmMessage)) return false;
        setItems([]);
        const all = db.load(storageKey, []);
        const others = all.filter((i: any) => i.work_id !== currentWorkId);
        await db.save(storageKey, others);
        notify('Todos os itens removidos', 'success');
        return true;
    }, [storageKey, currentWorkId, setItems, notify]);

    return useMemo(() => ({
        addItem,
        updateItem,
        deleteItem,
        deleteMultiple,
        clearAll
    }), [addItem, updateItem, deleteItem, deleteMultiple, clearAll]);
};

const useEditState = <T extends { id: string }>() => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<T>>({});

    const startEditing = useCallback((item: T) => {
        setEditingId(item.id);
        setEditData(item);
    }, []);

    const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
        setEditData(prev => ({ ...prev, [field]: value }));
    }, []);

    const stopEditing = useCallback(() => {
        setEditingId(null);
        setEditData({});
    }, []);

    return { editingId, editData, startEditing, updateField, stopEditing };
};

const useMultiSelect = <T extends { id: string }>() => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }, []);

    const toggleAll = useCallback((items: T[]) => {
        setSelectedIds(prev => prev.length === items.length ? [] : items.map(i => i.id));
    }, []);

    const clearSelection = useCallback(() => setSelectedIds([]), []);

    return { selectedIds, toggleSelect, toggleAll, clearSelection };
};

// ==================== COMPONENTES REUTILIZÁVEIS ====================

interface EditableRowProps<T> {
    key?: React.Key;
    item: T;
    isEditing: boolean;
    editData: Partial<T>;
    onStartEdit: () => void;
    onUpdateField: <K extends keyof T>(field: K, value: T[K]) => void;
    onSave: () => void;
    onCancel: () => void;
    onDelete: () => void;
    renderView: (item: T) => React.ReactNode;
    renderEdit: (editData: Partial<T>, onUpdateField: any) => React.ReactNode;
    className?: string;
}

function EditableRow<T extends { id: string }>({
    item,
    isEditing,
    editData,
    onStartEdit,
    onUpdateField,
    onSave,
    onCancel,
    onDelete,
    renderView,
    renderEdit,
    className = ''
}: EditableRowProps<T>) {
    return (
        <div
            className={`p-3 rounded-lg border transition-all group ${className} ${isEditing ? 'ring-2 ring-green-400/30' : ''}`}
            onKeyDown={(e) => {
                if (!isEditing) return;
                if (e.key === 'Enter') {
                    e.preventDefault();
                    onSave();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    onCancel();
                }
            }}
        >
            {isEditing ? (
                <div className="flex-1">
                    {renderEdit(editData, onUpdateField)}
                    <div className="flex justify-end gap-2 mt-2">
                        <button onClick={onSave} className="text-green-600 p-1 hover:bg-green-50 rounded" title="Salvar (Enter)">
                            <Check size={16} />
                        </button>
                        <button onClick={onCancel} className="text-red-600 p-1 hover:bg-red-50 rounded" title="Cancelar (Esc)">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex justify-between items-center">
                    {renderView(item)}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={onStartEdit} className="p-1.5 text-slate-400 hover:text-green-500 hover:bg-green-50 rounded">
                            <Pencil size={14} />
                        </button>
                        <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded">
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

interface SelectionBarProps {
    count: number;
    total: number;
    onToggleAll: () => void;
    onDeleteSelected: () => void;
    onClearAll: () => void;
    itemName: string;
}

const SelectionBar: React.FC<SelectionBarProps> = ({
    count,
    total,
    onToggleAll,
    onDeleteSelected,
    onClearAll
}) => (
    <div className="flex items-center justify-between bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mb-4 shadow-sm">
        <div className="flex items-center gap-3">
            <input
                type="checkbox"
                className="w-4 h-4 rounded-md border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-green-600 focus:ring-green-500 cursor-pointer"
                checked={count === total && total > 0}
                onChange={onToggleAll}
            />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {count} SELECIONADO(S)
            </span>
        </div>
        <div className="flex gap-2">
            {count > 0 && (
                <button
                    onClick={onDeleteSelected}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-all border border-red-100 dark:border-red-800"
                >
                    <Trash2 size={12} /> Excluir Selecionados
                </button>
            )}
            <button
                onClick={onClearAll}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700"
            >
                <Archive size={12} /> Limpar Lista
            </button>
        </div>
    </div>
);

// ==================== COMPONENTE PRINCIPAL ====================

const WorksManager: React.FC<Props> = ({ customers, company, embeddedPlanId }) => {
    const [works, setWorks] = useState<WorkHeader[]>([]);
    const [activeWorkId, setActiveWorkId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [currentWork, setCurrentWork] = useState<WorkHeader | null>(null);
    const [services, setServices] = useState<WorkService[]>([]);
    const [materials, setMaterials] = useState<WorkMaterial[]>([]);
    const [labor, setLabor] = useState<WorkLabor[]>([]);
    const [indirects, setIndirects] = useState<WorkIndirect[]>([]);
    const [taxes, setTaxes] = useState<WorkTax[]>([]);
    const [activeTab, setActiveTab] = useState<'dados' | 'servicos' | 'recursos' | 'resumo'>('dados');
    const [resourceTab, setResourceTab] = useState<'material' | 'mo' | 'indireto' | 'impostos'>('material');
    const [showPreview, setShowPreview] = useState(false);
    const [previewContent, setPreviewContent] = useState({ title: '', html: '', filename: '' });

    const [newMaterial, setNewMaterial] = useState({ name: '', qty: '', unit: 'un', cost: '' });
    const [newLabor, setNewLabor] = useState({ role: '', type: 'Diária', qty: '', unit: 'un', cost: '' });
    const [newIndirect, setNewIndirect] = useState({ name: '', value: '' });

    const { notify } = useNotify();
    const creationAttemptedRef = useRef<Record<string, boolean>>({});
    const savingRef = useRef(false);

    const calculations = useWorkCalculations(services, materials, labor, indirects, taxes);

    const serviceEdit = useEditState<WorkService>();
    const materialEdit = useEditState<WorkMaterial>();
    const laborEdit = useEditState<WorkLabor>();
    const indirectEdit = useEditState<WorkIndirect>();

    const materialSelect = useMultiSelect<WorkMaterial>();
    const laborSelect = useMultiSelect<WorkLabor>();
    const indirectSelect = useMultiSelect<WorkIndirect>();

    const materialManager = useItemManager<WorkMaterial>('serviflow_work_materials', setMaterials, currentWork?.id);
    const laborManager = useItemManager<WorkLabor>('serviflow_work_labor', setLabor, currentWork?.id);
    const indirectManager = useItemManager<WorkIndirect>('serviflow_work_indirects', setIndirects, currentWork?.id);
    const serviceManager = useItemManager<WorkService>('serviflow_work_services', setServices, currentWork?.id);

    const loadWorks = useCallback(async () => {
        const localWorks = db.load('serviflow_works', []) as WorkHeader[];
        setWorks(localWorks);
    }, []);

    const clearCurrentLists = useCallback(() => {
        setServices([]);
        setMaterials([]);
        setLabor([]);
        setIndirects([]);
        setTaxes([]);
    }, []);

    const loadWorkDetails = useCallback((workId: string) => {
        setServices(db.load('serviflow_work_services', []).filter((s: WorkService) => s.work_id === workId));
        setMaterials(db.load('serviflow_work_materials', []).filter((m: WorkMaterial) => m.work_id === workId));
        setLabor(db.load('serviflow_work_labor', []).filter((l: WorkLabor) => l.work_id === workId));
        setIndirects(db.load('serviflow_work_indirects', []).filter((i: WorkIndirect) => i.work_id === workId));
        setTaxes(db.load('serviflow_work_taxes', []).filter((t: WorkTax) => t.work_id === workId));
    }, []);

    const importPlanItems = useCallback(async (planId: string, workId: string) => {
        let importedCount = 0;

        const planServices = db.load('serviflow_plan_services', []).filter((s: PlannedService) => s.plan_id === planId);
        const existingServices = db.load('serviflow_work_services', []).filter((s: WorkService) => s.work_id === workId);
        const existingIds = new Set(existingServices.map(s => s.plan_service_id));

        const newServices = planServices
            .filter(s => !existingIds.has(s.id))
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
                total_cost: (s.quantity || 0) * (
                    (s.unit_labor_cost || 0) +
                    (s.unit_material_cost || 0) +
                    (s.unit_indirect_cost || 0)
                ),
                status: 'Pendente' as const
            }));

        if (newServices.length > 0) {
            await db.save('serviflow_work_services', [...existingServices, ...newServices], newServices);
            importedCount += newServices.length;
        }

        const importCategory = async (
            planKey: string,
            workKey: string,
            planFilter: (i: any) => boolean,
            mapFn: (i: any) => any
        ) => {
            const planItems = db.load(planKey, []).filter(planFilter);
            const existingItems = db.load(workKey, []).filter((i: any) => i.work_id === workId);
            const existingNames = new Set(existingItems.map((i: any) => i.material_name || i.role || i.name));

            const newItems = planItems
                .filter(i => !existingNames.has(i.material_name || i.role || i.name))
                .map(mapFn);

            if (newItems.length > 0) {
                await db.save(workKey, [...existingItems, ...newItems], newItems);
                importedCount += newItems.length;
            }
        };

        await importCategory(
            'serviflow_plan_materials',
            'serviflow_work_materials',
            (m) => m.plan_id === planId,
            (m) => ({
                id: db.generateId('WMAT'),
                work_id: workId,
                material_name: m.material_name,
                unit: m.unit,
                quantity: m.quantity || 0,
                unit_cost: m.unit_cost || 0,
                total_cost: m.total_cost || 0
            })
        );

        await importCategory(
            'serviflow_plan_labor',
            'serviflow_work_labor',
            (l) => l.plan_id === planId,
            (l) => ({
                id: db.generateId('WMO'),
                work_id: workId,
                role: l.role,
                cost_type: l.cost_type,
                unit: l.unit,
                quantity: l.quantity || 0,
                unit_cost: l.unit_cost || 0,
                total_cost: l.total_cost || 0
            })
        );

        await importCategory(
            'serviflow_plan_indirects',
            'serviflow_work_indirects',
            (i) => i.plan_id === planId,
            (i) => ({
                id: db.generateId('WIND'),
                work_id: workId,
                name: i.name,
                value: i.value || 0
            })
        );

        const planTaxes = db.load('serviflow_plan_taxes', []).filter((t: any) => t.plan_id === planId);
        const existingTaxes = db.load('serviflow_work_taxes', []).filter((t: any) => t.work_id === workId);
        const existingTaxNames = new Set(existingTaxes.map((t: any) => t.name));

        const newTaxes = planTaxes
            .filter((t: any) => !existingTaxNames.has(t.name))
            .map((t: any) => ({
                id: db.generateId('WTAX'),
                work_id: workId,
                name: t.name,
                rate: t.rate || 0,
                value: t.value || 0
            }));

        if (newTaxes.length > 0) {
            await db.save('serviflow_work_taxes', [...existingTaxes, ...newTaxes], newTaxes);
            importedCount += newTaxes.length;
        }

        if (importedCount > 0) {
            notify(`${importedCount} novos itens sincronizados!`, 'success');
            loadWorkDetails(workId);
        }
    }, [loadWorkDetails, notify]);

    const createWorkFromPlan = useCallback(async (plan: any) => {
        const newWorkId = db.generateId('OBRA');

        const work: WorkHeader = {
            id: newWorkId,
            plan_id: plan.id,
            name: plan.name,
            client_id: plan.client_id,
            address: plan.address,
            type: plan.type,
            status: 'Em Andamento',
            start_date: new Date().toISOString()
        };

        const newWorks = [...db.load('serviflow_works', []), work];
        await db.save('serviflow_works', newWorks, work);
        setWorks(newWorks);

        await importPlanItems(plan.id, newWorkId);

        return work;
    }, [importPlanItems]);

    const handleEmbeddedPlan = useCallback(async (planId: string) => {
        let work = works.find(w => w.plan_id === planId);

        if (!work && !creationAttemptedRef.current[planId]) {
            creationAttemptedRef.current[planId] = true;

            const localWorks = db.load('serviflow_works', []) as WorkHeader[];
            work = localWorks.find(w => w.plan_id === planId);

            if (!work) {
                const plans = db.load('serviflow_plans', []) as any[];
                const plan = plans.find(p => p.id === planId);
                if (plan) {
                    work = await createWorkFromPlan(plan);
                }
            }
        }

        if (work && activeWorkId !== work.id) {
            setActiveWorkId(work.id);
            setCurrentWork(work);
            loadWorkDetails(work.id);
        }
    }, [activeWorkId, createWorkFromPlan, loadWorkDetails, works]);

    useEffect(() => {
        loadWorks();
    }, [loadWorks]);

    useEffect(() => {
        if (embeddedPlanId && works.length > 0) {
            handleEmbeddedPlan(embeddedPlanId);
        }
    }, [embeddedPlanId, works, handleEmbeddedPlan]);

    useEffect(() => {
        const handleSync = () => {
            loadWorks();
            if (activeWorkId) loadWorkDetails(activeWorkId);
        };

        window.addEventListener('db-sync-complete', handleSync);
        return () => window.removeEventListener('db-sync-complete', handleSync);
    }, [activeWorkId, loadWorkDetails, loadWorks]);

    const persistWork = useCallback(async (showToast = false) => {
        if (!currentWork || savingRef.current) return;

        savingRef.current = true;
        setLoading(true);

        try {
            const updatedWork: WorkHeader = {
                ...currentWork,
                total_real_cost: calculations.totalGeneral,
                total_material_cost: calculations.totalMaterial
            };

            const currentLocalWorks = db.load('serviflow_works', []) as WorkHeader[];
            const exists = currentLocalWorks.some(w => w.id === currentWork.id);

            const updatedWorks = exists
                ? currentLocalWorks.map(w => w.id === currentWork.id ? updatedWork : w)
                : [updatedWork, ...currentLocalWorks];

            await db.save('serviflow_works', updatedWorks, updatedWork);

            const saveItems = async (key: string, items: any[]) => {
                const all = db.load(key, []);
                const others = all.filter((i: any) => i.work_id !== currentWork.id);
                const currentItems = items.map(i => ({ ...i, work_id: currentWork.id }));
                await db.save(key, [...others, ...currentItems], currentItems);
            };

            await Promise.all([
                saveItems('serviflow_work_services', services),
                saveItems('serviflow_work_materials', materials),
                saveItems('serviflow_work_labor', labor),
                saveItems('serviflow_work_indirects', indirects),
                saveItems('serviflow_work_taxes', taxes)
            ]);

            setWorks(updatedWorks);

            if (showToast) {
                notify('Obra atualizada com sucesso!', 'success');
            }
        } catch (error) {
            console.error('Erro ao salvar obra:', error);
            if (showToast) {
                notify('Erro ao salvar dados.', 'error');
            }
            throw error;
        } finally {
            savingRef.current = false;
            setLoading(false);
        }
    }, [
        currentWork,
        services,
        materials,
        labor,
        indirects,
        taxes,
        calculations.totalGeneral,
        calculations.totalMaterial,
        notify
    ]);

    const handleManualSave = useCallback(async () => {
        await persistWork(true);
    }, [persistWork]);

    const handleAutoSave = useCallback(async (_payload: any) => {
        await persistWork(false);
    }, [persistWork]);

    const autoSavePayload = useMemo(() => ({
        currentWork,
        services,
        materials,
        labor,
        indirects,
        taxes
    }), [currentWork, services, materials, labor, indirects, taxes]);

    const handleCreateNewWork = useCallback(async () => {
        const newWork: WorkHeader = {
            id: db.generateId('OBRA'),
            name: 'Nova Obra',
            client_id: '',
            address: '',
            type: 'Reforma',
            status: 'Em Andamento',
            start_date: new Date().toISOString()
        };

        const updatedWorks = [newWork, ...(db.load('serviflow_works', []) as WorkHeader[])];
        await db.save('serviflow_works', updatedWorks, newWork);

        setWorks(updatedWorks);
        setActiveWorkId(newWork.id);
        setCurrentWork(newWork);
        clearCurrentLists();
    }, [clearCurrentLists]);

    const handleDuplicateWork = useCallback(async (id: string) => {
        if (!confirm('Deseja criar uma cópia desta obra?')) return;

        try {
            setLoading(true);

            const localWorks = db.load('serviflow_works', []) as WorkHeader[];
            const sourceWork = localWorks.find(w => w.id === id);
            if (!sourceWork) return;

            const newWorkId = db.generateId('OBRA');
            const newWork: WorkHeader = {
                ...sourceWork,
                id: newWorkId,
                name: `CÓPIA - ${sourceWork.name}`,
                start_date: new Date().toISOString()
            };

            const duplicateItems = async (key: string, suffix: string) => {
                const sourceItems = db.load(key, []).filter((i: any) => i.work_id === id);
                const newItems = sourceItems.map((i: any) => ({
                    ...i,
                    id: db.generateId(suffix),
                    work_id: newWorkId
                }));
                const all = db.load(key, []);
                await db.save(key, [...all, ...newItems], newItems);
            };

            await Promise.all([
                duplicateItems('serviflow_work_services', 'WSVC'),
                duplicateItems('serviflow_work_materials', 'WMAT'),
                duplicateItems('serviflow_work_labor', 'WMO'),
                duplicateItems('serviflow_work_indirects', 'WIND'),
                duplicateItems('serviflow_work_taxes', 'WTAX')
            ]);

            const updatedWorks = [newWork, ...localWorks];
            await db.save('serviflow_works', updatedWorks, newWork);
            setWorks(updatedWorks);
            notify('Obra duplicada com sucesso!', 'success');
        } catch (error) {
            console.error(error);
            notify('Erro ao duplicar obra.', 'error');
        } finally {
            setLoading(false);
        }
    }, [notify]);

    const handleDeleteWork = useCallback(async (id: string) => {
        if (!confirm('Excluir PERMANENTEMENTE esta obra e todos os seus dados?')) return;

        try {
            setLoading(true);

            await (db as any).deleteByCondition('serviflow_works', 'id', id);
            await (db as any).deleteByCondition('serviflow_work_services', 'work_id', id);
            await (db as any).deleteByCondition('serviflow_work_materials', 'work_id', id);
            await (db as any).deleteByCondition('serviflow_work_labor', 'work_id', id);
            await (db as any).deleteByCondition('serviflow_work_indirects', 'work_id', id);
            await (db as any).deleteByCondition('serviflow_work_taxes', 'work_id', id);

            setWorks(prev => prev.filter(w => w.id !== id));

            if (activeWorkId === id) {
                setActiveWorkId(null);
                setCurrentWork(null);
                clearCurrentLists();
            }

            notify('Obra excluída com sucesso.', 'success');
        } catch (error) {
            notify('Erro ao excluir obra.', 'error');
        } finally {
            setLoading(false);
        }
    }, [activeWorkId, clearCurrentLists, notify]);

    const generateMaterialsReportHtml = useCallback((): string => {
        if (!currentWork || materials.length === 0) return '';

        return buildExecutionReportHtml(
            currentWork,
            customers,
            [],
            materials,
            [],
            [],
            [],
            {
                totalMaterial: calculations.totalMaterial,
                totalLabor: 0,
                totalIndirect: 0,
                totalTax: 0,
                totalGeneral: calculations.totalMaterial
            },
            company,
            EXECUTION_THEME
        );
    }, [currentWork, materials, customers, calculations.totalMaterial, company]);

    const generateFullReportHtml = useCallback((): string => {
        if (!currentWork) return '';

        return buildExecutionReportHtml(
            currentWork,
            customers,
            services,
            materials,
            labor,
            indirects,
            taxes,
            {
                totalMaterial: calculations.totalMaterial,
                totalLabor: calculations.totalLabor,
                totalIndirect: calculations.totalIndirect,
                totalTax: calculations.totalTaxes,
                bdiValue: calculations.bdiValue,
                otherTaxesValue: calculations.otherTaxesValue,
                totalGeneral: calculations.totalGeneral
            },
            company,
            EXECUTION_THEME
        );
    }, [currentWork, customers, services, materials, labor, indirects, taxes, calculations, company]);

    const renderMaterialRow = (material: WorkMaterial) => (
        <EditableRow
            key={material.id}
            item={material}
            isEditing={materialEdit.editingId === material.id}
            editData={materialEdit.editData}
            onStartEdit={() => materialEdit.startEditing(material)}
            onUpdateField={materialEdit.updateField}
            onSave={() => {
                const qty = Number(materialEdit.editData.quantity || 0);
                const unitCost = Number(materialEdit.editData.unit_cost || 0);

                materialManager.updateItem(material.id, {
                    ...materialEdit.editData,
                    total_cost: qty * unitCost
                });

                materialEdit.stopEditing();
            }}
            onCancel={materialEdit.stopEditing}
            onDelete={() => materialManager.deleteItem(material.id, 'Excluir material?')}
            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-green-400 dark:hover:border-green-500 shadow-sm transition-all rounded-xl"
            renderView={(m) => (
                <>
                    <div className="flex items-center gap-2 grow">
                        <input
                            type="checkbox"
                            checked={materialSelect.selectedIds.includes(m.id)}
                            onChange={() => materialSelect.toggleSelect(m.id)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-green-600 focus:ring-green-500"
                        />
                        <div className="grow">
                            <p className="font-bold text-slate-800 dark:text-slate-100 uppercase text-sm">{m.material_name}</p>
                            <p className="text-[10px] text-slate-500 uppercase">
                                {m.quantity} {m.unit} x R$ {m.unit_cost.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <div className="w-24 text-right mr-4 font-black text-slate-700 dark:text-slate-200">
                        R$ {m.total_cost.toFixed(2)}
                    </div>
                </>
            )}
            renderEdit={(data, update) => (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 w-full">
                    <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Material</label>
                        <input
                            type="text"
                            value={data.material_name || ''}
                            onChange={e => update('material_name', e.target.value as any)}
                            className="w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Qtd</label>
                        <input
                            type="number"
                            value={data.quantity || 0}
                            onChange={e => update('quantity', (parseFloat(e.target.value) || 0) as any)}
                            className="w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Un</label>
                        <input
                            type="text"
                            value={data.unit || ''}
                            onChange={e => update('unit', e.target.value as any)}
                            className="w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Valor Unit.</label>
                        <input
                            type="number"
                            value={data.unit_cost || 0}
                            onChange={e => update('unit_cost', (parseFloat(e.target.value) || 0) as any)}
                            className="w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                        />
                    </div>
                </div>
            )}
        />
    );

    const renderLaborRow = (item: WorkLabor) => (
        <EditableRow
            key={item.id}
            item={item}
            isEditing={laborEdit.editingId === item.id}
            editData={laborEdit.editData}
            onStartEdit={() => laborEdit.startEditing(item)}
            onUpdateField={laborEdit.updateField}
            onSave={() => {
                const qty = Number(laborEdit.editData.quantity || 0);
                const unitCost = Number(laborEdit.editData.unit_cost || 0);

                laborManager.updateItem(item.id, {
                    ...laborEdit.editData,
                    total_cost: qty * unitCost
                });

                laborEdit.stopEditing();
            }}
            onCancel={laborEdit.stopEditing}
            onDelete={() => laborManager.deleteItem(item.id, 'Excluir mão de obra?')}
            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 shadow-sm transition-all rounded-xl"
            renderView={(l) => (
                <>
                    <div className="flex items-center gap-2 grow">
                        <input
                            type="checkbox"
                            checked={laborSelect.selectedIds.includes(l.id)}
                            onChange={() => laborSelect.toggleSelect(l.id)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-amber-600 focus:ring-amber-500"
                        />
                        <div className="grow">
                            <p className="font-bold text-slate-800 dark:text-slate-100 uppercase text-sm">{l.role}</p>
                            <p className="text-[10px] text-slate-500 uppercase">
                                {l.quantity} {l.unit || 'un'} x R$ {l.unit_cost.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <div className="w-24 text-right mr-4 font-black text-slate-700 dark:text-slate-200">
                        R$ {l.total_cost.toFixed(2)}
                    </div>
                </>
            )}
            renderEdit={(data, update) => (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 w-full">
                    <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Função</label>
                        <input
                            type="text"
                            value={data.role || ''}
                            onChange={e => update('role', e.target.value as any)}
                            className="w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                        />
                    </div>
                    <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Qtd</label>
                        <input
                            type="number"
                            value={data.quantity || 0}
                            onChange={e => update('quantity', (parseFloat(e.target.value) || 0) as any)}
                            className="w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                        />
                    </div>
                    <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Un</label>
                        <input
                            type="text"
                            value={data.unit || ''}
                            onChange={e => update('unit', e.target.value as any)}
                            className="w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                        />
                    </div>
                    <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Valor Unit.</label>
                        <input
                            type="number"
                            value={data.unit_cost || 0}
                            onChange={e => update('unit_cost', (parseFloat(e.target.value) || 0) as any)}
                            className="w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                        />
                    </div>
                </div>
            )}
        />
    );

    const renderIndirectRow = (item: WorkIndirect) => (
        <EditableRow
            key={item.id}
            item={item}
            isEditing={indirectEdit.editingId === item.id}
            editData={indirectEdit.editData}
            onStartEdit={() => indirectEdit.startEditing(item)}
            onUpdateField={indirectEdit.updateField}
            onSave={() => {
                indirectManager.updateItem(item.id, indirectEdit.editData);
                indirectEdit.stopEditing();
            }}
            onCancel={indirectEdit.stopEditing}
            onDelete={() => indirectManager.deleteItem(item.id, 'Excluir custo indireto?')}
            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-500 shadow-sm transition-all rounded-xl"
            renderView={(i) => (
                <>
                    <div className="flex items-center gap-2 grow">
                        <input
                            type="checkbox"
                            checked={indirectSelect.selectedIds.includes(i.id)}
                            onChange={() => indirectSelect.toggleSelect(i.id)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 focus:ring-slate-500"
                        />
                        <div className="grow">
                            <p className="font-bold text-slate-800 dark:text-slate-100 uppercase text-sm">{i.name}</p>
                        </div>
                    </div>
                    <div className="w-24 text-right mr-4 font-black text-slate-700 dark:text-slate-200">
                        R$ {i.value.toFixed(2)}
                    </div>
                </>
            )}
            renderEdit={(data, update) => (
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 w-full">
                    <div className="md:col-span-4">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Descrição</label>
                        <input
                            type="text"
                            value={data.name || ''}
                            onChange={e => update('name', e.target.value as any)}
                            className="w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Valor</label>
                        <input
                            type="number"
                            value={data.value || 0}
                            onChange={e => update('value', (parseFloat(e.target.value) || 0) as any)}
                            className="w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                        />
                    </div>
                </div>
            )}
        />
    );

    if (embeddedPlanId && !currentWork) {
        return <div className="p-10 text-center text-slate-500">Preparando ambiente de execução...</div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto p-6">
            {!activeWorkId && !embeddedPlanId ? (
                <div className="space-y-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                                <HardHat className="text-green-600" size={36} /> Gestão de Obras
                            </h1>
                            <p className="text-slate-500 font-medium tracking-tight">
                                Gerencie a execução detalhada para seus projetos em andamento.
                            </p>
                        </div>

                        <button
                            onClick={handleCreateNewWork}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-green-200/50 flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
                        >
                            <Plus size={20} /> Nova Obra
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {works.map(work => (
                            <div
                                key={work.id}
                                onClick={() => {
                                    setActiveWorkId(work.id);
                                    setCurrentWork(work);
                                    loadWorkDetails(work.id);
                                }}
                                className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-green-500 group-hover:bg-green-600 transition-colors" />

                                <div className="flex justify-between items-start mb-2.5 pl-2">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg group-hover:text-green-700 transition-colors truncate uppercase">
                                            {work.name}
                                        </h3>
                                        <p className="text-sm text-slate-500 font-medium truncate">
                                            {customers.find(c => c.id === work.client_id)?.name || 'Cliente não informado'}
                                        </p>
                                    </div>

                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${work.status === 'Concluída'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-green-100 text-green-700'
                                        }`}>
                                        {work.status}
                                    </span>
                                </div>

                                <div className="pl-2 space-y-2 mb-3">
                                    <div className="flex items-center text-xs text-slate-500">
                                        <Calendar size={14} className="mr-2 opacity-50" />
                                        Iniciada em {new Date(work.start_date).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center text-xs text-slate-500">
                                        <HardHat size={14} className="mr-2 opacity-50" />
                                        {work.type}
                                    </div>
                                </div>

                                <div className="pl-2 border-t border-slate-100 dark:border-slate-800 pt-3 flex justify-between items-center">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDuplicateWork(work.id);
                                            }}
                                            className="text-slate-400 hover:text-green-500 transition-colors"
                                            title="Duplicar"
                                        >
                                            <Copy size={16} />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteWork(work.id);
                                            }}
                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="flex items-center text-green-600 font-black text-xs group-hover:translate-x-1 transition-transform">
                                        EDITAR EXECUÇÃO <ArrowRight size={16} className="ml-1" />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {works.length === 0 && (
                            <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                <Building2 size={48} className="mx-auto mb-4 opacity-10" />
                                <p className="font-bold uppercase tracking-widest text-xs">Nenhuma obra encontrada</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl h-[calc(100vh-140px)] flex flex-col border dark:border-slate-800 overflow-hidden">
                    <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-green-50 dark:bg-green-900/20">
                            <div className="flex items-center gap-4">
                                {!embeddedPlanId && (
                                    <button
                                        onClick={() => {
                                            setActiveWorkId(null);
                                            setCurrentWork(null);
                                            clearCurrentLists();
                                        }}
                                        className="text-green-400 hover:text-green-600 p-1"
                                        type="button"
                                    >
                                        <ArrowRight className="rotate-180" size={20} />
                                    </button>
                                )}

                                <div>
                                    <h2 className="text-xl font-bold text-green-900 dark:text-green-100 flex items-center gap-2">
                                        <HardHat className="text-green-600 dark:text-green-400" />
                                        {String(currentWork?.name || '').toUpperCase()}
                                    </h2>
                                    <p className="text-xs text-green-600 dark:text-green-400 uppercase tracking-widest font-semibold">
                                        {currentWork?.status} • GESTÃO DE EXECUÇÃO
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {currentWork?.plan_id && (
                                    <button
                                        type="button"
                                        onClick={() => importPlanItems(currentWork.plan_id!, currentWork.id)}
                                        className="whitespace-nowrap px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700"
                                    >
                                        <ArrowRight className="rotate-180" size={16} /> Importar Plan.
                                    </button>
                                )}

                                <div className="flex items-center gap-2">
                                    <AutoSave
                                        id={`work-${currentWork?.id || 'new'}`}
                                        data={autoSavePayload}
                                        onSave={handleAutoSave}
                                    />

                                    <button
                                        type="button"
                                        onClick={handleManualSave}
                                        disabled={loading}
                                        className="whitespace-nowrap px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-green-700 shadow-md shadow-green-900/20 disabled:opacity-50"
                                    >
                                        <Save size={16} /> {loading ? 'Salvando...' : 'Salvar'}
                                    </button>
                                </div>
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
                                    className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                        ? 'border-green-600 text-green-600 dark:text-green-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    <tab.icon size={16} /> {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Sticky sub-tabs + formulário (igual ao PlanningEditor) */}
                        <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 px-6 py-4">
                            <div className="max-w-4xl mx-auto">
                                {activeTab === 'recursos' && (
                                    <>
                                        <div className="flex gap-1.5 mb-4 justify-center">
                                            {[
                                                { id: 'material', label: 'Materiais' },
                                                { id: 'mo', label: 'Mão de Obra' },
                                                { id: 'indireto', label: 'Indiretos' },
                                                { id: 'impostos', label: 'Impostos' },
                                            ].map(r => (
                                                <button
                                                    key={r.id}
                                                    type="button"
                                                    onClick={() => setResourceTab(r.id as any)}
                                                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all uppercase tracking-wider ${resourceTab === r.id
                                                        ? 'bg-green-600 text-white shadow-md'
                                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-green-50'
                                                        }`}
                                                >
                                                    {r.label}
                                                </button>
                                            ))}
                                        </div>
                                        {resourceTab === 'material' && (
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                                                <div className="md:col-span-5">
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Insumo/Material</label>
                                                    <input type="text" placeholder="Ex: Cimento CP-II" value={newMaterial.name} onChange={e => setNewMaterial(p => ({ ...p, name: e.target.value }))}
                                                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-green-500" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Qtd</label>
                                                    <input type="number" placeholder="0" value={newMaterial.qty} onChange={e => setNewMaterial(p => ({ ...p, qty: e.target.value }))}
                                                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-green-500" />
                                                </div>
                                                <div className="md:col-span-1">
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Un</label>
                                                    <input type="text" value={newMaterial.unit} onChange={e => setNewMaterial(p => ({ ...p, unit: e.target.value }))}
                                                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-green-500" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Valor Unit.</label>
                                                    <input type="number" placeholder="0" value={newMaterial.cost} onChange={e => setNewMaterial(p => ({ ...p, cost: e.target.value }))}
                                                        onKeyDown={(e) => e.key === 'Enter' && document.getElementById('add-material-btn')?.click()}
                                                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-green-500" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <button id="add-material-btn" type="button" onClick={() => {
                                                        if (!newMaterial.name) return;
                                                        const qty = parseFloat(newMaterial.qty) || 0;
                                                        const cost = parseFloat(newMaterial.cost) || 0;
                                                        materialManager.addItem({ material_name: newMaterial.name.toUpperCase(), unit: newMaterial.unit || 'un', quantity: qty, unit_cost: cost, total_cost: qty * cost });
                                                        setNewMaterial({ name: '', qty: '', unit: 'un', cost: '' });
                                                        notify('Material adicionado', 'success');
                                                    }} className="w-full bg-green-600 text-white py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1 hover:bg-green-700 transition-all shadow-md">
                                                        <Plus size={14} /> Adicionar
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {resourceTab === 'mo' && (
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                                                <div className="md:col-span-5">
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Função/Cargo</label>
                                                    <input type="text" placeholder="Ex: Pedreiro" value={newLabor.role} onChange={e => setNewLabor(p => ({ ...p, role: e.target.value }))}
                                                        onKeyDown={(e) => e.key === 'Enter' && document.getElementById('add-labor-btn')?.click()}
                                                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-green-500" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Qtd</label>
                                                    <input type="number" placeholder="0" value={newLabor.qty} onChange={e => setNewLabor(p => ({ ...p, qty: e.target.value }))}
                                                        onKeyDown={(e) => e.key === 'Enter' && document.getElementById('add-labor-btn')?.click()}
                                                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-green-500" />
                                                </div>
                                                <div className="md:col-span-1">
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Un</label>
                                                    <input type="text" value={newLabor.unit} onChange={e => setNewLabor(p => ({ ...p, unit: e.target.value }))}
                                                        onKeyDown={(e) => e.key === 'Enter' && document.getElementById('add-labor-btn')?.click()}
                                                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-green-500" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Valor Unit.</label>
                                                    <input type="number" placeholder="0" value={newLabor.cost} onChange={e => setNewLabor(p => ({ ...p, cost: e.target.value }))}
                                                        onKeyDown={(e) => e.key === 'Enter' && document.getElementById('add-labor-btn')?.click()}
                                                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-green-500" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <button id="add-labor-btn" type="button" onClick={() => {
                                                        if (!newLabor.role) return;
                                                        const qty = parseFloat(newLabor.qty) || 0;
                                                        const cost = parseFloat(newLabor.cost) || 0;
                                                        laborManager.addItem({ role: newLabor.role.toUpperCase(), cost_type: newLabor.type as any, unit: newLabor.unit || 'un', quantity: qty, unit_cost: cost, total_cost: qty * cost });
                                                        setNewLabor({ role: '', type: 'Diária', qty: '', unit: 'un', cost: '' });
                                                        notify('Mão de obra adicionada', 'success');
                                                    }} className="w-full bg-green-600 text-white py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1 hover:bg-green-700 transition-all shadow-md">
                                                        <Plus size={14} /> Adicionar
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {resourceTab === 'indireto' && (
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                                                <div className="md:col-span-7">
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Descrição</label>
                                                    <input type="text" placeholder="Ex: Transporte de material" value={newIndirect.name} onChange={e => setNewIndirect(p => ({ ...p, name: e.target.value }))}
                                                        onKeyDown={(e) => e.key === 'Enter' && document.getElementById('add-indirect-btn')?.click()}
                                                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-green-500" />
                                                </div>
                                                <div className="md:col-span-3">
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Valor (R$)</label>
                                                    <input type="number" placeholder="0" value={newIndirect.value} onChange={e => setNewIndirect(p => ({ ...p, value: e.target.value }))}
                                                        onKeyDown={(e) => e.key === 'Enter' && document.getElementById('add-indirect-btn')?.click()}
                                                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-green-500" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <button id="add-indirect-btn" type="button" onClick={() => {
                                                        if (!newIndirect.name) return;
                                                        const value = parseFloat(newIndirect.value) || 0;
                                                        indirectManager.addItem({ name: newIndirect.name.toUpperCase(), value });
                                                        setNewIndirect({ name: '', value: '' });
                                                        notify('Custo indireto adicionado', 'success');
                                                    }} className="w-full bg-green-600 text-white py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1 hover:bg-green-700 transition-all shadow-md">
                                                        <Plus size={14} /> Adicionar
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {resourceTab === 'impostos' && (
                                            <div className="flex justify-center">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Defina as alíquotas abaixo</p>
                                            </div>
                                        )}
                                    </>
                                )}
                                {activeTab === 'resumo' && (
                                    <div className="flex justify-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resumo Geral Financeiro</p>
                                    </div>
                                )}
                                {activeTab === 'dados' && (
                                    <div className="flex justify-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Edite os dados básicos da obra</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-8 flex-1 bg-slate-50/50 dark:bg-slate-900/50 overflow-auto">
                        {activeTab === 'dados' && currentWork && (
                            <div className="max-w-2xl mx-auto space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                            Nome da Obra
                                        </label>
                                        <input
                                            type="text"
                                            value={currentWork.name}
                                            onChange={e => setCurrentWork({ ...currentWork, name: e.target.value.toUpperCase() })}
                                            className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-100"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                            Status
                                        </label>
                                        <select
                                            value={currentWork.status}
                                            onChange={e => setCurrentWork({ ...currentWork, status: e.target.value as any })}
                                            className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-100"
                                        >
                                            <option value="Em Andamento">Em Andamento</option>
                                            <option value="Pausada">Pausada</option>
                                            <option value="Concluída">Concluída</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                        Cliente
                                    </label>
                                    <select
                                        value={currentWork.client_id}
                                        onChange={e => {
                                            const customer = customers.find(c => c.id === e.target.value);
                                            setCurrentWork({ ...currentWork, client_id: e.target.value, client_name: customer?.name });
                                        }}
                                        className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-100"
                                    >
                                        <option value="">Selecione...</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                        Endereço da Obra
                                    </label>
                                    <input
                                        type="text"
                                        value={currentWork.address}
                                        onChange={e => setCurrentWork({ ...currentWork, address: e.target.value })}
                                        className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-100"
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'servicos' && (
                            <div className="max-w-4xl mx-auto space-y-2">
                                {services.map(service => (
                                    <EditableRow
                                        key={service.id}
                                        item={service}
                                        isEditing={serviceEdit.editingId === service.id}
                                        editData={serviceEdit.editData}
                                        onStartEdit={() => serviceEdit.startEditing(service)}
                                        onUpdateField={serviceEdit.updateField}
                                        onSave={() => {
                                            const qty = Number(serviceEdit.editData.quantity ?? service.quantity ?? 0);
                                            const unitMaterial = Number(serviceEdit.editData.unit_material_cost ?? service.unit_material_cost ?? 0);
                                            const unitLabor = Number(serviceEdit.editData.unit_labor_cost ?? service.unit_labor_cost ?? 0);
                                            const unitIndirect = Number(serviceEdit.editData.unit_indirect_cost ?? service.unit_indirect_cost ?? 0);

                                            serviceManager.updateItem(service.id, {
                                                ...serviceEdit.editData,
                                                total_cost: qty * (unitMaterial + unitLabor + unitIndirect)
                                            });

                                            serviceEdit.stopEditing();
                                        }}
                                        onCancel={serviceEdit.stopEditing}
                                        onDelete={() => serviceManager.deleteItem(service.id, 'Excluir serviço?')}
                                        className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-green-400 dark:hover:border-green-500 shadow-sm transition-all rounded-xl"
                                        renderView={(s) => (
                                            <>
                                                <div className="grow">
                                                    <p className="font-bold text-slate-800 dark:text-slate-100 uppercase text-sm">{s.description}</p>
                                                    <p className="text-[10px] text-slate-500 uppercase">
                                                        {s.quantity} {s.unit} - Mat: R$ {s.unit_material_cost.toFixed(2)} | MO: R$ {s.unit_labor_cost.toFixed(2)} | Ind: R$ {s.unit_indirect_cost.toFixed(2)}
                                                    </p>
                                                </div>
                                                <div className="w-24 text-right mr-4 font-black text-slate-700 dark:text-slate-200">
                                                    R$ {s.total_cost.toFixed(2)}
                                                </div>
                                            </>
                                        )}
                                        renderEdit={(data, update) => (
                                            <div className="grid grid-cols-1 md:grid-cols-7 gap-2 w-full">
                                                <div className="md:col-span-2">
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Descrição</label>
                                                    <input
                                                        type="text"
                                                        value={data.description || ''}
                                                        onChange={e => update('description', e.target.value as any)}
                                                        className="w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Un</label>
                                                    <input
                                                        type="text"
                                                        value={data.unit || ''}
                                                        onChange={e => update('unit', e.target.value as any)}
                                                        className="w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Qtd</label>
                                                    <input
                                                        type="number"
                                                        value={data.quantity ?? 0}
                                                        onChange={e => update('quantity', (parseFloat(e.target.value) || 0) as any)}
                                                        className="w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Mat</label>
                                                    <input
                                                        type="number"
                                                        value={data.unit_material_cost ?? 0}
                                                        onChange={e => update('unit_material_cost', (parseFloat(e.target.value) || 0) as any)}
                                                        className="w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">MO</label>
                                                    <input
                                                        type="number"
                                                        value={data.unit_labor_cost ?? 0}
                                                        onChange={e => update('unit_labor_cost', (parseFloat(e.target.value) || 0) as any)}
                                                        className="w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Ind</label>
                                                    <input
                                                        type="number"
                                                        value={data.unit_indirect_cost ?? 0}
                                                        onChange={e => update('unit_indirect_cost', (parseFloat(e.target.value) || 0) as any)}
                                                        className="w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    />
                                ))}
                            </div>
                        )}

                        {activeTab === 'recursos' && (
                            <div className="max-w-4xl mx-auto space-y-6">

                                {resourceTab === 'material' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tighter text-lg">Insumos e Materiais</h3>
                                            {materials.length > 0 && (
                                                <button onClick={() => { const html = generateMaterialsReportHtml(); setPreviewContent({ title: `${currentWork?.id} - MATERIAIS - ${currentWork?.name}`, html, filename: `${currentWork?.id} - MATERIAIS - ${currentWork?.name}` }); setShowPreview(true); }}
                                                    className="flex items-center gap-2 text-green-600 text-sm font-bold hover:text-green-700">
                                                    <Eye size={18} /> Visualizar Lista
                                                </button>
                                            )}
                                        </div>

                                        {materials.length > 0 && (
                                            <SelectionBar count={materialSelect.selectedIds.length} total={materials.length} onToggleAll={() => materialSelect.toggleAll(materials)}
                                                onDeleteSelected={async () => { await materialManager.deleteMultiple(materialSelect.selectedIds, 'material'); materialSelect.clearSelection(); }}
                                                onClearAll={() => materialManager.clearAll('Excluir TODOS os materiais?')} itemName="material" />
                                        )}
                                        <div className="space-y-2">{materials.map(renderMaterialRow)}</div>
                                        {materials.length === 0 && <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800"><p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhum material lançado ainda.</p></div>}
                                        {materials.length > 0 && (
                                            <div className="flex justify-end p-4 bg-green-50/50 rounded-xl border border-green-100 mt-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Total Materiais</span>
                                                    <span className="text-xl font-black text-green-700">R$ {calculations.totalMaterial.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {resourceTab === 'mo' && (
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tighter text-lg">Mão de Obra</h3>
                                        {labor.length > 0 && (
                                            <SelectionBar count={laborSelect.selectedIds.length} total={labor.length} onToggleAll={() => laborSelect.toggleAll(labor)}
                                                onDeleteSelected={async () => { await laborManager.deleteMultiple(laborSelect.selectedIds, 'mão de obra'); laborSelect.clearSelection(); }}
                                                onClearAll={() => laborManager.clearAll('Excluir TODA a mão de obra?')} itemName="mão de obra" />
                                        )}
                                        <div className="space-y-2">{labor.map(renderLaborRow)}</div>
                                        {labor.length === 0 && <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800"><p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhuma mão de obra lançada.</p></div>}
                                        {labor.length > 0 && (
                                            <div className="flex justify-end p-4 bg-amber-50/50 rounded-xl border border-amber-100 mt-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Total Mão de Obra</span>
                                                    <span className="text-xl font-black text-amber-700">R$ {calculations.totalLabor.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {resourceTab === 'indireto' && (
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tighter text-lg">Custos Indiretos</h3>
                                        {indirects.length > 0 && (
                                            <SelectionBar count={indirectSelect.selectedIds.length} total={indirects.length} onToggleAll={() => indirectSelect.toggleAll(indirects)}
                                                onDeleteSelected={async () => { await indirectManager.deleteMultiple(indirectSelect.selectedIds, 'custo indireto'); indirectSelect.clearSelection(); }}
                                                onClearAll={() => indirectManager.clearAll('Excluir TODOS os custos indiretos?')} itemName="custo indireto" />
                                        )}
                                        <div className="space-y-2">{indirects.map(renderIndirectRow)}</div>
                                        {indirects.length === 0 && <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800"><p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhum custo indireto lançado.</p></div>}
                                        {indirects.length > 0 && (
                                            <div className="flex justify-end p-4 bg-slate-100/50 rounded-xl border border-slate-200 mt-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Indiretos</span>
                                                    <span className="text-xl font-black text-slate-700">R$ {calculations.totalIndirect.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {resourceTab === 'impostos' && (
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                            {['BDI', 'ISS', 'PIS', 'COFINS', 'INSS'].map(name => {
                                                const taxValue = name === 'BDI'
                                                    ? calculations.bdiValue
                                                    : calculations.individualTaxValues.find(t => t.name === name)?.value || 0;

                                                return (
                                                    <div key={name} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                                                            {name} (%)
                                                        </label>

                                                        <div className="relative mb-2">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 pr-8"
                                                                value={taxes.find(t => t.name === name)?.rate || ''}
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    const newTaxes = [...taxes];
                                                                    const idx = newTaxes.findIndex(t => t.name === name);

                                                                    if (idx !== -1) {
                                                                        newTaxes[idx] = { ...newTaxes[idx], rate: val };
                                                                    } else {
                                                                        newTaxes.push({
                                                                            id: db.generateId('TAX'),
                                                                            work_id: currentWork?.id,
                                                                            name,
                                                                            rate: val,
                                                                            value: 0
                                                                        });
                                                                    }

                                                                    setTaxes(newTaxes);
                                                                }}
                                                            />
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">%</span>
                                                        </div>

                                                        <div className="text-[10px] font-black text-green-600 dark:text-green-400 text-right">
                                                            R$ {taxValue.toLocaleString('pt-BR', {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'resumo' && (
                            <div className="max-w-5xl mx-auto space-y-8 pb-12">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                                    {[
                                        { label: 'Materiais', value: calculations.totalMaterial, icon: Truck, color: 'emerald', desc: 'Insumos e Materiais' },
                                        { label: 'Mão de Obra', value: calculations.totalLabor, icon: HardHat, color: 'amber', desc: 'Equipes e Diárias' },
                                        { label: 'Indiretos', value: calculations.totalIndirect, icon: Archive, color: 'slate', desc: 'Custos Adicionais' },
                                        { label: 'BDI', value: calculations.bdiValue, icon: TrendingUp, color: 'violet', desc: 'BDI' },
                                        { label: 'Impostos', value: calculations.otherTaxesValue ?? (calculations.totalTaxes - calculations.bdiValue), icon: Percent, color: 'blue', desc: 'IMPOSTOS' },
                                    ].map((item) => (
                                        <div key={item.label} className={`bg-${item.color}-50 dark:bg-${item.color}-900/20 p-4 rounded-2xl border border-${item.color}-200 dark:border-${item.color}-800 shadow-sm transition-all hover:shadow-md`}>
                                            <div className="flex justify-between items-start mb-1.5">
                                                <span className={`text-[10px] font-bold text-${item.color}-600 dark:text-${item.color}-400 uppercase tracking-widest`}>{item.label}</span>
                                                <div className={`bg-${item.color}-100 dark:bg-${item.color}-900/40 p-1 rounded-lg`}>
                                                    <item.icon size={16} className={`text-${item.color}-600 dark:text-${item.color}-400`} />
                                                </div>
                                            </div>
                                            <span className="text-xl font-black text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                                R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                            <p className={`text-[9px] text-${item.color}-600/60 dark:text-${item.color}-400/60 mt-1 font-bold uppercase`}>{item.desc}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => {
                                            const html = generateFullReportHtml();
                                            setPreviewContent({
                                                title: `${currentWork?.id} - EXECUÇÃO - ${currentWork?.name}`,
                                                html,
                                                filename: `${currentWork?.id} - EXECUÇÃO - ${currentWork?.name}`
                                            });
                                            setShowPreview(true);
                                        }}
                                        className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 px-8 py-5 rounded-3xl flex items-center gap-6 hover:bg-slate-50 transition-all shadow-xl"
                                    >
                                        <div className="bg-green-100 dark:bg-green-900/40 p-3 rounded-2xl">
                                            <Eye size={28} className="text-green-600 dark:text-green-400" />
                                        </div>
                                        <div className="text-left">
                                            <span className="block text-slate-800 dark:text-slate-100 font-black text-lg tracking-tight">
                                                Relatório Executivo
                                            </span>
                                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                                                Gerar PDF de Execução
                                            </span>
                                        </div>
                                    </button>
                                </div>

                                <div className="bg-slate-900 dark:bg-slate-950 p-8 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-center shadow-2xl">
                                    <div className="relative z-10 text-center md:text-left mb-6 md:mb-0">
                                        <p className="text-green-400 text-xs font-bold uppercase tracking-[0.3em] mb-2 flex items-center justify-center md:justify-start gap-2">
                                            <Calculator size={14} /> Custo Executado Total
                                        </p>
                                        <span className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                                            R$ {calculations.totalGeneral.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showPreview && (
                <ReportPreview
                    onClose={() => setShowPreview(false)}
                    title={previewContent.title}
                    htmlContent={previewContent.html}
                    filename={previewContent.filename}
                />
            )}
        </div>
    );
};

export default WorksManager;