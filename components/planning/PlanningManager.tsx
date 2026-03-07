import React from 'react';
import { usePlanning } from './hooks/usePlanning';
import { PlanningList } from './PlanningList';
import { PlanningEditor } from './PlanningEditor';
import { PlanningHeader, PlannedService } from '../../types';

interface Props {
    initialPlanId?: string;
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

const PlanningManager: React.FC<Props> = ({ initialPlanId, onGenerateBudget }) => {
    const {
        currentPlan,
        services,
        materials,
        labor,
        indirects,
        taxes,
        customers,
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
    } = usePlanning(initialPlanId);

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
                if (!embeddedMode) {
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
