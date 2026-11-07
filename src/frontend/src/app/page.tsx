import { HomeNavbar } from '@/components/home/HomeNavbar';
import { HeroSection } from '@/components/home/HeroSection';
import { StickyFeatureShowcase } from '@/components/home/StickyFeatureShowcase';
import { ChatAssistantFooter } from '@/components/home/ChatAssistantFooter';
import { PageFlipWrapper } from '@/components/home/PageFlipWrapper';
import { WholePageFlipWidget } from '@/components/home/WholePageFlipWidget';

export default function HomePage() {
  return (
    <PageFlipWrapper pageType="home">
      <div className="min-h-screen bg-[#f6f8fc] dark:bg-black text-neutral-900 dark:text-neutral-100 selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors">
        <HomeNavbar />

        {/* 3D Whole Page Flip widget on the right screen edge (hidden until hover) */}
        <WholePageFlipWidget />

        <main>
          <HeroSection />
          <StickyFeatureShowcase />
        </main>
        <ChatAssistantFooter />
      </div>
    </PageFlipWrapper>
  );
}
