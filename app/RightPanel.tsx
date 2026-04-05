import Sidebar from './Sidebar';
import { formatTimestamp } from './ui-utils';
import type { Annotation } from './types';
import type { HistoryItem, SchemaListItem } from './api';
import type { ExtractionFieldResult, MainView } from './view-types';

type RightPanelProps = {
  activeView: MainView;
  selectedSchema: SchemaListItem | null;
  historyItems: HistoryItem[];
  currentPage: number;
  pageAnnotations: Annotation[];
  selectedAnnotationId: string | null;
  selectedAnnotation: Annotation | null;
  onSelectAnnotation: (id: string | null) => void;
  onUpdateAnnotation: (annotation: Annotation) => void;
  onDeleteAnnotation: (id: string) => void;
  pageResults: Array<[string, ExtractionFieldResult]>;
};

export default function RightPanel({
  activeView,
  selectedSchema,
  historyItems,
  currentPage,
  pageAnnotations,
  selectedAnnotationId,
  selectedAnnotation,
  onSelectAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  pageResults,
}: RightPanelProps) {
  const cardClasses = 'rounded-xl border border-slate-300 bg-white p-4';

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-slate-300 bg-white">
      <div className="border-b border-slate-300 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
        {activeView === 'schemas' ? 'Schema Detail' : activeView === 'history' ? 'Recent History' : 'Inspector'}
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeView === 'schemas' ? (
          <div className="space-y-4 p-4">
            {!selectedSchema ? (
              <p className="text-sm text-slate-600">Select a schema to inspect it.</p>
            ) : (
              <>
                <div className={cardClasses}>
                  <p className="text-sm font-semibold">{selectedSchema.schema_id}</p>
                  <p className="mt-1 text-xs text-slate-600">{selectedSchema.field_count} field(s)</p>
                  <p className="mt-1 text-xs text-slate-500">{selectedSchema.path}</p>
                </div>
                <div className={cardClasses}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Fields</p>
                  <div className="space-y-3">
                    {selectedSchema.fields.map((field) => (
                      <div key={`${field.name}-${field.page}`} className="rounded-lg border border-slate-300 p-3">
                        <p className="text-sm font-medium">{field.name}</p>
                        <p className="mt-1 text-xs text-slate-600">Page {field.page}</p>
                        {field.pattern && <p className="mt-1 text-xs text-slate-600">Pattern: {field.pattern}</p>}
                        {field.anchor && <p className="mt-1 text-xs text-slate-600">Anchor: {field.anchor}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : activeView === 'history' ? (
          <div className="space-y-3 p-4">
            {historyItems.slice(0, 8).map((item, index) => (
              <div key={`${item.timestamp}-${index}`} className={cardClasses}>
                <p className="text-sm font-semibold">{item.summary}</p>
                <p className="mt-1 text-xs text-slate-600">{formatTimestamp(item.timestamp)}</p>
                <p className="mt-2 text-[11px] uppercase tracking-wider text-slate-500">{item.operation} | {item.status}</p>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="max-h-[240px] overflow-y-auto border-b border-slate-300">
              {pageAnnotations.length === 0 ? (
                <p className="px-4 py-3 text-xs italic text-slate-500">No fields on page {currentPage}</p>
              ) : (
                <ul>
                  {pageAnnotations.map((annotation, index) => (
                    <li key={annotation.id}>
                      <button
                        onClick={() => onSelectAnnotation(annotation.id === selectedAnnotationId ? null : annotation.id)}
                        className={`flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-left ${annotation.id === selectedAnnotationId ? 'border-indigo-500 bg-indigo-100' : 'border-transparent hover:bg-slate-100'}`}
                      >
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${annotation.id === selectedAnnotationId ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{index + 1}</span>
                        <span className={`truncate text-sm ${annotation.id === selectedAnnotationId ? 'font-medium text-indigo-700' : 'text-slate-700'}`}>{annotation.name || '(unnamed)'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Sidebar key={selectedAnnotation?.id ?? 'empty'} annotation={selectedAnnotation} isDark={false} onUpdate={onUpdateAnnotation} onDelete={onDeleteAnnotation} />
            <div className="mx-4 mb-4 rounded-xl border border-slate-300 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Results</p>
              {pageResults.length === 0 ? (
                <p className="text-xs text-slate-500">Run extraction to view field values.</p>
              ) : (
                <div className="space-y-3">
                  {pageResults.map(([fieldName, field]) => (
                    <div key={fieldName} className="rounded-lg border border-slate-300 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-700">{fieldName}</p>
                        <span className="text-[10px] uppercase tracking-wider text-slate-500">{field.match_type}</span>
                      </div>
                      <p className="mt-2 break-words text-xs text-slate-800">{field.value || 'No value extracted'}</p>
                      <p className="mt-2 text-[11px] text-slate-500">Confidence: {field.confidence}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
