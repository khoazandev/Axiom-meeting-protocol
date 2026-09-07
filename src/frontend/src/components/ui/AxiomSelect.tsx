'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { MatIcon } from './MatIcon';

export interface AxiomSelectOption<T extends string | number = string> {
  value: T;
  label: string;
  triggerLabel?: string;
  icon?: string;
  badge?: string;
  badgeClass?: string;
  description?: string;
  disabled?: boolean;
}

export interface AxiomSelectProps<T extends string | number = string> {
  value: T;
  onChange: (value: T) => void;
  options: (AxiomSelectOption<T> | string)[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'connected' | 'floating';
  icon?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  align?: 'left' | 'right';
  minWidth?: string;
  width?: string;
  showBadgeOnTrigger?: boolean;
  id?: string;
  title?: string;
  ariaLabel?: string;
}

/**
 * AxiomSelect - Modern Seamless Dropdown Component
 *
 * Features:
 * - Seamless Connected Mode ("liền mạch"): Trigger and dropdown visually merge into a single contiguous shape
 * - Anti-Layout-Shift: Supports fixed width + text truncation so changing data never deforms the UI
 * - Floating Popover Mode
 * - Fully accessible keyboard navigation (Arrows, Enter, Escape, Space)
 * - Click outside detection
 * - Optional inline search for long lists
 * - Supports string or numeric values
 * - Theme-aware (Dark / Light mode support)
 */
export function AxiomSelect<T extends string | number = string>({
  value,
  onChange,
  options,
  placeholder = 'Chọn một mục...',
  className = '',
  triggerClassName = '',
  menuClassName = '',
  size = 'md',
  variant = 'connected',
  icon,
  disabled = false,
  searchable = false,
  searchPlaceholder = 'Tìm kiếm...',
  align = 'left',
  minWidth,
  width,
  showBadgeOnTrigger = false,
  id,
  title,
  ariaLabel,
}: AxiomSelectProps<T>) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  // Normalize options to object format
  const normalizedOptions: AxiomSelectOption<T>[] = React.useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt as unknown as T, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const query = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.description && opt.description.toLowerCase().includes(query)) ||
        String(opt.value).toLowerCase().includes(query)
    );
  }, [normalizedOptions, searchQuery]);

  // Find currently selected option
  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, searchable]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
        const idx = filteredOptions.findIndex((o) => o.value === value);
        setHighlightedIndex(idx >= 0 ? idx : 0);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const target = filteredOptions[highlightedIndex];
          if (!target.disabled) {
            onChange(target.value);
            setIsOpen(false);
            setSearchQuery('');
            setHighlightedIndex(-1);
          }
        }
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
      const items = listboxRef.current.querySelectorAll('li[role="option"]');
      const targetItem = items[highlightedIndex] as HTMLElement;
      if (targetItem) {
        targetItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-[11px] gap-1.5 min-h-[30px]',
    md: 'px-3 py-2 text-xs gap-2 min-h-[36px]',
    lg: 'px-3.5 py-2.5 text-sm gap-2.5 min-h-[42px]',
  }[size];

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  }[size];

  const isConnected = variant === 'connected';

  // Selected display text
  const displayLabel = selectedOption
    ? selectedOption.triggerLabel || selectedOption.label
    : placeholder;

  // Exact fixed width styles to eliminate layout shift completely
  const containerStyle: React.CSSProperties = {
    ...(minWidth ? { minWidth } : {}),
    ...(width ? { width, minWidth: width, maxWidth: width } : {}),
  };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className={`relative inline-block text-left select-none shrink-0 ${className}`}
      onKeyDown={handleKeyDown}
      title={title}
    >
      {/* ── Trigger Button ── */}
      <button
        type="button"
        id={selectId}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            const nextState = !isOpen;
            setIsOpen(nextState);
            if (nextState) {
              const idx = filteredOptions.findIndex((o) => o.value === value);
              setHighlightedIndex(idx >= 0 ? idx : 0);
            } else {
              setSearchQuery('');
            }
          }
        }}
        className={`w-full flex items-center justify-between font-medium cursor-pointer transition-all duration-150 outline-none text-left ${sizeClasses} ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40 text-slate-400 border-slate-200 dark:border-slate-800'
            : isOpen
              ? isConnected
                ? 'rounded-t-xl rounded-b-none bg-white dark:bg-slate-900 border border-blue-500/90 dark:border-blue-500 border-b-transparent ring-2 ring-blue-500/20 text-slate-900 dark:text-white z-40 shadow-sm'
                : 'rounded-xl bg-white dark:bg-slate-900 border border-blue-500 ring-2 ring-blue-500/20 text-slate-900 dark:text-white z-40'
              : 'rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/90 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 truncate flex-1 min-w-0 mr-1.5">
          {/* Prefix Icon */}
          {(icon || selectedOption?.icon) && (
            <MatIcon
              name={selectedOption?.icon || icon || ''}
              size={iconSizes}
              className={`shrink-0 ${
                isOpen ? 'text-blue-500' : 'text-slate-400 dark:text-slate-500'
              }`}
            />
          )}

          {/* Selected Text (Truncated with tooltip) */}
          <span className="truncate font-medium flex-1 min-w-0" title={selectedOption?.label}>
            {displayLabel}
          </span>

          {/* Selected Option Badge if explicitly allowed on trigger */}
          {showBadgeOnTrigger && selectedOption?.badge && (
            <span
              className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                selectedOption.badgeClass ||
                'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
              }`}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>

        {/* Chevron Indicator */}
        <div
          className={`shrink-0 transition-transform duration-200 ease-out flex items-center justify-center ${
            isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : 'text-slate-400'
          }`}
        >
          <ChevronDown size={iconSizes + 1} />
        </div>
      </button>

      {/* ── Dropdown Menu Popup (Liền kề với nút bấm khi variant="connected") ── */}
      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} z-40 w-full min-w-full bg-white dark:bg-slate-900 shadow-2xl shadow-blue-950/15 dark:shadow-black/70 overflow-hidden transition-all duration-150 animate-in fade-in-0 slide-in-from-top-1 ${
            isConnected
              ? 'top-full -mt-[1px] rounded-b-xl rounded-t-none border-x border-b border-blue-500/90 dark:border-blue-500 ring-2 ring-blue-500/20 ring-t-0'
              : 'top-full mt-1.5 rounded-xl border border-slate-200 dark:border-slate-800'
          } ${menuClassName}`}
        >
          {/* Subtle connecting divider for connected mode */}
          {isConnected && <div className="w-full h-[1px] bg-slate-100 dark:bg-slate-800/80" />}

          {/* Optional Search Filter */}
          {searchable && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="relative flex items-center">
                <MatIcon
                  name="search"
                  size={14}
                  className="absolute left-2.5 text-slate-400 pointer-events-none"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full pl-7 pr-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* List of Options */}
          <ul
            ref={listboxRef}
            role="listbox"
            tabIndex={-1}
            aria-activedescendant={
              highlightedIndex >= 0 ? `${selectId}-opt-${highlightedIndex}` : undefined
            }
            className="p-1 max-h-60 overflow-y-auto overflow-x-hidden space-y-0.5 focus:outline-none custom-scrollbar"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-3 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                Không tìm thấy kết quả
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={String(option.value)}
                    id={`${selectId}-opt-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    onClick={() => {
                      if (!option.disabled) {
                        onChange(option.value);
                        setIsOpen(false);
                        setSearchQuery('');
                        setHighlightedIndex(-1);
                      }
                    }}
                    onMouseEnter={() => {
                      if (!option.disabled) {
                        setHighlightedIndex(index);
                      }
                    }}
                    className={`group px-2.5 py-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-all duration-100 ${
                      option.disabled
                        ? 'opacity-40 cursor-not-allowed bg-transparent'
                        : isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-semibold'
                          : isHighlighted
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0 pr-1.5">
                      {option.icon && (
                        <MatIcon
                          name={option.icon}
                          size={15}
                          className={`shrink-0 ${
                            isSelected
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                          }`}
                        />
                      )}
                      <div className="truncate">
                        <div className="truncate">{option.label}</div>
                        {option.description && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate mt-0.5">
                            {option.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {option.badge && (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                            option.badgeClass ||
                            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {option.badge}
                        </span>
                      )}
                      {isSelected && (
                        <Check
                          size={14}
                          className="text-blue-600 dark:text-blue-400 stroke-[2.5]"
                        />
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default AxiomSelect;
