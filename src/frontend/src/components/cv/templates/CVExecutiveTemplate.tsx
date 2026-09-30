'use client';

import React from 'react';
import { CVData, CVSection } from '@/types/cv';
import { EditableInlineText } from '../canva/EditableInlineText';
import { CanvaBoundingBox } from '../canva/CanvaBoundingBox';
import { Shield, Award, Mail, Phone, MapPin, Globe } from 'lucide-react';

interface TemplateProps {
  data: CVData;
  onUpdate?: (data: CVData) => void;
  selectedElementId?: string | null;
  onSelectElement?: (id: string) => void;
}

export function CVExecutiveTemplate({
  data,
  onUpdate,
  selectedElementId,
  onSelectElement = () => {},
}: TemplateProps) {
  const { personalInfo, summary, experience, education, skills, projects, certifications } = data;

  const updatePersonalInfo = (field: string, val: string) => {
    if (!onUpdate) return;
    onUpdate({
      ...data,
      personalInfo: { ...data.personalInfo, [field]: val },
    });
  };

  const updateSummary = (val: string) => {
    if (!onUpdate) return;
    onUpdate({ ...data, summary: val });
  };

  const updateExp = (id: string, field: string, val: any) => {
    if (!onUpdate) return;
    onUpdate({
      ...data,
      experience: data.experience.map((e) => (e.id === id ? { ...e, [field]: val } : e)),
    });
  };

  return (
    <div
      className="cv-paper-sheet bg-white text-slate-900 w-[210mm] min-h-[297mm] p-10 mx-auto shadow-2xl print:shadow-none print:p-8 print:w-full print:m-0 selection:bg-blue-100"
      style={{ boxSizing: 'border-box' }}
    >
      {/* Executive Header Banner */}
      <CanvaBoundingBox
        id="header"
        label="Executive Header"
        isSelected={selectedElementId === 'header'}
        onSelect={onSelectElement}
      >
        <header className="border-b-4 border-blue-900 pb-5 mb-5 flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-blue-950 uppercase tracking-tight font-serif">
              <EditableInlineText
                value={personalInfo.fullName}
                onChange={(val) => updatePersonalInfo('fullName', val)}
                placeholder="HỌ VÀ TÊN LÃNH ĐẠO"
              />
            </h1>
            <div className="text-sm font-bold uppercase tracking-widest text-blue-800">
              <EditableInlineText
                value={personalInfo.title}
                onChange={(val) => updatePersonalInfo('title', val)}
                placeholder="VỊ TRÍ QUẢN LÝ / GIÁM ĐỐC"
              />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600 pt-1 font-medium">
              <span>{personalInfo.location}</span>
              <span>•</span>
              <span>{personalInfo.phone}</span>
              <span>•</span>
              <span>{personalInfo.email}</span>
            </div>
          </div>

          <div className="w-16 h-16 rounded-2xl bg-blue-900 text-white flex items-center justify-center font-serif text-2xl font-black shadow-md shrink-0">
            {personalInfo.fullName?.slice(0, 2).toUpperCase() || 'EX'}
          </div>
        </header>
      </CanvaBoundingBox>

      {/* Executive Summary */}
      <CanvaBoundingBox
        id="summary"
        label="Tóm Tắt Quản Trị"
        isSelected={selectedElementId === 'summary'}
        onSelect={onSelectElement}
      >
        <section className="mb-5 p-4 rounded-xl bg-slate-50 border-l-4 border-blue-900">
          <h2 className="text-xs font-black uppercase tracking-wider text-blue-950 mb-1.5 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-900" />
            <span>Năng Lực Lãnh Đạo & Tầm Nhìn Chiến Lược</span>
          </h2>
          <div className="text-[11px] leading-relaxed text-slate-700 text-justify">
            <EditableInlineText
              value={summary}
              onChange={updateSummary}
              multiline
              placeholder="Tóm tắt năng lực quản trị, điều hành đội ngũ..."
            />
          </div>
        </section>
      </CanvaBoundingBox>

      {/* Experience */}
      <CanvaBoundingBox
        id="experience"
        label="Kinh Nghiệm Điều Hành"
        isSelected={selectedElementId === 'experience'}
        onSelect={onSelectElement}
      >
        <section className="mb-5 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-blue-950 border-b-2 border-slate-200 pb-1 mb-2">
            Quá Trình Công Tác & Thành Tựu Quản Trị
          </h2>
          <div className="space-y-4">
            {experience.map((exp) => (
              <div key={exp.id} className="space-y-1 text-xs">
                <div className="flex justify-between items-baseline">
                  <span className="font-extrabold text-blue-950 text-sm">
                    <EditableInlineText
                      value={exp.company}
                      onChange={(val) => updateExp(exp.id, 'company', val)}
                    />
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {exp.startDate} – {exp.isCurrent ? 'Hiện tại' : exp.endDate}
                  </span>
                </div>
                <div className="text-blue-800 font-semibold text-[11px]">
                  <EditableInlineText
                    value={exp.position}
                    onChange={(val) => updateExp(exp.id, 'position', val)}
                  />
                </div>
                <div className="text-[11px] text-slate-700 leading-relaxed pl-2 border-l border-blue-200">
                  <EditableInlineText
                    value={exp.description}
                    onChange={(val) => updateExp(exp.id, 'description', val)}
                    multiline
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </CanvaBoundingBox>

      {/* Education & Core Competencies in 2 cols */}
      <div className="grid grid-cols-2 gap-6 pt-2 border-t border-slate-200">
        <CanvaBoundingBox
          id="education"
          label="Học Vấn"
          isSelected={selectedElementId === 'education'}
          onSelect={onSelectElement}
        >
          <section className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-blue-950 border-b border-slate-200 pb-1">
              Học Vấn & Đào Tạo
            </h3>
            {education.map((edu) => (
              <div key={edu.id} className="text-xs space-y-0.5">
                <div className="font-bold text-slate-900">{edu.school}</div>
                <div className="text-[11px] text-blue-800 font-medium">
                  {edu.degree} – {edu.field}
                </div>
                <div className="text-[10px] text-slate-400">
                  {edu.startDate} – {edu.endDate}
                </div>
              </div>
            ))}
          </section>
        </CanvaBoundingBox>

        <CanvaBoundingBox
          id="skills"
          label="Năng Lực Cốt Lõi"
          isSelected={selectedElementId === 'skills'}
          onSelect={onSelectElement}
        >
          <section className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-blue-950 border-b border-slate-200 pb-1">
              Kỹ Năng Cốt Lõi
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <span
                  key={s.id}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </section>
        </CanvaBoundingBox>
      </div>
    </div>
  );
}
