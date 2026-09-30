'use client';

import React from 'react';
import { CVData, CustomBlock } from '@/types/cv';
import { EditableInlineText } from '../canva/EditableInlineText';
import { CanvaBoundingBox } from '../canva/CanvaBoundingBox';
import { Plus, Sparkles, Layers, Type, Trash2 } from 'lucide-react';

interface TemplateProps {
  data: CVData;
  onUpdate?: (data: CVData) => void;
  selectedElementId?: string | null;
  onSelectElement?: (id: string) => void;
}

export function CVBlankTemplate({
  data,
  onUpdate,
  selectedElementId,
  onSelectElement = () => {},
}: TemplateProps) {
  const { personalInfo, summary, experience, education, skills, customBlocks = [] } = data;

  const updatePersonalInfo = (field: string, val: string) => {
    if (!onUpdate) return;
    onUpdate({ ...data, personalInfo: { ...data.personalInfo, [field]: val } });
  };

  const updateSummary = (val: string) => {
    if (!onUpdate) return;
    onUpdate({ ...data, summary: val });
  };

  const addCustomBlock = () => {
    if (!onUpdate) return;
    const newBlock: CustomBlock = {
      id: `block-${Date.now()}`,
      title: 'Tiêu Đề Khối Mới',
      content: 'Nhấp đúp chuột vào đây để soạn thảo nội dung của bạn. Bạn có thể định dạng, di chuyển hoặc căn chỉnh vị trí tùy ý như trên Canva.',
    };
    onUpdate({
      ...data,
      customBlocks: [...customBlocks, newBlock],
    });
  };

  const updateCustomBlock = (id: string, field: 'title' | 'content', val: string) => {
    if (!onUpdate) return;
    onUpdate({
      ...data,
      customBlocks: customBlocks.map((b) => (b.id === id ? { ...b, [field]: val } : b)),
    });
  };

  const removeCustomBlock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdate) return;
    onUpdate({
      ...data,
      customBlocks: customBlocks.filter((b) => b.id !== id),
    });
  };

  return (
    <div
      className="cv-paper-sheet bg-white text-slate-900 w-[210mm] min-h-[297mm] p-12 mx-auto shadow-2xl print:shadow-none print:p-8 print:w-full print:m-0 selection:bg-indigo-100 relative"
      style={{ boxSizing: 'border-box' }}
    >
      {/* Blank Canvas Watermark Banner for guidance */}
      <div className="border border-dashed border-indigo-200 bg-indigo-50/40 rounded-xl p-3 mb-6 flex items-center justify-between text-xs text-indigo-700 print:hidden">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            <strong>Bản Vẽ Trắng Canva:</strong> Nhấp đúp vào bất kỳ dòng chữ nào để chỉnh sửa trực tiếp. Dùng nút bên dưới để thêm khối văn bản tự do.
          </span>
        </div>
        <button
          type="button"
          onClick={addCustomBlock}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-xs shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm Khối Tùy Chọn</span>
        </button>
      </div>

      {/* Header Block */}
      <CanvaBoundingBox
        id="header"
        label="Khối Tiêu Đề Cá Nhân"
        isSelected={selectedElementId === 'header'}
        onSelect={onSelectElement}
      >
        <header className="pb-6 mb-6 border-b-2 border-slate-900">
          <h1 className="text-4xl font-extrabold text-slate-950 tracking-tight">
            <EditableInlineText
              value={personalInfo.fullName || 'HỌ VÀ TÊN ỨNG VIÊN'}
              onChange={(v) => updatePersonalInfo('fullName', v)}
              placeholder="Nhấp đúp nhập Họ và Tên..."
            />
          </h1>
          <div className="text-base font-semibold text-indigo-700 mt-1">
            <EditableInlineText
              value={personalInfo.title || 'Vị trí công việc mục tiêu'}
              onChange={(v) => updatePersonalInfo('title', v)}
              placeholder="Nhấp đúp nhập chức danh nghề nghiệp..."
            />
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-600 pt-3">
            <span>{personalInfo.location || 'Địa điểm / Thành phố'}</span>
            <span>•</span>
            <span>{personalInfo.phone || 'Số điện thoại'}</span>
            <span>•</span>
            <span>{personalInfo.email || 'Địa chỉ Email'}</span>
          </div>
        </header>
      </CanvaBoundingBox>

      {/* Summary Block */}
      <CanvaBoundingBox
        id="summary"
        label="Khối Giới Thiệu / Mục Tiêu"
        isSelected={selectedElementId === 'summary'}
        onSelect={onSelectElement}
      >
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Giới Thiệu Bản Thân</h2>
          <div className="text-sm leading-relaxed text-slate-800">
            <EditableInlineText
              value={summary || 'Nhấp đúp vào đây để viết lời giới thiệu ấn tượng về bản thân, định hướng công việc và kinh nghiệm cốt lõi của bạn...'}
              onChange={updateSummary}
              multiline
              placeholder="Nhấp đúp để nhập tóm tắt hồ sơ..."
            />
          </div>
        </section>
      </CanvaBoundingBox>

      {/* Dynamic Custom Blocks created by User */}
      <div className="space-y-6">
        {customBlocks.map((block) => (
          <CanvaBoundingBox
            key={block.id}
            id={block.id}
            label={`Khối Tùy Biến: ${block.title}`}
            isSelected={selectedElementId === block.id}
            onSelect={onSelectElement}
          >
            <div className="group relative p-3 rounded-lg border border-transparent hover:border-indigo-300 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-indigo-950 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-indigo-600" />
                  <EditableInlineText
                    value={block.title}
                    onChange={(v) => updateCustomBlock(block.id, 'title', v)}
                    placeholder="Tiêu đề khối..."
                  />
                </h3>
                <button
                  type="button"
                  onClick={(e) => removeCustomBlock(block.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-opacity"
                  title="Xóa khối này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-xs leading-relaxed text-slate-700">
                <EditableInlineText
                  value={block.content}
                  onChange={(v) => updateCustomBlock(block.id, 'content', v)}
                  multiline
                  placeholder="Nội dung chi tiết của khối..."
                />
              </div>
            </div>
          </CanvaBoundingBox>
        ))}
      </div>

      {/* Experience Section */}
      {experience && experience.length > 0 && (
        <CanvaBoundingBox
          id="experience"
          label="Kinh Nghiệm"
          isSelected={selectedElementId === 'experience'}
          onSelect={onSelectElement}
        >
          <section className="mb-6 pt-4 border-t border-slate-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Kinh Nghiệm Làm Việc</h2>
            <div className="space-y-3">
              {experience.map((e) => (
                <div key={e.id} className="text-xs space-y-0.5">
                  <div className="font-bold text-slate-900 flex justify-between">
                    <span>{e.position}</span>
                    <span className="text-slate-500">{e.startDate} - {e.endDate}</span>
                  </div>
                  <div className="text-slate-600 font-medium">{e.company}</div>
                  <div className="text-slate-600 whitespace-pre-line">{e.description}</div>
                </div>
              ))}
            </div>
          </section>
        </CanvaBoundingBox>
      )}

      {/* Skills Section */}
      {skills && skills.length > 0 && (
        <CanvaBoundingBox
          id="skills"
          label="Kỹ Năng"
          isSelected={selectedElementId === 'skills'}
          onSelect={onSelectElement}
        >
          <section className="mb-6 pt-4 border-t border-slate-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Kỹ Năng Nổi Bật</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s.id} className="text-xs px-2.5 py-1 bg-slate-100 rounded-md font-medium text-slate-800">
                  {s.name}
                </span>
              ))}
            </div>
          </section>
        </CanvaBoundingBox>
      )}

      {/* Empty State / Bottom Quick-Add Bar */}
      <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 text-center print:hidden rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
        <Layers className="w-8 h-8 text-indigo-400 mb-2" />
        <h4 className="text-sm font-semibold text-slate-800">Bố cục tự do chuẩn Canva</h4>
        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-3">
          Nhấp để thêm khối nội dung mới, sau đó bạn có thể kéo thả, định vị hoặc gõ bất cứ thông tin nào.
        </p>
        <button
          type="button"
          onClick={addCustomBlock}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Khối Mới Vào Bản Vẽ</span>
        </button>
      </div>
    </div>
  );
}
