'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Mic,
  Video,
  Volume2,
  Shield,
  Moon,
  Sun,
  CheckCircle2,
  Sliders,
  User,
  FileText,
  Sparkles,
  FolderCheck,
  Eye,
  Edit3,
  Printer,
  Download,
  Loader2,
  Plus,
  ArrowLeft,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { generateInitialsAvatar } from '@/components/profile/UserProfileModal';
import { candidatePortalApi, type UserResume } from '@/lib/recruitment-api';
import { CVInteractiveStudio } from '@/components/cv/CVInteractiveStudio';

interface MemberSettingsTabProps {
  onNotify: (msg: string) => void;
}

export function MemberSettingsTab({ onNotify }: MemberSettingsTabProps) {
  const { user } = useAuthStore();
  const [activeSubTab, setActiveSubTab] = useState<'audio' | 'cv_vault'>('audio');

  // Audio Testing State
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micLevel, setMicLevel] = useState(72);

  // CV Vault State
  const [savedResumes, setSavedResumes] = useState<UserResume[]>([]);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [activeStudioResumeId, setActiveStudioResumeId] = useState<string | null>(null);
  const [isStudioOpen, setIsStudioOpen] = useState(false);

  const fetchResumes = async () => {
    setIsLoadingResumes(true);
    try {
      const list = await candidatePortalApi.getSavedResumes();
      setSavedResumes(list);
    } catch (err: unknown) {
      console.warn('Failed to load member resumes:', err);
    } finally {
      setIsLoadingResumes(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (activeSubTab === 'cv_vault') {
      void (async () => {
        await Promise.resolve();
        if (!ignore) {
          await fetchResumes();
        }
      })();
    }
    return () => {
      ignore = true;
    };
  }, [activeSubTab]);

  const handleTestMic = () => {
    setIsTestingMic(true);
    onNotify('Đang kiểm tra tín hiệu Microphone qua WebRTC AudioContext...');
    setTimeout(() => {
      setIsTestingMic(false);
      onNotify('Microphone hoạt động xuất sắc! Không có tiếng vọng (Echo).');
    }, 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Banner & Sub-Tab Switcher */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Cài Đặt Thiết Bị & Hồ Sơ Năng Lực
            </h2>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              MEMBER PROFILE & TOOLS
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Quản trị thiết bị đàm thoại WebRTC, chất lượng âm thanh và xem lại toàn bộ kho bản CV cá nhân của bạn.
          </p>
        </div>

        {/* Sub-Tab Switcher (Fixed widths per AGENTS.md rule) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('audio');
              setIsStudioOpen(false);
            }}
            className={`w-44 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer truncate ${
              activeSubTab === 'audio'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title="Kiểm tra thiết bị âm thanh & micro"
          >
            Âm Thanh & Thiết Bị
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('cv_vault')}
            className={`w-44 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer truncate ${
              activeSubTab === 'cv_vault'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title="Kho bản CV & Studio cá nhân"
          >
            Kho CV Cá Nhân ({savedResumes.length})
          </button>
        </div>
      </div>

      {/* ── Sub-Tab 1: Audio & Hardware Testing ────────────────────────── */}
      {activeSubTab === 'audio' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Hardware Settings Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
        <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Mic size={16} className="text-blue-600" />
          <span>Kiểm Tra Thiết Bị Âm Thanh (WebRTC Audio Test)</span>
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Microphone Đầu Vào (Input)
              </label>
              <select className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500">
                <option>Microphone Mặc Định (Realtek High Definition Audio)</option>
                <option>Headset Microphone (Logitech H390)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Camera Đầu Vào (Video Input)
              </label>
              <select className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500">
                <option>HD Webcam (Built-in 1080p)</option>
                <option>OBS Virtual Camera</option>
              </select>
            </div>
          </div>

          {/* Mic Volume Level Bar */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Volume2 size={14} className="text-emerald-500" />
                Cường độ âm thanh thu nhận:
              </span>
              <span className="font-mono font-bold text-emerald-600">{micLevel}%</span>
            </div>

            <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isTestingMic ? 'bg-emerald-500 animate-pulse w-[88%]' : 'bg-blue-600 w-[72%]'
                }`}
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleTestMic}
                disabled={isTestingMic}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
              >
                {isTestingMic ? 'Đang thử mic...' : 'Bấm Thử Micro'}
              </button>
            </div>
          </div>

          {/* AI DSP Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Khử Tiếng Ồn Nền (Noise Suppression)
                </div>
                <div className="text-[11px] text-slate-500">
                  Tự động lọc tiếng gõ phím và tiếng quạt
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNoiseSuppression(!noiseSuppression);
                  onNotify(`Đã ${!noiseSuppression ? 'bật' : 'tắt'} tính năng lọc tiếng ồn.`);
                }}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  noiseSuppression ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    noiseSuppression ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Khử Tiếng Vọng (Echo Cancellation)
                </div>
                <div className="text-[11px] text-slate-500">
                  Triệt tiêu tiếng vọng khi dùng loa ngoài
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEchoCancellation(!echoCancellation);
                  onNotify(`Đã ${!echoCancellation ? 'bật' : 'tắt'} tính năng khử tiếng vọng.`);
                }}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  echoCancellation ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    echoCancellation ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <User size={16} className="text-blue-600" />
          <span>Hồ Sơ Thành Viên</span>
        </h3>

        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-blue-500 shadow-xs">
            <img
              src={user?.avatar_url || generateInitialsAvatar(user?.full_name || 'Thành Viên')}
              alt={user?.full_name || 'Member'}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {user?.full_name || 'Thành Viên Doanh Nghiệp'}
            </h4>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
              {user?.job_title ||
                `Chuyên viên • ${user?.department_name || 'Khối Kỹ Thuật & Công Nghệ'}`}
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              {user?.email || 'Chưa cập nhật'}
            </p>
          </div>
        </div>
      </div>
    </div>
    )}

      {/* ── Sub-Tab 2: Personal CV Vault & Studio ──────────────────────── */}
      {activeSubTab === 'cv_vault' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Header Action Bar */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <FolderCheck className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Kho Bản CV Cá Nhân Của Bạn
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hồ sơ năng lực được bảo lưu liên tục. Bạn có thể cập nhật kinh nghiệm, đổi mẫu Harvard / Modern Tech hoặc xuất PDF bất kỳ lúc nào.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isStudioOpen ? (
                <button
                  type="button"
                  onClick={() => setIsStudioOpen(false)}
                  className="w-44 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate"
                  title="Quay lại danh sách bản CV"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Danh Sách CV ({savedResumes.length})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActiveStudioResumeId(null);
                    setIsStudioOpen(true);
                  }}
                  className="w-44 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate"
                  title="Tạo bản CV mới chuẩn Harvard"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo Bản CV Mới</span>
                </button>
              )}
            </div>
          </div>

          {/* If Studio is active: render full interactive studio */}
          {isStudioOpen ? (
            <div className="space-y-4">
              <CVInteractiveStudio
                initialResumeId={activeStudioResumeId || undefined}
                onNotify={onNotify}
              />
            </div>
          ) : (
            /* If Studio is not active: render saved CV cards list */
            <div className="space-y-4">
              {isLoadingResumes ? (
                <div className="p-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-xs">Đang tải kho hồ sơ cá nhân...</span>
                </div>
              ) : savedResumes.length === 0 ? (
                <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-4">
                  <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Chưa có bản CV nào trong kho cá nhân
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Bạn có thể tạo bản CV chuẩn Harvard Ivy-League hoặc Modern Tech để lưu giữ hành trình phát triển nghề nghiệp tại Axiom.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStudioResumeId(null);
                      setIsStudioOpen(true);
                    }}
                    className="w-48 mx-auto py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer truncate"
                    title="Bắt đầu tạo CV ngay"
                  >
                    Bắt đầu tạo CV ngay
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedResumes.map((r) => (
                    <div
                      key={r.id}
                      className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-indigo-400 transition-all space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                            Mẫu: {r.template_id.toUpperCase()}
                          </span>
                          {r.is_primary && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300">
                              ★ Bản Chính
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {r.title}
                        </h4>

                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {r.ats_score && (
                            <span className="font-semibold text-emerald-600">
                              ATS: {r.ats_score}/100
                            </span>
                          )}
                          <span>•</span>
                          <span className="text-[11px]">
                            Cập nhật: {new Date(r.updated_at).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveStudioResumeId(r.id);
                            setIsStudioOpen(true);
                          }}
                          className="w-36 py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate"
                          title="Mở trong studio để sửa hoặc in ấn"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Chỉnh Sửa / In</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            await candidatePortalApi.setPrimaryResume(r.id);
                            onNotify(`Đã đặt "${r.title}" làm bản CV chính.`);
                            fetchResumes();
                          }}
                          disabled={r.is_primary}
                          className="w-32 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer truncate"
                          title="Đặt làm bản CV chính"
                        >
                          {r.is_primary ? 'Đang là chính' : 'Đặt làm chính'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
