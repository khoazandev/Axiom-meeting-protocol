import { HomeNavbar } from "@/components/home/HomeNavbar";
import { HeroSection } from "@/components/home/HeroSection";
import { StickyFeatureShowcase } from "@/components/home/StickyFeatureShowcase";
import { ChatAssistantFooter } from "@/components/home/ChatAssistantFooter";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f6f8fc] selection:bg-[#4F7BF7]/20">
      <HomeNavbar />
      <main>
        <HeroSection />
        <StickyFeatureShowcase />
      </main>
      <ChatAssistantFooter />
    </div>
  );
}
