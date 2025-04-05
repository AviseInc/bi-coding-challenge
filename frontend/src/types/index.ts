export interface UserSession {
  email: string;
  isLoggedIn: boolean;
}

export type ResultFormat = 'table' | 'json' | 'csv' | 'gsheet';

export interface QueryRequest {
  sql: string;
  maxResults: number | 'all';
  format: ResultFormat;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  totalCount: number;
  executionTime: number;
}