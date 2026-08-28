'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';

interface DateTimePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  align?: 'left' | 'right';
}

export function CustomDateTimePicker({ value, onChange, placeholder = "Chọn hạn chót", align = "right" }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial value or default to now
  const initialDate = value ? new Date(value) : new Date();
  
  const [viewDate, setViewDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? initialDate : null);
  
  // Time states (HH and MM)
  const [hours, setHours] = useState(value ? initialDate.getHours().toString().padStart(2, '0') : "12");
  const [minutes, setMinutes] = useState(value ? initialDate.getMinutes().toString().padStart(2, '0') : "00");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setSelectedDate(d);
      setViewDate(d);
      setHours(d.getHours().toString().padStart(2, '0'));
      setMinutes(d.getMinutes().toString().padStart(2, '0'));
    }
  }, [value]);

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  
  // Adjust so Monday is 0, Sunday is 6
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    setSelectedDate(newDate);
  };

  const handleConfirm = () => {
    if (!selectedDate) return;
    const finalDate = new Date(selectedDate);
    finalDate.setHours(parseInt(hours, 10));
    finalDate.setMinutes(parseInt(minutes, 10));
    
    // Adjust for local timezone offset to save proper local string if needed, 
    // but usually standard ISO is better. The standard input expects YYYY-MM-DDThh:mm
    const tzOffset = finalDate.getTimezoneOffset() * 60000;
    const localIsoStr = new Date(finalDate.getTime() - tzOffset).toISOString().slice(0, 16);
    
    onChange(localIsoStr);
    setIsOpen(false);
  };

  // Generate calendar days
  const calendarDays = [];
  for (let i = 0; i < startOffset; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === viewDate.getMonth() && selectedDate?.getFullYear() === viewDate.getFullYear();
    const isToday = new Date().getDate() === day && new Date().getMonth() === viewDate.getMonth() && new Date().getFullYear() === viewDate.getFullYear();
    
    calendarDays.push(
      <button
        key={`day-${day}`}
        onClick={() => handleDayClick(day)}
        className={`w-8 h-8 flex items-center justify-center rounded-full text-xs transition-colors
          ${isSelected ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 
            isToday ? 'border border-primary text-primary font-medium' : 
            'hover:bg-muted text-foreground'
          }`}
      >
        {day}
      </button>
    );
  }

  // Format display text
  let displayText = placeholder;
  if (value) {
    try {
      const d = new Date(value);
      displayText = d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch(e) {}
  }

  return (
    <div className="relative flex-1" ref={containerRef}>
      {/* Trigger */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-xs p-2 bg-background border border-border rounded-md cursor-pointer hover:border-primary transition-colors shadow-sm text-foreground"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>{displayText}</span>
        <CalendarIcon className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Popover */}
      {isOpen && (
        <div className={`absolute top-full ${align === 'left' ? 'left-0' : 'right-0'} mt-1 w-[280px] bg-card border border-border rounded-xl shadow-2xl z-50 p-3 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-100`}>
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <button onClick={handlePrevMonth} className="p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="font-semibold text-sm text-foreground">
              Tháng {viewDate.getMonth() + 1}, {viewDate.getFullYear()}
            </div>
            <button onClick={handleNextMonth} className="p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground mb-1">
            <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div>CN</div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 place-items-center">
            {calendarDays}
          </div>

          <div className="h-px bg-border/50 my-1"></div>

          {/* Time Picker */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>Thời gian:</span>
            </div>
            <div className="flex items-center gap-1">
              <select 
                value={hours} 
                onChange={(e) => setHours(e.target.value)}
                className="bg-muted border border-border rounded p-1 text-xs focus:outline-primary font-medium text-foreground cursor-pointer"
              >
                {Array.from({length: 24}).map((_, i) => (
                  <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                ))}
              </select>
              <span className="font-bold text-muted-foreground">:</span>
              <select 
                value={minutes} 
                onChange={(e) => setMinutes(e.target.value)}
                className="bg-muted border border-border rounded p-1 text-xs focus:outline-primary font-medium text-foreground cursor-pointer"
              >
                {Array.from({length: 60}).map((_, i) => (
                  <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 mt-1">
            <button 
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-md transition-colors"
            >
              Hủy
            </button>
            <button 
              onClick={handleConfirm}
              className="px-3 py-1.5 text-xs bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors shadow-sm"
            >
              Xác nhận
            </button>
          </div>
          
        </div>
      )}
    </div>
  );
}
