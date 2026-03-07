import { useState, useCallback, useEffect, useRef } from 'react';
import { db } from '../../../services/db';
import { useNotify } from '../../ToastProvider';
import {
    PlanningHeader,
    PlannedService,
    PlannedMaterial,
    PlannedLabor,
    PlannedIndirect,
    PlanTax,
    Customer,
} from '../types';

export const usePlanning = (customers: Customer[], embeddedPlanId?: string | null) => {
    const [plans, setPlans] = useState<PlanningHeader[]>([]);
    const [activePlanId, setActivePlanId] = useState<string | null>(null);
    const [currentPlan, setCurrentPlan] = useState<PlanningHeader | null>(null);
    const [services, setServices] = useState<PlannedService[]>([]);
    const [materials, setMaterials] = useState<PlannedMaterial[]>([]);
    const [labor, setLabor] = useState<PlannedLabor[]>([]);
    const [indirects, setIndirects] = useState<PlannedIndirect[]>([]);
    const [taxes, setTaxes] = useState<PlanTax[]>([]);
    const [loading, setLoading] = useState(false);
    const { notify } = useNotify();

    const creationAttemptedRef = useRef(false);

    const loadPlans = useCallback(async () => {
        const localPlans = db.load('serviflow_plans', []) as PlanningHeader[];
        setPlans(localPlans);
    }, []);

    const loadPlanDetails = useCallback((planId: string) => {
        const allServices = db.load('serviflow_plan_services', []) as PlannedService[];
        setServices(allServices.filter(s => s.plan_id === planId));

        const allMaterials = db.load('serviflow_plan_materials', []) as PlannedMaterial[];
        setMaterials(allMaterials.filter(m => m.plan_id === planId));

        const allLabor = db.load('serviflow_plan_labor', []) as PlannedLabor[];
        setLabor(allLabor.filter(l => l.plan_id === planId));

        const allIndirects = db.load('serviflow_plan_indirects', []) as PlannedIndirect[];
        setIndirects(allIndirects.filter(i => i.plan_id === planId));

        const allTaxes = db.load('serviflow_plan_taxes', []) as PlanTax[];
        setTaxes(allTaxes.filter(t => t.plan_id === planId));
    }, []);

    const handleCreatePlan = useCallback(() => {
        const newPlan: PlanningHeader = {
            id: db.generateId('PLAN'),
            name: 'Nova Obra',
            client_id: '',
            address: '',
            type: 'Reforma',
            status: 'Planejamento',
            created_at: new Date().toISOString(),
        };

        setPlans(prev => [newPlan, ...prev]);
        setActivePlanId(newPlan.id);
        setCurrentPlan(newPlan);
        setServices([]);
        setMaterials([]);
        setLabor([]);
        setIndirects([]);
        setTaxes([]);
    }, []);

    // Load plans on mount
    useEffect(() => {
        loadPlans();
    }, [loadPlans]);

    // Handle embedded mode
    useEffect(() => {
        if (embeddedPlanId) {
            if (embeddedPlanId === 'new' && !creationAttemptedRef.current) {
                creationAttemptedRef.current = true;
                handleCreatePlan();
            } else if (plans.length > 0 && embeddedPlanId !== 'new') {
                const plan = plans.find(p => p.id === embeddedPlanId);
                if (plan && activePlanId !== plan.id) {
                    creationAttemptedRef.current = false;
                    setActivePlanId(plan.id);
                    setCurrentPlan(plan);
                    loadPlanDetails(plan.id);
                }
            }
        }
    }, [embeddedPlanId, plans, activePlanId, handleCreatePlan, loadPlanDetails]);

    // Listen for cloud sync
    useEffect(() => {
        const handleSync = () => {
            loadPlans();
            if (activePlanId) loadPlanDetails(activePlanId);
        };
        window.addEventListener('db-sync-complete', handleSync);
        return () => window.removeEventListener('db-sync-complete', handleSync);
    }, [activePlanId, loadPlans, loadPlanDetails]);

    const savePlan = useCallback(
        async (totalGeneral: number) => {
            if (!currentPlan) return;
            setLoading(true);

            const updatedPlanHeader = {
                ...currentPlan,
                total_real_cost: totalGeneral,
            };

            // Save header
            const currentLocalPlans = db.load('serviflow_plans', []) as PlanningHeader[];
            const updatedPlans = currentLocalPlans.map(p =>
                p.id === updatedPlanHeader.id ? updatedPlanHeader : p
            );

            if (!currentLocalPlans.find(p => p.id === updatedPlanHeader.id)) {
                updatedPlans.unshift(updatedPlanHeader);
            }

            await db.save('serviflow_plans', updatedPlans, updatedPlanHeader);

            // Helper to save sub-items
            const saveItems = async <T extends { plan_id?: string }>(
                storageKey: string,
                items: T[],
                filterKey: keyof T
            ) => {
                const allItems = db.load(storageKey, []) as T[];
                const otherItems = allItems.filter(item => item[filterKey] !== currentPlan.id);
                const currentItems = items.map(item => ({ ...item, plan_id: currentPlan.id }));
                await db.save(storageKey, [...otherItems, ...currentItems], currentItems);
            };

            // Save all sub-lists
            await saveItems('serviflow_plan_services', services, 'plan_id');
            await saveItems('serviflow_plan_materials', materials, 'plan_id');
            await saveItems('serviflow_plan_labor', labor, 'plan_id');
            await saveItems('serviflow_plan_indirects', indirects, 'plan_id');
            await saveItems('serviflow_plan_taxes', taxes, 'plan_id');

            setPlans(updatedPlans);
            notify('Planejamento salvo com sucesso!', 'success');
            setLoading(false);
        },
        [currentPlan, services, materials, labor, indirects, taxes, notify]
    );

    const deleteItem = useCallback(
        async <T extends { id: string; plan_id?: string }>(
            storageKey: string,
            id: string,
            items: T[],
            setItems: (items: T[]) => void,
            itemName: string
        ) => {
            if (!confirm(`Tem certeza que deseja excluir este ${itemName}?`)) return;

            const updatedItems = items.filter(item => item.id !== id);
            setItems(updatedItems);

            await db.remove(storageKey, id);

            if (currentPlan) {
                const allItems = db.load(storageKey, []) as T[];
                const otherItems = allItems.filter(item => item.plan_id !== currentPlan.id);
                await db.save(storageKey, [...otherItems, ...updatedItems]);
            }

            notify(`${itemName} excluído`, 'success');
        },
        [currentPlan, notify]
    );

    const deleteMultipleItems = useCallback(
        async <T extends { id: string; plan_id?: string }>(
            storageKey: string,
            idsToDelete: string[],
            items: T[],
            setItems: (items: T[]) => void,
            setSelectedIds: (ids: string[]) => void,
            itemName: string
        ) => {
            if (!confirm(`Excluir ${idsToDelete.length} ${itemName}(s) selecionado(s)?`)) return;

            const updatedItems = items.filter(item => !idsToDelete.includes(item.id));
            setItems(updatedItems);
            setSelectedIds([]);

            // Delete one by one from DB
            for (const id of idsToDelete) {
                await db.remove(storageKey, id);
            }

            if (currentPlan) {
                const allItems = db.load(storageKey, []) as T[];
                const otherItems = allItems.filter(item => item.plan_id !== currentPlan.id);
                await db.save(storageKey, [...otherItems, ...updatedItems]);
            }

            notify(`${idsToDelete.length} ${itemName}(s) excluído(s)`, 'success');
        },
        [currentPlan, notify]
    );

    const selectPlan = useCallback(
        (planId: string) => {
            const plan = plans.find(p => p.id === planId);
            if (plan) {
                setActivePlanId(planId);
                setCurrentPlan(plan);
                loadPlanDetails(planId);
            }
        },
        [plans, loadPlanDetails]
    );

    const clearActivePlan = useCallback(() => {
        setActivePlanId(null);
        setCurrentPlan(null);
    }, []);

    return {
        plans,
        activePlanId,
        currentPlan,
        services,
        materials,
        labor,
        indirects,
        taxes,
        loading,
        setCurrentPlan,
        setServices,
        setMaterials,
        setLabor,
        setIndirects,
        setTaxes,
        handleCreatePlan,
        savePlan,
        deleteItem,
        deleteMultipleItems,
        selectPlan,
        clearActivePlan,
    };
};
