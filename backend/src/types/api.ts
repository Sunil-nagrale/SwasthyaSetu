export interface PaginatedResult<T> {
  totalCount: number;
  page: number;
  pageSize: number;
  items: T[];
}

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}
