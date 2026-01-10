
import React, { useState, useMemo } from 'react';
import { Search, Calendar, User, FileText, ChevronRight, Trash2 } from 'lucide-react';
import { ServiceOrder, OrderStatus, Customer, CompanyProfile, CatalogService } from '../types';
import { useNotify } from './ToastProvider';
import { db } from '../services/db';

interface Props {
  orders: ServiceOrder[];
  setOrders: React.Dispatch<React.SetStateAction<ServiceOrder[]>>;
  customers: Customer[];
  company: CompanyProfile;
  catalogServices: CatalogService[];
  setCatalogServices: React.Dispatch<React.SetStateAction<CatalogService[]>>;
}

const BudgetSearch: React.FC<Props> = ({ orders, setOrders, customers, company, catalogServices, setCatalogServices }) => {
  const [searchBy, setSearchBy] = useState<'client' | 'date'>('client');
  const [clientTerm, setClientTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { notify } = useNotify();

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Filtra apenas orçamentos (status Pendente)
      const isBudget = o.status === OrderStatus.PENDING;
      if (!isBudget) return false;

      if (searchBy === 'client') {
        if (!clientTerm) return true; // Mostra todos se o campo estiver vazio
        return o.customerName.toLowerCase().includes(clientTerm.toLowerCase());
      } else {
        const matchesStart = !startDate || o.createdAt >= startDate;
        const matchesEnd = !endDate || o.createdAt <= endDate;
        return matchesStart && matchesEnd;
      }
    });
  }, [orders, searchBy, clientTerm, startDate, endDate]);

  const handleDelete = async (id: string) => {
    if (confirm("Deseja realmente excluir este orçamento definitivamente? Esta ação também removerá os dados da nuvem.")) {
      setOrders(prev => prev.filter(o => o.id !== id));
      const result = await db.remove('orders', id);
      if (result?.success) {
        notify("Orçamento removido da nuvem com sucesso.");
      } else {
        notify("Removido localmente, mas houve um erro ao sincronizar com a nuvem.", "error");
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Consultar</h2>
        <p className="text-slate-500 text-sm">Localize rapidamente propostas por cliente ou período.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Opção 1: Busca por Cliente */}
        <div
          className={`p-8 rounded-3xl border-2 transition-all cursor-pointer ${searchBy === 'client' ? 'border-blue-600 bg-white shadow-xl shadow-blue-50' : 'border-slate-200 bg-slate-50 opacity-60'}`}
          onClick={() => setSearchBy('client')}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className={`p-3 rounded-2xl ${searchBy === 'client' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Busca por Cliente</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Filtrar orçamentos de um cliente específico</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Digite o nome do cliente..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              value={clientTerm}
              onChange={e => setClientTerm(e.target.value)}
              disabled={searchBy !== 'client'}
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>

        {/* Opção 2: Busca por Período */}
        <div
          className={`p-8 rounded-3xl border-2 transition-all cursor-pointer ${searchBy === 'date' ? 'border-blue-600 bg-white shadow-xl shadow-blue-50' : 'border-slate-200 bg-slate-50 opacity-60'}`}
          onClick={() => setSearchBy('date')}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className={`p-3 rounded-2xl ${searchBy === 'date' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Busca por Período</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Consultar orçamentos por data ou intervalo</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">De:</label>
              <input
                type="date"
                className="w-full p-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                disabled={searchBy !== 'date'}
                onClick={e => e.stopPropagation()}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Até:</label>
              <input
                type="date"
                className="w-full p-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                disabled={searchBy !== 'date'}
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h4 className="font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Resultados Encontrados ({filteredOrders.length})
          </h4>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredOrders.map(order => (
            <div key={order.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center font-bold text-blue-600 shadow-sm">
                  {order.id.split('-')[1] || order.id}
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 leading-tight">{order.customerName}</h5>
                  <p className="text-xs text-slate-400 font-medium mt-1">{order.description} • Emissão: {order.createdAt}</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">R$ {order.totalAmount.toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Orçamento Pendente</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleDelete(order.id)}
                    className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    title="Excluir Orçamento"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-blue-600 font-bold">Gerencie na aba Orçamentos</p>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredOrders.length === 0 && (
            <div className="p-20 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                <Search className="w-8 h-8 text-slate-200" />
              </div>
              <p className="text-slate-400 font-medium">Nenhum orçamento encontrado com esses critérios.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BudgetSearch;
