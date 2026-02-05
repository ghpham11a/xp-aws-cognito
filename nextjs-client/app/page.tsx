import AppHeader from "@/components/AppHeader";
import HomeContent from "@/components/HomeContent";

export default function HomePage() {
  return (
    <div className="app-container">
      <AppHeader />
      <main className="content-area">
        <HomeContent />
      </main>
    </div>
  );
}
