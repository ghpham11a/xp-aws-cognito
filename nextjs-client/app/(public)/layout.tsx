import { AppHeader } from "@/components/layout";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-container">
      <AppHeader />
      <main className="content-area">{children}</main>
    </div>
  );
}
