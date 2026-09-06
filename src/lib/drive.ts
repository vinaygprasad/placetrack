import { google } from 'googleapis';
import path from 'path';

const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

function getDriveFolderId(): string | undefined {
  return process.env.GOOGLE_DRIVE_FOLDER_ID;
}

function isGoogleDriveConfigured(): boolean {
  const folderId = getDriveFolderId();
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  const hasFolderId = !!(folderId && folderId.trim() !== '');
  const hasServiceAccount = !!(email && privateKey && email.trim() !== '' && privateKey.trim() !== '');
  const hasOAuthToken = !!(refreshToken && refreshToken.trim() !== '');

  return hasFolderId && (hasServiceAccount || hasOAuthToken);
}

function getDriveClient() {
  if (!isGoogleDriveConfigured()) {
    return null;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  // 1. Try OAuth2 Refresh Token (Best for Personal Google Drive Accounts)
  if (clientId && clientSecret && refreshToken && refreshToken.trim() !== '') {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  // 2. Try GCP Service Account JWT (Best for Google Workspace Shared Drives)
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (email && privateKey) {
    const formattedKey = privateKey.replace(/\\n/g, '\n');
    const auth = new google.auth.JWT({
      email: email,
      key: formattedKey,
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
    });

    return google.drive({ version: 'v3', auth });
  }

  return null;
}

/**
 * Helper to generate company short name (First 5 letters or less if company name < 5 chars)
 */
export function getCompanyShortName(companyName: string): string {
  const sanitized = companyName.replace(/[^a-zA-Z0-9]/g, '');
  if (sanitized.length <= 5) return sanitized || 'Comp';
  return sanitized.slice(0, 5);
}

/**
 * Format standardized offer document filename: RollNo_DocType_CompanyShortName_OfferNumber.ext
 * e.g. 21V91A0507_OL_TCS_1.pdf or 21V91A0507_LOI_Googl_2.pdf
 */
export function formatOfferFileName(
  rollNo: string,
  docType: string,
  companyName: string,
  extension: string = 'pdf',
  offerNumber?: number | string
): string {
  const shortComp = getCompanyShortName(companyName);
  const cleanExt = extension.replace(/^\./, '') || 'pdf';
  const numSuffix = offerNumber !== undefined && offerNumber !== null && String(offerNumber).trim() !== '' ? `_${offerNumber}` : '';
  return `${rollNo.trim()}_${docType.toUpperCase()}_${shortComp}${numSuffix}.${cleanExt}`;
}

/**
 * Find or create a subfolder inside a Google Drive parent folder
 */
async function getOrCreateSubfolder(drive: any, parentId: string, folderName: string): Promise<string> {
  const safeName = folderName.replace(/'/g, "\\'");
  const query = `'${parentId}' in parents and name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  try {
    const listRes = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (listRes.data.files && listRes.data.files.length > 0) {
      return listRes.data.files[0].id;
    }

    // Create new folder
    const createRes = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      supportsAllDrives: true,
      fields: 'id',
    });

    return createRes.data.id;
  } catch (e) {
    console.warn(`Error resolving Drive subfolder "${folderName}" under parent "${parentId}":`, e);
    throw e;
  }
}

/**
 * Recursively find or create 2-level Drive folders: AcademicYear / Dept(Batch)
 */
async function resolveDriveDestinationFolder(
  drive: any,
  rootFolderId: string,
  academicYear?: string | null,
  dept?: string | null
): Promise<string> {
  let currentParentId = rootFolderId;

  // Level 1: Academic Year folder (e.g. "2019-2023")
  const yearFolder = (academicYear && academicYear.trim()) || 'Others';
  currentParentId = await getOrCreateSubfolder(drive, currentParentId, yearFolder);

  // Level 2: Department / Batch folder (e.g. "CSE")
  const branchFolder = (dept && dept.trim()) || 'Others';
  currentParentId = await getOrCreateSubfolder(drive, currentParentId, branchFolder);

  return currentParentId;
}

export interface UploadResult {
  fileId: string;
  fileName: string;
  fileSizeBytes: number;
  webViewLink?: string;
}

/**
 * Upload a placement offer document strictly to Google Drive with 2-level hierarchy: AcademicYear/Batch/
 */
export async function uploadOfferLetterToDrive(
  fileBuffer: Buffer,
  rollNo: string,
  docType: string,
  companyName: string,
  academicYear?: string | null,
  dept?: string | null,
  mimeType: string = 'application/pdf',
  originalFileName?: string,
  offerNumber?: number | string
): Promise<UploadResult> {
  const ext = originalFileName ? path.extname(originalFileName) : '.pdf';
  const formattedFileName = formatOfferFileName(rollNo, docType, companyName, ext, offerNumber);

  const drive = getDriveClient();
  const folderId = getDriveFolderId();

  if (!drive || !folderId) {
    throw new Error(
      'Google Drive is not properly configured. Please ensure GOOGLE_DRIVE_FOLDER_ID and credentials (OAuth Refresh Token or Service Account) are set in environment variables.'
    );
  }

  try {
    const destinationFolderId = await resolveDriveDestinationFolder(
      drive,
      folderId,
      academicYear,
      dept
    );

    const stream = require('stream');
    const bufferStream = stream.Readable.from(fileBuffer);

    const fileMetadata = {
      name: formattedFileName,
      parents: [destinationFolderId],
    };

    const media = {
      mimeType: mimeType,
      body: bufferStream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      supportsAllDrives: true,
      fields: 'id, name, size, webViewLink',
    });

    const fileId = response.data.id;
    if (!fileId) {
      throw new Error('Google Drive upload failed - no file ID returned from Drive API.');
    }

    return {
      fileId: fileId,
      fileName: formattedFileName,
      fileSizeBytes: Number(response.data.size || fileBuffer.length),
      webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
    };
  } catch (error: any) {
    console.error('Google Drive upload error:', error);
    if (error?.code === 403 || error?.errors?.[0]?.reason === 'storageQuotaExceeded' || error?.message?.includes('storage quota')) {
      throw new Error(
        'Google Drive Upload Error: Service Accounts do not have personal storage quota. Please set GOOGLE_REFRESH_TOKEN in .env for a personal Google Drive account, or use a Google Workspace Shared Drive.'
      );
    }
    throw new Error(error?.message || 'Google Drive upload failed.');
  }
}

/**
 * Stream binary file directly from Google Drive API (For in-app streaming & download proxy)
 */
export async function getOfferLetterFileStreamFromDrive(fileId: string) {
  const drive = getDriveClient();
  if (!drive) {
    throw new Error('Google Drive is not configured.');
  }

  const metadataRes = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size',
    supportsAllDrives: true,
  });

  const mediaRes = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' }
  );

  return {
    metadata: metadataRes.data,
    stream: mediaRes.data,
  };
}

/**
 * Delete file strictly from Google Drive
 */
export async function deleteOfferLetterFromDrive(fileId: string): Promise<boolean> {
  const drive = getDriveClient();
  if (drive) {
    try {
      await drive.files.delete({ fileId, supportsAllDrives: true });
      return true;
    } catch (e) {
      console.error('Error deleting file from Google Drive:', e);
      return false;
    }
  }

  return false;
}
