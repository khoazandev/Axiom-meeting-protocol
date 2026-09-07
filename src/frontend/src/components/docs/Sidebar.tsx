"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { MaterialIcon, MaterialIconName } from "@/components/ui/MaterialIcon";

interface NavItem {
  name: string;
  href: string;
  icon: MaterialIconName;
  badge?: string;
}

interface NavGroup {
  category: string;
  items: NavItem[];
}

const DOCS_NAV: NavGroup[] = [
  {
    category: "Bắt đầu",
    items: [
      { name: "Giới thiệu", href: "/docs", icon: "description" },
      { name: "Cài đặt & Tích hợp", href: "/docs/installation", icon: "terminal", badge: "Docker" },
      { name: "Kiến trúc hệ thống", href: "/docs/architecture", icon: "hub" },
    ],
  },
  {
    category: "Tính năng cốt lõi",
    items: [
      { name: "LiveKit & Phụ đề Realtime", href: "/docs/features/recording", icon: "graphic_eq" },
      { name: "Trí tuệ nhân tạo (Local AI)", href: "/docs/features/ai-analysis", icon: "psychology", badge: "Qwen" },
      { name: "Mini Jira & Kanban Board", href: "/docs/features/kanban", icon: "view_kanban" },
    ],
  },
  {
    category: "API & Mở rộng",
    items: [
      { name: "REST API", href: "/docs/api", icon: "api" },
      { name: "Webhook", href: "/docs/webhook", icon: "webhook" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter items if user types in the search bar
  const filteredNav = useMemo(() => {
    if (!searchQuery.trim()) return DOCS_NAV;
    const q = searchQuery.toLowerCase();
    return DOCS_NAV.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          group.category.toLowerCase().includes(q)
      ),
    })).filter((group) => group.items.length > 0);
  }, [searchQuery]);

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="md:hidden fixed top-3 right-4 z-50 p-2.5 bg-white/90 backdrop-blur-md rounded-xl shadow-md border border-slate-200 text-slate-800 flex items-center justify-center"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
      >
        <span className="material-symbols-outlined text-[20px]">
          {mobileOpen ? "close" : "menu"}
        </span>
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside
        className={clsx(
          "fixed md:sticky top-0 md:top-16 left-0 h-screen md:h-[calc(100vh-4rem)] w-[270px] lg:w-[280px] shrink-0 bg-[#F8FAFC] border-r border-[#E2E8F0] flex flex-col transition-transform duration-300 z-40 md:z-10",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Top Header inside Sidebar: Search & Doc Title */}
        <div className="p-4 pb-3 border-b border-[#E2E8F0]/70">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-slate-800 tracking-tight">
                Tài liệu Axiom DX-OS
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100/80 text-[#2563EB] rounded-md">
                v2.4
              </span>
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1 border border-emerald-200/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sẵn sàng</span>
            </div>
          </div>

          {/* Quick Filter Search Input */}
          <div className="relative">
            <MaterialIcon
              name="search"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Lọc tài liệu..."
              className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-[13px] placeholder:text-slate-400 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {filteredNav.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-[13px]">
              Không tìm thấy mục &quot;{searchQuery}&quot;
            </div>
          ) : (
            filteredNav.map((group) => (
              <div key={group.category}>
                <div className="flex items-center justify-between px-2 mb-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {group.category}
                  </h4>
                  <span className="text-[10px] font-medium text-slate-400 px-1.5 py-0.2 rounded-full bg-slate-200/60">
                    {group.items.length}
                  </span>
                </div>

                <div className="flex flex-col space-y-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={clsx(
                          "relative px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 flex items-center justify-between group",
                          isActive
                            ? "bg-blue-50/90 text-[#2563EB] font-semibold border border-blue-200/60 shadow-xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/40"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <MaterialIcon
                            name={item.icon}
                            className={clsx(
                              "w-4 h-4 shrink-0 transition-colors",
                              isActive
                                ? "text-[#2563EB]"
                                : "text-slate-400 group-hover:text-slate-700"
                            )}
                          />
                          <span className="truncate">{item.name}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={clsx(
                              "text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0",
                              isActive
                                ? "bg-blue-200/60 text-[#1d4ed8]"
                                : "bg-slate-200/60 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Footer inside Sidebar */}
        <div className="p-3.5 pb-6 border-t border-[#E2E8F0] bg-white/60">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200/70">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-slate-800 leading-none">
                100% On-Premise
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">
                Bảo mật dữ liệu nội bộ
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
