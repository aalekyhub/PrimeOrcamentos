import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
// No longer using html2pdf.js for better fidelity

interface Props {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    htmlContent: string;
    filename: string;
}

const ReportPreview: React.FC<Props> = ({
    isOpen,
    onClose,
    title,
    htmlContent,
    filename
}) => {
    const [zoom, setZoom] = React.useState(100);
    const previewRef = React.useRef<HTMLDivElement | null>(null);

    if (!isOpen) return null;

    const safeFileName = (name?: string) => {
        const base = (name || 'RELATORIO')
            .replace(/\.pdf$/i, '')
            .replace(/[\\/:*?"<>|]+/g, '')
            .trim();

        return `${base || 'RELATORIO'}.pdf`;
    };

    // Iframe printing method is self-contained

    const handlePrint = async () => {
        try {
            const originalTitle = document.title;
            const tempTitle = safeFileName(filename).replace(/\.pdf$/i, '');
            document.title = tempTitle;

            // Create a hidden iframe
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);

            const iframeDoc = iframe.contentWindow?.document;
            if (!iframeDoc) throw new Error('Could not create print iframe');

            // Build the full HTML for the iframe
            // We use the same styles used for PDF generation in the services
            iframeDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${tempTitle}</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap" rel="stylesheet">
                    <style>
                        @page {
                            size: A4;
                            margin: 0;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                            background: white;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        * {
                            box-sizing: border-box;
                        }
                        /* Ensure the content fits A4 perfectly */
                        .pdf-page-content {
                            width: 210mm;
                            margin: 0 auto;
                            background: white;
                        }
                        /* Support for the structural divs from services */
                        .pdf-page-content > div {
                            padding: 15mm !important;
                            min-height: 297mm;
                            page-break-after: always;
                            break-after: always;
                        }
                        /* Avoid empty page at the end if the last div has page-break-after */
                        .pdf-page-content > div:last-child {
                            page-break-after: auto;
                            break-after: auto;
                        }
                        
                        /* Standard Table Styles for all Documents */
                        table {
                            width: 100% !important;
                            border-collapse: collapse !important;
                        }
                        td, th {
                            word-break: break-word;
                        }
                        .avoid-break {
                            break-inside: avoid !important;
                            page-break-inside: avoid !important;
                        }
                    </style>
                </head>
                <body>
                    <div class="pdf-page-content">
                        ${htmlContent}
                    </div>
                    <script>
                        // Wait for images and Tailwind to finish
                        window.onload = () => {
                            setTimeout(() => {
                                window.print();
                                setTimeout(() => {
                                    window.parent.document.title = "${originalTitle}";
                                }, 100);
                            }, 500);
                        };
                    </script>
                </body>
                </html>
            `);
            iframeDoc.close();

            // Cleanup after printing (or if user cancels)
            // We give it some time to ensure the print dialog is handled
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 2000);

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            window.print();
        }
    };

    const modalContent = (
        <div
            id="print-modal-portal"
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }

                    #report-preview-content,
                    #report-preview-content * {
                        visibility: visible !important;
                    }

                    #report-preview-content {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        box-shadow: none !important;
                        border: none !important;
                        overflow: visible !important;
                    }

                    .no-print {
                        display: none !important;
                    }

                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                        height: auto !important;
                        overflow: visible !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    @page {
                        size: A4;
                        margin: 8mm;
                    }
                }

                #report-preview-viewport {
                    flex: 1;
                    overflow: auto;
                    background: #e2e8f0;
                    padding: 40px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                #report-preview-content {
                    transform-origin: top center;
                    transition: transform 0.2s ease-in-out;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: fit-content;
                }

                /* Simulated Page Blocks */
                .pdf-page-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 30px;
                }

                /* Cada div direta dentro de pdf-page-content vira uma folha A4 */
                .pdf-page-content > div {
                    background: white;
                    width: 210mm;
                    min-height: 297mm;
                    padding: 15mm !important;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                    position: relative;
                    box-sizing: border-box;
                }

                #report-preview-content table {
                    border-collapse: collapse;
                    width: 100%;
                    margin-bottom: 20px;
                }

                #report-preview-content th {
                    background: #f8fafc;
                    color: #64748b !important;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    padding: 10px 8px;
                    border-bottom: 2px solid #e2e8f0;
                    text-align: left;
                }

                #report-preview-content td {
                    padding: 10px 8px;
                    font-size: 11px;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: top;
                }

                #report-preview-content img {
                    max-width: 100%;
                    height: auto;
                    display: block;
                }
            `}</style>

            <div
                id="report-preview-wrapper"
                className="bg-slate-200 dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
            >
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10 no-print">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Ambiente de Visualização Profissional
                        </p>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Zoom Toolbar */}
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
                            <button
                                onClick={() => setZoom(Math.max(30, zoom - 10))}
                                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors text-slate-600 dark:text-slate-300"
                                title="Afastar"
                            >
                                <ZoomOut size={18} />
                            </button>
                            <span className="text-xs font-bold text-slate-500 w-12 text-center">
                                {zoom}%
                            </span>
                            <button
                                onClick={() => setZoom(Math.min(200, zoom + 10))}
                                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors text-slate-600 dark:text-slate-300"
                                title="Aproximar"
                            >
                                <ZoomIn size={18} />
                            </button>
                            <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1" />
                            <button
                                onClick={() => setZoom(100)}
                                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors text-slate-600 dark:text-slate-300"
                                title="Resetar Zoom"
                            >
                                <Maximize size={18} />
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-bold shadow-md hover:shadow-lg active:scale-95"
                            >
                                <Printer size={18} />
                                EXPORTAR PDF
                            </button>

                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all active:scale-90"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                </div>

                <div id="report-preview-viewport">
                    <div
                        ref={previewRef}
                        id="report-preview-content"
                        style={{ transform: `scale(${zoom / 100})` }}
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                </div>

                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end z-10 no-print">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                    >
                        FECHAR
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default ReportPreview;
