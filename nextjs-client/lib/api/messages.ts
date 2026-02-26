// Messages API functions

import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import type { MessageResponse } from "@/types";

/**
 * Get public message (no auth required)
 */
export async function getPublicMessage(): Promise<MessageResponse> {
  return apiClient.get<MessageResponse>(ENDPOINTS.MESSAGES_PUBLIC, {
    skipAuth: true,
  });
}

/**
 * Get private message (auth required)
 */
export async function getPrivateMessage(): Promise<MessageResponse> {
  return apiClient.get<MessageResponse>(ENDPOINTS.MESSAGES_PRIVATE);
}
