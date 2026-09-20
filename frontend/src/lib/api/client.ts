import { ApiError } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let authToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('swasthya_token', token);
    } else {
      localStorage.removeItem('swasthya_token');
    }
  }
}

export function getApiAuthToken(): string | null {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    return localStorage.getItem('swasthya_token');
  }
  return null;
}

export class CustomApiError extends Error implements ApiError {
  code: string;
  status?: number;
  details?: unknown;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', status?: number, details?: unknown) {
    super(message);
    this.name = 'CustomApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getApiAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 204) {
      return {} as T;
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorCode = data?.error?.code || `HTTP_${res.status}`;
      const errorMessage = data?.error?.message || res.statusText || 'An unexpected error occurred';
      throw new CustomApiError(errorMessage, errorCode, res.status, data?.error?.details);
    }

    return data as T;
  } catch (err: unknown) {
    if (err instanceof CustomApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Network request failed';
    throw new CustomApiError(message, 'NETWORK_ERROR');
  }
}
