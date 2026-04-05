'use client';

import { useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import type { SaveSchemaResponse, SchemaPayload } from './api';
import { runExtraction, saveSchema, uploadPDF } from './api';
import CanvasOverlay from './CanvasOverlay';
import PdfViewer from './PdfViewer';
import Sidebar from './Sidebar';
import { Annotation } from './types';

function mkTheme(dk: boolean) {
  return {
    root: dk ? 'bg-slate-950' : 'bg-slate-400',
    header: dk ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-300',
    headerText: dk ? 'text-white' : 'text-slate-900',
    headerSub: dk ? 'text-slate-400' : 'text-slate-600',
    headerDiv: dk ? 'text-slate-600' : 'text-slate-400',
    uploadBtn: dk
      ? 'text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-700'
      : 'text-slate-700 bg-white hover:bg-slate-50 border-slate-300',
    secondaryBtn: dk
      ? 'text-slate-200 bg-slate-700 hover:bg-slate-600'
      : 'text-white bg-slate-700 hover:bg-slate-600',
    toolbar: dk ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-300',
    sep: dk ? 'bg-slate-700' : 'bg-slate-300',
    iconBtn: dk
      ? 'text-slate-400 hover:text-white hover:bg-slate-800'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200',
    drawBtnOff: dk
      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200',
    pageText: dk ? 'text-slate-400' : 'text-slate-700',
    pageTextDim: dk ? 'text-slate-600' : 'text-slate-500',
    canvas: dk ? 'bg-slate-950' : 'bg-slate-400',
    canvasDot: dk ? '#334155' : '#64748b',
    emptyIcon: dk ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-400',
    emptyTitle: dk ? 'text-slate-300' : 'text-slate-800',
    emptySub: dk ? 'text-slate-500' : 'text-slate-600',
    panel: dk ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-300',
    panelBorder: dk ? 'border-slate-800' : 'border-slate-300',
    panelLabel: dk ? 'text-slate-400' : 'text-slate-500',
    listEmpty: dk ? 'text-slate-600' : 'text-slate-500',
    fieldSel: dk ? 'bg-indigo-600/20 border-indigo-500' : 'bg-indigo-100 border-indigo-500',
    fieldDef: dk ? 'border-transparent hover:bg-slate-800' : 'border-transparent hover:bg-slate-200',
    badgeSel: dk ? 'bg-indigo-500 text-white' : 'bg-indigo-500 text-white',
    badgeDef: dk ? 'bg-slate-700 text-slate-400' : 'bg-slate-300 text-slate-600',
    fieldTxtSel: dk ? 'text-indigo-200 font-medium' : 'text-indigo-700 font-medium',
    fieldTxtDef: dk ? 'text-slate-300' : 'text-slate-700',
    resultValue: dk ? 'text-slate-200' : 'text-slate-800',
  };
}

type ExtractionFieldResult = {
  value: string | null;
  raw_text: string;
  cleaned_text: string;
  match_type: string;
  confidence: number;
  page: number;
  debug_crop_path: string;
  error: string | null;
};

type ExtractionResult = {
  pdf: string;
  page: number;
  dpi: number;
  fields: Record<string, ExtractionFieldResult>;
};

export default function Home() {
  const [isDark, setIsDark] = useState(true);
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
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [annotations, setAnnotations] = useState<Record<number, Annotation[]>>({});
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [zoom, setZoom] = useState(1.5);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const t = mkTheme(isDark);
  const totalFields = Object.values(annotations).flat().length;
  const pageAnnotations = annotations[currentPage] || [];
  const selectedAnnotation = pageAnnotations.find((annotation) => annotation.id === selectedAnnotationId) ?? null;
  const pageResults = Object.entries(result?.fields ?? {}).filter(([, field]) => field.page === currentPage);

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

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }

    const nextUrl = URL.createObjectURL(file);
    setPdfUrl(nextUrl);
    setPdfName(file.name);
    setPdfPath(null);
    setResult(null);
    setSavedSchema(null);
    setStatusMessage('Uploading PDF to backend...');
    setErrorMessage(null);
    setNumPages(null);
    setCurrentPage(1);
    setAnnotations({});
    setSelectedAnnotationId(null);
    setIsDrawing(false);
    setUploading(true);

    try {
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
      GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      const [doc, uploadResponse] = await Promise.all([getDocument(nextUrl).promise, uploadPDF(file)]);
      setNumPages(doc.numPages);
      setPdfPath(uploadResponse.pdf_path);
      setStatusMessage(`Uploaded ${file.name} to backend.`);
    } catch (error) {
      console.error('Failed to prepare PDF:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload PDF.');
      setStatusMessage(null);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAddAnnotation = (annotation: Omit<Annotation, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 11);
    setAnnotations((prev) => {
      const currentAnnotations = prev[currentPage] || [];
      return { ...prev, [currentPage]: [...currentAnnotations, { ...annotation, id }] };
    });
    setSelectedAnnotationId(id);
  };

  const handleUpdateAnnotation = (updated: Annotation) => {
    setAnnotations((prev) => {
      const currentAnnotations = prev[currentPage] || [];
      return {
        ...prev,
        [currentPage]: currentAnnotations.map((annotation) =>
          annotation.id === updated.id ? updated : annotation,
        ),
      };
    });
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations((prev) => {
      const currentAnnotations = prev[currentPage] || [];
      return { ...prev, [currentPage]: currentAnnotations.filter((annotation) => annotation.id !== id) };
    });
    if (selectedAnnotationId === id) {
      setSelectedAnnotationId(null);
    }
  };

  const handlePageChange = (delta: number) => {
    setCurrentPage((prev) => {
      const next = prev + delta;
      if (next < 1 || (numPages !== null && next > numPages)) {
        return prev;
      }
      return next;
    });
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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Schema save failed.');
      setStatusMessage(null);
    } finally {
      setSavingSchema(false);
    }
  };

  return (
    <div className={`flex h-screen flex-col font-sans ${t.root}`}>
      <header className={`flex h-12 shrink-0 items-center justify-between border-b px-5 ${t.header}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-indigo-500">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.9" />
              <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.5" />
              <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.5" />
              <rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.2" />
            </svg>
          </div>
          <span className={`text-sm font-semibold tracking-tight ${t.headerText}`}>FieldMapper</span>
          {pdfUrl && <span className={`text-xs ${t.headerDiv}`}>/</span>}
          {pdfUrl && (
            <span className={`max-w-[260px] truncate text-xs ${t.headerSub}`}>
              {pdfName ?? 'Document'} | {totalFields} field{totalFields !== 1 ? 's' : ''} defined
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDark((value) => !value)}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${t.uploadBtn}`}
          >
            {isDark ? (
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path
                  d="M17.5 12A7.5 7.5 0 0 1 8 2.5a7.502 7.502 0 1 0 9.5 9.5z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>

          <div className={`h-5 w-px ${t.sep}`} />

          <input type="file" accept=".pdf" className="hidden" id="pdf-upload" onChange={handleFileUpload} />
          <label
            htmlFor="pdf-upload"
            className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${t.uploadBtn}`}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 12.5V14h12v-1.5M8 2v9m0-9L5 5m3-3 3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {pdfUrl ? 'Replace PDF' : 'Open PDF'}
          </label>

          <button
            onClick={handleExport}
            disabled={!pdfUrl || totalFields === 0}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 9.5V13h10V9.5M8 2.5v7m0 0-2.5-2.5M8 9.5l2.5-2.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Export JSON
          </button>

          <button
            onClick={handleSaveSchema}
            disabled={savingSchema || totalFields === 0}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${t.secondaryBtn}`}
          >
            {savingSchema ? 'Saving...' : 'Save Schema'}
          </button>

          <button
            onClick={handleExtract}
            disabled={extracting || uploading || !pdfPath}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {uploading ? 'Uploading...' : extracting ? 'Running...' : 'Run Extraction'}
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className={`flex h-11 shrink-0 items-center gap-1 border-b px-4 ${t.toolbar}`}>
            <button
              onClick={() => setIsDrawing((value) => !value)}
              title={isDrawing ? 'Exit draw mode' : 'Draw rectangle'}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                isDrawing ? 'bg-indigo-600 text-white' : t.drawBtnOff
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect
                  x="2"
                  y="2"
                  width="12"
                  height="12"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray={isDrawing ? undefined : '3 2'}
                />
                {isDrawing && (
                  <path d="M5.5 8H10.5M8 5.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                )}
              </svg>
              {isDrawing ? 'Drawing...' : 'Draw Field'}
            </button>

            <div className={`mx-1 h-5 w-px ${t.sep}`} />

            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom((value) => Math.max(0.5, +(value - 0.25).toFixed(2)))}
                className={`flex h-7 w-7 items-center justify-center rounded text-base leading-none transition-colors ${t.iconBtn}`}
              >
                -
              </button>
              <button
                onClick={() => setZoom(1.5)}
                className={`h-7 w-12 rounded text-xs transition-colors ${t.iconBtn}`}
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={() => setZoom((value) => Math.min(4, +(value + 0.25).toFixed(2)))}
                className={`flex h-7 w-7 items-center justify-center rounded text-base leading-none transition-colors ${t.iconBtn}`}
              >
                +
              </button>
            </div>

            {pdfUrl && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(-1)}
                  disabled={currentPage <= 1}
                  className={`flex h-7 w-7 items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${t.iconBtn}`}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M7.5 2L4 6l3.5 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <span className={`text-xs tabular-nums ${t.pageText}`}>
                  {currentPage}
                  <span className={t.pageTextDim}> / {numPages ?? '-'}</span>
                </span>
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={numPages === null || currentPage >= numPages}
                  className={`flex h-7 w-7 items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${t.iconBtn}`}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M4.5 2L8 6l-3.5 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          <div
            className={`flex-1 overflow-auto ${t.canvas}`}
            style={{
              backgroundImage: `radial-gradient(circle, ${t.canvasDot} 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          >
            {!pdfUrl ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border ${t.emptyIcon}`}>
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <path d="M7 6a2 2 0 0 1 2-2h8l6 6v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6z" stroke="#6366f1" strokeWidth="1.5" />
                      <path d="M17 4v6h6" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
                      <path
                        d="M14 13v6m0-6-2 2m2-2 2 2"
                        stroke="#6366f1"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p className={`mb-1 font-medium ${t.emptyTitle}`}>No document open</p>
                  <p className={`mb-5 text-sm ${t.emptySub}`}>Upload a PDF to start defining fields</p>
                  <label
                    htmlFor="pdf-upload"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
                  >
                    Open PDF
                  </label>
                </div>
              </div>
            ) : (
              <div className="flex min-h-full items-start justify-center p-10">
                <div className="relative inline-block shadow-2xl">
                  <PdfViewer
                    pdfUrl={pdfUrl}
                    pageNumber={currentPage}
                    zoom={zoom}
                    pdfRef={pdfRef}
                    containerRef={containerRef}
                  />
                  <CanvasOverlay
                    pdfUrl={pdfUrl}
                    pageNumber={currentPage}
                    zoom={zoom}
                    annotations={pageAnnotations}
                    selectedAnnotationId={selectedAnnotationId}
                    isDrawing={isDrawing}
                    onAnnotationAdded={handleAddAnnotation}
                    onAnnotationUpdated={handleUpdateAnnotation}
                    onAnnotationSelected={setSelectedAnnotationId}
                    onDrawingToggle={setIsDrawing}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className={`flex w-80 shrink-0 flex-col overflow-hidden border-l ${t.panel}`}>
          <div className={`border-b px-4 py-3 ${t.panelBorder}`}>
            <p className={`text-xs font-semibold uppercase tracking-widest ${t.panelLabel}`}>Fields</p>
            {(statusMessage || errorMessage || savedSchema) && (
              <div className="mt-3 space-y-1">
                {statusMessage && <p className="text-[11px] text-emerald-400">{statusMessage}</p>}
                {savedSchema && <p className="text-[11px] text-sky-400">Schema ID: {savedSchema.schema_id}</p>}
                {errorMessage && <p className="text-[11px] text-red-400">{errorMessage}</p>}
              </div>
            )}
          </div>

          <div className={`overflow-y-auto border-b ${t.panelBorder}`} style={{ maxHeight: '240px' }}>
            {pageAnnotations.length === 0 ? (
              <p className={`px-4 py-3 text-xs italic ${t.listEmpty}`}>No fields on page {currentPage}</p>
            ) : (
              <ul>
                {pageAnnotations.map((annotation, index) => (
                  <li key={annotation.id}>
                    <button
                      onClick={() =>
                        setSelectedAnnotationId(annotation.id === selectedAnnotationId ? null : annotation.id)
                      }
                      className={`flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-left transition-colors ${
                        annotation.id === selectedAnnotationId ? t.fieldSel : t.fieldDef
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                          annotation.id === selectedAnnotationId ? t.badgeSel : t.badgeDef
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span
                        className={`truncate text-sm ${
                          annotation.id === selectedAnnotationId ? t.fieldTxtSel : t.fieldTxtDef
                        }`}
                      >
                        {annotation.name || '(unnamed)'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            <Sidebar
              key={selectedAnnotation?.id ?? 'empty'}
              annotation={selectedAnnotation}
              isDark={isDark}
              onUpdate={handleUpdateAnnotation}
              onDelete={handleDeleteAnnotation}
            />

            <div className={`mx-4 mb-4 rounded-xl border p-4 ${t.panelBorder}`}>
              <p className={`mb-3 text-xs font-semibold uppercase tracking-widest ${t.panelLabel}`}>Results</p>
              {pageResults.length === 0 ? (
                <p className={`text-xs ${t.listEmpty}`}>
                  {result ? `No extraction results for page ${currentPage}.` : 'Run extraction to view field values.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {pageResults.map(([fieldName, field]) => (
                    <div key={fieldName} className={`rounded-lg border p-3 ${t.panelBorder}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${t.fieldTxtDef}`}>{fieldName}</p>
                        <span className={`text-[10px] uppercase tracking-wider ${t.panelLabel}`}>
                          {field.match_type}
                        </span>
                      </div>
                      <p className={`mt-2 break-words text-xs ${t.resultValue}`}>
                        {field.value || 'No value extracted'}
                      </p>
                      <p className={`mt-2 text-[11px] ${t.panelLabel}`}>Confidence: {field.confidence}</p>
                      {field.error && <p className="mt-2 text-[11px] text-red-400">{field.error}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
