// Token refresh scheduling logic

import { TOKEN_REFRESH_BUFFER_MS } from "@/config";
import { refreshSession } from "./amplify-auth";

type RefreshCallback = (expiration: number) => void;
type ErrorCallback = () => void;

let refreshTimeoutId: NodeJS.Timeout | null = null;

/**
 * Clear any scheduled token refresh
 */
export function clearTokenRefresh(): void {
  if (refreshTimeoutId) {
    clearTimeout(refreshTimeoutId);
    refreshTimeoutId = null;
  }
}

/**
 * Schedule a token refresh before expiration
 */
export function scheduleTokenRefresh(
  expirationMs: number,
  onRefreshed: RefreshCallback,
  onError: ErrorCallback
): void {
  clearTokenRefresh();

  const now = Date.now();
  const timeUntilRefresh = expirationMs - now - TOKEN_REFRESH_BUFFER_MS;

  if (timeUntilRefresh <= 0) {
    // Token is about to expire or already expired, refresh immediately
    performRefresh(onRefreshed, onError);
    return;
  }

  refreshTimeoutId = setTimeout(async () => {
    await performRefresh(onRefreshed, onError);
  }, timeUntilRefresh);
}

/**
 * Perform the token refresh
 */
async function performRefresh(
  onRefreshed: RefreshCallback,
  onError: ErrorCallback
): Promise<void> {
  try {
    const newExpiration = await refreshSession();
    if (newExpiration) {
      // Schedule next refresh
      scheduleTokenRefresh(newExpiration, onRefreshed, onError);
      onRefreshed(newExpiration);
    } else {
      onError();
    }
  } catch {
    onError();
  }
}
