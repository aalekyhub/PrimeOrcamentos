import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    htmlContent: string;
    filename: string;
}

const ReportPreview: React.FC<Props> = ({ isOpen, onClose, title, htmlContent, filename }) => {
    if (!isOpen) return null;

    const handlePrint = () => {
        const element = document.getElementById('report-preview-content');
        if (!element) return;

        const opt = {
            margin: [10, 10, 10, 10] as [number, number, number, number],
            filename: filename,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
            pagebreak: { mode: ['avoid-all' as 'avoid-all', 'css', 'legacy'] }
        };

        html2pdf().set(opt).from(element).save();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                            <Printer size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">{title}</h3>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Pré-visualização do Documento</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Download size={16} /> GERAR PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-slate-200 p-8 scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-transparent">
                    <div
                        id="report-preview-content"
                        className="bg-white shadow-xl mx-auto min-h-[297mm] w-[210mm] p-[10mm]"
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-100 bg-white flex justify-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Confira os dados antes de gerar o arquivo final</p>
                </div>
            </div>
        </div>
    );
};

export default ReportPreview;
