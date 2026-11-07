'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  candidateApi,
  RecruitmentApplication,
  InterviewSession,
} from '@/lib/recruitment-api';
import { useCandidateStore } from '@/lib/store/useCandidateStore';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  useTracks,
  TrackToggle,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import {
  ShieldCheck,
  Video,
  ArrowLeft,
  AlertCircle,
  Clock,
  Calendar,
  CheckCircle2,
  PhoneOff,
} from 'lucide-react';

function CandidateVideoStage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <div className="relative w-full h-[520px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
      <div className="flex-1 p-3">
        <GridLayout tracks={tracks} className="w-full h-full">
          <ParticipantTile />
        </GridLayout>
      </div>
      <RoomAudioRenderer />
    </div>
  );
}

export default function CandidateInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useCandidateStore();

  const sessionId = typeof params?.sessionId === 'string' ? params.sessionId : Array.isArray(params?.sessionId) ? params.sessionId[0] : '';

  const [application, setApplication] = useState<RecruitmentApplication | null>(null);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    sessionId ? null : 'Mã phiên phỏng vấn không hợp lệ.'
  );

  // Consent states
  const [consentRecording, setConsentRecording] = useState(false);
  const [consentTranscription, setConsentTranscription] = useState(false);
  const [consentAiEvaluation, setConsentAiEvaluation] = useState(false);
  const [submittingConsent, setSubmittingConsent] = useState(false);

  // LiveKit Guest Access
  const [guestAccess, setGuestAccess] = useState<{
    token: string;
    room_name: string;
    livekit_url: string;
  } | null>(null);

  useEffect(() => {
    let ignore = false;

    if (!token) {
      router.replace('/login');
      return;
    }

    if (!sessionId) return;

    candidateApi
      .getMe(token)
      .then(async (app) => {
        if (ignore) return;
        setApplication(app);
        const currentSession = app.interview_sessions?.find((s) => s.id === sessionId);
        if (!currentSession) {
          setErrorMessage('Không tìm thấy thông tin phiên phỏng vấn của bạn.');
          setLoading(false);
          return;
        }
        setSession(currentSession);

        // Pre-fill consent if already recorded
        if (currentSession.consent_recording) setConsentRecording(true);
        if (currentSession.consent_transcription) setConsentTranscription(true);
        if (currentSession.consent_ai_evaluation) setConsentAiEvaluation(true);

        // If consents already granted and session scheduled, get guest access
        if (
          currentSession.consent_recording &&
          currentSession.consent_transcription &&
          currentSession.consent_ai_evaluation &&
          currentSession.status === 'SCHEDULED'
        ) {
          try {
            const access = await candidateApi.getGuestAccess(currentSession.id, token);
            if (!ignore) {
              setGuestAccess(access);
            }
          } catch {
            // Wait for user manual trigger if auto-access failed
          }
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (ignore) return;
        console.error(err);
        setErrorMessage('Không thể tải thông tin phỏng vấn. Phiên làm việc có thể đã hết hạn.');
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [sessionId, token, router]);

  const handleGrantConsentAndJoin = async () => {
    if (!token || !session) return;
    if (!consentRecording || !consentTranscription || !consentAiEvaluation) {
      alert('Vui lòng chọn đủ cả 3 điều khoản đồng ý bảo mật và xử lý dữ liệu trước khi vào phòng phỏng vấn.');
      return;
    }

    setSubmittingConsent(true);
    try {
      const updatedSession = await candidateApi.recordConsent(
        session.id,
        {
          recording: consentRecording,
          transcription: consentTranscription,
          ai_evaluation: consentAiEvaluation,
        },
        token
      );
      setSession(updatedSession);

      const access = await candidateApi.getGuestAccess(session.id, token);
      setGuestAccess(access);
    } catch (err: unknown) {
      console.error('Failed to get guest access', err);
      alert('Không thể kết nối vào phòng phỏng vấn lúc này. Vui lòng kiểm tra lại thời gian bắt đầu hoặc liên hệ HR.');
    } finally {
      setSubmittingConsent(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-500">Đang kiểm tra quyền truy cập phòng phỏng vấn...</p>
      </div>
    );
  }

  if (errorMessage || !session) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 text-center shadow-md">
        <AlertCircle size={32} className="text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Lỗi Truy Cập</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">{errorMessage}</p>
        <Link
          href="/candidate/applications"
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
        >
          <ArrowLeft size={14} />
          <span>Về trang hồ sơ</span>
        </Link>
      </div>
    );
  }

  const isCompleted = ['COMPLETED', 'CANCELLED'].includes(session.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/candidate/applications"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Quay lại tổng quan hồ sơ</span>
        </Link>

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            isCompleted
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
          }`}
        >
          {isCompleted ? <CheckCircle2 size={14} /> : <Video size={14} />}
          <span>{session.status}</span>
        </span>
      </div>

      {/* Session Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Phỏng Vấn Kỹ Thuật: {application?.opening?.title || application?.job_opening?.title || 'Ứng Viên'}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-indigo-500" />
                <span>Bắt đầu: {new Date(session.scheduled_at).toLocaleString('vi-VN')}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-indigo-500" />
                <span>Dự kiến: {new Date(new Date(session.scheduled_at).getTime() + 45 * 60000).toLocaleTimeString('vi-VN')}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Completed State */}
      {isCompleted ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={24} />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Phiên Phỏng Vấn Đã Hoàn Thành
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
            Hệ thống đã ghi nhận nội dung cuộc họp và chuyển giao cho bộ phận chuyên môn đánh giá. Bạn có thể theo dõi tiến độ tại trang tổng quan hồ sơ.
          </p>
          <div className="mt-6">
            <Link
              href="/candidate/applications"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all"
            >
              <span>Về Trang Hồ Sơ Ứng Tuyển</span>
            </Link>
          </div>
        </div>
      ) : guestAccess ? (
        /* Active LiveKit Video Conference */
        <div className="space-y-4">
          <LiveKitRoom
            serverUrl={guestAccess.livekit_url}
            token={guestAccess.token}
            connect={true}
            video={true}
            audio={true}
            onDisconnected={() => {
              setGuestAccess(null);
              router.push('/candidate/applications');
            }}
            data-lk-theme="default"
          >
            <CandidateVideoStage />

            {/* Custom Bottom Control Bar */}
            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl text-white">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-semibold text-slate-200">
                  Phòng: {guestAccess.room_name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <TrackToggle
                  source={Track.Source.Microphone}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-colors cursor-pointer border border-slate-700"
                />
                <TrackToggle
                  source={Track.Source.Camera}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-colors cursor-pointer border border-slate-700"
                />
                <button
                  type="button"
                  onClick={() => {
                    setGuestAccess(null);
                    router.push('/candidate/applications');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <PhoneOff size={14} />
                  <span>Rời Phòng</span>
                </button>
              </div>
            </div>
          </LiveKitRoom>
        </div>
      ) : (
        /* Explicit 3-Consent Form */
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-500/60 shadow-lg space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Xác Nhận Quyền Riêng Tư & Điều Khoản Phỏng Vấn
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Để đảm bảo tính minh bạch, khách quan và tuân thủ quy định bảo vệ dữ liệu cá nhân
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={consentRecording}
                onChange={(e) => setConsentRecording(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 shrink-0"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-100 block">
                  1. Đồng ý ghi âm & ghi hình phiên phỏng vấn
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                  Dữ liệu được lưu trữ an toàn trong nội bộ hệ thống phục vụ công tác đối chiếu chất lượng phỏng vấn.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={consentTranscription}
                onChange={(e) => setConsentTranscription(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 shrink-0"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-100 block">
                  2. Đồng ý chuyển đổi giọng nói thành văn bản (Speech-to-Text)
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                  Tự động lập biên bản phỏng vấn trực tiếp nhằm phục vụ đối chiếu các câu hỏi và câu trả lời chuyên môn.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={consentAiEvaluation}
                onChange={(e) => setConsentAiEvaluation(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 shrink-0"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-100 block">
                  3. Đồng ý phân tích trích xuất bằng chứng năng lực qua AI
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                  Hệ thống AI hỗ trợ trích dẫn các đoạn phát biểu thực tế đối chiếu với ma trận kỹ năng để người phỏng vấn đánh giá công tâm.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-500">
              * Yêu cầu xác nhận cả 3 điều khoản để tiếp tục
            </span>
            <button
              type="button"
              disabled={
                !consentRecording ||
                !consentTranscription ||
                !consentAiEvaluation ||
                submittingConsent
              }
              onClick={handleGrantConsentAndJoin}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Video size={14} />
              <span>{submittingConsent ? 'Đang Kết Nối...' : 'Xác Nhận & Vào Phòng Phỏng Vấn'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
