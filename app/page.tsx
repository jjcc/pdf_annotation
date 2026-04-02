'use client';

import { useState, useRef } from 'react';
import PdfViewer from './PdfViewer';
import CanvasOverlay from './CanvasOverlay';
import Sidebar from './Sidebar';
import { Annotation } from './types';

export default function Home() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [annotations, setAnnotations] = useState<Record<number, Annotation[]>>({});
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1.5);
  const pdfRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
      const doc = await getDocument(url).promise;
      setNumPages(doc.numPages);
    } catch (error) {
      console.error('Failed to read PDF metadata:', error);
    }

    e.target.value = '';
  };

  const handleAddAnnotation = (annotation: Omit<Annotation, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setAnnotations(prev => {
      const pageAnnotations = prev[currentPage] || [];
      return { ...prev, [currentPage]: [...pageAnnotations, { ...annotation, id }] };
    });
    setSelectedAnnotationId(id);
  };

  const handleUpdateAnnotation = (updatedAnnotation: Annotation) => {
    setAnnotations(prev => {
      const pageAnnotations = prev[currentPage] || [];
      return {
        ...prev,
        [currentPage]: pageAnnotations.map(ann =>
          ann.id === updatedAnnotation.id ? updatedAnnotation : ann
        ),
      };
    });
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(prev => {
      const pageAnnotations = prev[currentPage] || [];
      return { ...prev, [currentPage]: pageAnnotations.filter(ann => ann.id !== id) };
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
    <div className="flex flex-col h-screen bg-slate-950 font-sans">

      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-5 h-12 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.9"/>
              <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
              <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
              <rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.2"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">FieldMapper</span>
          {pdfUrl && (
            <span className="text-slate-500 text-xs">/</span>
          )}
          {pdfUrl && (
            <span className="text-slate-400 text-xs truncate max-w-[200px]">
              {totalFields} field{totalFields !== 1 ? 's' : ''} defined
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input type="file" accept=".pdf" className="hidden" id="pdf-upload" onChange={handleFileUpload} />
          <label
            htmlFor="pdf-upload"
            className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
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
          <div className="flex items-center gap-1 px-4 h-11 bg-slate-900 border-b border-slate-800 shrink-0">

            {/* Draw tool */}
            <button
              onClick={() => setIsDrawing(d => !d)}
              title={isDrawing ? 'Exit draw mode (Esc)' : 'Draw rectangle'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isDrawing
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray={isDrawing ? undefined : "3 2"}/>
                {isDrawing && <path d="M5.5 8H10.5M8 5.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>}
              </svg>
              {isDrawing ? 'Drawing…' : 'Draw Field'}
            </button>

            <div className="w-px h-5 bg-slate-700 mx-1" />

            {/* Zoom */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded text-base leading-none transition-colors"
              >−</button>
              <button
                onClick={() => setZoom(1.5)}
                className="w-12 h-7 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={() => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded text-base leading-none transition-colors"
              >+</button>
            </div>

            {/* Page nav — pushed to right */}
            {pdfUrl && (
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => handlePageChange(-1)}
                  disabled={currentPage <= 1}
                  className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M7.5 2L4 6l3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <span className="text-xs text-slate-400 tabular-nums">
                  {currentPage}<span className="text-slate-600"> / {numPages ?? '—'}</span>
                </span>
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={numPages === null || currentPage >= numPages}
                  className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M4.5 2L8 6l-3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* PDF canvas */}
          <div className="flex-1 overflow-auto relative bg-slate-950"
               style={{ backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
            {!pdfUrl ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-5">
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <path d="M7 6a2 2 0 0 1 2-2h8l6 6v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6z" stroke="#6366f1" strokeWidth="1.5"/>
                      <path d="M17 4v6h6" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M14 13v6m0-6-2 2m2-2 2 2" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="text-slate-300 font-medium mb-1">No document open</p>
                  <p className="text-slate-500 text-sm mb-5">Upload a PDF to start defining fields</p>
                  <label
                    htmlFor="pdf-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                  >
                    Open PDF
                  </label>
                </div>
              </div>
            ) : (
              <div className="p-8">
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
        <aside className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden shrink-0">

          {/* Panel header */}
          <div className="px-4 py-3 border-b border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Fields</p>
          </div>

          {/* Field list */}
          <div className="overflow-y-auto border-b border-slate-800" style={{ maxHeight: '240px' }}>
            {pageAnnotations.length === 0 ? (
              <p className="px-4 py-3 text-xs text-slate-600 italic">
                No fields on page {currentPage}
              </p>
            ) : (
              <ul>
                {pageAnnotations.map((ann, i) => (
                  <li key={ann.id}>
                    <button
                      onClick={() => setSelectedAnnotationId(ann.id === selectedAnnotationId ? null : ann.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        ann.id === selectedAnnotationId
                          ? 'bg-indigo-600/20 border-l-2 border-indigo-500'
                          : 'border-l-2 border-transparent hover:bg-slate-800'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        ann.id === selectedAnnotationId ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {i + 1}
                      </span>
                      <span className={`text-sm truncate ${
                        ann.id === selectedAnnotationId ? 'text-indigo-200 font-medium' : 'text-slate-300'
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
              onUpdate={handleUpdateAnnotation}
              onDelete={handleDeleteAnnotation}
            />
          </div>
        </aside>
      </main>
    </div>
  );
}
