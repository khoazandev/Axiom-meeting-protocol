"use client";

import React from "react";
import { MaterialIcon, MaterialIconName } from "@/components/ui/MaterialIcon";

export type AdminTabKey = "pulse" | "members" | "departments" | "policies" | "security" | "webhooks";

interface AdminNavTabsProps {
  activeTab: AdminTabKey;
  onChangeTab: (tab: AdminTabKey) => void;
  badgeCounts?: {
    liveMeetings?: number;
    totalMembers?: number;
    departments?: number;
    securityAlerts?: number;
  };
}

interface TabDef {
  key: AdminTabKey;
  label: string;
  icon: MaterialIconName;
  badge?: number | string;
  badgeColor?: string;
}

export function AdminNavTabs({ activeTab, onChangeTab, badgeCounts }: AdminNavTabsProps) {
  const tabs: TabDef[] = [
    {
      key: "pulse",
      label: "Tổng Quan & Radar",
      icon: "speed",
      badge: badgeCounts?.liveMeetings ? `${badgeCounts.liveMeetings} Đang họp` : undefined,
      badgeColor: "bg-emerald-100 text-emerald-700 animate-pulse",
    },
    {
      key: "members",
      label: "Nhân Sự & RBAC",
      icon: "groups",
      badge: badgeCounts?.totalMembers,
      badgeColor: "bg-slate-100 text-slate-700",
    },
    {
      key: "departments",
      label: "Cơ Cấu Phòng Ban",
      icon: "hub",
      badge: badgeCounts?.departments,
      badgeColor: "bg-blue-100 text-blue-700",
    },
    {
      key: "policies",
      label: "Kỷ Luật Họp DX-OS",
      icon: "gavel",
    },
    {
      key: "security",
      label: "Kiểm Toán & An Ninh",
      icon: "security",
      badge: badgeCounts?.securityAlerts ? `${badgeCounts.securityAlerts}` : undefined,
      badgeColor: "bg-amber-100 text-amber-800",
    },
    {
      key: "webhooks",
      label: "Tích Hợp & Webhooks",
      icon: "webhook",
    },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200/80 mb-6">
      {tabs.map((t) => {
        const isActive = activeTab === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChangeTab(t.key)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              isActive
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white hover:bg-slate-100/80 text-slate-600 hover:text-slate-900 border border-slate-200/70"
            }`}
          >
            <MaterialIcon
              name={t.icon}
              className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-400"}`}
            />
            <span>{t.label}</span>
            {t.badge && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? "bg-white/20 text-white" : t.badgeColor || "bg-slate-100 text-slate-600"
                }`}
              >
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
