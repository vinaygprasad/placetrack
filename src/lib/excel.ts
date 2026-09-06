import * as XLSX from 'xlsx';
import { maskPan, maskAadhar, formatDate, getOfferLetterViewUrl } from './utils';

export interface PlacementOfferRecord {
  id: string;
  companyName: string;
  packageOffered: number;
  documentType: string;
  documentFileName?: string | null;
  googleDriveFileId: string;
}

export interface StudentExportRecord {
  id: string;
  surname?: string | null;
  name?: string | null;
  fullName?: string | null;
  fullNameAsPerSSC?: string | null;
  gender?: string | null;
  dob?: Date | null;
  branch: string;
  section?: string | null;
  academicYear?: string | null;
  user?: { email?: string | null } | null;
  mobileNo?: string | null;
  altEmail?: string | null;
  emergencyContact?: string | null;
  tenthCGPA?: number | null;
  tenthYear?: number | null;
  tenthBoard?: string | null;
  tenthSchool?: string | null;
  interDiplomaPercentage?: number | null;
  interDiplomaBranch?: string | null;
  interDiplomaYear?: number | null;
  interDiplomaCollege?: string | null;
  interDiplomaBoard?: string | null;
  btechCGPA?: number | null;
  activeBacklogs?: number;
  eamcetRank?: number | null;
  jeeRank?: number | null;
  ecetRank?: number | null;
  category?: string | null;
  permanentAddress?: string | null;
  hometown?: string | null;
  district?: string | null;
  state?: string | null;
  currentAddress?: string | null;
  panNumber?: string | null;
  aadharNumber?: string | null;
  fatherName?: string | null;
  fatherOccupation?: string | null;
  fatherOrg?: string | null;
  motherMaidenName?: string | null;
  motherName?: string | null;
  motherOccupation?: string | null;
  motherOrg?: string | null;
  placement?: {
    status: string;
    companyName: string | null;
    packageOffered: number | null;
  } | null;
  placementOffers?: PlacementOfferRecord[] | null;
}

/**
 * Generate Excel buffer for student data:
 * - 'master': All student personal, academic, family & identification details WITHOUT placement records.
 * - 'placement': Template fields (Roll No, Full Name, Dept, Section, Academic Year, Email) + complete placement & offer records.
 */
export async function generateStudentExcel(
  students: StudentExportRecord[],
  actorUserId: string,
  filterDescription: string = 'All Students',
  options?: { exportMode?: 'master' | 'placement'; excludePlacementDetails?: boolean }
): Promise<Buffer> {
  const exportMode = options?.exportMode || (options?.excludePlacementDetails ? 'master' : 'master');
  const isMasterExport = exportMode === 'master';

  let maxOffers = 0;
  if (!isMasterExport) {
    students.forEach((s) => {
      const offersCount = s.placementOffers?.length || (s.placement?.companyName ? 1 : 0);
      if (offersCount > maxOffers) {
        maxOffers = offersCount;
      }
    });
  }

  const exportData = students.map((s, index) => {
    const studentFullName = s.fullName || '';
    const studentFullNameSSC = s.fullNameAsPerSSC || '';

    if (isMasterExport) {
      // Master Database Export (All student profile details without placement records)
      return {
        'S.No': index + 1,
        'Roll No': s.id,
        'Full Name': studentFullName,
        'Full Name (As Per SSC)': studentFullNameSSC,
        'Given Name': s.name || '',
        'Surname': s.surname || '',
        'Gender': s.gender || '',
        'Date of Birth': formatDate(s.dob),
        'Dept / Branch': s.branch,
        'Section': s.section || '',
        'Academic Year': s.academicYear || '',
        'Email': s.user?.email || '',
        'Mobile No': s.mobileNo || '',
        'Alternate Email': s.altEmail || '',
        'Emergency Contact': s.emergencyContact || '',
        '10th CGPA / %': s.tenthCGPA ?? '',
        '10th Year': s.tenthYear ?? '',
        '10th Board': s.tenthBoard || '',
        '10th School': s.tenthSchool || '',
        'Inter/Diploma %': s.interDiplomaPercentage ?? '',
        'Inter/Diploma Branch': s.interDiplomaBranch || '',
        'Inter/Diploma Year': s.interDiplomaYear ?? '',
        'Inter/Diploma College': s.interDiplomaCollege || '',
        'Inter/Diploma Board': s.interDiplomaBoard || '',
        'B.Tech CGPA': s.btechCGPA ?? '',
        'Active Backlogs': s.activeBacklogs ?? 0,
        'EAMCET Rank': s.eamcetRank ?? '',
        'JEE Rank': s.jeeRank ?? '',
        'ECET Rank': s.ecetRank ?? '',
        'Category': s.category || '',
        'Hometown': s.hometown || '',
        'District': s.district || '',
        'State': s.state || '',
        'Permanent Address': s.permanentAddress || '',
        'Current Address': s.currentAddress || '',
        'PAN Number (Masked)': maskPan(s.panNumber),
        'Aadhar Card Number (Masked)': maskAadhar(s.aadharNumber),
        'Father Name': s.fatherName || '',
        'Father Occupation': s.fatherOccupation || '',
        'Father Org': s.fatherOrg || '',
        'Mother Maiden Name': s.motherMaidenName || '',
        'Mother Name': s.motherName || '',
        'Mother Occupation': s.motherOccupation || '',
        'Mother Org': s.motherOrg || '',
      };
    }

    // Export Placement Details (Import template identification fields + Placement offers)
    const row: Record<string, any> = {
      'S.No': index + 1,
      'Roll No': s.id,
      'Full Name': studentFullName,
      'Dept / Branch': s.branch,
      'Section': s.section || '',
      'Academic Year': s.academicYear || '',
      'Email': s.user?.email || '',
      'Placement Status': s.placement?.status || 'UNPLACED',
    };

    const rawOffers = s.placementOffers && s.placementOffers.length > 0
      ? s.placementOffers
      : s.placement?.companyName
      ? [{
          id: 'primary',
          companyName: s.placement.companyName,
          packageOffered: s.placement.packageOffered || 0,
          documentType: 'OFFER_LETTER',
          googleDriveFileId: '',
        }]
      : [];

    const offers = [...rawOffers].sort((a, b) => (b.packageOffered || 0) - (a.packageOffered || 0));

    row['Total Offers Count'] = offers.length;

    // Dynamically append Offer 1, Offer 2... columns (highest package first)
    for (let i = 0; i < Math.max(maxOffers, 1); i++) {
      const offer = offers[i];
      const num = i + 1;
      row[`Offer ${num} Company`] = offer?.companyName || '';
      row[`Offer ${num} Package (LPA)`] = offer?.packageOffered ?? '';
      row[`Offer ${num} Document Type`] = offer?.documentType || '';
      row[`Offer ${num} Document Drive Link`] = offer?.googleDriveFileId
        ? getOfferLetterViewUrl(offer.googleDriveFileId)
        : '';
    }

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, isMasterExport ? 'Master Student Database' : 'Placement Details');

  // Format column widths dynamically
  const objectMaxLength: number[] = [];
  exportData.forEach((row) => {
    Object.values(row).forEach((val, i) => {
      const len = String(val).length;
      objectMaxLength[i] = Math.max(objectMaxLength[i] || 10, len + 2);
    });
  });

  worksheet['!cols'] = objectMaxLength.map((w) => ({ wch: Math.min(w, 40) }));

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}
