import { useState } from 'react';
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
  const [isCustomName, setIsCustomName] = useState(
    annotation?.name ? !PREDEFINED_FIELDS.includes(annotation.name) : false,
  );
  const [regex, setRegex] = useState(annotation?.regex || '');
  const [anchor, setAnchor] = useState(annotation?.anchor || '');

  const handleSave = () => {
    if (!annotation) return;
    onUpdate({ ...annotation, name, regex, anchor });
  };

  const emptyIcon = dk ? 'bg-slate-800' : 'bg-slate-100';
  const emptyTxt = dk ? 'text-slate-500' : 'text-slate-400';
  const heading = dk ? 'text-slate-400' : 'text-slate-500';
  const labelCls = `block text-xs font-medium uppercase tracking-wider mb-1.5 ${heading}`;
  const inputCls = dk
    ? 'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
    : 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';
  const bboxCell = dk
    ? 'bg-slate-800 border-slate-700 text-slate-400'
    : 'bg-white border-slate-300 text-slate-600';
  const bboxKey = dk ? 'text-slate-500' : 'text-slate-400';
  const deleteBtn = dk
    ? 'border border-slate-700 bg-slate-800 text-red-400 hover:border-red-900 hover:bg-red-950 hover:text-red-300'
    : 'border border-slate-200 bg-white text-red-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600';

  if (!annotation) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
        <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${emptyIcon}`}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect
              x="2"
              y="2"
              width="14"
              height="14"
              rx="2"
              stroke={dk ? '#475569' : '#94a3b8'}
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
          </svg>
        </div>
        <p className={`text-sm ${emptyTxt}`}>Select a field to edit its properties</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <div>
        <p className={`mb-4 text-xs font-semibold uppercase tracking-widest ${heading}`}>Properties</p>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Field name</label>
            <select
              value={isCustomName ? '__custom__' : name}
              onChange={(e) => {
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
              <option value="">Select a field</option>
              {PREDEFINED_FIELDS.map((fieldName) => (
                <option key={fieldName} value={fieldName}>
                  {fieldName}
                </option>
              ))}
              <option value="__custom__">Custom...</option>
            </select>
            {isCustomName && (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
              onChange={(e) => setRegex(e.target.value)}
              placeholder="\\d{4}-\\d{2}-\\d{2}"
              className={`${inputCls} font-mono text-xs`}
            />
          </div>

          <div>
            <label className={labelCls}>Anchor text</label>
            <input
              type="text"
              value={anchor}
              onChange={(e) => setAnchor(e.target.value)}
              placeholder="LOT#"
              className={`${inputCls} font-mono text-xs`}
            />
          </div>

          <div>
            <label className={labelCls}>Bounding box</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['x', 'y', 'w', 'h'] as const).map((key) => {
                const value =
                  key === 'w'
                    ? annotation.width
                    : key === 'h'
                      ? annotation.height
                      : annotation[key as 'x' | 'y'];
                return (
                  <div key={key} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${bboxCell}`}>
                    <span className={`w-3 text-[10px] font-bold uppercase ${bboxKey}`}>{key}</span>
                    <span className="text-xs tabular-nums">{value.toFixed(3)}</span>
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
          className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          Save
        </button>
        <button
          onClick={() => onDelete(annotation.id)}
          className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${deleteBtn}`}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
