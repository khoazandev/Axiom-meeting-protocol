'use client';

import React from 'react';
import { CVData } from '@/types/cv';
import { EditableInlineText } from '../canva/EditableInlineText';
import { CanvaBoundingBox } from '../canva/CanvaBoundingBox';
import { Palette, ExternalLink, Sparkles, FolderKanban } from 'lucide-react';

interface TemplateProps {
  data: CVData;
  onUpdate?: (data: CVData) => void;
  selectedElementId?: string | null;
  onSelectElement?: (id: string) => void;
}

export function CVDesignerTemplate({
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
      className="cv-paper-sheet bg-white text-slate-900 w-[210mm] min-h-[297mm] p-10 mx-auto shadow-2xl print:shadow-none print:p-8 print:w-full print:m-0 selection:bg-purple-100"
      style={{ boxSizing: 'border-box' }}
    >
      {/* Creative Header */}
      <CanvaBoundingBox
        id="header"
        label="Creative Header"
        isSelected={selectedElementId === 'header'}
        onSelect={onSelectElement}
      >
        <header className="mb-6 pb-6 border-b border-purple-100 flex items-center justify-between gap-6">
          <div className="space-y-1.5 flex-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              PRODUCT & UI/UX DESIGNER
            </span>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              <EditableInlineText
                value={personalInfo.fullName}
                onChange={(v) => updatePersonalInfo('fullName', v)}
                placeholder="TÊN NHÀ THIẾT KẾ"
              />
            </h1>
            <p className="text-xs font-semibold text-slate-500">
              <EditableInlineText
                value={personalInfo.title}
                onChange={(v) => updatePersonalInfo('title', v)}
                placeholder="Product Designer & Design Systems"
              />
            </p>
            <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 pt-1">
              <span>{personalInfo.location}</span>
              <span>•</span>
              <span>{personalInfo.email}</span>
              <span>•</span>
              <span>{personalInfo.phone}</span>
            </div>
          </div>

          {personalInfo.avatarUrl ? (
            <div className="w-20 h-20 rounded-3xl overflow-hidden ring-4 ring-purple-100 shadow-md shrink-0">
              <img
                src={personalInfo.avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-18 h-18 rounded-3xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
              {personalInfo.fullName?.slice(0, 2).toUpperCase() || 'UX'}
            </div>
          )}
        </header>
      </CanvaBoundingBox>

      {/* Summary */}
      <CanvaBoundingBox
        id="summary"
        label="Tuyên Ngôn Thiết Kế"
        isSelected={selectedElementId === 'summary'}
        onSelect={onSelectElement}
      >
        <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-purple-50/50 to-pink-50/50 border border-purple-100 text-xs text-slate-700 leading-relaxed">
          <EditableInlineText
            value={summary}
            onChange={updateSummary}
            multiline
            placeholder="Mô tả triết lý thiết kế và kinh nghiệm UI/UX..."
          />
        </div>
      </CanvaBoundingBox>

      {/* Featured Projects Grid (Designer Portfolio Focus) */}
      <CanvaBoundingBox
        id="projects"
        label="Dự Án Portfolio"
        isSelected={selectedElementId === 'projects'}
        onSelect={onSelectElement}
      >
        <section className="mb-6 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5 border-b border-purple-100 pb-1.5">
            <Palette className="w-4 h-4 text-purple-600" />
            <span>Dự Án Trọng Điểm & Portfolio Sản Phẩm</span>
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {projects.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-purple-100/80 space-y-1.5 hover:shadow-xs transition-shadow"
              >
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-900">{p.name}</span>
                  {p.link && <ExternalLink className="w-3 h-3 text-purple-500" />}
                </div>
                <div className="text-[10.5px] text-purple-700 font-semibold">{p.role}</div>
                <p className="text-[10px] text-slate-600 leading-snug">{p.description}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {p.technologies.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white text-purple-700 border border-purple-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </CanvaBoundingBox>

      {/* Work Experience */}
      <CanvaBoundingBox
        id="experience"
        label="Kinh Nghiệm"
        isSelected={selectedElementId === 'experience'}
        onSelect={onSelectElement}
      >
        <section className="mb-5 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5">
            Kinh Nghiệm Thiết Kế & Phát Triển
          </h2>
          <div className="space-y-3">
            {experience.map((exp) => (
              <div key={exp.id} className="text-xs space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-slate-900">{exp.position}</span>
                  <span className="text-[10px] text-slate-400">
                    {exp.startDate} – {exp.isCurrent ? 'Hiện tại' : exp.endDate}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-purple-700">{exp.company}</div>
                <p className="text-[10.5px] text-slate-600 leading-relaxed whitespace-pre-line pl-2 border-l-2 border-purple-200">
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
        label="Kỹ Năng Sáng Tạo"
        isSelected={selectedElementId === 'skills'}
        onSelect={onSelectElement}
      >
        <section className="pt-2 border-t border-slate-200">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
            Kỹ Năng & Công Cụ Thiết Kế
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <span
                key={s.id}
                className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/80"
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
