import { useEffect, useRef } from 'react';

interface PdfViewerProps {
  pdfUrl: string;
  pageNumber: number;
  ref: React.MutableRefObject<any>;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
}

export default function PdfViewer({ pdfUrl, pageNumber, ref, containerRef }: PdfViewerProps) {
  useEffect(() => {
    if (!pdfUrl || !containerRef.current) return;

    // Dynamically import pdfjs-dist to avoid SSR issues
    import('pdfjs-dist').then(({ getDocument, GlobalWorkerOptions }) => {
      GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
      const loadingTask = getDocument(pdfUrl);
      loadingTask.promise.then((pdfDoc: any) => {
        ref.current = pdfDoc;
        renderPage(pdfDoc, pageNumber);
      }).catch((err: Error) => {
        console.error('Error loading PDF:', err);
      });
    });

    return () => {
      // Cleanup
    };
  }, [pdfUrl, pageNumber]);

  const renderPage = (pdfDoc: any, pageNum: number) => {
    pdfDoc.getPage(pageNum).then((page: any) => {
      const viewport = page.getViewport({ scale: 1.5 });
      const container = containerRef.current;
      if (!container) return;

      // Clear previous canvas
      container.innerHTML = '';

      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      container.appendChild(canvas);

      // Render PDF page
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      page.render(renderContext);
    });
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-100">
      <div ref={containerRef} className="w-full h-full">
        {/* Canvas will be injected here */}
      </div>
    </div>
  );
}