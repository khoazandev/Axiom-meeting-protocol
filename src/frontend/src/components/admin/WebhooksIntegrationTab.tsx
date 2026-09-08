'use client';

import React, { useState } from 'react';
import { MatIcon } from '@/components/ui/MatIcon';
import { AxiomSelect } from '@/components/ui/AxiomSelect';
import { EnterpriseWebhookItem } from '@/lib/mockAdminData';

interface WebhooksIntegrationTabProps {
  webhooks: EnterpriseWebhookItem[];
  onAddWebhook: (newWh: Omit<EnterpriseWebhookItem, 'id' | 'successRate'>) => void;
  onToggleWebhook: (id: string) => void;
  onDeleteWebhook: (id: string) => void;
}

export function WebhooksIntegrationTab({
  webhooks,
  onAddWebhook,
  onToggleWebhook,
  onDeleteWebhook,
}: WebhooksIntegrationTabProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    'meeting.finished',
    'task.created',
  ]);

  // Simulator State
  const [simEvent, setSimEvent] = useState('meeting.finished');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{
    status: number;
    latencyMs: number;
    payload: object;
    timestamp: string;
  } | null>(null);

  const availableEvents = [
    { code: 'meeting.started', label: 'Khi cuộc họp bắt đầu' },
    { code: 'meeting.finished', label: 'Khi cuộc họp kết thúc' },
    { code: 'task.created', label: 'Khi AI trích xuất task mới' },
    { code: 'task.completed', label: 'Khi task hoàn thành trên Jira' },
    { code: 'mom.published', label: 'Khi biên bản MoM được phát hành' },
  ];

  const handleToggleEvent = (code: string) => {
    if (selectedEvents.includes(code)) {
      setSelectedEvents(selectedEvents.filter((c) => c !== code));
    } else {
      setSelectedEvents([...selectedEvents, code]);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetUrl.trim() || selectedEvents.length === 0) return;

    const randomKey = 'whsec_live_' + Math.random().toString(36).substring(2, 16);
    onAddWebhook({
      name: name.trim(),
      targetUrl: targetUrl.trim(),
      events: selectedEvents,
      secretKey: randomKey,
      isActive: true,
      lastTriggered: 'Vừa tạo',
    });

    setName('');
    setTargetUrl('');
    setSelectedEvents(['meeting.finished', 'task.created']);
    setIsAddModalOpen(false);
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setSimResult(null);

    setTimeout(() => {
      setIsSimulating(false);
      setSimResult({
        status: 200,
        latencyMs: Math.floor(Math.random() * 25) + 12,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        payload: {
          event: simEvent,
          organization_id: 'Axiom-Enterprise',
          timestamp: new Date().toISOString(),
          data:
            simEvent === 'meeting.finished'
              ? {
                  meeting_id: 'meet-exec-2026-09',
                  title: 'Review Sprint & Kế Hoạch Q4',
                  duration_seconds: 2450,
                  participants_count: 8,
                  mom_summary_url: 'https://axiom.internal/meetings/meet-exec-2026-09/mom',
                  extracted_tasks_count: 6,
                }
              : {
                  task_id: 'task-ai-901',
                  title: 'Triển khai bản vá bảo mật WebRTC LiveKit',
                  assignee_email: 'khoa.tran@axiom.internal',
                  due_date: '2026-09-12',
                  priority: 'HIGH',
                  source_meeting: 'Review Sprint & Kế Hoạch Q4',
                },
        },
      });
    }, 600);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MatIcon
                name="webhook"
                filled
                className="text-cyan-600 dark:text-cyan-400 text-[20px]"
              />
              <span>Tích Hợp Webhook & Kết Nối ERP / CRM Doanh Nghiệp</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 text-[11px] font-bold border border-cyan-300/50">
              {webhooks.length} endpoints
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Bắn sự kiện tự động khi có cuộc họp kết thúc hoặc AI tạo task sang hệ thống bên ngoài
            của doanh nghiệp.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <MatIcon name="add" className="text-[18px]" />
          <span>Thêm Webhook Endpoint</span>
        </button>
      </div>

      {/* Webhook List */}
      <div className="grid grid-cols-1 gap-4">
        {webhooks.map((wh) => (
          <div
            key={wh.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{wh.name}</h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    wh.isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {wh.isActive ? 'Đang lắng nghe' : 'Tạm dừng'}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                  Thành công:{' '}
                  <strong className="text-slate-700 dark:text-slate-300">{wh.successRate}%</strong>
                </span>
              </div>

              <div className="font-mono text-xs text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700 truncate">
                {wh.targetUrl}
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {wh.events.map((ev) => (
                  <span
                    key={ev}
                    className="text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md"
                  >
                    {ev}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => onToggleWebhook(wh.id)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {wh.isActive ? 'Tạm dừng' : 'Kích hoạt'}
              </button>
              <button
                type="button"
                onClick={() => onDeleteWebhook(wh.id)}
                className="px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── LIVE WEBHOOK SIMULATOR ── */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <MatIcon name="terminal" className="text-[18px]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Trình Giả Lập Kiểm Thử Webhook (Live Webhook Simulator)
              </h3>
              <p className="text-xs text-slate-400">
                Thử nghiệm gửi payload mẫu trực tiếp tới các hệ sinh thái bên ngoài để kiểm tra kết
                nối.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AxiomSelect
              value={simEvent}
              onChange={setSimEvent}
              options={[
                {
                  value: 'meeting.finished',
                  label: 'Sự kiện: meeting.finished',
                  icon: 'video_camera_front',
                },
                { value: 'task.created', label: 'Sự kiện: task.created', icon: 'task_alt' },
                { value: 'mom.published', label: 'Sự kiện: mom.published', icon: 'description' },
              ]}
              minWidth="220px"
              variant="connected"
              size="sm"
            />

            <button
              type="button"
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
            >
              {isSimulating ? (
                <span>Đang gửi ping...</span>
              ) : (
                <>
                  <MatIcon name="bolt" filled className="text-amber-300 text-[16px]" />
                  <span>Gửi Thử Nghiệm Ping</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output Box */}
        {simResult ? (
          <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800 text-slate-400">
              <span className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <strong className="text-emerald-400">HTTP {simResult.status} OK</strong>
                <span>• Thời gian phản hồi: {simResult.latencyMs}ms</span>
              </span>
              <span>{simResult.timestamp}</span>
            </div>

            <pre className="text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {JSON.stringify(simResult.payload, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="mt-4 p-6 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-slate-500 text-xs">
            Nhấn nút <strong className="text-slate-300">&quot;Gửi Thử Nghiệm Ping&quot;</strong> ở
            trên để kiểm tra đường truyền và xem mẫu dữ liệu JSON được hệ thống DX-OS xuất ra.
          </div>
        )}
      </div>

      {/* ── ADD WEBHOOK MODAL ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 relative">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <MatIcon name="close" className="text-[20px]" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <MatIcon name="webhook" filled className="text-[20px]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Thêm Endpoint Webhook Mới
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nhận dữ liệu sự kiện thời gian thực khi có cuộc họp hoặc task.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên cấu hình / Hệ thống nhận
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Kênh Webhook CRM Nội Bộ"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  URL Đích (Webhook URL)
                </label>
                <input
                  type="url"
                  required
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://api.your-company.internal/webhook"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Chọn các sự kiện đăng ký nhận
                </label>
                <div className="space-y-2">
                  {availableEvents.map((ev) => (
                    <label
                      key={ev.code}
                      className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(ev.code)}
                        onChange={() => handleToggleEvent(ev.code)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{ev.label}</span>
                      <span className="font-mono text-[11px] text-slate-400">({ev.code})</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer mt-3 active:scale-95"
              >
                Lưu & Kích Hoạt Webhook
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
