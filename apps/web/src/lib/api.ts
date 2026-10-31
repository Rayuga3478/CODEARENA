import type { ApiResponse } from '@cp/shared';

const API_BASE = '/api';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Retrieve the access token from the auth store without creating a circular import.
 * We import lazily at call-time.
 */
function getAccessToken(): string | null {
  try {
    // Dynamic import would be async; instead we use the store's getState
    // We'll set this via a setter function called during app init.
    return _accessTokenGetter?.() ?? null;
  } catch {
    return null;
  }
}

type AccessTokenGetter = () => string | null;
let _accessTokenGetter: AccessTokenGetter | null = null;

/**
 * Register the access token getter (called once during app initialization).
 */
export function setAccessTokenGetter(getter: AccessTokenGetter): void {
  _accessTokenGetter = getter;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const accessToken = getAccessToken();

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      credentials: 'include', // Send cookies for refresh tokens
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    // Handle 401 — try to refresh and retry once
    if (response.status === 401 && accessToken) {
      const refreshResponse = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (refreshResponse.ok) {
        const refreshData = (await refreshResponse.json()) as ApiResponse<{ accessToken: string }>;
        if (refreshData.success) {
          // Retry the original request with the new token
          // The store will be updated separately
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${refreshData.data.accessToken}`,
          } as Record<string, string>;

          const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, config);
          const retryData = (await retryResponse.json()) as ApiResponse<T>;

          if (!retryData.success) {
            const error = new Error(retryData.error.message) as Error & {
              code: string;
              status: number;
            };
            error.code = retryData.error.code;
            error.status = retryResponse.status;
            throw error;
          }

          return retryData.data;
        }
      }
    }

    const data = (await response.json()) as ApiResponse<T>;

    if (!data.success) {
      const error = new Error(data.error.message) as Error & {
        code: string;
        status: number;
      };
      error.code = data.error.code;
      error.status = response.status;
      throw error;
    }

    return data.data;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_BASE);
