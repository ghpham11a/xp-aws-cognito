// Users API functions

import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import type { UserResponse } from "@/types";

/**
 * Get current user (also syncs user to backend on first call)
 */
export async function getCurrentUser(): Promise<UserResponse> {
  return apiClient.get<UserResponse>(ENDPOINTS.USERS_ME);
}

/**
 * Get all users
 */
export async function getUsers(): Promise<UserResponse[]> {
  return apiClient.get<UserResponse[]>(ENDPOINTS.USERS);
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<UserResponse> {
  return apiClient.get<UserResponse>(ENDPOINTS.USER_BY_ID(id));
}
