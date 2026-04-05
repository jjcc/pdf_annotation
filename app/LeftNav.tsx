import type { MainView } from './view-types';
import { classByState } from './ui-utils';

type LeftNavProps = {
  activeView: MainView;
  onChangeView: (view: MainView) => void;
  statusMessage: string | null;
  schemaId: string | null;
  errorMessage: string | null;
};

const NAV_ITEMS: { id: MainView; label: string; hint: string }[] = [
  { id: 'preview', label: 'PDF Preview', hint: 'Annotate current document' },
  { id: 'schemas', label: 'Schema List', hint: 'Saved backend schemas' },
  { id: 'results', label: 'Extract Result', hint: 'Latest extracted values' },
  { id: 'history', label: 'History Log', hint: 'Previous operations' },
];

export default function LeftNav({ activeView, onChangeView, statusMessage, schemaId, errorMessage }: LeftNavProps) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-300 bg-white">
      <div className="border-b border-slate-300 px-4 py-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Workspace</div>
      <div className="space-y-2 p-3">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={`w-full rounded-xl border px-4 py-3 text-left ${classByState(activeView === item.id, 'border-indigo-500 bg-indigo-600 text-white', 'border-transparent text-slate-700 hover:bg-slate-100')}`}
          >
            <p className="text-sm font-semibold">{item.label}</p>
            <p className="mt-1 text-[11px] opacity-80">{item.hint}</p>
          </button>
        ))}
      </div>
      <div className="mt-auto border-t border-slate-300 px-4 py-4 text-[11px]">
        {statusMessage && <p className="text-emerald-600">{statusMessage}</p>}
        {schemaId && <p className="mt-1 text-sky-600">Schema ID: {schemaId}</p>}
        {errorMessage && <p className="mt-1 text-red-600">{errorMessage}</p>}
      </div>
    </aside>
  );
}
