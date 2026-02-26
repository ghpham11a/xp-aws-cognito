// API response types

export interface MessageResponse {
  message: string;
  authenticated: boolean;
}

export interface UserResponse {
  id: string;
  email: string;
  created_at: string;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}
