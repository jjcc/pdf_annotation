import type { HistoryItem, SchemaListItem } from './api';

export type MainView = 'preview' | 'schemas' | 'results' | 'history';

export type ExtractionFieldResult = {
  value: string | null;
  raw_text: string;
  cleaned_text: string;
  match_type: string;
  confidence: number;
  page: number;
  debug_crop_path: string;
  error: string | null;
};

export type ExtractionResult = {
  pdf: string;
  page: number;
  dpi: number;
  fields: Record<string, ExtractionFieldResult>;
};

export type SchemaPanelProps = {
  schemaList: SchemaListItem[];
  selectedSchemaId: string | null;
  onSelectSchema: (schemaId: string) => void;
  onRefresh: () => void;
};

export type HistoryPanelProps = {
  historyItems: HistoryItem[];
  onRefresh: () => void;
};
