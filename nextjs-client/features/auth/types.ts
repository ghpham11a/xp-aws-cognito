// Auth feature types

export type { AuthView, SignUpResult } from "@/types/auth";

export interface AuthFormState {
  email: string;
  password: string;
  confirmPassword: string;
  code: string;
  newPassword: string;
  loading: boolean;
  error: string;
  message: string;
  socialLoading: "google" | "apple" | null;
}

export interface FormHandlers {
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setConfirmPassword: (password: string) => void;
  setCode: (code: string) => void;
  setNewPassword: (password: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  setMessage: (message: string) => void;
  setSocialLoading: (loading: "google" | "apple" | null) => void;
  clearForm: () => void;
}
