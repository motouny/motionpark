/** Error envelope returned by the API: `{ "error": { "code", "message" } }` */
export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
}

export interface PageResult<T> {
  items: T[];
  total?: number;
}

export interface LookupRef {
  id: string;
  nameAr: string;
  nameEn: string;
}
