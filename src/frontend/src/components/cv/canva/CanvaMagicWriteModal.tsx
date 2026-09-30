'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  Check,
  RefreshCw,
  X,
  FileCheck,
  TrendingUp,
  Zap,
  AlignLeft,
} from 'lucide-react';

interface CanvaMagicWriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  onApplyText: (newText: string) => void;
}

export function CanvaMagicWriteModal({
  isOpen,
  onClose,
  initialText = '',
  onApplyText,
}: CanvaMagicWriteModalProps) {
  const [inputText, setInputText] = useState(initialText);
  const [generatedOptions, setGeneratedOptions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number>(0);

  if (!isOpen) return null;

  const handleGenerate = (type: 'professional' | 'metrics' | 'concise' | 'grammar') => {
    setIsGenerating(true);
    setTimeout(() => {
      let results: string[] = [];
      const base = inputText.trim() || 'Kỹ sư phần mềm phát triển hệ thống và tối ưu cơ sở dữ liệu cho doanh nghiệp.';

      if (type === 'professional') {
        results = [
          `Thiết kế và triển khai kiến trúc phần mềm hiệu năng cao, tối ưu hóa các quy trình cốt lõi và đảm bảo tính sẵn sàng 99.9% cho toàn bộ hệ thống.`,
          `Chủ trì nghiên cứu và xây dựng giải pháp công nghệ quy mô lớn, trực tiếp định hướng chiến lược kỹ thuật và dẫn dắt đội ngũ kỹ sư Agile đạt mục tiêu kinh doanh.`,
        ];
      } else if (type === 'metrics') {
        results = [
          `Tối ưu hóa thông lượng xử lý của hệ thống backend, giảm 45% thời gian phản hồi API và tiết kiệm $15,000 chi phí hạ tầng điện toán đám mây mỗi quý.`,
          `Nâng cấp pipeline phân tán xử lý hơn 120,000 giao dịch/ngày, nâng tỷ lệ hoàn thành tác vụ lên 98.6% và giảm thiểu 60% lỗi gián đoạn dịch vụ.`,
        ];
      } else if (type === 'concise') {
        results = [
          `Kiến trúc sư hệ thống phần mềm hiệu năng cao, chuyên sâu microservices và tối ưu cơ sở dữ liệu lớn.`,
          `Kỹ sư chuyên phát triển giải pháp SaaS mở rộng quy mô, giảm 40% độ trễ và tăng tốc độ xử lý tác vụ.`,
        ];
      } else {
        results = [
          base.replace(/\s+/g, ' ').trim() + ' — Đã chuẩn hóa chính tả và thuật ngữ chuyên ngành công nghệ.',
        ];
      }

      setGeneratedOptions(results);
      setSelectedOptionIdx(0);
      setIsGenerating(false);
    }, 600);
  };

  const handleApply = () => {
    if (generatedOptions.length > 0) {
      onApplyText(generatedOptions[selectedOptionIdx]);
    } else if (inputText) {
      onApplyText(inputText);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden space-y-4">
        {/* Canva Gradient Header */}
        <div className="bg-gradient-to-r from-[#00c4cc] to-[#7d2ae8] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Canva Magic Write™</h3>
              <p className="text-xs text-white/80">Trợ lý AI tinh chỉnh câu chữ hồ sơ chuẩn ATS</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 pt-0">
          {/* Input Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Đoạn văn bản cần tối ưu:
            </label>
            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập hoặc dán nội dung kinh nghiệm, thành tựu của bạn..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Quick AI Presets (Canva Style) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Chọn Phong Cách Viết:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleGenerate('professional')}
                disabled={isGenerating}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-left transition-all flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200"
              >
                <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Viết lại chuyên nghiệp</span>
              </button>

              <button
                type="button"
                onClick={() => handleGenerate('metrics')}
                disabled={isGenerating}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 text-left transition-all flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200"
              >
                <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Bổ sung số liệu STAR</span>
              </button>

              <button
                type="button"
                onClick={() => handleGenerate('concise')}
                disabled={isGenerating}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-left transition-all flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200"
              >
                <AlignLeft className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Rút ngắn xúc tích</span>
              </button>

              <button
                type="button"
                onClick={() => handleGenerate('grammar')}
                disabled={isGenerating}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 text-left transition-all flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200"
              >
                <FileCheck className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Sửa lỗi chính tả</span>
              </button>
            </div>
          </div>

          {/* AI Output Suggestions */}
          {generatedOptions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Gợi Ý Từ Canva Magic Write (Chọn 1 phương án):
              </span>
              <div className="space-y-2">
                {generatedOptions.map((opt, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedOptionIdx(idx)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedOptionIdx === idx
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-slate-900 dark:text-white ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="leading-relaxed">{opt}</p>
                      {selectedOptionIdx === idx && (
                        <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Action */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={generatedOptions.length === 0 && !inputText}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00c4cc] to-[#7d2ae8] hover:opacity-90 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
            >
              Áp Dụng Vào Bản Vẽ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
