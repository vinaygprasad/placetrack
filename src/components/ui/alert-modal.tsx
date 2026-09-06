'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'error' | 'success' | 'warning' | 'info';
  confirmText?: string;
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'error',
  confirmText = 'OK',
}: AlertModalProps) {
  if (!isOpen) return null;

  const iconMap = {
    error: <AlertCircle className="h-7 w-7 text-red-600" />,
    warning: <AlertTriangle className="h-7 w-7 text-amber-600" />,
    success: <CheckCircle2 className="h-7 w-7 text-emerald-600" />,
    info: <Info className="h-7 w-7 text-blue-600" />,
  };

  const bgMap = {
    error: 'bg-red-50 border-red-200 text-red-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900',
  };

  const defaultTitleMap = {
    error: 'Attention',
    warning: 'Warning',
    success: 'Success',
    info: 'Information',
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl border ${bgMap[type]} shrink-0`}>
              {iconMap[type]}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="text-base font-bold text-slate-900">
                {title || defaultTitleMap[type]}
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line">
                {message}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={onClose}
              className="px-5 h-9 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm"
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
