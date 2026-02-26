import type { Metadata } from "next";
import { DashboardContent } from "@/features/dashboard";

export const metadata: Metadata = {
  title: "Dashboard | AWS Cognito Auth Demo",
  description: "View your personalized dashboard and feed after signing in.",
};

export default function DashboardPage() {
  return <DashboardContent />;
}
