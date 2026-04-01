import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import { Annotation } from './types';

interface CanvasOverlayProps {
  pdfUrl: string;
  pageNumber: number;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  isDrawing: boolean;
  onAnnotationAdded: (annotation: Omit<Annotation, 'id'>) => void;
  onAnnotationUpdated: (annotation: Annotation) => void;
  onAnnotationDeleted: (id: string) => void;
  onAnnotationSelected: (id: string | null) => void;
  onDrawingToggle: (isDrawing: boolean) => void;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
}

export default function CanvasOverlay({
  pdfUrl,
  pageNumber,
  annotations,
  selectedAnnotationId,
  isDrawing,
  onAnnotationAdded,
  onAnnotationUpdated,
  onAnnotationDeleted,
  onAnnotationSelected,
  onDrawingToggle,
  containerRef
}: CanvasOverlayProps) {
  const stageRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState<Omit<Annotation, 'id'> | null>(null);

  // Store PDF dimensions for coordinate conversion
  const [pageWidth, setPageWidth] = useState<number>(800);
  const [pageHeight, setPageHeight] = useState<number>(1000);
  const [scale, setScale] = useState<number>(1.5);

  // Convert PDF coordinates to canvas coordinates
  const pdfToCanvas = useCallback((pdfX: number, pdfY: number) => {
    return {
      x: pdfX * scale,
      y: pdfY * scale
    };
  }, [scale]);

  // Convert canvas coordinates to PDF coordinates (normalized 0-1)
  const canvasToPdf = useCallback((canvasX: number, canvasY: number) => {
    return {
      x: canvasX / (pageWidth * scale),
      y: canvasY / (pageHeight * scale)
    };
  }, [pageWidth, pageHeight, scale]);

  useEffect(() => {
    if (!pdfUrl || !containerRef.current) return;

    // Load PDF to get dimensions for proper scaling
    import('pdfjs-dist').then(({ getDocument }) => {
      getDocument(pdfUrl).promise.then((pdfDoc: any) => {
        pdfDoc.getPage(pageNumber).then((page: any) => {
          const viewport = page.getViewport({ scale: 1.5 });
          setScale(viewport.scale);
          setPageWidth(viewport.width);
          setPageHeight(viewport.height);
          
          // Update stage size to match PDF viewport
          if (stageRef.current) {
            stageRef.current.width(viewport.width);
            stageRef.current.height(viewport.height);
          }
        });
      });
    });
  }, [pdfUrl, pageNumber]);

  const handleStageMouseDown = (e: any) => {
    if (!isDrawing) return;

    const stage = stageRef.current;
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    setIsSelecting(true);
    setStartPos(pointerPos);
    
    // Create a temporary rectangle
    const pdfPos = canvasToPdf(pointerPos.x, pointerPos.y);
    
    const tempAnnotation: Omit<Annotation, 'id'> = {
      name: `Field ${annotations.length + 1}`,
      regex: '',
      anchor: 'top-left',
      x: pdfPos.x,
      y: pdfPos.y,
      width: 0.001, // Minimal initial size
      height: 0.001, // Minimal initial size
      page: pageNumber
    };
    
    setCurrentRect(tempAnnotation);
  };

  const handleStageMouseMove = (e: any) => {
    if (!isSelecting || !isDrawing) return;

    const stage = stageRef.current;
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    const start = startPos;
    
    // Calculate rectangle dimensions in PDF coordinates
    const pdfStart = canvasToPdf(start.x, start.y);
    const pdfEnd = canvasToPdf(pointerPos.x, pointerPos.y);
    
    const normalizedX = Math.min(pdfStart.x, pdfEnd.x);
    const normalizedY = Math.min(pdfStart.y, pdfEnd.y);
    const normalizedWidth = Math.abs(pdfEnd.x - pdfStart.x);
    const normalizedHeight = Math.abs(pdfEnd.y - pdfStart.y);
    
    // Update current rectangle
    if (currentRect) {
      const updatedRect: Omit<Annotation, 'id'> = {
        ...currentRect,
        x: normalizedX,
        y: normalizedY,
        width: normalizedWidth,
        height: normalizedHeight
      };
      setCurrentRect(updatedRect);
    }
  };

  const handleStageMouseUp = (e: any) => {
    if (!isSelecting || !isDrawing) return;
    
    setIsSelecting(false);
    
    // Add the completed rectangle as an annotation
    if (currentRect && currentRect.width > 0.001 && currentRect.height > 0.001) {
      onAnnotationAdded(currentRect);
    }
    
    // Reset current rectangle
    setCurrentRect(null);
    onDrawingToggle(false); // Exit drawing mode after creating annotation
  };

  const handleRectangleChange = (rect: any) => {
    if (!selectedAnnotationId) return;

    // Find the existing annotation to preserve non-geometric properties
    const existingAnnotation = annotations.find(a => a.id === selectedAnnotationId);
    if (!existingAnnotation) return;

    // Convert from canvas to normalized PDF coordinates (0-1 range)
    const normalizedX = rect.x() / (pageWidth * scale);
    const normalizedY = rect.y() / (pageHeight * scale);
    const normalizedWidth = rect.width() / (pageWidth * scale);
    const normalizedHeight = rect.height() / (pageHeight * scale);

    onAnnotationUpdated({
      ...existingAnnotation, // Preserve all existing properties
      x: normalizedX,
      y: normalizedY,
      width: normalizedWidth,
      height: normalizedHeight
    });
  };

  return (
    <Stage
      ref={stageRef}
      width={pageWidth * scale}
      height={pageHeight * scale}
      onMouseDown={handleStageMouseDown}
      onMouseMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
      className="absolute inset-0"
    >
      <Layer ref={layerRef}>
        {annotations.map((annotation) => (
          <React.Fragment key={annotation.id}>
            <Rect
              x={annotation.x * pageWidth * scale} // Denormalize for display
              y={annotation.y * pageHeight * scale}
              width={annotation.width * pageWidth * scale}
              height={annotation.height * pageHeight * scale}
              fill="rgba(0, 123, 255, 0.2)"
              stroke="rgba(0, 123, 255, 0.5)"
              strokeWidth={2}
              draggable={true}
              id={annotation.id}
              onDragEnd={handleRectangleChange}
            />
            {selectedAnnotationId === annotation.id && (
              <Transformer
                ref={transformerRef}
                nodes={[layerRef.current.findOne(`#${annotation.id}`) as any]}
                boundBoxFunc={(oldRect: any, newRect: any) => {
                  handleRectangleChange(newRect);
                  return newRect;
                }}
              />
            )}
          </React.Fragment>
        ))}
        {/* Display current rectangle being drawn */}
        {isSelecting && currentRect && (
          <Rect
            x={currentRect.x * pageWidth * scale}
            y={currentRect.y * pageHeight * scale}
            width={currentRect.width * pageWidth * scale}
            height={currentRect.height * pageHeight * scale}
            fill="rgba(0, 123, 255, 0.2)"
            stroke="rgba(0, 123, 255, 0.8)"
            strokeWidth={2}
            dash={[5, 5]}
          />
        )}
      </Layer>
    </Stage>
  );
}