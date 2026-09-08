import Sidebar from '@/components/docs/Sidebar';
import { HomeNavbar } from '@/components/home/HomeNavbar';
import DocToc from '@/components/docs/DocToc';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col selection:bg-blue-500/15 selection:text-blue-900">
      <HomeNavbar />

      {/* Main 3-column container */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto pt-16 flex">
        {/* 1. Left Sidebar: Documentation Navigation (Mục lục tài liệu) */}
        <Sidebar />

        {/* 2. Center Content: Main Document (Nội dung tài liệu) */}
        <main className="flex-1 min-w-0 bg-white border-r border-[#E2E8F0] min-h-[calc(100vh-4rem)] flex flex-col">
          <div className="w-full max-w-4xl px-6 sm:px-10 lg:px-12 py-8 lg:py-10 flex-1">
            {children}
          </div>
        </main>

        {/* 3. Right Sidebar: In-Page Table of Contents (Mục lục trên trang này) */}
        <DocToc />
      </div>
    </div>
  );
}
