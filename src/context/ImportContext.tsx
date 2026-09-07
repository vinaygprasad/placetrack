'use client';

import React, { createContext, useContext, useState } from 'react';
import * as XLSX from 'xlsx';
import { Loader2, CheckCircle2, ChevronUp, ChevronDown, X, FileText, AlertTriangle, FileSpreadsheet } from 'lucide-react';
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
  startBatchImport: (fileOrRows: File | any[], onSuccess?: () => void) => Promise<void>;
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

  const startBatchImport = async (fileOrRows: File | any[], onSuccess?: () => void) => {
    setImporting(true);
    setImportSummary(null);
    setIsWidgetMinimized(false);
    setImportProgress({ percentage: 0, processed: 0, total: 0, currentBatch: 0, totalBatches: 0 });

    try {
      let allRows: any[] = [];

      if (Array.isArray(fileOrRows)) {
        allRows = fileOrRows;
      } else if (fileOrRows instanceof File) {
        const buffer = await fileOrRows.arrayBuffer();
        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
          setImportSummary({ imported: 0, skipped: 0, errors: ['The uploaded Excel spreadsheet is empty or has no valid sheets.'] });
          setImporting(false);
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        allRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      }

      if (!allRows || allRows.length === 0) {
        setImportSummary({ imported: 0, skipped: 0, errors: ['No data rows found in the uploaded Excel spreadsheet.'] });
        setImporting(false);
        return;
      }

      const totalRows = allRows.length;
      const BATCH_SIZE = 20;
      const totalBatches = Math.ceil(totalRows / BATCH_SIZE);

      setImportProgress({
        percentage: 0,
        processed: 0,
        total: totalRows,
        currentBatch: 1,
        totalBatches,
      });

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
          try {
            onSuccess();
          } catch (e) {
            console.warn('onSuccess callback error (component unmounted?):', e);
          }
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
        try {
          onSuccess();
        } catch (e) {
          console.warn('onSuccess callback error (component unmounted?):', e);
        }
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
