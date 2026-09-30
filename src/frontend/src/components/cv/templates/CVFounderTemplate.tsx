'use client';

import React from 'react';
import { CVData } from '@/types/cv';
import { EditableInlineText } from '../canva/EditableInlineText';
import { CanvaBoundingBox } from '../canva/CanvaBoundingBox';
import { Rocket, TrendingUp, Zap, Target } from 'lucide-react';

interface TemplateProps {
  data: CVData;
  onUpdate?: (data: CVData) => void;
  selectedElementId?: string | null;
  onSelectElement?: (id: string) => void;
}

export function CVFounderTemplate({
  data,
  onUpdate,
  selectedElementId,
  onSelectElement = () => {},
}: TemplateProps) {
  const { personalInfo, summary, experience, education, skills, projects } = data;

  const updatePersonalInfo = (field: string, val: string) => {
    if (!onUpdate) return;
    onUpdate({ ...data, personalInfo: { ...data.personalInfo, [field]: val } });
  };

  const updateSummary = (val: string) => {
    if (!onUpdate) return;
    onUpdate({ ...data, summary: val });
  };

  return (
    <div
      className="cv-paper-sheet bg-white text-slate-900 w-[210mm] min-h-[297mm] p-10 mx-auto shadow-2xl print:shadow-none print:p-8 print:w-full print:m-0 selection:bg-orange-100"
      style={{ boxSizing: 'border-box' }}
    >
      {/* High-Impact Founder Header */}
      <CanvaBoundingBox
        id="header"
        label="Founder Header"
        isSelected={selectedElementId === 'header'}
        onSelect={onSelectElement}
      >
        <header className="mb-6 pb-4 border-b-2 border-slate-900 flex justify-between items-end">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 inline-flex items-center gap-1">
              <Rocket className="w-3 h-3 text-orange-600" />
              <span>STARTUP FOUNDER & TECH LEAD</span>
            </span>
            <h1 className="text-3xl font-black text-slate-950 uppercase tracking-tight">
              <EditableInlineText
                value={personalInfo.fullName}
                onChange={(v) => updatePersonalInfo('fullName', v)}
                placeholder="TÊN FOUNDER"
              />
            </h1>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              <EditableInlineText
                value={personalInfo.title}
                onChange={(v) => updatePersonalInfo('title', v)}
                placeholder="Co-founder & Chief Technology Officer"
              />
            </p>
          </div>

          <div className="text-right text-[11px] text-slate-500 font-medium space-y-0.5">
            <div>{personalInfo.email}</div>
            <div>{personalInfo.phone}</div>
            <div>{personalInfo.location}</div>
          </div>
        </header>
      </CanvaBoundingBox>

      {/* Founder Growth Metrics Grid */}
      <CanvaBoundingBox
        id="metrics"
        label="Key Startup Metrics"
        isSelected={selectedElementId === 'metrics'}
        onSelect={onSelectElement}
      >
        <div className="mb-6 grid grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-2xl bg-orange-50/60 border border-orange-200">
            <div className="text-lg font-black text-orange-600">50,000+</div>
            <div className="text-[9.5px] font-bold text-slate-600 uppercase mt-0.5">Người Dùng Hoạt Động</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-lg font-black text-slate-900">42%</div>
            <div className="text-[9.5px] font-bold text-slate-600 uppercase mt-0.5">Tối Ưu Hiệu Năng</div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200">
            <div className="text-lg font-black text-emerald-600">$500K</div>
            <div className="text-[9.5px] font-bold text-slate-600 uppercase mt-0.5">Seed Fund Raised</div>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-200">
            <div className="text-lg font-black text-blue-600">99.9%</div>
            <div className="text-[9.5px] font-bold text-slate-600 uppercase mt-0.5">SLA Uptime System</div>
          </div>
        </div>
      </CanvaBoundingBox>

      {/* Summary / Mission */}
      <CanvaBoundingBox
        id="summary"
        label="Sứ Mệnh & Tầm Nhìn"
        isSelected={selectedElementId === 'summary'}
        onSelect={onSelectElement}
      >
        <section className="mb-5 space-y-1.5">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-orange-600" />
            <span>Sứ Mệnh Xây Dựng Sản Phẩm & Định Hướng</span>
          </h2>
          <div className="text-xs text-slate-700 leading-relaxed text-justify">
            <EditableInlineText value={summary} onChange={updateSummary} multiline />
          </div>
        </section>
      </CanvaBoundingBox>

      {/* Experience */}
      <CanvaBoundingBox
        id="experience"
        label="Hành Trình Khởi Nghiệp"
        isSelected={selectedElementId === 'experience'}
        onSelect={onSelectElement}
      >
        <section className="mb-5 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-orange-600" />
            <span>Kinh Nghiệm Sáng Lập & Dẫn Dắt Kỹ Thuật</span>
          </h2>
          <div className="space-y-4">
            {experience.map((exp) => (
              <div key={exp.id} className="text-xs space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-black text-slate-950 text-sm">{exp.position}</span>
                  <span className="text-[10px] font-mono font-bold text-orange-600">
                    {exp.startDate} – {exp.isCurrent ? 'Present' : exp.endDate}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-600">{exp.company}</div>
                <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line pl-2 border-l-2 border-orange-500">
                  {exp.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </CanvaBoundingBox>

      {/* Skills */}
      <CanvaBoundingBox
        id="skills"
        label="Kỹ Năng Dẫn Dắt"
        isSelected={selectedElementId === 'skills'}
        onSelect={onSelectElement}
      >
        <section className="pt-2 border-t border-slate-200">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
            Năng Lực Lãnh Đạo & Kiến Trúc Công Nghệ
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <span
                key={s.id}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-900 text-white"
              >
                {s.name}
              </span>
            ))}
          </div>
        </section>
      </CanvaBoundingBox>
    </div>
  );
}
