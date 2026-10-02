'use client';

import React from 'react';
import { CVData, CVSection } from '@/types/cv';

interface CVTemplateProps {
  data: CVData;
}

export function CVMinimalistTemplate({ data }: CVTemplateProps) {
  const {
    personalInfo,
    summary,
    experience = [],
    education = [],
    skills = [],
    projects = [],
    certifications = [],
    languages = [],
  } = data;

  return (
    <div
      className="cv-paper-sheet bg-white text-zinc-900 w-[210mm] min-h-[297mm] p-12 mx-auto shadow-xl print:shadow-none print:p-8 print:w-full print:m-0 selection:bg-zinc-200"
      style={{ boxSizing: 'border-box' }}
    >
      {/* Minimalist Editorial Header */}
      <header className="mb-8">
        <div className="flex justify-between items-start border-b border-zinc-200 pb-6">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-zinc-950 uppercase">
              <span className="font-bold">{personalInfo.fullName?.split(' ')[0]}</span>{' '}
              {personalInfo.fullName?.split(' ').slice(1).join(' ') || 'ỨNG VIÊN'}
            </h1>
            <p className="text-xs tracking-widest text-zinc-500 uppercase mt-1">
              {personalInfo.title}
            </p>
          </div>
          <div className="text-right text-[11px] text-zinc-600 space-y-0.5">
            {personalInfo.email && <div>{personalInfo.email}</div>}
            {personalInfo.phone && <div>{personalInfo.phone}</div>}
            {personalInfo.location && <div>{personalInfo.location}</div>}
          </div>
        </div>
      </header>

      {/* Grid Layout with Left Label & Right Detail */}
      <div className="space-y-6">
        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
              Về Bản Thân
            </div>
            <div className="col-span-9 text-xs text-zinc-700 leading-relaxed">{summary}</div>
          </div>
        )}

        {/* Experience */}
        {experience.length > 0 && (
          <div className="grid grid-cols-12 gap-6 pt-4 border-t border-zinc-100">
            <div className="col-span-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
              Kinh Nghiệm
            </div>
            <div className="col-span-9 space-y-4">
              {experience.map((exp) => (
                <div key={exp.id} className="text-xs space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-zinc-900">{exp.position}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {exp.startDate} – {exp.isCurrent ? 'Hiện tại' : exp.endDate}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-zinc-500">
                    {exp.company} {exp.location ? `• ${exp.location}` : ''}
                  </div>
                  {exp.description && (
                    <div className="text-[11px] text-zinc-600 leading-relaxed whitespace-pre-line pt-0.5">
                      {exp.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <div className="grid grid-cols-12 gap-6 pt-4 border-t border-zinc-100">
            <div className="col-span-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
              Dự Án
            </div>
            <div className="col-span-9 space-y-3">
              {projects.map((p) => (
                <div key={p.id} className="text-xs space-y-0.5">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-zinc-900">{p.name}</span>
                    {p.startDate && (
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {p.startDate} – {p.endDate || 'Hiện tại'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">{p.description}</p>
                  {p.technologies && (
                    <div className="text-[10px] text-zinc-400">{p.technologies.join(' · ')}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {education.length > 0 && (
          <div className="grid grid-cols-12 gap-6 pt-4 border-t border-zinc-100">
            <div className="col-span-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
              Học Vấn
            </div>
            <div className="col-span-9 space-y-2">
              {education.map((edu) => (
                <div key={edu.id} className="text-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-zinc-900">{edu.school}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {edu.startDate} – {edu.endDate}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-600">
                    {edu.degree} trong {edu.field}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="grid grid-cols-12 gap-6 pt-4 border-t border-zinc-100">
            <div className="col-span-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
              Kỹ Năng
            </div>
            <div className="col-span-9 flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <span
                  key={s.id}
                  className="text-[11px] px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-800 font-medium"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Languages & Certs */}
        {(languages.length > 0 || certifications.length > 0) && (
          <div className="grid grid-cols-12 gap-6 pt-4 border-t border-zinc-100">
            <div className="col-span-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
              Bổ Sung
            </div>
            <div className="col-span-9 space-y-2 text-xs text-zinc-700">
              {languages.length > 0 && (
                <div>
                  <span className="font-semibold text-zinc-900">Ngoại ngữ: </span>
                  <span>{languages.map((l) => `${l.name} (${l.level})`).join(', ')}</span>
                </div>
              )}
              {certifications.length > 0 && (
                <div>
                  <span className="font-semibold text-zinc-900">Chứng chỉ: </span>
                  <span>{certifications.map((c) => `${c.name} - ${c.issuer}`).join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
