
import React, { useState } from 'react';
import { Plus, Search, Trash2, Pencil, Briefcase, DollarSign, Tag, X, Scale } from 'lucide-react';
import { CatalogService, CompanyProfile } from '../types';
import { useNotify } from './ToastProvider';
import { checkDuplicateService } from '../services/validation';
import { db } from '../services/db';

interface Props {
  services: CatalogService[];
  setServices: React.Dispatch<React.SetStateAction<CatalogService[]>>;
  company: CompanyProfile;
  defaultOpenForm?: boolean;
  onSuccess?: (service: CatalogService) => void;
}

const ServiceCatalog: React.FC<Props> = ({ services, setServices, company, defaultOpenForm = false, onSuccess }) => {
  const [showForm, setShowForm] = useState(defaultOpenForm);
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

    // Check for duplicate name using centralized service (case-insensitive and trimmed)
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

    // Salva e aguarda nuvem
    const result = await db.save('serviflow_catalog', newList);

    if (result?.success) {
      notify(editingService ? "Serviço atualizado e sincronizado!" : "Serviço adicionado!");
      if (onSuccess) onSuccess(serviceResult);
      setShowForm(false);
      setEditingService(null);
      setFormData({ name: '', description: '', basePrice: 0, unit: 'un', category: 'Geral' });
    } else {
      notify("Salvo localmente. Erro ao sincronizar (veja o console)", "warning");
      if (onSuccess) onSuccess(serviceResult);
      setShowForm(false);
      setEditingService(null);
      setFormData({ name: '', description: '', basePrice: 0, unit: 'un', category: 'Geral' });
    }
  };

  const filtered = services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {!defaultOpenForm && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Catálogo de Serviços</h2>
            <p className="text-slate-500 text-sm">Gerencie preços e descrições dos serviços oferecidos.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 font-semibold"
          >
            <Plus className="w-4 h-4" /> Novo Serviço
          </button>
        </div>
      )}

      {(showForm || defaultOpenForm) && (
        <div className={defaultOpenForm ? "" : "fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"}>
          <form onSubmit={handleSubmit} className={`bg-white rounded-3xl p-8 space-y-6 animate-in zoom-in-95 duration-200 ${defaultOpenForm ? "w-full max-w-5xl mx-auto shadow-2xl border" : "w-full max-w-lg shadow-2xl"}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{editingService ? 'Editar Serviço' : 'Novo Serviço no Catálogo'}</h3>
              {!defaultOpenForm && (
                <button type="button" onClick={() => { setShowForm(false); setEditingService(null); }} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-blue-700 uppercase tracking-widest mb-1.5 ml-1">Nome do Serviço</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 placeholder:text-slate-500"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do serviço"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-blue-700 uppercase tracking-widest mb-1.5 ml-1">Descrição Detalhada</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-32 font-bold text-slate-900 placeholder:text-slate-500"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o serviço..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-blue-700 uppercase tracking-widest mb-1.5 ml-1">Unidade de Medida</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900"
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    required
                  >
                    {company.customUnits.map(u => (
                      <option key={u.value} value={u.value}>{u.label} ({u.value})</option>
                    ))}
                    {company.customUnits.length === 0 && <option value="un">Unidade (un)</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-blue-700 uppercase tracking-widest mb-1.5 ml-1">Preço Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 placeholder:text-slate-500"
                    value={formData.basePrice}
                    onChange={e => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              {!defaultOpenForm && (
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingService(null); }}
                  className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
              )}
              <button type="submit" className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200">
                {editingService ? 'Salvar Alterações' : 'Cadastrar e Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!defaultOpenForm && (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex items-center gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar serviço..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-10">Serviço</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-10">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(service => (
                <tr key={service.id} className="hover:bg-slate-50 group transition-colors">
                  <td className="px-8 py-6 pl-10">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-sm font-black text-slate-900 uppercase">{service.name}</p>
                      <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">{service.category}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium line-clamp-1 max-w-md">{service.description || 'Sem descrição.'}</p>
                  </td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-700">
                    R$ {service.basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-400 uppercase">/ {service.unit}</span>
                  </td>
                  <td className="px-8 py-6 pr-10 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingService(service); setFormData(service); setShowForm(true); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Editar"><Pencil className="w-4 h-4" /></button>
                    <button onClick={async () => {
                      if (confirm("Deseja excluir este serviço do catálogo? Esta ação também removerá os dados da nuvem.")) {
                        setServices(prev => prev.filter(s => s.id !== service.id));
                        const result = await db.remove('catalog', service.id);
                        if (result?.success) notify("Serviço removido da nuvem.");
                        else notify("Removido localmente. Erro na nuvem.", "warning");
                      }
                    }} className="p-2 text-slate-400 hover:text-rose-500 transition-colors" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-medium">Nenhum serviço encontrado.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ServiceCatalog;
