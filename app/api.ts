export async function uploadPDF(file: File) {
  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch("http://localhost:8000/upload/", {
    method: "POST",
    body: formData
  })

  return res.json()
}

export async function runExtraction(pdfPath: string, schema: any) {
  const res = await fetch("http://localhost:8000/extract/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      pdf_path: pdfPath,
      schema: schema
    })
  })

  return res.json()
}