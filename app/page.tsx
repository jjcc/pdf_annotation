'use client';

import { useState, useRef } from 'react';
import PdfViewer from './PdfViewer';
import CanvasOverlay from './CanvasOverlay';
import Sidebar from './Sidebar';
import { Annotation } from './types';

// ── Theme tokens ─────────────────────────────────────────────
function mkTheme(dk: boolean) {
  return {
    root:          dk ? 'bg-slate-950'                                     : 'bg-slate-400',
    header:        dk ? 'bg-slate-900 border-slate-800'                    : 'bg-slate-100 border-slate-300',
    headerText:    dk ? 'text-white'                                       : 'text-slate-900',
    headerSub:     dk ? 'text-slate-400'                                   : 'text-slate-600',
    headerDiv:     dk ? 'text-slate-600'                                   : 'text-slate-400',
    uploadBtn:     dk ? 'text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-700'
                      : 'text-slate-700 bg-white hover:bg-slate-50 border-slate-300',
    toolbar:       dk ? 'bg-slate-900 border-slate-800'                    : 'bg-slate-100 border-slate-300',
    sep:           dk ? 'bg-slate-700'                                     : 'bg-slate-300',
    iconBtn:       dk ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200',
    drawBtnOff:    dk ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200',
    pageText:      dk ? 'text-slate-400'                                   : 'text-slate-700',
    pageTextDim:   dk ? 'text-slate-600'                                   : 'text-slate-500',
    canvas:        dk ? 'bg-slate-950'                                     : 'bg-slate-400',
    canvasDot:     dk ? '#334155'                                          : '#64748b',
    emptyIcon:     dk ? 'bg-slate-800 border-slate-700'                    : 'bg-slate-200 border-slate-400',
    emptyTitle:    dk ? 'text-slate-300'                                   : 'text-slate-800',
    emptySub:      dk ? 'text-slate-500'                                   : 'text-slate-600',
    panel:         dk ? 'bg-slate-900 border-slate-800'                    : 'bg-slate-100 border-slate-300',
    panelBorder:   dk ? 'border-slate-800'                                 : 'border-slate-300',
    panelLabel:    dk ? 'text-slate-400'                                   : 'text-slate-500',
    listEmpty:     dk ? 'text-slate-600'                                   : 'text-slate-500',
    fieldSel:      dk ? 'bg-indigo-600/20 border-indigo-500'               : 'bg-indigo-100 border-indigo-500',
    fieldDef:      dk ? 'border-transparent hover:bg-slate-800'            : 'border-transparent hover:bg-slate-200',
    badgeSel:      dk ? 'bg-indigo-500 text-white'                        : 'bg-indigo-500 text-white',
    badgeDef:      dk ? 'bg-slate-700 text-slate-400'                     : 'bg-slate-300 text-slate-600',
    fieldTxtSel:   dk ? 'text-indigo-200 font-medium'                     : 'text-indigo-700 font-medium',
    fieldTxtDef:   dk ? 'text-slate-300'                                   : 'text-slate-700',
  };
}

export default function Home() {
  const [isDark, setIsDark] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [annotations, setAnnotations] = useState<Record<number, Annotation[]>>({});
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1.5);
  const pdfRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const t = mkTheme(isDark);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    setNumPages(null);
    setCurrentPage(1);
    setAnnotations({});
    setSelectedAnnotationId(null);
    setIsDrawing(false);
    try {
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
      GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      const doc = await getDocument(url).promise;
      setNumPages(doc.numPages);
    } catch (err) {
      console.error('Failed to read PDF metadata:', err);
    }
    e.target.value = '';
  };

  const handleAddAnnotation = (annotation: Omit<Annotation, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setAnnotations(prev => {
      const cur = prev[currentPage] || [];
      return { ...prev, [currentPage]: [...cur, { ...annotation, id }] };
    });
    setSelectedAnnotationId(id);
  };

  const handleUpdateAnnotation = (updated: Annotation) => {
    setAnnotations(prev => {
      const cur = prev[currentPage] || [];
      return { ...prev, [currentPage]: cur.map(a => a.id === updated.id ? updated : a) };
    });
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(prev => {
      const cur = prev[currentPage] || [];
      return { ...prev, [currentPage]: cur.filter(a => a.id !== id) };
    });
    if (selectedAnnotationId === id) setSelectedAnnotationId(null);
  };

  const handlePageChange = (delta: number) => {
    setCurrentPage(prev => {
      const next = prev + delta;
      if (next < 1 || (numPages !== null && next > numPages)) return prev;
      return next;
    });
  };

  const handleExport = () => {
    const fields = Object.values(annotations).flat().map(({ id: _id, ...rest }) => ({
      name: rest.name,
      bbox: { x: rest.x, y: rest.y, w: rest.width, h: rest.height },
      pattern: rest.regex,
      anchor: rest.anchor,
      page: rest.page,
    }));
    const blob = new Blob([JSON.stringify({ fields }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalFields = Object.values(annotations).flat().length;
  const pageAnnotations = annotations[currentPage] || [];
  const selectedAnnotation = pageAnnotations.find(a => a.id === selectedAnnotationId) ?? null;

  return (
    <div className={`flex flex-col h-screen font-sans ${t.root}`}>

      {/* ── Top bar ── */}
      <header className={`flex items-center justify-between px-5 h-12 border-b shrink-0 ${t.header}`}>
        {/* Left: logo + doc info */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.9"/>
              <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
              <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
              <rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.2"/>
            </svg>
          </div>
          <span className={`text-sm font-semibold tracking-tight ${t.headerText}`}>FieldMapper</span>
          {pdfUrl && <span className={`text-xs ${t.headerDiv}`}>/</span>}
          {pdfUrl && (
            <span className={`text-xs truncate max-w-[200px] ${t.headerSub}`}>
              {totalFields} field{totalFields !== 1 ? 's' : ''} defined
            </span>
          )}
        </div>

        {/* Right: theme toggle + actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={() => setIsDark(d => !d)}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`w-8 h-8 flex items-center justify-center rounded-md border transition-colors ${t.uploadBtn}`}
          >
            {isDark ? (
              /* Sun */
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              /* Moon */
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path d="M17.5 12A7.5 7.5 0 0 1 8 2.5a7.502 7.502 0 1 0 9.5 9.5z"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>

          <div className={`w-px h-5 ${t.sep}`} />

          <input type="file" accept=".pdf" className="hidden" id="pdf-upload" onChange={handleFileUpload} />
          <label
            htmlFor="pdf-upload"
            className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${t.uploadBtn}`}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M2 12.5V14h12v-1.5M8 2v9m0-9L5 5m3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {pdfUrl ? 'Replace PDF' : 'Open PDF'}
          </label>

          <button
            onClick={handleExport}
            disabled={!pdfUrl || totalFields === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M3 9.5V13h10V9.5M8 2.5v7m0 0-2.5-2.5M8 9.5l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export JSON
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">

        {/* ── Canvas column ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Canvas toolbar */}
          <div className={`flex items-center gap-1 px-4 h-11 border-b shrink-0 ${t.toolbar}`}>

            {/* Draw tool */}
            <button
              onClick={() => setIsDrawing(d => !d)}
              title={isDrawing ? 'Exit draw mode' : 'Draw rectangle'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isDrawing ? 'bg-indigo-600 text-white' : t.drawBtnOff
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5"
                  strokeDasharray={isDrawing ? undefined : '3 2'}/>
                {isDrawing && <path d="M5.5 8H10.5M8 5.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>}
              </svg>
              {isDrawing ? 'Drawing…' : 'Draw Field'}
            </button>

            <div className={`w-px h-5 mx-1 ${t.sep}`} />

            {/* Zoom */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                className={`w-7 h-7 flex items-center justify-center rounded text-base leading-none transition-colors ${t.iconBtn}`}
              >−</button>
              <button
                onClick={() => setZoom(1.5)}
                className={`w-12 h-7 text-xs rounded transition-colors ${t.iconBtn}`}
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={() => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))}
                className={`w-7 h-7 flex items-center justify-center rounded text-base leading-none transition-colors ${t.iconBtn}`}
              >+</button>
            </div>

            {/* Page nav */}
            {pdfUrl && (
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => handlePageChange(-1)}
                  disabled={currentPage <= 1}
                  className={`w-7 h-7 flex items-center justify-center rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${t.iconBtn}`}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M7.5 2L4 6l3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <span className={`text-xs tabular-nums ${t.pageText}`}>
                  {currentPage}<span className={t.pageTextDim}> / {numPages ?? '—'}</span>
                </span>
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={numPages === null || currentPage >= numPages}
                  className={`w-7 h-7 flex items-center justify-center rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${t.iconBtn}`}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M4.5 2L8 6l-3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* PDF canvas area */}
          <div
            className={`flex-1 overflow-auto ${t.canvas}`}
            style={{
              backgroundImage: `radial-gradient(circle, ${t.canvasDot} 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          >
            {!pdfUrl ? (
              /* Empty state — vertically + horizontally centered */
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto mb-5 ${t.emptyIcon}`}>
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <path d="M7 6a2 2 0 0 1 2-2h8l6 6v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6z" stroke="#6366f1" strokeWidth="1.5"/>
                      <path d="M17 4v6h6" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M14 13v6m0-6-2 2m2-2 2 2" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className={`font-medium mb-1 ${t.emptyTitle}`}>No document open</p>
                  <p className={`text-sm mb-5 ${t.emptySub}`}>Upload a PDF to start defining fields</p>
                  <label
                    htmlFor="pdf-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                  >
                    Open PDF
                  </label>
                </div>
              </div>
            ) : (
              /* PDF centered horizontally, padding on all sides */
              <div className="flex justify-center items-start p-10 min-h-full">
                <div className="relative inline-block shadow-2xl">
                  <PdfViewer
                    pdfUrl={pdfUrl}
                    pageNumber={currentPage}
                    zoom={zoom}
                    ref={pdfRef}
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
                    onAnnotationDeleted={handleDeleteAnnotation}
                    onAnnotationSelected={setSelectedAnnotationId}
                    onDrawingToggle={setIsDrawing}
                    containerRef={containerRef}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        <aside className={`w-72 border-l flex flex-col overflow-hidden shrink-0 ${t.panel}`}>

          <div className={`px-4 py-3 border-b ${t.panelBorder}`}>
            <p className={`text-xs font-semibold uppercase tracking-widest ${t.panelLabel}`}>Fields</p>
          </div>

          {/* Field list */}
          <div className={`overflow-y-auto border-b ${t.panelBorder}`} style={{ maxHeight: '240px' }}>
            {pageAnnotations.length === 0 ? (
              <p className={`px-4 py-3 text-xs italic ${t.listEmpty}`}>
                No fields on page {currentPage}
              </p>
            ) : (
              <ul>
                {pageAnnotations.map((ann, i) => (
                  <li key={ann.id}>
                    <button
                      onClick={() => setSelectedAnnotationId(ann.id === selectedAnnotationId ? null : ann.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-l-2 transition-colors ${
                        ann.id === selectedAnnotationId ? t.fieldSel : t.fieldDef
                      }`}
                    >
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        ann.id === selectedAnnotationId ? t.badgeSel : t.badgeDef
                      }`}>
                        {i + 1}
                      </span>
                      <span className={`text-sm truncate ${
                        ann.id === selectedAnnotationId ? t.fieldTxtSel : t.fieldTxtDef
                      }`}>
                        {ann.name || '(unnamed)'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Properties panel */}
          <div className="flex-1 overflow-y-auto">
            <Sidebar
              annotation={selectedAnnotation}
              isDark={isDark}
              onUpdate={handleUpdateAnnotation}
              onDelete={handleDeleteAnnotation}
            />
          </div>
        </aside>
      </main>
    </div>
  );
}
