"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface TocItem {
  id: string;
  title: string;
}

// Route-specific fallback TOC items if DOM hasn't rendered yet
const ROUTE_TOCS: Record<string, TocItem[]> = {
  "/docs": [
    { id: "why", title: "Tại sao chọn Axiom?" },
    { id: "architecture", title: "Kiến trúc hệ thống H-P-D-I" },
    { id: "next-steps", title: "Bắt đầu từ đâu?" },
  ],
  "/docs/installation": [
    { id: "docker", title: "Khởi chạy với Docker" },
    { id: "local", title: "Môi trường Cục bộ (Local Dev)" },
  ],
  "/docs/architecture": [
    { id: "overview", title: "Mô hình tổng thể 4 tầng" },
  ],
  "/docs/features/recording": [
    { id: "webrtc", title: "Hội nghị truyền hình LiveKit" },
    { id: "translation", title: "Phụ đề & Phiên dịch đa ngữ" },
  ],
  "/docs/features/ai-analysis": [
    { id: "summarize", title: "Tự động trích xuất MoM" },
  ],
  "/docs/features/kanban": [
    { id: "sync-jira", title: "1-Click Đồng bộ sang Jira" },
  ],
  "/docs/api": [
    { id: "auth", title: "Xác thực JWT Token" },
    { id: "meetings-api", title: "Quản lý Cuộc họp V2" },
    { id: "jira-api", title: "Mini Jira Integration API" },
  ],
  "/docs/webhook": [
    { id: "config", title: "Cấu hình Webhook & Sự kiện" },
  ],
};

export default function DocToc() {
  const pathname = usePathname();
  const [activeId, setActiveId] = useState<string>("");
  const [items, setItems] = useState<TocItem[]>(ROUTE_TOCS[pathname] || []);
  const [feedbackGiven, setFeedbackGiven] = useState<boolean>(false);

  // Scan document for actual headings or fall back to pre-defined items
  useEffect(() => {
    setFeedbackGiven(false);
    const sections = Array.from(document.querySelectorAll("section[id], h2[id]"));
    if (sections.length > 0) {
      const extracted: TocItem[] = sections.map((sec) => {
        const heading = sec.querySelector("h2") || sec;
        const rawTitle = heading.querySelector("span")?.textContent || heading.textContent || sec.id;
        const cleanTitle = rawTitle.replace(/[#\s]+$/, "").trim();
        return {
          id: sec.id,
          title: cleanTitle || sec.id,
        };
      });
      setItems(extracted);
      if (extracted[0]) {
        setActiveId(extracted[0].id);
      }
    } else {
      const fallback = ROUTE_TOCS[pathname] || [];
      setItems(fallback);
      if (fallback[0]) {
        setActiveId(fallback[0].id);
      }
    }
  }, [pathname]);

  // Track scroll position to update activeId
  useEffect(() => {
    const handleScroll = () => {
      const headings = items.map((it) => document.getElementById(it.id)).filter(Boolean);
      const scrollPos = window.scrollY + 120;

      for (let i = headings.length - 1; i >= 0; i--) {
        const el = headings[i];
        if (el && el.offsetTop <= scrollPos) {
          setActiveId(el.id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [items]);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveId(id);
      history.pushState(null, "", `#${id}`);
    }
  };

  return (
    <aside className="hidden xl:block w-64 lg:w-72 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto px-6 py-8 bg-[#F8FAFC]">
      <div className="flex flex-col gap-8">
        {/* Section 1: In-page navigation */}
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
            <MaterialIcon name="bookmark" className="w-3.5 h-3.5 text-slate-400" />
            <span>Mục lục trang này</span>
          </div>

          {items.length > 0 ? (
            <nav className="flex flex-col space-y-1 relative before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:bg-slate-200">
              {items.map((item) => {
                const isActive = activeId === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => scrollToSection(e, item.id)}
                    className={clsx(
                      "group relative pl-4 py-1.5 text-[13px] transition-all leading-snug block",
                      isActive
                        ? "text-[#2563EB] font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-[#2563EB] rounded-full" />
                    )}
                    <span className="group-hover:translate-x-0.5 transition-transform duration-150 inline-block">
                      {item.title}
                    </span>
                  </a>
                );
              })}
            </nav>
          ) : (
            <p className="text-[13px] text-slate-500 italic pl-2">Đang tải mục lục...</p>
          )}
        </div>

        <div className="h-px bg-slate-200/80" />

        {/* Section 2: Quick Resource Links */}
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
            <MaterialIcon name="bolt" className="w-3.5 h-3.5 text-slate-400" />
            <span>Tài nguyên nhanh</span>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              href="/member"
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-slate-200/80 text-[12px] font-medium text-slate-700 hover:text-[#2563EB] hover:border-blue-300 hover:shadow-xs transition-all group"
            >
              <span className="flex items-center gap-2">
                <MaterialIcon name="graphic_eq" className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Trải nghiệm phòng họp</span>
              </span>
              <MaterialIcon name="arrow_forward" className="w-3 h-3 text-slate-400 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/docs/installation"
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-slate-200/80 text-[12px] font-medium text-slate-700 hover:text-[#2563EB] hover:border-blue-300 hover:shadow-xs transition-all group"
            >
              <span className="flex items-center gap-2">
                <MaterialIcon name="terminal" className="w-3.5 h-3.5 text-slate-600" />
                <span>Hướng dẫn Docker</span>
              </span>
              <MaterialIcon name="arrow_forward" className="w-3 h-3 text-slate-400 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all" />
            </Link>

            <a
              href="https://github.com/khoazandev/Axiom-meeting-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-slate-200/80 text-[12px] font-medium text-slate-700 hover:text-[#2563EB] hover:border-blue-300 hover:shadow-xs transition-all group"
            >
              <span className="flex items-center gap-2">
                <MaterialIcon name="code" className="w-3.5 h-3.5 text-slate-600" />
                <span>GitHub Repository</span>
              </span>
              <MaterialIcon name="open_in_new" className="w-3 h-3 text-slate-400 group-hover:text-[#2563EB] transition-all" />
            </a>
          </div>
        </div>

        <div className="h-px bg-slate-200/80" />

        {/* Section 3: Feedback widget */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-[12px] font-semibold text-slate-800 mb-1.5">
            Trang này có hữu ích không?
          </div>
          {feedbackGiven ? (
            <div className="text-[12px] text-emerald-600 font-medium flex items-center gap-1.5 py-1">
              <MaterialIcon name="check_circle" className="w-4 h-4 text-emerald-500" />
              <span>Cảm ơn bạn đã phản hồi!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setFeedbackGiven(true)}
                className="flex-1 py-1 px-2 text-[12px] font-medium bg-slate-50 hover:bg-blue-50 hover:text-[#2563EB] border border-slate-200 rounded-md transition-colors text-center"
              >
                👍 Hữu ích
              </button>
              <button
                onClick={() => setFeedbackGiven(true)}
                className="flex-1 py-1 px-2 text-[12px] font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors text-center text-slate-600"
              >
                👎 Chưa rõ
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
