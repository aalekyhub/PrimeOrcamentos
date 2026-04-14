import React, { useMemo } from 'react';
import {
  LayoutDashboard,
  Wallet,
  Calendar,
  Settings,
  Plus,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart
} from 'lucide-react';

import {
  Transaction,
  AccountEntry,
  FinancialAccount,
  FinancialCategory,
  CompanyProfile,
  UserAccount
} from '../types';

// Custom Hooks & Services
import { useFinancialManager } from '../hooks/useFinancialManager';
import { selectAllRealized } from '../services/financialSelectors';

// Sub-Components
import FinancialDashboard from './financial/FinancialDashboard';
import FinancialCashFlowTab from './financial/FinancialCashFlowTab';
import FinancialProvisionTab from './financial/FinancialProvisionTab';
import FinancialReportsTab from './financial/FinancialReportsTab';
import FinancialSettingsTab from './financial/FinancialSettingsTab';
import FinancialEntryForm from './financial/FinancialEntryForm';
import FinancialModals from './financial/FinancialModals';

interface FinancialManagerProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  accountEntries: AccountEntry[];
  setAccountEntries: React.Dispatch<React.SetStateAction<AccountEntry[]>>;
  accounts: FinancialAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<FinancialAccount[]>>;
  categories: FinancialCategory[];
  setCategories: React.Dispatch<React.SetStateAction<FinancialCategory[]>>;
  company: CompanyProfile;
  currentUser: UserAccount;
}

const FinancialManager: React.FC<FinancialManagerProps> = (props) => {
  const {
    activeTab, setActiveTab,
    selectedYear, setSelectedYear,
    showEntryForm, setShowEntryForm,
    entrySearch, setEntrySearch,
    entryTypeFilter, setEntryTypeFilter,
    formData, setFormData,
    editingItem, setEditingItem,
    viewingAttachment, setViewingAttachment,
    printData, setPrintData,
    isAdmin,
    handleFileUpload,
    handleAddEntry,
    handleUpdateItem,
    handleToggleStatus,
    initialFormData
  } = useFinancialManager(props);

  const {
    transactions,
    setTransactions,
    accountEntries,
    setAccountEntries,
    accounts,
    setAccounts,
    categories,
    setCategories,
    company
  } = props;

  // Realized items consolidated
  const allRealized = useMemo(() => 
    selectAllRealized(transactions, accountEntries), 
    [transactions, accountEntries]
  );

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8 min-h-screen bg-slate-50/50 dark:bg-transparent">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black tracking-[0.3em] text-blue-600 uppercase">Gestão Financeira</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
            Fluxo de <span className="text-blue-600">Caixa</span>
          </h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {activeTab === 'dashboard' ? 'Visão Geral e Métricas' : 
             activeTab === 'realizado' ? 'Extrato de Lançamentos Realizados' : 
             activeTab === 'provisionado' ? 'Contas a Pagar e Receber' : 'Configurações do Sistema'}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('realizado')} 
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'realizado' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          >
            <Wallet className="w-4 h-4" /> Realizado
          </button>
          <button 
            onClick={() => setActiveTab('provisionado')} 
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'provisionado' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          >
            <Calendar className="w-4 h-4" /> Provisão
          </button>
          <button 
            onClick={() => setActiveTab('relatorios')} 
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'relatorios' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          >
            <PieChart className="w-4 h-4" /> DRE / Resultados
          </button>
          {isAdmin && (
            <button 
              onClick={() => setActiveTab('config')} 
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'config' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          <div className="w-[1px] h-8 bg-slate-100 dark:bg-slate-700 mx-2" />
          <button 
            onClick={() => {
              setFormData(initialFormData);
              setShowEntryForm(true);
            }} 
            className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {showEntryForm ? (
        <FinancialEntryForm 
          formData={formData}
          setFormData={setFormData}
          setShowEntryForm={setShowEntryForm}
          handleAddEntry={handleAddEntry}
          handleFileUpload={handleFileUpload}
          categories={categories}
        />
      ) : activeTab === 'dashboard' ? (
        <FinancialDashboard 
          allRealized={allRealized}
          accounts={accounts}
          categories={categories}
          transactions={transactions}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          setActiveTab={setActiveTab}
        />
      ) : activeTab === 'realizado' ? (
        <FinancialCashFlowTab 
          allRealized={allRealized}
          accountEntries={accountEntries}
          accounts={accounts}
          categories={categories}
          transactions={transactions}
          setTransactions={setTransactions}
          company={company}
          selectedYear={selectedYear}
          setPrintData={setPrintData}
          setEditingItem={setEditingItem}
          setViewingAttachment={setViewingAttachment}
        />
      ) : activeTab === 'provisionado' ? (
        <FinancialProvisionTab 
          accountEntries={accountEntries}
          setAccountEntries={setAccountEntries}
          transactions={transactions}
          setTransactions={setTransactions}
          categories={categories}
          company={company}
          entrySearch={entrySearch}
          setEntrySearch={setEntrySearch}
          entryTypeFilter={entryTypeFilter}
          setEntryTypeFilter={setEntryTypeFilter}
          setShowEntryForm={setShowEntryForm}
          setFormData={setFormData}
          initialFormData={initialFormData}
          setPrintData={setPrintData}
          setEditingItem={setEditingItem}
          setViewingAttachment={setViewingAttachment}
          handleToggleStatus={handleToggleStatus}
        />
      ) : activeTab === 'relatorios' ? (
        <FinancialReportsTab 
          allRealized={allRealized}
          categories={categories}
          selectedYear={selectedYear}
        />
      ) : activeTab === 'config' ? (
        <FinancialSettingsTab 
          categories={categories}
          setCategories={setCategories}
          accounts={accounts}
          setAccounts={setAccounts}
        />
      ) : null}

      {/* Modals & Tools */}
      <FinancialModals 
        editingItem={editingItem}
        setEditingItem={setEditingItem}
        viewingAttachment={viewingAttachment}
        setViewingAttachment={setViewingAttachment}
        printData={printData}
        setPrintData={setPrintData}
        handleUpdateItem={handleUpdateItem}
        handleFileUpload={handleFileUpload}
        categories={categories}
      />
    </div>
  );
};

export default FinancialManager;
