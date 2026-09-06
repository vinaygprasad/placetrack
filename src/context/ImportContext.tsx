'use client';

import React, { createContext, useContext, useState } from 'react';
import * as XLSX from 'xlsx';
import { Loader2, CheckCircle2, ChevronUp, ChevronDown, X, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImportProgress {
  percentage: number;
  processed: number;
  total: number;
  currentBatch: number;
  totalBatches: number;
}

interface ImportSummary {
  imported: number;
  skipped: number;
  errors: string[];
}

interface ImportContextType {
  importing: boolean;
  importProgress: ImportProgress;
  importSummary: ImportSummary | null;
  startBatchImport: (file: File, onSuccess?: () => void) => Promise<void>;
  dismissImportSummary: () => void;
}

const ImportContext = createContext<ImportContextType | undefined>(undefined);

export function ImportProvider({ children }: { children: React.ReactNode }) {
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [isWidgetMinimized, setIsWidgetMinimized] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    percentage: 0,
    processed: 0,
    total: 0,
    currentBatch: 0,
    totalBatches: 0,
  });

  const startBatchImport = async (file: File, onSuccess?: () => void) => {
    setImporting(true);
    setImportSummary(null);
    setIsWidgetMinimized(false);
    setImportProgress({ percentage: 0, processed: 0, total: 0, currentBatch: 0, totalBatches: 0 });

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        setImportSummary({ imported: 0, skipped: 0, errors: ['The uploaded Excel spreadsheet is empty or has no valid sheets.'] });
        setImporting(false);
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      const allRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (allRows.length === 0) {
        setImportSummary({ imported: 0, skipped: 0, errors: ['No data rows found in the uploaded Excel spreadsheet.'] });
        setImporting(false);
        return;
      }

      const totalRows = allRows.length;
      const BATCH_SIZE = 20;
      const totalBatches = Math.ceil(totalRows / BATCH_SIZE);

      let totalImported = 0;
      let totalSkipped = 0;
      const allErrors: string[] = [];

      for (let i = 0; i < totalBatches; i++) {
        const startIdx = i * BATCH_SIZE;
        const endIdx = Math.min(startIdx + BATCH_SIZE, totalRows);
        const batchRows = allRows.slice(startIdx, endIdx);
        const startRowIndex = startIdx + 2;

        setImportProgress({
          percentage: Math.round((startIdx / totalRows) * 100),
          processed: startIdx,
          total: totalRows,
          currentBatch: i + 1,
          totalBatches,
        });

        let batchSuccess = false;
        let retries = 3;

        while (retries > 0 && !batchSuccess) {
          try {
            const res = await fetch('/api/admin/students/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                students: batchRows,
                startRowIndex,
              }),
            });

            const data = await res.json().catch(() => ({}));
            if (res.ok && data.summary) {
              totalImported += data.summary.imported || 0;
              totalSkipped += data.summary.skipped || 0;
              if (Array.isArray(data.summary.errors)) {
                allErrors.push(...data.summary.errors);
              }
              batchSuccess = true;
            } else {
              retries--;
              if (retries === 0) {
                totalSkipped += batchRows.length;
                allErrors.push(`Batch ${i + 1} (Rows ${startRowIndex}-${endIdx + 1}): ${data.error || 'Server error processing batch'}`);
              } else {
                await new Promise((r) => setTimeout(r, 1000));
              }
            }
          } catch (fetchErr: any) {
            retries--;
            if (retries === 0) {
              totalSkipped += batchRows.length;
              allErrors.push(`Batch ${i + 1} (Rows ${startRowIndex}-${endIdx + 1}): Network error - ${fetchErr.message || 'Connection failed'}`);
            } else {
              await new Promise((r) => setTimeout(r, 1000));
            }
          }
        }

        setImportProgress({
          percentage: Math.round((endIdx / totalRows) * 100),
          processed: endIdx,
          total: totalRows,
          currentBatch: i + 1,
          totalBatches,
        });

        if (onSuccess && ((i + 1) % 3 === 0 || i === totalBatches - 1)) {
          onSuccess();
        }

        // Brief 100ms throttle between batches to allow event loop and DB pool to settle
        await new Promise((r) => setTimeout(r, 100));
      }

      setImportSummary({
        imported: totalImported,
        skipped: totalSkipped,
        errors: allErrors,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Background import error:', err);
      setImportSummary({
        imported: 0,
        skipped: 0,
        errors: ['Import Error: ' + (err.message || String(err))],
      });
    } finally {
      setImporting(false);
    }
  };

  const dismissImportSummary = () => {
    setImportSummary(null);
  };

  return (
    <ImportContext.Provider
      value={{
        importing,
        importProgress,
        importSummary,
        startBatchImport,
        dismissImportSummary,
      }}
    >
      {children}

      {/* GLOBAL FLOATING BACKGROUND IMPORT PROGRESS WIDGET */}
      {(importing || importSummary) && (
        <div className="fixed bottom-6 right-6 z-[9999] transition-all duration-300 ease-in-out">
          <div className="w-80 sm:w-96 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden text-slate-900 border-t-4 border-t-[#1e3a8a]">
            {/* Widget Header */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-[#1e3a8a] flex items-center justify-center shrink-0">
                  {importing ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#1e3a8a]" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-xs text-slate-900 truncate">
                    {importing ? 'Importing Student Accounts...' : 'Import Task Completed'}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-semibold truncate">
                    {importing
                      ? `Batch ${importProgress.currentBatch}/${importProgress.totalBatches} (${importProgress.processed}/${importProgress.total})`
                      : `${importSummary?.imported || 0} Created • ${importSummary?.skipped || 0} Skipped`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsWidgetMinimized(!isWidgetMinimized)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
                  title={isWidgetMinimized ? 'Expand Widget' : 'Minimize Widget'}
                >
                  {isWidgetMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {!importing && (
                  <button
                    type="button"
                    onClick={dismissImportSummary}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Dismiss notification"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Widget Body (Expanded) */}
            {!isWidgetMinimized && (
              <div className="p-4 space-y-3">
                {importing ? (
                  <>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600">Overall Progress</span>
                      <span className="text-[#1e3a8a] text-sm">{importProgress.percentage}%</span>
                    </div>

                    {/* Animated Progress Bar */}
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-[#1e3a8a] to-blue-500 rounded-full transition-all duration-300 ease-out shadow-sm"
                        style={{ width: `${importProgress.percentage}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                      <span>0%</span>
                      <span>{importProgress.processed} / {importProgress.total} Records</span>
                      <span>100%</span>
                    </div>

                    <p className="text-[11px] text-slate-500 italic bg-blue-50/60 p-2 rounded-lg border border-blue-100">
                      ⚡ You can switch tabs, view analytics, or edit records while import runs in background!
                    </p>
                  </>
                ) : (
                  <>
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-emerald-800">Accounts Created:</span>
                        <span className="text-emerald-700">{importSummary?.imported || 0}</span>
                      </div>
                      {(importSummary?.skipped ?? 0) > 0 && (
                        <div className="flex items-center justify-between font-semibold text-amber-800">
                          <span>Skipped / Failed:</span>
                          <span>{importSummary?.skipped}</span>
                        </div>
                      )}
                    </div>

                    {importSummary?.errors && importSummary.errors.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowLogModal(true)}
                        className="w-full text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-50 gap-1.5"
                      >
                        <FileText className="h-3.5 w-3.5 text-amber-600" />
                        View Error Log ({importSummary.errors.length})
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ERROR LOG MODAL */}
      {showLogModal && importSummary && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl space-y-4 p-6 text-slate-900 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-amber-700 text-base">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Import Log & Skipped Records
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowLogModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-xs text-slate-600">
              The following rows could not be imported because they were duplicates or missing required fields:
            </p>

            <div className="max-h-60 overflow-y-auto p-3 bg-slate-900 text-amber-300 rounded-xl text-xs font-mono space-y-1 shadow-inner border border-slate-800">
              {importSummary.errors?.map((err: string, i: number) => (
                <div key={i} className="leading-relaxed border-b border-slate-800/60 pb-1 last:border-b-0">
                  {err}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="gradient"
                size="sm"
                onClick={() => setShowLogModal(false)}
                className="font-bold text-xs px-6"
              >
                Close Log
              </Button>
            </div>
          </div>
        </div>
      )}
    </ImportContext.Provider>
  );
}

export function useImport() {
  const context = useContext(ImportContext);
  if (!context) {
    throw new Error('useImport must be used within an ImportProvider');
  }
  return context;
}
