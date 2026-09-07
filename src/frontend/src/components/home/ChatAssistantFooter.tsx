"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import clsx from "clsx";
import LottiePlayer from "@/components/LottiePlayer";
import animHiHola from "@/public/images/Hi Hola.json";

const SUGGESTIONS = [
  "Axiom DX-OS đảm bảo chủ quyền dữ liệu (Data Sovereignty) như thế nào?",
  "Cơ chế Agenda Gate kiểm soát kỷ luật cuộc họp ra sao?",
  "Làm thế nào để đồng bộ Action Items từ cuộc họp sang Mini Jira?",
];

export function ChatAssistantFooter() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, isTyping]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Axiom DX-OS vận hành 100% on-premise với LiveKit WebRTC, Faster-Whisper large-v3 và Qwen LLM. Dữ liệu cuộc họp không bao giờ rời khỏi hạ tầng của doanh nghiệp. Bạn cần tìm hiểu thêm về tính năng nào?",
        },
      ]);
    }, 1200);
  };

  return (
    <footer className="bg-white pt-24 pb-0">
      <div className="container mx-auto px-6 max-w-[850px]">
        {/* Hello Banner */}
        <div className="bg-[#f6f8fa] rounded-[32px] px-10 py-6 flex flex-col md:flex-row items-center justify-center gap-8 mb-6 mt-16">
          {/* Avatar Lottie Animation */}
          <div className="w-[180px] shrink-0 flex justify-center pointer-events-none">
            <div className="w-[160px] h-[160px] flex items-center justify-center">
               <LottiePlayer animationData={animHiHola} loop={true} className="w-[200px] h-[200px] object-cover scale-[1.3]" />
            </div>
          </div>
          {/* Text Content */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-[44px] font-bold text-[#18181a] mb-2 tracking-tight">Xin chào!</h2>
            <p className="text-[18px] text-[#757f9c]">Axiom AI Assistant có thể hỗ trợ gì cho bạn?</p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-[#f6f8fa] rounded-[32px] p-8 md:p-10 flex flex-col md:flex-row gap-10 mb-8">
          <div className="flex-1">
            <p className="text-[14px] text-[#757f9c] leading-relaxed mb-6">
              # Vai trò: Trợ lý tư vấn giải pháp Axiom DX-OS — Hỗ trợ tìm hiểu về kiến trúc H-P-D-I, nghi thức cuộc họp kỷ luật, LiveKit WebRTC và tự động hóa biên bản hành động.
            </p>
            <div className="flex flex-col gap-3 items-start">
              {["Triết lý H-P-D-I", "Agenda Gate & Kỷ luật", "Mini Jira & Auto MoM", "Bảo mật On-Premise"].map((t) => (
                <span key={t} className="px-5 py-2.5 rounded-full border border-[#e3e7f1] text-[13px] font-medium text-[#757f9c] bg-transparent">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="shrink-0 flex items-center justify-center">
            <div className="flex bg-transparent border border-[#e3e7f1] rounded-2xl overflow-hidden self-center">
              {[{ n: "100%", l: "On-Premise" }, { n: "4", l: "Lớp H-P-D-I" }, { n: "1-Click", l: "Jira Sync" }].map((s, i) => (
                <div key={s.l} className={`px-6 py-5 text-center min-w-[80px] bg-[#f6f8fa] ${i > 0 ? "border-l border-[#e3e7f1]" : ""}`}>
                  <div className="text-[22px] font-bold text-[#18181a] mb-1">{s.n}</div>
                  <div className="text-[11px] text-[#757f9c]">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Suggestion Buttons */}
        <div className="flex flex-col items-center gap-4 mb-10">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => handleSend(s)}
              className="px-6 py-3 rounded-full border border-[#e3e7f1] text-[13px] font-medium text-[#757f9c] bg-white hover:border-[#cbd3e6] hover:text-[#18181a] transition-all max-w-[95%] text-center"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        {messages.length > 0 && (
          <div ref={chatRef} className="bg-white rounded-[16px] border border-[#e3e7f1] p-6 max-h-[300px] overflow-y-auto mb-6 flex flex-col gap-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={clsx(
                "max-w-[85%] rounded-2xl px-5 py-3 text-[14px] leading-relaxed",
                msg.role === "user"
                  ? "bg-[#18181a] text-white self-end rounded-br-sm"
                  : "bg-[#f6f8fc] text-[#18181a] self-start rounded-bl-sm border border-[#e3e7f1]"
              )}>
                {msg.content}
              </div>
            ))}
            {isTyping && (
              <div className="bg-[#f6f8fc] text-[#757f9c] self-start rounded-2xl rounded-bl-sm px-5 py-3 flex gap-1.5 items-center border border-[#e3e7f1]">
                <div className="w-2 h-2 bg-[#b0b8cc] rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-[#b0b8cc] rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                <div className="w-2 h-2 bg-[#b0b8cc] rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
              </div>
            )}
          </div>
        )}

        {/* Chat Avatar + Input */}
        <div className="flex flex-col items-center gap-4 pb-12">

          <div className="w-full max-w-[800px] relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
              placeholder="Nhập câu hỏi của bạn..."
              rows={3}
              className="w-full pl-6 pr-16 py-4 rounded-[16px] border border-[#e3e7f1] bg-white text-[14px] text-[#18181a] resize-none focus:outline-none focus:ring-2 focus:ring-[#4F7BF7]/20 focus:border-[#4F7BF7] transition-all placeholder:text-[#b0b8cc]"
            />
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim()}
              className="absolute right-4 bottom-4 w-10 h-10 rounded-xl bg-[#18181a] text-white flex items-center justify-center hover:bg-black transition-colors disabled:opacity-30"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
