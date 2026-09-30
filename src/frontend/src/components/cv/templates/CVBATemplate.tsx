'use client';

import React from 'react';
import { CVData } from '@/types/cv';
import { EditableInlineText } from '../canva/EditableInlineText';
import { CanvaBoundingBox } from '../canva/CanvaBoundingBox';
import { Network, Database, CheckSquare, Layers, FileSpreadsheet, MapPin, Mail, Phone, Award } from 'lucide-react';

interface TemplateProps {
  data: CVData;
  onUpdate?: (data: CVData) => void;
  selectedElementId?: string | null;
  onSelectElement?: (id: string) => void;
}

export function CVBATemplate({
  data,
  onUpdate,
  selectedElementId,
  onSelectElement = () => {},
}: TemplateProps) {
  const { personalInfo, summary, experience, education, skills, projects, certifications } = data;

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
      className="cv-paper-sheet bg-white text-slate-900 w-[210mm] min-h-[297mm] p-10 mx-auto shadow-2xl print:shadow-none print:p-8 print:w-full print:m-0 selection:bg-teal-100"
      style={{ boxSizing: 'border-box' }}
    >
      {/* Header */}
      <CanvaBoundingBox
        id="header"
        label="BA Profile Header"
        isSelected={selectedElementId === 'header'}
        onSelect={onSelectElement}
      >
        <header className="border-b-2 border-teal-700 pb-4 mb-5 flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-teal-800 text-[10px] font-bold uppercase tracking-wider">
              <Network className="w-3.5 h-3.5 text-teal-600" />
              <span>BUSINESS ANALYSIS & PRODUCT STRATEGY SPECIFICATION</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              <EditableInlineText
                value={personalInfo.fullName}
                onChange={(v) => updatePersonalInfo('fullName', v)}
                placeholder="HỌ VÀ TÊN CHUYÊN VIÊN BA"
              />
            </h1>
            <div className="text-sm font-semibold text-teal-700 uppercase tracking-wide">
              <EditableInlineText
                value={personalInfo.title}
                onChange={(v) => updatePersonalInfo('title', v)}
                placeholder="Lead Business Analyst / Product Strategist"
              />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600 pt-1 font-medium">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-teal-600" />{personalInfo.location}</span>
              <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-teal-600" />{personalInfo.phone}</span>
              <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-teal-600" />{personalInfo.email}</span>
            </div>
          </div>

          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-center min-w-[120px]">
            <div className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">METHODOLOGY</div>
            <div className="text-sm font-black text-teal-900 mt-0.5">BABOK & Agile</div>
            <div className="text-[9px] text-teal-600 font-medium">CBAP / CSPO Certified</div>
          </div>
        </header>
      </CanvaBoundingBox>

      {/* Summary / Core Competencies */}
      <CanvaBoundingBox
        id="summary"
        label="Năng Lực Phân Tích Cốt Lõi"
        isSelected={selectedElementId === 'summary'}
        onSelect={onSelectElement}
      >
        <section className="mb-5 bg-slate-50 border-l-4 border-teal-600 p-3.5 rounded-r-xl">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
            <Layers className="w-3.5 h-3.5 text-teal-600" />
            <span>Tóm Tắt Năng Lực & Cầu Nối Kinh Doanh - Công Nghệ</span>
          </div>
          <div className="text-[11px] leading-relaxed text-slate-700">
            <EditableInlineText
              value={summary}
              onChange={updateSummary}
              multiline
              placeholder="Chuyên viên phân tích nghiệp vụ với chuyên môn chuyển đổi bài toán kinh doanh thành đặc tả phần mềm BRD, SRS..."
            />
          </div>
        </section>
      </CanvaBoundingBox>

      {/* 2-Columns Layout: BA Experience (Left) & BA Toolkit (Right) */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-4">
          <CanvaBoundingBox
            id="experience"
            label="Kinh Nghiệm Phân Tích & Sản Phẩm"
            isSelected={selectedElementId === 'experience'}
            onSelect={onSelectElement}
          >
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-teal-200 pb-1 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                <span>Kinh Nghiệm Phân Tích Nghiệp Vụ & Dự Án</span>
              </h2>

              <div className="space-y-3.5 pt-1">
                {experience.map((exp) => (
                  <div key={exp.id} className="relative pl-3 border-l-2 border-teal-500/30 space-y-1">
                    <div className="flex justify-between items-baseline">
                      <div className="text-xs font-bold text-slate-900">
                        <EditableInlineText
                          value={exp.position}
                          onChange={(v) => updateExp(exp.id, 'position', v)}
                          placeholder="Vị trí BA"
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                        {exp.startDate} - {exp.endDate}
                      </span>
                    </div>

                    <div className="text-[11px] font-medium text-slate-600">
                      <EditableInlineText
                        value={exp.company}
                        onChange={(v) => updateExp(exp.id, 'company', v)}
                        placeholder="Tên tổ chức / Công ty"
                      />
                    </div>

                    <div className="text-[10.5px] leading-relaxed text-slate-600 whitespace-pre-line pt-0.5">
                      <EditableInlineText
                        value={exp.description}
                        onChange={(v) => updateExp(exp.id, 'description', v)}
                        multiline
                        placeholder="Mô tả các tài liệu nghiệp vụ đã lập, quy trình đã tối ưu, sprint backlog..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </CanvaBoundingBox>
        </div>

        <div className="col-span-4 space-y-4">
          {/* BA Toolkit Skills */}
          <CanvaBoundingBox
            id="skills"
            label="Kỹ Năng & Công Cụ BA"
            isSelected={selectedElementId === 'skills'}
            onSelect={onSelectElement}
          >
            <section className="p-3 bg-slate-50 rounded-xl space-y-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-teal-600" />
                <span>Công Cụ & Phương Pháp</span>
              </h2>

              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <span
                    key={s.id}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800"
                  >
                    {s.name}
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
                <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
                <span>Học Vấn</span>
              </h2>

              <div className="space-y-2">
                {education.map((edu) => (
                  <div key={edu.id} className="text-[10.5px]">
                    <div className="font-bold text-slate-800">{edu.school}</div>
                    <div className="text-slate-600">{edu.degree} - {edu.field}</div>
                    <div className="text-[9.5px] text-slate-400">{edu.startDate} - {edu.endDate}</div>
                  </div>
                ))}
              </div>
            </section>
          </CanvaBoundingBox>

          {/* Certifications */}
          {certifications && certifications.length > 0 && (
            <CanvaBoundingBox
              id="certifications"
              label="Chứng Chỉ BA"
              isSelected={selectedElementId === 'certifications'}
              onSelect={onSelectElement}
            >
              <section className="p-3 bg-teal-50/50 rounded-xl border border-teal-100 space-y-1.5">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-teal-950 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-teal-600" />
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
