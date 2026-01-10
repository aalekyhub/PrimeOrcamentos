
import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Trash2, Pencil, X, Loader2, RefreshCw } from 'lucide-react';
import { Customer, PersonType, ServiceOrder } from '../types';
import { useNotify } from './ToastProvider';
import { checkDuplicateCustomer } from '../services/validation';
import { db } from '../services/db';

interface Props {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  orders: ServiceOrder[];
  defaultOpenForm?: boolean;
  onSuccess?: (customer: Customer) => void;
  onCancel?: () => void;
}

const CustomerManager: React.FC<Props> = ({ customers, setCustomers, orders, defaultOpenForm = false, onSuccess, onCancel }) => {
  const [showForm, setShowForm] = useState(defaultOpenForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [personType, setPersonType] = useState<PersonType>('PF');
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [loadingApi, setLoadingApi] = useState(false);
  const { notify } = useNotify();

  const initialFormState: Partial<Customer> = {
    type: 'PF', name: '', document: '', cep: '', address: '', number: '',
    complement: '', neighborhood: '', city: '', state: '', email: '', phone: '', whatsapp: ''
  };

  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>(initialFormState);

  // Busca CNPJ
  const lookupCNPJ = async (cnpj: string) => {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return;

    setLoadingApi(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (response.ok) {
        const data = await response.json();
        setNewCustomer(prev => ({
          ...prev,
          name: data.razao_social,
          address: `${data.logradouro}`,
          neighborhood: data.bairro,
          city: data.municipio,
          state: data.uf,
          cep: data.cep,
          number: data.numero
        }));
        notify("Dados do CNPJ importados!");
      }
    } catch (e) {
      notify("Erro ao buscar CNPJ", "error");
    } finally {
      setLoadingApi(false);
    }
  };

  // Busca CEP
  const lookupCEP = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setLoadingApi(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);
      if (response.ok) {
        const data = await response.json();
        setNewCustomer(prev => ({
          ...prev,
          address: data.street,
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state
        }));
        notify("Endereço preenchido via CEP");
      }
    } catch (e) {
      notify("CEP não encontrado", "error");
    } finally {
      setLoadingApi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.document) return;

    // Utiliza o serviço centralizado para verificar duplicidade
    const duplicate = checkDuplicateCustomer(newCustomer.document || '', customers, editingCustomerId);

    if (duplicate) {
      notify(`Já existe um cliente cadastrado com este ${personType === 'PF' ? 'CPF' : 'CNPJ'}: ${duplicate.name}`, "error");
      return;
    }

    const customerData: Customer = {
      ...(newCustomer as Customer),
      id: editingCustomerId || db.generateId('CLI'),
      type: personType,
      createdAt: newCustomer.createdAt || new Date().toISOString().split('T')[0]
    };

    const newList = editingCustomerId ? customers.map(c => c.id === editingCustomerId ? customerData : c) : [customerData, ...customers];
    setCustomers(newList);

    // Salva e aguarda nuvem
    const result = await db.save('serviflow_customers', newList);

    if (result?.success) {
      notify(editingCustomerId ? "Cliente atualizado e sincronizado!" : "Cliente cadastrado!");
      if (onSuccess) onSuccess(customerData);
      if (!defaultOpenForm) setShowForm(false);
      setNewCustomer(initialFormState);
      setEditingCustomerId(null);
    } else {
      notify("Salvo localmente. Erro ao sincronizar (veja o console)", "warning");
      if (onSuccess) onSuccess(customerData);
      if (!defaultOpenForm) setShowForm(false);
      setNewCustomer(initialFormState);
      setEditingCustomerId(null);
    }
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.document.includes(searchTerm)
  );

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-500";
  const labelClass = "text-[11px] font-black text-blue-700 uppercase tracking-widest mb-1.5 block ml-1";

  return (
    <div className="space-y-6">
      {!defaultOpenForm && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Clientes</h2>
            <p className="text-slate-500 text-sm">Gerenciamento de base de dados.</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditingCustomerId(null); setNewCustomer(initialFormState); }} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Novo Cliente
          </button>
        </div>
      )}

      {(showForm || defaultOpenForm) && (
        <div className={defaultOpenForm ? "" : "fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto"}>
          <form onSubmit={handleSubmit} className={`bg-white rounded-[2rem] shadow-2xl p-8 space-y-6 animate-in zoom-in-95 relative ${defaultOpenForm ? 'w-full' : 'w-full max-w-[900px]'}`}>
            {!defaultOpenForm && (
              <button type="button" onClick={() => { setShowForm(false); if (onCancel) onCancel(); }} className="absolute right-6 top-6 p-2 text-slate-300 hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button>
            )}

            <div className="flex justify-between items-center border-b pb-4">
              <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
                <button type="button" onClick={() => setPersonType('PF')} className={`px-8 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${personType === 'PF' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>PF</button>
                <button type="button" onClick={() => setPersonType('PJ')} className={`px-8 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${personType === 'PJ' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>PJ</button>
              </div>
              {loadingApi && <div className="flex items-center gap-2 text-blue-600 text-[10px] font-bold"><RefreshCw className="w-3 h-3 animate-spin" /> CONSULTANDO API...</div>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>{personType === 'PF' ? 'CPF' : 'CNPJ (Auto-preenchimento)'}</label>
                <input type="text" placeholder="Apenas números" className={inputClass} value={newCustomer.document}
                  onChange={e => {
                    const val = e.target.value;
                    setNewCustomer({ ...newCustomer, document: val });
                    if (personType === 'PJ' && val.replace(/\D/g, '').length === 14) lookupCNPJ(val);
                  }} required />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Nome / Razão Social</label>
                <input type="text" className={inputClass} value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-3">
                <label className={labelClass}>CEP (Auto-preenchimento)</label>
                <input type="text" placeholder="00000-000" className={inputClass} value={newCustomer.cep}
                  onChange={e => {
                    const val = e.target.value;
                    setNewCustomer({ ...newCustomer, cep: val });
                    if (val.replace(/\D/g, '').length === 8) lookupCEP(val);
                  }} />
              </div>
              <div className="md:col-span-6">
                <label className={labelClass}>Rua / Logradouro</label>
                <input type="text" className={inputClass} value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })} />
              </div>
              <div className="md:col-span-3">
                <label className={labelClass}>Número</label>
                <input type="text" className={inputClass} value={newCustomer.number} onChange={e => setNewCustomer({ ...newCustomer, number: e.target.value })} />
              </div>
              <div className="md:col-span-4">
                <label className={labelClass}>Bairro</label>
                <input type="text" className={inputClass} value={newCustomer.neighborhood} onChange={e => setNewCustomer({ ...newCustomer, neighborhood: e.target.value })} />
              </div>
              <div className="md:col-span-4">
                <label className={labelClass}>Cidade</label>
                <input type="text" className={inputClass} value={newCustomer.city} onChange={e => setNewCustomer({ ...newCustomer, city: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>UF</label>
                <input type="text" maxLength={2} className={`${inputClass} text-center uppercase`} value={newCustomer.state} onChange={e => setNewCustomer({ ...newCustomer, state: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Comp.</label>
                <input type="text" className={inputClass} value={newCustomer.complement} onChange={e => setNewCustomer({ ...newCustomer, complement: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>WhatsApp</label>
                <input type="text" className={inputClass} value={newCustomer.whatsapp} onChange={e => setNewCustomer({ ...newCustomer, whatsapp: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>E-mail</label>
                <input type="email" className={inputClass} value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button type="submit" className="bg-blue-600 text-white px-12 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                Salvar Cliente
              </button>
            </div>
          </form>
        </div>
      )}

      {!defaultOpenForm && (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                <th className="px-8 py-4">Cliente</th>
                <th className="px-8 py-4">Localização</th>
                <th className="px-8 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 group border-b last:border-0">
                  <td className="px-8 py-4">
                    <p className="text-sm font-black text-slate-900 uppercase">{c.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{c.document}</p>
                  </td>
                  <td className="px-8 py-4 text-xs text-slate-600 font-bold uppercase">{c.city} - {c.state}</td>
                  <td className="px-8 py-4 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingCustomerId(c.id); setNewCustomer(c); setPersonType(c.type); setShowForm(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                    <button onClick={async () => {
                      if (confirm("Deseja realmente excluir este cliente? Esta ação também removerá os dados da nuvem.")) {
                        setCustomers(p => p.filter(x => x.id !== c.id));
                        const result = await db.remove('customers', c.id);
                        if (result?.success) notify("Cliente removido da nuvem.");
                        else notify("Removido localmente. Erro na nuvem.", "warning");
                      }
                    }} className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CustomerManager;
