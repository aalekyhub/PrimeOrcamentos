import React, { useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Download, ZoomIn, ZoomOut, Printer } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import './document-preview.css';

interface DocumentPreviewProps {
    children: React.ReactNode;
    filename?: string;
    onClose?: () => void;
}

export interface DocumentPreviewRef {
    generatePDF: () => Promise<void>;
}

export const DocumentPreview = forwardRef<DocumentPreviewRef, DocumentPreviewProps>(
    ({ children, filename = 'documento', onClose }, ref) => {
        const documentRef = useRef<HTMLDivElement>(null);
        const [zoom, setZoom] = useState(1);
        const [isGenerating, setIsGenerating] = useState(false);

        const handleZoomIn = () => setZoom(z => Math.min(2, z + 0.1));
        const handleZoomOut = () => setZoom(z => Math.max(0.5, z - 0.1));

        const generatePDF = async () => {
            if (!documentRef.current) return;

            try {
                setIsGenerating(true);
                // We temporarily reset zoom to 1 to generate the PDF correctly
                const originalTransform = documentRef.current.style.transform;
                documentRef.current.style.transform = 'scale(1)';

                const worker = html2pdf()
                    .set({
                        margin: [15, 0, 15, 0], // mm
                        filename: `${filename}.pdf`,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: {
                            scale: 2,
                            useCORS: true,
                            logging: false,
                            letterRendering: true,
                        },
                        jsPDF: {
                            unit: 'mm',
                            format: 'a4',
                            orientation: 'portrait',
                        },
                        pagebreak: {
                            mode: ['css', 'legacy']
                        }
                    } as any)
                    .from(documentRef.current)
                    .toPdf()
                    .get('pdf')
                    .then((pdf: any) => {
                        // Add page numbers
                        const totalPages = pdf.internal.getNumberOfPages();
                        for (let i = 1; i <= totalPages; i++) {
                            pdf.setPage(i);
                            pdf.setFontSize(8);
                            pdf.setTextColor(150);
                            pdf.text(
                                `Pág. ${i} / ${totalPages}`,
                                pdf.internal.pageSize.getWidth() - 20,
                                pdf.internal.pageSize.getHeight() - 8
                            );
                        }
                    });

                await (worker as any).save();

                // Restore zoom
                documentRef.current.style.transform = originalTransform;
            } catch (error) {
                console.error("Error generating PDF:", error);
            } finally {
                setIsGenerating(false);
            }
        };

        useImperativeHandle(ref, () => ({
            generatePDF
        }));

        return (
            <div className="preview-wrapper">
                <div className="preview-toolbar">
                    <div className="zoom-controls">
                        <button onClick={handleZoomOut} className="zoom-btn" title="Diminuir Zoom"><ZoomOut size={16} /></button>
                        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
                        <button onClick={handleZoomIn} className="zoom-btn" title="Aumentar Zoom"><ZoomIn size={16} /></button>
                    </div>

                    <div className="preview-toolbar-actions">
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Fechar
                            </button>
                        )}
                        <button
                            onClick={generatePDF}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50"
                        >
                            <Download size={18} />
                            {isGenerating ? 'Gerando...' : 'Baixar PDF'}
                        </button>
                    </div>
                </div>

                <div className="preview-stage">
                    <div
                        style={{
                            transform: `scale(${zoom})`,
                            transformOrigin: 'top center',
                            transition: 'transform 0.2s ease'
                        }}
                    >
                        <div ref={documentRef}>
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);

DocumentPreview.displayName = 'DocumentPreview';
