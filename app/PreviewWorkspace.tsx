import CanvasOverlay from './CanvasOverlay';
import PdfViewer from './PdfViewer';
import { classByState } from './ui-utils';
import type { Annotation } from './types';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

type PreviewWorkspaceProps = {
  pdfUrl: string | null;
  currentPage: number;
  numPages: number | null;
  zoom: number;
  isDrawing: boolean;
  pageAnnotations: Annotation[];
  selectedAnnotationId: string | null;
  pdfRef: React.RefObject<PDFDocumentProxy | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onToggleDrawing: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomIn: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onAnnotationAdded: (annotation: Omit<Annotation, 'id'>) => void;
  onAnnotationUpdated: (annotation: Annotation) => void;
  onAnnotationSelected: (id: string | null) => void;
  onDrawingToggle: (isDrawing: boolean) => void;
};

export default function PreviewWorkspace({
  pdfUrl,
  currentPage,
  numPages,
  zoom,
  isDrawing,
  pageAnnotations,
  selectedAnnotationId,
  pdfRef,
  containerRef,
  onToggleDrawing,
  onZoomOut,
  onZoomReset,
  onZoomIn,
  onPrevPage,
  onNextPage,
  onAnnotationAdded,
  onAnnotationUpdated,
  onAnnotationSelected,
  onDrawingToggle,
}: PreviewWorkspaceProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-slate-300 bg-slate-50 px-4">
        <button onClick={onToggleDrawing} className={`rounded-md px-3 py-1.5 text-xs font-medium ${classByState(isDrawing, 'bg-indigo-600 text-white', 'text-slate-700 hover:bg-slate-200')}`}>
          {isDrawing ? 'Drawing...' : 'Draw Field'}
        </button>
        <button onClick={onZoomOut} className="rounded px-2 text-slate-700 hover:bg-slate-200">-</button>
        <button onClick={onZoomReset} className="rounded px-2 text-xs text-slate-700 hover:bg-slate-200">{Math.round(zoom * 100)}%</button>
        <button onClick={onZoomIn} className="rounded px-2 text-slate-700 hover:bg-slate-200">+</button>
        {pdfUrl && (
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-700">
            <button onClick={onPrevPage} disabled={currentPage <= 1} className="rounded px-2 hover:bg-slate-200 disabled:opacity-30">{'<'}</button>
            <span>{currentPage} / {numPages ?? '-'}</span>
            <button onClick={onNextPage} disabled={numPages === null || currentPage >= numPages} className="rounded px-2 hover:bg-slate-200 disabled:opacity-30">{'>'}</button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto bg-slate-300" style={{ backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
        {!pdfUrl ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="mb-2 text-lg font-semibold text-slate-800">No document open</p>
              <p className="text-sm text-slate-600">Upload a PDF to start defining fields.</p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-full items-start justify-center p-10">
            <div className="relative inline-block shadow-2xl">
              <PdfViewer pdfUrl={pdfUrl} pageNumber={currentPage} zoom={zoom} pdfRef={pdfRef} containerRef={containerRef} />
              <CanvasOverlay
                pdfUrl={pdfUrl}
                pageNumber={currentPage}
                zoom={zoom}
                annotations={pageAnnotations}
                selectedAnnotationId={selectedAnnotationId}
                isDrawing={isDrawing}
                onAnnotationAdded={onAnnotationAdded}
                onAnnotationUpdated={onAnnotationUpdated}
                onAnnotationSelected={onAnnotationSelected}
                onDrawingToggle={onDrawingToggle}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
