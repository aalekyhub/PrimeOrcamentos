
import React, { useState } from 'react';
import { X, Calendar, DollarSign, CalendarCheck, Info } from 'lucide-react';
import { ServiceOrder, AccountEntry, OrderStatus } from '../../types';
import { getTodayIsoDate, addDaysToDate } from '../../services/dateService';
import { db } from '../../services/db';

interface BillingModalProps {
  order: ServiceOrder;
  onClose: () => void;
  onSuccess: (newEntries: AccountEntry[]) => void;
  currentEntries: AccountEntry[];
}

const BillingModal: React.FC<BillingModalProps> = ({ order, onClose, onSuccess, currentEntries }) => {
  const [installments, setInstallments] = useState(1);
  const [intervalDays, setIntervalDays] = useState(30);
  const [firstDueDate, setFirstDueDate] = useState(getTodayIsoDate());
  const [isGenerating, setIsGenerating] = useState(false);

  const totalAmount = order.totalAmount;
  const installmentAmount = Number((totalAmount / installments).toFixed(2));

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const newEntries: AccountEntry[] = [];
      
      for (let i = 1; i <= installments; i++) {
        const dueDate = i === 1 ? firstDueDate : addDaysToDate(intervalDays * (i - 1), firstDueDate);
        
        const entry: AccountEntry = {
          id: `ENT-${Date.now()}-${i}`,
          type: 'RECEBER',
          status: 'PENDENTE',
          amount: i === installments ? Number((totalAmount - (installmentAmount * (installments - 1))).toFixed(2)) : installmentAmount,
          category: 'Prestação de Serviços',
          description: `Faturamento - ${order.id} (${order.description}) - Parcela ${i}/${installments}`,
          dueDate: dueDate,
          customerId: order.customerId,
          customerName: order.customerName,
          orderId: order.id,
          installmentNumber: i,
          totalInstallments: installments
        };
        newEntries.push(entry);
      }

      const updatedList = [...newEntries, ...currentEntries];
      onSuccess(updatedList);
      
      // Save to DB
      await db.save('serviflow_account_entries', updatedList, newEntries);
      
      onClose();
    } catch (error) {
      console.error('Erro ao faturar:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border dark:border-slate-800">
        <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none mb-1">Faturar Orçamento</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{order.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Valor Total</p>
              <h4 className="text-2xl font-black text-blue-900 dark:text-white">R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
            </div>
            <DollarSign className="w-8 h-8 text-blue-600/20" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Parcelas</label>
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min="1" max="12" 
                  className="grow accent-blue-600"
                  value={installments} 
                  onChange={e => setInstallments(Number(e.target.value))} 
                />
                <span className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-lg">{installments}x</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Intervalo (Dias)</label>
                <div className="relative">
                   <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                   <input 
                    type="number" 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 pl-10 text-sm font-bold outline-none" 
                    value={intervalDays} 
                    onChange={e => setIntervalDays(Number(e.target.value))} 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">1º Vencimento</label>
                <div className="relative">
                   <CalendarCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                   <input 
                    type="date" 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 pl-10 text-xs font-bold outline-none" 
                    value={firstDueDate} 
                    onChange={e => setFirstDueDate(e.target.value)} 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed tracking-wider">
               Serão geradas {installments} parcelas de 
               <span className="text-slate-900 dark:text-white mx-1 text-sm">R$ {installmentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> 
               no seu contas a receber.
            </p>
          </div>
        </div>

        <div className="p-8 bg-slate-50 dark:bg-slate-900 border-t dark:border-slate-800 flex flex-col gap-3">
           <button 
             onClick={handleGenerate}
             disabled={isGenerating}
             className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-950/20 hover:bg-blue-700 transition-all disabled:opacity-50"
           >
             {isGenerating ? 'Gerando Parcelas...' : 'Confirmar Faturamento'}
           </button>
           <button 
             onClick={onClose}
             className="w-full py-4 rounded-2xl font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
           >
             Cancelar
           </button>
        </div>
      </div>
    </div>
  );
};

export default BillingModal;
