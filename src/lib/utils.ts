import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Mask PAN Number: e.g., ABCDE1234F -> ABCDE****F or ABCDXXXXF
 */
export function maskPan(pan?: string | null): string {
  if (!pan || pan.trim().length === 0) return "N/A";
  const clean = pan.trim();
  if (clean.length >= 10) {
    return `${clean.slice(0, 5)}****${clean.slice(9)}`;
  }
  if (clean.length >= 4) {
    return `${clean.slice(0, 4)}XXXX`;
  }
  return "XXXX";
}

/**
 * Mask Aadhar Number: e.g., 532543343512 -> 5325XXXX3512 or 5325XXXX
 */
export function maskAadhar(aadhar?: string | null): string {
  if (!aadhar || aadhar.trim().length === 0) return "N/A";
  const clean = aadhar.trim();
  if (clean.length >= 12) {
    return `${clean.slice(0, 4)}XXXX${clean.slice(8)}`;
  }
  if (clean.length >= 4) {
    return `${clean.slice(0, 4)}XXXX`;
  }
  return "XXXX";
}

/**
 * Format currency / package in Lakhs Per Annum (LPA)
 */
export function formatPackage(packageLpa?: number | null): string {
  if (packageLpa === undefined || packageLpa === null) return "N/A";
  return `₹${packageLpa.toFixed(2)} LPA`;
}

/**
 * Format date for display
 */
export function formatDate(dateStr?: Date | string | null): string {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Generate in-app view URL for offer letters (Streams directly via app backend API)
 */
export function getOfferLetterViewUrl(fileId?: string | null): string {
  if (!fileId) return '#';
  return `/api/offer-letters/${fileId}`;
}

/**
 * Generate in-app download URL for offer letters
 */
export function getOfferLetterDownloadUrl(fileId?: string | null): string {
  if (!fileId) return '#';
  return `/api/offer-letters/${fileId}?download=true`;
}
