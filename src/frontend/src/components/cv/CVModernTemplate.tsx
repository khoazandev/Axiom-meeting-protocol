'use client';

import React from 'react';
import { CVData, CVSection } from '@/types/cv';
import { Mail, Phone, MapPin, Globe, ExternalLink, Calendar, GraduationCap, Award, Briefcase, Code, Sparkles } from 'lucide-react';

interface CVTemplateProps {
  data: CVData;
}

export function CVModernTemplate({ data }: CVTemplateProps) {
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

  const techSkills = skills.filter((s) => s.category === 'technical');
  const softSkills = skills.filter((s) => s.category === 'soft');

  return (
    <div
      className="cv-paper-sheet bg-white text-slate-900 w-[210mm] min-h-[297mm] mx-auto shadow-xl print:shadow-none print:w-full print:m-0 flex flex-row overflow-hidden selection:bg-indigo-100"
      style={{ boxSizing: 'border-box' }}
    >
      {/* ── Left Sidebar (approx 32% width) ────────────────────────── */}
      <aside className="w-[33%] bg-slate-900 text-slate-200 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          {/* Avatar or Initials */}
          <div className="text-center pt-2">
            {personalInfo.avatarUrl ? (
              <div className="w-24 h-24 rounded-2xl mx-auto overflow-hidden ring-4 ring-slate-800 shadow-lg mb-3">
                <img
                  src={personalInfo.avatarUrl}
                  alt={personalInfo.fullName}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl mx-auto bg-indigo-600 text-white flex items-center justify-center font-black text-2xl ring-4 ring-slate-800 shadow-lg mb-3">
                {personalInfo.fullName?.slice(0, 2).toUpperCase() || 'CV'}
              </div>
            )}
            <h2 className="text-base font-black text-white uppercase tracking-tight">
              {personalInfo.fullName || 'HỌ VÀ TÊN'}
            </h2>
            <p className="text-[11px] font-semibold text-indigo-400 mt-0.5">
              {personalInfo.title || 'Vị trí công việc'}
            </p>
          </div>

          {/* Contact Details */}
          <div className="space-y-2.5 text-[11px] text-slate-300 border-t border-slate-800 pt-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2">
              Liên Hệ
            </h3>
            {personalInfo.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">{personalInfo.email}</span>
              </div>
            )}
            {personalInfo.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{personalInfo.phone}</span>
              </div>
            )}
            {personalInfo.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">{personalInfo.location}</span>
              </div>
            )}
            {personalInfo.socials?.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">{s.url}</span>
              </div>
            ))}
          </div>

          {/* Education in Sidebar */}
          {education.length > 0 && (
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                Học Vấn
              </h3>
              {education.map((edu) => (
                <div key={edu.id} className="text-[11px] space-y-0.5">
                  <div className="font-bold text-white leading-tight">{edu.school}</div>
                  <div className="text-indigo-300 text-[10.5px] font-medium">{edu.degree} - {edu.field}</div>
                  <div className="text-[10px] text-slate-400">{edu.startDate} – {edu.endDate}</div>
                  {edu.description && (
                    <p className="text-[10px] text-slate-400 leading-snug pt-0.5">{edu.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Technical Skills */}
          {techSkills.length > 0 && (
            <div className="border-t border-slate-800 pt-4 space-y-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                Kỹ Năng Kỹ Thuật
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {techSkills.map((sk) => (
                  <span
                    key={sk.id}
                    className="text-[10px] font-medium px-2 py-0.5 bg-slate-800 border border-slate-700 text-indigo-200 rounded-md"
                  >
                    {sk.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Soft Skills */}
          {softSkills.length > 0 && (
            <div className="border-t border-slate-800 pt-4 space-y-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                Kỹ Năng Mềm
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {softSkills.map((sk) => (
                  <span
                    key={sk.id}
                    className="text-[10px] font-medium px-2 py-0.5 bg-indigo-950/60 border border-indigo-800/80 text-indigo-300 rounded-md"
                  >
                    {sk.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {languages.length > 0 && (
            <div className="border-t border-slate-800 pt-4 space-y-1.5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                Ngoại Ngữ
              </h3>
              {languages.map((l) => (
                <div key={l.id} className="text-[11px] flex justify-between items-center text-slate-300">
                  <span className="font-semibold text-white">{l.name}</span>
                  <span className="text-[10px] text-indigo-300">{l.level}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer branding */}
        <div className="pt-4 text-center text-[9px] text-slate-500 font-mono">
          Axiom Verified Profile
        </div>
      </aside>

      {/* ── Right Content Area (approx 68% width) ────────────────── */}
      <main className="w-[67%] p-8 flex flex-col justify-start space-y-5 bg-white text-slate-800">
        {/* Top Header */}
        <div className="border-b-2 border-indigo-600 pb-3">
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hồ Sơ Năng Lực Ứng Viên</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            {personalInfo.fullName || 'HỌ VÀ TÊN'}
          </h1>
          <p className="text-xs font-bold text-slate-600 tracking-wide mt-0.5">
            {personalInfo.title}
          </p>
        </div>

        {/* Professional Summary */}
        {summary && (
          <section className="space-y-1.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
              <span>Tóm Tắt Mục Tiêu & Năng Lực</span>
            </h2>
            <p className="text-[11px] text-slate-600 leading-relaxed text-justify">
              {summary}
            </p>
          </section>
        )}

        {/* Work Experience */}
        {experience.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1">
              <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
              <span>Kinh Nghiệm Làm Việc Chuyên Sâu</span>
            </h2>
            <div className="space-y-3 pl-1">
              {experience.map((exp) => (
                <div key={exp.id} className="relative pl-4 border-l-2 border-indigo-200">
                  <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white" />
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-900">{exp.position}</span>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {exp.startDate} – {exp.isCurrent ? 'Hiện tại' : exp.endDate}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-indigo-700 mb-1">
                    {exp.company} {exp.location ? `• ${exp.location}` : ''}
                  </div>
                  {exp.description && (
                    <div className="text-[10.5px] text-slate-600 leading-relaxed space-y-1 whitespace-pre-line">
                      {exp.description.split('\n').map((line, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="text-indigo-500 font-bold">•</span>
                          <span>{line.replace(/^•\s*/, '')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Featured Projects */}
        {projects.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1">
              <Code className="w-3.5 h-3.5 text-indigo-600" />
              <span>Dự Án Trọng Điểm</span>
            </h2>
            <div className="grid grid-cols-1 gap-2.5">
              {projects.map((proj) => (
                <div key={proj.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex justify-between items-baseline">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">{proj.name}</span>
                      {proj.role && <span className="text-[10px] text-indigo-600 font-medium">({proj.role})</span>}
                    </div>
                    {proj.startDate && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {proj.startDate} – {proj.endDate || 'Nay'}
                      </span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-slate-600 leading-relaxed">
                    {proj.description}
                  </p>
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {proj.technologies.map((t, idx) => (
                        <span key={idx} className="text-[9.5px] font-semibold px-1.5 py-0.5 bg-white border border-slate-200 text-slate-700 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Certifications & Awards */}
        {certifications.length > 0 && (
          <section className="space-y-1.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1">
              <Award className="w-3.5 h-3.5 text-indigo-600" />
              <span>Chứng Chỉ & Giải Thưởng</span>
            </h2>
            <div className="space-y-1 text-[10.5px]">
              {certifications.map((c) => (
                <div key={c.id} className="flex justify-between items-center text-slate-700">
                  <span>
                    <strong className="font-bold text-slate-900">{c.name}</strong> – {c.issuer}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">{c.date}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
