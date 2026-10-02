'use client';

import React from 'react';
import { CVData } from '@/types/cv';
import { EditableInlineText } from '../canva/EditableInlineText';
import { CanvaBoundingBox } from '../canva/CanvaBoundingBox';
import { Landmark, Award, CheckCircle } from 'lucide-react';

interface TemplateProps {
  data: CVData;
  onUpdate?: (data: CVData) => void;
  selectedElementId?: string | null;
  onSelectElement?: (id: string) => void;
}

export function CVBankingTemplate({
  data,
  onUpdate,
  selectedElementId,
  onSelectElement = () => {},
}: TemplateProps) {
  const { personalInfo, summary, experience, education, skills, certifications } = data;

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
      className="cv-paper-sheet bg-white text-slate-900 w-[210mm] min-h-[297mm] p-12 mx-auto shadow-2xl print:shadow-none print:p-8 print:w-full print:m-0 selection:bg-amber-100"
      style={{ boxSizing: 'border-box' }}
    >
      {/* Formal Banking Header */}
      <CanvaBoundingBox
        id="header"
        label="Banking Header"
        isSelected={selectedElementId === 'header'}
        onSelect={onSelectElement}
      >
        <header className="text-center pb-5 mb-5 border-b-2 border-slate-900">
          <div className="flex items-center justify-center gap-1.5 text-amber-800 text-[10px] font-bold uppercase tracking-widest mb-1">
            <Landmark className="w-3.5 h-3.5" />
            <span>FINANCE & INVESTMENT BANKING PROFILE</span>
          </div>
          <h1 className="text-3xl font-serif font-black uppercase text-slate-950 tracking-wider">
            <EditableInlineText
              value={personalInfo.fullName}
              onChange={(v) => updatePersonalInfo('fullName', v)}
              placeholder="HỌ VÀ TÊN CHUYÊN VIÊN"
            />
          </h1>
          <div className="text-xs font-semibold tracking-widest text-slate-600 uppercase mt-1">
            <EditableInlineText
              value={personalInfo.title}
              onChange={(v) => updatePersonalInfo('title', v)}
              placeholder="Investment Analyst & Risk Management"
            />
          </div>
          <div className="flex justify-center gap-4 text-[11px] text-slate-500 pt-2">
            <span>{personalInfo.location}</span>
            <span>•</span>
            <span>{personalInfo.phone}</span>
            <span>•</span>
            <span>{personalInfo.email}</span>
          </div>
        </header>
      </CanvaBoundingBox>

      {/* Summary */}
      <CanvaBoundingBox
        id="summary"
        label="Tóm Tắt Năng Lực"
        isSelected={selectedElementId === 'summary'}
        onSelect={onSelectElement}
      >
        <section className="mb-5">
          <h2 className="text-xs font-serif font-bold uppercase tracking-widest text-slate-900 border-b border-slate-300 pb-1 mb-2">
            Professional Summary
          </h2>
          <div className="text-[11px] font-serif leading-relaxed text-slate-800 text-justify">
            <EditableInlineText value={summary} onChange={updateSummary} multiline />
          </div>
        </section>
      </CanvaBoundingBox>

      {/* Experience */}
      <CanvaBoundingBox
        id="experience"
        label="Kinh Nghiệm Ngân Hàng"
        isSelected={selectedElementId === 'experience'}
        onSelect={onSelectElement}
      >
        <section className="mb-5 space-y-3">
          <h2 className="text-xs font-serif font-bold uppercase tracking-widest text-slate-900 border-b border-slate-300 pb-1 mb-2">
            Work Experience
          </h2>
          <div className="space-y-4">
            {experience.map((exp) => (
              <div key={exp.id} className="text-xs font-serif space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-slate-950 text-sm">{exp.company}</span>
                  <span className="text-[10.5px] text-slate-600 font-sans">
                    {exp.startDate} – {exp.isCurrent ? 'Present' : exp.endDate}
                  </span>
                </div>
                <div className="italic text-slate-700 font-medium">{exp.position}</div>
                <div className="text-[11px] text-slate-800 leading-relaxed whitespace-pre-line pl-2">
                  {exp.description}
                </div>
              </div>
            ))}
          </div>
        </section>
      </CanvaBoundingBox>

      {/* Education */}
      <CanvaBoundingBox
        id="education"
        label="Học Vấn & Bằng Cấp"
        isSelected={selectedElementId === 'education'}
        onSelect={onSelectElement}
      >
        <section className="mb-5 space-y-2">
          <h2 className="text-xs font-serif font-bold uppercase tracking-widest text-slate-900 border-b border-slate-300 pb-1 mb-2">
            Education
          </h2>
          {education.map((edu) => (
            <div key={edu.id} className="text-xs font-serif">
              <div className="flex justify-between items-baseline font-bold text-slate-900">
                <span>{edu.school}</span>
                <span className="text-[10px] text-slate-500 font-sans">
                  {edu.startDate} – {edu.endDate}
                </span>
              </div>
              <div className="italic text-slate-700">
                {edu.degree} trong {edu.field}
              </div>
              {edu.description && (
                <div className="text-[10.5px] text-slate-600">{edu.description}</div>
              )}
            </div>
          ))}
        </section>
      </CanvaBoundingBox>

      {/* Skills */}
      <CanvaBoundingBox
        id="skills"
        label="Kỹ Năng Tài Chính"
        isSelected={selectedElementId === 'skills'}
        onSelect={onSelectElement}
      >
        <section className="pt-2 border-t border-slate-300">
          <h2 className="text-xs font-serif font-bold uppercase tracking-widest text-slate-900 mb-2">
            Core Competencies & Tools
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-800 font-serif">
            {skills.map((s) => (
              <span key={s.id}>• {s.name}</span>
            ))}
          </div>
        </section>
      </CanvaBoundingBox>
    </div>
  );
}
