const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export type SchemaField = {
  name: string;
  bbox: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  pattern?: string;
  anchor?: string;
  page: number;
};

export type SchemaPayload = {
  dpi: number;
  fields: SchemaField[];
};

export type UploadResponse = {
  filename: string;
  pdf_path: string;
};

export type SaveSchemaResponse = {
  schema_id: string;
  path: string;
};

export type SchemaListItem = {
  schema_id: string;
  path: string;
  updated_at: number;
  field_count: number;
  page: number;
  dpi: number;
  fields: SchemaField[];
};

export type HistoryItem = {
  timestamp: string;
  operation: string;
  status: string;
  summary: string;
  details: Record<string, unknown>;
};

export type ExtractResponse<Result> = {
  result: Result;
};

type ErrorResponse = {
  detail?: string;
  message?: string;
};

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const payload = (await res.json()) as ErrorResponse;
      message = payload.detail ?? payload.message ?? message;
    } catch {
      // Ignore JSON parsing failures and use the default message.
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export async function uploadPDF(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/upload/`, {
    method: 'POST',
    body: formData,
  });

  return parseResponse<UploadResponse>(res);
}

export async function runExtraction<Result>(
  pdfPath: string,
  schema: SchemaPayload,
): Promise<ExtractResponse<Result>> {
  const res = await fetch(`${API_BASE_URL}/extract/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pdf_path: pdfPath,
      schema,
    }),
  });

  return parseResponse<ExtractResponse<Result>>(res);
}

export async function saveSchema(schema: SchemaPayload): Promise<SaveSchemaResponse> {
  const res = await fetch(`${API_BASE_URL}/schema/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(schema),
  });

  return parseResponse<SaveSchemaResponse>(res);
}

export async function listSchemas(): Promise<{ items: SchemaListItem[] }> {
  const res = await fetch(`${API_BASE_URL}/schema/`, {
    method: 'GET',
  });

  return parseResponse<{ items: SchemaListItem[] }>(res);
}

export async function getHistory(limit = 100): Promise<{ items: HistoryItem[] }> {
  const res = await fetch(`${API_BASE_URL}/history/?limit=${limit}`, {
    method: 'GET',
  });

  return parseResponse<{ items: HistoryItem[] }>(res);
}
