"use client";

import { useState } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import TabNavigation, { TabType } from "@/components/TabNavigation";
import HomeContent from "@/components/HomeContent";
import DashboardContent from "@/components/DashboardContent";
import UserManagement from "@/components/UserManagement";
import LoginPanel from "@/components/LoginPanel";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);

  const isAuthenticated = authStatus === "authenticated";

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return <HomeContent />;
      case "dashboard":
        return isAuthenticated ? <DashboardContent /> : <LoginPanel />;
      case "account":
        return isAuthenticated ? <UserManagement /> : <LoginPanel />;
      default:
        return <HomeContent />;
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">AWS Cognito Auth Demo</h1>
        {isAuthenticated && (
          <span className="auth-status">Logged In</span>
        )}
      </header>
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="content-area">{renderContent()}</main>
    </div>
  );
}
