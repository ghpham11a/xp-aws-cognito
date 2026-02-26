"use client";

import { AppHeader } from "@/components/layout";
import { AuthGuard } from "@/features/auth";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-container">
      <AppHeader />
      <main className="content-area">
        <AuthGuard>{children}</AuthGuard>
      </main>
    </div>
  );
}
