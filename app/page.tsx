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
    const fields = Object.values(annotations).flat().map(({ id: _id, page: _page, ...rest }) => ({
      name: rest.name,
      bbox: { x: rest.x, y: rest.y, w: rest.width, h: rest.height },
      pattern: rest.regex,
      anchor: rest.anchor,
    }));
    const blob = new Blob([JSON.stringify({ fields }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const pageAnnotations = annotations[currentPage] || [];
  const selectedAnnotation = pageAnnotations.find(a => a.id === selectedAnnotationId) ?? null;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between bg-white shadow px-6 py-3 shrink-0">
        <h1 className="text-lg font-bold">PDF Field Annotator</h1>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            id="pdf-upload"
            onChange={handleFileUpload}
          />
          <label
            htmlFor="pdf-upload"
            className="cursor-pointer px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm hover:bg-gray-200"
          >
            {pdfUrl ? 'Replace PDF' : 'Upload PDF'}
          </label>
          <button
            onClick={handleExport}
            disabled={!pdfUrl}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-40"
          >
            Export schema.json
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left: PDF area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {pdfUrl && (
            /* Toolbar above PDF */
            <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-200 shrink-0">
              <button
                onClick={() => setIsDrawing(d => !d)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium border ${
                  isDrawing
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {isDrawing ? '✏ Drawing — click & drag on PDF' : '+ Draw Rectangle'}
              </button>

              <div className="flex items-center gap-2 ml-auto text-sm text-gray-600">
                <button
                  onClick={() => handlePageChange(-1)}
                  disabled={currentPage <= 1}
                  className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40"
                >
                  ←
                </button>
                <span>Page {currentPage}{numPages ? ` / ${numPages}` : ''}</span>
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={numPages === null || currentPage >= numPages}
                  className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>
          )}

          {/* PDF + overlay */}
          <div className="flex-1 overflow-auto relative">
            {!pdfUrl ? (
              <div className="flex h-full items-center justify-center">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center bg-white max-w-sm">
                  <p className="text-gray-400 mb-4">No PDF loaded</p>
                  <label
                    htmlFor="pdf-upload"
                    className="cursor-pointer px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Upload PDF
                  </label>
                </div>
              </div>
            ) : (
              <>
                <PdfViewer
                  pdfUrl={pdfUrl}
                  pageNumber={currentPage}
                  ref={pdfRef}
                  containerRef={containerRef}
                />
                <CanvasOverlay
                  pdfUrl={pdfUrl}
                  pageNumber={currentPage}
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
              </>
            )}
          </div>
        </div>

        {/* Right: Field editor */}
        <aside className="w-72 bg-white border-l border-gray-200 flex flex-col overflow-hidden shrink-0">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-sm text-gray-700">
              Fields on page {currentPage}
              {pageAnnotations.length > 0 && (
                <span className="ml-2 text-gray-400 font-normal">({pageAnnotations.length})</span>
              )}
            </h2>
          </div>

          {/* Annotation list */}
          {pageAnnotations.length > 0 && (
            <ul className="border-b border-gray-200 divide-y divide-gray-100 overflow-y-auto max-h-40">
              {pageAnnotations.map(ann => (
                <li key={ann.id}>
                  <button
                    onClick={() => setSelectedAnnotationId(ann.id === selectedAnnotationId ? null : ann.id)}
                    className={`w-full text-left px-4 py-2 text-sm truncate ${
                      ann.id === selectedAnnotationId
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {ann.name || '(unnamed)'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Field editor */}
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
