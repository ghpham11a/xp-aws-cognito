import type { Metadata } from "next";
import AccountPageClient from "./page.client";

export const metadata: Metadata = {
  title: "Account Settings | AWS Cognito Auth Demo",
  description: "Manage your account settings, change password, and sign out.",
};

export default function AccountPage() {
  return <AccountPageClient />;
}
