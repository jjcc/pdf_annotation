import { useEffect, useRef, useState } from 'react';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Layer as KonvaLayer } from 'konva/lib/Layer';
import type { Stage as KonvaStage } from 'konva/lib/Stage';
import type { Rect as KonvaRect } from 'konva/lib/shapes/Rect';
import type { Transformer as KonvaTransformer } from 'konva/lib/shapes/Transformer';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/types/src/display/api';
import { Layer, Rect, Stage, Transformer } from 'react-konva';
import { Annotation } from './types';

interface CanvasOverlayProps {
  pdfUrl: string;
  pageNumber: number;
  zoom: number;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  isDrawing: boolean;
  onAnnotationAdded: (annotation: Omit<Annotation, 'id'>) => void;
  onAnnotationUpdated: (annotation: Annotation) => void;
  onAnnotationSelected: (id: string | null) => void;
  onDrawingToggle: (isDrawing: boolean) => void;
}

export default function CanvasOverlay({
  pdfUrl,
  pageNumber,
  zoom,
  annotations,
  selectedAnnotationId,
  isDrawing,
  onAnnotationAdded,
  onAnnotationUpdated,
  onAnnotationSelected,
  onDrawingToggle,
}: CanvasOverlayProps) {
  const stageRef = useRef<KonvaStage | null>(null);
  const layerRef = useRef<KonvaLayer | null>(null);
  const transformerRef = useRef<KonvaTransformer | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(1000);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [drawRect, setDrawRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!pdfUrl) return;

    import('pdfjs-dist').then(({ getDocument }) => {
      getDocument(pdfUrl).promise
        .then((pdfDoc: PDFDocumentProxy) => pdfDoc.getPage(pageNumber))
        .then((page: PDFPageProxy) => {
          const viewport = page.getViewport({ scale: zoom });
          setCanvasWidth(viewport.width);
          setCanvasHeight(viewport.height);
        });
    });
  }, [pageNumber, pdfUrl, zoom]);

  useEffect(() => {
    if (!transformerRef.current || !layerRef.current) return;

    if (selectedAnnotationId) {
      const node = layerRef.current.findOne(`#${selectedAnnotationId}`);
      transformerRef.current.nodes(node ? [node] : []);
    } else {
      transformerRef.current.nodes([]);
    }

    transformerRef.current.getLayer()?.batchDraw();
  }, [annotations, selectedAnnotationId]);

  const handleStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing) {
      if (e.target === stageRef.current) {
        onAnnotationSelected(null);
      }
      return;
    }

    const pointerPos = stageRef.current?.getPointerPosition();
    if (!pointerPos) return;

    setIsSelecting(true);
    setStartPos(pointerPos);
    setDrawRect({ x: pointerPos.x, y: pointerPos.y, width: 0, height: 0 });
  };

  const handleStageMouseMove = () => {
    if (!isSelecting || !isDrawing) return;

    const pointerPos = stageRef.current?.getPointerPosition();
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
        anchor: '',
        x: drawRect.x / canvasWidth,
        y: drawRect.y / canvasHeight,
        width: drawRect.width / canvasWidth,
        height: drawRect.height / canvasHeight,
        page: pageNumber,
      });
    }

    onDrawingToggle(false);
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>, annotation: Annotation) => {
    const node = e.target as KonvaRect;
    onAnnotationUpdated({
      ...annotation,
      x: node.x() / canvasWidth,
      y: node.y() / canvasHeight,
    });
  };

  const handleTransformEnd = (e: KonvaEventObject<Event>, annotation: Annotation) => {
    const node = e.target as KonvaRect;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
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
            fill="rgba(99, 102, 241, 0.15)"
            stroke={
              selectedAnnotationId === annotation.id
                ? 'rgba(129, 140, 248, 1)'
                : 'rgba(99, 102, 241, 0.7)'
            }
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
            fill="rgba(99, 102, 241, 0.1)"
            stroke="rgba(129, 140, 248, 0.9)"
            strokeWidth={2}
            dash={[5, 5]}
            listening={false}
          />
        )}
      </Layer>
    </Stage>
  );
}
