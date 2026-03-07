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
} from '../../../types';
import { useCalculations } from './useCalculations';

export const usePlanning = (embeddedPlanId?: string | null) => {
    const [plans, setPlans] = useState<PlanningHeader[]>([]);
    const [activePlanId, setActivePlanId] = useState<string | null>(null);
    const [currentPlan, setCurrentPlan] = useState<PlanningHeader | null>(null);
    const [services, setServices] = useState<PlannedService[]>([]);
    const [materials, setMaterials] = useState<PlannedMaterial[]>([]);
    const [labor, setLabor] = useState<PlannedLabor[]>([]);
    const [indirects, setIndirects] = useState<PlannedIndirect[]>([]);
    const [taxes, setTaxes] = useState<PlanTax[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { notify } = useNotify();

    const creationAttemptedRef = useRef(false);
    const embeddedMode = !!embeddedPlanId;

    const calculations = useCalculations(services, materials, labor, indirects, taxes);

    const loadPlans = useCallback(async () => {
        const localPlans = db.load('serviflow_plans', []) as PlanningHeader[];
        setPlans(localPlans);
    }, []);

    const loadCustomers = useCallback(async () => {
        const data = db.load('serviflow_customers', []) as Customer[];
        setCustomers(data);
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

    const handleCreateNewPlan = useCallback(() => {
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

    const handleSave = async () => {
        if (!currentPlan) return;
        setLoading(true);

        const updatedPlanHeader = {
            ...currentPlan,
            total_real_cost: calculations.totalGeneral,
        };

        const currentLocalPlans = db.load('serviflow_plans', []) as PlanningHeader[];
        const updatedPlans = currentLocalPlans.map(p =>
            p.id === updatedPlanHeader.id ? updatedPlanHeader : p
        );

        if (!currentLocalPlans.find(p => p.id === updatedPlanHeader.id)) {
            updatedPlans.unshift(updatedPlanHeader);
        }

        await db.save('serviflow_plans', updatedPlans, updatedPlanHeader);

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

        await saveItems('serviflow_plan_services', services, 'plan_id');
        await saveItems('serviflow_plan_materials', materials, 'plan_id');
        await saveItems('serviflow_plan_labor', labor, 'plan_id');
        await saveItems('serviflow_plan_indirects', indirects, 'plan_id');
        await saveItems('serviflow_plan_taxes', taxes, 'plan_id');

        setPlans(updatedPlans);
        notify('Planejamento salvo!', 'success');
        setLoading(false);
    };

    const deletePlanItem = useCallback(
        async <T extends { id: string; plan_id?: string }>(
            storageKey: string,
            id: string,
            items: T[],
            setItems: (items: T[]) => void,
            itemName: string
        ) => {
            if (!window.confirm(`Tem certeza que deseja excluir este ${itemName}?`)) return;

            const updatedItems = items.filter(item => item.id !== id);
            setItems(updatedItems);
            await db.remove(storageKey, id);
            notify(`${itemName} excluído`, 'success');
        },
        [notify]
    );

    const handleDeletePlan = useCallback(
        async (id: string) => {
            if (!window.confirm('Excluir este planejamento permanentemente?')) return;
            setPlans(prev => prev.filter(p => p.id !== id));
            await db.remove('serviflow_plans', id);
            notify('Planejamento removido');
        },
        [notify]
    );

    const selectPlan = useCallback((plan: PlanningHeader | null) => {
        if (!plan) {
            setActivePlanId(null);
            setCurrentPlan(null);
            return;
        }
        setActivePlanId(plan.id);
        setCurrentPlan(plan);
        loadPlanDetails(plan.id);
    }, [loadPlanDetails]);

    // Effects
    useEffect(() => {
        if (embeddedPlanId) {
            if (embeddedPlanId === 'new') {
                if (!creationAttemptedRef.current) {
                    creationAttemptedRef.current = true;
                    handleCreateNewPlan();
                }
            } else if (plans.length > 0) {
                creationAttemptedRef.current = false;
                const plan = plans.find(p => p.id === embeddedPlanId);
                if (plan && activePlanId !== plan.id) {
                    setActivePlanId(plan.id);
                    setCurrentPlan(plan);
                    loadPlanDetails(plan.id);
                }
            }
        }
    }, [embeddedPlanId, plans, activePlanId, loadPlanDetails, handleCreateNewPlan]);

    useEffect(() => {
        loadPlans();
        loadCustomers();
    }, [loadPlans, loadCustomers]);

    useEffect(() => {
        const handleSync = () => {
            loadPlans();
            loadCustomers();
            if (activePlanId) loadPlanDetails(activePlanId);
        };
        window.addEventListener('db-sync-complete', handleSync);
        return () => window.removeEventListener('db-sync-complete', handleSync);
    }, [activePlanId, loadPlans, loadCustomers, loadPlanDetails]);

    return {
        plans,
        activePlanId,
        currentPlan,
        services,
        materials,
        labor,
        indirects,
        taxes,
        customers,
        loading,
        searchTerm,
        calculations,
        embeddedMode,
        setSearchTerm,
        setCurrentPlan: selectPlan,
        setServices,
        setMaterials,
        setLabor,
        setIndirects,
        setTaxes,
        handleCreateNewPlan,
        handleSave,
        handleDeletePlan,
        handleDeleteService: (id: string) => deletePlanItem('serviflow_plan_services', id, services, setServices, 'serviço'),
        handleDeleteMaterial: (id: string) => deletePlanItem('serviflow_plan_materials', id, materials, setMaterials, 'material'),
        handleDeleteLabor: (id: string) => deletePlanItem('serviflow_plan_labor', id, labor, setLabor, 'mão de obra'),
        handleDeleteIndirect: (id: string) => deletePlanItem('serviflow_plan_indirects', id, indirects, setIndirects, 'custo indireto'),
        handleDeleteTax: (id: string) => deletePlanItem('serviflow_plan_taxes', id, taxes, setTaxes, 'imposto'),
    };
};
