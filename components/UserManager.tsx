
import React, { useState } from 'react';
import { UserPlus, Shield, Mail, Key, Trash2, ShieldCheck, X, User, Pencil, CheckCircle2 } from 'lucide-react';
import { UserAccount } from '../types';
import { db } from '../services/db';
import { useNotify } from './ToastProvider';

interface Props {
  users: UserAccount[];
  setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;
}

const MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'customers', label: 'Clientes' },
  { id: 'catalog', label: 'Catálogo de Serviços' },
  { id: 'budgets', label: 'Orçamentos' },
  { id: 'search', label: 'Consulta Rápida' },
  { id: 'orders', label: 'Ordens de Serviço' },
  { id: 'financials', label: 'Financeiro' },
  { id: 'users', label: 'Gestão de Usuários' },
  { id: 'settings', label: 'Configurações Empresa' },
];

const UserManager: React.FC<Props> = ({ users, setUsers }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const { notify } = useNotify();
  const [formData, setFormData] = useState<Partial<UserAccount>>({
    name: '',
    email: '',
    password: '',
    role: 'operador',
    permissions: ['dashboard', 'customers', 'budgets', 'search', 'orders']
  });

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'operador',
      permissions: ['dashboard', 'customers', 'budgets', 'search', 'orders']
    });
    setShowForm(true);
  };

  const handleOpenEdit = (user: UserAccount) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
      permissions: user.permissions || ['dashboard']
    });
    setShowForm(true);
  };

  const togglePermission = (moduleId: string) => {
    // Dashboard não pode ser desmarcado por segurança
    if (moduleId === 'dashboard') return;

    setFormData(prev => {
      const current = prev.permissions || ['dashboard'];
      if (current.includes(moduleId)) {
        return { ...prev, permissions: current.filter(id => id !== moduleId) };
      }
      return { ...prev, permissions: [...current, moduleId] };
    });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) return;

    // Garante que dashboard sempre esteja presente
    const finalPermissions = Array.from(new Set([...(formData.permissions || []), 'dashboard']));

    let newList: UserAccount[];
    if (editingUser) {
      newList = users.map(u => u.id === editingUser.id ? {
        ...u,
        name: formData.name!,
        email: formData.email!,
        password: formData.password!,
        role: formData.role as 'admin' | 'operador',
        permissions: finalPermissions
      } : u);
    } else {
      const newUser: UserAccount = {
        id: `USR-${Date.now().toString().slice(-4)}`,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role as 'admin' | 'operador',
        permissions: finalPermissions,
        createdAt: new Date().toISOString().split('T')[0]
      };
      newList = [...users, newUser];
    }

    setUsers(newList);
    setShowForm(false);
    setEditingUser(null);
    setFormData({ role: 'operador', permissions: ['dashboard'] });

    // Sincroniza e avisa
    const result = await db.save('serviflow_users', newList);
    if (result?.success) {
      notify(editingUser ? "Usuário atualizado e sincronizado!" : "Usuário criado e sincronizado!");
    } else {
      notify("Salvo localmente. Erro na nuvem.", "warning");
    }
  };

  const removeUser = async (id: string) => {
    if (id === 'USR-001') {
      notify("Não é possível remover o administrador mestre.", "error");
      return;
    }
    if (confirm("Deseja realmente remover o acesso deste usuário? Esta ação também removerá os dados da nuvem.")) {
      setUsers(prev => prev.filter(u => u.id !== id));
      const result = await db.remove('users', id);
      if (result?.success) notify("Usuário removido da nuvem.");
      else notify("Removido localmente. Erro na nuvem.", "warning");
    }
  };
  alert("Removido localmente, mas houve um erro ao sincronizar com a nuvem.");
}
    }
  };

return (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex justify-between items-center">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Usuários e Acessos</h2>
        <p className="text-slate-500 text-sm">Controle quem pode acessar o ServiFlow Pro e quais módulos.</p>
      </div>
      <button
        onClick={handleOpenCreate}
        className="bg-blue-600 text-white px-6 py-2 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
      >
        <UserPlus className="w-5 h-5" /> Adicionar Usuário
      </button>
    </div>

    {showForm && (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <form onSubmit={handleSaveUser} className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">
              {editingUser ? 'Editar Acesso' : 'Novo Acesso'}
            </h3>
            <button type="button" onClick={() => { setShowForm(false); setEditingUser(null); }} className="p-2 hover:bg-slate-100 rounded-full">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-1">Credenciais</h4>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-300" />
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">E-mail de Login</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-300" />
                  <input
                    type="email"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Senha de Acesso</label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 w-4 h-4 text-slate-300" />
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nível de Permissão</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                >
                  <option value="operador">Operador (Uso limitado)</option>
                  <option value="admin">Administrador (Root)</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-1">Módulos Disponíveis</h4>
              <div className="grid grid-cols-1 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 h-64 overflow-y-auto">
                {MODULES.map(module => (
                  <button
                    key={module.id}
                    type="button"
                    disabled={module.id === 'dashboard'}
                    onClick={() => togglePermission(module.id)}
                    className={`
                        flex items-center justify-between p-3 rounded-xl border text-left transition-all
                        ${formData.permissions?.includes(module.id)
                        ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-blue-200'}
                        ${module.id === 'dashboard' ? 'opacity-100' : ''}
                      `}
                  >
                    <span className="text-xs font-bold">{module.label}</span>
                    {formData.permissions?.includes(module.id) && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 italic">O usuário verá apenas as abas selecionadas no menu lateral.</p>
            </div>
          </div>

          <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            {editingUser ? 'Atualizar Permissões e Dados' : 'Criar Acesso Imediato'}
          </button>
        </form>
      </div>
    )}

    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <th className="px-6 py-4">Usuário / Função</th>
              <th className="px-6 py-4">Acessos</th>
              <th className="px-6 py-4">E-mail</th>
              <th className="px-6 py-4">Criação</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${user.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
                      {user.role === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{user.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user.role}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {user.permissions?.map(p => (
                      <span key={p} className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-black">
                        {MODULES.find(m => m.id === p)?.label || p}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-slate-600">{user.email}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-slate-400 font-medium">{user.createdAt}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenEdit(user)}
                      className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      title="Editar Usuário"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeUser(user.id)}
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      title="Remover Usuário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
};

export default UserManager;
