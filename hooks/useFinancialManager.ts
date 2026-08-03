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
  const [partnerFilter, setPartnerFilter] = useState<string>('ALL');
  
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
  
  const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, isEditing = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_SIZE) {
      notify('Arquivo muito grande (máx. 5MB). Escolha um arquivo menor.', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (isEditing && editingItem) {
        setEditingItem({ ...editingItem, attachment: base64, attachmentName: file.name } as any);
      } else {
        setFormData(prev => ({ ...prev, attachment: base64, attachmentName: file.name }));
      }
    };
    reader.onerror = () => {
      notify('Erro ao ler o arquivo. Tente novamente.', 'error');
    };
    reader.readAsDataURL(file);
  }, [editingItem, notify]);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;
    if (Number(formData.amount) < 0) {
      notify("O valor não pode ser negativo.", "error");
      return;
    }

    const isInvestment = formData.type === 'INVESTIMENTO';
    const accountId = isInvestment ? formData.accountId : undefined;

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
      attachmentName: formData.attachmentName,
      accountId
    };

    const newList = [newEntry, ...accountEntries];
    setAccountEntries(newList);

    const saveResults: any[] = [];

    if (isInvestment) {
      if (accountId) {
        const accountExists = accounts.some(acc => acc.id === accountId);
        let updatedAccounts = [...accounts];
        if (!accountExists && accountId === 'ACC-001') {
          updatedAccounts.push({
            id: 'ACC-001',
            name: 'Caixa Empresa',
            type: 'Caixa',
            initialBalance: 0,
            currentBalance: 0
          });
        }

        updatedAccounts = updatedAccounts.map(acc => {
          if (acc.id === accountId) {
            return {
              ...acc,
              currentBalance: acc.currentBalance + Number(formData.amount)
            };
          }
          return acc;
        });
        setAccounts(updatedAccounts);
        saveResults.push(await db.save('serviflow_financial_accounts', updatedAccounts));
      }

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
      saveResults.push(await db.save('serviflow_transactions', newTransactions, newTransaction));
    }

    setShowEntryForm(false);
    setFormData(initialFormData);

    saveResults.push(await db.save('serviflow_account_entries', newList, newEntry));

    if (saveResults.every(r => r?.success)) {
      notify(isInvestment ? "Empréstimo registrado e caixa atualizado!" : "Lançamento provisionado com sucesso!");
    } else {
      notify("Salvo localmente, mas houve erro ao sincronizar com a nuvem. Confira a conexão e tente sincronizar de novo.", "warning");
    }
  };

  // Converte um valor com sinal: tipos de crédito (entrada) somam ao saldo,
  // tipos de débito (saída) subtraem.
  const signedAmount = (amount: number, type: string) =>
    (type === 'RECEBER' || type === 'RECEITA' || type === 'INVESTIMENTO' || type === 'EMPRESTIMO_SOCIO') ? amount : -amount;

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const saveResults: any[] = [];
      let updatedAccounts: FinancialAccount[] | null = null;

      // Se o item editado já estava baixado/realizado, o saldo da conta
      // bancária precisa refletir a diferença entre o valor antigo e o novo
      // — antes disso, editar um lançamento já pago deixava o saldo travado
      // no valor original para sempre.
      const applyBalanceDelta = (accountId: string | undefined, oldSigned: number, newSigned: number) => {
        if (!accountId || oldSigned === newSigned) return;
        const delta = newSigned - oldSigned;
        updatedAccounts = (updatedAccounts || accounts).map(acc =>
          acc.id === accountId ? { ...acc, currentBalance: acc.currentBalance + delta } : acc
        );
      };

      const isAccEntry = (editingItem as any).isFromEntry === true || editingItem.id.startsWith('ENT-');

      if (isAccEntry) {
        const { isFromEntry, date, ...entryToSave } = editingItem as any;
        if (entryToSave.type === 'RECEITA') entryToSave.type = 'RECEBER';
        if (entryToSave.type === 'DESPESA') entryToSave.type = 'PAGAR';

        const oldEntry = accountEntries.find(e => e.id === editingItem.id);

        const newList = accountEntries.map(e => e.id === editingItem.id ? entryToSave : e);
        setAccountEntries(newList);
        saveResults.push(await db.save('serviflow_account_entries', newList, entryToSave));

        if (oldEntry && oldEntry.status === 'PAGO' && entryToSave.status === 'PAGO') {
          applyBalanceDelta(
            entryToSave.accountId || oldEntry.accountId,
            signedAmount(oldEntry.amount, oldEntry.type),
            signedAmount(entryToSave.amount, entryToSave.type)
          );
        }

        // Sync corresponding transaction in Realizado
        const updatedTransactions = transactions.map(t => {
          if (t.entryId === entryToSave.id) {
            return {
              ...t,
              amount: entryToSave.amount,
              type: (entryToSave.type === 'RECEBER' || entryToSave.type === 'INVESTIMENTO') ? 'RECEITA' as const : 'DESPESA' as const,
              category: entryToSave.category,
              description: entryToSave.description,
              customerName: entryToSave.customerName,
              supplierName: entryToSave.supplierName,
              attachment: entryToSave.attachment,
              attachmentName: entryToSave.attachmentName
            };
          }
          return t;
        });

        const hasChangedTrans = JSON.stringify(transactions) !== JSON.stringify(updatedTransactions);
        if (hasChangedTrans) {
          setTransactions(updatedTransactions);
          const changedTrans = updatedTransactions.find(t => t.entryId === entryToSave.id);
          if (changedTrans) {
            saveResults.push(await db.save('serviflow_transactions', updatedTransactions, changedTrans));
          }
        }
      } else {
        const tItem = editingItem as Transaction;
        const oldTrans = transactions.find(t => t.id === tItem.id);

        const newList = transactions.map(t => t.id === tItem.id ? tItem : t);
        setTransactions(newList);
        saveResults.push(await db.save('serviflow_transactions', newList, tItem));

        if (oldTrans) {
          const linkedEntry = tItem.entryId ? accountEntries.find(e => e.id === tItem.entryId) : undefined;
          applyBalanceDelta(
            linkedEntry?.accountId,
            signedAmount(oldTrans.amount, oldTrans.type),
            signedAmount(tItem.amount, tItem.type)
          );
        }

        // Sync corresponding entry in Provisionado
        if (tItem.entryId) {
          const updatedEntries = accountEntries.map(e => {
            if (e.id === tItem.entryId) {
              return {
                ...e,
                amount: tItem.amount,
                type: (tItem.type === 'RECEITA' || tItem.type === 'EMPRESTIMO_SOCIO') ? 'RECEBER' as const : 'PAGAR' as const,
                category: tItem.category,
                description: tItem.description,
                customerName: tItem.customerName,
                supplierName: tItem.supplierName,
                attachment: tItem.attachment,
                attachmentName: tItem.attachmentName
              };
            }
            return e;
          });

          const hasChangedEntries = JSON.stringify(accountEntries) !== JSON.stringify(updatedEntries);
          if (hasChangedEntries) {
            setAccountEntries(updatedEntries);
            const changedEntry = updatedEntries.find(e => e.id === tItem.entryId);
            if (changedEntry) {
              saveResults.push(await db.save('serviflow_account_entries', updatedEntries, changedEntry));
            }
          }
        }
      }

      if (updatedAccounts) {
        setAccounts(updatedAccounts);
        saveResults.push(await db.save('serviflow_financial_accounts', updatedAccounts));
      }

      setEditingItem(null);
      if (saveResults.every(r => r?.success)) {
        notify("Alteração salva com sucesso!");
      } else {
        notify("Salvo localmente, mas houve erro ao sincronizar com a nuvem. Confira a conexão e tente sincronizar de novo.", "warning");
      }
    } catch (error) {
      console.error('Erro ao salvar alteração:', error);
      notify("Erro ao salvar alteração.", "error");
    }
  };

  const handleConfirmSettlement = async (entryId: string, accountId: string) => {
    const entry = accountEntries.find(e => e.id === entryId);
    if (!entry) return;

    try {
      const saveResults: any[] = [];

      // 1. Update entry
      const updatedEntries = accountEntries.map(e =>
        e.id === entryId ? { ...e, status: 'PAGO' as any, paymentDate: getTodayIsoDate(), accountId } : e
      );
      setAccountEntries(updatedEntries);
      saveResults.push(await db.save('serviflow_account_entries', updatedEntries));

      // 2. Update bank account balance
      const accountExists = accounts.some(acc => acc.id === accountId);
      let updatedAccounts = [...accounts];
      if (!accountExists && accountId === 'ACC-001') {
        updatedAccounts.push({
          id: 'ACC-001',
          name: 'Caixa Empresa',
          type: 'Caixa',
          initialBalance: 0,
          currentBalance: 0
        });
      }

      updatedAccounts = updatedAccounts.map(acc => {
        if (acc.id === accountId) {
          const delta = (entry.type === 'RECEBER' || entry.type === 'INVESTIMENTO') ? entry.amount : -entry.amount;
          return {
            ...acc,
            currentBalance: acc.currentBalance + delta
          };
        }
        return acc;
      });
      setAccounts(updatedAccounts);
      saveResults.push(await db.save('serviflow_financial_accounts', updatedAccounts));

      // 3. Create transaction
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
      saveResults.push(await db.save('serviflow_transactions', newTransactions, newTransaction));

      if (saveResults.every(r => r?.success)) {
        notify("Baixa realizada e caixa atualizado!");
      } else {
        notify("Baixa salva localmente, mas houve erro ao sincronizar com a nuvem. Confira a conexão e tente sincronizar de novo.", 'warning');
      }
    } catch (err) {
      console.error('Erro ao baixar título:', err);
      notify("Erro ao realizar baixa do título.", "error");
    }
  };

  const handleDeleteRealized = async (id: string) => {
    if (!isAdmin) {
      notify("Você não tem permissão para excluir lançamentos realizados.", "error");
      return;
    }

    if (!confirm("Deseja realmente reverter e excluir este lançamento do fluxo de caixa? O saldo bancário correspondente será estornado e o título voltará a ser Pendente.")) {
      return;
    }

    try {
      const transaction = transactions.find(t => t.id === id);
      const entryId = transaction?.entryId || id;
      const entry = accountEntries.find(e => e.id === entryId);
      const saveResults: any[] = [];

      const accountId = entry?.accountId;
      if (accountId && (transaction || entry)) {
        const amount = transaction ? transaction.amount : (entry?.amount || 0);
        const type = transaction ? transaction.type : ((entry?.type === 'RECEBER' || entry?.type === 'INVESTIMENTO') ? 'RECEITA' : 'DESPESA');

        // Estornar saldo: se era RECEITA (somado), subtraímos (-). Se era DESPESA (subtraído), somamos (+).
        const delta = type === 'RECEITA' ? -amount : amount;

        const updatedAccounts = accounts.map(acc => {
          if (acc.id === accountId) {
            return {
              ...acc,
              currentBalance: acc.currentBalance + delta
            };
          }
          return acc;
        });

        setAccounts(updatedAccounts);
        saveResults.push(await db.save('serviflow_financial_accounts', updatedAccounts));
      }

      if (entry) {
        const updatedEntries = accountEntries.map(e => {
          if (e.id === entry.id) {
            return {
              ...e,
              status: 'PENDENTE' as const,
              paymentDate: undefined,
              accountId: undefined
            };
          }
          return e;
        });
        setAccountEntries(updatedEntries);
        saveResults.push(await db.save('serviflow_account_entries', updatedEntries));
      }

      if (transaction) {
        const updatedTrans = transactions.filter(t => t.id !== id);
        setTransactions(updatedTrans);
        saveResults.push(await db.remove('serviflow_transactions', id));
      }

      if (saveResults.every(r => r?.success)) {
        notify("Lançamento realizado estornado com sucesso!");
      } else {
        notify("Estornado localmente, mas houve erro ao sincronizar com a nuvem. Confira a conexão e tente sincronizar de novo.", 'warning');
      }
    } catch (err) {
      console.error('Erro ao excluir lançamento realizado:', err);
      notify("Erro ao excluir lançamento realizado.", "error");
    }
  };

  return {
    activeTab, setActiveTab,
    selectedYear, setSelectedYear,
    showEntryForm, setShowEntryForm,
    entrySearch, setEntrySearch,
    entryTypeFilter, setEntryTypeFilter,
    partnerFilter, setPartnerFilter,
    formData, setFormData,
    editingItem, setEditingItem,
    viewingAttachment, setViewingAttachment,
    printData, setPrintData,
    isAdmin,
    handleFileUpload,
    handleAddEntry,
    handleUpdateItem,
    handleConfirmSettlement,
    handleDeleteRealized,
    initialFormData
  };
};
