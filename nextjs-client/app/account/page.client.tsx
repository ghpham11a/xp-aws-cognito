"use client";

import AppHeader from "@/components/AppHeader";
import AuthGuard from "@/components/AuthGuard";
import UserManagement from "@/components/UserManagement";

export default function AccountPageClient() {
  return (
    <div className="app-container">
      <AppHeader />
      <main className="content-area">
        <AuthGuard>
          <UserManagement />
        </AuthGuard>
      </main>
    </div>
  );
}
