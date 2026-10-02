'use client';

import React from 'react';
import { CVData, CVSection } from '@/types/cv';
import { Mail, Phone, MapPin, Globe, ExternalLink } from 'lucide-react';
import { CanvaBoundingBox } from './canva/CanvaBoundingBox';
import { EditableInlineText } from './canva/EditableInlineText';

interface CVTemplateProps {
  data: CVData;
  onUpdate?: (data: CVData) => void;
  selectedElementId?: string | null;
  onSelectElement?: (id: string) => void;
}

export function CVHarvardTemplate({
  data,
  onUpdate,
  selectedElementId,
  onSelectElement,
}: CVTemplateProps) {
  const {
    personalInfo,
    summary,
    experience = [],
    education = [],
    skills = [],
    projects = [],
    certifications = [],
    languages = [],
    sectionOrder = [],
  } = data;

  const updatePersonalInfo = (field: string, val: string) => {
    if (!onUpdate) return;
    onUpdate({ ...data, personalInfo: { ...data.personalInfo, [field]: val } });
  };

  const updateSummary = (val: string) => {
    if (!onUpdate) return;
    onUpdate({ ...data, summary: val });
  };

  const moveSectionInTemplate = (secKey: CVSection, direction: 'up' | 'down') => {
    if (!onUpdate) return;
    const currentOrder = [...orderedSections];
    const idx = currentOrder.indexOf(secKey);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentOrder.length) return;
    const temp = currentOrder[idx];
    currentOrder[idx] = currentOrder[targetIdx];
    currentOrder[targetIdx] = temp;
    onUpdate({ ...data, sectionOrder: currentOrder });
  };

  const wrapBoundingBox = (secKey: CVSection, label: string, content: React.ReactNode) => {
    if (!onUpdate) return content;
    return (
      <CanvaBoundingBox
        key={secKey}
        id={secKey}
        label={label}
        isSelected={selectedElementId === secKey}
        onSelect={onSelectElement || (() => {})}
        onMoveUp={() => moveSectionInTemplate(secKey, 'up')}
        onMoveDown={() => moveSectionInTemplate(secKey, 'down')}
      >
        {content}
      </CanvaBoundingBox>
    );
  };

  const renderSection = (sectionKey: CVSection) => {
    switch (sectionKey) {
      case 'summary':
        if (!summary && !onUpdate) return null;
        return wrapBoundingBox(
          'summary',
          'Tóm Tắt Hồ Sơ',
          <section key="summary" className="mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-900 pb-0.5 mb-2">
              Tóm Tắt Chuyên Nghiệp / Professional Summary
            </h2>
            <div className="text-[11px] leading-relaxed text-neutral-800 text-justify font-serif">
              {onUpdate ? (
                <EditableInlineText
                  value={summary || ''}
                  onChange={updateSummary}
                  multiline
                  placeholder="Nhấp đúp chuột để nhập tóm tắt mục tiêu nghề nghiệp..."
                />
              ) : (
                summary
              )}
            </div>
          </section>
        );

      case 'experience':
        if (experience.length === 0 && !onUpdate) return null;
        return wrapBoundingBox(
          'experience',
          'Kinh Nghiệm Làm Việc',
          <section key="experience" className="mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-900 pb-0.5 mb-2.5">
              Kinh Nghiệm Làm Việc / Professional Experience
            </h2>
            <div className="space-y-3">
              {experience.map((exp) => (
                <div key={exp.id} className="text-[11px] font-serif">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-neutral-950 font-sans text-xs">
                      {exp.company}
                    </span>
                    <span className="text-[10px] text-neutral-600 font-sans font-medium">
                      {exp.startDate} – {exp.isCurrent ? 'Hiện tại' : exp.endDate}
                      {exp.location ? ` | ${exp.location}` : ''}
                    </span>
                  </div>
                  <div className="italic text-neutral-700 font-medium mb-1">{exp.position}</div>
                  {exp.description && (
                    <div className="text-neutral-800 leading-relaxed whitespace-pre-line pl-1 space-y-0.5">
                      {exp.description.split('\n').map((line, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="text-neutral-500 shrink-0">•</span>
                          <span>{line.replace(/^•\s*/, '')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );

      case 'projects':
        if (projects.length === 0 && !onUpdate) return null;
        return wrapBoundingBox(
          'projects',
          'Dự Án Nổi Bật',
          <section key="projects" className="mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-900 pb-0.5 mb-2.5">
              Dự Án Nổi Bật / Key Projects
            </h2>
            <div className="space-y-2.5">
              {projects.map((proj) => (
                <div key={proj.id} className="text-[11px] font-serif">
                  <div className="flex justify-between items-baseline">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-neutral-950 font-sans text-xs">
                        {proj.name}
                      </span>
                      {proj.role && <span className="text-neutral-600 italic">({proj.role})</span>}
                    </div>
                    {proj.startDate && (
                      <span className="text-[10px] text-neutral-600 font-sans">
                        {proj.startDate} – {proj.endDate || 'Hiện tại'}
                      </span>
                    )}
                  </div>
                  <p className="text-neutral-800 leading-relaxed mt-0.5 pl-1">{proj.description}</p>
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="text-[10px] text-neutral-600 mt-0.5 pl-1 font-sans">
                      <span className="font-semibold text-neutral-800">Công nghệ:</span>{' '}
                      {proj.technologies.join(', ')}
                      {proj.link && (
                        <span className="ml-2 text-blue-700 underline inline-flex items-center gap-0.5">
                          {proj.link}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );

      case 'education':
        if (education.length === 0 && !onUpdate) return null;
        return wrapBoundingBox(
          'education',
          'Học Vấn & Bằng Cấp',
          <section key="education" className="mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-900 pb-0.5 mb-2">
              Học Vấn & Bằng Cấp / Education
            </h2>
            <div className="space-y-2">
              {education.map((edu) => (
                <div key={edu.id} className="text-[11px] font-serif">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-neutral-950 font-sans text-xs">
                      {edu.school}
                    </span>
                    <span className="text-[10px] text-neutral-600 font-sans font-medium">
                      {edu.startDate} – {edu.endDate}
                    </span>
                  </div>
                  <div className="italic text-neutral-800">
                    {edu.degree} – {edu.field}
                  </div>
                  {edu.description && (
                    <p className="text-neutral-700 text-[10.5px] mt-0.5 pl-1">{edu.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        );

      case 'skills':
        if (skills.length === 0 && !onUpdate) return null;
        const techSkills = skills.filter((s) => s.category === 'technical');
        const softSkills = skills.filter((s) => s.category === 'soft');
        return wrapBoundingBox(
          'skills',
          'Kỹ Năng Chuyên Môn',
          <section key="skills" className="mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-900 pb-0.5 mb-2">
              Kỹ Năng / Technical & Leadership Skills
            </h2>
            <div className="text-[11px] font-serif space-y-1">
              {techSkills.length > 0 && (
                <div>
                  <span className="font-bold font-sans text-neutral-900">
                    Kỹ thuật & Công nghệ:
                  </span>{' '}
                  <span className="text-neutral-800">
                    {techSkills.map((s) => s.name).join(' • ')}
                  </span>
                </div>
              )}
              {softSkills.length > 0 && (
                <div>
                  <span className="font-bold font-sans text-neutral-900">
                    Quản lý & Kỹ năng mềm:
                  </span>{' '}
                  <span className="text-neutral-800">
                    {softSkills.map((s) => s.name).join(' • ')}
                  </span>
                </div>
              )}
            </div>
          </section>
        );

      case 'certifications':
        if (certifications.length === 0 && !onUpdate) return null;
        return wrapBoundingBox(
          'certifications',
          'Chứng Chỉ Nghề Nghiệp',
          <section key="certifications" className="mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-900 pb-0.5 mb-2">
              Chứng Chỉ Nghề Nghiệp / Certifications
            </h2>
            <div className="text-[11px] font-serif space-y-1">
              {certifications.map((c) => (
                <div key={c.id} className="flex justify-between items-baseline">
                  <span>
                    <strong className="font-sans font-semibold text-neutral-900">{c.name}</strong> –{' '}
                    {c.issuer}
                  </span>
                  <span className="text-[10px] text-neutral-600 font-sans">{c.date}</span>
                </div>
              ))}
            </div>
          </section>
        );

      case 'languages':
        if (languages.length === 0 && !onUpdate) return null;
        return wrapBoundingBox(
          'languages',
          'Ngoại Ngữ',
          <section key="languages" className="mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-900 pb-0.5 mb-1.5">
              Ngoại Ngữ / Languages
            </h2>
            <div className="text-[11px] font-serif flex flex-wrap gap-x-4 gap-y-1 text-neutral-800">
              {languages.map((l) => (
                <div key={l.id}>
                  <strong className="font-sans font-semibold text-neutral-900">{l.name}:</strong>{' '}
                  {l.level}
                </div>
              ))}
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  const orderedSections =
    sectionOrder && sectionOrder.length > 0
      ? sectionOrder
      : ([
          'summary',
          'experience',
          'projects',
          'education',
          'skills',
          'certifications',
          'languages',
        ] as CVSection[]);

  const headerNode = (
    <header className="text-center border-b-2 border-neutral-900 pb-3 mb-4">
      <h1 className="text-2xl font-black uppercase tracking-wider text-neutral-950 font-serif mb-1">
        {onUpdate ? (
          <EditableInlineText
            value={personalInfo.fullName || 'HỌ VÀ TÊN'}
            onChange={(v) => updatePersonalInfo('fullName', v)}
            placeholder="Nhấp đúp nhập Họ và Tên..."
          />
        ) : (
          personalInfo.fullName || 'HỌ VÀ TÊN'
        )}
      </h1>
      <div className="text-xs font-semibold tracking-widest text-neutral-700 uppercase font-sans mb-2">
        {onUpdate ? (
          <EditableInlineText
            value={personalInfo.title || 'CHỨC DANH NGHỀ NGHIỆP'}
            onChange={(v) => updatePersonalInfo('title', v)}
            placeholder="Nhấp đúp nhập chức danh..."
          />
        ) : (
          personalInfo.title
        )}
      </div>

      {/* Contact Links Bar */}
      <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1 text-[11px] text-neutral-700 font-sans">
        {personalInfo.location && <span>{personalInfo.location}</span>}
        {personalInfo.phone && (
          <>
            <span className="text-neutral-400">•</span>
            <span>{personalInfo.phone}</span>
          </>
        )}
        {personalInfo.email && (
          <>
            <span className="text-neutral-400">•</span>
            <a href={`mailto:${personalInfo.email}`} className="text-neutral-900 hover:underline">
              {personalInfo.email}
            </a>
          </>
        )}
        {personalInfo.socials?.map((social) => (
          <React.Fragment key={social.id}>
            <span className="text-neutral-400">•</span>
            <span className="hover:underline font-medium text-neutral-800">{social.url}</span>
          </React.Fragment>
        ))}
      </div>
    </header>
  );

  return (
    <div
      className="cv-paper-sheet bg-white text-neutral-900 w-[210mm] min-h-[297mm] p-10 mx-auto shadow-xl print:shadow-none print:p-8 print:w-full print:m-0 selection:bg-neutral-200"
      style={{ boxSizing: 'border-box' }}
    >
      {/* Harvard Ivy League Header */}
      {onUpdate ? (
        <CanvaBoundingBox
          id="header"
          label="Thông Tin Cá Nhân"
          isSelected={selectedElementId === 'header'}
          onSelect={onSelectElement || (() => {})}
        >
          {headerNode}
        </CanvaBoundingBox>
      ) : (
        headerNode
      )}

      {/* Body Sections Ordered by user preference */}
      <div className="space-y-1">
        {orderedSections.filter((sec) => sec !== 'personal').map((secKey) => renderSection(secKey))}
      </div>
    </div>
  );
}
