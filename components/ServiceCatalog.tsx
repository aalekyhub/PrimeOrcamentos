
import React, { useState } from 'react';
import { Plus, Search, Trash2, Pencil, Briefcase, DollarSign, Tag, X, Scale } from 'lucide-react';
import { CatalogService, CompanyProfile } from '../types';
import { useNotify } from './ToastProvider';
import { checkDuplicateService } from '../services/validation';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.basePrice === undefined) return;

    // Check for duplicate name using centralized service (case-insensitive and trimmed)
    const duplicate = checkDuplicateService(formData.name || '', services, editingService?.id);

    if (duplicate) {
      notify(`Já existe um serviço cadastrado com este nome: "${duplicate.name}"`, "error");
      return;
    }

    let serviceResult: CatalogService;

    if (editingService) {
      serviceResult = { ...editingService, ...formData as CatalogService };
      setServices(prev => prev.map(s => s.id === editingService.id ? serviceResult : s));
    } else {
      serviceResult = {
        id: `SRV-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        name: formData.name || '',
        description: formData.description || '',
        basePrice: formData.basePrice || 0,
        unit: formData.unit || 'un',
        category: formData.category || 'Geral',
      };
      setServices(prev => [serviceResult, ...prev]);
    }

    if (onSuccess) onSuccess(serviceResult);
    setShowForm(false);
    setEditingService(null);
    setFormData({ name: '', description: '', basePrice: 0, unit: 'un', category: 'Geral' });
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
                <label className="block text-[12px] font-bold text-blue-600 uppercase tracking-widest mb-1">Nome do Serviço</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-blue-600 uppercase tracking-widest mb-1">Descrição Detalhada</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-32 font-medium"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-blue-600 uppercase tracking-widest mb-1">Unidade de Medida</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
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
                  <label className="block text-[12px] font-bold text-blue-600 uppercase tracking-widest mb-1">Preço Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
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
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar serviço..."
                className="pl-10 pr-4 py-2 w-full bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filtered.map(service => (
              <div key={service.id} className="group p-6 bg-white border border-slate-200 rounded-3xl hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button
                    onClick={() => { setEditingService(service); setFormData(service); setShowForm(true); }}
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setServices(prev => prev.filter(s => s.id !== service.id))}
                    className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 truncate">{service.name}</h4>
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{service.category}</span>
                  </div>
                </div>

                <p className="text-sm text-slate-500 mb-6 line-clamp-2 min-h-[40px]">{service.description || 'Sem descrição.'}</p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                    <span className="text-xs text-slate-400">R$</span>
                    <span className="text-lg">{service.basePrice.toLocaleString()}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">/ {service.unit}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{service.id}</span>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="col-span-full py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8 text-slate-200" />
                </div>
                <p className="text-slate-400 font-medium">Nenhum serviço encontrado.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceCatalog;
