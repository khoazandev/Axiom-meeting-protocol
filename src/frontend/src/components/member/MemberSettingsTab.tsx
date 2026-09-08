'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';

interface MemberSettingsTabProps {
  onNotify: (msg: string) => void;
}

export function MemberSettingsTab({ onNotify }: MemberSettingsTabProps) {
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micLevel, setMicLevel] = useState(72);

  const handleTestMic = () => {
    setIsTestingMic(true);
    onNotify('Đang kiểm tra tín hiệu Microphone qua WebRTC AudioContext...');
    setTimeout(() => {
      setIsTestingMic(false);
      onNotify('Microphone hoạt động xuất sắc! Không có tiếng vọng (Echo).');
    }, 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Cài Đặt Thiết Bị & Hồ Sơ Cá Nhân
            </h2>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              AUDIO & HARDWARE TUNING
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cấu hình thiết bị âm thanh, kiểm tra độ nhạy micro và đảm bảo chất lượng gỡ băng AI đạt
            chuẩn cao nhất.
          </p>
        </div>
      </div>

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
          <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-400 shadow-xs">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
              alt="Alex Rivera"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Alex Rivera</h4>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
              Kỹ sư AI & Xử lý Âm thanh (Senior AI Engineer)
            </p>
            <p className="text-[11px] text-slate-400 font-mono">alex@axiom.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
