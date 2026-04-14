import React from 'react';
import { Plus, FileUp } from 'lucide-react';
import { AccountEntry, FinancialCategory } from '../../types';
import { isAporte } from '../../services/financialHelpers';
import { useNotify } from '../ToastProvider';

interface FinancialEntryFormProps {
  formData: Partial<AccountEntry>;
  setFormData: (data: any) => void;
  setShowEntryForm: (show: boolean) => void;
  handleAddEntry: (e: React.FormEvent) => Promise<void>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  categories: FinancialCategory[];
}

const FinancialEntryForm: React.FC<FinancialEntryFormProps> = ({
  formData,
  setFormData,
  setShowEntryForm,
  handleAddEntry,
  handleFileUpload,
  categories
}) => {
  const { notify } = useNotify();

  return (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border-2 border-blue-100 dark:border-blue-900 shadow-xl space-y-6 animate-in slide-in-from-top-4 duration-300 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b dark:border-slate-700 pb-4">
        <h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-widest">Novo Lançamento Provisionado</h4>
        <button onClick={() => setShowEntryForm(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
          <Plus className="w-6 h-6 rotate-45" />
        </button>
      </div>

      <form onSubmit={handleAddEntry} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Tipo de Lançamento</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'RECEITA' as any })}
                className={`py-3 px-2 rounded-xl text-[10px] font-black border-2 transition-all uppercase tracking-tighter ${formData.type === 'RECEITA' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-slate-50 border-transparent text-slate-400 opacity-60'}`}
              >
                A RECEBER
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'PAGAR' as any })}
                className={`py-3 px-2 rounded-xl text-[10px] font-black border-2 transition-all uppercase tracking-tighter ${formData.type === 'PAGAR' ? 'bg-rose-50 border-rose-500 text-rose-600' : 'bg-slate-50 border-transparent text-slate-400 opacity-60'}`}
              >
                A PAGAR
              </button>
              <button
                type="button"
                onClick={() => {
                  const aporteCat = categories.find(c => isAporte(c.name))?.name || 'Aporte de Sócios';
                  setFormData({ ...formData, type: 'INVESTIMENTO' as any, category: aporteCat });
                  notify("Tipo Investimento: Categoria ajustada automaticamente.");
                }}
                className={`py-3 px-2 rounded-xl text-[10px] font-black border-2 transition-all uppercase tracking-tighter ${formData.type === 'INVESTIMENTO' ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-slate-50 border-transparent text-slate-400 opacity-60'}`}
              >
                EMPRÉSTIMO
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Valor (R$)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
              <input
                type="number"
                step="0.01"
                required
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 pl-12 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                value={formData.amount || ''}
                onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Vencimento</label>
            <input
              type="date"
              required
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
              value={formData.dueDate}
              onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Descrição / Histórico</label>
            <input
              type="text"
              placeholder="Ex: Compra de materiais, Aluguel Abril..."
              required
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Categoria</label>
            <select
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
              value={formData.category}
              onChange={e => {
                const newCatName = e.target.value;
                const catObj = categories.find(c => c.name === newCatName);
                const isContribution = isAporte(newCatName);
                
                let newType = formData.type;
                if (isContribution) {
                  newType = 'INVESTIMENTO' as any;
                } else if (catObj) {
                  newType = catObj.type === 'RECEITA' ? 'RECEBER' as any : 'PAGAR' as any;
                }

                setFormData({
                  ...formData,
                  category: newCatName,
                  type: newType
                });
                
                if (isContribution) notify("Categoria de Aporte: Tipo ajustado para Empréstimo.");
                else if (catObj) notify(`Tipo ajustado para ${catObj.type === 'RECEITA' ? 'A Receber' : 'A Pagar'} baseado na categoria.`);
              }}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-3">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">
              {formData.type === 'INVESTIMENTO' ? 'Sócio / Origem (Opcional)' : formData.type === 'RECEITA' ? 'Cliente (Opcional)' : 'Fornecedor (Opcional)'}
            </label>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder={formData.type === 'INVESTIMENTO' ? 'Nome do Sócio ou Origem...' : formData.type === 'RECEITA' ? 'Nome do Cliente...' : 'Nome do Fornecedor...'}
                className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                value={formData.type === 'RECEITA' ? (formData.customerName || '') : (formData.supplierName || '')}
                onChange={e => formData.type === 'RECEITA' ? setFormData({ ...formData, customerName: e.target.value }) : setFormData({ ...formData, supplierName: e.target.value })}
              />
              <div className="relative">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e)}
                  accept="image/*,application/pdf"
                />
                <label
                  htmlFor="file-upload"
                  className={`h-full px-4 rounded-xl flex items-center gap-2 cursor-pointer transition-all border-2 border-dashed ${formData.attachment ? 'bg-blue-50 border-blue-400 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-blue-300'}`}
                >
                  <FileUp className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase">
                    {formData.attachment ? 'Arquivo Pronto' : 'Anexo'}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 gap-4">
          <button
            type="button"
            onClick={() => setShowEntryForm(false)}
            className="px-8 py-3.5 rounded-xl text-xs font-black uppercase text-slate-400 hover:bg-slate-50 transition-all tracking-widest"
          >
            Descartar
          </button>
          <button
            type="submit"
            className="bg-blue-600 text-white px-10 py-3.5 rounded-xl text-xs font-black shadow-lg hover:bg-blue-700 transition-all uppercase tracking-widest"
          >
            {formData.type === 'INVESTIMENTO' ? 'Registrar Empréstimo' : 'Provisionar Lançamento'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FinancialEntryForm;
