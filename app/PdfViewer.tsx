import { useEffect } from 'react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/types/src/display/api';

interface PdfViewerProps {
  pdfUrl: string;
  pageNumber: number;
  zoom: number;
  pdfRef: React.RefObject<PDFDocumentProxy | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function PdfViewer({ pdfUrl, pageNumber, zoom, pdfRef, containerRef }: PdfViewerProps) {
  useEffect(() => {
    if (!pdfUrl || !containerRef.current) return;

    import('pdfjs-dist').then(({ getDocument, GlobalWorkerOptions }) => {
      GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();

      const loadingTask = getDocument(pdfUrl);
      loadingTask.promise
        .then((pdfDoc: PDFDocumentProxy) => {
          pdfRef.current = pdfDoc;
          return pdfDoc.getPage(pageNumber);
        })
        .then((page: PDFPageProxy) => {
          const viewport = page.getViewport({ scale: zoom });
          const container = containerRef.current;
          if (!container) return;

          container.innerHTML = '';

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) return;

          canvas.height = viewport.height;
          canvas.width = viewport.width;
          container.appendChild(canvas);

          void page.render({
            canvasContext: context,
            viewport,
          }).promise;
        })
        .catch((err: Error) => {
          console.error('Error loading PDF:', err);
        });
    });
  }, [containerRef, pageNumber, pdfRef, pdfUrl, zoom]);

  return (
    <div className="flex-1 overflow-auto bg-gray-100">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
