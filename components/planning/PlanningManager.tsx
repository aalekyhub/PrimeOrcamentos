import React, { useState } from 'react';
import { usePlanning } from './hooks/usePlanning';
import { useCalculations } from './hooks/useCalculations';
import { PlanningList } from './PlanningList';
import { PlanningEditor } from './PlanningEditor';
import { Customer } from './types';
import { db } from '../../services/db';
import { toNumber } from '../../services/formatUtils';
import { DocumentPreview } from '../documents/DocumentPreview';
import { PlanningDocument } from '../documents/PlanningDocument';
import { PLANNING_THEME } from '../../services/planningPdfService';

interface Props {
    customers: Customer[];
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
}

const PlanningManager: React.FC<Props> = ({
    customers,
    onGenerateBudget,
    embeddedPlanId,
    onBack,
    onPlanCreated,
}) => {
    const [showPreview, setShowPreview] = useState(false);

    const company = React.useMemo(() => {
        const loaded = db.load('serviflow_company', {
            name: 'PRIME SERVIÇOS E MANUTENÇÃO LTDA',
            cnpj: '12.345.678/0001-90',
            logoSize: 70,
        });
        return {
            name: loaded?.name || 'PRIME SERVIÇOS E MANUTENÇÃO LTDA',
            cnpj: loaded?.cnpj || '',
            phone: loaded?.phone || '',
            logo: loaded?.logo || '',
            logoSize: toNumber(loaded?.logoSize) || 70,
        };
    }, []);

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
                    onSave={handleSave}
                    onGenerateBudget={handleGenerateBudget}
                    onBack={() => {
                        planning.clearActivePlan();
                        if (onBack) onBack();
                    }}
                    embeddedMode={!!embeddedPlanId}
                    onShowPreview={() => setShowPreview(true)}
                />
            )}

            {showPreview && planning.currentPlan && (
                <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-5xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                        <DocumentPreview
                            filename={`Planejamento-${planning.currentPlan.id}`}
                            onClose={() => setShowPreview(false)}
                        >
                            <PlanningDocument
                                header={planning.currentPlan}
                                customers={customers}
                                services={planning.services}
                                materials={planning.materials}
                                labor={planning.labor}
                                indirects={planning.indirects}
                                taxes={planning.taxes}
                                calculations={{
                                    totalMaterial: calculations.totalMaterial,
                                    totalLabor: calculations.totalLabor,
                                    totalIndirect: calculations.totalIndirect,
                                    totalTax: calculations.totalTaxes,
                                    totalGeneral: calculations.totalGeneral
                                }}
                                company={company}
                                theme={PLANNING_THEME}
                            />
                        </DocumentPreview>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlanningManager;
