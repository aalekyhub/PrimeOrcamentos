import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    htmlContent: string;
    filename: string;
}

const ReportPreview: React.FC<Props> = ({ isOpen, onClose, title, htmlContent, filename }) => {
    const optimizePageBreaks = React.useCallback(() => {
        const content = document.getElementById('report-preview-content');
        if (!content) return;

        // Reset existing wrappers
        const wrappers = content.querySelectorAll('.keep-together');
        wrappers.forEach(w => {
            const parent = w.parentNode;
            if (parent) {
                while (w.firstChild) parent.insertBefore(w.firstChild, w);
                parent.removeChild(w);
            }
        });

        const allNodes: Element[] = [];
        Array.from(content.children).forEach(block => {
            if (block.classList.contains('ql-editor-print')) {
                allNodes.push(...Array.from(block.children) as Element[]);
            } else {
                allNodes.push(block);
            }
        });

        for (let i = 0; i < allNodes.length - 1; i++) {
            const el = allNodes[i];
            let isTitle = false;

            if (el.matches('h1, h2, h3, h4, h5, h6')) isTitle = true;
            else if (el.tagName === 'P' || el.tagName === 'DIV' || el.tagName === 'STRONG') {
                const text = el.textContent?.trim() || '';
                const isNumbered = /^\d+(\.\d+)*[\.\s\)]/.test(text);
                const style = window.getComputedStyle(el);
                const isBold = el.querySelector('strong, b') || parseInt(style.fontWeight) > 600 || el.tagName === 'STRONG';
                const isShort = text.length < 150;
                if ((isNumbered && isBold && isShort) || (isBold && isShort && text === text.toUpperCase() && text.length > 4)) {
                    isTitle = true;
                }
            }

            if (isTitle) {
                const nodesToWrap = [el];
                let j = i + 1;
                while (j < allNodes.length && nodesToWrap.length < 3) {
                    const next = allNodes[j];
                    if (next.matches('h1, h2, h3, h4, h5, h6')) break;
                    nodesToWrap.push(next);
                    j++;
                }

                if (nodesToWrap.length > 1) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'keep-together';
                    wrapper.style.breakInside = 'avoid';
                    wrapper.style.pageBreakInside = 'avoid';
                    wrapper.style.display = 'block';
                    el.parentNode?.insertBefore(wrapper, el);
                    nodesToWrap.forEach(node => wrapper.appendChild(node));
                    i = j - 1;
                }
            }
        }
    }, []);

    React.useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                optimizePageBreaks();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen, htmlContent, optimizePageBreaks]);

    if (!isOpen) return null;

    const handlePrint = () => {
        if (filename) {
            const originalTitle = document.title;
            document.title = filename.replace('.pdf', '');
            window.print();
            setTimeout(() => { document.title = originalTitle; }, 1000);
        } else {
            window.print();
        }
    };

    const modalContent = (
        <div id="print-modal-portal" className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <style>{`
                @media print {
                    #root, .no-print, #print-modal-portal header, #print-modal-portal .no-print {
                        display: none !important;
                    }

                    body {
                        visibility: hidden !important;
                        background: white !important;
                    }

                    html, body {
                        height: auto !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        position: static !important;
                    }

                    #print-modal-portal {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        background: white !important;
                        visibility: visible !important;
                        display: block !important;
                        padding: 0 !important;
                        z-index: auto !important;
                    }

                    #report-preview-wrapper {
                        position: relative !important;
                        width: 100% !important;
                        max-width: none !important;
                        height: auto !important;
                        margin: 0 !important;
                        display: block !important;
                        box-shadow: none !important;
                        border: none !important;
                        visibility: visible !important;
                    }

                    #report-preview-wrapper > div {
                        height: auto !important;
                        overflow: visible !important;
                        padding: 0 !important;
                        display: block !important;
                        visibility: visible !important;
                    }

                    #report-preview-content {
                        visibility: visible !important;
                        display: block !important;
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        overflow: visible !important;
                    }

                    @page { margin: 15mm; size: A4; }

                    tr { page-break-inside: avoid !important; }
                    thead { display: table-header-group !important; }

                    .ql-editor-print ul { list-style-type: disc !important; padding-left: 30px !important; }
                    .ql-editor-print ol { list-style-type: decimal !important; padding-left: 30px !important; }
                    .ql-editor-print h1, .ql-editor-print h2, .ql-editor-print h3, .ql-editor-print h4 { 
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                    }
                }

                /* UI Styles (Aesthetics) */
                #report-preview-content {
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    color: #1e293b;
                    line-height: 1.5;
                }

                #report-preview-content table { 
                    border-collapse: collapse; 
                    width: 100%; 
                    margin-bottom: 24px;
                    border: none !important;
                }

                #report-preview-content th {
                    background: #f8fafc;
                    color: #64748b;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    text-align: left;
                    padding: 12px 0;
                    border-bottom: 2px solid #e2e8f0;
                }

                #report-preview-content td {
                    padding: 12px 0;
                    font-size: 11px;
                    border-bottom: 1px solid #f1f5f9;
                }

                #report-preview-content h1, 
                #report-preview-content h2, 
                #report-preview-content h3 {
                    color: #1e3a8a;
                    margin-top: 2em;
                    margin-bottom: 1em;
                }

                .keep-together {
                    display: block;
                    width: 100%;
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
                        className="bg-white shadow-xl w-full max-w-[210mm] min-h-[297mm] p-[15mm] overflow-x-hidden rounded-sm"
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

    return createPortal(modalContent, document.body);
};

export default ReportPreview;
