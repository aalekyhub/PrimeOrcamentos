
import React, { useState, useMemo } from 'react';
import { Plus, MoreVertical, Filter, User, Calendar, CheckCircle, X, Trash2, Package, Search, DollarSign } from 'lucide-react';
import { ServiceOrder, OrderStatus, Transaction, Customer, ServiceItem, CatalogService } from '../../types';

interface Props {
  orders: ServiceOrder[];
  setOrders: React.Dispatch<React.SetStateAction<ServiceOrder[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  customers: Customer[];
  catalogServices: CatalogService[];
}

const ServiceOrderList: React.FC<Props> = ({ orders, setOrders, setTransactions, customers, catalogServices }) => {
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [showForm, setShowForm] = useState(false);

  // Estados para o formulário de Nova OS
  const [newOrder, setNewOrder] = useState<Partial<ServiceOrder>>({
    status: OrderStatus.PENDING,
    items: [],
    createdAt: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemPrice, setItemPrice] = useState<number>(0);
  const [itemQty, setItemQty] = useState<number>(1);

  const filteredOrders = filterStatus === 'Todos'
    ? orders
    : orders.filter(o => o.status === filterStatus);

  const totalAmount = useMemo(() => {
    return (newOrder.items || []).reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  }, [newOrder.items]);

  const handleAddItem = (type: 'Serviço' | 'Material') => {
    if (!itemDescription || itemPrice <= 0) return;
    const newItem: ServiceItem = {
      id: Math.random().toString(36).substr(2, 5),
      description: itemDescription,
      unitPrice: itemPrice,
      quantity: itemQty,
      type
    };
    setNewOrder(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
    setItemDescription('');
    setItemPrice(0);
    setItemQty(1);
  };

  const handleSelectFromCatalog = (service: CatalogService) => {
    setItemDescription(service.name);
    setItemPrice(service.basePrice);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer || (newOrder.items || []).length === 0) {
      alert("Selecione um cliente e adicione pelo menos um item.");
      return;
    }

    const order: ServiceOrder = {
      id: `OS-${Date.now().toString().slice(-4)}`,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      description: newOrder.description || 'Novo Orçamento',
      status: newOrder.status as OrderStatus,
      items: newOrder.items as ServiceItem[],
      createdAt: newOrder.createdAt || '',
      dueDate: newOrder.dueDate || '',
      totalAmount: totalAmount
    };

    setOrders(prev => [order, ...prev]);
    setShowForm(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este registro permanentemente?")) {
      setOrders(prev => prev.filter(o => o.id !== id));
    }
  };

  const resetForm = () => {
    setNewOrder({
      status: OrderStatus.PENDING,
      items: [],
      createdAt: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setSelectedCustomerId('');
  };

  const updateStatus = (id: string, newStatus: OrderStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id === id) {
        if (newStatus === OrderStatus.PAID && o.status !== OrderStatus.PAID) {
          const newTransaction: Transaction = {
            id: `T-${Math.random().toString(36).substr(2, 9)}`,
            date: new Date().toISOString().split('T')[0],
            amount: o.totalAmount,
            type: 'RECEITA',
            category: 'Pagamento de O.S.',
            description: `Recebimento da Ordem ${o.id}`,
            relatedOrderId: o.id
          };
          setTransactions(prevT => [...prevT, newTransaction]);
        }
        return { ...o, status: newStatus };
      }
      return o;
    }));
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.COMPLETED: return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case OrderStatus.PAID: return 'bg-blue-50 text-blue-700 border-blue-100';
      case OrderStatus.IN_PROGRESS: return 'bg-amber-50 text-amber-700 border-amber-100';
      case OrderStatus.CANCELLED: return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Orçamentos e O.S.</h2>
          <p className="text-slate-500 text-sm">Gerencie propostas e acompanhe o progresso dos serviços.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative group">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-10 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Todos</option>
              {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <Filter className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
          >
            <Plus className="w-4 h-4" />
            Novo Orçamento
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <h3 className="text-xl font-bold text-slate-900">Criar Novo Orçamento / O.S.</h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna Esquerda: Dados Gerais */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <User className="w-4 h-4" /> Selecionar Cliente
                    </h4>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedCustomerId}
                      onChange={e => setSelectedCustomerId(e.target.value)}
                    >
                      <option value="">Escolha um cliente cadastrado...</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.document})</option>)}
                    </select>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Data de Emissão</label>
                        <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm" value={newOrder.createdAt} onChange={e => setNewOrder({ ...newOrder, createdAt: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Vencimento / Entrega</label>
                        <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm" value={newOrder.dueDate} onChange={e => setNewOrder({ ...newOrder, dueDate: e.target.value })} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Descrição do Problema / Serviço</label>
                      <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm h-24 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Cliente relata barulho estranho no motor..." value={newOrder.description} onChange={e => setNewOrder({ ...newOrder, description: e.target.value })} />
                    </div>
                  </div>

                  {/* Itens do Orçamento */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Package className="w-4 h-4" /> Itens e Peças
                    </h4>

                    <div className="flex flex-wrap gap-4 items-end bg-slate-50 p-4 rounded-2xl">
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Descrição</label>
                        <input type="text" className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm outline-none" value={itemDescription} onChange={e => setItemDescription(e.target.value)} placeholder="Nome do item ou serviço..." />
                      </div>
                      <div className="w-24">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Qtd</label>
                        <input type="number" className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm outline-none text-center" value={itemQty} onChange={e => setItemQty(Number(e.target.value))} />
                      </div>
                      <div className="w-32">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Unitário (R$)</label>
                        <input type="number" className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm outline-none" value={itemPrice} onChange={e => setItemPrice(Number(e.target.value))} />
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleAddItem('Serviço')} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700">Add Serviço</button>
                        <button type="button" onClick={() => handleAddItem('Material')} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-700">Add Peça</button>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {(newOrder.items || []).map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-3 group">
                          <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full ${item.type === 'Serviço' ? 'bg-indigo-500' : 'bg-blue-500'}`}></span>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{item.description}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{item.type} • {item.quantity}x R$ {item.unitPrice.toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-sm font-bold text-slate-900">R$ {(item.unitPrice * item.quantity).toLocaleString()}</p>
                            <button onClick={() => setNewOrder(prev => ({ ...prev, items: (prev.items || []).filter(i => i.id !== item.id) }))} className="p-1 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {(newOrder.items || []).length === 0 && (
                        <p className="py-8 text-center text-slate-400 text-sm italic">Nenhum item adicionado ao orçamento.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Coluna Direita: Catálogo Rápido e Resumo */}
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Search className="w-3.5 h-3.5" /> Catálogo Rápido
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {catalogServices.map(service => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => handleSelectFromCatalog(service)}
                          className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all group"
                        >
                          <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{service.name}</p>
                          <p className="text-[10px] text-slate-400">R$ {service.basePrice.toLocaleString()}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-6">
                    <h4 className="text-xs font-bold opacity-50 uppercase tracking-widest">Resumo Financeiro</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm opacity-70">
                        <span>Total de Itens:</span>
                        <span>{(newOrder.items || []).length}</span>
                      </div>
                      <div className="flex justify-between text-xl font-bold pt-2 border-t border-white/10">
                        <span>Total Geral</span>
                        <span className="text-blue-400">R$ {totalAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold opacity-50 mb-2 uppercase">Status Inicial</label>
                      <select
                        className="w-full bg-white/10 border border-white/10 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                        value={newOrder.status}
                        onChange={e => setNewOrder({ ...newOrder, status: e.target.value as OrderStatus })}
                      >
                        <option value={OrderStatus.PENDING} className="text-slate-900">Pendente (Orçamento)</option>
                        <option value={OrderStatus.IN_PROGRESS} className="text-slate-900">Em Execução</option>
                      </select>
                    </div>

                    <button
                      onClick={handleCreateOrder}
                      className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2"
                    >
                      Gerar Documento
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold text-blue-600">{order.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        {order.customerName.charAt(0)}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{order.customerName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600 max-w-xs truncate">{order.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {order.dueDate}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-sm text-slate-900">
                    R$ {order.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {order.status !== OrderStatus.PAID && (
                        <button onClick={() => updateStatus(order.id, OrderStatus.PAID)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Marcar como Pago">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(order.id)}
                        className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="Excluir"
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

export default ServiceOrderList;
