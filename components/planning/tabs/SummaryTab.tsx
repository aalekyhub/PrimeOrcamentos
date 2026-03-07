import React from 'react';
import { Truck, HardHat, Archive, Percent, Eye, Calculator } from 'lucide-react';

interface Props {
    totalMaterial: number;
    totalLabor: number;
    totalIndirect: number;
    totalTaxes: number;
    totalGeneral: number;
    onPreview: () => void;
    onGenerateBudget: () => void;
    hasGenerateBudget: boolean;
}

export const SummaryTab: React.FC<Props> = ({
    totalMaterial,
    totalLabor,
    totalIndirect,
    totalTaxes,
    totalGeneral,
    onPreview,
    onGenerateBudget,
    hasGenerateBudget,
}) => {
    return (
        <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Total Materiais', value: totalMaterial, icon: Truck, color: 'emerald', sub: 'Insumos + Materiais' },
                    { label: 'Total Mão de Obra', value: totalLabor, icon: HardHat, color: 'amber', sub: 'Equipe Própria/Terceirizada' },
                    { label: 'Total Indiretos', value: totalIndirect, icon: Archive, color: 'slate', sub: 'Custos Administrativos' },
                    { label: 'Total Impostos', value: totalTaxes, icon: Percent, color: 'blue', sub: 'Baseado no BDI e Taxas' },
                ].map((item) => (
                    <div key={item.label} className={`bg-${item.color}-50 dark:bg-${item.color}-900/20 p-6 rounded-xl border border-${item.color}-200 dark:border-${item.color}-800 shadow-sm transition-all hover:shadow-md`}>
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-xs font-bold text-${item.color}-600 dark:text-${item.color}-400 uppercase tracking-wider`}>{item.label}</span>
                            <div className={`bg-${item.color}-100 dark:bg-${item.color}-900/40 p-1.5 rounded-lg`}>
                                <item.icon size={16} className={`text-${item.color}-600 dark:text-${item.color}-400`} />
                            </div>
                        </div>
                        <span className={`text-2xl font-black text-${item.color}-900 dark:text-${item.color}-100 whitespace-nowrap`}>R$ {item.value.toFixed(2)}</span>
                        <p className={`text-[10px] text-${item.color}-600 dark:text-${item.color}-400 mt-1 font-medium`}>{item.sub}</p>
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-2 mb-6">
                <button
                    onClick={onPreview}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 px-6 py-4 rounded-2xl text-base font-black flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-md group border-b-4 border-b-blue-600 active:border-b-0 active:translate-y-1"
                >
                    <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-xl group-hover:scale-110 transition-transform">
                        <Eye size={24} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-left">
                        <span className="block text-slate-800 dark:text-slate-100 leading-none">Visualizar e Gerar PDF</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none font-bold">Relatório Completo</span>
                    </div>
                </button>
            </div>

            <div className="bg-slate-900 text-white p-8 rounded-2xl flex justify-between items-center shadow-xl">
                <div>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Custo Previsto Total</p>
                    <p className="text-4xl font-bold whitespace-nowrap">R$ {totalGeneral.toFixed(2)}</p>
                </div>
                <button
                    type="button"
                    onClick={onGenerateBudget}
                    disabled={!hasGenerateBudget}
                    className={`bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 ${!hasGenerateBudget ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Calculator size={20} /> Gerar Orçamento
                </button>
            </div>
        </div>
    );
};
