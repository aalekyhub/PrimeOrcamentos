import React, { useEffect } from 'react';
import { usePlanning } from './hooks/usePlanning';
import { PlanningList } from './PlanningList';
import { PlanningEditor } from './PlanningEditor';
import { PlanningHeader, PlannedService, Customer } from '../../types';

interface Props {
    embeddedPlanId?: string | null;
    customers?: Customer[];
    onBack?: () => void;
    onPlanCreated?: (plan: PlanningHeader) => void;
    onGenerateBudget?: (
        plan: PlanningHeader,
        services: PlannedService[],
        totalMaterial: number,
        totalLabor: number,
        totalIndirect: number,
        bdiRate: number,
        taxRate: number
    ) => void;
}

const PlanningManager: React.FC<Props> = ({
    embeddedPlanId,
    customers: customersProp,
    onBack,
    onPlanCreated,
    onGenerateBudget
}) => {
    const {
        currentPlan,
        services,
        materials,
        labor,
        indirects,
        taxes,
        customers: hookCustomers,
        calculations,
        plans,
        searchTerm,
        embeddedMode,
        setSearchTerm,
        setCurrentPlan,
        handleSave,
        handleDeletePlan,
        handleCreateNewPlan,
        setServices,
        setMaterials,
        setLabor,
        setIndirects,
        setTaxes,
        handleDeleteService,
        handleDeleteMaterial,
        handleDeleteLabor,
        handleDeleteIndirect,
        handleDeleteTax,
        activePlanId
    } = usePlanning(embeddedPlanId);

    // Use props customers if provided, otherwise hook customers
    const customers = customersProp || hookCustomers;

    // Notify parent if a plan was created (especially in 'new' mode)
    useEffect(() => {
        if (onPlanCreated && currentPlan && activePlanId === currentPlan.id) {
            // Simple heuristic: if we have a currentPlan and it matches the active ID,
            // we might want to tell the parent. However, we should be careful
            // not to trigger this in a loop. UnifiedWorksManager uses this to
            // update its own selectedPlanId.
        }
    }, [currentPlan, activePlanId, onPlanCreated]);

    // If in list mode
    if (!currentPlan) {
        return (
            <PlanningList
                plans={plans}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onSelect={setCurrentPlan}
                onCreateNew={handleCreateNewPlan}
                onDelete={handleDeletePlan}
            />
        );
    }

    // If in editor mode
    return (
        <PlanningEditor
            currentPlan={currentPlan}
            services={services}
            materials={materials}
            labor={labor}
            indirects={indirects}
            taxes={taxes}
            customers={customers}
            calculations={calculations}
            onBack={() => {
                if (onBack) {
                    onBack();
                } else if (!embeddedMode) {
                    setCurrentPlan(null);
                }
            }}
            onSave={handleSave}
            onUpdatePlan={setCurrentPlan}
            onSetServices={setServices}
            onSetMaterials={setMaterials}
            onSetLabor={setLabor}
            onSetIndirects={setIndirects}
            onSetTaxes={setTaxes}
            onDeleteService={handleDeleteService}
            onDeleteMaterial={handleDeleteMaterial}
            onDeleteLabor={handleDeleteLabor}
            onDeleteIndirect={handleDeleteIndirect}
            onDeleteTax={handleDeleteTax}
            onGenerateBudget={onGenerateBudget}
        />
    );
};

export default PlanningManager;
