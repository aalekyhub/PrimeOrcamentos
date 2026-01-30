
import React, { useMemo } from 'react';
import Skeleton from './ui/Skeleton';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, FileText, Target, Users, Briefcase, Package } from 'lucide-react';
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
  onNavigate: (tab: string) => void;
  isLoading?: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

const Dashboard: React.FC<DashboardProps> = ({ stats, orders, transactions, currentUser, company, onNavigate, isLoading = false }) => {
  const isAdmin = currentUser.role === 'admin';
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const chartData = useMemo(() => {
    const dailyData: { [key: string]: number } = {};
    safeTransactions.forEach(t => {
      dailyData[t.date] = (dailyData[t.date] || 0) + (t.type === 'RECEITA' ? t.amount : -t.amount);
    });
    return Object.entries(dailyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7)
      .map(([date, amount]) => ({
        name: date.split('-').reverse().slice(0, 2).join('/'), // DD/MM
        fullName: date,
        amount
      }));
  }, [safeTransactions]);

  const orderStatusData = [
    { name: 'Orçamentos', value: safeOrders.filter(o => o.status === OrderStatus.PENDING).length },
    { name: 'Serviços Ativos', value: safeOrders.filter(o => o.status === OrderStatus.IN_PROGRESS).length },
    { name: 'Finalizados', value: safeOrders.filter(o => o.status === OrderStatus.COMPLETED).length },
  ].filter(v => v.value > 0);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tighter">Painel de Controle</h2>
        <p className="text-slate-400 dark:text-slate-500 font-normal text-lg mt-2 font-mono">Bom dia, {company.name}! Aqui está o resumo do seu negócio hoje.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'CADASTRO DE', title: 'Clientes', icon: Users, color: 'blue', target: 'customers' },
          { label: 'CADASTRO DE', title: 'Serviços', icon: Briefcase, color: 'emerald', target: 'catalog' },
          { label: 'ÁREA DE', title: 'Orçamento', icon: Package, color: 'amber', target: 'budgets' },
        ].map((item, i) => (
          <div
            key={i}
            onClick={() => onNavigate(item.target)}
            className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/40 dark:shadow-black/20 hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] active:scale-[0.98] flex items-center gap-6 group"
          >
            <div className={`w-16 h-16 bg-${item.color}-50 dark:bg-${item.color}-900/20 text-${item.color}-600 dark:text-${item.color}-400 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
              <item.icon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{item.label}</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{item.title}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Receita (Total)', value: stats.totalRevenue, icon: DollarSign, color: 'blue', sub: 'Total acumulado', show: true, isCurrency: true, target: 'financials' },
          { label: 'Lucro Líquido', value: stats.netProfit, icon: TrendingUp, color: 'orange', sub: 'Saldo em caixa', show: isAdmin, isCurrency: true, target: 'financials' },
          { label: 'Serviços Ativos', value: stats.pendingOrders, icon: FileText, color: 'blue', sub: 'Em execução', show: true, isCurrency: false, target: 'orders' },
          { label: 'Eficiência', value: '92%', icon: Target, color: 'indigo', sub: 'Taxa de conclusão', show: true, isCurrency: false, target: null },
        ].filter(s => s.show).map((stat, i) => (
          <div
            key={i}
            onClick={() => stat.target && onNavigate(stat.target)}
            className={`p-10 rounded-[2.5rem] border shadow-xl transition-all duration-300 group ${stat.target ? 'cursor-pointer hover:scale-105 active:scale-95' : ''} ${isLoading ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-slate-200/40 dark:shadow-black/20 hover:shadow-2xl'}`}
          >
            {isLoading ? (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <Skeleton width={64} height={64} className="rounded-2xl" />
                  <Skeleton width={100} height={16} />
                </div>
                <Skeleton width="80%" height={32} />
                <Skeleton width="60%" height={14} />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-8">
                  <div className={`p-4 bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400 rounded-2xl group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-8 h-8" />
                  </div>
                  <span className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tighter">
                  {stat.isCurrency && typeof stat.value === 'number' ? `R$ ${stat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : stat.value}
                </h3>
                <p className="text-sm mt-3 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{stat.sub}</p>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-black/20">
          <h4 className="font-semibold text-slate-900 dark:text-white text-xl mb-10 tracking-tight flex items-center gap-3">
            Fluxo de Caixa Recente
          </h4>
          <div className="h-[400px]">
            {isLoading ? (
              <Skeleton width="100%" height="100%" className="rounded-3xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isAdmin ? "#f1f5f9" : "transparent"} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} dx={-10} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '20px',
                      border: 'none',
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                      fontWeight: 'bold',
                      backgroundColor: '#1f2937',
                      color: '#f9fafb'
                    }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={5} fill="url(#colorAmount)" animationDuration={1500} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-10">
          <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-black/20">
            <h4 className="font-semibold text-slate-900 dark:text-white text-xl mb-8 tracking-tight">Status Geral</h4>
            <div className="h-64">
              {isLoading ? (
                <Skeleton circle width={200} height={200} className="mx-auto" />
              ) : (
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
              )}
            </div>
            <div className="mt-8 space-y-4">
              {isLoading ? (
                [1, 2, 3].map(i => <Skeleton key={i} width="100%" height={56} className="rounded-2xl" />)
              ) : (
                orderStatusData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                      <span className="text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-widest">{d.name}</span>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">{d.value}</span>
                  </div>
                ))
              )}
              {!isLoading && orderStatusData.length === 0 && <p className="text-center text-slate-400 italic py-4">Sem dados para exibir.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
