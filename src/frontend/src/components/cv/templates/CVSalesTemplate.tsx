'use client';

import React from 'react';
import { CVData } from '@/types/cv';
import { EditableInlineText } from '../canva/EditableInlineText';
import { CanvaBoundingBox } from '../canva/CanvaBoundingBox';
import {
  TrendingUp,
  Target,
  DollarSign,
  Award,
  Briefcase,
  GraduationCap,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';

interface TemplateProps {
  data: CVData;
  onUpdate?: (data: CVData) => void;
  selectedElementId?: string | null;
  onSelectElement?: (id: string) => void;
}

export function CVSalesTemplate({
  data,
  onUpdate,
  selectedElementId,
  onSelectElement = () => {},
}: TemplateProps) {
  const { personalInfo, summary, experience, education, skills, awards, certifications } = data;

  const updatePersonalInfo = (field: string, val: string) => {
    if (!onUpdate) return;
    onUpdate({ ...data, personalInfo: { ...data.personalInfo, [field]: val } });
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
      className="cv-paper-sheet bg-white text-slate-900 w-[210mm] min-h-[297mm] p-10 mx-auto shadow-2xl print:shadow-none print:p-8 print:w-full print:m-0 selection:bg-emerald-100"
      style={{ boxSizing: 'border-box' }}
    >
      {/* Sales Header */}
      <CanvaBoundingBox
        id="header"
        label="Sales Header"
        isSelected={selectedElementId === 'header'}
        onSelect={onSelectElement}
      >
        <header className="border-b-2 border-emerald-600 pb-5 mb-5 flex justify-between items-start">
          <div className="space-y-1 max-w-[70%]">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider mb-1">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              <span>HIGH-PERFORMANCE SALES & BUSINESS DEVELOPMENT</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              <EditableInlineText
                value={personalInfo.fullName}
                onChange={(v) => updatePersonalInfo('fullName', v)}
                placeholder="NGUYỄN VĂN ANH"
              />
            </h1>
            <div className="text-sm font-bold text-emerald-700 uppercase tracking-wide">
              <EditableInlineText
                value={personalInfo.title}
                onChange={(v) => updatePersonalInfo('title', v)}
                placeholder="Senior Business Development & Enterprise Sales Manager"
              />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600 pt-1 font-medium">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-600" />
                {personalInfo.location}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-600" />
                {personalInfo.phone}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3 text-emerald-600" />
                {personalInfo.email}
              </span>
            </div>
          </div>

          {/* Quick Metrics Badge */}
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-xl shadow-md text-center min-w-[130px]">
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-90">
              KPI ĐẠT ĐƯỢC
            </div>
            <div className="text-xl font-black mt-0.5">145%</div>
            <div className="text-[9px] text-emerald-100 font-medium">Target Doanh Thu 2023</div>
          </div>
        </header>
      </CanvaBoundingBox>

      {/* Summary */}
      <CanvaBoundingBox
        id="summary"
        label="Tuyên Ngôn Bán Hàng"
        isSelected={selectedElementId === 'summary'}
        onSelect={onSelectElement}
      >
        <section className="mb-5 bg-slate-50 border-l-4 border-emerald-600 p-3.5 rounded-r-xl">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
            <Target className="w-3.5 h-3.5 text-emerald-600" />
            <span>Định Hướng Chiến Lược & Giá Trị Cung Cấp</span>
          </div>
          <div className="text-[11px] leading-relaxed text-slate-700">
            <EditableInlineText
              value={summary}
              onChange={updateSummary}
              multiline
              placeholder="Chuyên gia phát triển kinh doanh B2B/SaaS với thành tích chốt hợp đồng lớn..."
            />
          </div>
        </section>
      </CanvaBoundingBox>

      {/* Grid: Experience (Left 65%) & Skills/Education (Right 35%) */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Experience */}
        <div className="col-span-8 space-y-4">
          <CanvaBoundingBox
            id="experience"
            label="Kinh Nghiệm Sales"
            isSelected={selectedElementId === 'experience'}
            onSelect={onSelectElement}
          >
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-emerald-200 pb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                <span>Thành Tích Kinh Doanh & Trải Nghiệm Thực Chiến</span>
              </h2>

              <div className="space-y-3.5 pt-1">
                {experience.map((exp) => (
                  <div key={exp.id} className="relative pl-3 border-l-2 border-slate-200 space-y-1">
                    <div className="flex justify-between items-baseline">
                      <div className="text-xs font-bold text-slate-900">
                        <EditableInlineText
                          value={exp.position}
                          onChange={(v) => updateExp(exp.id, 'position', v)}
                          placeholder="Vị trí Sales"
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {exp.startDate} - {exp.endDate}
                      </span>
                    </div>

                    <div className="text-[11px] font-medium text-slate-600 flex justify-between">
                      <EditableInlineText
                        value={exp.company}
                        onChange={(v) => updateExp(exp.id, 'company', v)}
                        placeholder="Tên công ty"
                      />
                      <span>{exp.location}</span>
                    </div>

                    <div className="text-[10.5px] leading-relaxed text-slate-600 whitespace-pre-line pt-0.5">
                      <EditableInlineText
                        value={exp.description}
                        onChange={(v) => updateExp(exp.id, 'description', v)}
                        multiline
                        placeholder="Mô tả doanh số đạt được, quy mô deal, thị phần..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </CanvaBoundingBox>
        </div>

        {/* Right Column: Skills, Education, Achievements */}
        <div className="col-span-4 space-y-4">
          {/* Skills */}
          <CanvaBoundingBox
            id="skills"
            label="Kỹ Năng Đàm Phán"
            isSelected={selectedElementId === 'skills'}
            onSelect={onSelectElement}
          >
            <section className="p-3 bg-slate-50 rounded-xl space-y-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                <span>Kỹ Năng & Công Cụ</span>
              </h2>

              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <span
                    key={skill.id}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 shadow-xs"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </section>
          </CanvaBoundingBox>

          {/* Education */}
          <CanvaBoundingBox
            id="education"
            label="Học Vấn"
            isSelected={selectedElementId === 'education'}
            onSelect={onSelectElement}
          >
            <section className="p-3 bg-slate-50 rounded-xl space-y-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                <span>Học Vấn & Đào Tạo</span>
              </h2>

              <div className="space-y-2">
                {education.map((edu) => (
                  <div key={edu.id} className="text-[10.5px]">
                    <div className="font-bold text-slate-800">{edu.school}</div>
                    <div className="text-slate-600">
                      {edu.degree} - {edu.field}
                    </div>
                    <div className="text-[9.5px] text-slate-400">
                      {edu.startDate} - {edu.endDate}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </CanvaBoundingBox>

          {/* Certifications & Deals */}
          {certifications && certifications.length > 0 && (
            <CanvaBoundingBox
              id="certifications"
              label="Chứng Chỉ & Giải Thưởng"
              isSelected={selectedElementId === 'certifications'}
              onSelect={onSelectElement}
            >
              <section className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-1.5">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Chứng Chỉ Quốc Tế</span>
                </h2>
                <div className="space-y-1">
                  {certifications.map((c) => (
                    <div key={c.id} className="text-[10px] text-slate-700">
                      <span className="font-semibold text-slate-900">{c.name}</span>
                      <span className="text-slate-500"> ({c.issuer})</span>
                    </div>
                  ))}
                </div>
              </section>
            </CanvaBoundingBox>
          )}
        </div>
      </div>
    </div>
  );
}
