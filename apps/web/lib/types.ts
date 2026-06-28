export type Category =
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'richdoc'
  | 'presentation'
  | 'spreadsheet'
  | 'data'
  | 'font'
  | 'cert'
  | 'archive';

export interface FormatGroup {
  category: Category;
  label: string;
  inputs: string[];
  outputs: string[];
}

export interface FormatMatrix {
  groups: FormatGroup[];
  map: Record<string, string[]>;
  unsupported: Record<string, string>;
  libreoffice?: boolean;
}

export type JobStatus = 'idle' | 'uploading' | 'done' | 'error';

export interface ConvertJob {
  id: string;
  file: File;
  ext: string;
  category: Category | null;
  targets: string[];
  target: string | null;
  status: JobStatus;
  progress: number;
  resultId?: string;
  resultName?: string;
  resultSize?: number;
  error?: string;
  /** Tanınan ama desteklenmeyen format için açıklama (örn. "RAW (libraw gerekir)"). */
  unsupportedReason?: string;
}
