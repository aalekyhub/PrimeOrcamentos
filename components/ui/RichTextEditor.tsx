import React, { useMemo, useRef } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './RichTextEditor.css';
import {
  Type,
  Image as ImageIcon,
  Link as LinkIcon,
  RotateCcw,
  RotateCw,
  Eraser,
} from 'lucide-react';

// =========================
// HELPERS
// =========================
const escapeHtml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const isLikelyHtml = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value);

// =========================
// CONFIG
// =========================
const FONT_OPTIONS = [
  { value: 'inter', label: 'Inter' },
  { value: 'arial', label: 'Arial' },
  { value: 'roboto', label: 'Roboto' },
  { value: 'serif', label: 'Serif' },
  { value: 'monospace', label: 'Monospace' },
  { value: 'montserrat', label: 'Montserrat' },
  { value: 'opensans', label: 'Open Sans' },
  { value: 'lato', label: 'Lato' },
  { value: 'poppins', label: 'Poppins' },
  { value: 'oswald', label: 'Oswald' },
  { value: 'playfair', label: 'Playfair' },
  { value: 'nunito', label: 'Nunito' },
] as const;

const SIZE_OPTIONS = [
  '10px',
  '12px',
  '14px',
  '16px',
  '18px',
  '20px',
  '24px',
  '32px',
] as const;

const HEADER_OPTIONS = [
  { value: '1', label: 'Título 1' },
  { value: '2', label: 'Título 2' },
  { value: '3', label: 'Título 3' },
  { value: '4', label: 'Título 4' },
  { value: '', label: 'Normal' },
] as const;

// =========================
// QUILL REGISTRATION
// =========================
const Font = Quill.import('formats/font');
Font.whitelist = FONT_OPTIONS.map((item) => item.value);
Quill.register(Font, true);

const Size = Quill.import('formats/size');
Size.whitelist = [...SIZE_OPTIONS];
Quill.register(Size, true);

// =========================
// QUILL ICONS
// =========================
const icons = Quill.import('ui/icons');
icons.undo = `
  <svg viewBox="0 0 18 18">
    <polygon class="ql-fill ql-stroke" points="6 10 4 12 2 10 6 10"></polygon>
    <path class="ql-stroke" d="M4,11 L4,5.5 C4,4.12 5.12,3 6.5,3 L11,3 C13.21,3 15,4.79 15,7 C15,9.21 13.21,11 11,11 L5,11"></path>
  </svg>
`;

icons.redo = `
  <svg viewBox="0 0 18 18">
    <polygon class="ql-fill ql-stroke" points="12 10 14 12 16 10 12 10"></polygon>
    <path class="ql-stroke" d="M14,11 L14,5.5 C14,4.12 12.88,3 11.5,3 L7,3 C4.79,3 3,4.79 3,7 C3,9.21 4.79,11 7,11 L13,11"></path>
  </svg>
`;

// =========================
// TYPES
// =========================
interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onAddText?: () => void;
  onAddImage?: () => void;
  id?: string;
  documentMode?: boolean;
  minHeight?: number;
}

interface CustomToolbarProps {
  id: string;
  onAddText?: () => void;
  onAddImage?: () => void;
}

// =========================
// TOOLBAR
// =========================
const CustomToolbar: React.FC<CustomToolbarProps> = ({ id, onAddText, onAddImage }) => {
  return (
    <div
      id={id}
      className="ql-toolbar-custom rte-toolbar sticky top-0 z-[60] border-b border-slate-200 dark:border-slate-800"
    >
      <div className="rte-toolbar-row">
        <span className="ql-formats">
          <select className="ql-font" defaultValue="inter">
            {FONT_OPTIONS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>

          <select className="ql-size" defaultValue="14px">
            {SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>

          <select className="ql-header" defaultValue="">
            {HEADER_OPTIONS.map((header) => (
              <option key={`${header.value}-${header.label}`} value={header.value}>
                {header.label}
              </option>
            ))}
          </select>
        </span>

        <span className="ql-formats">
          <button className="ql-bold" type="button" title="Negrito" />
          <button className="ql-italic" type="button" title="Itálico" />
          <button className="ql-underline" type="button" title="Sublinhado" />
          <button className="ql-strike" type="button" title="Riscado" />
        </span>

        <span className="ql-formats">
          <select className="ql-color" />
          <select className="ql-background" />
        </span>

        <span className="ql-formats">
          <button className="ql-list" value="ordered" type="button" title="Lista numerada" />
          <button className="ql-list" value="bullet" type="button" title="Lista com marcadores" />
          <button className="ql-indent" value="-1" type="button" title="Diminuir recuo" />
          <button className="ql-indent" value="+1" type="button" title="Aumentar recuo" />
        </span>

        <span className="ql-formats">
          <select className="ql-align" />
        </span>

        <span className="ql-formats">
          <button className="ql-link" type="button" title="Inserir link">
            <LinkIcon className="rte-inline-icon" />
          </button>

          <button className="ql-clean" type="button" title="Limpar formatação">
            <Eraser className="rte-inline-icon" />
          </button>
        </span>

        <span className="ql-formats">
          <button className="ql-undo" type="button" title="Desfazer">
            <RotateCcw className="rte-inline-icon" />
          </button>

          <button className="ql-redo" type="button" title="Refazer">
            <RotateCw className="rte-inline-icon" />
          </button>
        </span>

        {(onAddText || onAddImage) && (
          <div className="rte-extra-actions">
            {onAddText && (
              <button
                type="button"
                onClick={onAddText}
                className="rte-action-btn rte-action-btn-text"
                title="Adicionar bloco de texto"
              >
                <Type className="w-4 h-4" />
                <span>Texto</span>
              </button>
            )}

            {onAddImage && (
              <button
                type="button"
                onClick={onAddImage}
                className="rte-action-btn rte-action-btn-image"
                title="Adicionar bloco de imagem"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Imagem</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// =========================
// COMPONENT
// =========================
const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Digite aqui...',
  onAddText,
  onAddImage,
  id = 'default',
  documentMode = true,
  minHeight = 1123,
}) => {
  const toolbarIdRef = useRef(`toolbar-${id}-${Math.random().toString(36).slice(2, 10)}`);
  const toolbarId = toolbarIdRef.current;

  const processedValue = useMemo(() => {
    if (!value?.trim()) return '';

    if (isLikelyHtml(value)) return value;

    return value
      .split('\n')
      .map((line) => `<p>${line ? escapeHtml(line) : '<br/></p>'}`.replace('</p></p>', '</p>'))
      .join('');
  }, [value]);

  const modules = useMemo(() => {
    return {
      toolbar: {
        container: `#${toolbarId}`,
        handlers: {
          undo: function (this: any) {
            this.quill?.history?.undo();
          },
          redo: function (this: any) {
            this.quill?.history?.redo();
          },
        },
      },
      history: {
        delay: 500,
        maxStack: 100,
        userOnly: true,
      },
      clipboard: {
        matchVisual: false,
      },
    };
  }, [toolbarId]);

  const formats = useMemo(
    () => [
      'font',
      'size',
      'header',
      'bold',
      'italic',
      'underline',
      'strike',
      'color',
      'background',
      'list',
      'indent',
      'align',
      'link',
    ],
    []
  );

  const handleChange = (content: string) => {
    const normalized = content === '<p><br></p>' ? '' : content;
    onChange(normalized);
  };

  return (
    <div
      className={`rich-text-editor ${documentMode ? 'rte-document-mode' : 'rte-compact-mode'}`}
      style={{ ['--rte-page-min-height' as string]: `${minHeight}px` }}
    >
      <CustomToolbar id={toolbarId} onAddText={onAddText} onAddImage={onAddImage} />

      <div className="rte-editor-shell">
        <ReactQuill
          theme="snow"
          value={processedValue}
          onChange={handleChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
};

export default RichTextEditor;