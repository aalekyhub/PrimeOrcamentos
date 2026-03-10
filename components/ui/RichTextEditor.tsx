
import React from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './RichTextEditor.css';
import { Type, Image as ImageIcon } from 'lucide-react';

// Helper to escape HTML special characters
const escapeHtml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Whitelist fonts
const Font = Quill.import('formats/font');
// ... (rest of the whitelists)
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
  <div id={id} className="ql-toolbar-custom sticky top-0 z-[100] flex flex-wrap items-center gap-2 p-2 pr-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 backdrop-blur-sm bg-white/95 dark:bg-slate-900/95">
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
          <option value="3">Título 3</option>
          <option value="4">Título 4</option>
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
        <button className="ql-list" value="ordered" />
        <button className="ql-list" value="bullet" />
        <button className="ql-list" value="check" />
        <button className="ql-indent" value="-1" />
        <button className="ql-indent" value="+1" />
      </span>
      <span className="ql-formats">
        <select className="ql-align" />
      </span>
    </div>

    {(onAddText || onAddImage) && (
      <div className="flex items-center gap-4 px-4 border-l border-slate-200 dark:border-slate-800 flex-shrink-0">
        {onAddText && (
          <button
            type="button"
            onClick={onAddText}
            className="!w-auto !h-auto flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all active:scale-95 shadow-sm border border-blue-100 dark:border-blue-900/30 whitespace-nowrap"
            title="Adicionar Bloco de Texto"
          >
            <Type className="w-3.5 h-3.5" /> + TEXTO
          </button>
        )}
        {onAddImage && (
          <button
            type="button"
            onClick={onAddImage}
            className="!w-auto !h-auto flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all active:scale-95 shadow-sm border border-emerald-100 dark:border-emerald-900/30 whitespace-nowrap"
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
  const toolbarId = React.useMemo(() => `toolbar-${id}-${Math.random().toString(36).substr(2, 9)}`, [id]);

  const processedValue = React.useMemo(() => {
    if (!value) return '';

    // Check if it's likely HTML
    const isHtml = /<[a-z][\s\S]*>/i.test(value);
    if (isHtml) return value;

    // If plain text, wrap in paragraphs and escape content
    return value
      .split('\n')
      .map(line => `<p>${line ? escapeHtml(line) : '<br/>'}</p>`)
      .join('');
  }, [value]);

  const modules = React.useMemo(() => ({
    toolbar: {
      container: `#${toolbarId}`,
    },
  }), [toolbarId]);

  const formats = React.useMemo(() => [
    'font', 'size',
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet', 'check', 'indent',
    'align'
  ], []);

  return (
    <div className="rich-text-editor bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
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
