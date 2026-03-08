import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface Props {
    onClose: () => void;
    title: string;
    htmlContent: string;
    filename?: string;
}

const ReportPreview: React.FC<Props> = ({
    onClose,
    title,
    htmlContent,
    filename = 'RELATORIO'
}) => {

    const [zoom, setZoom] = React.useState(100);
    const previewRef = React.useRef<HTMLDivElement | null>(null);

    const safeFileName = (name?: string) => {
        const base = (name || 'RELATORIO')
            .replace(/\.pdf$/i, '')
            .replace(/[\\/:*?"<>|]+/g, '')
            .trim();

        return `${base || 'RELATORIO'}.pdf`;
    };

    const handlePrint = () => {
        try {

            const originalTitle = document.title;
            const tempTitle = safeFileName(filename).replace(/\.pdf$/i, '');

            document.title = tempTitle;

            window.print();

            setTimeout(() => {
                document.title = originalTitle;
            }, 500);

        } catch (error) {

            console.error('Erro ao acionar impressão:', error);

        }
    };

    const modalContent = (

        <div
            id="print-modal-portal"
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >

            <style>{`

/* =====================================================
   PREVIEW (TELA)
===================================================== */

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
}

.pdf-page-content {
    display: flex;
    flex-direction: column;
    gap: 30px;
    align-items: center;
}

.pdf-page-content > div {

    background: white !important;

    width: 210mm !important;
    min-height: 297mm !important;

    padding: 15mm !important;

    box-shadow: 0 10px 40px rgba(0,0,0,0.15);

    position: relative;

    box-sizing: border-box;

    font-family: Inter, Arial, sans-serif;

    color: #1e293b;

    overflow: hidden;

}

/* =====================================================
   ELEMENTOS DE CONTEÚDO
===================================================== */

.pdf-page-content p {
    margin-bottom: 6pt;
    line-height: 1.45;
}

.pdf-page-content h1,
.pdf-page-content h2,
.pdf-page-content h3,
.pdf-page-content h4,
.pdf-page-content h5,
.pdf-page-content h6 {
    margin-top: 12pt;
    margin-bottom: 6pt;
    line-height: 1.2;
}

.pdf-page-content ul,
.pdf-page-content ol {
    margin-bottom: 6pt;
    padding-left: 18pt;
}

.pdf-page-content li {
    margin-bottom: 2pt;
    line-height: 1.4;
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

/* =====================================================
   SCROLLBAR
===================================================== */

#report-preview-viewport::-webkit-scrollbar {
    width: 10px;
}

#report-preview-viewport::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 10px;
}

/* =====================================================
   PRINT
===================================================== */

@media print {

html, body {

    margin: 0 !important;
    padding: 0 !important;
    background: white !important;

}

body > *:not(#print-modal-portal) {

    display: none !important;

}

#print-modal-portal {

    position: static !important;

    background: white !important;

    padding: 0 !important;

    margin: 0 !important;

}

#report-preview-wrapper {

    box-shadow: none !important;

    border: none !important;

    border-radius: 0 !important;

    background: white !important;

    width: auto !important;

    height: auto !important;

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

    display: flex !important;

    flex-direction: column !important;

    align-items: center !important;

}

#report-preview-content {

    transform: none !important;

    display: flex !important;

    flex-direction: column !important;

    align-items: center !important;

    width: 210mm !important;

}

.pdf-page-content {

    display: block !important;

    width: 210mm !important;

}

.pdf-page-content > div {

    width: 210mm !important;

    min-height: 297mm !important;

    padding: 15mm !important;

    margin: 0 !important;

    box-shadow: none !important;

    page-break-after: always !important;

    break-after: page !important;

}

.pdf-page-content > div:last-child {

    page-break-after: auto !important;

}

* {

    -webkit-print-color-adjust: exact !important;

    print-color-adjust: exact !important;

}

@page {

    size: A4;

    margin: 0;

}

}

`}</style>

            <div
                id="report-preview-wrapper"
                className="bg-slate-200 rounded-2xl shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden"
            >

                <div className="px-6 py-4 border-b flex items-center justify-between bg-white sticky top-0 no-print">

                    <div>

                        <h3 className="text-xl font-bold text-slate-800">{title}</h3>

                        <p className="text-sm text-slate-500">

                            Ambiente de Visualização Profissional

                        </p>

                    </div>

                    <div className="flex items-center gap-6">

                        <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">

                            <button
                                onClick={() => setZoom(Math.max(30, zoom - 10))}
                            >
                                <ZoomOut size={18} />
                            </button>

                            <span className="text-xs font-bold w-12 text-center">
                                {zoom}%
                            </span>

                            <button
                                onClick={() => setZoom(Math.min(200, zoom + 10))}
                            >
                                <ZoomIn size={18} />
                            </button>

                            <button
                                onClick={() => setZoom(100)}
                            >
                                <Maximize size={18} />
                            </button>

                        </div>

                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold"
                        >
                            <Printer size={18} />
                            EXPORTAR PDF
                        </button>

                        <button onClick={onClose}>
                            <X size={24} />
                        </button>

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

                <div className="px-6 py-4 border-t bg-white flex justify-end no-print">

                    <button
                        onClick={onClose}
                        className="px-6 py-2 font-bold"
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