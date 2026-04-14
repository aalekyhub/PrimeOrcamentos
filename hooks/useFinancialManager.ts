import React, { useState, useCallback } from 'react';
import { 
  Transaction, 
  AccountEntry, 
  FinancialAccount, 
  FinancialCategory, 
  UserAccount 
} from '../types';
import { db } from '../services/db';
import { getTodayIsoDate } from '../services/dateService';
import { useNotify } from '../components/ToastProvider';
import { isAporte } from '../services/financialHelpers';

export interface UseFinancialManagerProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  accountEntries: AccountEntry[];
  setAccountEntries: React.Dispatch<React.SetStateAction<AccountEntry[]>>;
  accounts: FinancialAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<FinancialAccount[]>>;
  categories: FinancialCategory[];
  setCategories: React.Dispatch<React.SetStateAction<FinancialCategory[]>>;
  currentUser: UserAccount;
}

export const useFinancialManager = ({
  transactions,
  setTransactions,
  accountEntries,
  setAccountEntries,
  accounts,
  setAccounts,
  categories,
  setCategories,
  currentUser
}: UseFinancialManagerProps) => {
  const { notify } = useNotify();

  // --- States ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'realizado' | 'provisionado' | 'relatorios' | 'config'>('dashboard');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entrySearch, setEntrySearch] = useState('');
  const [entryTypeFilter, setEntryTypeFilter] = useState<'ALL' | 'PAGAR' | 'RECEBER'>('ALL');
  
  const initialFormData: Partial<AccountEntry> = {
    type: 'PAGAR',
    status: 'PENDENTE',
    dueDate: getTodayIsoDate(),
    amount: 0,
    category: 'Geral',
    description: '',
    attachment: undefined,
    attachmentName: undefined
  };

  const [formData, setFormData] = useState<Partial<AccountEntry>>(initialFormData);
  const [editingItem, setEditingItem] = useState<AccountEntry | Transaction | null>(null);
  const [viewingAttachment, setViewingAttachment] = useState<{ content: string, name: string } | null>(null);
  const [printData, setPrintData] = useState<{ html: string, title: string, filename: string } | null>(null);

  // --- Helpers ---
  const isAdmin = currentUser.role === 'admin';

  // --- Handlers ---
  
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, isEditing = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (isEditing && editingItem) {
        setEditingItem({ ...editingItem, attachment: base64, attachmentName: file.name } as any);
      } else {
        setFormData(prev => ({ ...prev, attachment: base64, attachmentName: file.name }));
      }
    };
    reader.readAsDataURL(file);
  }, [editingItem]);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;

    const isInvestment = formData.type === 'INVESTIMENTO';

    const newEntry: AccountEntry = {
      id: `ENT-${Date.now()}`,
      type: formData.type as any,
      status: isInvestment ? 'PAGO' : 'PENDENTE',
      amount: Number(formData.amount),
      category: formData.category || 'Geral',
      description: formData.description || '',
      dueDate: formData.dueDate || getTodayIsoDate(),
      paymentDate: isInvestment ? getTodayIsoDate() : undefined,
      customerName: formData.customerName,
      supplierName: formData.supplierName,
      installmentNumber: 1,
      totalInstallments: 1,
      attachment: formData.attachment,
      attachmentName: formData.attachmentName
    };

    const newList = [newEntry, ...accountEntries];
    setAccountEntries(newList);

    if (isInvestment) {
      const newTransaction: Transaction = {
        id: `TR-INV-${Date.now()}`,
        date: getTodayIsoDate(),
        amount: Number(formData.amount),
        type: 'RECEITA',
        category: formData.category || 'Aporte de Sócios',
        description: formData.description || 'Empréstimo',
        entryId: newEntry.id,
        customerName: formData.customerName,
        supplierName: formData.supplierName
      };
      const newTransactions = [newTransaction, ...transactions];
      setTransactions(newTransactions);
      await db.save('serviflow_transactions', newTransactions, newTransaction);
    }

    setShowEntryForm(false);
    setFormData(initialFormData);

    await db.save('serviflow_account_entries', newList, newEntry);
    notify(isInvestment ? "Empréstimo registrado e caixa atualizado!" : "Lançamento provisionado com sucesso!");
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const isAccEntry = (editingItem as any).isFromEntry === true || editingItem.id.startsWith('ENT-');

      if (isAccEntry) {
        const { isFromEntry, date, ...entryToSave } = editingItem as any;
        if (entryToSave.type === 'RECEITA') entryToSave.type = 'RECEBER';
        if (entryToSave.type === 'DESPESA') entryToSave.type = 'PAGAR';

        const newList = accountEntries.map(e => e.id === editingItem.id ? entryToSave : e);
        setAccountEntries(newList);
        await db.save('serviflow_account_entries', newList, entryToSave);
      } else {
        const tItem = editingItem as Transaction;
        const newList = transactions.map(t => t.id === tItem.id ? tItem : t);
        setTransactions(newList);
        await db.save('serviflow_transactions', newList, tItem);
      }
      setEditingItem(null);
      notify("Alteração salva com sucesso!");
    } catch (error) {
      console.error('Erro ao salvar alteração:', error);
      notify("Erro ao salvar alteração.", "error");
    }
  };

  const handleToggleStatus = async (entry: AccountEntry) => {
    if (!confirm('Deseja confirmar o pagamento/recebimento deste título?')) return;
    
    const updatedEntries = accountEntries.map(e => 
      e.id === entry.id ? { ...e, status: 'PAGO' as any, paymentDate: getTodayIsoDate() } : e
    );
    setAccountEntries(updatedEntries);
    await db.save('serviflow_account_entries', updatedEntries);

    const newTransaction: Transaction = {
      id: `TR-${Date.now()}`,
      date: getTodayIsoDate(),
      amount: entry.amount,
      type: (entry.type === 'RECEBER' || entry.type === 'INVESTIMENTO') ? 'RECEITA' : 'DESPESA',
      category: entry.category,
      description: entry.description,
      entryId: entry.id,
      customerName: entry.customerName,
      supplierName: entry.supplierName,
      attachment: entry.attachment,
      attachmentName: entry.attachmentName
    };

    const newTransactions = [newTransaction, ...transactions];
    setTransactions(newTransactions);
    await db.save('serviflow_transactions', newTransactions, newTransaction);
    notify("Baixa realizada e caixa atualizado!");
  };

  return {
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
  };
};
