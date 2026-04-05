'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import type { HistoryItem, SaveSchemaResponse, SchemaListItem, SchemaPayload } from './api';
import { getHistory, listSchemas, runExtraction, saveSchema, uploadPDF } from './api';
import ExtractResultsView from './ExtractResultsView';
import HistoryLogView from './HistoryLogView';
import LeftNav from './LeftNav';
import PreviewWorkspace from './PreviewWorkspace';
import RightPanel from './RightPanel';
import SchemaListView from './SchemaListView';
import type { Annotation } from './types';
import type { ExtractionResult, MainView } from './view-types';

export default function Home() {
  const [activeView, setActiveView] = useState<MainView>('preview');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [savingSchema, setSavingSchema] = useState(false);
  const [savedSchema, setSavedSchema] = useState<SaveSchemaResponse | null>(null);
  const [schemaList, setSchemaList] = useState<SchemaListItem[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [annotations, setAnnotations] = useState<Record<number, Annotation[]>>({});
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [zoom, setZoom] = useState(1.5);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalFields = Object.values(annotations).flat().length;
  const pageAnnotations = annotations[currentPage] || [];
  const selectedAnnotation = pageAnnotations.find((item) => item.id === selectedAnnotationId) ?? null;
  const pageResults = Object.entries(result?.fields ?? {}).filter(([, field]) => field.page === currentPage);
  const selectedSchema = schemaList.find((item) => item.schema_id === selectedSchemaId) ?? null;

  const buildSchema = (): SchemaPayload => ({
    dpi: 220,
    fields: Object.values(annotations).flat().map((annotation) => ({
      name: annotation.name,
      bbox: { x: annotation.x, y: annotation.y, w: annotation.width, h: annotation.height },
      pattern: annotation.regex || undefined,
      anchor: annotation.anchor || undefined,
      page: annotation.page,
    })),
  });

  const loadSchemas = useCallback(async () => {
    try {
      const response = await listSchemas();
      setSchemaList(response.items);
      if (!selectedSchemaId && response.items.length > 0) {
        setSelectedSchemaId(response.items[0].schema_id);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load schemas.');
    }
  }, [selectedSchemaId]);

  const loadHistory = useCallback(async () => {
    try {
      const response = await getHistory();
      setHistoryItems(response.items);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load history.');
    }
  }, []);

  useEffect(() => {
    if (activeView === 'schemas') void loadSchemas();
    if (activeView === 'history') void loadHistory();
  }, [activeView, loadHistory, loadSchemas]);

  const handleExtract = async () => {
    if (!pdfPath) {
      setErrorMessage('Upload a PDF to the backend before running extraction.');
      return;
    }
    if (totalFields === 0) {
      setErrorMessage('Define at least one field before running extraction.');
      return;
    }

    setExtracting(true);
    setErrorMessage(null);
    setStatusMessage('Running extraction...');
    try {
      const response = await runExtraction<ExtractionResult>(pdfPath, buildSchema());
      setResult(response.result);
      setStatusMessage('Extraction completed.');
      setActiveView('results');
      await loadHistory();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Extraction failed.');
      setStatusMessage(null);
    } finally {
      setExtracting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);

    const nextUrl = URL.createObjectURL(file);
    setPdfUrl(nextUrl);
    setPdfName(file.name);
    setPdfPath(null);
    setResult(null);
    setSavedSchema(null);
    setErrorMessage(null);
    setStatusMessage('Uploading PDF to backend...');
    setNumPages(null);
    setCurrentPage(1);
    setAnnotations({});
    setSelectedAnnotationId(null);
    setIsDrawing(false);
    setUploading(true);
    setActiveView('preview');

    try {
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
      GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      const [doc, uploadResponse] = await Promise.all([getDocument(nextUrl).promise, uploadPDF(file)]);
      setNumPages(doc.numPages);
      setPdfPath(uploadResponse.pdf_path);
      setStatusMessage(`Uploaded ${file.name} to backend.`);
      await loadHistory();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload PDF.');
      setStatusMessage(null);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSaveSchema = async () => {
    if (totalFields === 0) {
      setErrorMessage('Define at least one field before saving a schema.');
      return;
    }

    setSavingSchema(true);
    setErrorMessage(null);
    setStatusMessage('Saving schema...');
    try {
      const response = await saveSchema(buildSchema());
      setSavedSchema(response);
      setStatusMessage(`Schema saved: ${response.schema_id}`);
      await Promise.all([loadSchemas(), loadHistory()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Schema save failed.');
      setStatusMessage(null);
    } finally {
      setSavingSchema(false);
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(buildSchema(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(pdfName ?? 'schema').replace(/\.pdf$/i, '')}_schema.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAddAnnotation = (annotation: Omit<Annotation, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 11);
    setAnnotations((prev) => ({ ...prev, [currentPage]: [...(prev[currentPage] || []), { ...annotation, id }] }));
    setSelectedAnnotationId(id);
  };

  const handleUpdateAnnotation = (updated: Annotation) => {
    setAnnotations((prev) => ({
      ...prev,
      [currentPage]: (prev[currentPage] || []).map((annotation) => (annotation.id === updated.id ? updated : annotation)),
    }));
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations((prev) => ({ ...prev, [currentPage]: (prev[currentPage] || []).filter((annotation) => annotation.id !== id) }));
    if (selectedAnnotationId === id) setSelectedAnnotationId(null);
  };

  const renderMainView = () => {
    switch (activeView) {
      case 'schemas':
        return (
          <SchemaListView
            schemaList={schemaList}
            selectedSchemaId={selectedSchemaId}
            onSelectSchema={setSelectedSchemaId}
            onRefresh={() => void loadSchemas()}
          />
        );
      case 'results':
        return <ExtractResultsView result={result} />;
      case 'history':
        return <HistoryLogView historyItems={historyItems} onRefresh={() => void loadHistory()} />;
      case 'preview':
      default:
        return (
          <PreviewWorkspace
            pdfUrl={pdfUrl}
            currentPage={currentPage}
            numPages={numPages}
            zoom={zoom}
            isDrawing={isDrawing}
            pageAnnotations={pageAnnotations}
            selectedAnnotationId={selectedAnnotationId}
            pdfRef={pdfRef}
            containerRef={containerRef}
            onToggleDrawing={() => setIsDrawing((value) => !value)}
            onZoomOut={() => setZoom((value) => Math.max(0.5, +(value - 0.25).toFixed(2)))}
            onZoomReset={() => setZoom(1.5)}
            onZoomIn={() => setZoom((value) => Math.min(4, +(value + 0.25).toFixed(2)))}
            onPrevPage={() => setCurrentPage((value) => Math.max(1, value - 1))}
            onNextPage={() => setCurrentPage((value) => (numPages ? Math.min(numPages, value + 1) : value))}
            onAnnotationAdded={handleAddAnnotation}
            onAnnotationUpdated={handleUpdateAnnotation}
            onAnnotationSelected={setSelectedAnnotationId}
            onDrawingToggle={setIsDrawing}
          />
        );
    }
  };

  return (
    <div className="flex h-screen flex-col bg-slate-200 font-sans text-slate-900">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-300 bg-white px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-500 text-white">F</div>
          <span className="text-sm font-semibold">FieldMapper</span>
          {pdfUrl && <span className="text-xs text-slate-400">/</span>}
          {pdfUrl && <span className="max-w-[280px] truncate text-xs text-slate-600">{pdfName} | {totalFields} field{totalFields !== 1 ? 's' : ''}</span>}
        </div>
        <div className="flex items-center gap-2">
          <input type="file" accept=".pdf" className="hidden" id="pdf-upload" onChange={handleFileUpload} />
          <label htmlFor="pdf-upload" className="cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
            {pdfUrl ? 'Replace PDF' : 'Open PDF'}
          </label>
          <button onClick={handleExport} disabled={!pdfUrl || totalFields === 0} className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-30">Export JSON</button>
          <button onClick={handleSaveSchema} disabled={savingSchema || totalFields === 0} className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-30">
            {savingSchema ? 'Saving...' : 'Save Schema'}
          </button>
          <button onClick={handleExtract} disabled={extracting || uploading || !pdfPath} className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-30">
            {uploading ? 'Uploading...' : extracting ? 'Running...' : 'Run Extraction'}
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <LeftNav
          activeView={activeView}
          onChangeView={setActiveView}
          statusMessage={statusMessage}
          schemaId={savedSchema?.schema_id ?? null}
          errorMessage={errorMessage}
        />
        <section className="flex-1 overflow-hidden">{renderMainView()}</section>
        <RightPanel
          activeView={activeView}
          selectedSchema={selectedSchema}
          historyItems={historyItems}
          currentPage={currentPage}
          pageAnnotations={pageAnnotations}
          selectedAnnotationId={selectedAnnotationId}
          selectedAnnotation={selectedAnnotation}
          onSelectAnnotation={setSelectedAnnotationId}
          onUpdateAnnotation={handleUpdateAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
          pageResults={pageResults}
        />
      </main>
    </div>
  );
}
