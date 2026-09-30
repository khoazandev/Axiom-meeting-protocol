'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface EditableInlineTextProps {
  value: string;
  onChange: (val: string) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
}

export function EditableInlineText({
  value,
  onChange,
  multiline = false,
  className = '',
  placeholder = 'Nhấp đúp để chỉnh sửa…',
  as = 'span',
}: EditableInlineTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const textRef = useRef<HTMLElement>(null);
  const isComposingRef = useRef(false);
  const latestValueRef = useRef(value);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setTimeout(() => {
      if (textRef.current) {
        textRef.current.focus();
        // Select all text on start
        const range = document.createRange();
        range.selectNodeContents(textRef.current);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 50);
  };

  const commitChange = () => {
    setIsEditing(false);
    if (textRef.current) {
      const newText = textRef.current.innerText.trim();
      if (newText !== latestValueRef.current) {
        onChange(newText || placeholder);
      }
    }
  };

  const handleBlur = () => {
    if (!isComposingRef.current) {
      commitChange();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      commitChange();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      if (textRef.current) {
        textRef.current.innerText = latestValueRef.current;
      }
    }
  };

  const Tag = as as any;

  return (
    <Tag
      ref={textRef}
      onDoubleClick={handleDoubleClick}
      contentEditable={isEditing}
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onCompositionStart={() => {
        isComposingRef.current = true;
      }}
      onCompositionEnd={() => {
        isComposingRef.current = false;
      }}
      className={`transition-all duration-150 relative group ${
        isEditing
          ? 'outline-2 outline-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 rounded px-1 min-w-[20px] inline-block shadow-xs'
          : 'hover:outline-1 hover:outline-dashed hover:outline-indigo-400/70 hover:bg-indigo-50/20 cursor-text'
      } ${className}`}
      title={isEditing ? 'Nhấn Enter hoặc click ra ngoài để lưu' : 'Nhấp đúp chuột để sửa trực tiếp (Canva Style)'}
    >
      {value || placeholder}
    </Tag>
  );
}
