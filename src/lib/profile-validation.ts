export interface ProfileValidationResult {
  isComplete: boolean;
  completionPercentage: number;
  totalMandatory: number;
  completedMandatory: number;
  missingFields: { key: string; label: string; tab: 'personal' | 'academic' | 'family' | 'address' }[];
  missingByTab: {
    personal: string[];
    academic: string[];
    family: string[];
    address: string[];
  };
}

export const MANDATORY_PROFILE_FIELDS = [
  // Personal Information (Self-Reported & Mandatory)
  { key: 'fullNameAsPerSSC', label: 'Full Name (As Per SSC)', tab: 'personal' },
  { key: 'name', label: 'Given Name', tab: 'personal' },
  { key: 'surname', label: 'Surname', tab: 'personal' },
  { key: 'gender', label: 'Gender', tab: 'personal' },
  { key: 'dob', label: 'Date of Birth', tab: 'personal' },
  { key: 'mobileNo', label: 'Student Mobile Number', tab: 'personal' },
  { key: 'emergencyContact', label: 'Emergency Contact Number', tab: 'personal' },
  { key: 'category', label: 'Category', tab: 'personal' },

  // Academic Records
  { key: 'tenthCGPA', label: '10th CGPA / Percentage', tab: 'academic' },
  { key: 'tenthYear', label: '10th Year of Passing', tab: 'academic' },
  { key: 'tenthBoard', label: '10th Board Name', tab: 'academic' },
  { key: 'tenthSchool', label: '10th School Name', tab: 'academic' },
  { key: 'interDiplomaPercentage', label: 'Inter/Diploma % or CGPA', tab: 'academic' },
  { key: 'interDiplomaBranch', label: 'Inter/Diploma Branch', tab: 'academic' },
  { key: 'interDiplomaYear', label: 'Inter/Diploma Year of Passing', tab: 'academic' },
  { key: 'interDiplomaCollege', label: 'Inter/Diploma College Name', tab: 'academic' },
  { key: 'interDiplomaBoard', label: 'Inter/Diploma Board', tab: 'academic' },

  // Family Details
  { key: 'fatherName', label: "Father's Name", tab: 'family' },
  { key: 'motherName', label: "Mother's Name", tab: 'family' },

  // Address & Identification
  { key: 'hometown', label: 'Hometown', tab: 'address' },
  { key: 'district', label: 'District', tab: 'address' },
  { key: 'state', label: 'State', tab: 'address' },
  { key: 'permanentAddress', label: 'Permanent Address', tab: 'address' },
  { key: 'currentAddress', label: 'Current Address', tab: 'address' },
] as const;

export function checkStudentProfileCompleteness(student: Record<string, any> | null | undefined): ProfileValidationResult {
  if (!student) {
    return {
      isComplete: false,
      completionPercentage: 0,
      totalMandatory: MANDATORY_PROFILE_FIELDS.length,
      completedMandatory: 0,
      missingFields: MANDATORY_PROFILE_FIELDS.map(f => ({ ...f, tab: f.tab as any })),
      missingByTab: {
        personal: MANDATORY_PROFILE_FIELDS.filter(f => f.tab === 'personal').map(f => f.label),
        academic: MANDATORY_PROFILE_FIELDS.filter(f => f.tab === 'academic').map(f => f.label),
        family: MANDATORY_PROFILE_FIELDS.filter(f => f.tab === 'family').map(f => f.label),
        address: MANDATORY_PROFILE_FIELDS.filter(f => f.tab === 'address').map(f => f.label),
      },
    };
  }

  const missingFields: { key: string; label: string; tab: 'personal' | 'academic' | 'family' | 'address' }[] = [];
  const missingByTab: { personal: string[]; academic: string[]; family: string[]; address: string[] } = {
    personal: [],
    academic: [],
    family: [],
    address: [],
  };

  let completedMandatory = 0;

  for (const field of MANDATORY_PROFILE_FIELDS) {
    const val = student[field.key];
    const isFilled = val !== null && val !== undefined && String(val).trim() !== '';

    if (isFilled) {
      completedMandatory++;
    } else {
      missingFields.push({ ...field, tab: field.tab as any });
      missingByTab[field.tab as 'personal' | 'academic' | 'family' | 'address'].push(field.label);
    }
  }

  const totalMandatory = MANDATORY_PROFILE_FIELDS.length;
  const completionPercentage = Math.round((completedMandatory / totalMandatory) * 100);

  return {
    isComplete: missingFields.length === 0,
    completionPercentage,
    totalMandatory,
    completedMandatory,
    missingFields,
    missingByTab,
  };
}
