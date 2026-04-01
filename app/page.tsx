'use client';

import { useState, useRef, useCallback } from 'react';
import PdfViewer from './PdfViewer';
import CanvasOverlay from './CanvasOverlay';
import Sidebar from './Sidebar';
import Toolbar from './Toolbar';
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

    // Load PDF to get number of pages
    const { getDocument } = await import('pdfjs-dist');
    const doc = await getDocument(url).promise;
    setNumPages(doc.numPages);
    setCurrentPage(1);
    setAnnotations({});
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= (numPages || 0)) {
      setCurrentPage(page);
    }
  };

  const handleAddAnnotation = (annotation: Omit<Annotation, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newAnnotation: Annotation = { ...annotation, id };
    setAnnotations(prev => {
      const pageAnnotations = prev[currentPage] || [];
      return { ...prev, [currentPage]: [...pageAnnotations, newAnnotation] };
    });
  };

  const handleUpdateAnnotation = (updatedAnnotation: Annotation) => {
    setAnnotations(prev => {
      const pageAnnotations = prev[currentPage] || [];
      const updatedPageAnnotations = pageAnnotations.map(ann =>
        ann.id === updatedAnnotation.id ? updatedAnnotation : ann
      );
      return { ...prev, [currentPage]: updatedPageAnnotations };
    });
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(prev => {
      const pageAnnotations = prev[currentPage] || [];
      const updatedPageAnnotations = pageAnnotations.filter(ann => ann.id !== id);
      if (selectedAnnotationId === id) {
        setSelectedAnnotationId(null);
      }
      return { ...prev, [currentPage]: updatedPageAnnotations };
    });
  };

  const handleSelectAnnotation = (id: string | null) => {
    setSelectedAnnotationId(id);
  };

  const handleExport = () => {
    const schema = {
      version: "1.0",
      annotations: Object.entries(annotations).map(([page, anns]) => ({
        page: parseInt(page),
        annotations: anns
      }))
    };
    
    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getPageAnnotations = () => {
    return annotations[currentPage] || [];
  };

  if (!pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <h1 className="text-2xl font-bold mb-6">PDF Annotation Tool</h1>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center w-full max-w-xl">
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            id="pdf-upload"
            onChange={handleFileUpload}
          />
          <label
            htmlFor="pdf-upload"
            className="btn btn-primary hover:bg-blue-600"
          >
            Upload PDF
          </label>
          <p className="mt-4 text-sm text-gray-500">
            Or drag and drop a PDF file here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow-md px-6 py-4">
        <h1 className="text-xl font-bold">PDF Annotation Tool</h1>
      </header>
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <PdfViewer
            pdfUrl={pdfUrl}
            pageNumber={currentPage}
            ref={pdfRef}
            containerRef={containerRef}
          />
          <CanvasOverlay
            pdfUrl={pdfUrl}
            pageNumber={currentPage}
            annotations={getPageAnnotations()}
            selectedAnnotationId={selectedAnnotationId}
            isDrawing={isDrawing}
            onAnnotationAdded={handleAddAnnotation}
            onAnnotationUpdated={handleUpdateAnnotation}
            onAnnotationDeleted={handleDeleteAnnotation}
            onAnnotationSelected={handleSelectAnnotation}
            onDrawingToggle={setIsDrawing}
            containerRef={containerRef}
          />
        </div>
        <aside className="w-64 bg-white border-l border-gray-200">
          <Toolbar
            isDrawing={isDrawing}
            onDrawingToggle={setIsDrawing}
            currentPage={currentPage}
            numPages={numPages}
            onPageChange={handlePageChange}
          />
          <Sidebar
            annotation={getPageAnnotations().find(ann => ann.id === selectedAnnotationId) || null}
            onUpdate={handleUpdateAnnotation}
            onDelete={handleDeleteAnnotation}
          />
        </aside>
      </main>
      <footer className="bg-white shadow-md px-6 py-3">
        <button
          onClick={handleExport}
          className="btn btn-success"
        >
          Export Schema
        </button>
      </footer>
    </div>
  );
}