
import React, { useState, useMemo } from 'react';
import { Trash2, Merge, AlertTriangle, CheckCircle, RefreshCw, Layers, Briefcase, Users, Wallet, FileText, Building2 } from 'lucide-react';
import { Customer, CatalogService } from '../types';
import { db } from '../services/db';
import { cleanDocument, formatDocument } from '../services/validation';
import { useNotify } from './ToastProvider';

interface Props {
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    services: CatalogService[];
    setServices: React.Dispatch<React.SetStateAction<CatalogService[]>>;
}

const DataCleanup: React.FC<Props> = ({ customers, setCustomers, services, setServices }) => {
    const { notify } = useNotify();

    // Encontra duplicados de clientes
    const duplicateCustomers = useMemo(() => {
        const map = new Map<string, Customer[]>();
        customers.forEach(c => {
            const cleanDoc = cleanDocument(c.document);
            if (cleanDoc) {
                if (!map.has(cleanDoc)) map.set(cleanDoc, []);
                map.get(cleanDoc)?.push(c);
            }
        });

        return Array.from(map.values()).filter(group => group.length > 1);
    }, [customers]);

    // Encontra duplicados de serviços
    const duplicateServices = useMemo(() => {
        const map = new Map<string, CatalogService[]>();
        services.forEach(s => {
            const normalizedName = s.name.trim().toLowerCase();
            if (normalizedName) {
                if (!map.has(normalizedName)) map.set(normalizedName, []);
                map.get(normalizedName)?.push(s);
            }
        });

        return Array.from(map.values()).filter(group => group.length > 1);
    }, [services]);

    const mergeCustomers = (group: Customer[]) => {
        if (!confirm(`Deseja mesclar estes ${group.length} registros de cliente? O primeiro registro será mantido e os outros removidos.`)) return;

        const keep = group[0];
        const removeIds = group.slice(1).map(c => c.id);

        setCustomers(prev => prev.filter(c => !removeIds.includes(c.id)));
        removeIds.forEach(id => db.remove('serviflow_customers', id));
        notify(`Clientes mesclados. ${removeIds.length} registros duplicados removidos.`);
    };

    const mergeServices = (group: CatalogService[]) => {
        if (!confirm(`Deseja mesclar estes ${group.length} serviços? O primeiro registro será mantido.`)) return;

        const keep = group[0];
        const removeIds = group.slice(1).map(s => s.id);

        setServices(prev => prev.filter(s => !removeIds.includes(s.id)));
        removeIds.forEach(id => db.remove('serviflow_catalog', id));
        notify(`Serviços mesclados. ${removeIds.length} registros duplicados removidos.`);
    };

    const tableStats = useMemo(() => {
        const categories = [
            {
                title: 'Planejamento',
                color: 'blue',
                tables: [
                    { id: 'serviflow_plans', label: 'Projetos', icon: Layers },
                    { id: 'serviflow_plan_services', label: 'Serviços', icon: Briefcase },
                    { id: 'serviflow_plan_materials', label: 'Materiais', icon: Layers },
                    { id: 'serviflow_plan_labor', label: 'Mão de Obra', icon: Users },
                    { id: 'serviflow_plan_indirects', label: 'Custos Indiretos', icon: Wallet },
                    { id: 'serviflow_plan_taxes', label: 'Impostos', icon: FileText },
                ]
            },
            {
                title: 'Execução (Obras)',
                color: 'emerald',
                tables: [
                    { id: 'serviflow_works', label: 'Obras', icon: Building2 },
                    { id: 'serviflow_work_services', label: 'Serviços', icon: Briefcase },
                    { id: 'serviflow_work_materials', label: 'Materiais', icon: Layers },
                    { id: 'serviflow_work_labor', label: 'Mão de Obra', icon: Users },
                    { id: 'serviflow_work_indirects', label: 'Custos Indiretos', icon: Wallet },
                    { id: 'serviflow_work_taxes', label: 'Impostos', icon: FileText },
                ]
            }
        ];

        return categories.map(cat => ({
            ...cat,
            tables: cat.tables.map(t => ({
                ...t,
                count: (db.load(t.id, []) as any[]).length
            }))
        }));
    }, []);

    const hasDuplicates = duplicateCustomers.length > 0 || duplicateServices.length > 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Auditoria de Dados</h2>
                    <p className="text-slate-500 text-sm">Resumo da saúde e integridade do seu banco de dados local.</p>
                </div>
                {!hasDuplicates && (
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest border border-emerald-100">
                        <CheckCircle className="w-4 h-4" /> Banco de dados íntegro
                    </div>
                )}
            </div>

            {/* Sumário de Tabelas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tableStats.map((cat, idx) => (
                    <div key={idx} className={`bg-white rounded-3xl p-6 border border-slate-200 shadow-sm`}>
                        <h3 className={`text-xs font-black text-${cat.color}-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2`}>
                            <Layers className="w-4 h-4" /> {cat.title}
                        </h3>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            {cat.tables.map((t, tidx) => (
                                <div key={tidx} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 group transition-all hover:bg-white hover:shadow-md hover:border-blue-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <t.icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter truncate">{t.label}</span>
                                    </div>
                                    <div className="text-2xl font-black text-slate-800 tracking-tighter">
                                        {t.count || 0}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* End of diagnostics */}
        </div>
    );
};

export default DataCleanup;
