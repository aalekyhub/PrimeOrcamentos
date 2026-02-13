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
    React.useEffect(() => {
        if (isOpen) {
            // Give the browser a moment to render the content before optimizing
            const timer = setTimeout(() => {
                const optimizePageBreaks = (window as any).optimizePageBreaks;
                if (typeof optimizePageBreaks === 'function') {
                    optimizePageBreaks();
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen, htmlContent]);

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
                        margin: 20mm 15mm;
                        size: A4;
                    }
                    #report-preview-content {
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important; /* Margins handled by @page */
                        border: none !important;
                        box-shadow: none !important;
                    }
                    /* Ensure content breaks correctly */
                    tr { break-inside: avoid; }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }

                    /* Shared Rich Text / Quill Styles */
                    .ql-editor-print ul { list-style-type: disc !important; padding-left: 30px !important; margin: 12px 0 !important; }
                    .ql-editor-print ol { list-style-type: decimal !important; padding-left: 30px !important; margin: 12px 0 !important; }
                    .ql-editor-print li { display: list-item !important; margin-bottom: 4px !important; }
                    .ql-editor-print strong, .ql-editor-print b { font-weight: bold !important; color: #000 !important; }
                    .ql-editor-print h1, .ql-editor-print h2, .ql-editor-print h3, .ql-editor-print h4 { font-weight: 800 !important; color: #0f172a !important; margin-top: 20px !important; margin-bottom: 10px !important; break-after: avoid !important; }
                }
            `}</style>

            <script dangerouslySetInnerHTML={{
                __html: `
                function optimizePageBreaks() {
                    const content = document.getElementById('report-preview-content');
                    if (!content) return;

                    const allNodes = [];
                    Array.from(content.children).forEach(block => {
                        if (block.classList.contains('ql-editor-print')) {
                            allNodes.push(...Array.from(block.children));
                        } else {
                            allNodes.push(block);
                        }
                    });

                    for (let i = 0; i < allNodes.length - 1; i++) {
                        const el = allNodes[i];
                        let isTitle = false;

                        if (el.matches('h1, h2, h3, h4, h5, h6')) isTitle = true;
                        else if (el.tagName === 'P' || el.tagName === 'DIV' || el.tagName === 'STRONG') {
                            const text = el.innerText.trim();
                            const isNumbered = /^\\d+(\\.\\d+)*[\\.\\s\\)]/.test(text);
                            const isBold = el.querySelector('strong, b') || (el.style && parseInt(el.style.fontWeight) > 600) || el.tagName === 'STRONG';
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
                                el.parentNode.insertBefore(wrapper, el);
                                nodesToWrap.forEach(node => wrapper.appendChild(node));
                                i = j - 1;
                            }
                        }
                    }
                }

                // Call optimization when content changes
                const observer = new MutationObserver(optimizePageBreaks);
                const config = { childList: true, subtree: true };
                window.addEventListener('load', () => {
                    const target = document.getElementById('report-preview-content');
                    if (target) observer.observe(target, config);
                    optimizePageBreaks();
                });
            `}} />
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
