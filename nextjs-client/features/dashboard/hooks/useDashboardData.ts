"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { getPrivateMessage, getCurrentUser } from "@/lib/api";

interface DashboardData {
  privateMessage: string | null;
  loading: boolean;
  error: string | null;
}

export function useDashboardData(): DashboardData {
  const { getIdToken } = useAuth();
  const [privateMessage, setPrivateMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const token = await getIdToken();

      if (!token) {
        setError("No auth token available. Please sign in again.");
        setLoading(false);
        return;
      }

      // Sync user to backend (creates user record if doesn't exist)
      try {
        await getCurrentUser();
      } catch {
        // Ignore user sync errors
      }

      // Fetch private message
      const messageData = await getPrivateMessage();
      setPrivateMessage(messageData.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { privateMessage, loading, error };
}
