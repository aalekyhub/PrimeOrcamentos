
import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Trash2, X, Loader2, RefreshCw } from 'lucide-react';
import { Customer, PersonType, ServiceOrder, UserAccount } from '../types';
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
  currentUser: UserAccount;
}

const CustomerManager: React.FC<Props> = ({ customers, setCustomers, orders, currentUser, defaultOpenForm = false, onSuccess, onCancel }) => {
  const isAdmin = currentUser?.role === 'admin';
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
    if (editingCustomerId && !isAdmin) {
      notify("Você não tem permissão para editar clientes salvos.", "error");
      return;
    }
    if (!newCustomer.name || !newCustomer.document) return;

    // Utiliza o serviço centralizado para verificar duplicidade
    const duplicate = checkDuplicateCustomer(newCustomer.document || '', customers, editingCustomerId);

    if (duplicate) {
      notify(`Já existe um cliente cadastrado com este ${personType === 'PF' ? 'CPF' : 'CNPJ'}: ${duplicate.name}`, "error");
      // Limpa APENAS o campo de documento para permitir correção sem perder os outros dados (Melhor UX)
      setNewCustomer(prev => ({ ...prev, document: '' }));
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
    // Otmização: envia apenas o item atual para o Supabase
    const result = await db.save('serviflow_customers', newList, customerData);

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

  const inputClass = "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-500 dark:placeholder:text-slate-400";
  const labelClass = "text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-1.5 block ml-1";

  return (
    <div className="space-y-6">
      {!defaultOpenForm && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Clientes</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Gerenciamento de base de dados.</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditingCustomerId(null); setNewCustomer(initialFormState); }} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700 flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Novo Cliente
          </button>
        </div>
      )}

      {(showForm || defaultOpenForm) && (
        <div className={defaultOpenForm ? "" : "fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto"}>
          <form onSubmit={handleSubmit} className={`bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl p-8 space-y-6 animate-in zoom-in-95 relative ${defaultOpenForm ? 'w-full' : 'w-full max-w-[900px] border border-slate-200 dark:border-slate-800'}`}>
            {!defaultOpenForm && (
              <button type="button" onClick={() => { setShowForm(false); if (onCancel) onCancel(); }} className="absolute right-6 top-6 p-2 text-slate-300 hover:text-slate-600 dark:hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            )}

            <div className="flex justify-between items-center border-b dark:border-slate-800 pb-4">
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                <button type="button" onClick={() => setPersonType('PF')} className={`px-8 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${personType === 'PF' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400'}`}>PF</button>
                <button type="button" onClick={() => setPersonType('PJ')} className={`px-8 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${personType === 'PJ' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400'}`}>PJ</button>
              </div>
              {loadingApi && <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-[10px] font-bold"><RefreshCw className="w-3 h-3 animate-spin" /> CONSULTANDO API...</div>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>{personType === 'PF' ? 'CPF' : 'CNPJ (Auto-preenchimento)'}</label>
                <input type="text" placeholder={personType === 'PF' ? "000.000.000-00" : "00.000.000/0000-00"} className={`${inputClass} ${(editingCustomerId && !isAdmin) ? 'opacity-70 grayscale-[0.5]' : ''}`} value={newCustomer.document}
                  disabled={editingCustomerId && !isAdmin}
                  onChange={e => {
                    let val = e.target.value;
                    // Remove tudo que não é dígito
                    val = val.replace(/\D/g, '');

                    if (personType === 'PF') {
                      // Máscara CPF
                      if (val.length > 11) val = val.slice(0, 11);
                      val = val.replace(/(\d{3})(\d)/, '$1.$2');
                      val = val.replace(/(\d{3})(\d)/, '$1.$2');
                      val = val.replace(/(\d{3})(\d{1,2})/, '$1-$2');

                      // Check Real-time CPF (11 digits)
                      if (val.replace(/\D/g, '').length === 11) {
                        const dup = checkDuplicateCustomer(val, customers, editingCustomerId);
                        if (dup) {
                          notify(`CPF já cadastrado: ${dup.name}`, "error");
                          val = ''; // Clear immediately
                        }
                      }
                    } else {
                      // Máscara CNPJ
                      if (val.length > 14) val = val.slice(0, 14);
                      val = val.replace(/^(\d{2})(\d)/, '$1.$2');
                      val = val.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                      val = val.replace(/\.(\d{3})(\d)/, '.$1/$2');
                      val = val.replace(/(\d{4})(\d)/, '$1-$2');

                      // Check Real-time CNPJ (14 digits)
                      if (val.replace(/\D/g, '').length === 14) {
                        const dup = checkDuplicateCustomer(val, customers, editingCustomerId);
                        if (dup) {
                          notify(`CNPJ já cadastrado: ${dup.name}`, "error");
                          val = ''; // Clear immediately
                        } else {
                          // Only lookup if NOT duplicate
                          lookupCNPJ(val);
                        }
                      }
                    }

                    setNewCustomer({ ...newCustomer, document: val });
                  }} required />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Nome / Razão Social</label>
                <input type="text" className={`${inputClass} ${(editingCustomerId && !isAdmin) ? 'opacity-70' : ''}`} value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} disabled={editingCustomerId && !isAdmin} required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-3">
                <label className={labelClass}>CEP (Auto-preenchimento)</label>
                <input type="text" placeholder="00000-000" className={`${inputClass} ${(editingCustomerId && !isAdmin) ? 'opacity-70' : ''}`} value={newCustomer.cep}
                  disabled={editingCustomerId && !isAdmin}
                  onChange={e => {
                    const val = e.target.value;
                    setNewCustomer({ ...newCustomer, cep: val });
                    if (val.replace(/\D/g, '').length === 8) lookupCEP(val);
                  }} />
              </div>
              <div className="md:col-span-6">
                <label className={labelClass}>Rua / Logradouro</label>
                <input type="text" className={`${inputClass} ${(editingCustomerId && !isAdmin) ? 'opacity-70' : ''}`} value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })} disabled={editingCustomerId && !isAdmin} />
              </div>
              <div className="md:col-span-3">
                <label className={labelClass}>Número</label>
                <input type="text" className={`${inputClass} ${(editingCustomerId && !isAdmin) ? 'opacity-70' : ''}`} value={newCustomer.number} onChange={e => setNewCustomer({ ...newCustomer, number: e.target.value })} disabled={editingCustomerId && !isAdmin} />
              </div>
              <div className="md:col-span-4">
                <label className={labelClass}>Bairro</label>
                <input type="text" className={`${inputClass} ${(editingCustomerId && !isAdmin) ? 'opacity-70' : ''}`} value={newCustomer.neighborhood} onChange={e => setNewCustomer({ ...newCustomer, neighborhood: e.target.value })} disabled={editingCustomerId && !isAdmin} />
              </div>
              <div className="md:col-span-4">
                <label className={labelClass}>Cidade</label>
                <input type="text" className={`${inputClass} ${(editingCustomerId && !isAdmin) ? 'opacity-70' : ''}`} value={newCustomer.city} onChange={e => setNewCustomer({ ...newCustomer, city: e.target.value })} disabled={editingCustomerId && !isAdmin} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>UF</label>
                <input type="text" maxLength={2} className={`${inputClass} text-center uppercase ${(editingCustomerId && !isAdmin) ? 'opacity-70' : ''}`} value={newCustomer.state} onChange={e => setNewCustomer({ ...newCustomer, state: e.target.value })} disabled={editingCustomerId && !isAdmin} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Comp.</label>
                <input type="text" className={`${inputClass} ${(editingCustomerId && !isAdmin) ? 'opacity-70' : ''}`} value={newCustomer.complement} onChange={e => setNewCustomer({ ...newCustomer, complement: e.target.value })} disabled={editingCustomerId && !isAdmin} />
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

            {personType === 'PJ' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Contato</label>
                  <input type="text" placeholder="Nome do responsável" className={inputClass} value={newCustomer.contact || ''} onChange={e => setNewCustomer({ ...newCustomer, contact: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Inscrição Estadual</label>
                  <input type="text" placeholder="000.000.000.000" className={inputClass} value={newCustomer.stateRegistration || ''} onChange={e => setNewCustomer({ ...newCustomer, stateRegistration: e.target.value })} />
                </div>
              </div>
            )}


            <div className="flex justify-between items-center pt-4">
              <div className="flex-1">
                {(editingCustomerId && !isAdmin) && (
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-4 py-2 rounded-lg border border-rose-100 w-fit">
                    Modo Visualização: Apenas administradores podem alterar
                  </p>
                )}
              </div>
              {(isAdmin || !editingCustomerId) ? (
                <button type="submit" className="bg-blue-600 text-white px-12 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all">
                  {editingCustomerId ? 'Salvar Alterações' : 'Salvar Cliente'}
                </button>
              ) : (
                <button type="button" onClick={() => { setShowForm(false); if (onCancel) onCancel(); }} className="bg-slate-200 text-slate-500 px-12 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-300 transition-all">
                  Fechar Visualização
                </button>
              )}
            </div>
          </form>
        </div>
      )}
      {!defaultOpenForm && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden overflow-x-auto">
          <div className="p-8 border-b dark:border-slate-800 border-slate-100 flex items-center gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por nome, CPF ou CNPJ..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            {!isAdmin && (
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-100 dark:border-amber-800">
                Somente Leitura: Administrativo necessário para editar ou excluir
              </p>
            )}
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-10">Cliente</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Localização</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-10">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filtered.map(c => (
                <tr key={c.id} onClick={() => {
                  if (!isAdmin) {
                    notify("Somente administradores podem editar clientes salvos.", "warning");
                    return;
                  }
                  setEditingCustomerId(c.id);
                  setNewCustomer(c);
                  setPersonType(c.type);
                  setShowForm(true);
                }} className={`group transition-colors cursor-pointer ${isAdmin ? 'hover:bg-blue-50/60 dark:hover:bg-slate-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}>
                  <td className="px-8 py-6 pl-10">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-slate-900 dark:text-white uppercase mb-1">{c.name}</p>
                      {!isAdmin && <span className="text-[8px] font-black text-slate-400 border border-slate-200 px-1 rounded">BLOQUEADO</span>}
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-wide">{c.document}</p>
                  </td>
                  <td className="px-8 py-6 text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wide">
                    {c.city && c.state ? `${c.city} - ${c.state}` : <span className="text-slate-300 dark:text-slate-600 italic">Localização n/d</span>}
                  </td>
                  <td className="px-8 py-6 pr-10 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isAdmin && (
                      <button onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm("Deseja realmente excluir este cliente? Esta ação também removerá os dados da nuvem.")) {
                          setCustomers(p => p.filter(x => x.id !== c.id));
                          const result = await db.remove('serviflow_customers', c.id);
                          if (result?.success) notify("Cliente removido da nuvem.");
                          else notify("Removido localmente. Erro na nuvem.", "warning");
                        }
                      }} className="p-2 text-slate-400 hover:text-rose-500 transition-colors" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div >
      )}
    </div >
  );
};

export default CustomerManager;
