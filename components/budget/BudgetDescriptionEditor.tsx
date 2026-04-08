import React from 'react';
import { Type, Image as ImageIcon, Trash2, Upload, X } from 'lucide-react';
import RichTextEditor from '../ui/RichTextEditor';
import { DescriptionBlock } from '../../types';
import { compressImage } from '../../services/imageUtils';
import { useNotify } from '../ToastProvider';

interface BudgetDescriptionEditorProps {
    blocks: DescriptionBlock[];
    setBlocks: React.Dispatch<React.SetStateAction<DescriptionBlock[]>>;
}

const BudgetDescriptionEditor: React.FC<BudgetDescriptionEditorProps> = ({ blocks = [], setBlocks }) => {
    const notify = useNotify();

    const addTextBlock = () => setBlocks([...blocks, { id: Date.now().toString(), type: 'text', content: '' }]);

    const addImageBlock = () => setBlocks([...blocks, { id: Date.now().toString(), type: 'image', content: '' }]);

    const updateBlockContent = (id: string, content: string) =>
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));

    const updateBlockTitle = (id: string, title: string) =>
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, title } : b));

    const updateBlockCaption = (id: string, caption: string) =>
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, caption } : b));

    const removeBlock = (id: string) =>
        setBlocks(prev => prev.filter(b => b.id !== id));

    const handleImageUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressedBase64 = await compressImage(file);
                updateBlockContent(id, compressedBase64);
            } catch (error) {
                console.error("Erro ao comprimir imagem:", error);
                notify("Erro ao processar imagem. Tente uma menor.", "error");
            }
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b dark:border-slate-800 pb-2 grow mr-6">DESCRIÇÃO TÉCNICA</h4>
            </div>
            <div className="space-y-3 budget-description-container">
                {(!blocks || blocks.length === 0) && (
                    <div className="bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center gap-4 group hover:border-blue-400 transition-colors cursor-pointer" onClick={addTextBlock}>
                        <div className="flex gap-4">
                            <button onClick={(e) => { e.stopPropagation(); addTextBlock(); }} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-md shadow-blue-950/20 hover:scale-105 transition-all">
                                <Type className="w-4 h-4" /> + Iniciar com Texto
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); addImageBlock(); }} className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-md shadow-emerald-950/20 hover:scale-105 transition-all">
                                <ImageIcon className="w-4 h-4" /> + Iniciar com Imagem
                            </button>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2 animate-pulse">Comece a montar o escopo tecnico acima</p>
                    </div>
                )}

                {blocks && blocks.map((block) => (
                    <div key={block.id} className="relative group">
                        {block.type === 'text' && (
                            <div className="flex-1">
                                <RichTextEditor
                                    id={block.id}
                                    value={block.content}
                                    onChange={(content) => updateBlockContent(block.id, content)}
                                    onAddText={addTextBlock}
                                    onAddImage={addImageBlock}
                                    placeholder="Descreva aqui os detalhes técnicos do serviço..."
                                />
                            </div>
                        )}
                        {block.type === 'image' && (
                            <div className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center gap-4">
                                <input 
                                    type="text" 
                                    placeholder="Título acima da foto (ex: Situação Atual)"
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-xs font-black text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-tight"
                                    value={block.title || ''}
                                    onChange={(e) => updateBlockTitle(block.id, e.target.value)}
                                />
                                <div className="w-full flex flex-col items-center justify-center min-h-[140px] border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 gap-2 bg-white/50 dark:bg-slate-950/20">
                                    {block.content ? (
                                        <div className="relative max-w-[400px]">
                                            <img src={block.content} className="w-full h-auto rounded-lg shadow-xl" alt="Uploaded representation" />
                                            <button onClick={() => updateBlockContent(block.id, '')} className="absolute -top-2 -right-2 bg-rose-500 text-white p-2 rounded-full shadow-lg hover:bg-rose-600 transition-colors z-20">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer flex flex-col items-center gap-3 py-6 w-full">
                                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-full border border-blue-100 dark:border-blue-900/30">
                                                <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="text-center">
                                                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest block mb-1">Upload da Evidência Fotográfica</span>
                                                <span className="text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Clique para selecionar uma imagem (JPG, PNG)</span>
                                            </div>
                                            <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(block.id, e)} />
                                        </label>
                                    )}
                                </div>
                                <textarea
                                    placeholder="Legenda descritiva abaixo da foto (ex: Detalhe das fissuras na manta aluminizada)"
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500 resize-none h-16 leading-relaxed"
                                    value={block.caption || ''}
                                    onChange={(e) => updateBlockCaption(block.id, e.target.value)}
                                />
                            </div>
                        )}
                        <button
                            onClick={() => removeBlock(block.id)}
                            className="absolute -top-2 -right-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default React.memo(BudgetDescriptionEditor);
