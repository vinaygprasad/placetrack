'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { maskPan, maskAadhar } from '@/lib/utils';

interface SensitiveFieldProps {
  type: 'pan' | 'aadhar';
  value?: string | null;
  mode?: 'view' | 'edit';
  onChange?: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
}

export function SensitiveField({
  type,
  value = '',
  mode = 'view',
  onChange,
  placeholder = 'Apply immediately if not having',
  disabled = false,
  className = '',
  inputClassName = '',
}: SensitiveFieldProps) {
  const [showActual, setShowActual] = useState(false);

  const rawValue = value || '';
  const getMaskedValue = () => {
    if (!rawValue) return '—';
    return type === 'pan' ? maskPan(rawValue) : maskAadhar(rawValue);
  };

  const toggleVisibility = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowActual((prev) => !prev);
  };

  if (mode === 'view') {
    if (!rawValue) {
      return <span className={`text-slate-400 italic font-normal ${className}`}>—</span>;
    }

    const displayText = showActual ? rawValue : getMaskedValue();

    return (
      <div className={`inline-flex items-center gap-2 group ${className}`}>
        <span className="font-bold font-mono text-slate-900 tracking-wide select-all">
          {displayText}
        </span>
        <button
          type="button"
          onClick={toggleVisibility}
          title={showActual ? 'Hide actual number' : 'Show actual number'}
          aria-label={showActual ? 'Hide actual number' : 'Show actual number'}
          className="p-1 rounded-md text-slate-400 hover:text-[#1e3a8a] hover:bg-slate-100 transition-colors shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-800"
        >
          {showActual ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
    );
  }

  // Edit mode with embedded eye icon toggle inside input
  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Input
        type={showActual ? 'text' : 'password'}
        value={rawValue}
        onChange={(e) => {
          let val = e.target.value;
          if (type === 'pan') {
            val = val.toUpperCase();
          }
          if (onChange) {
            onChange(val);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={`pr-10 font-mono ${inputClassName}`}
      />
      {rawValue && (
        <button
          type="button"
          onClick={toggleVisibility}
          tabIndex={-1}
          title={showActual ? 'Hide value' : 'Show actual value'}
          aria-label={showActual ? 'Hide value' : 'Show actual value'}
          className="absolute right-2.5 text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md shrink-0 focus:outline-none"
        >
          {showActual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
