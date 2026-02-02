
import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  // Detect if value is legacy plain text (contains \n but not HTML tags)
  const processedValue = React.useMemo(() => {
    if (!value) return '';
    // If it contains HTML tags, assume it's already Rich Text
    if (/<[a-z][\s\S]*>/i.test(value)) return value;
    // If it has newlines but no tags, convert to paragraphs
    if (value.includes('\n')) {
      return value.split('\n').map(line => `<p>${line}</p>`).join('');
    }
    return value;
  }, [value]);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'align',
    'clean'
  ];

  return (
    <div className="rich-text-editor bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
      <style>{`
        .ql-toolbar.ql-snow {
          border: none !important;
          border-bottom: 1px solid #e2e8f0 !important;
          background: #f8fafc !important;
        }
        .dark .ql-toolbar.ql-snow {
          background: #1e293b !important;
          border-bottom: 1px solid #334155 !important;
        }
        .dark .ql-toolbar.ql-snow .ql-stroke {
          stroke: #94a3b8 !important;
        }
        .dark .ql-toolbar.ql-snow .ql-fill {
          fill: #94a3b8 !important;
        }
        .dark .ql-toolbar.ql-snow .ql-picker {
          color: #94a3b8 !important;
        }
        .ql-container.ql-snow {
          border: none !important;
          min-height: 150px;
          font-family: inherit;
          font-size: 14px;
        }
        .dark .ql-editor {
          color: #f1f5f9;
        }
        .ql-editor.ql-blank::before {
          color: #94a3b8;
          font-style: normal;
        }
      `}</style>
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
