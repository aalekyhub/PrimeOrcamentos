import React from 'react';
import { X, Paperclip, Download, Pencil, FileUp } from 'lucide-react';
import { AccountEntry, Transaction, FinancialCategory } from '../../types';
import { isAporte } from '../../services/financialHelpers';
import ReportPreview from '../ReportPreview';

interface FinancialModalsProps {
  editingItem: any;
  setEditingItem: (item: any) => void;
  viewingAttachment: { content: string, name: string } | null;
  setViewingAttachment: (viewer: any) => void;
  printData: { html: string, title: string, filename: string } | null;
  setPrintData: (data: any) => void;
  handleUpdateItem: (e: React.FormEvent) => Promise<void>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, isEditing?: boolean) => void;
  categories: FinancialCategory[];
}

const FinancialModals: React.FC<FinancialModalsProps> = ({
  editingItem,
  setEditingItem,
  viewingAttachment,
  setViewingAttachment,
  printData,
  setPrintData,
  handleUpdateItem,
  handleFileUpload,
  categories
}) => {
  return (
    <>
      {/* Attachment Viewer */}
      {viewingAttachment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <Paperclip className="text-blue-500" />
                <h3 className="font-bold text-slate-800 dark:text-white uppercase tracking-widest text-sm">{viewingAttachment.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewingAttachment.content}
                  download={viewingAttachment.name}
                  className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 text-xs font-bold uppercase"
                >
                  <Download className="w-4 h-4" /> Baixar
                </a>
                <button onClick={() => setViewingAttachment(null)} className="p-2 text-slate-400 hover:text-rose-500">
                  <X className="w-8 h-8" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100 dark:bg-black p-8 flex items-center justify-center">
              {viewingAttachment.content.startsWith('data:image/') ? (
                <img src={viewingAttachment.content} alt="Anexo" className="max-w-full h-auto rounded-lg shadow-lg" />
              ) : (
                <iframe src={viewingAttachment.content} className="w-full h-full min-h-[600px] border-none rounded-lg" title="Documento" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl relative">
            <button onClick={() => setEditingItem(null)} className="absolute top-6 right-6 text-slate-400 hover:text-rose-500">
              <X className="w-8 h-8" />
            </button>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-3">
              <Pencil className="text-blue-500" /> Editar Lançamento
            </h3>
            <form onSubmit={handleUpdateItem} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const isAcc = editingItem.isFromEntry || editingItem.id.startsWith('ENT-');
                        setEditingItem({ ...editingItem, type: isAcc ? 'RECEBER' : 'RECEITA' });
                      }}
                      className={`py-3 rounded-xl text-[10px] font-black border-2 transition-all uppercase ${['RECEITA', 'RECEBER'].includes(editingItem.type) ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-slate-50 border-transparent text-slate-400'}`}
                    >
                      ENTRADA
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const isAcc = editingItem.isFromEntry || editingItem.id.startsWith('ENT-');
                        setEditingItem({ ...editingItem, type: isAcc ? 'PAGAR' : 'DESPESA' });
                      }}
                      className={`py-3 rounded-xl text-[10px] font-black border-2 transition-all uppercase ${['DESPESA', 'PAGAR'].includes(editingItem.type) ? 'bg-rose-50 border-rose-500 text-rose-600' : 'bg-slate-50 border-transparent text-slate-400'}`}
                    >
                      SAÍDA
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-bold"
                    value={editingItem.amount}
                    onChange={e => setEditingItem({ ...editingItem, amount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Data</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-bold text-xs"
                    value={editingItem.date || editingItem.paymentDate || editingItem.dueDate}
                    onChange={e => {
                      const isAcc = editingItem.isFromEntry || editingItem.id.startsWith('ENT-');
                      if (isAcc) {
                        setEditingItem({ ...editingItem, paymentDate: e.target.value, date: e.target.value });
                      } else {
                        setEditingItem({ ...editingItem, date: e.target.value });
                      }
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Categoria</label>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-bold"
                    value={editingItem.category}
                    onChange={e => {
                      const newCatName = e.target.value;
                      const catObj = categories.find(c => c.name === newCatName);
                      const isContribution = isAporte(newCatName);
                      
                      let newType = editingItem.type;
                      if (isContribution) {
                        newType = 'INVESTIMENTO' as any;
                      } else if (catObj) {
                        newType = catObj.type === 'RECEITA' ? 'RECEBER' as any : 'PAGAR' as any;
                      }

                      setEditingItem({
                        ...editingItem,
                        category: newCatName,
                        type: newType
                      });
                    }}
                  >
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Descrição</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-bold"
                    value={editingItem.description}
                    onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input type="file" id="edit-file" className="hidden" onChange={(e) => handleFileUpload(e, true)} />
                  <label htmlFor="edit-file" className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-blue-400 transition-all">
                    <FileUp className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-black text-slate-400 uppercase">
                      {editingItem.attachment ? 'Alterar Anexo' : 'Adicionar Anexo'}
                    </span>
                  </label>
                </div>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-blue-700 transition-all">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Preview */}
      {printData && (
        <ReportPreview
          htmlContent={printData.html}
          title={printData.title}
          filename={printData.filename}
          onClose={() => setPrintData(null)}
        />
      )}
    </>
  );
};

export default FinancialModals;
