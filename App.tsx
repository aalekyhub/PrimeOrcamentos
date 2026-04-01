import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard,
  FileText,
  Wallet,
  Search,
  Menu,
  X,
  Users,
  Briefcase,
  ClipboardList,
  Zap,
  Settings,
  Building2,
  Lock,
  LogOut,
  RefreshCw,
  Cloud,
  CloudOff,
  Database,
  HardHat,
  Check,
  AlertCircle,
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import UnifiedWorksManager from './components/UnifiedWorksManager';
import BudgetManager from './components/BudgetManager';
import ServiceOrderManager from './components/ServiceOrderManager';
import WorkOrderManager from './components/WorkOrderManager';
import FinancialControl from './components/FinancialControl';
import CustomerManager from './components/CustomerManager';
import ServiceCatalog from './components/ServiceCatalog';
import CompanySettings from './components/CompanySettings';
import BudgetSearch from './components/BudgetSearch';
import UserManager from './components/UserManager';
import Login from './components/Login';

import { ToastProvider, useNotify } from './components/ToastProvider';


import {
  ServiceOrder,
  Transaction,
  OrderStatus,
  Customer,
  CatalogService,
  CompanyProfile,
  UserAccount,
  Loan,
} from './types';

import { db, initPromise, startRealtimeSync, stopRealtimeSync } from './services/db';
import { APP_VERSION } from './services/version';

const STORAGE_KEYS = {
  CUSTOMERS: 'serviflow_customers',
  CATALOG: 'serviflow_catalog',
  COMPANY: 'serviflow_company',
  ORDERS: 'serviflow_orders',
  TRANSACTIONS: 'serviflow_transactions',
  USERS: 'serviflow_users',
  LOANS: 'serviflow_loans',
  SESSION: 'serviflow_session',
  DARK_MODE: 'serviflow_dark_mode',
} as const;

const INITIAL_USERS: UserAccount[] = [
  {
    id: 'USR-001',
    name: 'Admin Master',
    email: 'admin@primeservicos.com',
    password: 'admin',
    role: 'admin',
    permissions: [
      'dashboard',
      'customers',
      'catalog',
      'budgets',
      'search',
      'orders',
      'financials',
      'users',
      'settings',
      'construction',
      'works',
    ],
    createdAt: '2024-01-01',
  },
];

const INITIAL_COMPANY: CompanyProfile = {
  id: 'CMP-001',
  name: 'PRIME SERVIÇOS E MANUTENÇÃO LTDA',
  tagline: 'SOLUÇÕES EM GESTÃO E MANUTENÇÃO PROFISSIONAL',
  cnpj: '57.886.036/0001-31',
  email: 'contato@primeservicosbr.com.br',
  phone: '(61) 99993-2676',
  address: 'AVENIDA SÃO JOÃO QD.23 LT.38, APARECIDA DE GOIANIA - GO',
  nameFontSize: 24,
  logoSize: 80,
  customUnits: [{ label: 'Unidade', value: 'un' }],
};

type TabId =
  | 'dashboard'
  | 'customers'
  | 'catalog'
  | 'construction'
  | 'budgets'
  | 'orders'
  | 'works'
  | 'financials'
  | 'search'
  | 'users'
  | 'settings';

const AppContent: React.FC = () => {
  const { notify } = useNotify();

  const notifyRef = useRef(notify);
  const syncInFlightRef = useRef(false);
  const hasBootedRef = useRef(false);

  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [openTabs, setOpenTabs] = useState<TabId[]>(['dashboard']);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [darkMode, setDarkMode] = useState<boolean>(() => db.load(STORAGE_KEYS.DARK_MODE, false));

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() =>
    db.load(STORAGE_KEYS.SESSION, null)
  );
  const [users, setUsers] = useState<UserAccount[]>(() =>
    db.load(STORAGE_KEYS.USERS, INITIAL_USERS)
  );
  const [orders, setOrders] = useState<ServiceOrder[]>(() =>
    db.load(STORAGE_KEYS.ORDERS, [])
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    db.load(STORAGE_KEYS.TRANSACTIONS, [])
  );
  const [customers, setCustomers] = useState<Customer[]>(() =>
    db.load(STORAGE_KEYS.CUSTOMERS, [])
  );
  const [catalog, setCatalog] = useState<CatalogService[]>(() =>
    db.load(STORAGE_KEYS.CATALOG, [])
  );
  const [company, setCompany] = useState<CompanyProfile>(() =>
    db.load(STORAGE_KEYS.COMPANY, INITIAL_COMPANY)
  );
  const [loans, setLoans] = useState<Loan[]>(() =>
    db.load(STORAGE_KEYS.LOANS, [])
  );
  const [prefilledBudgetData, setPrefilledBudgetData] = useState<any>(null);

  const openTab = useCallback((tabId: TabId) => {
    setOpenTabs((prev) => (prev.includes(tabId) ? prev : [...prev, tabId]));
    setActiveTab(tabId);
  }, []);

  const closeTab = useCallback((tabId: TabId) => {
    if (tabId === 'dashboard') return;

    setOpenTabs((prev) => {
      const newTabs = prev.filter((t) => t !== tabId);
      setActiveTab((currentActive) => {
        if (currentActive !== tabId) return currentActive;
        return newTabs[newTabs.length - 1] || 'dashboard';
      });
      return newTabs;
    });
  }, []);

  const handleManualSync = useCallback(async () => {
    if (syncInFlightRef.current) return;
    if (!db.isConnected()) return;

    syncInFlightRef.current = true;
    setIsSyncing(true);

    try {
      console.log('[Sync] Iniciando sincronização manual...');
      const syncResponse = await db.syncFromCloud();

      if (!syncResponse) return;

      const { results: cloudData, errors: cloudErrors } = syncResponse;

      if (Object.keys(cloudErrors || {}).length > 0) {
        console.warn('[Sync Partial Failure]', cloudErrors);
      }

      if (cloudData) {
        if (Array.isArray(cloudData.customers)) {
          setCustomers(cloudData.customers);
          await db.saveLocal(STORAGE_KEYS.CUSTOMERS, cloudData.customers);
        }

        if (Array.isArray(cloudData.catalog)) {
          setCatalog(cloudData.catalog);
          await db.saveLocal(STORAGE_KEYS.CATALOG, cloudData.catalog);
        }

        if (Array.isArray(cloudData.orders)) {
          const sortedOrders = [...cloudData.orders].sort(
            (a, b) =>
              new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          setOrders(sortedOrders);
          await db.saveLocal(STORAGE_KEYS.ORDERS, sortedOrders);
        }

        if (Array.isArray(cloudData.transactions)) {
          const sortedTransactions = [...cloudData.transactions].sort(
            (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
          );
          setTransactions(sortedTransactions);
          await db.saveLocal(STORAGE_KEYS.TRANSACTIONS, sortedTransactions);
        }

        if (Array.isArray(cloudData.users)) {
          setUsers(cloudData.users);
          await db.saveLocal(STORAGE_KEYS.USERS, cloudData.users);
        }

        if (Array.isArray(cloudData.loans)) {
          setLoans(cloudData.loans);
          await db.saveLocal(STORAGE_KEYS.LOANS, cloudData.loans);
        }

        if (Array.isArray(cloudData.company) && cloudData.company.length > 0) {
          setCompany(cloudData.company[0]);
          await db.saveLocal(STORAGE_KEYS.COMPANY, cloudData.company[0]);
        }

        const subTables = [
          'plans',
          'plan_services',
          'plan_materials',
          'plan_labor',
          'plan_indirects',
          'plan_taxes',
          'works',
          'work_services',
          'work_materials',
          'work_labor',
          'work_indirects',
          'work_taxes',
        ] as const;

        for (const tableName of subTables) {
          if (Array.isArray(cloudData[tableName])) {
            await db.saveLocal(`serviflow_${tableName}`, cloudData[tableName]);
          }
        }

        notifyRef.current('Sincronização concluída com sucesso!', 'success');
      }
    } catch (e: any) {
      console.error('[Sync Error Detail]', e);
      notifyRef.current(`Erro de sincronização: ${e?.message || 'Erro desconhecido'}.`, 'error');
    } finally {
      syncInFlightRef.current = false;
      setIsSyncing(false);
    }
  }, []);

    useEffect(() => {
        const handleSync = () => {
            console.log('[App] Refreshing state after sync event...');
            setCustomers(db.load(STORAGE_KEYS.CUSTOMERS, []));
            setCatalog(db.load(STORAGE_KEYS.CATALOG, []));
            setOrders(db.load(STORAGE_KEYS.ORDERS, []));
            setTransactions(db.load(STORAGE_KEYS.TRANSACTIONS, []));
            setUsers(db.load(STORAGE_KEYS.USERS, INITIAL_USERS));
            setLoans(db.load(STORAGE_KEYS.LOANS, []));
            setCompany(db.load(STORAGE_KEYS.COMPANY, INITIAL_COMPANY));
        };

        window.addEventListener('db-sync-complete', handleSync);
        return () => window.removeEventListener('db-sync-complete', handleSync);
    }, []);

    useEffect(() => {
        let isMounted = true;

    const boot = async () => {
      if (hasBootedRef.current) return;
      hasBootedRef.current = true;

      await initPromise;

      if (!isMounted) return;
      if (!db.isConnected()) return;

      await handleManualSync();

      if (!isMounted) return;

      await startRealtimeSync();
    };

    boot();

    return () => {
      isMounted = false;
      stopRealtimeSync();
    };
  }, [handleManualSync]);

  useEffect(() => {
    db.saveLocal(STORAGE_KEYS.DARK_MODE, darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (currentUser) {
      db.saveLocal(STORAGE_KEYS.SESSION, currentUser);
    } else {
      db.saveLocal(STORAGE_KEYS.SESSION, null);
      try {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
      } catch {
        // noop
      }
    }
  }, [currentUser]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    const realizedTransactions = transactions.filter((t) => t.date <= today);
    const projectedTransactions = transactions;

    const realizedRev = realizedTransactions
      .filter((t) => t.type === 'RECEITA')
      .reduce((a, c) => a + c.amount, 0);

    const realizedExp = realizedTransactions
      .filter((t) => t.type === 'DESPESA')
      .reduce((a, c) => a + c.amount, 0);

    const projectedRev = projectedTransactions
      .filter((t) => t.type === 'RECEITA')
      .reduce((a, c) => a + c.amount, 0);

    const projectedExp = projectedTransactions
      .filter((t) => t.type === 'DESPESA')
      .reduce((a, c) => a + c.amount, 0);

    const pendingOrders = orders.filter(
      (o) => o.status === OrderStatus.PENDING || o.status === OrderStatus.IN_PROGRESS
    ).length;

    return {
      totalRevenue: realizedRev,
      totalExpenses: realizedExp,
      netProfit: realizedRev - realizedExp,
      projectedProfit: projectedRev - projectedExp,
      pendingOrders,
    };
  }, [orders, transactions]);

  const handleGenerateBudget = useCallback(
    (
      plan: any,
      services: any[],
      totalMaterial: number,
      totalLabor: number,
      totalIndirect: number,
      bdiRate: number,
      taxRate: number
    ) => {
      setPrefilledBudgetData({
        plan,
        services,
        totalMaterial,
        totalLabor,
        totalIndirect,
        bdiRate,
        taxRate,
      });

      openTab('budgets');
    },
    [openTab]
  );

  const handleLogin = useCallback(
    async (user: UserAccount) => {
      setCurrentUser(user);
      await db.saveLocal(STORAGE_KEYS.SESSION, user);
    },
    []
  );

  const handleLogout = useCallback(async () => {
    if (!confirm('Encerrar sessão?')) return;
    setCurrentUser(null);
    await db.saveLocal(STORAGE_KEYS.SESSION, null);
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    } catch {
      // noop
    }
  }, []);

  const navItems = useMemo(() => {
    const items: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
      { id: 'dashboard', label: 'Painel de Controle', icon: LayoutDashboard },
      { id: 'customers', label: 'Clientes', icon: Users },
      { id: 'catalog', label: 'Serviços', icon: Briefcase },
      { id: 'construction', label: 'Gestão de Obras', icon: Building2 },
      { id: 'budgets', label: 'Orçamentos', icon: FileText },
      { id: 'orders', label: 'O.S. Equip', icon: ClipboardList },
      { id: 'works', label: 'O.S. Obra', icon: HardHat },
      { id: 'financials', label: 'Financeiro', icon: Wallet },
      { id: 'search', label: 'Consultar', icon: Search },
      { id: 'users', label: 'Usuários', icon: Lock },
      { id: 'settings', label: 'Empresa', icon: Settings },
    ];

    return items.filter(
      (item) => currentUser?.role === 'admin' || currentUser?.permissions?.includes(item.id)
    );
  }, [currentUser]);

  const currentTabLabel = useMemo(
    () => navItems.find((n) => n.id === activeTab)?.label || 'Painel',
    [navItems, activeTab]
  );

  if (!currentUser) {
    return (
      <Login
        users={users}
        onLogin={handleLogin}
        company={company}
        onSync={handleManualSync}
        isSyncing={isSyncing}
        isConnected={db.isConnected()}
      />
    );
  }

  return (
    <div
      className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${darkMode ? 'dark bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-900'
        }`}
    >
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-72 border-r transition-all duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 shadow-lg ${darkMode
            ? 'bg-slate-800 border-slate-700 shadow-black/20'
            : 'bg-white border-slate-100 shadow-slate-200/50'
          }`}
      >
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
            <h1 className={`text-2xl font-medium tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Prime
            </h1>
          </div>

          <nav className="space-y-1.5 flex-1 overflow-y-auto no-scrollbar">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  openTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                    ? darkMode
                      ? 'bg-blue-900/40 text-blue-400 font-bold'
                      : 'bg-blue-50 text-blue-600 font-bold'
                    : darkMode
                      ? 'text-slate-400 hover:bg-slate-700 hover:text-white font-medium'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                  }`}
              >
                <item.icon
                  className={`w-5 h-5 ${activeTab === item.id
                      ? darkMode
                        ? 'text-blue-400'
                        : 'text-blue-600'
                      : 'text-slate-500'
                    }`}
                />
                <span className="text-[16px] leading-relaxed">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className={`mt-auto pt-6 space-y-4 ${darkMode ? 'border-slate-700 border-t' : 'border-slate-100 border-t'}`}>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-5 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all font-semibold text-xs"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>

            <div className="px-5 py-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                Versão {APP_VERSION}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header
          className={`h-20 border-b flex items-center justify-between px-4 md:px-10 shrink-0 z-10 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}
        >
          <div className="flex items-center gap-4">
            <button
              className={`lg:hidden p-2 rounded-xl ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className={`w-6 h-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} />
            </button>

            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-slate-400 text-[10px] uppercase tracking-[0.2em]">
                {currentTabLabel}
              </h2>

              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all hover:scale-105 active:scale-95 ${isSyncing
                    ? 'bg-blue-50 border-blue-100'
                    : db.isConnected()
                      ? 'bg-emerald-50 border-emerald-100'
                      : 'bg-slate-50 border-slate-100'
                  }`}
                title="Clique para sincronizar com a nuvem agora"
              >
                {isSyncing ? (
                  <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
                ) : db.isConnected() ? (
                  <Cloud className="w-3 h-3 text-emerald-500" />
                ) : (
                  <CloudOff className="w-3 h-3 text-slate-300" />
                )}

                <span
                  className={`text-[8px] font-semibold uppercase tracking-tighter ${isSyncing
                      ? 'text-blue-500'
                      : db.isConnected()
                        ? 'text-emerald-600'
                        : darkMode
                          ? 'text-slate-500'
                          : 'text-slate-400'
                    }`}
                >
                  {isSyncing ? 'Sincronizando' : db.isConnected() ? 'Nuvem Ativa' : 'Apenas Local'}
                </span>
              </button>


            </div>
          </div>

          <div className="flex items-center gap-4 text-right">
            <button
              onClick={() => setDarkMode((prev) => !prev)}
              className={`p-2.5 rounded-xl border transition-all hover:scale-110 active:scale-90 ${darkMode
                  ? 'bg-slate-700 border-slate-600 text-amber-400 hover:bg-slate-600'
                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-white hover:text-blue-600 hover:shadow-md'
                }`}
              title={darkMode ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
            >
              {darkMode ? <Zap className="w-5 h-5 fill-current" /> : <Zap className="w-5 h-5" />}
            </button>

            <div className="hidden sm:block">
              <p className={darkMode ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-900'}>
                {company.name}
              </p>
              <p className="text-[10px] text-blue-600 font-medium uppercase tracking-widest">
                {new Intl.DateTimeFormat('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }).format(new Date())}
              </p>
            </div>

            <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
              {company.logo ? (
                <img src={company.logo} className="w-full h-full object-cover" alt="Logo" />
              ) : (
                <Building2 className="w-5 h-5 text-slate-400" />
              )}
            </div>
          </div>
        </header>

        <div
          className={`border-b px-4 md:px-10 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 h-12 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}
        >
          {openTabs.map((tabId) => {
            const item = navItems.find((n) => n.id === tabId);
            if (!item) return null;

            const isActive = activeTab === tabId;

            return (
              <div
                key={tabId}
                className={`flex items-center h-full min-w-[120px] max-w-[200px] border-b-2 transition-all cursor-pointer group ${isActive
                    ? darkMode
                      ? 'border-blue-500 bg-blue-900/30'
                      : 'border-blue-600 bg-blue-50/30'
                    : darkMode
                      ? 'border-transparent hover:bg-slate-700/50'
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                onClick={() => setActiveTab(tabId)}
              >
                <div className="flex items-center gap-2 px-4 w-full">
                  <item.icon
                    className={`w-3.5 h-3.5 shrink-0 ${isActive
                        ? darkMode
                          ? 'text-blue-400'
                          : 'text-blue-600'
                        : darkMode
                          ? 'text-slate-500'
                          : 'text-slate-400'
                      }`}
                  />

                  <span
                    className={`text-[11px] font-bold truncate ${isActive
                        ? darkMode
                          ? 'text-blue-400'
                          : 'text-blue-600'
                        : 'text-slate-500'
                      }`}
                  >
                    {item.label}
                  </span>

                  {tabId !== 'dashboard' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tabId);
                      }}
                      className={`ml-auto p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'
                        }`}
                    >
                      <X className="w-3 h-3 text-slate-400" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div
          className={`flex-1 overflow-y-auto p-4 md:p-10 no-scrollbar relative transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'
            }`}
        >
          <div className="max-w-[1400px] mx-auto h-full">
            {navItems.map((item) => {
              const isMounted = openTabs.includes(item.id);
              if (!isMounted) return null;

              const isVisible = activeTab === item.id;

              return (
                <div key={item.id} className={isVisible ? 'block h-full' : 'hidden'}>
                  {item.id === 'dashboard' && (
                    <Dashboard
                      stats={stats}
                      orders={orders}
                      transactions={transactions}
                      currentUser={currentUser}
                      company={company}
                      isLoading={isSyncing && orders.length === 0 && transactions.length === 0}
                      onNavigate={(target: TabId) => openTab(target)}
                    />
                  )}

                  {item.id === 'customers' && (
                    <CustomerManager customers={customers} setCustomers={setCustomers} orders={orders} />
                  )}

                  {item.id === 'catalog' && (
                    <ServiceCatalog services={catalog} setServices={setCatalog} company={company} />
                  )}

                  {item.id === 'budgets' && (
                    <BudgetManager
                      orders={orders}
                      setOrders={setOrders}
                      customers={customers}
                      setCustomers={setCustomers}
                      catalogServices={catalog}
                      setCatalogServices={setCatalog}
                      company={company}
                      prefilledData={prefilledBudgetData}
                      onPrefilledDataConsumed={() => setPrefilledBudgetData(null)}
                    />
                  )}

                  {item.id === 'orders' && (
                    <ServiceOrderManager
                      orders={orders}
                      setOrders={setOrders}
                      customers={customers}
                      setCustomers={setCustomers}
                      catalogServices={catalog}
                      setCatalogServices={setCatalog}
                      company={company}
                    />
                  )}

                  {item.id === 'works' && (
                    <WorkOrderManager
                      orders={orders}
                      setOrders={setOrders}
                      customers={customers}
                      setCustomers={setCustomers}
                      catalogServices={catalog}
                      setCatalogServices={setCatalog}
                      company={company}
                      transactions={transactions}
                      setTransactions={setTransactions}
                    />
                  )}

                  {item.id === 'construction' && (
                    <UnifiedWorksManager customers={customers} company={company} onGenerateBudget={handleGenerateBudget} />
                  )}

                  {item.id === 'search' && (
                    <BudgetSearch
                      orders={orders}
                      setOrders={setOrders}
                      customers={customers}
                      company={company}
                      catalogServices={catalog}
                      setCatalogServices={setCatalog}
                      isLoading={isSyncing}
                    />
                  )}

                  {item.id === 'financials' && (
                    <FinancialControl
                      transactions={transactions}
                      setTransactions={setTransactions}
                      loans={loans}
                      setLoans={setLoans}
                      currentUser={currentUser}
                    />
                  )}

                  {item.id === 'users' && (
                    <UserManager users={users} setUsers={setUsers} />
                  )}

                  {item.id === 'settings' && (
                    <CompanySettings company={company} setCompany={setCompany} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};



const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    initPromise.then(() => {
      if (mounted) setIsReady(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 transition-colors duration-300">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20 animate-pulse">
          <Database className="w-6 h-6 text-white" />
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;