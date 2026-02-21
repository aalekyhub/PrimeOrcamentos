
import React, { useState } from 'react';
import { Plus, Search, Trash2, Pencil, Briefcase, DollarSign, Tag, X, Scale, Database, Calculator, Upload, Filter, List } from 'lucide-react';
import { CatalogService, CompanyProfile } from '../types';
import { useNotify } from './ToastProvider';
import { checkDuplicateService } from '../services/validation';
import { db } from '../services/db';
import SinapiImporterInsumos from './sinapi/SinapiImporterInsumos';
import SinapiImporterComposicoes from './sinapi/SinapiImporterComposicoes';
import SinapiImporterAnalitico from './sinapi/SinapiImporterAnalitico';
import SinapiSearchAnalitico from './sinapi/SinapiSearchAnalitico';
import BdiCalculator from './BdiCalculator';
import { AnaliticoResult } from '../services/sinapiAnalitico';

interface Props {
  services: CatalogService[];
  setServices: React.Dispatch<React.SetStateAction<CatalogService[]>>;
  company: CompanyProfile;
  defaultOpenForm?: boolean;
  onSuccess?: (service: CatalogService) => void;
}

const ServiceCatalog: React.FC<Props> = ({ services, setServices, company, defaultOpenForm = false, onSuccess }) => {
  const [showForm, setShowForm] = useState(defaultOpenForm);
  const [activeTab, setActiveTab] = useState<'catalog' | 'sinapi' | 'bdi'>('catalog');
  const [sinapiView, setSinapiView] = useState<'search' | 'import'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingService, setEditingService] = useState<CatalogService | null>(null);
  const { notify } = useNotify();

  const [formData, setFormData] = useState<Partial<CatalogService>>({
    name: '',
    description: '',
    basePrice: 0,
    unit: 'un',
    category: 'Geral'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.basePrice === undefined) return;

    const duplicate = checkDuplicateService(formData.name || '', services, editingService?.id);
    if (duplicate) {
      notify(`Já existe um serviço cadastrado com este nome: "${duplicate.name}"`, "error");
      return;
    }

    let serviceResult: CatalogService;
    let newList: CatalogService[];

    if (editingService) {
      serviceResult = { ...editingService, ...formData as CatalogService };
      newList = services.map(s => s.id === editingService.id ? serviceResult : s);
    } else {
      serviceResult = {
        id: db.generateId('SER'),
        name: formData.name || '',
        description: formData.description || '',
        basePrice: formData.basePrice || 0,
        unit: formData.unit || 'un',
        category: formData.category || 'Geral',
      };
      newList = [serviceResult, ...services];
    }

    setServices(newList);
    const result = await db.save('serviflow_catalog', newList);

    if (result?.success) {
      notify(editingService ? "Serviço atualizado!" : "Serviço adicionado!");
      if (onSuccess) onSuccess(serviceResult);
      setShowForm(false);
      setEditingService(null);
      setFormData({ name: '', description: '', basePrice: 0, unit: 'un', category: 'Geral' });
    } else {
      notify("Erro ao salvar.", "error");
    }
  };

  const handleSinapiCopy = (result: AnaliticoResult) => {
    setFormData({
      name: result.composicao?.descricao || (result.itens.length > 0 ? result.itens[0].descricao_item : ''),
      description: `Ref. SINAPI (BOM Calc): ${result.composicao?.codigo || 'N/A'}. Custo Analítico Base: R$ ${result.total.toFixed(2)}`,
      basePrice: result.total,
      unit: result.composicao?.unidade || 'un',
      category: 'SINAPI (Analítico)'
    });
    setActiveTab('catalog');
    setShowForm(true);
    notify("Composição analítica copiada para o catálogo!");
  };

  const filtered = services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header with Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Gestão de Custos</h2>
          <p className="text-slate-500 text-sm font-medium">Catálogo próprio e Referências Analíticas SINAPI.</p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
          <TabButton
            active={activeTab === 'catalog'}
            onClick={() => setActiveTab('catalog')}
            icon={<Briefcase className="w-4 h-4" />}
            label="Meu Catálogo"
          />
          <TabButton
            active={activeTab === 'sinapi'}
            onClick={() => setActiveTab('sinapi')}
            icon={<Database className="w-4 h-4" />}
            label="SINAPI Analítico"
          />
          <TabButton
            active={activeTab === 'bdi'}
            onClick={() => setActiveTab('bdi')}
            icon={<Calculator className="w-4 h-4" />}
            label="Cálculo BDI"
          />
        </div>
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar em serviços..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => {
                setEditingService(null);
                setFormData({ name: '', description: '', basePrice: 0, unit: 'un', category: 'Geral' });
                setShowForm(true);
              }}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 font-bold text-sm"
            >
              <Plus className="w-4 h-4" /> Novo Item
            </button>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-10">Descrição</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Und</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço Base</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-10">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(service => (
                  <tr key={service.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-5 pl-10">
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{service.name}</p>
                      <p className="text-[11px] text-slate-400 font-medium line-clamp-1">{service.description || 'Sem descrição.'}</p>
                    </td>
                    <td className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase">{service.unit}</td>
                    <td className="px-8 py-5">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase ${service.category.includes('SINAPI') ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                        {service.category}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-700 whitespace-nowrap">
                      R$ {service.basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-8 py-5 pr-10 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setEditingService(service); setFormData(service); setShowForm(true); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={async () => {
                          if (confirm("Excluir item do catálogo?")) {
                            const newList = services.filter(s => s.id !== service.id);
                            setServices(newList);
                            await db.save('serviflow_catalog', newList);
                            notify("Item removido.");
                          }
                        }} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'sinapi' && (
        <div className="space-y-6">
          <div className="flex justify-center mb-4">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
              <button
                onClick={() => setSinapiView('search')}
                className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sinapiView === 'search' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'
                  }`}
              >
                Consultar Analítico
              </button>
              <button
                onClick={() => setSinapiView('import')}
                className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sinapiView === 'import' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'
                  }`}
              >
                Gerenciar Tabelas
              </button>
            </div>
          </div>

          {sinapiView === 'search' ? (
            <SinapiSearchAnalitico onCopyComposition={handleSinapiCopy} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
              <SinapiImporterInsumos />
              <SinapiImporterComposicoes />
              <SinapiImporterAnalitico />
            </div>
          )}
        </div>
      )}

      {activeTab === 'bdi' && (
        <div className="max-w-4xl mx-auto py-8">
          <BdiCalculator onSave={(config) => notify(`BDI de ${config.total}% calculado para referência.`)} />
        </div>
      )}

      {/* Item Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] p-10 w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                {editingService ? 'Editar Item' : 'Novo Item de Catálogo'}
              </h3>
              <button type="button" onClick={() => { setShowForm(false); setEditingService(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-2 ml-1">Descrição do Serviço/Material</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Alvenaria de tijolo, Pintura..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-2 ml-1">Preço/Custo Base (R$)</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.basePrice}
                    onChange={e => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-2 ml-1">Medida</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="UND, M2, M3..."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-2 ml-1">Notas Adicionais / Referência</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes técnicos, referências..."
                />
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingService(null); }}
                className="flex-1 px-6 py-4 rounded-2xl font-black uppercase text-xs text-slate-500 hover:bg-slate-50 transition-all"
              >
                Descartar
              </button>
              <button type="submit" className="flex-[2] bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200">
                {editingService ? 'Salvar Mudanças' : 'Confirmar e Adicionar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${active ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
      }`}
  >
    {icon} {label}
  </button>
);

export default ServiceCatalog;
