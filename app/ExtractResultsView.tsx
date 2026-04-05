import type { ExtractionResult } from './view-types';

type ExtractResultsViewProps = {
  result: ExtractionResult | null;
};

export default function ExtractResultsView({ result }: ExtractResultsViewProps) {
  const cardClasses = 'rounded-xl border border-slate-300 bg-white p-4';

  return (
    <div className="h-full overflow-auto p-6">
      <h2 className="mb-1 text-lg font-semibold">Extract Result</h2>
      <p className="mb-4 text-sm text-slate-600">Latest extraction output.</p>
      {!result ? (
        <p className="text-sm text-slate-600">No extraction has been run yet.</p>
      ) : (
        <div className="grid gap-3">
          {Object.entries(result.fields).map(([fieldName, field]) => (
            <div key={fieldName} className={cardClasses}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{fieldName}</p>
                  <p className="mt-1 text-xs text-slate-600">Page {field.page} | {field.match_type}</p>
                </div>
                <span className="text-[11px] text-slate-500">Confidence {field.confidence}</span>
              </div>
              <p className="mt-3 text-sm text-slate-800">{field.value || 'No value extracted'}</p>
              <p className="mt-2 text-xs text-slate-500">{field.debug_crop_path}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
