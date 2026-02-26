import type { Metadata } from "next";
import { AccountContent } from "@/features/account";

export const metadata: Metadata = {
  title: "Account Settings | AWS Cognito Auth Demo",
  description: "Manage your account settings, change password, and sign out.",
};

export default function AccountPage() {
  return <AccountContent />;
}
