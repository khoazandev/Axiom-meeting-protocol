'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

export default function DocSection({
  title,
  children,
  id,
}: {
  title?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <motion.section
      id={id}
      className="mb-10 scroll-mt-24 relative"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {title && (
        <h2 className="text-[20px] sm:text-[22px] font-bold text-slate-900 mb-4 tracking-tight flex items-center gap-2 group">
          <span>{title}</span>
          {id && (
            <a
              href={`#${id}`}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-[#2563EB] text-[18px] font-normal"
              title="Liên kết đến phần này"
            >
              #
            </a>
          )}
        </h2>
      )}
      <div className="text-[14px] sm:text-[15px] text-slate-700 leading-relaxed flex flex-col gap-4 [&>p]:mb-0 [&>ul]:list-disc [&>ul]:ml-5 [&>ul>li]:mb-1.5 [&>ol]:list-decimal [&>ol]:ml-5 [&>ol>li]:mb-1.5 [&_a]:text-[#2563EB] hover:[&_a]:underline [&_strong]:text-slate-900 [&_strong]:font-semibold [&_code]:text-rose-600 [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:font-mono [&_code]:text-[13px] [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:shadow-md [&_pre]:border [&_pre]:border-slate-800 [&_pre>code]:bg-transparent [&_pre>code]:text-inherit [&_pre>code]:p-0 [&_pre>code]:text-[12.5px]">
        {children}
      </div>
    </motion.section>
  );
}
