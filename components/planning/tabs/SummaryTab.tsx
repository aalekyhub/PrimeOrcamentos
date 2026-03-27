import React from 'react';
import { PieChart, Truck, HardHat, Archive, Percent, Eye, Calculator, TrendingUp } from 'lucide-react';

interface SummaryTabProps {
    calculations: any;
    onGenerateBudget: () => void;
    onPreviewReport: () => void;
    hasGenerateBudget: boolean;
}

export const SummaryTab = React.memo(({
    calculations,
    onGenerateBudget,
    onPreviewReport,
    hasGenerateBudget,
}: SummaryTabProps) => {
    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: 'Materiais', value: calculations.totalMaterial, icon: Truck, color: 'emerald', desc: 'Insumos e Materiais' },
                    { label: 'Mão de Obra', value: calculations.totalLabor, icon: HardHat, color: 'amber', desc: 'Equipes e Diárias' },
                    { label: 'Indiretos', value: calculations.totalIndirect, icon: Archive, color: 'slate', desc: 'Custos Adicionais' },
                    { label: 'BDI', value: calculations.bdiValue, icon: TrendingUp, color: 'violet', desc: 'BDI' },
                    { label: 'Impostos', value: calculations.otherTaxesValue, icon: Percent, color: 'blue', desc: 'Taxas sobre Faturamento' },
                ].map((item) => (
                    <div key={item.label} className={`bg-${item.color}-50 dark:bg-${item.color}-900/20 p-4 rounded-2xl border border-${item.color}-200 dark:border-${item.color}-800 shadow-sm transition-all hover:shadow-md`}>
                        <div className="flex justify-between items-start mb-1.5">
                            <span className={`text-[10px] font-bold text-${item.color}-600 dark:text-${item.color}-400 uppercase tracking-widest`}>{item.label}</span>
                            <div className={`bg-${item.color}-100 dark:bg-${item.color}-900/40 p-1 rounded-lg`}>
                                <item.icon size={16} className={`text-${item.color}-600 dark:text-${item.color}-400`} />
                            </div>
                        </div>
                        <span className="text-xl font-black text-slate-800 dark:text-slate-100 whitespace-nowrap">R$ {item.value.toFixed(2)}</span>
                        <p className={`text-[9px] text-${item.color}-600/60 dark:text-${item.color}-400/60 mt-1 font-bold uppercase`}>{item.desc}</p>
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-3">
                <button
                    onClick={onPreviewReport}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 px-6 py-4 rounded-2xl flex items-center gap-4 hover:bg-slate-50 transition-all shadow-md group border-b-4 border-b-blue-600 active:border-b-0 active:translate-y-1"
                >
                    <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-xl group-hover:scale-110 transition-transform">
                        <Eye size={24} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-left">
                        <span className="block text-slate-800 dark:text-slate-100 font-bold">Relatório Executivo</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Visualizar PDF</span>
                    </div>
                </button>
            </div>

            <div className="bg-slate-900 dark:bg-slate-950 p-8 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-center shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-blue-500/20 transition-all duration-700"></div>

                <div className="relative z-10 text-center md:text-left mb-6 md:mb-0">
                    <p className="text-blue-400 text-xs font-bold uppercase tracking-[0.3em] mb-2 flex items-center justify-center md:justify-start gap-2">
                        <Calculator size={14} /> Investimento Total Planejado
                    </p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                            R$ {calculations.totalGeneral.toFixed(2)}
                        </span>
                    </div>
                    <p className="text-slate-500 text-[10px] mt-2 font-medium uppercase tracking-widest">Inclui todos os custos diretos, indiretos e bdi calculados</p>
                </div>

                <button
                    onClick={onGenerateBudget}
                    disabled={!hasGenerateBudget}
                    className={`relative z-10 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-black shadow-lg flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 ${!hasGenerateBudget ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Calculator size={24} /> GERAR ORÇAMENTO
                </button>
            </div>
        </div>
    );
});
