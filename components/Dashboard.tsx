
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, FileText, Target } from 'lucide-react';
import { ServiceOrder, Transaction, OrderStatus, UserAccount, CompanyProfile } from '../types';

interface DashboardProps {
  stats: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    pendingOrders: number;
  };
  orders: ServiceOrder[];
  transactions: Transaction[];
  currentUser: UserAccount;
  company: CompanyProfile;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

const Dashboard: React.FC<DashboardProps> = ({ stats, orders, transactions, currentUser, company }) => {
  const isAdmin = currentUser.role === 'admin';
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const chartData = safeTransactions.slice(-7).map(t => ({
    name: t.date,
    amount: t.type === 'RECEITA' ? t.amount : -t.amount
  }));

  const orderStatusData = [
    { name: 'Orçamentos', value: safeOrders.filter(o => o.status === OrderStatus.PENDING).length },
    { name: 'Serviços Ativos', value: safeOrders.filter(o => o.status === OrderStatus.IN_PROGRESS).length },
    { name: 'Finalizados', value: safeOrders.filter(o => o.status === OrderStatus.COMPLETED).length },
  ].filter(v => v.value > 0);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Olá, {company.name}!</h2>
        <p className="text-slate-500 font-medium text-lg mt-2">Veja como está a saúde do seu negócio hoje.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Receita Total', value: stats.totalRevenue, icon: DollarSign, color: 'blue', sub: 'Total acumulado', show: true },
          { label: 'Lucro Líquido', value: stats.netProfit, icon: TrendingUp, color: 'emerald', sub: 'Saldo em caixa', show: isAdmin },
          { label: 'Serviços Ativos', value: stats.pendingOrders, icon: FileText, color: 'amber', sub: 'Em execução', show: true },
          { label: 'Eficiência', value: '92%', icon: Target, color: 'indigo', sub: 'Taxa de conclusão', show: true },
        ].filter(s => s.show).map((stat, i) => (
          <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all duration-300 group">
            <div className="flex items-center justify-between mb-8">
              <div className={`p-4 bg-${stat.color}-50 text-${stat.color}-600 rounded-2xl group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-8 h-8" />
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
            </div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
              {typeof stat.value === 'number' ? `R$ ${stat.value.toLocaleString()}` : stat.value}
            </h3>
            <p className="text-xs mt-3 text-slate-400 font-bold uppercase tracking-wider">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-200/50">
          <h4 className="font-black text-slate-900 text-xl mb-10 tracking-tight flex items-center gap-3">
            Fluxo de Caixa Recente
          </h4>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} dx={-10} />
                <Tooltip
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={5} fill="url(#colorAmount)" animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-10">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-200/50">
            <h4 className="font-black text-slate-900 text-xl mb-8 tracking-tight">Status Geral</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={orderStatusData} innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                    {orderStatusData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '15px', border: 'none', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 space-y-4">
              {orderStatusData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    <span className="text-slate-600 font-black uppercase text-[10px] tracking-widest">{d.name}</span>
                  </div>
                  <span className="font-black text-slate-900">{d.value}</span>
                </div>
              ))}
              {orderStatusData.length === 0 && <p className="text-center text-slate-400 italic py-4">Sem dados para exibir.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
