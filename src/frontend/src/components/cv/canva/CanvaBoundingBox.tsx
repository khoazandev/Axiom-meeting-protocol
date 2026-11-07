'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Copy,
  Trash2,
  Move,
  RotateCcw,
} from 'lucide-react';

interface CanvaBoundingBoxProps {
  id: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onAIPolish?: () => void;
  children: React.ReactNode;
  label?: string;
  draggable?: boolean;
  resizable?: boolean;
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
  onDragEnd?: (pos: { x: number; y: number }) => void;
  onResizeEnd?: (size: { width: number; height: number }) => void;
}

export function CanvaBoundingBox({
  id,
  isSelected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDelete,
  onDuplicate,
  onAIPolish,
  children,
  label,
  draggable = true,
  resizable = true,
  initialX = 0,
  initialY = 0,
  initialWidth,
  initialHeight,
  onDragEnd,
  onResizeEnd,
}: CanvaBoundingBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Position offset (delta X, delta Y)
  const [offset, setOffset] = useState<{ x: number; y: number }>({
    x: initialX,
    y: initialY,
  });

  // Custom size override (from drag resizing)
  const [customSize, setCustomSize] = useState<{ width?: number; height?: number }>({
    width: initialWidth,
    height: initialHeight,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);

  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
    left: number;
    top: number;
  }>({
    width: 0,
    height: 0,
    left: 0,
    top: 0,
  });

  // Dynamically compute the canvas CSS scale factor so mouse movement 1:1 tracks the element
  const getCanvasScale = useCallback((): number => {
    if (!containerRef.current) return 1;
    let el: HTMLElement | null = containerRef.current.parentElement;
    while (el) {
      const style = window.getComputedStyle(el);
      const transform = style.transform;
      if (transform && transform !== 'none') {
        const match = transform.match(/^matrix\((.+)\)$/);
        if (match) {
          const values = match[1].split(', ');
          const scaleX = parseFloat(values[0]);
          if (!isNaN(scaleX) && scaleX > 0) return scaleX;
        }
      }
      el = el.parentElement;
    }
    return 1;
  }, []);

  // Measure bounding dimensions
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const parent = containerRef.current.parentElement?.getBoundingClientRect();
      const scale = getCanvasScale();
      setDimensions({
        width: Math.round(rect.width / scale),
        height: Math.round(rect.height / scale),
        left: parent
          ? Math.round((rect.left - parent.left) / scale)
          : Math.round(rect.left / scale),
        top: parent ? Math.round((rect.top - parent.top) / scale) : Math.round(rect.top / scale),
      });
    }
  }, [isSelected, children, offset, customSize, getCanvasScale]);

  // Click on box selects it
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(id);
  };

  // Reset position & sizing
  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOffset({ x: 0, y: 0 });
    setCustomSize({});
    onDragEnd?.({ x: 0, y: 0 });
  };

  // ── 1. MOUSE DRAG LOGIC (Translates the element freely across the canvas) ──
  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      if (!draggable || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      onSelect(id);

      const scale = getCanvasScale();
      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startOffsetX = offset.x;
      const startOffsetY = offset.y;

      setIsDragging(true);

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = (moveEvent.clientX - startMouseX) / scale;
        const deltaY = (moveEvent.clientY - startMouseY) / scale;
        setOffset({
          x: Math.round(startOffsetX + deltaX),
          y: Math.round(startOffsetY + deltaY),
        });
      };

      const onMouseUp = (upEvent: MouseEvent) => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        setIsDragging(false);

        const finalDeltaX = (upEvent.clientX - startMouseX) / scale;
        const finalDeltaY = (upEvent.clientY - startMouseY) / scale;
        const finalPos = {
          x: Math.round(startOffsetX + finalDeltaX),
          y: Math.round(startOffsetY + finalDeltaY),
        };
        onDragEnd?.(finalPos);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [draggable, id, offset, onSelect, getCanvasScale, onDragEnd]
  );

  // ── 2. MOUSE RESIZE LOGIC (8 handles: 4 corners + 4 edges) ────────────────
  const startResize = useCallback(
    (e: React.MouseEvent, handle: string) => {
      if (!resizable || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      onSelect(id);

      const scale = getCanvasScale();
      const startMouseX = e.clientX;
      const startMouseY = e.clientY;

      const currentRect = containerRef.current?.getBoundingClientRect();
      const startWidth =
        customSize.width || (currentRect ? Math.round(currentRect.width / scale) : 200);
      const startHeight =
        customSize.height || (currentRect ? Math.round(currentRect.height / scale) : 100);
      const startOffsetX = offset.x;
      const startOffsetY = offset.y;

      setIsResizing(true);
      setActiveHandle(handle);

      let finalWidth = startWidth;
      let finalHeight = startHeight;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = (moveEvent.clientX - startMouseX) / scale;
        const deltaY = (moveEvent.clientY - startMouseY) / scale;

        let newW = startWidth;
        let newH = startHeight;
        let newOX = startOffsetX;
        let newOY = startOffsetY;

        // Horizontal sizing
        if (handle.includes('e')) {
          newW = Math.max(60, Math.round(startWidth + deltaX));
        } else if (handle.includes('w')) {
          const clamped = Math.max(60, Math.round(startWidth - deltaX));
          newOX = Math.round(startOffsetX + (startWidth - clamped));
          newW = clamped;
        }

        // Vertical sizing
        if (handle.includes('s')) {
          newH = Math.max(25, Math.round(startHeight + deltaY));
        } else if (handle.includes('n')) {
          const clamped = Math.max(25, Math.round(startHeight - deltaY));
          newOY = Math.round(startOffsetY + (startHeight - clamped));
          newH = clamped;
        }

        finalWidth = newW;
        finalHeight = newH;

        setCustomSize({ width: newW, height: newH });
        setOffset({ x: newOX, y: newOY });
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        setIsResizing(false);
        setActiveHandle(null);
        onResizeEnd?.({ width: finalWidth, height: finalHeight });
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [resizable, id, customSize, offset, onSelect, getCanvasScale, onResizeEnd]
  );

  // ── 3. KEYBOARD NUDGING (Arrow keys move element 1px, or 10px with Shift) ──
  useEffect(() => {
    if (!isSelected) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing inside an editable field
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          (active as HTMLElement).isContentEditable)
      ) {
        return;
      }

      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setOffset((prev) => ({ ...prev, x: prev.x - step }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setOffset((prev) => ({ ...prev, x: prev.x + step }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setOffset((prev) => ({ ...prev, y: prev.y - step }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setOffset((prev) => ({ ...prev, y: prev.y + step }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelected]);

  // ── 4. CANVA POSITION MODAL LISTENER (Căn lề từ modal vị trí) ─────────────
  useEffect(() => {
    const handleAlignEvent = (e: any) => {
      if (e.detail?.id === id) {
        const align = e.detail.align;
        if (align === 'center') {
          setOffset((prev) => ({ ...prev, x: 0 }));
        } else if (align === 'left') {
          setOffset((prev) => ({ ...prev, x: -dimensions.left + 24 }));
        } else if (align === 'right') {
          const parentW = containerRef.current?.parentElement?.clientWidth || 794;
          const targetX = parentW - dimensions.left - dimensions.width - 24;
          setOffset((prev) => ({ ...prev, x: targetX }));
        }
      }
    };

    window.addEventListener('canva-align-element', handleAlignEvent);
    return () => window.removeEventListener('canva-align-element', handleAlignEvent);
  }, [id, dimensions]);

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        width: customSize.width ? `${customSize.width}px` : undefined,
        height: customSize.height ? `${customSize.height}px` : undefined,
        touchAction: 'none',
      }}
      className={`relative group select-none transition-shadow ${
        isSelected
          ? 'ring-2 ring-indigo-600 bg-indigo-500/5 z-20 rounded-xs'
          : 'hover:ring-1 hover:ring-indigo-400/50'
      } ${isDragging ? 'opacity-90 shadow-2xl cursor-grabbing' : ''}`}
    >
      {/* ── CANVA SMART GUIDES (Magenta center alignment lines across canvas) ── */}
      {(isSelected || isDragging) && (
        <>
          <div className="absolute -left-[500px] -right-[500px] top-1/2 h-[1px] border-b border-dashed border-indigo-400/60 pointer-events-none z-10" />
          <div className="absolute -top-[500px] -bottom-[500px] left-1/2 w-[1px] border-r border-dashed border-indigo-400/60 pointer-events-none z-10" />
        </>
      )}

      {/* ── 4 PERIMETER DRAG BORDERS (Click and drag any border to move) ─── */}
      {isSelected && draggable && (
        <>
          <div
            onMouseDown={startDrag}
            className="absolute -top-1 left-3 right-3 h-2 cursor-move z-20 hover:bg-indigo-500/20 transition-colors"
            title="Nắm kéo để di chuyển vị trí"
          />
          <div
            onMouseDown={startDrag}
            className="absolute -bottom-1 left-3 right-3 h-2 cursor-move z-20 hover:bg-indigo-500/20 transition-colors"
            title="Nắm kéo để di chuyển vị trí"
          />
          <div
            onMouseDown={startDrag}
            className="absolute top-3 bottom-3 -left-1 w-2 cursor-move z-20 hover:bg-indigo-500/20 transition-colors"
            title="Nắm kéo để di chuyển vị trí"
          />
          <div
            onMouseDown={startDrag}
            className="absolute top-3 bottom-3 -right-1 w-2 cursor-move z-20 hover:bg-indigo-500/20 transition-colors"
            title="Nắm kéo để di chuyển vị trí"
          />
        </>
      )}

      {/* ── 8 CANVA SELECTION HANDLES ────────────────────────────────────── */}
      {isSelected && resizable && (
        <>
          {/* 4 Corner Round Handles */}
          <div
            onMouseDown={(e) => startResize(e, 'nw')}
            className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full shadow-md z-20 cursor-nwse-resize hover:scale-125 transition-transform"
            title="Kéo co giãn góc trên - trái"
          />
          <div
            onMouseDown={(e) => startResize(e, 'ne')}
            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full shadow-md z-20 cursor-nesw-resize hover:scale-125 transition-transform"
            title="Kéo co giãn góc trên - phải"
          />
          <div
            onMouseDown={(e) => startResize(e, 'sw')}
            className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full shadow-md z-20 cursor-nesw-resize hover:scale-125 transition-transform"
            title="Kéo co giãn góc dưới - trái"
          />
          <div
            onMouseDown={(e) => startResize(e, 'se')}
            className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full shadow-md z-20 cursor-nwse-resize hover:scale-125 transition-transform"
            title="Kéo co giãn góc dưới - phải"
          />

          {/* 4 Edge Pill Handles */}
          <div
            onMouseDown={(e) => startResize(e, 'w')}
            className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-5 bg-white border border-indigo-600 rounded-full shadow-xs z-20 cursor-ew-resize hover:scale-125 transition-transform"
            title="Kéo co giãn bề rộng trái"
          />
          <div
            onMouseDown={(e) => startResize(e, 'e')}
            className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-5 bg-white border border-indigo-600 rounded-full shadow-xs z-20 cursor-ew-resize hover:scale-125 transition-transform"
            title="Kéo co giãn bề rộng phải"
          />
          <div
            onMouseDown={(e) => startResize(e, 'n')}
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-1.5 bg-white border border-indigo-600 rounded-full shadow-xs z-20 cursor-ns-resize hover:scale-125 transition-transform"
            title="Kéo co giãn chiều cao trên"
          />
          <div
            onMouseDown={(e) => startResize(e, 's')}
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-1.5 bg-white border border-indigo-600 rounded-full shadow-xs z-20 cursor-ns-resize hover:scale-125 transition-transform"
            title="Kéo co giãn chiều cao dưới"
          />
        </>
      )}

      {/* ── FLOATING TOP ACTION TOOLBAR (Canva Pill Bar with Drag Handle - Clean Light Theme) ─── */}
      {isSelected && (
        <>
          <div
            className="absolute -top-11 left-1/2 -translate-x-1/2 z-20 bg-white text-slate-800 rounded-full px-2.5 py-1 shadow-xl flex items-center gap-1.5 text-[11px] font-semibold border border-slate-200 animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Primary Drag Pill: Grab here to move freely */}
            {draggable && (
              <div
                onMouseDown={startDrag}
                className="px-2 py-0.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 cursor-grab active:cursor-grabbing text-[10px] font-bold shadow-xs transition-colors"
                title="Nắm và kéo để di chuyển vị trí tự do (X, Y)"
              >
                <Move className="w-3 h-3" />
                <span>Kéo di chuyển</span>
              </div>
            )}

            {label && (
              <span className="text-[10px] uppercase font-bold text-indigo-600 px-1 border-r border-slate-200 truncate max-w-[110px]">
                {label}
              </span>
            )}

            {/* Reset Button if element has been dragged or resized */}
            {(offset.x !== 0 || offset.y !== 0 || customSize.width || customSize.height) && (
              <button
                type="button"
                onClick={handleReset}
                className="px-1.5 py-0.5 hover:bg-amber-50 rounded-full text-amber-600 cursor-pointer flex items-center gap-0.5 text-[10px]"
                title="Đặt lại vị trí & kích thước ban đầu"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Vị trí gốc</span>
              </button>
            )}

            {onMoveUp && (
              <button
                type="button"
                onClick={onMoveUp}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-600 hover:text-slate-900 cursor-pointer"
                title="Đưa lên trên 1 mục"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            )}

            {onMoveDown && (
              <button
                type="button"
                onClick={onMoveDown}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-600 hover:text-slate-900 cursor-pointer"
                title="Đưa xuống dưới 1 mục"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            )}

            {onAIPolish && (
              <button
                type="button"
                onClick={onAIPolish}
                className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#00c4cc] to-[#7d2ae8] text-white hover:opacity-90 flex items-center gap-1 cursor-pointer text-[10px] font-bold shadow-xs"
                title="Canva Magic Write: AI Nâng cấp câu chữ chuẩn STAR & ATS"
              >
                <Sparkles className="w-3 h-3 text-amber-200" />
                <span>Magic</span>
              </button>
            )}

            {onDuplicate && (
              <button
                type="button"
                onClick={onDuplicate}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-600 hover:text-slate-900 cursor-pointer"
                title="Nhân bản khối này"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="p-1 hover:bg-rose-50 rounded-full text-rose-500 hover:text-rose-600 cursor-pointer"
                title="Xóa khối này"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* ── BOTTOM POSITION & DIMENSIONS BADGE (Clean Light Theme) ───── */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-30 bg-white text-slate-700 border border-slate-200 text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full shadow-md whitespace-nowrap pointer-events-none flex items-center gap-2">
            <span className="text-[#7d2ae8] font-bold">
              W: {customSize.width || dimensions.width}px × H:{' '}
              {customSize.height || dimensions.height}px
            </span>
            <span className="text-slate-300">|</span>
            <span
              className={
                offset.x !== 0 || offset.y !== 0 ? 'text-amber-600 font-bold' : 'text-slate-500'
              }
            >
              X: {dimensions.left + offset.x} (Δ{offset.x >= 0 ? `+${offset.x}` : offset.x}) Y:{' '}
              {dimensions.top + offset.y} (Δ{offset.y >= 0 ? `+${offset.y}` : offset.y})
            </span>
          </div>
        </>
      )}

      {/* ── ACTUAL INNER CONTENT ─────────────────────────────────────────── */}
      <div className="w-full">{children}</div>
    </div>
  );
}
