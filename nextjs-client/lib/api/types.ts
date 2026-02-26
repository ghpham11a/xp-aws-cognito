// API client types

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => Promise<string | null>;
}
