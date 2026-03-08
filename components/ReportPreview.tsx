import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import html2pdf from 'html2pdf.js';

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

    const buildPdfContainer = () => {
        const tempWrapper = document.createElement('div');
        tempWrapper.id = 'pdf-export-container';

        tempWrapper.style.position = 'fixed';
        tempWrapper.style.left = '-100000px';
        tempWrapper.style.top = '0';
        tempWrapper.style.width = '210mm';
        tempWrapper.style.background = '#ffffff';
        tempWrapper.style.zIndex = '-1';
        tempWrapper.style.opacity = '1';
        tempWrapper.style.pointerEvents = 'none';
        tempWrapper.style.boxSizing = 'border-box';

        tempWrapper.innerHTML = `
            <style>
                #pdf-export-container,
                #pdf-export-container * {
                    box-sizing: border-box;
                }

                #pdf-export-container .pdf-page-content {
                    width: 100%;
                    background: #ffffff;
                    color: #1e293b;
                    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    line-height: 1.45;
                    font-size: 12px;
                    padding: 8mm;
                    overflow: visible;
                    word-break: break-word;
                }

                #pdf-export-container h1,
                #pdf-export-container h2,
                #pdf-export-container h3,
                #pdf-export-container h4,
                #pdf-export-container h5,
                #pdf-export-container h6 {
                    break-after: avoid-page;
                    page-break-after: avoid;
                    break-inside: avoid;
                    page-break-inside: avoid;
                    margin-top: 0;
                }

                #pdf-export-container p,
                #pdf-export-container li,
                #pdf-export-container blockquote {
                    orphans: 3;
                    widows: 3;
                }

                #pdf-export-container table {
                    width: 100%;
                    border-collapse: collapse;
                    page-break-inside: auto;
                    break-inside: auto;
                }

                #pdf-export-container thead {
                    display: table-header-group;
                }

                #pdf-export-container tfoot {
                    display: table-footer-group;
                }

                #pdf-export-container tr,
                #pdf-export-container td,
                #pdf-export-container th {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }

                #pdf-export-container th {
                    background: #f8fafc;
                    color: #64748b;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    text-align: left;
                    padding: 10px 8px;
                    border-bottom: 2px solid #e2e8f0;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }

                #pdf-export-container td {
                    padding: 10px 8px;
                    font-size: 11px;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: top;
                }

                #pdf-export-container img {
                    max-width: 100%;
                    height: auto;
                    display: block;
                    page-break-inside: avoid;
                    break-inside: avoid;
                }

                #pdf-export-container .report-header,
                #pdf-export-container .report-footer,
                #pdf-export-container .keep-together,
                #pdf-export-container .signature-block,
                #pdf-export-container .section,
                #pdf-export-container .card,
                #pdf-export-container .box {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }

                #pdf-export-container .page-break {
                    page-break-before: always;
                    break-before: page;
                }
            </style>
            <div class="pdf-page-content">
                ${htmlContent}
            </div>
        `;

        document.body.appendChild(tempWrapper);
        return tempWrapper;
    };

    const waitForImages = async (container: HTMLElement) => {
        const images = Array.from(container.querySelectorAll('img'));

        if (images.length === 0) return;

        await Promise.all(
            images.map((img) => {
                return new Promise<void>((resolve) => {
                    if (img.complete) {
                        resolve();
                        return;
                    }

                    const done = () => resolve();

                    img.addEventListener('load', done, { once: true });
                    img.addEventListener('error', done, { once: true });

                    setTimeout(() => resolve(), 4000);
                });
            })
        );
    };

    const handlePrint = async () => {
        let tempContainer: HTMLElement | null = null;

        try {
            tempContainer = buildPdfContainer();

            await waitForImages(tempContainer);

            const element = tempContainer.querySelector('.pdf-page-content') as HTMLElement | null;
            if (!element) throw new Error('Conteúdo do PDF não encontrado.');

            const originalTitle = document.title;
            document.title = safeFileName(filename).replace(/\.pdf$/i, '');

            const opt = {
                margin: [0, 0, 0, 0],
                filename: safeFileName(filename),
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    scrollX: 0,
                    scrollY: 0
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait'
                },
                pagebreak: {
                    mode: ['css', 'legacy']
                }
            };

            // @ts-ignore
            await html2pdf().set(opt).from(element).save();

            setTimeout(() => {
                document.title = originalTitle;
            }, 300);
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            window.print();
        } finally {
            if (tempContainer && tempContainer.parentNode) {
                tempContainer.parentNode.removeChild(tempContainer);
            }
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
