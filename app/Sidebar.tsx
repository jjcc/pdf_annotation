import { useState, useEffect } from 'react';
import { Annotation } from './types';

interface SidebarProps {
  annotation: Annotation | null;
  isDark: boolean;
  onUpdate: (annotation: Annotation) => void;
  onDelete: (id: string) => void;
}

const PREDEFINED_FIELDS = [
  'po_number',
  'serial_number',
  'lot_number',
  'certificate_number',
  'description',
  'invoice_number',
  'date',
  'quantity',
  'unit_price',
  'total_amount',
  'supplier_name',
  'part_number',
];

export default function Sidebar({ annotation, isDark: dk, onUpdate, onDelete }: SidebarProps) {
  const [name, setName] = useState(annotation?.name || '');
  const [isCustomName, setIsCustomName] = useState(false);
  const [regex, setRegex] = useState(annotation?.regex || '');
  const [anchor, setAnchor] = useState<Annotation['anchor']>(annotation?.anchor || 'top-left');

  useEffect(() => {
    const n = annotation?.name || '';
    setName(n);
    setIsCustomName(n !== '' && !PREDEFINED_FIELDS.includes(n));
    setRegex(annotation?.regex || '');
    setAnchor(annotation?.anchor || 'top-left');
  }, [annotation?.id]);

  const handleSave = () => {
    if (!annotation) return;
    onUpdate({ ...annotation, name, regex, anchor });
  };

  // Theme tokens
  const emptyIcon  = dk ? 'bg-slate-800'                                        : 'bg-slate-100';
  const emptyTxt   = dk ? 'text-slate-500'                                      : 'text-slate-400';
  const heading    = dk ? 'text-slate-400'                                      : 'text-slate-500';
  const labelCls   = `block text-xs font-medium uppercase tracking-wider mb-1.5 ${heading}`;
  const inputCls   = dk
    ? 'w-full px-3 py-2 text-sm text-slate-200 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600 transition-colors'
    : 'w-full px-3 py-2 text-sm text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-400 transition-colors';
  const anchorOff  = dk
    ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
    : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-800';
  const bboxCell   = dk
    ? 'bg-slate-800 border-slate-700 text-slate-400'
    : 'bg-white border-slate-300 text-slate-600';
  const bboxKey    = dk ? 'text-slate-500' : 'text-slate-400';
  const deleteBtn  = dk
    ? 'text-red-400 bg-slate-800 hover:bg-red-950 hover:text-red-300 border border-slate-700 hover:border-red-900'
    : 'text-red-500 bg-white hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-300';

  if (!annotation) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${emptyIcon}`}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="2" width="14" height="14" rx="2" stroke={dk ? '#475569' : '#94a3b8'} strokeWidth="1.5" strokeDasharray="3 2"/>
          </svg>
        </div>
        <p className={`text-sm ${emptyTxt}`}>Select a field to edit its properties</p>
      </div>
    );
  }

  const anchorOptions: { value: Annotation['anchor']; label: string }[] = [
    { value: 'top-left',     label: 'TL' },
    { value: 'top-right',    label: 'TR' },
    { value: 'bottom-left',  label: 'BL' },
    { value: 'bottom-right', label: 'BR' },
  ];

  return (
    <div className="p-4 space-y-5">
      <div>
        <p className={`text-xs font-semibold uppercase tracking-widest mb-4 ${heading}`}>Properties</p>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Field name</label>
            <select
              value={isCustomName ? '__custom__' : name}
              onChange={e => {
                if (e.target.value === '__custom__') {
                  setIsCustomName(true);
                  setName('');
                } else {
                  setIsCustomName(false);
                  setName(e.target.value);
                }
              }}
              className={inputCls}
            >
              <option value="">— Select a field —</option>
              {PREDEFINED_FIELDS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
              <option value="__custom__">Custom...</option>
            </select>
            {isCustomName && (
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter custom field name"
                className={`${inputCls} mt-2`}
                autoFocus
              />
            )}
          </div>

          <div>
            <label className={labelCls}>Regex pattern</label>
            <input
              type="text"
              value={regex}
              onChange={e => setRegex(e.target.value)}
              placeholder="\d{4}-\d{2}-\d{2}"
              className={`${inputCls} font-mono text-xs`}
            />
          </div>

          <div>
            <label className={labelCls}>Anchor</label>
            <div className="grid grid-cols-2 gap-1.5">
              {anchorOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAnchor(opt.value)}
                  className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
                    anchor === opt.value
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-400'
                      : anchorOff
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bbox read-only */}
          <div>
            <label className={labelCls}>Bounding box</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['x', 'y', 'w', 'h'] as const).map(key => {
                const val = key === 'w' ? annotation.width : key === 'h' ? annotation.height : annotation[key as 'x' | 'y'];
                return (
                  <div key={key} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${bboxCell}`}>
                    <span className={`text-[10px] font-bold uppercase w-3 ${bboxKey}`}>{key}</span>
                    <span className="text-xs tabular-nums">{val.toFixed(3)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          className="flex-1 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
        >
          Save
        </button>
        <button
          onClick={() => onDelete(annotation.id)}
          className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${deleteBtn}`}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
