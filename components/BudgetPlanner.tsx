
import React, { useState } from 'react';
import { Target, Sparkles, Send, Loader2, DollarSign, Package, User, Users } from 'lucide-react';
import { generateBudgetFromDescription } from '../services/geminiService';
import { ServiceOrder, OrderStatus, ServiceItem, Customer } from '../types';

interface Props {
  setOrders: React.Dispatch<React.SetStateAction<ServiceOrder[]>>;
  customers: Customer[];
}

const BudgetPlanner: React.FC<Props> = ({ setOrders, customers }) => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedBudget, setGeneratedBudget] = useState<Partial<ServiceOrder> | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setLoading(true);
    try {
      const budget = await generateBudgetFromDescription(description);
      setGeneratedBudget(budget);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar orçamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const convertToOrder = () => {
    if (!generatedBudget) return;

    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) {
      alert("Por favor, selecione um cliente cadastrado.");
      return;
    }

    const newOrder: ServiceOrder = {
      id: `OS-IA-${Date.now().toString().slice(-4)}`,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      description: description,
      status: OrderStatus.PENDING,
      createdAt: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalAmount: generatedBudget.totalAmount || 0,
      items: (generatedBudget.items || []) as ServiceItem[]
    };

    setOrders(prev => [newOrder, ...prev]);
    alert("Ordem de Serviço criada com sucesso!");
    setGeneratedBudget(null);
    setDescription('');
    setSelectedCustomerId('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center space-y-2">
        <div className="bg-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
          <Target className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900">Planejador de Orçamentos IA</h2>
        <p className="text-slate-500">Descreva o serviço e o Gemini estimará os itens e valores para você.</p>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Qual serviço você deseja orçar?</label>
          <textarea
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 min-h-[120px] outline-none"
            placeholder="Ex: Manutenção preventiva em 3 aparelhos de ar-condicionado 12k BTUs, limpeza e troca de filtros."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !description}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-lg"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {loading ? "Analisando Serviço..." : "Gerar Orçamento Inteligente"}
        </button>
      </div>

      {generatedBudget && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12 animate-in slide-in-from-top-8 duration-700">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h4 className="font-bold text-slate-800">Estimativa Gerada</h4>
              <div className="flex items-center gap-2 text-blue-600 font-bold">
                <DollarSign className="w-4 h-4" />
                <span>R$ {generatedBudget.totalAmount?.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {generatedBudget.items?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <Package className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.description}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">R$ {item.unitPrice}</p>
                    <p className="text-xs text-slate-500">Qtd: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl">
              <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Vincular Cliente
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Selecionar Cliente</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none"
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(e.target.value)}
                  >
                    <option value="">Escolha um cliente...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <button
                  onClick={convertToOrder}
                  className="w-full mt-4 bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  <Send className="w-4 h-4" />
                  Aprovar e Criar O.S.
                </button>
              </div>
            </div>

            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 text-amber-800">
              <h5 className="font-bold text-sm mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Dica da IA
              </h5>
              <p className="text-xs leading-relaxed">
                Os preços são baseados em médias de mercado. Você poderá editar os itens individualmente na tela de Ordens de Serviço após a aprovação.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetPlanner;
