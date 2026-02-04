
import React from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Type, Image as ImageIcon } from 'lucide-react';

// Whitelist fonts
const Font = Quill.import('formats/font');
Font.whitelist = ['inter', 'arial', 'roboto', 'serif', 'monospace', 'montserrat', 'opensans', 'lato', 'poppins', 'oswald', 'playfair', 'nunito'];
Quill.register(Font, true);

// Whitelist sizes
const Size = Quill.import('formats/size');
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '32px'];
Quill.register(Size, true);

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onAddText?: () => void;
  onAddImage?: () => void;
  id?: string;
}

const CustomToolbar: React.FC<{ id: string; onAddText?: () => void; onAddImage?: () => void }> = ({ id, onAddText, onAddImage }) => (
  <div id={id} className="ql-toolbar-custom sticky top-0 z-[100] flex flex-wrap items-center gap-2 p-2 pr-12 bg-slate-50 border-b border-slate-200 backdrop-blur-sm bg-white/95">
    <div className="flex flex-wrap items-center gap-1">
      <span className="ql-formats">
        <select className="ql-font" defaultValue="inter">
          <option value="inter">Inter</option>
          <option value="arial">Arial</option>
          <option value="roboto">Roboto</option>
          <option value="serif">Serif</option>
          <option value="monospace">Monospace</option>
          <option value="montserrat">Montserrat</option>
          <option value="opensans">Open Sans</option>
          <option value="lato">Lato</option>
          <option value="poppins">Poppins</option>
          <option value="oswald">Oswald</option>
          <option value="playfair">Playfair</option>
          <option value="nunito">Nunito</option>
        </select>
        <select className="ql-size" defaultValue="14px">
          <option value="10px">10px</option>
          <option value="12px">12px</option>
          <option value="14px">14px</option>
          <option value="16px">16px</option>
          <option value="18px">18px</option>
          <option value="20px">20px</option>
          <option value="24px">24px</option>
          <option value="32px">32px</option>
        </select>
      </span>
      <span className="ql-formats">
        <select className="ql-header" defaultValue="">
          <option value="1">Título 1</option>
          <option value="2">Título 2</option>
          <option value="">Normal</option>
        </select>
      </span>
      <span className="ql-formats">
        <button className="ql-bold" />
        <button className="ql-italic" />
        <button className="ql-underline" />
        <button className="ql-strike" />
      </span>
      <span className="ql-formats">
        <select className="ql-color" />
        <select className="ql-background" />
      </span>
      <span className="ql-formats">
        <button className="ql-script" value="sub" />
        <button className="ql-script" value="super" />
      </span>
      <span className="ql-formats">
        <button className="ql-blockquote" />
        <button className="ql-code-block" />
      </span>
      <span className="ql-formats">
        <button className="ql-list" value="ordered" />
        <button className="ql-list" value="bullet" />
        <button className="ql-list" value="check" />
        <button className="ql-indent" value="-1" />
        <button className="ql-indent" value="+1" />
      </span>
      <span className="ql-formats">
        <button className="ql-direction" value="rtl" />
        <select className="ql-align" />
      </span>
      <span className="ql-formats">
        <button className="ql-link" />
        <button className="ql-clean" />
      </span>
    </div>

    {(onAddText || onAddImage) && (
      <div className="flex items-center gap-4 px-4 border-l border-slate-200 flex-shrink-0">
        {onAddText && (
          <button
            type="button"
            onClick={onAddText}
            className="!w-auto !h-auto flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase hover:bg-blue-100 transition-all active:scale-95 shadow-sm border border-blue-100 whitespace-nowrap"
            title="Adicionar Bloco de Texto"
          >
            <Type className="w-3.5 h-3.5" /> + TEXTO
          </button>
        )}
        {onAddImage && (
          <button
            type="button"
            onClick={onAddImage}
            className="!w-auto !h-auto flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-100 transition-all active:scale-95 shadow-sm border border-emerald-100 whitespace-nowrap"
            title="Adicionar Bloco de Imagem"
          >
            <ImageIcon className="w-3.5 h-3.5" /> + IMAGEM
          </button>
        )}
      </div>
    )}
  </div>
);

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, onAddText, onAddImage, id = "toolbar-default" }) => {
  const toolbarId = `toolbar-${id}`;

  const processedValue = React.useMemo(() => {
    if (!value) return '';
    if (/<[a-z][\s\S]*>/i.test(value)) return value;
    if (value.includes('\n')) {
      return value.split('\n').map(line => `<p>${line}</p>`).join('');
    }
    return value;
  }, [value]);

  const modules = React.useMemo(() => ({
    toolbar: {
      container: `#${toolbarId}`,
    },
  }), [toolbarId]);

  const formats = [
    'font', 'size',
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'blockquote', 'code-block',
    'list', 'bullet', 'check', 'indent',
    'direction', 'align',
    'link', 'clean'
  ];

  return (
    <div className="rich-text-editor bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
      <style>{`
        .rich-text-editor .ql-toolbar-custom {
          border: none !important;
          background: #f8fafc !important;
        }
        .rich-text-editor .ql-font {
          width: 90px !important;
          font-family: inherit !important;
        }
        .rich-text-editor .ql-size {
          width: 70px !important;
        }
        .ql-snow.ql-toolbar .ql-formats {
          margin-right: 8px !important;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item::before {
          content: 'Inter';
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='inter']::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item::before { font-family: 'Inter'; content: 'Inter'; }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='arial']::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='arial']::before { font-family: Arial; content: 'Arial'; }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='roboto']::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='roboto']::before { font-family: Roboto; content: 'Roboto'; }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='serif']::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='serif']::before { font-family: serif; content: 'Serif'; }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='monospace']::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='monospace']::before { font-family: monospace; content: 'Monospace'; }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='montserrat']::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='montserrat']::before { font-family: 'Montserrat'; content: 'Montserrat'; }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='opensans']::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='opensans']::before { font-family: 'Open Sans'; content: 'Open Sans'; }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='lato']::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='lato']::before { font-family: 'Lato'; content: 'Lato'; }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='poppins']::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='poppins']::before { font-family: 'Poppins'; content: 'Poppins'; }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='oswald']::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='oswald']::before { font-family: 'Oswald'; content: 'Oswald'; }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='playfair']::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='playfair']::before { font-family: 'Playfair Display'; content: 'Playfair'; }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='nunito']::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='nunito']::before { font-family: 'Nunito'; content: 'Nunito'; }

        /* Sizes */
        .ql-snow .ql-picker.ql-size .ql-picker-label::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item::before { content: '14px'; }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value='10px']::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value='10px']::before { content: '10px'; }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value='12px']::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value='12px']::before { content: '12px'; }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value='14px']::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value='14px']::before { content: '14px'; }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value='16px']::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value='16px']::before { content: '16px'; }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value='18px']::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value='18px']::before { content: '18px'; }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value='20px']::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value='20px']::before { content: '20px'; }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value='24px']::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value='24px']::before { content: '24px'; }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value='32px']::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value='32px']::before { content: '32px'; }

        /* Font Classes for Rendering */
        .ql-font-inter { font-family: 'Inter', sans-serif !important; }
        .ql-font-arial { font-family: Arial, sans-serif !important; }
        .ql-font-roboto { font-family: 'Roboto', sans-serif !important; }
        .ql-font-serif { font-family: serif !important; }
        .ql-font-monospace { font-family: monospace !important; }
        .ql-font-montserrat { font-family: 'Montserrat', sans-serif !important; }
        .ql-font-opensans { font-family: 'Open Sans', sans-serif !important; }
        .ql-font-lato { font-family: 'Lato', sans-serif !important; }
        .ql-font-poppins { font-family: 'Poppins', sans-serif !important; }
        .ql-font-oswald { font-family: 'Oswald', sans-serif !important; }
        .ql-font-playfair { font-family: 'Playfair Display', serif !important; }
        .ql-font-nunito { font-family: 'Nunito', sans-serif !important; }

        /* Size Classes for Rendering */
        .ql-size-10px { font-size: 10px !important; }
        .ql-size-12px { font-size: 12px !important; }
        .ql-size-14px { font-size: 14px !important; }
        .ql-size-16px { font-size: 16px !important; }
        .ql-size-18px { font-size: 18px !important; }
        .ql-size-20px { font-size: 20px !important; }
        .ql-size-24px { font-size: 24px !important; }
        .ql-size-32px { font-size: 32px !important; }

        .ql-container.ql-snow {
          border: none !important;
          min-height: 120px;
          font-family: inherit;
        }
        .ql-editor {
          font-family: 'Inter', sans-serif;
          font-size: 14px;
        }
        .rich-text-editor .ql-toolbar-custom button {
          width: auto !important;
          height: auto !important;
          display: flex !important;
          align-items: center !important;
        }
        .rich-text-editor .ql-container {
          max-height: 600px;
          overflow-y: auto;
        }
        .rich-text-editor .ql-toolbar-custom {
          position: sticky;
          top: 0;
          z-index: 50;
          background: white;
        }
      `}</style>
      <CustomToolbar id={toolbarId} onAddText={onAddText} onAddImage={onAddImage} />
      <ReactQuill
        theme="snow"
        value={processedValue}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
};

export default RichTextEditor;
