'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Filter } from 'lucide-react';

interface MultiSelectProps {
  title: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  title,
  options,
  selected,
  onChange,
  placeholder = 'Select options...',
  className = '',
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const isAllSelected = options.length > 0 && selected.length === options.length;
  const isNoneSelected = selected.length === 0;

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const handleSelectAll = () => {
    onChange([...options]);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const getLabelText = () => {
    if (isNoneSelected || isAllSelected) {
      return `All ${title}s`;
    }
    if (selected.length === 1) {
      return selected[0];
    }
    return `${selected.length} ${title}s Selected`;
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left w-full ${isOpen ? 'z-50' : 'z-10'} ${className}`}
    >
      <div>
        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
          {title}
        </label>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 hover:border-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-800 shadow-sm"
        >
          <span className="truncate font-semibold flex items-center gap-1.5 text-slate-700">
            <Filter className="h-3 w-3 text-blue-900 shrink-0" />
            {getLabelText()}
          </span>
          <div className="flex items-center gap-1">
            {!isNoneSelected && !isAllSelected && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-900 text-[9px] font-bold text-white">
                {selected.length}
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          </div>
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-64 rounded-xl bg-white border border-slate-200 shadow-2xl z-[100] p-2 space-y-2 text-xs ring-1 ring-slate-900/10">
          {/* Quick Actions */}
          <div className="flex items-center justify-between px-1 pb-1.5 border-b border-slate-100">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[11px] font-bold text-blue-900 hover:text-blue-700"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-900"
            >
              Reset / All
            </button>
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {filteredOptions.length === 0 ? (
              <div className="p-2 text-center text-slate-400 text-[11px]">No options found</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selected.includes(option);
                return (
                  <label
                    key={option}
                    onClick={() => toggleOption(option)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate pr-2">{option}</span>
                    <div
                      className={`h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                        isSelected
                          ? 'bg-blue-900 border-blue-900 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
