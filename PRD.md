# PRD.md
# Visual Schema Builder (Frontend Prototype v2)

## 1. Goal
Build a frontend app to let users upload a PDF, draw rectangles to define fields, and export a reusable schema.json.

## 2. Core Features
- Upload PDF
- Render PDF page (pdf.js)
- Draw / move / resize rectangles
- Define field metadata (name, regex, anchor)
- Export schema.json with normalized coordinates (0–1)

## 3. Data Model
{
  "fields": [
    {
      "name": "field_name",
      "bbox": { "x":0.5, "y":0.5, "w":0.2, "h":0.1 },
      "pattern": "",
      "anchor": "",
      "page":""

    }
  ]
}

## 4. UI Layout
Left: PDF + drawing canvas  
Right: field editor + list  
Top: upload + zoom

## 5. Success Criteria
- Draw boxes
- Resize/move
- Edit metadata
- Export valid JSON

## 6. Non-Goals
- Backend
- OCR
- Auth
