import type { HistoryPanelProps } from './view-types';
import { formatTimestamp } from './ui-utils';

export default function HistoryLogView({ historyItems, onRefresh }: HistoryPanelProps) {
  const cardClasses = 'rounded-xl border border-slate-300 bg-white p-4';

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">History Log</h2>
          <p className="text-sm text-slate-600">Previous backend operations and summaries.</p>
        </div>
        <button onClick={onRefresh} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700">
          Refresh
        </button>
      </div>
      <div className="grid gap-3">
        {historyItems.length === 0 ? (
          <p className="text-sm text-slate-600">No history available yet.</p>
        ) : (
          historyItems.map((item, index) => (
            <div key={`${item.timestamp}-${index}`} className={cardClasses}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{item.summary}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">{item.operation} | {item.status}</p>
                </div>
                <span className="text-[11px] text-slate-500">{formatTimestamp(item.timestamp)}</span>
              </div>
              {Object.keys(item.details).length > 0 && (
                <pre className="mt-3 overflow-auto rounded-lg bg-slate-50 p-3 text-[11px] text-slate-700">
{JSON.stringify(item.details, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
