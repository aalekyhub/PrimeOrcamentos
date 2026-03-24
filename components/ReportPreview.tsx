import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import DOMPurify from 'dompurify';

interface Props {
    onClose: () => void;
    title: string;
    htmlContent: string;
    filename?: string;
}

const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const DEFAULT_ZOOM = 100;

const safeFileName = (name?: string): string => {
    const normalized = (name || 'RELATORIO')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\.pdf$/i, '')
        .replace(/[\\/:*?"<>|]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const base = (normalized || 'RELATORIO').slice(0, 120);
    return `${base}.pdf`;
};

const REPORT_PREVIEW_STYLES = `
    /* =========================
       VISUALIZAÇÃO EM TELA (PREVIEW)
    ========================== */

    #report-preview-backdrop {
        animation: reportPreviewFadeIn 0.18s ease-out;
    }

    @keyframes reportPreviewFadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    #report-preview-wrapper {
        animation: reportPreviewScaleIn 0.18s ease-out;
    }

    @keyframes reportPreviewScaleIn {
        from {
            opacity: 0;
            transform: translateY(8px) scale(0.985);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    #report-preview-viewport {
        flex: 1;
        overflow: auto;
        background: #cbd5e1;
        padding: 60px 40px;
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
        max-width: 100%;
    }

    .pdf-page-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 30px;
        width: 100%;
    }

    .pdf-page-content > div {
        background: white !important;
        width: 210mm !important;
        min-height: 297mm !important;
        padding: 15mm !important;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        position: relative;
        box-sizing: border-box;
        color: #1e293b;
        font-family: Inter, Arial, sans-serif;
        overflow: hidden;
    }

    .avoid-break {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
    }

    .force-page-break {
        page-break-before: always !important;
        break-before: page !important;
    }

    .report-header {
        width: 100%;
        margin-bottom: 20px;
    }

    .report-footer {
        width: 100%;
        margin-top: 20px;
    }

    #report-preview-content table {
        border-collapse: collapse;
        width: 100%;
    }

    #report-preview-content img {
        max-width: 100%;
        height: auto;
    }

    #report-preview-viewport::-webkit-scrollbar {
        width: 10px;
        height: 10px;
    }

    #report-preview-viewport::-webkit-scrollbar-track {
        background: transparent;
    }

    #report-preview-viewport::-webkit-scrollbar-thumb {
        background: #94a3b8;
        border-radius: 10px;
        border: 2px solid #cbd5e1;
    }

    .pdf-page-content p,
    .pdf-page-content .ql-editor-print p {
        margin-top: 0 !important;
        margin-bottom: 10px !important;
        line-height: 1.15 !important;
    }

    .pdf-page-content h1,
    .pdf-page-content h2,
    .pdf-page-content h3,
    .pdf-page-content h4,
    .pdf-page-content h5,
    .pdf-page-content h6 {
        margin-top: 15px !important;
        margin-bottom: 5px !important;
        line-height: 1.2 !important;
    }

    .pdf-page-content ul {
        list-style-type: disc !important;
        margin-top: 0 !important;
        margin-bottom: 8px !important;
        padding-left: 1.25em !important;
    }

    .pdf-page-content ol {
        list-style-type: decimal !important;
        margin-top: 0 !important;
        margin-bottom: 8px !important;
        padding-left: 1.25em !important;
    }

    .pdf-page-content li {
        padding-left: 0.25em !important;
        margin-bottom: 2px !important;
        line-height: 1.4 !important;
    }

    .pdf-page-content > div > *:first-child {
        margin-top: 0 !important;
    }

    /* =========================
       ESTILOS DE IMPRESSÃO
    ========================== */

    @media print {
        html,
        body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
        }

        body > *:not(#print-modal-portal) {
            display: none !important;
        }

        #print-modal-portal {
            position: static !important;
            inset: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            display: block !important;
            overflow: visible !important;
            backdrop-filter: none !important;
        }

        #report-preview-wrapper {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            height: auto !important;
            width: auto !important;
            max-width: none !important;
            display: block !important;
            background: white !important;
            overflow: visible !important;
        }

        .no-print,
        .sticky,
        #report-preview-wrapper > div:first-child,
        #report-preview-wrapper > div:last-child {
            display: none !important;
        }

        #report-preview-viewport {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
        }

        #report-preview-content {
            transform: none !important;
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        .pdf-page-content {
            gap: 0 !important;
            display: block !important;
            width: 100% !important;
        }

        .pdf-page-content > div {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: auto !important;
            max-width: none !important;
            page-break-after: always !important;
            break-after: page !important;
            display: block !important;
            box-sizing: border-box !important;
            background: white !important;
            overflow: visible !important;
        }

        .pdf-page-content > div:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
        }

        .pdf-page-content p,
        .pdf-page-content .ql-editor-print p {
            margin-top: 0 !important;
            margin-bottom: 10px !important;
            line-height: 1.15 !important;
        }

        .pdf-page-content h1,
        .pdf-page-content h2,
        .pdf-page-content h3,
        .pdf-page-content h4,
        .pdf-page-content h5,
        .pdf-page-content h6 {
            margin-top: 15px !important;
            margin-bottom: 5px !important;
            line-height: 1.2 !important;
        }

        .pdf-page-content ul {
            list-style-type: disc !important;
            margin-top: 0 !important;
            margin-bottom: 8px !important;
            padding-left: 1.25em !important;
        }

        .pdf-page-content ol {
            list-style-type: decimal !important;
            margin-top: 0 !important;
            margin-bottom: 8px !important;
            padding-left: 1.25em !important;
        }

        .pdf-page-content li {
            padding-left: 0.25em !important;
            margin-bottom: 2px !important;
            line-height: 1.4 !important;
        }

        .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
        }

        .force-page-break {
            page-break-before: always !important;
            break-before: page !important;
        }
    }

    @media (max-width: 768px) {
        #report-preview-viewport {
            padding: 20px 10px;
        }

        .pdf-page-content > div {
            width: 210mm !important;
        }
    }
`;

const ReportPreview: React.FC<Props> = ({
    onClose,
    title,
    htmlContent,
    filename = 'RELATORIO',
}) => {
    const [zoom, setZoom] = React.useState<number>(DEFAULT_ZOOM);
    const modalRef = React.useRef<HTMLDivElement | null>(null);
    const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);
    const originalBodyOverflowRef = React.useRef<string>('');

    const sanitizedHtml = React.useMemo(() => {
        return DOMPurify.sanitize(htmlContent, {
            USE_PROFILES: { html: true },
        });
    }, [htmlContent]);

    const zoomStyle = React.useMemo<React.CSSProperties>(() => {
        return { transform: `scale(${zoom / 100})` };
    }, [zoom]);

    const handleZoomIn = React.useCallback(() => {
        setZoom((current) => Math.min(current + 10, MAX_ZOOM));
    }, []);

    const handleZoomOut = React.useCallback(() => {
        setZoom((current) => Math.max(current - 10, MIN_ZOOM));
    }, []);

    const handleResetZoom = React.useCallback(() => {
        setZoom(DEFAULT_ZOOM);
    }, []);

    const handlePrint = React.useCallback(() => {
        try {
            const originalTitle = document.title;
            const tempTitle = safeFileName(filename).replace(/\.pdf$/i, '');

            const restoreTitle = () => {
                document.title = originalTitle;
                window.removeEventListener('afterprint', restoreTitle);
            };

            document.title = tempTitle;
            window.addEventListener('afterprint', restoreTitle);
            window.print();

            // fallback para navegadores que não disparam afterprint corretamente
            window.setTimeout(() => {
                restoreTitle();
            }, 1000);
        } catch (error) {
            console.error('Erro ao acionar impressão:', error);
        }
    }, [filename]);

    const handleBackdropClick = React.useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            if (event.target === event.currentTarget) {
                onClose();
            }
        },
        [onClose]
    );

    React.useEffect(() => {
        originalBodyOverflowRef.current = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        closeButtonRef.current?.focus();

        return () => {
            document.body.style.overflow = originalBodyOverflowRef.current;
        };
    }, []);

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }

            if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
                event.preventDefault();
                handlePrint();
                return;
            }

            if ((event.ctrlKey || event.metaKey) && (event.key === '+' || event.key === '=')) {
                event.preventDefault();
                handleZoomIn();
                return;
            }

            if ((event.ctrlKey || event.metaKey) && event.key === '-') {
                event.preventDefault();
                handleZoomOut();
                return;
            }

            if ((event.ctrlKey || event.metaKey) && event.key === '0') {
                event.preventDefault();
                handleResetZoom();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handlePrint, handleResetZoom, handleZoomIn, handleZoomOut, onClose]);

    const modalContent = (
        <div
            id="print-modal-portal"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-preview-title"
            aria-describedby="report-preview-viewport"
            onClick={handleBackdropClick}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
            <style>{REPORT_PREVIEW_STYLES}</style>

            <div
                id="report-preview-wrapper"
                className="w-full max-w-[1600px] h-[95vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
            >
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 no-print">
                    <div className="px-6 py-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <h2
                                id="report-preview-title"
                                className="text-lg font-bold text-slate-900 dark:text-white truncate"
                            >
                                {title}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Visualização para impressão
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleZoomOut}
                                type="button"
                                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all active:scale-90"
                                title="Reduzir zoom"
                                aria-label="Reduzir zoom"
                            >
                                <ZoomOut size={20} />
                            </button>

                            <div className="min-w-[72px] text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {zoom}%
                            </div>

                            <button
                                onClick={handleZoomIn}
                                type="button"
                                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all active:scale-90"
                                title="Aumentar zoom"
                                aria-label="Aumentar zoom"
                            >
                                <ZoomIn size={20} />
                            </button>

                            <button
                                onClick={handleResetZoom}
                                type="button"
                                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all active:scale-90"
                                title="Restaurar zoom"
                                aria-label="Restaurar zoom"
                            >
                                <Maximize size={20} />
                            </button>

                            <button
                                onClick={handlePrint}
                                type="button"
                                className="ml-2 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-lg font-semibold hover:opacity-90 transition-all active:scale-[0.98]"
                                title="Exportar PDF"
                                aria-label="Exportar PDF"
                            >
                                <Printer size={18} />
                                EXPORTAR PDF
                            </button>

                            <button
                                ref={closeButtonRef}
                                onClick={onClose}
                                type="button"
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all active:scale-90"
                                title="Fechar"
                                aria-label="Fechar"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                </div>

                <div id="report-preview-viewport">
                    <div
                        id="report-preview-content"
                        style={zoomStyle}
                        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                    />
                </div>

                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end z-10 no-print">
                    <button
                        onClick={onClose}
                        type="button"
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