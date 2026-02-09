
import React, { useState, useEffect } from 'react';
import { Search, Plus, List, Database, Filter, ArrowRight } from 'lucide-react';
import { sinapiDb, SinapiInsumoRecord, SinapiComposicaoRecord } from '../services/sinapiDb';

interface Props {
    onSelect: (item: any, type: 'INSUMO' | 'COMPOSICAO') => void;
}

const SinapiSearch: React.FC<Props> = ({ onSelect }) => {
    const [query, setQuery] = useState('');
    const [activeType, setActiveType] = useState<'INSUMO' | 'COMPOSICAO'>('COMPOSICAO');
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [filters, setFilters] = useState<{ uf: string; modo: string; mes_ref: string }>({
        uf: '',
        modo: '',
        mes_ref: ''
    });

    const [metadata, setMetadata] = useState<{ datasets: string[] }>({ datasets: [] });

    useEffect(() => {
        loadMetadata();
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            handleSearch();
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [query, activeType, filters]);

    const loadMetadata = async () => {
        const meta = await sinapiDb.getMetadata();
        setMetadata(meta);
    };

    const handleSearch = async () => {
        if (query.length < 3 && !filters.uf && !filters.mes_ref) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        try {
            if (activeType === 'INSUMO') {
                const res = await sinapiDb.searchInsumos(query, filters);
                setResults(res);
            } else {
                const res = await sinapiDb.searchComposicoes(query, filters);
                setResults(res);
            }
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Search Header */}
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-5 top-4 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Pesquisar por Código ou Descrição (mín. 3 letras)..."
                        className="w-full pl-14 pr-5 py-4 bg-white border border-slate-200 rounded-[1.25rem] text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400 shadow-sm"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveType('COMPOSICAO')}
                            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeType === 'COMPOSICAO' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
                                }`}
                        >
                            Composições
                        </button>
                        <button
                            onClick={() => setActiveType('INSUMO')}
                            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeType === 'INSUMO' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
                                }`}
                        >
                            Insumos
                        </button>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                <div className="bg-slate-50/50 px-8 py-4 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {isSearching ? 'Pesquisando...' : `${results.length} Itens encontrados`}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Top 100 resultados
                    </span>
                </div>

                <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
                    {results.length > 0 ? (
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white z-10 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest pl-10">Cód</th>
                                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Descrição / Unidade</th>
                                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Vigência/UF</th>
                                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right pr-10">Preço (R$)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {results.map(item => (
                                    <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="px-8 py-5 text-[11px] font-black text-slate-500 pl-10">{item.codigo}</td>
                                        <td className="px-8 py-5">
                                            <p className="text-[11px] font-bold text-slate-900 leading-tight mb-1 group-hover:text-indigo-600 transition-colors">{item.descricao}</p>
                                            <div className="flex gap-2">
                                                <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{item.unidade}</span>
                                                {item.grupo && <span className="text-[9px] font-black uppercase text-slate-300">| {item.grupo}</span>}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-[10px] font-bold text-slate-400">
                                            {item.mes_ref} - {item.uf}
                                        </td>
                                        <td className="px-8 py-5 text-right pr-10">
                                            <div className="flex items-center justify-end gap-4">
                                                <span className="text-[12px] font-black text-slate-900">
                                                    R$ {(activeType === 'INSUMO' ? item.preco : item.custo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                                <button
                                                    onClick={() => onSelect(item, activeType)}
                                                    className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="py-24 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Database className="w-10 h-10 text-slate-200" />
                            </div>
                            <h6 className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum dado encontrado</h6>
                            <p className="text-slate-300 text-[10px] mt-2 max-w-xs mx-auto">
                                Tente digitar pelo menos 3 caracteres da descrição ou o código exato.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SinapiSearch;
