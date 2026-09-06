export const DEPARTMENTS = [
  'AI & DS',
  'AME',
  'CE',
  'CSBS',
  'CSE',
  'CSE–AIML',
  'CSE–CyS',
  'CSE–DS',
  'CSE–IOT',
  'ECE',
  'EEE',
  'EIE',
  'IT',
  'ME',
] as const;

export type Department = typeof DEPARTMENTS[number];

export const DOCUMENT_TYPES = [
  { code: 'LOI', label: 'LOI – Letter of Intent' },
  { code: 'OL', label: 'OL – Offer Letter' },
  { code: 'AL', label: 'AL – Appointment Letter' },
  { code: 'INT', label: 'INT – Internship Letter' },
] as const;

export const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export type Section = typeof SECTIONS[number];

