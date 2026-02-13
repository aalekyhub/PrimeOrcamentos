import React from 'react';
import { X, Printer, Download } from 'lucide-react';

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
        if (filename) document.title = filename;
        window.print();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #report-preview-wrapper, #report-preview-wrapper * {
                        visibility: visible;
                    }
                    #report-preview-wrapper {
                        position: fixed;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        z-index: 9999;
                        background: white;
                        display: block !important;
                    }
                    @page {
                        margin: 0;
                        size: A4;
                    }
                    #report-preview-content {
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 20mm 15mm !important;
                        border: none !important;
                        box-shadow: none !important;
                    }
                    /* Ensure content breaks correctly */
                    tr { break-inside: avoid; }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                }
            `}</style>
            <div id="report-preview-wrapper" className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10 no-print">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                        <p className="text-sm text-slate-500">Visualize as informações antes de gerar o PDF</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-bold shadow-md hover:shadow-lg active:scale-95"
                        >
                            <Printer size={18} />
                            IMPRIMIR
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all active:scale-90"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-10 flex justify-center">
                    <div
                        id="report-preview-content"
                        className="bg-white shadow-xl w-full max-w-[210mm] min-h-[297mm] p-[10mm] overflow-x-hidden border border-slate-200 rounded-sm prose prose-slate prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 z-10 no-print">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-all"
                    >
                        FECHAR
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-8 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-bold shadow-md hover:shadow-lg active:scale-95"
                    >
                        <Printer size={18} />
                        IMPRIMIR
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportPreview;
