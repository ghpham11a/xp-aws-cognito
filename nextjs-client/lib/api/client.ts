// Base API client with auth header injection

import { env } from "@/config";
import type { RequestOptions, ApiClientConfig } from "./types";

class ApiClient {
  private baseUrl: string;
  private getToken: (() => Promise<string | null>) | null = null;

  constructor(config?: Partial<ApiClientConfig>) {
    this.baseUrl = config?.baseUrl || env.apiUrl;
    if (config?.getToken) {
      this.getToken = config.getToken;
    }
  }

  setTokenProvider(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth = false, headers: customHeaders, ...fetchOptions } = options;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...customHeaders,
    };

    // Add auth header if token provider is set and auth is not skipped
    if (!skipAuth && this.getToken) {
      const token = await this.getToken();
      if (token) {
        (headers as Record<string, string>).Authorization = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error: ${response.status}`);
    }

    return response.json();
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// Export class for custom instances
export { ApiClient };
