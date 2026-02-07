import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutDashboard, FileText, Wallet, Target, Search, Menu, X,
  Users, Briefcase, ClipboardList, Zap, Settings, Building2, Lock, LogOut, RefreshCw, Cloud, CloudOff, Database, HardHat
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import WorksManager from './components/WorksManager';
import PlanningManager from './components/PlanningManager';

// ... (existing imports)





import ServiceOrderManager from './components/ServiceOrderManager';
import WorkOrderManager from './components/WorkOrderManager';
import FinancialControl from './components/FinancialControl';
import CustomerManager from './components/CustomerManager';
import ServiceCatalog from './components/ServiceCatalog';
import CompanySettings from './components/CompanySettings';
import BudgetSearch from './components/BudgetSearch';
import UserManager from './components/UserManager';
import Login from './components/Login';
import DataCleanup from './components/DataCleanup';
import { ToastProvider, useNotify } from './components/ToastProvider';
import { ServiceOrder, Transaction, OrderStatus, Customer, CatalogService, CompanyProfile, UserAccount, Loan } from './types';
import { db } from './services/db';

const STORAGE_KEYS = {
  CUSTOMERS: 'serviflow_customers',
  CATALOG: 'serviflow_catalog',
  COMPANY: 'serviflow_company',
  ORDERS: 'serviflow_orders',
  TRANSACTIONS: 'serviflow_transactions',
  USERS: 'serviflow_users',
  LOANS: 'serviflow_loans',
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

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [openTabs, setOpenTabs] = useState<string[]>(['dashboard']);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [darkMode, setDarkMode] = useState(() => db.load('serviflow_dark_mode', false));
  const { notify } = useNotify();

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => db.load(STORAGE_KEYS.SESSION, null));
  const [users, setUsers] = useState<UserAccount[]>(() => db.load(STORAGE_KEYS.USERS, INITIAL_USERS));
  const [orders, setOrders] = useState<ServiceOrder[]>(() => db.load(STORAGE_KEYS.ORDERS, []));
  const [transactions, setTransactions] = useState<Transaction[]>(() => db.load(STORAGE_KEYS.TRANSACTIONS, []));
  const [customers, setCustomers] = useState<Customer[]>(() => db.load(STORAGE_KEYS.CUSTOMERS, []));
  const [catalog, setCatalog] = useState<CatalogService[]>(() => db.load(STORAGE_KEYS.CATALOG, []));
  const [company, setCompany] = useState<CompanyProfile>(() => db.load(STORAGE_KEYS.COMPANY, INITIAL_COMPANY));
  const [loans, setLoans] = useState<Loan[]>(() => db.load(STORAGE_KEYS.LOANS, []));

  const handleManualSync = async () => {
    if (!db.isConnected()) {
      notify("Conexão com a nuvem não configurada no Vercel.", "error");
      return;
    }

    setIsSyncing(true);
    try {
      const cloudData = await db.syncFromCloud();

      if (cloudData && cloudData.error) {
        notify(cloudData.error, "error");
        if (cloudData.error.includes('users')) {
          console.error("Erro crítico ao sincronizar users:", cloudData.error);
        }
        return;
      }

      if (cloudData) {
        if (cloudData.customers) {
          const customerMap = new Map();
          const duplicatesToRemove: string[] = [];
          cloudData.customers.forEach((c: Customer) => {
            const key = c.document.replace(/\D/g, '');
            if (customerMap.has(key)) { duplicatesToRemove.push(c.id); }
            else { customerMap.set(key, c); }
          });
          setCustomers(Array.from(customerMap.values()) as Customer[]);
          if (duplicatesToRemove.length > 0) { duplicatesToRemove.forEach(id => db.remove('customers', id)); }
        }

        if (cloudData.catalog) {
          const serviceMap = new Map();
          const duplicatesToRemove: string[] = [];
          cloudData.catalog.forEach((s: CatalogService) => {
            const key = s.name.trim().toLowerCase();
            if (serviceMap.has(key)) { duplicatesToRemove.push(s.id); }
            else { serviceMap.set(key, s); }
          });
          setCatalog(Array.from(serviceMap.values()) as CatalogService[]);
          if (duplicatesToRemove.length > 0) { duplicatesToRemove.forEach(id => db.remove('catalog', id)); }
        }

        if (cloudData.orders) {
          setOrders(prev => {
            const localMap = new Map<string, ServiceOrder>(prev.map(o => [o.id, o]));
            (cloudData.orders as ServiceOrder[]).forEach((o: ServiceOrder) => {
              localMap.set(o.id, o);
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
              localMap.set(t.id, t);
            });
            return Array.from(localMap.values()).sort((a, b) =>
              new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
            );
          });
        }

        if (cloudData.users) {
          setUsers(prev => {
            const localMap = new Map<string, UserAccount>(prev.map(u => [u.id, u]));
            (cloudData.users as UserAccount[]).forEach((u: UserAccount) => {
              localMap.set(u.id, u);
            });
            return Array.from(localMap.values());
          });
        }
        if (cloudData.loans) {
          setLoans(cloudData.loans as Loan[]);
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
    db.save(STORAGE_KEYS.LOANS, loans);
    db.save('serviflow_dark_mode', darkMode);
    if (currentUser) db.save(STORAGE_KEYS.SESSION, currentUser);
  }, [orders, transactions, customers, catalog, company, users, loans, currentUser, darkMode]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    const realizedTransactions = transactions.filter(t => t.date <= today);
    const projectedTransactions = transactions;

    const realizedRev = realizedTransactions.filter(t => t.type === 'RECEITA').reduce((a, c) => a + c.amount, 0);
    const realizedExp = realizedTransactions.filter(t => t.type === 'DESPESA').reduce((a, c) => a + c.amount, 0);

    const projectedRev = projectedTransactions.filter(t => t.type === 'RECEITA').reduce((a, c) => a + c.amount, 0);
    const projectedExp = projectedTransactions.filter(t => t.type === 'DESPESA').reduce((a, c) => a + c.amount, 0);

    const pend = orders.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.IN_PROGRESS).length;

    return {
      totalRevenue: realizedRev,
      totalExpenses: realizedExp,
      netProfit: realizedRev - realizedExp,
      projectedProfit: projectedRev - projectedExp,
      pendingOrders: pend
    };
  }, [orders, transactions]);

  if (!currentUser) {
    return <Login users={users} onLogin={(u) => { setCurrentUser(u); db.save(STORAGE_KEYS.SESSION, u); }} company={company} onSync={handleManualSync} isSyncing={isSyncing} isConnected={db.isConnected()} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Painel de Controle', icon: LayoutDashboard },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'catalog', label: 'Serviços', icon: Briefcase },
    { id: 'budgets', label: 'Orçamentos', icon: FileText },
    { id: 'orders', label: 'O.S. (Equip)', icon: ClipboardList },
    { id: 'works', label: 'O.S. Obra', icon: HardHat },
    { id: 'construction', label: 'Gestão de Obras', icon: Building2 },
    { id: 'planning', label: 'Planejamento', icon: HardHat },
    { id: 'financials', label: 'Financeiro', icon: Wallet },
    { id: 'search', label: 'Consultar', icon: Search },
    { id: 'audit', label: 'Auditoria', icon: Database },
    { id: 'users', label: 'Usuários', icon: Lock },
    { id: 'settings', label: 'Empresa', icon: Settings },
  ].filter(item => currentUser.role === 'admin' || currentUser.permissions?.includes(item.id));

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${darkMode ? 'dark bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-72 border-r transition-all duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 shadow-lg ${darkMode ? 'bg-slate-800 border-slate-700 shadow-black/20' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center overflow-hidden border border-slate-100">
              {company.logo ? (
                <img src={company.logo} className="w-full h-full object-contain p-1" alt="Logo" />
              ) : (
                <div className="bg-blue-600 w-full h-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            <h1 className={`text-2xl font-medium tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>Prime</h1>
          </div>

          <nav className="space-y-1.5 flex-1 overflow-y-auto no-scrollbar">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (!openTabs.includes(item.id)) {
                    setOpenTabs([...openTabs, item.id]);
                  }
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? (darkMode ? 'bg-blue-900/40 text-blue-400 font-bold' : 'bg-blue-50 text-blue-600 font-bold') : (darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-white font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium')}`}
              >
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? (darkMode ? 'text-blue-400' : 'text-blue-600') : (darkMode ? 'text-slate-500' : 'text-slate-500')}`} />
                <span className="text-[16px] leading-relaxed">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100 space-y-4">
            <button
              onClick={() => confirm("Encerrar sessão?") && (setCurrentUser(null), localStorage.removeItem(STORAGE_KEYS.SESSION))}
              className="w-full flex items-center gap-4 px-5 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all font-semibold text-xs"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className={`h-20 border-b flex items-center justify-between px-4 md:px-10 shrink-0 z-10 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 hover:bg-slate-100 rounded-xl" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6 text-slate-600" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-slate-400 text-[10px] uppercase tracking-[0.2em]">
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
                <span className={`text-[8px] font-semibold uppercase tracking-tighter ${isSyncing ? 'text-blue-500' : db.isConnected() ? 'text-emerald-600' : (darkMode ? 'text-slate-500' : 'text-slate-400')}`}>
                  {isSyncing ? 'Sincronizando' : db.isConnected() ? 'Nuvem Ativa' : 'Apenas Local'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-right">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2.5 rounded-xl border transition-all hover:scale-110 active:scale-90 ${darkMode ? 'bg-slate-700 border-slate-600 text-amber-400 hover:bg-slate-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-white hover:text-blue-600 hover:shadow-md'}`}
              title={darkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
            >
              {darkMode ? <Zap className="w-5 h-5 fill-current" /> : <Zap className="w-5 h-5" />}
            </button>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{company.name}</p>
              <p className="text-[10px] text-blue-600 font-medium uppercase tracking-widest">{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}</p>
            </div>
            <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
              {company.logo ? <img src={company.logo} className="w-full h-full object-cover" alt="Logo" /> : <Building2 className="w-5 h-5 text-slate-400" />}
            </div>
          </div>
        </header>

        {/* Multi-Tab Bar */}
        <div className={`border-b px-4 md:px-10 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 h-12 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          {openTabs.map(tabId => {
            const item = navItems.find(n => n.id === tabId);
            if (!item) return null;
            const IsActive = activeTab === tabId;
            return (
              <div
                key={tabId}
                className={`flex items-center h-full min-w-[120px] max-w-[200px] border-b-2 transition-all cursor-pointer group ${IsActive ? (darkMode ? 'border-blue-500 bg-blue-900/30' : 'border-blue-600 bg-blue-50/30') : (darkMode ? 'border-transparent hover:bg-slate-700/50' : 'border-transparent hover:bg-slate-50')}`}
                onClick={() => setActiveTab(tabId)}
              >
                <div className="flex items-center gap-2 px-4 w-full">
                  <item.icon className={`w-3.5 h-3.5 shrink-0 ${IsActive ? (darkMode ? 'text-blue-400' : 'text-blue-600') : (darkMode ? 'text-slate-500' : 'text-slate-400')}`} />
                  <span className={`text-[11px] font-bold truncate ${IsActive ? (darkMode ? 'text-blue-400' : 'text-blue-600') : (darkMode ? 'text-slate-500' : 'text-slate-500')}`}>
                    {item.label}
                  </span>
                  {tabId !== 'dashboard' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newTabs = openTabs.filter(t => t !== tabId);
                        setOpenTabs(newTabs);
                        if (activeTab === tabId) {
                          setActiveTab(newTabs[newTabs.length - 1] || 'dashboard');
                        }
                      }}
                      className="ml-auto p-1 hover:bg-slate-200 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-slate-400" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className={`flex-1 overflow-y-auto p-4 md:p-10 no-scrollbar relative transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <div className="max-w-[1400px] mx-auto h-full">
            {/* Persistent Tab Container */}
            {navItems.map(item => {
              const isMounted = openTabs.includes(item.id);
              if (!isMounted) return null;

              const isVisible = activeTab === item.id;

              return (
                <div key={item.id} className={isVisible ? 'block h-full' : 'hidden'}>
                  {item.id === 'dashboard' && <Dashboard stats={stats} orders={orders} transactions={transactions} currentUser={currentUser} company={company} isLoading={isSyncing} onNavigate={(target) => {
                    if (!openTabs.includes(target)) setOpenTabs([...openTabs, target]);
                    setActiveTab(target);
                  }} />}
                  {item.id === 'customers' && <CustomerManager customers={customers} setCustomers={setCustomers} orders={orders} />}
                  {item.id === 'catalog' && <ServiceCatalog services={catalog} setServices={setCatalog} company={company} />}
                  {item.id === 'budgets' && <BudgetManager orders={orders} setOrders={setOrders} customers={customers} setCustomers={setCustomers} catalogServices={catalog} setCatalogServices={setCatalog} company={company} />}
                  {item.id === 'orders' && <ServiceOrderManager orders={orders} setOrders={setOrders} customers={customers} setCustomers={setCustomers} catalogServices={catalog} setCatalogServices={setCatalog} company={company} />}
                  {item.id === 'works' && <WorkOrderManager orders={orders} setOrders={setOrders} customers={customers} setCustomers={setCustomers} catalogServices={catalog} setCatalogServices={setCatalog} company={company} transactions={transactions} setTransactions={setTransactions} />}
                  {item.id === 'construction' && <WorksManager customers={customers} />}
                  {item.id === 'planning' && <PlanningManager
                    customers={customers}
                    onGenerateBudget={(plan, services) => {
                      // 1. Find Customer
                      const customer = customers.find(c => c.id === plan.client_id);

                      // 2. Map Services to Budget Items
                      const budgetItems = services.map(svc => ({
                        id: db.generateId('ITEM'),
                        description: svc.description,
                        quantity: Number(svc.quantity) || 1,
                        unit: svc.unit || 'un',
                        unitPrice: (Number(svc.unit_material_cost) || 0) + (Number(svc.unit_labor_cost) || 0) + (Number(svc.unit_indirect_cost) || 0),
                        type: 'Serviço' as const
                      }));

                      const totalAmount = budgetItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

                      // 3. Create New Order (Draft as Pending)
                      const newBudget: ServiceOrder = {
                        id: db.generateId('ORC'),
                        customerId: plan.client_id,
                        customerName: customer ? customer.name : 'Cliente Não Identificado',
                        customerEmail: customer ? customer.email : '',
                        description: plan.name,
                        status: OrderStatus.PENDING,
                        items: budgetItems,
                        descriptionBlocks: [
                          { id: db.generateId('BLK'), type: 'text', content: `Orçamento referente ao planejamento: ${plan.name}` }
                        ],
                        createdAt: new Date().toISOString(),
                        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
                        totalAmount: totalAmount,
                        // osType Removed
                        originBudgetId: plan.id
                      };

                      // 4. Save and Navigate
                      const updatedOrders = [newBudget, ...orders];
                      setOrders(updatedOrders);
                      db.save(STORAGE_KEYS.ORDERS, updatedOrders);

                      notify("Orçamento gerado com sucesso! Redirecionando...", "success");
                      setActiveTab('budgets');
                    }}
                  />}
                  {item.id === 'search' && <BudgetSearch orders={orders} setOrders={setOrders} customers={customers} company={company} catalogServices={catalog} setCatalogServices={setCatalog} isLoading={isSyncing} />}
                  {item.id === 'financials' && <FinancialControl transactions={transactions} setTransactions={setTransactions} loans={loans} setLoans={setLoans} currentUser={currentUser} />}
                  {item.id === 'users' && <UserManager users={users} setUsers={setUsers} />}
                  {item.id === 'audit' && <DataCleanup customers={customers} setCustomers={setCustomers} services={catalog} setServices={setCatalog} />}
                  {item.id === 'settings' && <CompanySettings company={company} setCompany={setCompany} />}
                </div>
              );
            })}
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
