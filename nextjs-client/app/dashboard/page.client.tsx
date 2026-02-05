"use client";

import AppHeader from "@/components/AppHeader";
import AuthGuard from "@/components/AuthGuard";
import DashboardContent from "@/components/DashboardContent";

export default function DashboardPageClient() {
  return (
    <div className="app-container">
      <AppHeader />
      <main className="content-area">
        <AuthGuard>
          <DashboardContent />
        </AuthGuard>
      </main>
    </div>
  );
}
