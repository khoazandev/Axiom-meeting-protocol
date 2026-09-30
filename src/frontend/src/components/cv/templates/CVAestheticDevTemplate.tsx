'use client';

import React from 'react';
import { CVData } from '@/types/cv';
import { EditableInlineText } from '../canva/EditableInlineText';
import { CanvaBoundingBox } from '../canva/CanvaBoundingBox';
import { Terminal, Code2, GitBranch, Cpu, FolderGit2, Mail, Phone, MapPin, Globe } from 'lucide-react';

interface TemplateProps {
  data: CVData;
  onUpdate?: (data: CVData) => void;
  selectedElementId?: string | null;
  onSelectElement?: (id: string) => void;
}

export function CVAestheticDevTemplate({
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

  const updateExp = (id: string, field: string, val: any) => {
    if (!onUpdate) return;
    onUpdate({
      ...data,
      experience: data.experience.map((e) => (e.id === id ? { ...e, [field]: val } : e)),
    });
  };

  return (
    <div
      className="cv-paper-sheet bg-white text-slate-900 w-[210mm] min-h-[297mm] p-10 mx-auto shadow-2xl print:shadow-none print:p-8 print:w-full print:m-0 selection:bg-cyan-100 font-sans"
      style={{ boxSizing: 'border-box' }}
    >
      {/* Terminal Title Bar */}
      <div className="bg-slate-900 text-slate-300 px-4 py-2 rounded-t-xl flex items-center justify-between text-[11px] font-mono border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          <span className="ml-2 text-slate-400 font-semibold">user@{personalInfo.fullName?.toLowerCase().replace(/\s+/g, '') || 'dev'}: ~/profile</span>
        </div>
        <div className="flex items-center gap-1.5 text-cyan-400">
          <Terminal className="w-3.5 h-3.5" />
          <span>zsh / bash</span>
        </div>
      </div>

      <div className="border border-t-0 border-slate-200 rounded-b-xl p-6 bg-slate-50/50">
        {/* Terminal Header */}
        <CanvaBoundingBox
          id="header"
          label="Terminal Prompt Header"
          isSelected={selectedElementId === 'header'}
          onSelect={onSelectElement}
        >
          <header className="pb-4 mb-4 border-b border-slate-200">
            <div className="flex items-baseline gap-2 font-mono text-cyan-600 text-xs font-bold mb-1">
              <span>$ whoami</span>
              <span className="text-slate-400">--verbose</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight font-mono">
              <EditableInlineText
                value={personalInfo.fullName}
                onChange={(v) => updatePersonalInfo('fullName', v)}
                placeholder="DEVELOPER_NAME"
              />
            </h1>
            <div className="text-sm font-semibold text-slate-700 font-mono mt-0.5 flex items-center gap-2">
              <span className="text-emerald-600 font-bold">&gt;</span>
              <EditableInlineText
                value={personalInfo.title}
                onChange={(v) => updatePersonalInfo('title', v)}
                placeholder="Fullstack Engineer / Systems Hacker"
              />
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono text-slate-600 pt-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-cyan-600" />
                {personalInfo.location}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3 text-cyan-600" />
                {personalInfo.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-cyan-600" />
                {personalInfo.phone}
              </span>
            </div>
          </header>
        </CanvaBoundingBox>

        {/* Bio / Summary */}
        <CanvaBoundingBox
          id="summary"
          label="Bio / Terminal Output"
          isSelected={selectedElementId === 'summary'}
          onSelect={onSelectElement}
        >
          <section className="mb-5 bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
            <div className="text-[11px] font-mono text-cyan-700 font-bold mb-1 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5" />
              <span>// ABOUT_ME.MD</span>
            </div>
            <div className="text-[11px] leading-relaxed text-slate-700">
              <EditableInlineText
                value={summary}
                onChange={updateSummary}
                multiline
                placeholder="Tóm tắt kỹ năng lập trình, kinh nghiệm xây dựng hệ thống..."
              />
            </div>
          </section>
        </CanvaBoundingBox>

        {/* Tech Stack Matrix */}
        <CanvaBoundingBox
          id="skills"
          label="Tech Stack Matrix"
          isSelected={selectedElementId === 'skills'}
          onSelect={onSelectElement}
        >
          <section className="mb-5 bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
            <div className="text-[11px] font-mono text-cyan-700 font-bold mb-2 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              <span>// TECH_STACK_MATRIX</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <span
                  key={s.id}
                  className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300 font-medium"
                >
                  <span className="text-cyan-600 font-bold">#</span>{s.name}
                </span>
              ))}
            </div>
          </section>
        </CanvaBoundingBox>

        {/* Experience Log */}
        <CanvaBoundingBox
          id="experience"
          label="Git Commit History / Work"
          isSelected={selectedElementId === 'experience'}
          onSelect={onSelectElement}
        >
          <section className="mb-5 space-y-3">
            <div className="text-[11px] font-mono text-slate-900 font-bold flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <GitBranch className="w-3.5 h-3.5 text-cyan-600" />
              <span>git log --pretty=fuller --experience</span>
            </div>

            <div className="space-y-3 pl-2 border-l-2 border-cyan-500">
              {experience.map((exp) => (
                <div key={exp.id} className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <div className="font-mono text-xs font-bold text-slate-900">
                      <EditableInlineText
                        value={exp.position}
                        onChange={(v) => updateExp(exp.id, 'position', v)}
                        placeholder="Vị trí Tech"
                      />
                    </div>
                    <span className="font-mono text-[10px] text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200">
                      {exp.startDate} ~ {exp.endDate}
                    </span>
                  </div>

                  <div className="font-mono text-[11px] text-slate-600">
                    <span className="text-slate-400">@ </span>
                    <EditableInlineText
                      value={exp.company}
                      onChange={(v) => updateExp(exp.id, 'company', v)}
                      placeholder="Công ty"
                    />
                    <span className="text-slate-400"> ({exp.location})</span>
                  </div>

                  <div className="text-[10.5px] leading-relaxed text-slate-700 whitespace-pre-line pt-0.5">
                    <EditableInlineText
                      value={exp.description}
                      onChange={(v) => updateExp(exp.id, 'description', v)}
                      multiline
                      placeholder="Mô tả kỹ thuật, commit, kiến trúc xây dựng..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </CanvaBoundingBox>

        {/* Projects / Repositories */}
        {projects && projects.length > 0 && (
          <CanvaBoundingBox
            id="projects"
            label="Open Source & Repos"
            isSelected={selectedElementId === 'projects'}
            onSelect={onSelectElement}
          >
            <section className="space-y-2">
              <div className="text-[11px] font-mono text-slate-900 font-bold flex items-center gap-1.5 border-b border-slate-200 pb-1">
                <FolderGit2 className="w-3.5 h-3.5 text-cyan-600" />
                <span>FEATURED_REPOSITORIES</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {projects.map((p) => (
                  <div key={p.id} className="p-2.5 bg-white rounded border border-slate-200 text-[10.5px] space-y-1">
                    <div className="font-mono font-bold text-slate-900 text-xs text-cyan-700">{p.name}</div>
                    <div className="text-slate-600 line-clamp-2">{p.description}</div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {p.technologies?.map((tech, idx) => (
                        <span key={idx} className="font-mono text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </CanvaBoundingBox>
        )}
      </div>
    </div>
  );
}
