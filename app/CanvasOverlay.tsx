import React, { useEffect, useRef, useState } from 'react';
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

  // Canvas pixel dimensions (viewport.width/height are already scaled by pdfjs)
  const [canvasWidth, setCanvasWidth] = useState<number>(800);
  const [canvasHeight, setCanvasHeight] = useState<number>(1000);

  // Drawing state (in canvas pixel coords)
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [drawRect, setDrawRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!pdfUrl) return;
    import('pdfjs-dist').then(({ getDocument }) => {
      getDocument(pdfUrl).promise.then((pdfDoc: any) => {
        pdfDoc.getPage(pageNumber).then((page: any) => {
          const viewport = page.getViewport({ scale: 1.5 });
          // viewport.width/height are the canvas pixel dimensions — do NOT multiply by scale again
          setCanvasWidth(viewport.width);
          setCanvasHeight(viewport.height);
        });
      });
    });
  }, [pdfUrl, pageNumber]);

  // Attach transformer to selected node
  useEffect(() => {
    if (!transformerRef.current || !layerRef.current) return;
    if (selectedAnnotationId) {
      const node = layerRef.current.findOne(`#${selectedAnnotationId}`);
      transformerRef.current.nodes(node ? [node] : []);
    } else {
      transformerRef.current.nodes([]);
    }
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedAnnotationId, annotations]);

  const handleStageMouseDown = (e: any) => {
    if (!isDrawing) {
      // Deselect when clicking empty stage area
      if (e.target === stageRef.current) {
        onAnnotationSelected(null);
      }
      return;
    }

    const pointerPos = stageRef.current.getPointerPosition();
    if (!pointerPos) return;

    setIsSelecting(true);
    setStartPos(pointerPos);
    setDrawRect({ x: pointerPos.x, y: pointerPos.y, width: 0, height: 0 });
  };

  const handleStageMouseMove = (e: any) => {
    if (!isSelecting || !isDrawing) return;

    const pointerPos = stageRef.current.getPointerPosition();
    if (!pointerPos) return;

    setDrawRect({
      x: Math.min(startPos.x, pointerPos.x),
      y: Math.min(startPos.y, pointerPos.y),
      width: Math.abs(pointerPos.x - startPos.x),
      height: Math.abs(pointerPos.y - startPos.y),
    });
  };

  const handleStageMouseUp = () => {
    if (!isSelecting || !isDrawing || !drawRect) return;

    setIsSelecting(false);
    setDrawRect(null);

    if (drawRect.width > 5 && drawRect.height > 5) {
      onAnnotationAdded({
        name: `Field ${annotations.length + 1}`,
        regex: '',
        anchor: 'top-left',
        x: drawRect.x / canvasWidth,
        y: drawRect.y / canvasHeight,
        width: drawRect.width / canvasWidth,
        height: drawRect.height / canvasHeight,
        page: pageNumber,
      });
    }

    onDrawingToggle(false);
  };

  const handleDragEnd = (e: any, annotation: Annotation) => {
    const node = e.target;
    onAnnotationUpdated({
      ...annotation,
      x: node.x() / canvasWidth,
      y: node.y() / canvasHeight,
    });
  };

  const handleTransformEnd = (e: any, annotation: Annotation) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    // Reset scale back to 1 and bake it into width/height
    node.scaleX(1);
    node.scaleY(1);
    onAnnotationUpdated({
      ...annotation,
      x: node.x() / canvasWidth,
      y: node.y() / canvasHeight,
      width: (node.width() * scaleX) / canvasWidth,
      height: (node.height() * scaleY) / canvasHeight,
    });
  };

  return (
    <Stage
      ref={stageRef}
      width={canvasWidth}
      height={canvasHeight}
      onMouseDown={handleStageMouseDown}
      onMouseMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
      className="absolute inset-0"
      style={{ cursor: isDrawing ? 'crosshair' : 'default' }}
    >
      <Layer ref={layerRef}>
        {annotations.map((annotation) => (
          <Rect
            key={annotation.id}
            id={annotation.id}
            x={annotation.x * canvasWidth}
            y={annotation.y * canvasHeight}
            width={annotation.width * canvasWidth}
            height={annotation.height * canvasHeight}
            fill="rgba(0, 123, 255, 0.2)"
            stroke={selectedAnnotationId === annotation.id ? 'rgba(0, 80, 200, 0.9)' : 'rgba(0, 123, 255, 0.6)'}
            strokeWidth={2}
            draggable={!isDrawing}
            onClick={() => !isDrawing && onAnnotationSelected(annotation.id)}
            onDragEnd={(e) => handleDragEnd(e, annotation)}
            onTransformEnd={(e) => handleTransformEnd(e, annotation)}
          />
        ))}
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Enforce minimum size
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            return newBox;
          }}
        />
        {isSelecting && drawRect && (
          <Rect
            x={drawRect.x}
            y={drawRect.y}
            width={drawRect.width}
            height={drawRect.height}
            fill="rgba(0, 123, 255, 0.15)"
            stroke="rgba(0, 123, 255, 0.9)"
            strokeWidth={2}
            dash={[5, 5]}
            listening={false}
          />
        )}
      </Layer>
    </Stage>
  );
}
