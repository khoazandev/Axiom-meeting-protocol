'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import clsx from 'clsx';
import LottiePlayer from '@/components/LottiePlayer';
import animHiHola from '@/public/images/Hi Hola.json';
import { useLanguageStore } from '@/lib/store/useLanguageStore';
import { candidatePortalApi } from '@/lib/recruitment-api';

export function ChatAssistantFooter() {
  const { t } = useLanguageStore();
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const SUGGESTIONS = [
    t.landing.chatQuestion1,
    t.landing.chatQuestion2,
    t.landing.chatQuestion3,
  ];

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, isTyping]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isTyping) return;
    const userMsg = { role: 'user', content: text };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setIsTyping(true);

    try {
      const res = await candidatePortalApi.assistantChat({
        message: text,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply || t.landing.chatDefaultReply,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: t.landing.chatDefaultReply,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <footer className="bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 pt-24 pb-0 transition-colors">
      <div className="container mx-auto px-6 max-w-[850px]">
        {/* Hello Banner */}
        <div className="bg-[#f6f8fa] dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-[32px] px-10 py-6 flex flex-col md:flex-row items-center justify-center gap-8 mb-6 mt-16">
          {/* Avatar Lottie Animation */}
          <div className="w-[180px] shrink-0 flex justify-center pointer-events-none">
            <div className="w-[160px] h-[160px] flex items-center justify-center">
              <LottiePlayer
                animationData={animHiHola}
                loop={true}
                className="w-[200px] h-[200px] object-cover scale-[1.3]"
              />
            </div>
          </div>
          {/* Text Content */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-[44px] font-bold text-[#18181a] dark:text-white mb-2 tracking-tight">{t.landing.chatHello}</h2>
            <p className="text-[18px] text-[#757f9c] dark:text-neutral-400">
              {t.landing.chatGreeting}
            </p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-[#f6f8fa] dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-[32px] p-8 md:p-10 flex flex-col md:flex-row gap-10 mb-8">
          <div className="flex-1">
            <p className="text-[14px] text-[#757f9c] dark:text-neutral-400 leading-relaxed mb-6">
              {t.landing.chatRole}
            </p>
            <div className="flex flex-col gap-3 items-start">
              {[
                'Triết lý H-P-D-I',
                'Agenda Gate & Kỷ luật',
                'Mini Jira & Auto MoM',
                'Bảo mật On-Premise',
              ].map((t) => (
                <span
                  key={t}
                  className="px-5 py-2.5 rounded-full border border-[#e3e7f1] dark:border-neutral-800 text-[13px] font-medium text-[#757f9c] dark:text-neutral-400 bg-transparent"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="shrink-0 flex items-center justify-center">
            <div className="flex bg-transparent border border-[#e3e7f1] dark:border-neutral-800 rounded-2xl overflow-hidden self-center">
              {[
                { n: '100%', l: 'On-Premise' },
                { n: '4', l: 'Lớp H-P-D-I' },
                { n: '1-Click', l: 'Jira Sync' },
              ].map((s, i) => (
                <div
                  key={s.l}
                  className={`px-6 py-5 text-center min-w-[80px] bg-[#f6f8fa] dark:bg-neutral-900 ${i > 0 ? 'border-l border-[#e3e7f1] dark:border-neutral-800' : ''}`}
                >
                  <div className="text-[22px] font-bold text-[#18181a] dark:text-white mb-1">{s.n}</div>
                  <div className="text-[11px] text-[#757f9c] dark:text-neutral-400">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Suggestion Buttons */}
        <div className="flex flex-col items-center gap-4 mb-10">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              className="px-6 py-3 rounded-full border border-[#e3e7f1] dark:border-neutral-800 text-[13px] font-medium text-[#757f9c] dark:text-neutral-300 bg-white dark:bg-neutral-900 hover:border-[#cbd3e6] dark:hover:border-neutral-700 hover:text-[#18181a] dark:hover:text-white transition-all max-w-[95%] text-center shadow-2xs cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        {messages.length > 0 && (
          <div
            ref={chatRef}
            className="bg-white dark:bg-neutral-900 rounded-[16px] border border-[#e3e7f1] dark:border-neutral-800 p-6 max-h-[300px] overflow-y-auto mb-6 flex flex-col gap-4"
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={clsx(
                  'max-w-[85%] rounded-2xl px-5 py-3 text-[14px] leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-[#18181a] dark:bg-white text-white dark:text-neutral-950 self-end rounded-br-sm'
                    : 'bg-[#f6f8fc] dark:bg-neutral-800 text-[#18181a] dark:text-neutral-100 self-start rounded-bl-sm border border-[#e3e7f1] dark:border-neutral-700'
                )}
              >
                {msg.content}
              </div>
            ))}
            {isTyping && (
              <div className="bg-[#f6f8fc] dark:bg-neutral-800 text-[#757f9c] dark:text-neutral-400 self-start rounded-2xl rounded-bl-sm px-5 py-3 flex gap-1.5 items-center border border-[#e3e7f1] dark:border-neutral-700">
                <div className="w-2 h-2 bg-[#b0b8cc] rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-[#b0b8cc] rounded-full animate-bounce"
                  style={{ animationDelay: '0.15s' }}
                />
                <div
                  className="w-2 h-2 bg-[#b0b8cc] rounded-full animate-bounce"
                  style={{ animationDelay: '0.3s' }}
                />
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder={t.landing.chatInputPlaceholder}
              rows={3}
              className="w-full pl-6 pr-16 py-4 rounded-[16px] border border-[#e3e7f1] dark:border-neutral-800 bg-white dark:bg-neutral-900 text-[14px] text-[#18181a] dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-neutral-400/20 dark:focus:ring-white/20 transition-all placeholder:text-[#b0b8cc] dark:placeholder:text-neutral-500"
            />
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim()}
              className="absolute right-4 bottom-4 w-10 h-10 rounded-xl bg-[#18181a] hover:bg-black dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
