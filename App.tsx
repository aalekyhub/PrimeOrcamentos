
import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutDashboard, FileText, Wallet, Target, Search, Menu,
  Users, Briefcase, ClipboardList, Zap, Settings, Building2, Lock, LogOut, RefreshCw, Cloud, CloudOff, Database
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import BudgetManager from './components/BudgetManager';
import ServiceOrderManager from './components/ServiceOrderManager';
import FinancialControl from './components/FinancialControl';
import CustomerManager from './components/CustomerManager';
import ServiceCatalog from './components/ServiceCatalog';
import CompanySettings from './components/CompanySettings';
import BudgetSearch from './components/BudgetSearch';
import UserManager from './components/UserManager';
import Login from './components/Login';
import DataCleanup from './components/DataCleanup';
import { ToastProvider, useNotify } from './components/ToastProvider';
import { ServiceOrder, Transaction, OrderStatus, Customer, CatalogService, CompanyProfile, UserAccount } from './types';
import { db } from './services/db';

const STORAGE_KEYS = {
  CUSTOMERS: 'serviflow_customers',
  CATALOG: 'serviflow_catalog',
  COMPANY: 'serviflow_company',
  ORDERS: 'serviflow_orders',
  TRANSACTIONS: 'serviflow_transactions',
  USERS: 'serviflow_users',
  SESSION: 'serviflow_session'
};

const INITIAL_USERS: UserAccount[] = [
  {
    id: 'USR-001',
    name: 'Admin Master',
    email: 'admin@primeservicos.com',
    password: 'admin',
    role: 'admin',
    permissions: ['dashboard', 'customers', 'catalog', 'budgets', 'search', 'orders', 'financials', 'users', 'settings'],
    createdAt: '2024-01-01'
  }
];

const INITIAL_COMPANY: CompanyProfile = {
  name: 'PRIME SERVIÇOS E MANUTENÇÃO LTDA',
  tagline: 'SOLUÇÕES EM GESTÃO E MANUTENÇÃO PROFISSIONAL',
  cnpj: '12.345.678/0001-90',
  email: 'contato@primeservicos.com.br',
  phone: '(11) 99999-9999',
  address: 'RUA DAS INDUSTRIAS, 500, SÃO PAULO - SP',
  nameFontSize: 24,
  logoSize: 80,
  customUnits: [{ label: 'Unidade', value: 'un' }]
};

// DADOS DE TESTE
const SAMPLE_CUSTOMER: Customer = {
  id: 'CLI-TESTE',
  type: 'PF',
  name: 'João da Silva (Exemplo)',
  email: 'joao.exemplo@email.com',
  phone: '(11) 98888-7777',
  whatsapp: '(11) 98888-7777',
  document: '123.456.789-00',
  cep: '01001-000',
  address: 'Praça da Sé',
  number: '100',
  complement: 'Apto 12',
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  createdAt: new Date().toISOString().split('T')[0]
};

const SAMPLE_SERVICE: CatalogService = {
  id: 'SRV-TESTE',
  name: 'Manutenção de Ar-Condicionado',
  description: 'Limpeza, higienização e carga de gás em unidades split.',
  basePrice: 350,
  unit: 'un',
  category: 'Climatização'
};

const SAMPLE_ORDER: ServiceOrder = {
  id: 'ORC-1001',
  customerId: 'CLI-TESTE',
  customerName: 'João da Silva (Exemplo)',
  customerEmail: 'joao.exemplo@email.com',
  description: 'Manutenção Preventiva em 2 aparelhos',
  status: OrderStatus.PENDING,
  items: [
    {
      id: 'item-1',
      description: 'Manutenção de Ar-Condicionado',
      quantity: 2,
      unitPrice: 350,
      unit: 'un',
      type: 'Serviço'
    }
  ],
  totalAmount: 700,
  createdAt: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  paymentTerms: '50% entrada, saldo na conclusão',
  deliveryTime: '2 dias úteis',
  descriptionBlocks: [
    { id: 'b1', type: 'text', content: 'Serviço de limpeza completa com bactericida.' }
  ]
};

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { notify } = useNotify();

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => db.load(STORAGE_KEYS.SESSION, null));
  const [users, setUsers] = useState<UserAccount[]>(() => db.load(STORAGE_KEYS.USERS, INITIAL_USERS));
  const [orders, setOrders] = useState<ServiceOrder[]>(() => db.load(STORAGE_KEYS.ORDERS, []));
  const [transactions, setTransactions] = useState<Transaction[]>(() => db.load(STORAGE_KEYS.TRANSACTIONS, []));
  const [customers, setCustomers] = useState<Customer[]>(() => db.load(STORAGE_KEYS.CUSTOMERS, []));
  const [catalog, setCatalog] = useState<CatalogService[]>(() => db.load(STORAGE_KEYS.CATALOG, []));
  const [company, setCompany] = useState<CompanyProfile>(() => db.load(STORAGE_KEYS.COMPANY, INITIAL_COMPANY));

  const handleManualSync = async () => {
    if (!db.isConnected()) {
      notify("Conexão com a nuvem não configurada no Vercel.", "error");
      return;
    }

    setIsSyncing(true);
    try {
      const cloudData = await db.syncFromCloud();
      if (cloudData) {
        // Deduplicação de Clientes por Documento
        if (cloudData.customers) {
          const customerMap = new Map();
          const duplicatesToRemove: string[] = [];

          cloudData.customers.forEach((c: Customer) => {
            const key = c.document.replace(/\D/g, '');
            if (customerMap.has(key)) {
              duplicatesToRemove.push(c.id);
            } else {
              customerMap.set(key, c);
            }
          });

          const uniqueCustomers = Array.from(customerMap.values()) as Customer[];
          setCustomers(uniqueCustomers);

          // Remove duplicatas da nuvem
          if (duplicatesToRemove.length > 0) {
            duplicatesToRemove.forEach(id => db.remove('customers', id));
          }
        }

        // Deduplicação de Catálogo por Nome
        if (cloudData.catalog) {
          const serviceMap = new Map();
          const duplicatesToRemove: string[] = [];

          cloudData.catalog.forEach((s: CatalogService) => {
            const key = s.name.trim().toLowerCase();
            if (serviceMap.has(key)) {
              duplicatesToRemove.push(s.id);
            } else {
              serviceMap.set(key, s);
            }
          });

          const uniqueServices = Array.from(serviceMap.values()) as CatalogService[];
          setCatalog(uniqueServices);

          // Remove duplicatas da nuvem para evitar que voltem
          if (duplicatesToRemove.length > 0) {
            duplicatesToRemove.forEach(id => db.remove('catalog', id));
          }
        }

        if (cloudData.orders) {
          setOrders(prev => {
            const localMap = new Map<string, ServiceOrder>(prev.map(o => [o.id, o]));
            (cloudData.orders as ServiceOrder[]).forEach((o: ServiceOrder) => {
              // PRIORIZA LOCAL: Se o ID já existir no computador, não sobrescritve com o da nuvem
              // Isso resolve o sumiço no F5 se a nuvem ainda tiver o dado antigo.
              if (!localMap.has(o.id)) {
                localMap.set(o.id, o);
              }
            });
            return Array.from(localMap.values()).sort((a, b) =>
              new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
          });
        }

        if (cloudData.transactions) {
          setTransactions(prev => {
            const localMap = new Map<string, Transaction>(prev.map(t => [t.id, t]));
            (cloudData.transactions as Transaction[]).forEach((t: Transaction) => {
              if (!localMap.has(t.id)) {
                localMap.set(t.id, t);
              }
            });
            return Array.from(localMap.values()).sort((a, b) =>
              new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
            );
          });
        }
        notify("Sincronização concluída (Dados mesclados)");
      } else {
        notify("Falha ao baixar dados da nuvem.", "error");
      }
    } catch (e) {
      notify("Erro de rede ao sincronizar.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (db.isConnected()) handleManualSync();
  }, []);

  useEffect(() => {
    db.save(STORAGE_KEYS.ORDERS, orders);
    db.save(STORAGE_KEYS.TRANSACTIONS, transactions);
    db.save(STORAGE_KEYS.CUSTOMERS, customers);
    db.save(STORAGE_KEYS.CATALOG, catalog);
    db.save(STORAGE_KEYS.COMPANY, company);
    db.save(STORAGE_KEYS.USERS, users);
    if (currentUser) db.save(STORAGE_KEYS.SESSION, currentUser);
  }, [orders, transactions, customers, catalog, company, users, currentUser]);

  const stats = useMemo(() => {
    const rev = transactions.filter(t => t.type === 'RECEITA').reduce((a, c) => a + c.amount, 0);
    const exp = transactions.filter(t => t.type === 'DESPESA').reduce((a, c) => a + c.amount, 0);
    const pend = orders.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.IN_PROGRESS).length;
    return { totalRevenue: rev, totalExpenses: exp, netProfit: rev - exp, pendingOrders: pend };
  }, [orders, transactions]);

  if (!currentUser) {
    return <Login users={users} onLogin={(u) => { setCurrentUser(u); db.save(STORAGE_KEYS.SESSION, u); }} company={company} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'catalog', label: 'Serviços', icon: Briefcase },
    { id: 'budgets', label: 'Orçamentos', icon: FileText },
    { id: 'orders', label: 'O.S.', icon: ClipboardList },
    { id: 'financials', label: 'Financeiro', icon: Wallet },
    { id: 'search', label: 'Consultar', icon: Search },
    { id: 'audit', label: 'Auditoria', icon: Database },
    { id: 'users', label: 'Usuários', icon: Lock },
    { id: 'settings', label: 'Empresa', icon: Settings },
  ].filter(item => currentUser.role === 'admin' || currentUser.permissions?.includes(item.id));

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden text-slate-900 font-sans">
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-72 bg-slate-900 text-white transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 shadow-2xl`}>
        <div className="p-8 h-full flex flex-col">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center overflow-hidden border border-slate-700">
              {company.logo ? (
                <img src={company.logo} className="w-full h-full object-contain p-1" alt="Logo" />
              ) : (
                <div className="bg-blue-600 w-full h-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tighter">Prime</h1>
          </div>

          <nav className="space-y-1.5 flex-1 overflow-y-auto no-scrollbar">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-slate-500'}`} />
                <span className="font-bold text-sm">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-800 space-y-4">
            <button
              onClick={() => confirm("Encerrar sessão?") && (setCurrentUser(null), localStorage.removeItem(STORAGE_KEYS.SESSION))}
              className="w-full flex items-center gap-4 px-5 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all font-bold text-xs"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 hover:bg-slate-100 rounded-xl" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6 text-slate-600" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">
                {navItems.find(n => n.id === activeTab)?.label || 'Painel'}
              </h2>

              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all hover:scale-105 active:scale-95 ${isSyncing ? 'bg-blue-50 border-blue-100' : db.isConnected() ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}
                title="Clique para sincronizar com a nuvem agora"
              >
                {isSyncing ? (
                  <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
                ) : db.isConnected() ? (
                  <Cloud className="w-3 h-3 text-emerald-500" />
                ) : (
                  <CloudOff className="w-3 h-3 text-slate-300" />
                )}
                <span className={`text-[8px] font-black uppercase tracking-tighter ${isSyncing ? 'text-blue-500' : db.isConnected() ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {isSyncing ? 'Sincronizando' : db.isConnected() ? 'Nuvem Ativa' : 'Apenas Local'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div className="hidden sm:block">
              <p className="text-sm font-black text-slate-900">{company.name}</p>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}</p>
            </div>
            <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
              {company.logo ? <img src={company.logo} className="w-full h-full object-cover" alt="Logo" /> : <Building2 className="w-5 h-5 text-slate-400" />}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 bg-slate-50 no-scrollbar">
          <div className="max-w-[1400px] mx-auto">
            {activeTab === 'dashboard' && <Dashboard stats={stats} orders={orders} transactions={transactions} currentUser={currentUser} company={company} />}
            {activeTab === 'customers' && <CustomerManager customers={customers} setCustomers={setCustomers} orders={orders} />}
            {activeTab === 'catalog' && <ServiceCatalog services={catalog} setServices={setCatalog} company={company} />}
            {activeTab === 'budgets' && <BudgetManager orders={orders} setOrders={setOrders} customers={customers} setCustomers={setCustomers} catalogServices={catalog} setCatalogServices={setCatalog} company={company} />}
            {activeTab === 'search' && <BudgetSearch orders={orders} setOrders={setOrders} customers={customers} company={company} catalogServices={catalog} setCatalogServices={setCatalog} />}
            {activeTab === 'orders' && <ServiceOrderManager orders={orders} setOrders={setOrders} setTransactions={setTransactions} customers={customers} setCustomers={setCustomers} catalogServices={catalog} setCatalogServices={setCatalog} company={company} />}
            {activeTab === 'financials' && <FinancialControl transactions={transactions} setTransactions={setTransactions} currentUser={currentUser} />}
            {activeTab === 'users' && <UserManager users={users} setUsers={setUsers} />}
            {activeTab === 'audit' && <DataCleanup
              customers={customers}
              setCustomers={setCustomers}
              services={catalog}
              setServices={setCatalog}
            />}
            {activeTab === 'settings' && <CompanySettings company={company} setCompany={setCompany} />}
          </div>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <ToastProvider>
    <AppContent />
  </ToastProvider>
);

export default App;
