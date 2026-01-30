
import React, { useState, useMemo } from 'react';
import { X, Search, FileText, HardHat, Users, Briefcase, ChevronRight, DollarSign, Calendar } from 'lucide-react';
import { ServiceOrder, Customer, CatalogService, OrderStatus } from '../types';

interface GlobalConsultDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    orders: ServiceOrder[];
    customers: Customer[];
    catalog: CatalogService[];
}

type ConsultTab = 'works' | 'budgets' | 'customers' | 'services';

const GlobalConsultDrawer: React.FC<GlobalConsultDrawerProps> = ({ isOpen, onClose, orders, customers, catalog }) => {
    const [activeTab, setActiveTab] = useState<ConsultTab>('works');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredData = useMemo(() => {
        const term = searchTerm.toLowerCase();
        switch (activeTab) {
            case 'works':
                return orders.filter(o => o.osType === 'WORK' && (o.customerName.toLowerCase().includes(term) || o.id.toLowerCase().includes(term) || o.description.toLowerCase().includes(term)));
            case 'budgets':
                return orders.filter(o => (o.status === OrderStatus.PENDING || o.status === OrderStatus.APPROVED) && (o.customerName.toLowerCase().includes(term) || o.id.toLowerCase().includes(term)));
            case 'customers':
                return customers.filter(c => c.name.toLowerCase().includes(term) || (c.document || '').includes(term));
            case 'services':
                return catalog.filter(s => s.name.toLowerCase().includes(term) || s.category.toLowerCase().includes(term));
            default:
                return [];
        }
    }, [activeTab, searchTerm, orders, customers, catalog]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Central de Consulta</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Busca rápida em todo o sistema</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Search & Tabs */}
                <div className="p-6 bg-slate-50/50 border-b border-slate-100 shrink-0 space-y-6">
                    <div className="relative group">
                        <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Digite para buscar..."
                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-900 shadow-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="flex bg-slate-200/50 p-1 rounded-xl">
                        {[
                            { id: 'works', icon: HardHat, label: 'Obras' },
                            { id: 'budgets', icon: FileText, label: 'Orç' },
                            { id: 'customers', icon: Users, label: 'Cli' },
                            { id: 'services', icon: Briefcase, label: 'Serv' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as ConsultTab)}
                                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-lg transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span className="text-[9px] font-black uppercase tracking-tighter">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                    <div className="space-y-3">
                        {filteredData.map((item: any) => (
                            <div
                                key={item.id}
                                className="group p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-default"
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {activeTab === 'works' || activeTab === 'budgets' ? (
                                                <span className="text-[10px] font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-tighter">
                                                    {item.id.replace('OS-', '').replace('ORC-', '')}
                                                </span>
                                            ) : null}
                                            <h4 className="text-sm font-black text-slate-900 truncate uppercase mt-0.5">
                                                {activeTab === 'customers' ? item.name : activeTab === 'services' ? item.name : item.customerName}
                                            </h4>
                                        </div>

                                        <p className="text-xs text-slate-400 font-bold uppercase truncate">
                                            {activeTab === 'works' || activeTab === 'budgets' ? item.description :
                                                activeTab === 'customers' ? (item.document || 'Sem Documento') :
                                                    item.category}
                                        </p>

                                        {(activeTab === 'works' || activeTab === 'budgets') && (
                                            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-50">
                                                <div className="flex items-center gap-1.5">
                                                    <DollarSign className="w-3 h-3 text-emerald-500" />
                                                    <span className="text-[10px] font-black text-slate-700">R$ {(item.contractPrice || item.totalAmount || 0).toLocaleString('pt-BR')}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3 h-3 text-slate-300" />
                                                    <span className="text-[10px] font-bold text-slate-400">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded-xl group-hover:bg-blue-100 transition-colors">
                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600" />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredData.length === 0 && (
                            <div className="py-20 text-center space-y-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                                    <Search className="w-8 h-8 text-slate-200" />
                                </div>
                                <p className="text-slate-400 font-medium italic">Nenhum resultado encontrado.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0">
                    <p className="text-[9px] text-slate-400 font-bold uppercase text-center tracking-widest leading-relaxed">
                        Esta é uma consulta rápida. Para editar ou gerenciar,<br />acesse a seção correspondente no menu lateral.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GlobalConsultDrawer;
