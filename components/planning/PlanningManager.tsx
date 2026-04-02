import React, { useState } from 'react';
import { usePlanning } from './hooks/usePlanning';
import { useCalculations } from './hooks/useCalculations';
import { PlanningList } from './PlanningList';
import { PlanningEditor } from './PlanningEditor';
import { Customer } from './types';
import { UserAccount } from '../../types';
import { db } from '../../services/db';
import { toNumber } from '../../services/formatUtils';
import ReportPreview from '../ReportPreview';
import { buildPlanningReportHtml, PLANNING_THEME } from '../../services/planningPdfService';
// DocumentPreview and PlanningDocument are replaced by the unified system

interface Props {
    customers: Customer[];
    company: any;
    onGenerateBudget?: (
        plan: any,
        services: any[],
        totalMat: number,
        totalLab: number,
        totalInd: number,
        bdiRate: number,
        taxRate: number
    ) => void;
    embeddedPlanId?: string | null;
    onBack?: () => void;
    onPlanCreated?: (plan: any) => void;
    currentUser: UserAccount;
}

const PlanningManager: React.FC<Props> = ({
    customers,
    company,
    onGenerateBudget,
    embeddedPlanId,
    onBack,
    onPlanCreated,
    currentUser,
}) => {
    const [showPreview, setShowPreview] = useState(false);


    const planning = usePlanning(customers, embeddedPlanId);

    const calculations = useCalculations(
        planning.services,
        planning.materials,
        planning.labor,
        planning.indirects,
        planning.taxes
    );

    const handleGenerateBudget = () => {
        if (onGenerateBudget && planning.currentPlan) {
            const bdiTx = planning.taxes.find(t => t.name === 'BDI');
            const otherTxs = planning.taxes.filter(t => t.name !== 'BDI');
            const bdiRate = bdiTx ? bdiTx.rate : 0;
            const taxRate = otherTxs.reduce((acc, t) => acc + (t.rate || 0), 0);

            onGenerateBudget(
                planning.currentPlan,
                planning.services,
                calculations.totalMaterial,
                calculations.totalLabor,
                calculations.totalIndirect,
                bdiRate,
                taxRate
            );
        }
    };

    const handleSave = async () => {
        const isAdmin = currentUser?.role === 'admin';
        const isNew = embeddedPlanId === 'new' || !embeddedPlanId;
        if (!isAdmin && !isNew) {
            alert("Você não tem permissão para alterar projetos salvos.");
            return;
        }
        await planning.savePlan(calculations.totalGeneral);
    };

    if (embeddedPlanId && !planning.currentPlan) {
        return <div className="p-10 text-center font-bold text-slate-400 animate-pulse">CARREGANDO PLANEJAMENTO...</div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto p-6">
            {!planning.activePlanId && !embeddedPlanId ? (
                <PlanningList
                    plans={planning.plans}
                    onCreatePlan={planning.handleCreatePlan}
                    onSelectPlan={planning.selectPlan}
                />
            ) : (
                <PlanningEditor
                    currentPlan={planning.currentPlan}
                    services={planning.services}
                    materials={planning.materials}
                    labor={planning.labor}
                    indirects={planning.indirects}
                    taxes={planning.taxes}
                    customers={customers}
                    calculations={calculations}
                    onUpdatePlan={planning.setCurrentPlan}
                    onUpdateServices={planning.setServices}
                    onUpdateMaterials={planning.setMaterials}
                    onUpdateLabor={planning.setLabor}
                    onUpdateIndirects={planning.setIndirects}
                    onUpdateTaxes={planning.setTaxes}
                    onDeleteService={(id) =>
                        planning.deleteItem('serviflow_plan_services', id, planning.services, planning.setServices, 'serviço')
                    }
                    onDeleteMaterial={(id) =>
                        planning.deleteItem('serviflow_plan_materials', id, planning.materials, planning.setMaterials, 'material')
                    }
                    onDeleteLabor={(id) =>
                        planning.deleteItem('serviflow_plan_labor', id, planning.labor, planning.setLabor, 'mão de obra')
                    }
                    onDeleteIndirect={(id) =>
                        planning.deleteItem('serviflow_plan_indirects', id, planning.indirects, planning.setIndirects, 'custo indireto')
                    }
                    onDeleteTax={(id) =>
                        planning.deleteItem('serviflow_plan_taxes', id, planning.taxes, planning.setTaxes, 'imposto')
                    }
                    onDeleteMultipleServices={(ids) =>
                        planning.deleteMultipleItems('serviflow_plan_services', ids, planning.services, planning.setServices, () => { }, 'serviço')
                    }
                    onDeleteMultipleMaterials={(ids) =>
                        planning.deleteMultipleItems('serviflow_plan_materials', ids, planning.materials, planning.setMaterials, () => { }, 'material')
                    }
                    onDeleteMultipleLabor={(ids) =>
                        planning.deleteMultipleItems('serviflow_plan_labor', ids, planning.labor, planning.setLabor, () => { }, 'mão de obra')
                    }
                    onDeleteMultipleIndirects={(ids) =>
                        planning.deleteMultipleItems('serviflow_plan_indirects', ids, planning.indirects, planning.setIndirects, () => { }, 'custo indireto')
                    }
                    onSave={handleSave}
                    onGenerateBudget={handleGenerateBudget}
                    onBack={() => {
                        planning.clearActivePlan();
                        if (onBack) onBack();
                    }}
                    embeddedMode={!!embeddedPlanId}
                    onShowPreview={() => setShowPreview(true)}
                    currentUser={currentUser}
                />
            )}

            {showPreview && planning.currentPlan && (
                <ReportPreview
                    title={`${planning.currentPlan.id} - ${planning.currentPlan.name}`}
                    htmlContent={buildPlanningReportHtml(
                        planning.currentPlan,
                        customers,
                        planning.services,
                        planning.materials,
                        planning.labor,
                        planning.indirects,
                        planning.taxes,
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
                        PLANNING_THEME
                    )}
                    filename={`${planning.currentPlan.id} - ${planning.currentPlan.name}`}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </div>
    );
};

export default PlanningManager;
