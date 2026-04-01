# AGENT.md
# Frontend Builder Instructions

## Stack
- Next.js
- React
- react-konva
- pdfjs-dist

## Flow
Upload → Render → Draw → Edit → Export

## Components
- PdfViewer
- CanvasOverlay (Konva)
- Sidebar
- Toolbar

## Key Points
- Normalize bbox (0–1)
- Store in React state
- Use Konva Rect + Transformer
- Export JSON

## MVP Steps
1. Upload PDF
2. Render page
3. Draw boxes
4. Edit fields
5. Export schema

## Done
- Working UI
- Accurate normalized coords
- Clean schema output
