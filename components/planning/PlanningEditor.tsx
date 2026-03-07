import React, { useState } from 'react';
import {
    Building2,
    Truck,
    HardHat,
    FileText,
    Save,
    ArrowRight,
    PieChart,
} from 'lucide-react';
import { useNotify } from '../ToastProvider';
import { db } from '../../services/db';
import { DataTab } from './tabs/DataTab';
import { ServicesTab } from './tabs/ServicesTab';
import { ResourcesTab } from './tabs/ResourcesTab';
import { SummaryTab } from './tabs/SummaryTab';
import {
    PlanningHeader,
    PlannedService,
    PlannedMaterial,
    PlannedLabor,
    PlannedIndirect,
    PlanTax,
    Customer,
    MainTab,
} from './types';

interface PlanningEditorProps {
    currentPlan: PlanningHeader | null;
    services: PlannedService[];
    materials: PlannedMaterial[];
    labor: PlannedLabor[];
    indirects: PlannedIndirect[];
    taxes: PlanTax[];
    customers: Customer[];
    calculations: any;
    onUpdatePlan: (plan: PlanningHeader) => void;
    onUpdateServices: (services: PlannedService[]) => void;
    onUpdateMaterials: (materials: PlannedMaterial[]) => void;
    onUpdateLabor: (labor: PlannedLabor[]) => void;
    onUpdateIndirects: (indirects: PlannedIndirect[]) => void;
    onUpdateTaxes: (taxes: PlanTax[]) => void;
    onDeleteService: (id: string) => void;
    onDeleteMaterial: (id: string) => void;
    onDeleteLabor: (id: string) => void;
    onDeleteIndirect: (id: string) => void;
    onDeleteTax: (id: string) => void;
    onSave: () => void;
    onGenerateBudget: () => void;
    onBack: () => void;
    embeddedMode: boolean;
    onShowPreview: (title: string, html: string, filename: string) => void;
}

export const PlanningEditor: React.FC<PlanningEditorProps> = ({
    currentPlan,
    services,
    materials,
    labor,
    indirects,
    taxes,
    customers,
    calculations,
    onUpdatePlan,
    onUpdateServices,
    onUpdateMaterials,
    onUpdateLabor,
    onUpdateIndirects,
    onUpdateTaxes,
    onDeleteService,
    onDeleteMaterial,
    onDeleteLabor,
    onDeleteIndirect,
    onDeleteTax,
    onSave,
    onGenerateBudget,
    onBack,
    embeddedMode,
    onShowPreview,
}) => {
    const [activeTab, setActiveTab] = useState<MainTab>('dados');
    const { notify } = useNotify();

    if (!currentPlan) return null;

    const handleAddService = (serviceData: any) => {
        const newService: PlannedService = {
            id: db.generateId('SVC'),
            plan_id: currentPlan.id,
            ...serviceData,
            total_cost: serviceData.quantity * (serviceData.unit_material_cost + serviceData.unit_labor_cost),
        };
        onUpdateServices([...services, newService]);
    };

    const handleAddMaterial = (materialData: any) => {
        const newMaterial: PlannedMaterial = {
            id: db.generateId('MAT'),
            plan_id: currentPlan.id,
            ...materialData,
            total_cost: materialData.quantity * materialData.unit_cost,
        };
        onUpdateMaterials([...materials, newMaterial]);
    };

    const handleAddLabor = (laborData: any) => {
        const newLabor: PlannedLabor = {
            id: db.generateId('LBR'),
            plan_id: currentPlan.id,
            ...laborData,
            total_cost: laborData.quantity * laborData.unit_cost,
        };
        onUpdateLabor([...labor, newLabor]);
    };

    const handleAddIndirect = (indirectData: any) => {
        const newIndirect: PlannedIndirect = {
            id: db.generateId('IND'),
            plan_id: currentPlan.id,
            ...indirectData,
        };
        onUpdateIndirects([...indirects, newIndirect]);
    };

    const handleAddTax = (taxData: any) => {
        const newTax: PlanTax = {
            id: db.generateId('TAX'),
            plan_id: currentPlan.id,
            ...taxData,
        };
        onUpdateTaxes([...taxes, newTax]);
    };

    const generateFullReportHtml = () => {
        const company = db.load('serviflow_company', {
            name: 'PRIME SERVIÇOS E MANUTENÇÃO LTDA',
            cnpj: '12.345.678/0001-90',
            logoSize: 70
        });

        const customer = customers.find(c => c.id === currentPlan.client_id);

        return `
            <div style="width: 100%; background: white; font-family: sans-serif; padding: 15mm; color: #1e293b;">
                <!-- HEADER SECTION -->
                <div class="report-header" style="padding-bottom: 25px !important; border-bottom: 3px solid #000; margin-bottom: 25px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="display: flex; gap: 20px; align-items: center;">
                            <div style="display: flex; align-items: center; justify-content: center;">
                                ${company.logo ? `<img src="${company.logo}" style="height: ${company.logoSize || 70}px; max-width: 250px; object-fit: contain;">` : '<div style="font-weight:900; font-size:28px; color:#2563eb;">PO</div>'}
                            </div>
                            <div>
                                <h1 style="font-size:16px; font-weight:900; color:#0f172a; margin:0 0 1mm 0; text-transform:uppercase; letter-spacing:-0.5px;">${company.name}</h1>
                                <p style="font-size:14px; font-weight:800; color:#0f172a; margin:0 0 1mm 0;">OBRA: ${currentPlan.name}</p>
                                <p style="font-size:10px; font-weight:800; color:#2563eb; text-transform:uppercase; letter-spacing:1px; margin:0 0 1mm 0;">Planejamento Executivo de Obra</p>
                                <p style="font-size:8px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:-0.3px; margin:0;">${company.cnpj || ''} | ${company.phone || ''}</p>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="background:#2563eb; color:white; padding:1.5mm 3mm; border-radius:1.5mm; font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:1px; margin-bottom:1.5mm; display:inline-block;">PLANEJAMENTO</div>
                            <p style="font-size:18px; font-weight:900; color:#0f172a; letter-spacing:-0.5px; margin:0 0 0.5mm 0; white-space:nowrap;">PLAN-${currentPlan.id.split('-').pop()}</p>
                            <p style="font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:1px; text-align:right; margin:0;">EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>
                </div>

                <!-- INFO GRID -->
                <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; background: #f8fafc; padding: 16px; border-radius: 6px; border: 1.5px solid #e2e8f0;">
                    <div style="flex: 1; min-width: 150px;">
                        <p style="margin: 0 0 4px 0; font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Cliente</p>
                        <p style="margin: 0; font-size: 12px; color: #0f172a; font-weight: 700;">${customer?.name || 'Não Informado'}</p>
                    </div>
                    <div style="flex: 1; min-width: 150px;">
                        <p style="margin: 0 0 4px 0; font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Tipo de Obra</p>
                        <p style="margin: 0; font-size: 12px; color: #0f172a; font-weight: 700;">${currentPlan.type || 'Não Informado'}</p>
                    </div>
                    <div style="width: 100%;">
                        <p style="margin: 0 0 4px 0; font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Endereço Previsto</p>
                        <p style="margin: 0; font-size: 12px; color: #0f172a; font-weight: 700;">${currentPlan.address || 'Não Informado'}</p>
                    </div>
                </div>

                <!-- COLORFUL CARDS -->
                <div style="display: flex; gap: 12px; margin-bottom: 25px;">
                    <div style="flex: 1; background: #ecfdf5; border-bottom: 2px solid #10b981; border-radius: 6px; padding: 12px;">
                        <span style="font-size: 8px; font-weight: 700; color: #059669; text-transform: uppercase;">Materiais</span>
                        <span style="font-size: 16px; font-weight: 800; color: #064e3b; display: block; white-space: nowrap;">R$ ${calculations.totalMaterial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style="flex: 1; background: #fffbeb; border-bottom: 2px solid #f59e0b; border-radius: 6px; padding: 12px;">
                        <span style="font-size: 8px; font-weight: 700; color: #d97706; text-transform: uppercase;">Mão de Obra</span>
                        <span style="font-size: 16px; font-weight: 800; color: #78350f; display: block; white-space: nowrap;">R$ ${calculations.totalLabor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style="flex: 1; background: #eff6ff; border-bottom: 2px solid #3b82f6; border-radius: 6px; padding: 12px;">
                        <span style="font-size: 8px; font-weight: 700; color: #2563eb; text-transform: uppercase;">Impostos</span>
                        <span style="font-size: 16px; font-weight: 800; color: #1e3a8a; display: block; white-space: nowrap;">R$ ${(calculations.totalIndirect + (calculations.totalTax || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <!-- TOTAL BOX -->
                <div style="margin-bottom: 30px; background: #064e3b; color: white; padding: 12px 16px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                    <p style="font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0; letter-spacing: 0.1em; color: #a7f3d0;">CUSTO TOTAL PREVISTO</p>
                    <p style="font-size: 18px; font-weight: 900; margin: 0; white-space: nowrap;">R$ ${calculations.totalGeneral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>

                <!-- SECTIONS -->
                ${services.length > 0 ? `
                <div style="margin-bottom: 30px;">
                    <h3 style="font-size: 14px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0;">1. Serviços Planejados</h3>
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
                                    <td style="padding: 10px 0; font-size: 11px; text-align: right;">R$ ${(s.unit_material_cost + s.unit_labor_cost + (s.unit_indirect_cost || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    <td style="padding: 10px 0; font-size: 11px; text-align: right; font-weight: 700;">R$ ${s.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>` : ''}

                ${materials.length > 0 ? `
                <div style="margin-bottom: 30px;">
                    <h3 style="font-size: 14px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0;">2. Insumos e Materiais</h3>
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

                ${labor.length > 0 ? `
                <div style="margin-bottom: 30px; page-break-inside: avoid;">
                    <h3 style="font-size: 14px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0;">3. Mão de Obra</h3>
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

                ${indirects.length > 0 ? `
                <div style="margin-bottom: 30px; page-break-inside: avoid;">
                    <h3 style="font-size: 14px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0;">4. Custos Indiretos</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid #e2e8f0;">
                                <th style="padding: 10px 0; text-align: left; font-size: 10px; color: #64748b;">CATEGORIA / DESCRIÇÃO</th>
                                <th style="padding: 10px 0; text-align: right; font-size: 10px; color: #64748b; width: 100px;">VALOR</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${indirects.map(i => `
                                <tr style="border-bottom: 1px solid #f1f5f9; page-break-inside: avoid;">
                                    <td style="padding: 10px 0; font-size: 11px; font-weight: 600;">${i.category} ${i.description ? `- ${i.description}` : ''}</td>
                                    <td style="padding: 10px 0; font-size: 11px; text-align: right; font-weight: 700;">R$ ${i.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>` : ''}

                ${taxes.length > 0 ? `
                <div style="margin-bottom: 30px; page-break-inside: avoid;">
                    <h3 style="font-size: 14px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0;">5. Resumo de Impostos</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid #e2e8f0;">
                                <th style="padding: 10px 0; text-align: left; font-size: 10px; color: #64748b;">IMPOSTO</th>
                                <th style="padding: 10px 0; text-align: center; font-size: 10px; color: #64748b; width: 60px;">ALÍQUOTA</th>
                                <th style="padding: 10px 0; text-align: right; font-size: 10px; color: #64748b; width: 100px;">VALOR PREVISTO</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${taxes.map(t => {
            const baseValue = calculations.totalGeneral - (calculations.totalTax || 0);
            const value = t.rate > 0 ? baseValue * (t.rate / 100) : t.value;
            return `
                                <tr style="border-bottom: 1px solid #f1f5f9; page-break-inside: avoid;">
                                    <td style="padding: 10px 0; font-size: 11px; font-weight: 600;">${t.name}</td>
                                    <td style="padding: 10px 0; font-size: 11px; text-align: center;">${t.rate > 0 ? `${t.rate.toFixed(2)}%` : '-'}</td>
                                    <td style="padding: 10px 0; font-size: 11px; text-align: right; font-weight: 700;">R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            `;
        }).join('')}
                        </tbody>
                    </table>
                </div>` : ''}

                <div class="report-footer" style="padding-top: 20px; border-top: 1px solid #e2e8f0; margin-top: 20px; text-align: center;">
                    <p style="margin: 0; font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.2em; font-weight: 700;">Este documento é um levantamento preliminar de custos para fins de orçamento.</p>
                    <p style="margin: 10px 0 0 0; font-size: 10px; color: #64748b; font-weight: 800;">${company.name.toUpperCase()} - GESTÃO DE PLANEJAMENTO</p>
                </div>
            </div>
        `;
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl min-h-[80vh] flex flex-col border dark:border-slate-800 overflow-hidden">
            <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center gap-4">
                        {!embeddedMode && (
                            <button onClick={onBack} className="text-blue-400 hover:text-blue-600 p-1">
                                <ArrowRight className="rotate-180" size={20} />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                                <HardHat className="text-blue-600 dark:text-blue-400" />
                                {currentPlan.name.toUpperCase()}
                            </h2>
                            <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-widest font-semibold">{currentPlan.status} • GESTÃO DE PLANEJAMENTO</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                notify("Sincronizando com a nuvem...", "info");
                                // Implement cloud sync logic if available, or just a placeholder for now
                            }}
                            className="px-4 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-blue-200 transition-all border border-blue-200 dark:border-blue-800"
                        >
                            <ArrowRight className="rotate-180" size={16} /> Sincronizar
                        </button>
                        <button
                            onClick={onSave}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-900/20"
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
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as MainTab)}
                            className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <tab.icon size={16} /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-8 flex-1 bg-slate-50/50 dark:bg-slate-900/50 overflow-auto">
                {activeTab === 'dados' && <DataTab plan={currentPlan} customers={customers} onUpdatePlan={onUpdatePlan} />}
                {activeTab === 'servicos' && (
                    <ServicesTab
                        services={services}
                        onAddService={handleAddService}
                        onUpdateService={(up) => onUpdateServices(services.map(s => s.id === up.id ? up : s))}
                        onDeleteService={onDeleteService}
                        onReorderServices={onUpdateServices}
                        planId={currentPlan.id}
                    />
                )}
                {activeTab === 'recursos' && (
                    <ResourcesTab
                        planId={currentPlan.id}
                        materials={materials}
                        labor={labor}
                        indirects={indirects}
                        taxes={taxes}
                        calculations={calculations}
                        onAddMaterial={handleAddMaterial}
                        onAddLabor={handleAddLabor}
                        onAddIndirect={handleAddIndirect}
                        onAddTax={handleAddTax}
                        onUpdateMaterials={onUpdateMaterials}
                        onUpdateLabor={onUpdateLabor}
                        onUpdateIndirects={onUpdateIndirects}
                        onUpdateTaxes={onUpdateTaxes}
                        onDeleteMaterial={onDeleteMaterial}
                        onDeleteLabor={onDeleteLabor}
                        onDeleteIndirect={onDeleteIndirect}
                        onDeleteTax={onDeleteTax}
                    />
                )}
                {activeTab === 'resumo' && (
                    <SummaryTab
                        calculations={calculations}
                        onGenerateBudget={onGenerateBudget}
                        onPreviewReport={() => onShowPreview('Planejamento de Obra', generateFullReportHtml(), `${currentPlan.name}.pdf`)}
                        hasGenerateBudget={!!onGenerateBudget}
                    />
                )}
            </div>
        </div>
    );
};
