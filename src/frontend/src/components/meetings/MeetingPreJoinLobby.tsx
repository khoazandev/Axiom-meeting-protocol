'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Sparkles,
  Upload,
  Copy,
  Check,
  Volume2,
  ArrowRight,
  RotateCcw,
  Layers,
  Ban,
  FileText,
  User as UserIcon,
  Trash2,
} from 'lucide-react';
import Logo from '@/components/Logo';
import { User } from '@/lib/api';

export interface BackgroundOption {
  id: string;
  name: string;
  type: 'none' | 'blur-light' | 'blur-heavy' | 'preset' | 'custom';
  url?: string;
  thumbnail?: string;
}

const PRESET_BACKGROUNDS: BackgroundOption[] = [
  {
    id: 'none',
    name: 'Tự nhiên',
    type: 'none',
  },
  {
    id: 'blur-light',
    name: 'Mờ nhẹ',
    type: 'blur-light',
  },
  {
    id: 'blur-heavy',
    name: 'Mờ sâu',
    type: 'blur-heavy',
  },
  {
    id: 'office',
    name: 'Văn phòng',
    type: 'preset',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    thumbnail:
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=200&q=60',
  },
  {
    id: 'minimal',
    name: 'Studio',
    type: 'preset',
    url: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80',
    thumbnail:
      'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=200&q=60',
  },
  {
    id: 'library',
    name: 'Ấm cúng',
    type: 'preset',
    url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80',
    thumbnail:
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=200&q=60',
  },
  {
    id: 'tech',
    name: 'Command',
    type: 'preset',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    thumbnail:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=200&q=60',
  },
];

interface MeetingPreJoinLobbyProps {
  meetingTitle: string;
  meetingId: string;
  meetingAgenda?: string | null;
  user: User | null;
  participantName: string;
  selectedLanguage?: string;
  onLanguageChange?: (lang: string) => void;
  isJoining: boolean;
  onJoin: (settings: {
    micEnabled: boolean;
    camEnabled: boolean;
    language: string;
    background: BackgroundOption;
  }) => void;
  onExit: () => void;
  onDeleteMeeting?: () => void;
}

export function MeetingPreJoinLobby({
  meetingTitle,
  meetingId,
  meetingAgenda,
  user,
  participantName,
  selectedLanguage = 'vi',
  isJoining,
  onJoin,
  onExit,
  onDeleteMeeting,
}: MeetingPreJoinLobbyProps) {
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [hasMediaPermission, setHasMediaPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Background / Visual Effects State
  const [selectedBg, setSelectedBg] = useState<BackgroundOption>(PRESET_BACKGROUNDS[0]);
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);
  const [isEffectsOpen, setIsEffectsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio level visualizer state (0 to 100)
  const [audioLevel, setAudioLevel] = useState(0);

  // Live video preview
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Copy link status
  const [copied, setCopied] = useState(false);

  // Initialize media devices
  useEffect(() => {
    let isMounted = true;

    async function initMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: true,
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setHasMediaPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Setup AudioContext for live volume meter
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            analyser.smoothingTimeConstant = 0.5;
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateMeter = () => {
              if (!analyserRef.current || !streamRef.current) return;
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
              animFrameRef.current = requestAnimationFrame(updateMeter);
            };
            updateMeter();
          }
        } catch (e) {
          console.warn('AudioContext volume meter init notice:', e);
        }
      } catch (err: any) {
        console.warn('getUserMedia error in pre-join preview:', err);
        if (isMounted) {
          setHasMediaPermission(false);
          setPermissionError(
            err.name === 'NotAllowedError'
              ? 'Trình duyệt chưa được cấp quyền truy cập Camera/Microphone.'
              : 'Không thể kết nối thiết bị Camera/Microphone trên máy này.'
          );
        }
      }
    }

    initMedia();

    return () => {
      isMounted = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Handle Mic Toggle
  const toggleMic = useCallback(() => {
    const nextState = !micEnabled;
    setMicEnabled(nextState);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextState;
      });
    }
    if (!nextState) {
      setAudioLevel(0);
    }
  }, [micEnabled]);

  // Handle Cam Toggle
  const toggleCam = useCallback(async () => {
    const nextState = !camEnabled;
    setCamEnabled(nextState);

    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = nextState;
      });
    }

    if (nextState && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [camEnabled]);

  // Handle Custom Background Upload
  const handleBgFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Vui lòng chọn ảnh nền có kích thước dưới 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCustomBgUrl(dataUrl);
        setSelectedBg({
          id: 'custom',
          name: 'Ảnh tải lên',
          type: 'custom',
          url: dataUrl,
          thumbnail: dataUrl,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Copy Meeting Link
  const handleCopyLink = () => {
    const fullUrl = window.location.href;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Join Action
  const handleJoinClick = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    onJoin({
      micEnabled,
      camEnabled,
      language: selectedLanguage,
      background: selectedBg,
    });
  };

  const getFilterClass = () => {
    if (selectedBg.type === 'blur-light') return 'backdrop-blur-sm filter blur-[2px]';
    if (selectedBg.type === 'blur-heavy') return 'backdrop-blur-md filter blur-[6px]';
    return '';
  };

  return (
    <div className="h-screen max-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between overflow-hidden select-none">
      {/* 1. Header Bar with Bright Contrast Logo */}
      <header className="w-full h-14 border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between backdrop-blur-xl bg-white/90 z-20 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <Logo size={32} showText={true} subtitle="MEETING" variant="gradient" />
          <span className="hidden sm:inline-block text-slate-300">|</span>
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Phòng họp bảo mật WebRTC
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-800">{participantName || 'Thành viên'}</span>
            {user?.role && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                {user.role}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main 1-Screen Content Area (Strictly Fits in Viewport) */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-6 max-w-6xl mx-auto w-full min-h-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 w-full h-full max-h-[580px] items-center">
          {/* LEFT: Video Preview Card (Google Meet Style Green Room) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center gap-2.5 w-full h-full max-h-[560px]">
            {/* 16:9 Video Box */}
            <div className="relative w-full aspect-video max-h-[380px] rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex items-center justify-center group">
              {/* Optional Virtual Background Layer */}
              {(selectedBg.type === 'preset' || selectedBg.type === 'custom') && selectedBg.url && (
                <div
                  className="absolute inset-0 bg-cover bg-center transition-all duration-300 pointer-events-none"
                  style={{ backgroundImage: `url(${selectedBg.url})` }}
                />
              )}

              {/* Live Webcam Stream */}
              {camEnabled ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover scale-x-[-1] transition-all duration-300 relative z-10 ${getFilterClass()} ${
                    selectedBg.type === 'preset' || selectedBg.type === 'custom'
                      ? 'opacity-90 mix-blend-screen'
                      : ''
                  }`}
                />
              ) : (
                /* Camera is OFF Placeholder */
                <div className="relative z-10 flex flex-col items-center justify-center gap-3 text-center p-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary/30 to-blue-500/20 border-2 border-primary/40 flex items-center justify-center text-2xl font-extrabold text-white shadow-2xl">
                      {participantName ? (
                        participantName.charAt(0).toUpperCase()
                      ) : (
                        <UserIcon className="w-8 h-8" />
                      )}
                    </div>
                    <span className="absolute bottom-0 right-0 p-1.5 rounded-full bg-red-500 text-white shadow-md">
                      <VideoOff className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">Máy ảnh đang tắt</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Bật camera để mọi người nhìn thấy bạn
                    </p>
                  </div>
                </div>
              )}

              {/* Permission Alert Overlay if Denied */}
              {hasMediaPermission === false && (
                <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                  <h3 className="text-sm font-bold text-white mb-1">Cần cấp quyền thiết bị</h3>
                  <p className="text-xs text-slate-300 max-w-sm leading-relaxed mb-4">
                    {permissionError ||
                      'Vui lòng nhấn vào biểu tượng ổ khóa trên thanh địa chỉ để cấp quyền Máy ảnh và Micro.'}
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Tải lại trang</span>
                  </button>
                </div>
              )}

              {/* Top Video Indicators: Mic Visualizer + Effect Badge */}
              <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex items-center justify-between pointer-events-none">
                {/* Audio Pulse Visualizer */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-medium">
                  {micEnabled ? (
                    <>
                      <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <div className="flex items-end gap-1 h-3">
                        <span
                          className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                          style={{ height: `${Math.max(4, (audioLevel * 12) / 100)}px` }}
                        />
                        <span
                          className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                          style={{ height: `${Math.max(4, (audioLevel * 16) / 100)}px` }}
                        />
                        <span
                          className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                          style={{ height: `${Math.max(4, (audioLevel * 10) / 100)}px` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-300">Micro đang bật</span>
                    </>
                  ) : (
                    <>
                      <MicOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="text-[11px] text-red-300">Đã tắt micro</span>
                    </>
                  )}
                </div>

                {/* Active Background Badge */}
                {selectedBg.type !== 'none' && (
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-[11px] font-semibold text-cyan-300 backdrop-blur-md">
                    <Sparkles className="w-3 h-3" />
                    <span>{selectedBg.name}</span>
                  </div>
                )}
              </div>

              {/* Bottom Video Floating Action Bar (Mic, Cam, Background) */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
                {/* Mic Toggle Button */}
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg active:scale-95 ${
                    micEnabled
                      ? 'bg-slate-800/90 hover:bg-slate-700 text-white border border-white/20 hover:border-white/40'
                      : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30'
                  }`}
                  title={micEnabled ? 'Tắt micro (Ctrl+D)' : 'Bật micro (Ctrl+D)'}
                >
                  {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>

                {/* Cam Toggle Button */}
                <button
                  type="button"
                  onClick={toggleCam}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg active:scale-95 ${
                    camEnabled
                      ? 'bg-slate-800/90 hover:bg-slate-700 text-white border border-white/20 hover:border-white/40'
                      : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30'
                  }`}
                  title={camEnabled ? 'Tắt camera (Ctrl+E)' : 'Bật camera (Ctrl+E)'}
                >
                  {camEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>

                {/* Background & Visual Effects Toggle */}
                <button
                  type="button"
                  onClick={() => setIsEffectsOpen(!isEffectsOpen)}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg active:scale-95 ${
                    isEffectsOpen || selectedBg.type !== 'none'
                      ? 'bg-cyan-600 text-white shadow-cyan-600/30 border border-cyan-400'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-white/20 hover:border-white/40'
                  }`}
                  title="Hiệu ứng hình ảnh & Hình nền cuộc họp"
                >
                  <Sparkles className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Status Line Beneath Preview */}
            <div className="flex items-center justify-between w-full px-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                {micEnabled ? 'Micro thu âm tốt' : 'Micro đang tắt'}
              </span>

              <button
                type="button"
                onClick={() => setIsEffectsOpen(!isEffectsOpen)}
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>{isEffectsOpen ? 'Đóng khay hình nền' : 'Thay đổi hình nền ảo'}</span>
              </button>
            </div>

            {/* Collapsible Background Picker Panel */}
            {isEffectsOpen && (
              <div className="w-full bg-white border border-slate-200 rounded-2xl p-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Hiệu Ứng & Hình Nền
                  </span>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBgFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Tải ảnh từ máy</span>
                  </button>
                </div>

                {/* Preset Choices Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {PRESET_BACKGROUNDS.map((bg) => {
                    const isSelected = selectedBg.id === bg.id;
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => setSelectedBg(bg)}
                        className={`group relative rounded-lg overflow-hidden aspect-video border-2 transition-all duration-150 flex flex-col items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 ring-2 ring-blue-100 shadow-sm scale-102'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                        }`}
                        title={bg.name}
                      >
                        {bg.type === 'none' && (
                          <div className="flex flex-col items-center justify-center p-1 text-slate-500 group-hover:text-slate-800">
                            <Ban className="w-3.5 h-3.5 mb-0.5" />
                            <span className="text-[9px] font-medium leading-tight">Tự nhiên</span>
                          </div>
                        )}

                        {bg.type === 'blur-light' && (
                          <div className="flex flex-col items-center justify-center p-1 text-blue-600">
                            <Layers className="w-3.5 h-3.5 mb-0.5 opacity-80" />
                            <span className="text-[9px] font-medium leading-tight">Mờ nhẹ</span>
                          </div>
                        )}

                        {bg.type === 'blur-heavy' && (
                          <div className="flex flex-col items-center justify-center p-1 text-blue-600">
                            <Layers className="w-3.5 h-3.5 mb-0.5" />
                            <span className="text-[9px] font-medium leading-tight">Mờ sâu</span>
                          </div>
                        )}

                        {bg.type === 'preset' && bg.thumbnail && (
                          <>
                            <img
                              src={bg.thumbnail}
                              alt={bg.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-slate-900/70 backdrop-blur-xs py-0.5 px-0.5 text-center">
                              <span className="text-[8.5px] font-semibold text-white block truncate">
                                {bg.name}
                              </span>
                            </div>
                          </>
                        )}
                      </button>
                    );
                  })}

                  {/* Custom Uploaded Background Thumbnail */}
                  {customBgUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedBg({
                          id: 'custom',
                          name: 'Ảnh tải lên',
                          type: 'custom',
                          url: customBgUrl,
                          thumbnail: customBgUrl,
                        })
                      }
                      className={`group relative rounded-lg overflow-hidden aspect-video border-2 transition-all duration-150 flex flex-col items-center justify-center cursor-pointer ${
                        selectedBg.id === 'custom'
                          ? 'border-blue-600 ring-2 ring-blue-100 shadow-sm scale-102'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                      }`}
                      title="Ảnh nền của bạn"
                    >
                      <img
                        src={customBgUrl}
                        alt="Ảnh tải lên"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-blue-900/80 py-0.5 px-0.5 text-center">
                        <span className="text-[8.5px] font-bold text-white block truncate">
                          Ảnh của bạn
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Meeting Info & Join Panel (Streamlined, 1 Screen) */}
          <div className="lg:col-span-5 flex flex-col justify-between h-full max-h-[540px] py-1 w-full max-w-md mx-auto lg:max-w-none">
            {/* Top: Title & Meeting Header */}
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-700 tracking-wide uppercase">
                SẴN SÀNG THAM GIA
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight line-clamp-2">
                {meetingTitle}
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Kiểm tra micro, máy ảnh và xem trước chương trình họp trước khi bước vào phòng.
              </p>
            </div>

            {/* Middle: User Identity & Hardware Status */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2.5 shadow-sm my-1.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                  {participantName ? participantName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-slate-400">Tham gia với tư cách</p>
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {participantName || 'Thành viên'}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${micEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}
                  />
                  Micro:{' '}
                  <strong className={micEnabled ? 'text-emerald-700' : 'text-red-600'}>
                    {micEnabled ? 'Đang bật' : 'Đã tắt'}
                  </strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${camEnabled ? 'bg-emerald-500' : 'bg-red-500'}`}
                  />
                  Camera:{' '}
                  <strong className={camEnabled ? 'text-slate-700' : 'text-red-600'}>
                    {camEnabled ? 'Đang bật' : 'Đã tắt'}
                  </strong>
                </span>
              </div>
            </div>

            {/* Middle 2: Agenda Preview Card (Chuẩn bị trước cuộc họp) */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1.5 my-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5 text-blue-700">
                  <FileText className="w-3.5 h-3.5" />
                  Kế Hoạch & Agenda Cuộc Họp
                </span>
                {meetingAgenda ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    Đã nạp
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold">
                    Chưa có
                  </span>
                )}
              </div>
              <div className="max-h-24 overflow-y-auto pr-1 text-xs text-slate-600 leading-relaxed scrollbar-thin">
                {meetingAgenda ? (
                  <p className="whitespace-pre-line text-[11.5px] font-normal">{meetingAgenda}</p>
                ) : (
                  <p className="text-[11px] italic text-slate-400">
                    Chưa có nội dung Agenda. Bạn vẫn có thể nhập hoặc import tệp sau khi vào phòng
                    họp.
                  </p>
                )}
              </div>
            </div>

            {/* Bottom: Join CTA Button & Meeting Code Copy */}
            <div className="space-y-2 pt-1">
              {/* Main Join Button */}
              <button
                type="button"
                onClick={handleJoinClick}
                disabled={isJoining}
                className="w-full h-11 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 group disabled:opacity-50"
              >
                {isJoining ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang kết nối vào phòng...</span>
                  </>
                ) : (
                  <>
                    <span>Tham Gia Ngay</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              {/* Compact Meeting Code & Copy Link Pill */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                <div className="flex items-center gap-1.5 text-slate-500 px-1 overflow-hidden">
                  <span className="text-[11px] shrink-0">Mã phòng:</span>
                  <span className="font-mono text-slate-700 truncate">{meetingId}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-[11px] flex items-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95 shadow-2xs"
                  title="Sao chép liên kết phòng họp"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Đã chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Sao chép mã</span>
                    </>
                  )}
                </button>
              </div>

              {/* Exit and Delete Actions */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={onExit}
                  className="py-1 text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
                >
                  Quay lại bàn làm việc
                </button>

                {onDeleteMeeting && (
                  <button
                    type="button"
                    onClick={onDeleteMeeting}
                    className="flex items-center gap-1 py-1 px-2.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/70 font-semibold transition-colors cursor-pointer"
                    title="Xóa vĩnh viễn cuộc họp này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa cuộc họp</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="w-full h-8 flex items-center justify-center text-center text-slate-400 text-[11px] border-t border-slate-200 bg-white/80 shrink-0">
        Axiom Intelligent Meeting Protocol • Enterprise DX-OS Edition
      </footer>
    </div>
  );
}
