import type { SchemaPanelProps } from './view-types';

export default function SchemaListView({ schemaList, selectedSchemaId, onSelectSchema, onRefresh }: SchemaPanelProps) {
  const cardClasses = 'rounded-xl border border-slate-300 bg-white p-4';

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Saved Schemas</h2>
          <p className="text-sm text-slate-600">Retrieved from the backend.</p>
        </div>
        <button onClick={onRefresh} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700">
          Refresh
        </button>
      </div>
      <div className="grid gap-3">
        {schemaList.length === 0 ? (
          <p className="text-sm text-slate-600">No schemas saved yet.</p>
        ) : (
          schemaList.map((schema) => (
            <button
              key={schema.schema_id}
              onClick={() => onSelectSchema(schema.schema_id)}
              className={`${cardClasses} text-left ${selectedSchemaId === schema.schema_id ? 'border-indigo-500 bg-indigo-50' : ''}`}
            >
              <p className="text-sm font-semibold">{schema.schema_id}</p>
              <p className="mt-1 text-xs text-slate-600">{schema.field_count} field(s) | DPI {schema.dpi}</p>
              <p className="mt-1 text-xs text-slate-500">{new Date(schema.updated_at * 1000).toLocaleString()}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
