"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Search,
  Sparkles,
  Bot,
  MessageSquare,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

interface KnowledgeItem {
  id: string;
  meetingTitle: string;
  dateStr: string;
  speaker: string;
  topic: string;
  content: string;
}

const SAMPLE_KNOWLEDGE_BASE: KnowledgeItem[] = [
  {
    id: "kb-01",
    meetingTitle: "Sprint 42 Architecture & Protocol Review",
    dateStr: "Hôm qua, 15:30",
    speaker: "Trần Minh Khoa (Trưởng Phòng)",
    topic: "LiveKit Audio Egress & S3 Buffer",
    content: "Alex cần đảm bảo audio egress không lưu file thô quá 24h trên local container, toàn bộ sau khi Whisper STT trích xuất xong phải mã hóa AES-256.",
  },
  {
    id: "kb-02",
    meetingTitle: "Quy Chế Kỷ Luật Cuộc Họp Axiom DX-OS",
    dateStr: "02/09/2026",
    speaker: "Nguyễn Thế Khang (Chủ Tịch)",
    topic: "Agenda Gatekeeper & Thời Lượng Họp",
    content: "Cuộc họp nội bộ không được vượt quá 45 phút, Daily Standup cố định 15 phút. Nếu không có Agenda đính kèm trước 2 tiếng, hệ thống sẽ tự động hủy phòng.",
  },
  {
    id: "kb-03",
    meetingTitle: "Sprint 41 Retrospective",
    dateStr: "28/08/2026",
    speaker: "Alex Rivera",
    topic: "Tối Ưu Độ Trễ Whisper CTranslate2",
    content: "Đã chuyển đổi model sang int8 quantization, giảm mức tiêu thụ RAM từ 4GB xuống 1.2GB và tăng tốc xử lý STT gấp 2.8 lần.",
  },
];

interface MemberKnowledgeTabProps {
  onNotify: (msg: string) => void;
}

export function MemberKnowledgeTab({ onNotify }: MemberKnowledgeTabProps) {
  const [query, setQuery] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  const handleAskAi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsAsking(true);
    setTimeout(() => {
      setIsAsking(false);
      if (query.toLowerCase().includes("hạn") || query.toLowerCase().includes("livekit") || query.toLowerCase().includes("alex")) {
        setAiAnswer(
          "Theo cuộc họp 'Sprint 42 Architecture Review', Trưởng phòng Trần Minh Khoa yêu cầu Alex Rivera hoàn thành triển khai LiveKit Audio Egress trước 18:00 hôm nay và cấu hình tự động upload lên S3."
        );
      } else if (query.toLowerCase().includes("standup") || query.toLowerCase().includes("thời gian") || query.toLowerCase().includes("bao nhiêu")) {
        setAiAnswer(
          "Theo Quy chế Kỷ luật Axiom DX-OS, cuộc họp Daily Standup được quy định cố định tối đa 15 phút, các cuộc họp nội bộ phòng ban tối đa 45 phút."
        );
      } else {
        setAiAnswer(
          `Dựa trên các biên bản họp đã lưu trữ: Vấn đề "${query}" đã được ghi nhận trong các biên bản họp kỹ thuật khối gần nhất. Mọi hành động liên quan đang được phân bổ trên Bảng Jira (SMA).`
        );
      }
      onNotify("AI đã trích xuất câu trả lời từ dữ liệu biên bản họp!");
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Kho Tri Thức AI & Hỏi Đáp Biên Bản Họp (RAG)
            </h2>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center gap-1">
              <Sparkles size={11} />
              RAG SEMANTIC SEARCH
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tìm kiếm nội dung đã nói trong cuộc họp, tra cứu nghị quyết mà không cần phải xem lại cả giờ video.
          </p>
        </div>
      </div>

      {/* AI Ask Assistant Box */}
      <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900 p-5 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300">
          <Bot size={17} className="text-blue-600" />
          <span>Hỏi Trợ Lý AI Về Bất Kỳ Quyết Định Họp Nào:</span>
        </div>

        <form onSubmit={handleAskAi} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="VD: Hạn chót hoàn thành LiveKit Audio Egress là khi nào? Hoặc Standup tối đa mấy phút?"
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={isAsking || !query.trim()}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            {isAsking ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <Sparkles size={14} />
            )}
            <span>Hỏi AI</span>
          </button>
        </form>

        {/* AI Answer Card */}
        {aiAnswer && (
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800/80 shadow-sm animate-in fade-in duration-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                <Sparkles size={11} />
                Câu Trả Lời Trích Xuất Từ Biên Bản Họp:
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Độ tin cậy: 98%</span>
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
              {aiAnswer}
            </p>
          </div>
        )}
      </div>

      {/* Recent Transcripts List */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          BIÊN BẢN HỌP & LỜI THOẠI ĐÃ ĐƯỢC CHỈ MỤC (INDEXED)
        </h3>

        <div className="space-y-3">
          {SAMPLE_KNOWLEDGE_BASE.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                  {item.meetingTitle}
                </span>
                <span className="text-[10.5px] text-slate-400">{item.dateStr}</span>
              </div>

              <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                <strong className="text-slate-900 dark:text-white">{item.speaker}: </strong>
                &ldquo;{item.content}&rdquo;
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Chủ đề: <strong className="text-slate-600 dark:text-slate-400">{item.topic}</strong></span>
                <button
                  type="button"
                  onClick={() => onNotify(`Đã mở toàn bộ bản gỡ băng của: ${item.meetingTitle}`)}
                  className="text-blue-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Xem đầy đủ gỡ băng</span>
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
