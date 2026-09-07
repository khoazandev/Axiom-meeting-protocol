"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function DocHeader({
  title,
  description,
  tag,
}: {
  title: string;
  description?: string;
  tag?: string;
}) {
  return (
    <div className="relative mb-8 border-b border-slate-200/80 pb-6 pt-2 overflow-hidden">
      {/* Subtle top glow */}
      <div className="absolute top-0 right-0 w-[320px] h-[180px] bg-gradient-to-br from-blue-100/30 to-indigo-100/20 blur-3xl rounded-full pointer-events-none -translate-y-1/2 translate-x-1/4" />

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500 mb-3">
        <Link href="/" className="hover:text-slate-800 transition-colors">
          Trang chủ
        </Link>
        <span>/</span>
        <Link href="/docs" className="hover:text-slate-800 transition-colors">
          Tài liệu
        </Link>
        {tag && (
          <>
            <span>/</span>
            <span className="text-slate-600 font-semibold">{tag}</span>
          </>
        )}
      </div>

      <div className="relative z-10">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="text-[28px] sm:text-[34px] font-black text-slate-900 tracking-tight leading-snug mb-3"
        >
          {title}
        </motion.h1>

        {description && (
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
            className="text-[15px] sm:text-[16px] text-slate-600 leading-relaxed max-w-3xl"
          >
            {description}
          </motion.p>
        )}
      </div>
    </div>
  );
}
