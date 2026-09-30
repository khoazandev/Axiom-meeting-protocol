'use client';

import React, { useState, useMemo } from 'react';
import { CVTemplateId, CV_TEMPLATES_CATALOG, TemplateCatalogItem } from '@/types/cv';
import {
  Plus,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
  SlidersHorizontal,
  Flame,
  Eye,
  X,
  Check,
} from 'lucide-react';

interface CVTemplateGalleryProps {
  onSelectTemplate: (templateId: CVTemplateId) => void;
  activeTemplateId?: CVTemplateId;
}

const CATEGORIES = [
  'Tất cả',
  'Harvard / Academic',
  'Tech & IT',
  'Executive / Quản Lý',
  'Creative & Design',
  'Minimalist / Đơn Giản',
  'Startup & Founder',
  'Banking & Finance',
  'Modern Sales',
];

export function CVTemplateGallery({
  onSelectTemplate,
  activeTemplateId,
}: CVTemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [previewTemplate, setPreviewTemplate] = useState<TemplateCatalogItem | null>(null);

  const filteredTemplates = useMemo(() => {
    return CV_TEMPLATES_CATALOG.filter((item) => {
      const matchesCategory =
        selectedCategory === 'Tất cả' || item.category === selectedCategory || item.tags.includes(selectedCategory);
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="w-full space-y-8 animate-fadeIn">
      {/* Hero Banner Canva Style */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-indigo-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Thư Viện Mẫu CV Trực Quan & Chuẩn Tuyển Dụng Quốc Tế</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Bộ Sưu Tập Mẫu CV Chuẩn Thực Tế
          </h1>
          <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
            Xem trực tiếp hình ảnh thiết kế thực tế của từng mẫu trước khi chọn. Được tối ưu theo chuẩn Reactive Resume & Canva với thuật toán quét ATS và số liệu định lượng STAR.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-300 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Xem ảnh thiết kế chuẩn A4 trước khi chọn
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Nhấp đúp sửa chữ trực tiếp trên trang giấy
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Tương thích 100% phần mềm ATS
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Category Pills */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên mẫu, vị trí, công nghệ (Harvard, Dev, Sales...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
          </div>

          {/* Quick Count Badge */}
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span>Hiển thị <strong>{filteredTemplates.length + 1}</strong> lựa chọn mẫu</span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm scale-102'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Templates Grid - Reactive Resume & Canva Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* CARD 0: TỰ TẠO MẪU MỚI (BLANK CANVAS) */}
        <div
          onClick={() => onSelectTemplate('blank')}
          className="group relative cursor-pointer rounded-2xl border-2 border-dashed border-indigo-400/80 dark:border-indigo-500/50 bg-indigo-50/20 dark:bg-indigo-950/20 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-indigo-600"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold tracking-wide">
                <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                BLANK CANVAS
              </span>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">TỰ DO 100%</span>
            </div>

            {/* Visual Miniature A4 Sheet with gridlines */}
            <div className="relative aspect-[210/297] w-full rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-white dark:bg-slate-900 shadow-sm flex flex-col items-center justify-center p-6 text-center overflow-hidden">
              {/* Millimeter grid overlay watermark */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(99, 102, 241, 0.2) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(99, 102, 241, 0.2) 1px, transparent 1px)
                  `,
                  backgroundSize: '16px 16px',
                }}
              />

              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 mb-3 z-10">
                <Plus className="w-7 h-7" />
              </div>

              <h4 className="text-sm font-black text-slate-900 dark:text-white z-10">
                Trang Vẽ Trắng A4
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed z-10 px-2">
                Tự do chèn khối, kéo thả, đo thước milimet theo phong cách Canva
              </p>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Tự Thiết Kế Tự Do
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                Bắt đầu từ trang trắng tiêu chuẩn A4, phù hợp với ai muốn tự tạo bố cục riêng biệt.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-indigo-100 dark:border-indigo-900/40 mt-3">
            <button
              type="button"
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 group-hover:bg-indigo-700 text-white text-xs font-bold tracking-wide shadow-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <span>Bắt Đầu Vẽ Ngay</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* 10 PROFESSIONAL TEMPLATES (REACTIVE RESUME STYLE WITH REAL VISUAL PREVIEWS) */}
        {filteredTemplates.map((template) => {
          const isSelected = activeTemplateId === template.id;

          return (
            <div
              key={template.id}
              className={`group relative rounded-2xl border bg-white dark:bg-slate-900 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl flex flex-col justify-between ${
                isSelected
                  ? 'border-indigo-600 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600'
              }`}
            >
              {/* REAL VISUAL A4 PREVIEW CONTAINER */}
              <div className="p-3 pb-0">
                <div className="relative aspect-[210/297] w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-xs">
                  {/* Real Template Thumbnail Image */}
                  <img
                    src={template.imageUrl}
                    alt={template.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shadow-xs backdrop-blur-md ${template.badgeColor}`}>
                      {template.badge}
                    </span>

                    <span className="flex items-center gap-1 text-[9px] font-bold text-slate-800 dark:text-slate-100 bg-white/90 dark:bg-slate-900/90 px-2 py-0.5 rounded-md shadow-xs backdrop-blur-xs">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      ATS {template.atsScore}%
                    </span>
                  </div>

                  {template.isPopular && (
                    <div className="absolute top-8 -right-8 rotate-45 bg-amber-500 text-white text-[8px] font-black px-8 py-0.5 shadow-md flex items-center justify-center gap-0.5 z-10 pointer-events-none">
                      <Flame className="w-2.5 h-2.5 inline fill-white" /> HOT
                    </div>
                  )}

                  {/* Hover Actions Overlay */}
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 p-4 z-20">
                    <button
                      type="button"
                      onClick={() => onSelectTemplate(template.id)}
                      className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all transform translate-y-2 group-hover:translate-y-0 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Sử Dụng Mẫu Này</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewTemplate(template);
                      }}
                      className="w-full py-1.5 px-3 rounded-xl bg-white/90 hover:bg-white text-slate-800 text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all transform translate-y-2 group-hover:translate-y-0 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Xem Phóng To</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* CARD INFO BODY */}
              <div className="p-4 space-y-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                    {template.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                    {template.description}
                  </p>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {template.tags.slice(0, 3).map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[9.5px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                  {template.tags.length > 3 && (
                    <span className="text-[9.5px] text-slate-400 self-center">
                      +{template.tags.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-3 pt-0">
                <button
                  type="button"
                  onClick={() => onSelectTemplate(template.id)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Đang Sử Dụng</span>
                    </>
                  ) : (
                    <>
                      <span>Chọn Mẫu Này</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MODAL: HIGH-RESOLUTION FULL PREVIEW (ZOOM INSPECTOR) ───────── */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92vh] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: High-Res A4 Visual Preview */}
            <div className="md:w-3/5 bg-slate-100 dark:bg-slate-950 p-6 flex items-center justify-center overflow-y-auto max-h-[92vh]">
              <div className="relative aspect-[210/297] w-full max-w-md shadow-2xl rounded-xl overflow-hidden border border-slate-300 dark:border-slate-800">
                <img
                  src={previewTemplate.imageUrl}
                  alt={previewTemplate.name}
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>

            {/* Right: Metadata, ATS Breakdown, and Quick Select */}
            <div className="md:w-2/5 p-6 flex flex-col justify-between space-y-6 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${previewTemplate.badgeColor}`}>
                    {previewTemplate.badge}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(null)}
                    className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    {previewTemplate.name}
                  </h3>
                  <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {previewTemplate.category}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    {previewTemplate.description}
                  </p>
                </div>

                {/* ATS Rating Box */}
                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
                    {previewTemplate.atsScore}%
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      Tối Ưu Quét ATS Tuyệt Đối
                    </div>
                    <div className="text-[11px] text-emerald-800/80 dark:text-emerald-300">
                      Cấu trúc định dạng đã kiểm định tương thích 100% với hệ thống tuyển dụng tự động.
                    </div>
                  </div>
                </div>

                {/* Tags List */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Đặc Điểm Bố Cục:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {previewTemplate.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectTemplate(previewTemplate.id);
                    setPreviewTemplate(null);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-101"
                >
                  <Check className="w-4 h-4" />
                  <span>Sử Dụng Mẫu Này Trong Studio</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Đóng Xem Trước
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
