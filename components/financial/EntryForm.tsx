import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  FileUp,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Tag,
  Search
} from 'lucide-react';
import { AccountEntry, FinancialCategory, FinancialAccount } from '../../types';

interface EntryFormProps {
  initialData?: Partial<AccountEntry>;
  categories: FinancialCategory[];
  accounts: FinancialAccount[];
  onSubmit: (data: Partial<AccountEntry>, accountId?: string) => void;
  onClose: () => void;
  title: string;
}

const EntryForm: React.FC<EntryFormProps> = ({
  initialData,
  categories,
  accounts,
  onSubmit,
  onClose,
  title
}) => {
  const [formData, setFormData] = useState<Partial<AccountEntry>>({
    type: 'PAGAR',
    status: 'PENDENTE',
    dueDate: new Date().toISOString().split('T')[0],
    amount: 0,
    category: categories[0]?.name || 'Geral',
    description: '',
    ...initialData
  });

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, attachment: reader.result as string, attachmentName: file.name });
    };
    reader.readAsDataURL(file);
  };

  const isAporte = (catName: string) => {
    const cat = categories.find(c => c.name === catName);
    return cat?.nature === 'APORTE' || cat?.nature === 'EMPRESTIMO' || 
           catName.toLowerCase().includes('aporte') || 
           catName.toLowerCase().includes('emprestimo');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-700">
        <button 
          onClick={onClose} 
          className="absolute top-8 right-8 text-slate-400 hover:text-rose-500 transition-colors"
        >
          <X className="w-8 h-8" />
        </button>
        
        <div className="mb-10">
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">{title}</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Preencha os detalhes do lançamento financeiro</p>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData, selectedAccountId); }} className="space-y-6">
           <div className="grid grid-cols-2 gap-6">
              {/* Tipo de Operação */}
              <div className="col-span-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Tipo de Operação</label>
                 <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'RECEITA', label: 'Receita', icon: ArrowUpRight, color: 'emerald' },
                      { id: 'PAGAR', label: 'Despesa', icon: ArrowDownLeft, color: 'rose' },
                      { id: 'INVESTIMENTO', label: 'Aporte', icon: Coins, color: 'indigo' }
                    ].map(t => (
                      <button 
                        key={t.id} 
                        type="button" 
                        onClick={() => {
                          const isInv = t.id === 'INVESTIMENTO';
                          const aporteCat = categories.find(c => isAporte(c.name))?.name || 'Aporte de Sócios';
                          setFormData({
                            ...formData, 
                            type: t.id as any,
                            category: isInv ? aporteCat : formData.category
                          });
                        }} 
                        className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all flex flex-col items-center gap-2 ${
                          formData.type === t.id 
                            ? `bg-slate-900 text-white border-slate-900 shadow-xl scale-[1.02]` 
                            : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100 dark:bg-slate-900/50'
                        }`}
                      >
                        <t.icon className="w-4 h-4" />
                        {t.label}
                      </button>
                    ))}
                 </div>
              </div>

              {/* Descrição */}
              <div className="col-span-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Descrição do Lançamento</label>
                 <div className="relative">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                   <input 
                    type="text" 
                    required 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="w-full bg-slate-50 dark:bg-slate-900/50 p-4 pl-12 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" 
                    placeholder="Ex: Pagamento Fornecedor X, Venda de Serviço..." 
                   />
                 </div>
              </div>

              {/* Valor */}
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Valor (R$)</label>
                 <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">R$</div>
                   <input 
                    type="number" 
                    step="0.01" 
                    required 
                    value={formData.amount || ''} 
                    onChange={e => setFormData({...formData, amount: Number(e.target.value)})} 
                    className="w-full bg-slate-50 dark:bg-slate-900/50 p-4 pl-10 rounded-2xl text-sm font-black border-none outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" 
                   />
                 </div>
              </div>

              {/* Vencimento */}
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Vencimento</label>
                 <div className="relative">
                   <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                   <input 
                    type="date" 
                    required 
                    value={formData.dueDate} 
                    onChange={e => setFormData({...formData, dueDate: e.target.value})} 
                    className="w-full bg-slate-50 dark:bg-slate-900/50 p-4 pl-12 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" 
                   />
                 </div>
              </div>

              {/* Categoria */}
              <div className="col-span-2 sm:col-span-1 text-slate-900 dark:text-white">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Categoria</label>
                 <div className="relative">
                   <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                   <select 
                    value={formData.category} 
                    onChange={e => {
                      const catName = e.target.value;
                      const isInv = isAporte(catName);
                      setFormData({
                        ...formData, 
                        category: catName,
                        type: isInv ? 'INVESTIMENTO' : formData.type
                      });
                    }} 
                    className="w-full bg-slate-50 dark:bg-slate-900/50 p-4 pl-12 rounded-2xl text-[11px] font-black border-none outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-widest appearance-none cursor-pointer"
                   >
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                   </select>
                 </div>
              </div>

              {/* Conta Bancária (Se for Investimento/Imediato) */}
              {formData.type === 'INVESTIMENTO' && !initialData?.id && (
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 block">Banco Destino</label>
                  <select 
                    required 
                    value={selectedAccountId} 
                    onChange={e => setSelectedAccountId(e.target.value)} 
                    className="w-full bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl text-[11px] font-black border border-indigo-100 dark:border-indigo-900/30 outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-widest text-indigo-700 dark:text-indigo-300"
                  >
                    <option value="">Selecionar Conta...</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} - R$ {acc.currentBalance.toLocaleString('pt-BR')}</option>)}
                  </select>
                </div>
              )}

              {/* Anexo */}
              <div className="col-span-2">
                 <div className="relative group/file">
                   <input type="file" id="entry-file" className="hidden" onChange={handleFileUpload} />
                   <label 
                    htmlFor="entry-file" 
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                      formData.attachment 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 text-blue-600' 
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-blue-400'
                    }`}
                   >
                      <div className="flex items-center gap-3">
                         <FileUp className="w-5 h-5" />
                         <span className="text-[10px] font-black uppercase tracking-widest">
                           {formData.attachmentName || 'Anexar Comprovante / PDF'}
                         </span>
                      </div>
                      {formData.attachment && (
                        <button 
                          type="button" 
                          onClick={(e) => { e.preventDefault(); setFormData({...formData, attachment: undefined, attachmentName: undefined}); }}
                          className="p-2 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                   </label>
                 </div>
              </div>
           </div>

           <div className="flex gap-4 pt-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all border border-slate-100 dark:border-slate-700"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="flex-[2] py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {initialData?.id ? 'Salvar Alterações' : formData.type === 'INVESTIMENTO' ? 'Registrar Aporte' : 'Confirmar Lançamento'}
              </button>
           </div>
        </form>
      </div>
    </div>
  );
};

export default EntryForm;
