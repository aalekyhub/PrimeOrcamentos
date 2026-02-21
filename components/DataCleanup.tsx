
import React, { useState, useMemo } from 'react';
import { Trash2, Merge, AlertTriangle, CheckCircle, RefreshCw, Layers } from 'lucide-react';
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

    const hasDuplicates = duplicateCustomers.length > 0 || duplicateServices.length > 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Auditoria de Dados</h2>
                    <p className="text-slate-500 text-sm">Identifique e resolva registros duplicados no sistema.</p>
                </div>
                {!hasDuplicates && (
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest border border-emerald-100">
                        <CheckCircle className="w-4 h-4" /> Banco de dados íntegro
                    </div>
                )}
            </div>

            {duplicateCustomers.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" /> Clientes com Documento Duplicado ({duplicateCustomers.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        {duplicateCustomers.map((group, idx) => (
                            <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:border-blue-200 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-widest">
                                            {formatDocument(group[0].document)}
                                        </span>
                                        <h4 className="text-lg font-black text-slate-900 mt-2">Conflito de Identidade</h4>
                                    </div>
                                    <button
                                        onClick={() => mergeCustomers(group)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                                    >
                                        <Merge className="w-4 h-4" /> Mesclar Registros
                                    </button>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {group.map(customer => (
                                        <div key={customer.id} className="py-3 flex justify-between items-center group">
                                            <div>
                                                <p className="text-sm font-bold text-slate-700 uppercase">{customer.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{customer.email || 'Sem e-mail'} • ID: {customer.id}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (confirm("Excluir este registro?")) {
                                                        setCustomers(prev => prev.filter(c => c.id !== customer.id));
                                                        db.remove('serviflow_customers', customer.id);
                                                    }
                                                }}
                                                className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {duplicateServices.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-500" /> Serviços com Nome Duplicado ({duplicateServices.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        {duplicateServices.map((group, idx) => (
                            <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:border-indigo-200 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-widest">
                                            {group[0].name.trim().toUpperCase()}
                                        </span>
                                        <h4 className="text-lg font-black text-slate-900 mt-2">Nome Idêntico Detectado</h4>
                                    </div>
                                    <button
                                        onClick={() => mergeServices(group)}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                                    >
                                        <Merge className="w-4 h-4" /> Mesclar Serviços
                                    </button>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {group.map(service => (
                                        <div key={service.id} className="py-3 flex justify-between items-center group">
                                            <div>
                                                <p className="text-sm font-bold text-slate-700 uppercase">{service.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">R$ {service.basePrice.toLocaleString()} • ID: {service.id}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (confirm("Excluir este serviço?")) {
                                                        setServices(prev => prev.filter(s => s.id !== service.id));
                                                        db.remove('serviflow_catalog', service.id);
                                                    }
                                                }}
                                                className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!hasDuplicates && (
                <div className="bg-white rounded-[2rem] border border-slate-200 p-20 text-center space-y-4 shadow-sm">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-lg">
                        <CheckCircle className="w-10 h-10 text-emerald-500" />
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Limpeza Completa</h4>
                        <p className="text-slate-500 text-sm max-w-sm mx-auto mt-2">Não foram encontrados registros duplicados para Clientes ou Catálogo de Serviços.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataCleanup;
