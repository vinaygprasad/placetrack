'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MultiSelect } from '@/components/ui/multi-select';
import { AlertModal } from '@/components/ui/alert-modal';
import { maskPan, maskAadhar, formatPackage, formatDate, getOfferLetterViewUrl, getOfferLetterDownloadUrl } from '@/lib/utils';
import { DEPARTMENTS } from '@/lib/constants';
import { useImport } from '@/context/ImportContext';
import * as XLSX from 'xlsx';
import {
  Search,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  GraduationCap,
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  UploadCloud,
  FileSpreadsheet,
  Download,
  RotateCcw,
  User,
  UserPlus,
  Users,
  Home,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Building2,
  Briefcase,
  DollarSign,
  ChevronUp,
  ChevronDown,
  Loader2,
  CheckSquare,
} from 'lucide-react';

const PLACEMENT_STATUSES = ['All Statuses', 'UNPLACED', 'PLACED'];
const CATEGORIES = ['General / OC', 'BC-A', 'BC-B', 'BC-C', 'BC-D', 'BC-E', 'SC', 'ST', 'EWS'];

type TabType = 'personal' | 'academic' | 'family' | 'address' | 'placement';
type ExportScope = 'all' | 'filtered' | 'selected';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tableFetching, setTableFetching] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalSystemCount, setTotalSystemCount] = useState<number>(0);

  // Checkbox Row Selection State
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [companyFilter, setCompanyFilter] = useState('');

  // Column Header Sorting State (Sortable columns: rollNo, name, packageOffered)
  const [sortBy, setSortBy] = useState<'rollNo' | 'name' | 'packageOffered'>('rollNo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Drawer & Modal State
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [viewDrawerTab, setViewDrawerTab] = useState<TabType>('personal');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalTab, setEditModalTab] = useState<TabType>('personal');
  const [editFormData, setEditFormData] = useState<any>({});
  const [editOffers, setEditOffers] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Modal Alert state
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type?: 'error' | 'success' | 'warning' | 'info';
  }>({
    isOpen: false,
    message: '',
  });

  const showAlert = (message: string, type: 'error' | 'success' | 'warning' | 'info' = 'error', title?: string) => {
    setAlertConfig({ isOpen: true, message, type, title });
  };

  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Advanced Excel Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>('all');
  const [exportMode, setExportMode] = useState<'master' | 'placement'>('master');
  const [exportLoading, setExportLoading] = useState(false);

  // Add Individual Student Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [addFormData, setAddFormData] = useState({
    rollNo: '',
    fullName: '',
    branch: DEPARTMENTS[0] || 'CSE',
    section: 'A',
    academicYearStart: (new Date().getFullYear() - 4).toString(),
    academicYearEnd: new Date().getFullYear().toString(),
    password: '',
  });

  // Global Background Excel Import Context
  const { importing, importProgress, importSummary, startBatchImport, dismissImportSummary } = useImport();

  // Bulk Excel Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Submit Individual Student Account Registration Form
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const startYr = addFormData.academicYearStart.trim();
    const endYr = addFormData.academicYearEnd.trim();

    if (!addFormData.rollNo.trim() || !addFormData.fullName.trim() || !addFormData.branch || !startYr || !endYr) {
      showAlert('Roll Number, Full Name, Department, and Academic Year (Start & End) are required.', 'error', 'Validation Error');
      return;
    }

    const normalizedAcademicYear = `${startYr}-${endYr}`;

    setIsAddingStudent(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollNo: addFormData.rollNo.trim(),
          fullName: addFormData.fullName.trim(),
          branch: addFormData.branch,
          section: addFormData.section ? addFormData.section.trim().toUpperCase() : null,
          academicYear: normalizedAcademicYear,
          password: addFormData.password.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsAddModalOpen(false);
        const cYr = new Date().getFullYear();
        setAddFormData({
          rollNo: '',
          fullName: '',
          branch: DEPARTMENTS[0] || 'CSE',
          section: 'A',
          academicYearStart: (cYr - 4).toString(),
          academicYearEnd: cYr.toString(),
          password: '',
        });
        fetchStudents();
        showAlert(`Student ${addFormData.rollNo.toUpperCase()} (${addFormData.fullName}) registered successfully.`, 'success', 'Student Registered');
      } else {
        showAlert(data.error || 'Failed to create student record.', 'error', 'Registration Failed');
      }
    } catch (e) {
      showAlert('Error registering student record.', 'error', 'Server Error');
    } finally {
      setIsAddingStudent(false);
    }
  };

  const fetchStudents = async () => {
    if (students.length > 0) {
      setTableFetching(true);
    } else {
      setInitialLoading(true);
    }
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (searchQuery) params.set('q', searchQuery);
      if (selectedDepts.length > 0) params.set('branch', selectedDepts.join(','));
      if (selectedYears.length > 0) params.set('academicYear', selectedYears.join(','));
      if (selectedSections.length > 0) params.set('section', selectedSections.join(','));
      if (selectedStatus !== 'All Statuses') params.set('status', selectedStatus);
      if (companyFilter) params.set('company', companyFilter);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const res = await fetch(`/api/students?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setStudents(data.students || []);
        if (data.pagination) {
          setTotal(Number(data.pagination.total || 0));
          setTotalPages(Number(data.pagination.totalPages || 1));
          if (data.pagination.totalSystemCount) {
            setTotalSystemCount(Number(data.pagination.totalSystemCount));
          }
        }
        setAvailableYears(data.availableYears || []);
        setAvailableSections(data.availableSections || []);
      }
    } catch (e) {
      console.error('Error fetching students:', e);
    } finally {
      setInitialLoading(false);
      setTableFetching(false);
    }
  };

  const deptKey = selectedDepts.join(',');
  const yearKey = selectedYears.join(',');
  const secKey = selectedSections.join(',');

  useEffect(() => {
    fetchStudents();
  }, [page, limit, deptKey, yearKey, secKey, selectedStatus, sortBy, sortOrder]);

  // Automatically pop open confirmation modal when import finishes at 100%
  useEffect(() => {
    if (importSummary && !importing) {
      setIsImportModalOpen(true);
    }
  }, [importSummary, importing]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (page !== 1) {
      setPage(1);
    } else {
      fetchStudents();
    }
  };

  const handleHeaderSort = (field: 'rollNo' | 'name' | 'packageOffered') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    if (page !== 1) setPage(1);
  };

  const renderSortIndicator = (field: 'rollNo' | 'name' | 'packageOffered') => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 inline text-slate-400 ml-1" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 inline text-[#1e3a8a] ml-1 font-bold" />
    ) : (
      <ArrowDown className="h-3 w-3 inline text-[#1e3a8a] ml-1 font-bold" />
    );
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDepts([]);
    setSelectedYears([]);
    setSelectedSections([]);
    setSelectedStatus('All Statuses');
    setCompanyFilter('');
    setPage(1);
  };

  // Row Selection Helpers
  const currentPageIds = students.map((s) => s.id);
  const isAllPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedStudentIds.includes(id));

  const handleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      const newSet = new Set([...selectedStudentIds, ...currentPageIds]);
      setSelectedStudentIds(Array.from(newSet));
    }
  };

  const handleToggleStudentSelect = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // Download Sample Excel Template for Admin Import
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Roll No': '21V91A0501',
        'Full Name': 'Rahul Kumar Sharma',
        Dept: 'CSE',
        Section: 'A',
        'Academic Year': '2024-2028',
        Password: 'StudentPass123!',
      },
      {
        'Roll No': '21V91A0502',
        'Full Name': 'Priya Sharma',
        Dept: 'ECE',
        Section: 'B',
        'Academic Year': '2024-2028',
        Password: 'StudentPass123!',
      },
      {
        'Roll No': '21V91A0503',
        'Full Name': 'Anil Verma',
        Dept: 'AI & DS',
        Section: 'C',
        'Academic Year': '2024-2028',
        Password: 'StudentPass123!',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Accounts Template');
    worksheet['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 18 }, { wch: 18 }];
    XLSX.writeFile(workbook, 'VNRVJIET_Student_Import_Template.xlsx');
  };

  // Upload Excel file for Global Background Import
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    try {
      const buffer = await importFile.arrayBuffer();
      const data = new Uint8Array(buffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        showAlert('The uploaded Excel file contains no valid sheets.', 'error', 'Invalid File');
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      const allRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (!allRows || allRows.length === 0) {
        showAlert('No data rows found in the uploaded Excel spreadsheet.', 'error', 'Empty File');
        return;
      }

      startBatchImport(allRows, fetchStudents);
    } catch (err: any) {
      console.error('Error reading excel file:', err);
      showAlert('Failed to read Excel file: ' + (err.message || String(err)), 'error', 'File Read Error');
    }
  };

  // Open View Drawer with default tab
  const openViewDrawer = (student: any) => {
    setSelectedStudent(student);
    setViewDrawerTab('personal');
    setIsViewDrawerOpen(true);
  };

  // Open Edit Modal with full student + placement data populated
  const openEditModal = (student: any) => {
    setSelectedStudent(student);
    setEditModalTab('personal');
    setEditFormData({
      id: student.id || '',
      fullName: student.fullName || (student.surname ? `${student.name || ''} ${student.surname}`.trim() : student.name) || '',
      fullNameAsPerSSC: student.fullNameAsPerSSC || '',
      surname: student.surname || '',
      name: student.name || '',
      gender: student.gender || '',
      dob: student.dob ? new Date(student.dob).toISOString().slice(0, 10) : '',
      branch: student.branch || '',
      section: student.section || '',
      academicYear: student.academicYear || '',
      email: student.user?.email || '',
      mobileNo: student.mobileNo || '',
      altEmail: student.altEmail || '',
      emergencyContact: student.emergencyContact || '',
      category: student.category || 'General / OC',

      // Academic
      tenthCGPA: student.tenthCGPA ?? '',
      tenthYear: student.tenthYear ?? '',
      tenthBoard: student.tenthBoard || '',
      tenthSchool: student.tenthSchool || '',
      interDiplomaPercentage: student.interDiplomaPercentage ?? '',
      interDiplomaBranch: student.interDiplomaBranch || '',
      interDiplomaYear: student.interDiplomaYear ?? '',
      interDiplomaCollege: student.interDiplomaCollege || '',
      interDiplomaBoard: student.interDiplomaBoard || '',
      btechCGPA: student.btechCGPA ?? '',
      activeBacklogs: student.activeBacklogs ?? 0,
      eamcetRank: student.eamcetRank ?? '',
      jeeRank: student.jeeRank ?? '',
      ecetRank: student.ecetRank ?? '',

      // Family
      fatherName: student.fatherName || '',
      fatherOccupation: student.fatherOccupation || '',
      fatherOrg: student.fatherOrg || '',
      motherName: student.motherName || '',
      motherMaidenName: student.motherMaidenName || '',
      motherOccupation: student.motherOccupation || '',
      motherOrg: student.motherOrg || '',

      // Address & ID
      permanentAddress: student.permanentAddress || '',
      hometown: student.hometown || '',
      district: student.district || '',
      state: student.state || '',
      currentAddress: student.currentAddress || '',
      panNumber: student.panNumber || '',
      aadharNumber: student.aadharNumber || '',

      // Placement Details
      placementStatus: student.placement?.status || (student.placementOffers && student.placementOffers.length > 0 ? 'PLACED' : 'UNPLACED'),
      companyName: student.placement?.companyName || '',
      packageOffered: student.placement?.packageOffered ?? '',
    });

    const initialOffers = student.placementOffers && student.placementOffers.length > 0
      ? student.placementOffers.map((o: any) => ({
          id: o.id,
          companyName: o.companyName || '',
          packageOffered: o.packageOffered ?? '',
          documentFileName: o.documentFileName || '',
          googleDriveFileId: o.googleDriveFileId || '',
        }))
      : student.placement?.companyName
      ? [{
          id: 'primary',
          companyName: student.placement.companyName,
          packageOffered: student.placement.packageOffered ?? '',
          googleDriveFileId: student.placement.googleDriveFileId || '',
        }]
      : [];

    setEditOffers(initialOffers);
    setIsEditModalOpen(true);
  };

  // Save All Edit Form Updates
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setIsSaving(true);

    try {
      const studentRes = await fetch(`/api/students/${selectedStudent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editFormData.id,
          fullName: editFormData.fullName,
          fullNameAsPerSSC: editFormData.fullNameAsPerSSC,
          surname: editFormData.surname,
          name: editFormData.name,
          gender: editFormData.gender,
          dob: editFormData.dob,
          branch: editFormData.branch,
          section: editFormData.section,
          academicYear: editFormData.academicYear,
          email: editFormData.email,
          mobileNo: editFormData.mobileNo,
          altEmail: editFormData.altEmail,
          emergencyContact: editFormData.emergencyContact,
          category: editFormData.category,

          tenthCGPA: editFormData.tenthCGPA,
          tenthYear: editFormData.tenthYear,
          tenthBoard: editFormData.tenthBoard,
          tenthSchool: editFormData.tenthSchool,
          interDiplomaPercentage: editFormData.interDiplomaPercentage,
          interDiplomaBranch: editFormData.interDiplomaBranch,
          interDiplomaYear: editFormData.interDiplomaYear,
          interDiplomaCollege: editFormData.interDiplomaCollege,
          interDiplomaBoard: editFormData.interDiplomaBoard,
          btechCGPA: editFormData.btechCGPA,
          activeBacklogs: editFormData.activeBacklogs,
          eamcetRank: editFormData.eamcetRank,
          jeeRank: editFormData.jeeRank,
          ecetRank: editFormData.ecetRank,

          fatherName: editFormData.fatherName,
          fatherOccupation: editFormData.fatherOccupation,
          fatherOrg: editFormData.fatherOrg,
          motherName: editFormData.motherName,
          motherMaidenName: editFormData.motherMaidenName,
          motherOccupation: editFormData.motherOccupation,
          motherOrg: editFormData.motherOrg,

          permanentAddress: editFormData.permanentAddress,
          hometown: editFormData.hometown,
          district: editFormData.district,
          state: editFormData.state,
          currentAddress: editFormData.currentAddress,
          panNumber: editFormData.panNumber,
          aadharNumber: editFormData.aadharNumber,
        }),
      });

      if (!studentRes.ok) {
        const errData = await studentRes.json().catch(() => ({}));
        showAlert(errData.error || 'Failed to update student profile.', 'error', 'Update Failed');
        setIsSaving(false);
        return;
      }

      // Upload/update offer details attached by admin
      let offerError: string | null = null;
      if (editFormData.placementStatus === 'PLACED') {
        for (const offer of editOffers) {
          if (offer.companyName && offer.companyName.trim()) {
            const offerFormData = new FormData();
            offerFormData.append('companyName', offer.companyName.trim());
            offerFormData.append('packageOffered', String(offer.packageOffered || 0));
            offerFormData.append('documentType', offer.documentType || 'OL');
            if (offer.file) {
              offerFormData.append('file', offer.file);
            }

            if (offer.id && offer.id !== 'primary') {
              offerFormData.append('offerId', offer.id);
              const patchRes = await fetch(`/api/students/${selectedStudent.id}/offers`, {
                method: 'PATCH',
                body: offerFormData,
              });
              if (!patchRes.ok) {
                const resData = await patchRes.json().catch(() => ({}));
                offerError = resData.error || 'Failed to update offer.';
                break;
              }
            } else {
              const postRes = await fetch(`/api/students/${selectedStudent.id}/offers`, {
                method: 'POST',
                body: offerFormData,
              });
              if (!postRes.ok) {
                const resData = await postRes.json().catch(() => ({}));
                offerError = resData.error || 'Failed to save new placement offer.';
                break;
              }
            }
          }
        }
      }

      if (offerError) {
        showAlert(offerError, 'error', 'Offer Save Failed');
        setIsSaving(false);
        return;
      }

      const placementRes = await fetch(`/api/students/${selectedStudent.id}/placement`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editFormData.placementStatus,
        }),
      });

      if (placementRes.ok) {
        setIsEditModalOpen(false);
        fetchStudents();
        showAlert(`Successfully updated complete student record for ${editFormData.id}`, 'success', 'Update Successful');
      } else {
        const pData = await placementRes.json().catch(() => ({}));
        showAlert(pData.error || 'Failed to update placement status.', 'error', 'Update Failed');
      }
    } catch (e: any) {
      showAlert(e.message || 'Error saving student updates.', 'error', 'Save Error');
    } finally {
      setIsSaving(false);
    }
  };

  // Open Delete Confirmation Modal
  const promptDeleteStudent = (student: any) => {
    setStudentToDelete(student);
    setIsDeleteModalOpen(true);
  };

  // Execute Delete Student Record
  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/students/${studentToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setStudentToDelete(null);
        fetchStudents();
        showAlert(`Student ${studentToDelete.id} (${studentToDelete.fullName || studentToDelete.name}) permanently deleted.`, 'success', 'Record Deleted');
      } else {
        showAlert('Failed to delete student record.', 'error', 'Delete Failed');
      }
    } catch (e) {
      showAlert('Error deleting student record.', 'error', 'Delete Error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Execute Direct Placement Offer Deletion
  const handleDeleteSingleOffer = async (studentId: string, offerId: string) => {
    try {
      const res = await fetch(`/api/students/${studentId}/offers?offerId=${offerId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchStudents();
        if (selectedStudent && selectedStudent.id === studentId) {
          setSelectedStudent((prev: any) => {
            if (!prev) return prev;
            const updatedOffers = (prev.placementOffers || []).filter((o: any) => o.id !== offerId);
            return {
              ...prev,
              placementOffers: updatedOffers,
              placement: updatedOffers.length === 0 ? { ...prev.placement, status: 'UNPLACED', companyName: null, packageOffered: null } : prev.placement,
            };
          });
        }
        showAlert('Placement offer deleted successfully.', 'success', 'Offer Deleted');
      } else {
        const data = await res.json();
        showAlert(data.error || 'Failed to delete offer.', 'error', 'Delete Failed');
      }
    } catch (e) {
      showAlert('Error deleting placement offer.', 'error', 'Delete Error');
    }
  };

  // Open Export Modal with default radio selection
  const handleOpenExportModal = () => {
    const hasActiveFilters = Boolean(
      searchQuery || selectedDepts.length > 0 || selectedYears.length > 0 || selectedSections.length > 0 || selectedStatus !== 'All Statuses'
    );

    if (selectedStudentIds.length > 0) {
      setExportScope('selected');
    } else if (hasActiveFilters) {
      setExportScope('filtered');
    } else {
      setExportScope('all');
    }

    setExportMode('master');
    setIsExportModalOpen(true);
  };

  // Execute Excel Export with Radio Scopes (Selected vs Filtered vs All) and Mode (Master vs Placement)
  const handleExecuteExport = () => {
    setIsExportModalOpen(false);
    setExportLoading(true);

    const params = new URLSearchParams();
    params.set('exportMode', exportMode);

    if (exportScope === 'selected' && selectedStudentIds.length > 0) {
      params.set('ids', selectedStudentIds.join(','));
    } else if (exportScope === 'filtered') {
      params.set('onlyFiltered', 'true');
      if (searchQuery) params.set('q', searchQuery);
      if (selectedDepts.length > 0) params.set('branch', selectedDepts.join(','));
      if (selectedYears.length > 0) params.set('academicYear', selectedYears.join(','));
      if (selectedSections.length > 0) params.set('section', selectedSections.join(','));
      if (selectedStatus !== 'All Statuses') params.set('status', selectedStatus);
    } else {
      params.set('onlyFiltered', 'false');
    }

    window.location.href = `/api/export/excel?${params.toString()}`;
    setTimeout(() => setExportLoading(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12">
      <AlertModal
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Student Data Management</h1>
          <p className="text-sm text-slate-500 mt-1">Bulk import, select records, multi-filter, search, edit and export student records</p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {selectedStudentIds.length > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 text-xs font-bold animate-fade-in">
              <CheckSquare className="h-4 w-4 text-purple-700" />
              <span>{selectedStudentIds.length} Selected</span>
              <button
                type="button"
                onClick={() => setSelectedStudentIds([])}
                className="hover:text-red-600 font-bold ml-1"
                title="Clear selected students"
              >
                ×
              </button>
            </div>
          )}

          <Button
            variant="default"
            size="sm"
            onClick={() => {
              const cYr = new Date().getFullYear();
              setAddFormData({
                rollNo: '',
                fullName: '',
                branch: DEPARTMENTS[0] || 'CSE',
                section: 'A',
                academicYearStart: cYr.toString(),
                academicYearEnd: (cYr + 4).toString(),
                password: '',
              });
              setIsAddModalOpen(true);
            }}
            className="bg-[#1e3a8a] hover:bg-[#11235b] text-white font-bold gap-1.5 shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            + Add Student
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setImportFile(null);
              dismissImportSummary();
              setIsImportModalOpen(true);
            }}
            className="border-blue-700/30 bg-blue-50 text-[#1e3a8a] hover:bg-blue-100 font-bold gap-1.5"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Bulk Import (Excel)
          </Button>

          <Button
            variant="gradient"
            size="sm"
            onClick={handleOpenExportModal}
            disabled={exportLoading}
            className="font-bold gap-1.5 px-5"
          >
            <Download className="h-4 w-4" />
            {exportLoading ? 'Exporting...' : 'Export Excel'}
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar Panel */}
      <Card className="glass-card relative z-30 overflow-visible bg-white border-slate-200 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search Roll No, Name, Email, or Company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-300 text-slate-900 focus:bg-white text-xs font-medium"
              />
            </div>
            <Button type="submit" variant="gradient" className="gap-2 font-bold px-6 text-xs">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </form>

          {/* Multi-Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            {/* Academic Year Multi-Select (Strictly distinct values from DB) */}
            <MultiSelect
              title="Academic Year"
              options={availableYears}
              selected={selectedYears}
              onChange={setSelectedYears}
            />

            {/* Department Multi-Select (Fixed list) */}
            <MultiSelect
              title="Department / Branch"
              options={DEPARTMENTS as unknown as string[]}
              selected={selectedDepts}
              onChange={setSelectedDepts}
            />

            {/* Section Multi-Select (Strictly distinct values from DB) */}
            <MultiSelect
              title="Section"
              options={availableSections}
              selected={selectedSections}
              onChange={setSelectedSections}
            />

            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Placement Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-800 font-medium shadow-sm"
              >
                {PLACEMENT_STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-white">
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(selectedDepts.length > 0 || selectedYears.length > 0 || selectedSections.length > 0) && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-500 font-medium">Selected Filters:</span>
                {selectedYears.map((yr) => (
                  <span
                    key={yr}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1e3a8a] border border-blue-200 text-[11px] font-bold"
                  >
                    Year: {yr}
                    <button
                      type="button"
                      onClick={() => setSelectedYears(selectedYears.filter((y) => y !== yr))}
                      className="hover:text-red-600 font-bold ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {selectedDepts.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold"
                  >
                    Dept: {d}
                    <button
                      type="button"
                      onClick={() => setSelectedDepts(selectedDepts.filter((dept) => dept !== d))}
                      className="hover:text-red-600 font-bold ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {selectedSections.map((sec) => (
                  <span
                    key={sec}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-900 border border-purple-200 text-[11px] font-bold"
                  >
                    Sec: {sec}
                    <button
                      type="button"
                      onClick={() => setSelectedSections(selectedSections.filter((s) => s !== sec))}
                      className="hover:text-red-600 font-bold ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-slate-600 hover:text-slate-900 h-7 text-xs gap-1 font-semibold"
              >
                <RotateCcw className="h-3 w-3" /> Clear All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Student Data Table */}
      <Card className="glass-card relative z-10 overflow-hidden bg-white border-slate-200 shadow-md">
        {tableFetching && (
          <div className="absolute top-0 left-0 right-0 z-20 h-1 bg-blue-100 overflow-hidden">
            <div className="h-full bg-[#1e3a8a] animate-pulse w-full" />
          </div>
        )}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleSelectAllPage}
                      className="h-4 w-4 rounded border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a] cursor-pointer"
                      title="Select all students on this page"
                    />
                  </th>
                  <th
                    className="px-4 py-3.5 cursor-pointer hover:text-slate-900 transition-colors"
                    onClick={() => handleHeaderSort('rollNo')}
                    title="Click to sort by Roll No"
                  >
                    Roll No {renderSortIndicator('rollNo')}
                  </th>
                  <th
                    className="px-4 py-3.5 cursor-pointer hover:text-slate-900 transition-colors"
                    onClick={() => handleHeaderSort('name')}
                    title="Click to sort by Name"
                  >
                    Student Name {renderSortIndicator('name')}
                  </th>
                  <th className="px-4 py-3.5">Dept</th>
                  <th className="px-4 py-3.5">Academic Year</th>
                  <th className="px-4 py-3.5">Placement Status</th>
                  <th className="px-4 py-3.5">Company</th>
                  <th
                    className="px-4 py-3.5 cursor-pointer hover:text-slate-900 transition-colors"
                    onClick={() => handleHeaderSort('packageOffered')}
                    title="Click to sort by Package (LPA)"
                  >
                    Package (LPA) {renderSortIndicator('packageOffered')}
                  </th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-slate-200 transition-opacity duration-150 ${tableFetching ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
                {initialLoading && students.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500 font-medium">
                      Loading student records...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500 font-medium">
                      No matching student records found.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => {
                    const isSelected = selectedStudentIds.includes(student.id);
                    return (
                      <tr
                        key={student.id}
                        className={`transition-colors ${isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-3.5 py-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleStudentSelect(student.id)}
                            className="h-4 w-4 rounded border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a] cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-[#1e3a8a]">{student.id}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {student.fullName || '—'}
                          <span className="block text-[10px] text-slate-500 font-normal">
                            {student.user?.email || <span className="italic text-amber-600 font-medium">Pending Email Setup</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 max-w-[140px] truncate font-bold">{student.branch}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px] font-semibold">{student.academicYear || '2024-2028'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={student.placement?.status === 'PLACED' ? 'placed' : 'unplaced'}>
                            {student.placement?.status || 'UNPLACED'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-900 font-bold max-w-[220px]">
                          {(() => {
                            const sortedOffers = student.placementOffers && student.placementOffers.length > 0
                              ? [...student.placementOffers].sort((a: any, b: any) => (b.packageOffered || 0) - (a.packageOffered || 0))
                              : [];
                            const offerCompanies = sortedOffers.length > 0
                              ? sortedOffers.map((o: any) => o.companyName).filter(Boolean)
                              : student.placement?.companyName ? [student.placement.companyName] : [];

                            if (offerCompanies.length === 0) {
                              return <span className="text-slate-400 font-normal italic">—</span>;
                            }

                            if (offerCompanies.length === 1) {
                              return (
                                <span className="truncate block" title={offerCompanies[0]}>
                                  {offerCompanies[0]}
                                </span>
                              );
                            }

                            return (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-extrabold text-[#1e3a8a] text-xs truncate" title={offerCompanies.join(', ')}>
                                  {offerCompanies.join(', ')}
                                </span>
                                <span className="inline-flex items-center w-max px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#1e3a8a] border border-blue-200">
                                  {offerCompanies.length} Offers
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-slate-900 font-extrabold max-w-[160px]">
                          {(() => {
                            const sortedOffers = student.placementOffers && student.placementOffers.length > 0
                              ? [...student.placementOffers].sort((a: any, b: any) => (b.packageOffered || 0) - (a.packageOffered || 0))
                              : [];
                            const offerPackages = sortedOffers.length > 0
                              ? sortedOffers.map((o: any) => o.packageOffered).filter((p: any) => p !== null && p !== undefined)
                              : student.placement?.packageOffered !== null && student.placement?.packageOffered !== undefined
                              ? [student.placement.packageOffered]
                              : [];

                            if (offerPackages.length === 0) {
                              return <span className="text-slate-400 font-normal italic">—</span>;
                            }

                            if (offerPackages.length === 1) {
                              return (
                                <span className="text-emerald-700 font-extrabold font-mono">
                                  {formatPackage(offerPackages[0])}
                                </span>
                              );
                            }

                            return (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-extrabold text-emerald-800 text-xs truncate font-mono" title={offerPackages.map((p: number) => formatPackage(p)).join(', ')}>
                                  {offerPackages.map((p: number) => formatPackage(p)).join(', ')}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openViewDrawer(student)}
                              title="View Full Profile"
                              className="h-7 w-7 text-slate-500 hover:text-blue-900"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(student)}
                              title="Edit Student Info"
                              className="h-7 w-7 text-slate-500 hover:text-amber-700"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => promptDeleteStudent(student)}
                              title="Delete Student Record"
                              className="h-7 w-7 text-slate-500 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Enhanced Pagination Controls Footer */}
          <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50 gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-slate-600 font-medium">
              <div>
                Showing <span className="font-bold text-slate-900">{students.length}</span> of{' '}
                <span className="font-bold text-slate-900">{total}</span> students
              </div>

              {/* Rows Per Page Selector */}
              <div className="flex items-center gap-1.5 sm:pl-3 sm:border-l sm:border-slate-300">
                <span className="text-slate-500 font-semibold">Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-7 rounded-md border border-slate-300 bg-white px-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-800 shadow-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Direct Page Jump Dropdown */}
              <div className="flex items-center gap-1.5 sm:pl-3 sm:border-l sm:border-slate-300">
                <span className="text-slate-500 font-semibold">Jump to:</span>
                <select
                  value={page}
                  onChange={(e) => setPage(Number(e.target.value))}
                  className="h-7 rounded-md border border-slate-300 bg-white px-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-800 shadow-sm"
                >
                  {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((pg) => (
                    <option key={pg} value={pg}>
                      Page {pg} of {totalPages || 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clickable Page Number Buttons & Prev/Next */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="h-7 px-2.5 font-bold border-slate-300 text-xs gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </Button>

              <div className="flex items-center gap-1">
                {(() => {
                  const totalPg = totalPages || 1;
                  const current = page;
                  const pages: (number | string)[] = [];

                  if (totalPg <= 7) {
                    for (let i = 1; i <= totalPg; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    if (current > 3) pages.push('...');
                    const start = Math.max(2, current - 1);
                    const end = Math.min(totalPg - 1, current + 1);
                    for (let i = start; i <= end; i++) {
                      if (!pages.includes(i)) pages.push(i);
                    }
                    if (current < totalPg - 2) pages.push('...');
                    if (!pages.includes(totalPg)) pages.push(totalPg);
                  }

                  return pages.map((p, idx) => {
                    if (p === '...') {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400 font-bold text-xs">
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={`page-${p}`}
                        type="button"
                        onClick={() => setPage(Number(p))}
                        className={`h-7 min-w-[28px] px-2 rounded-lg text-xs font-bold transition-all ${
                          current === p
                            ? 'bg-[#1e3a8a] text-white shadow-sm'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  });
                })()}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="h-7 px-2.5 font-bold border-slate-300 text-xs gap-1"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && studentToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl space-y-4 p-6 text-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Confirm Student Deletion</h3>
                <p className="text-xs text-slate-500">Permanent Action Warning</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete student record for{' '}
              <span className="font-extrabold text-slate-900 font-mono">{studentToDelete.id}</span> (
              <span className="font-bold text-slate-900">{studentToDelete.name}</span>)? This will permanently remove all associated academic history, profile details, and placement offer records.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setStudentToDelete(null);
                }}
                className="text-slate-600 font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs gap-1.5 px-4 shadow-sm"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete Student Record'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ADVANCED EXPORT EXCEL MODAL WITH EXCLUSIVE RADIOS */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl space-y-4 p-6 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-[#1e3a8a] text-base">
                <FileSpreadsheet className="h-5 w-5 text-[#1e3a8a]" />
                Export Student Records to Excel
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsExportModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Choose the export data scope and whether to exclude placement details from the generated spreadsheet.
              </p>

              {/* Exclusive Scope Radio Options */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Select Export Scope:
                </span>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="exportScope"
                    value="all"
                    checked={exportScope === 'all'}
                    onChange={() => setExportScope('all')}
                    className="mt-0.5 h-4 w-4 border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a]"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">
                      All Student Records ({totalSystemCount || total || 5000} Total)
                    </span>
                    <span className="text-slate-500 block text-[11px] mt-0.5">
                      Export all student records stored in the database regardless of active filters.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer border-t border-slate-200/80 pt-3">
                  <input
                    type="radio"
                    name="exportScope"
                    value="filtered"
                    checked={exportScope === 'filtered'}
                    onChange={() => setExportScope('filtered')}
                    className="mt-0.5 h-4 w-4 border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a]"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">
                      Only Filtered Students ({total} Matching)
                    </span>
                    <span className="text-slate-500 block text-[11px] mt-0.5">
                      Export records matching your active search query and multi-select filter criteria.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 border-t border-slate-200/80 pt-3 ${
                    selectedStudentIds.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportScope"
                    value="selected"
                    disabled={selectedStudentIds.length === 0}
                    checked={exportScope === 'selected'}
                    onChange={() => setExportScope('selected')}
                    className="mt-0.5 h-4 w-4 border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a]"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">
                      Only Selected Students ({selectedStudentIds.length} Selected)
                    </span>
                    <span className="text-slate-500 block text-[11px] mt-0.5">
                      Export only the specific student rows checked in the table checkboxes.
                      {selectedStudentIds.length === 0 && ' (Check student rows in table to enable)'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Export Mode Radio Options */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Select Export Dataset Option
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="exportMode"
                    value="master"
                    checked={exportMode === 'master'}
                    onChange={() => setExportMode('master')}
                    className="mt-0.5 h-4 w-4 border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a]"
                  />
                  <div>
                    <span className="font-extrabold text-slate-900 block">Export Master Database</span>
                    <span className="text-slate-500 block text-[11px] mt-0.5">
                      Full Excel spreadsheet containing all student personal, academic, family, and identification details without any placement data.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 border-t border-slate-200/80 pt-3 cursor-pointer">
                  <input
                    type="radio"
                    name="exportMode"
                    value="placement"
                    checked={exportMode === 'placement'}
                    onChange={() => setExportMode('placement')}
                    className="mt-0.5 h-4 w-4 border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a]"
                  />
                  <div>
                    <span className="font-extrabold text-slate-900 block">Export Placement Details</span>
                    <span className="text-slate-500 block text-[11px] mt-0.5">
                      Excel spreadsheet containing import template fields (Roll No, Full Name, Dept, Section, Academic Year, Email) plus complete placement status, company offers, salary packages (LPA), and offer document links.
                    </span>
                  </div>
                </label>
              </div>

              {/* Live Preview Summary */}
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#1e3a8a] shrink-0" />
                <span className="font-semibold text-[11px]">
                  Summary: Generating{' '}
                  <strong className="text-[#1e3a8a]">
                    {exportMode === 'master' ? 'Master Student Database' : 'Placement Details'}
                  </strong>{' '}
                  Excel sheet for{' '}
                  {exportScope === 'selected'
                    ? `${selectedStudentIds.length} selected`
                    : exportScope === 'filtered'
                    ? `${total} filtered`
                    : `all ${totalSystemCount || total || 5000}`}{' '}
                  students.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-600 font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleExecuteExport}
                variant="gradient"
                size="sm"
                className="font-bold text-xs gap-1.5 px-5"
              >
                <Download className="h-4 w-4" />
                Generate & Download Excel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ORGANIZED STUDENT VIEW DRAWER */}
      {isViewDrawerOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="w-full max-w-2xl bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl text-slate-900">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">{selectedStudent.fullName || selectedStudent.id}</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {selectedStudent.id} • {selectedStudent.branch} {selectedStudent.section ? `(Sec ${selectedStudent.section})` : ''} • {selectedStudent.academicYear || '2024-2028'}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsViewDrawerOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* View Drawer Tabs */}
            <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-100/70 p-2 gap-1.5">
              <button
                onClick={() => setViewDrawerTab('personal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  viewDrawerTab === 'personal' ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-slate-600 hover:bg-white/50'
                }`}
              >
                <User className="h-3.5 w-3.5" /> Personal
              </button>
              <button
                onClick={() => setViewDrawerTab('academic')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  viewDrawerTab === 'academic' ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-slate-600 hover:bg-white/50'
                }`}
              >
                <GraduationCap className="h-3.5 w-3.5" /> Academic
              </button>
              <button
                onClick={() => setViewDrawerTab('family')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  viewDrawerTab === 'family' ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-slate-600 hover:bg-white/50'
                }`}
              >
                <Users className="h-3.5 w-3.5" /> Family
              </button>
              <button
                onClick={() => setViewDrawerTab('address')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  viewDrawerTab === 'address' ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-slate-600 hover:bg-white/50'
                }`}
              >
                <Home className="h-3.5 w-3.5" /> Address & ID
              </button>
              <button
                onClick={() => setViewDrawerTab('placement')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  viewDrawerTab === 'placement' ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-slate-600 hover:bg-white/50'
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" /> Placement
              </button>
            </div>

            {/* View Drawer Content Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
              {viewDrawerTab === 'personal' && (
                <div className="space-y-4">
                  <h3 className="font-extrabold text-[#1e3a8a] uppercase tracking-wider text-[11px] border-b pb-1">
                    Personal & Identification Credentials
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-500 block">Roll Number</span>
                      <span className="font-bold font-mono text-slate-900">{selectedStudent.id}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Full Name</span>
                      <span className="font-bold text-slate-900">{selectedStudent.fullName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Full Name (As Per SSC)</span>
                      <span className="font-bold text-slate-900">{selectedStudent.fullNameAsPerSSC || selectedStudent.fullNameSSC || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Given Name</span>
                      <span className="font-bold text-slate-900">{selectedStudent.name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Surname</span>
                      <span className="font-bold text-slate-900">{selectedStudent.surname || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Department / Branch</span>
                      <span className="font-bold text-slate-800">{selectedStudent.branch}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Section</span>
                      <span className="font-bold text-slate-800">{selectedStudent.section ? `Sec ${selectedStudent.section}` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Academic Year</span>
                      <span className="font-bold text-slate-800">{selectedStudent.academicYear || '2024-2028'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Email ID</span>
                      <span className="font-bold font-mono text-slate-900">{selectedStudent.user?.email || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Student Mobile Number</span>
                      <span className="font-bold text-slate-900">{selectedStudent.mobileNo || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Alternate Email ID</span>
                      <span className="font-bold font-mono text-slate-800">{selectedStudent.altEmail || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Emergency Contact</span>
                      <span className="font-bold text-slate-900">{selectedStudent.emergencyContact || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Gender</span>
                      <span className="font-bold text-slate-900">{selectedStudent.gender || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Date of Birth</span>
                      <span className="font-bold text-slate-900">{formatDate(selectedStudent.dob)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Category</span>
                      <span className="font-bold text-slate-900">{selectedStudent.category || '—'}</span>
                    </div>
                  </div>
                </div>
              )}

              {viewDrawerTab === 'academic' && (
                <div className="space-y-4">
                  <h3 className="font-extrabold text-[#1e3a8a] uppercase tracking-wider text-[11px] border-b pb-1">
                    Academic History & Entrance Exam Ranks
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="text-slate-500 block">B.Tech CGPA</span>
                      <span className="font-extrabold text-emerald-700 text-sm">{selectedStudent.btechCGPA ?? 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Active Backlogs</span>
                      <span className="font-bold text-slate-900">{selectedStudent.activeBacklogs ?? 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">10th CGPA / %</span>
                      <span className="font-bold text-slate-900">{selectedStudent.tenthCGPA ?? 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">10th Board Name</span>
                      <span className="font-bold text-slate-900">{selectedStudent.tenthBoard || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">10th School Name</span>
                      <span className="font-bold text-slate-900">{selectedStudent.tenthSchool || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">10th Passing Year</span>
                      <span className="font-bold text-slate-900">{selectedStudent.tenthYear ?? '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Inter / Diploma %</span>
                      <span className="font-bold text-slate-900">{selectedStudent.interDiplomaPercentage ?? 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Inter/Diploma College</span>
                      <span className="font-bold text-slate-900">{selectedStudent.interDiplomaCollege || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">EAMCET Rank</span>
                      <span className="font-bold text-slate-900">{selectedStudent.eamcetRank ?? 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">JEE Rank</span>
                      <span className="font-bold text-slate-900">{selectedStudent.jeeRank ?? 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">ECET Rank</span>
                      <span className="font-bold text-slate-900">{selectedStudent.ecetRank ?? 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              {viewDrawerTab === 'family' && (
                <div className="space-y-4">
                  <h3 className="font-extrabold text-[#1e3a8a] uppercase tracking-wider text-[11px] border-b pb-1">
                    Family Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-500 block">Father's Name</span>
                      <span className="font-bold text-slate-900">{selectedStudent.fatherName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Father Occupation</span>
                      <span className="font-bold text-slate-900">{selectedStudent.fatherOccupation || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Father Working Organization</span>
                      <span className="font-bold text-slate-900">{selectedStudent.fatherOrg || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Mother's Name</span>
                      <span className="font-bold text-slate-900">{selectedStudent.motherName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Mother Maiden Name (Surname)</span>
                      <span className="font-bold text-slate-900">{selectedStudent.motherMaidenName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Mother Occupation</span>
                      <span className="font-bold text-slate-900">{selectedStudent.motherOccupation || '—'}</span>
                    </div>
                  </div>
                </div>
              )}

              {viewDrawerTab === 'address' && (
                <div className="space-y-4">
                  <h3 className="font-extrabold text-[#1e3a8a] uppercase tracking-wider text-[11px] border-b pb-1">
                    Address & Government Identification
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-500 block">Hometown</span>
                      <span className="font-bold text-slate-900">{selectedStudent.hometown || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">District</span>
                      <span className="font-bold text-slate-900">{selectedStudent.district || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">State</span>
                      <span className="font-bold text-slate-900">{selectedStudent.state || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Permanent Address</span>
                      <span className="font-bold text-slate-900">{selectedStudent.permanentAddress || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Current Address</span>
                      <span className="font-bold text-slate-900">{selectedStudent.currentAddress || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">PAN Card Number</span>
                      <span className="font-bold font-mono text-slate-900">{maskPan(selectedStudent.panNumber)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Aadhar Card Number</span>
                      <span className="font-bold font-mono text-slate-900">{maskAadhar(selectedStudent.aadharNumber)}</span>
                    </div>
                  </div>
                </div>
              )}

              {viewDrawerTab === 'placement' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-extrabold text-[#1e3a8a] uppercase tracking-wider text-[11px]">
                      Placement Status & Offer Records
                    </h3>
                    <Badge variant={selectedStudent.placement?.status === 'PLACED' || (selectedStudent.placementOffers && selectedStudent.placementOffers.length > 0) ? 'placed' : 'unplaced'}>
                      {selectedStudent.placement?.status || (selectedStudent.placementOffers && selectedStudent.placementOffers.length > 0 ? 'PLACED' : 'UNPLACED')}
                    </Badge>
                  </div>

                  {(() => {
                    const offers = selectedStudent.placementOffers && selectedStudent.placementOffers.length > 0
                      ? selectedStudent.placementOffers
                      : selectedStudent.placement?.companyName
                      ? [{
                          id: 'primary',
                          companyName: selectedStudent.placement.companyName,
                          jobRole: selectedStudent.placement.jobRole,
                          packageOffered: selectedStudent.placement.packageOffered,
                          dateOfJoining: selectedStudent.placement.dateOfJoining,
                        }]
                      : [];

                    if (offers.length === 0) {
                      return (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-500 text-xs">
                          No active placement offer records found for this student.
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {offers.map((offer: any, idx: number) => (
                          <div key={offer.id || idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-xs text-[#1e3a8a] bg-blue-100 px-2.5 py-0.5 rounded-full">
                                Offer #{idx + 1} {idx === 0 ? '(Primary Offer)' : ''}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="font-extrabold text-emerald-700 text-xs">
                                  {formatPackage(offer.packageOffered)}
                                </span>
                                {offer.id && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteSingleOffer(selectedStudent.id, offer.id)}
                                    className="h-6 px-2 text-red-600 hover:text-red-800 hover:bg-red-50 text-[11px] font-semibold gap-1"
                                  >
                                    <Trash2 className="h-3 w-3" /> Delete
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-slate-500 block">Company Name</span>
                                <span className="font-bold text-slate-900">{offer.companyName}</span>
                              </div>
                              {offer.googleDriveFileId && (
                                <div>
                                  <span className="text-slate-500 block font-bold mb-1">Document Access</span>
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={getOfferLetterViewUrl(offer.googleDriveFileId)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-[#1e3a8a] font-bold hover:underline"
                                    >
                                      <FileText className="h-3.5 w-3.5" /> View
                                    </a>
                                    <a
                                      href={getOfferLetterDownloadUrl(offer.googleDriveFileId)}
                                      download
                                      className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                                    >
                                      <Download className="h-3.5 w-3.5" /> Download
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ORGANIZED FULL STUDENT EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl overflow-hidden max-h-[92vh] flex flex-col shadow-2xl text-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Edit Student Record ({editFormData.rollNo})</h3>
                <p className="text-xs text-slate-500 mt-0.5">Admin Full Profile & Placement Edit Mode</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-100/70 p-2 gap-1.5">
              <button
                type="button"
                onClick={() => setEditModalTab('personal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  editModalTab === 'personal' ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-slate-600 hover:bg-white/50'
                }`}
              >
                <User className="h-3.5 w-3.5" /> Personal & Credentials
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('academic')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  editModalTab === 'academic' ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-slate-600 hover:bg-white/50'
                }`}
              >
                <GraduationCap className="h-3.5 w-3.5" /> Academic Records
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('family')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  editModalTab === 'family' ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-slate-600 hover:bg-white/50'
                }`}
              >
                <Users className="h-3.5 w-3.5" /> Family Details
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('address')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  editModalTab === 'address' ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-slate-600 hover:bg-white/50'
                }`}
              >
                <Home className="h-3.5 w-3.5" /> Address & ID
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('placement')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  editModalTab === 'placement' ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-slate-600 hover:bg-white/50'
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" /> Placement Status
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
                {editModalTab === 'personal' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Roll Number</label>
                        <Input
                          value={editFormData.id}
                          onChange={(e) => setEditFormData({ ...editFormData, id: e.target.value })}
                          required
                          className="bg-slate-50 border-slate-300 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">
                          Full Name <span className="text-red-600 font-bold">*</span>
                        </label>
                        <Input
                          value={editFormData.fullName || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                          required
                          placeholder="e.g. Rahul Kumar Sharma"
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">
                          Full Name (As Per SSC) <span className="text-red-600 font-bold">*</span>
                        </label>
                        <Input
                          value={editFormData.fullNameAsPerSSC || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, fullNameAsPerSSC: e.target.value, fullNameSSC: e.target.value })}
                          required
                          placeholder="e.g. SHARMA RAHUL KUMAR"
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Given Name</label>
                        <Input
                          value={editFormData.name || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                          placeholder="e.g. Rahul"
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Surname</label>
                        <Input
                          value={editFormData.surname || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, surname: e.target.value })}
                          placeholder="e.g. Sharma"
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Department / Branch</label>
                        <select
                          value={editFormData.branch}
                          onChange={(e) => setEditFormData({ ...editFormData, branch: e.target.value })}
                          className="w-full h-10 rounded-lg border border-slate-300 bg-slate-50 px-2 text-slate-900 font-medium"
                        >
                          {DEPARTMENTS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Section</label>
                        <Input
                          placeholder="e.g. A, B, C"
                          value={editFormData.section}
                          onChange={(e) => setEditFormData({ ...editFormData, section: e.target.value.toUpperCase() })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Academic Year</label>
                        <Input
                          placeholder="e.g. 2024-2028"
                          value={editFormData.academicYear}
                          onChange={(e) => setEditFormData({ ...editFormData, academicYear: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Email ID</label>
                        <Input
                          type="email"
                          value={editFormData.email}
                          onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Student Mobile Number</label>
                        <Input
                          value={editFormData.mobileNo}
                          onChange={(e) => setEditFormData({ ...editFormData, mobileNo: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Gender</label>
                        <select
                          value={editFormData.gender}
                          onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                          className="w-full h-10 rounded-lg border border-slate-300 bg-slate-50 px-2 text-slate-900 font-medium"
                        >
                          <option value="">-- Select Gender --</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Date of Birth</label>
                        <Input
                          type="date"
                          value={editFormData.dob}
                          onChange={(e) => setEditFormData({ ...editFormData, dob: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Emergency Contact</label>
                        <Input
                          value={editFormData.emergencyContact}
                          onChange={(e) => setEditFormData({ ...editFormData, emergencyContact: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Category</label>
                        <select
                          value={editFormData.category}
                          onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                          className="w-full h-10 rounded-lg border border-slate-300 bg-slate-50 px-2 text-slate-900 font-medium"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {editModalTab === 'academic' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">B.Tech CGPA</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editFormData.btechCGPA}
                          onChange={(e) => setEditFormData({ ...editFormData, btechCGPA: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Active Backlogs</label>
                        <Input
                          type="number"
                          value={editFormData.activeBacklogs}
                          onChange={(e) => setEditFormData({ ...editFormData, activeBacklogs: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">10th CGPA / %</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editFormData.tenthCGPA}
                          onChange={(e) => setEditFormData({ ...editFormData, tenthCGPA: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">10th Board Name</label>
                        <Input
                          value={editFormData.tenthBoard}
                          onChange={(e) => setEditFormData({ ...editFormData, tenthBoard: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">10th School Name</label>
                        <Input
                          value={editFormData.tenthSchool}
                          onChange={(e) => setEditFormData({ ...editFormData, tenthSchool: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">EAMCET Rank</label>
                        <Input
                          type="number"
                          value={editFormData.eamcetRank}
                          onChange={(e) => setEditFormData({ ...editFormData, eamcetRank: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">JEE Rank</label>
                        <Input
                          type="number"
                          value={editFormData.jeeRank}
                          onChange={(e) => setEditFormData({ ...editFormData, jeeRank: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">ECET Rank</label>
                        <Input
                          type="number"
                          value={editFormData.ecetRank}
                          onChange={(e) => setEditFormData({ ...editFormData, ecetRank: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {editModalTab === 'family' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Father's Name</label>
                        <Input
                          value={editFormData.fatherName}
                          onChange={(e) => setEditFormData({ ...editFormData, fatherName: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Father Occupation</label>
                        <Input
                          value={editFormData.fatherOccupation}
                          onChange={(e) => setEditFormData({ ...editFormData, fatherOccupation: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Father Working Org</label>
                        <Input
                          value={editFormData.fatherOrg}
                          onChange={(e) => setEditFormData({ ...editFormData, fatherOrg: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Mother's Name</label>
                        <Input
                          value={editFormData.motherName}
                          onChange={(e) => setEditFormData({ ...editFormData, motherName: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Mother Maiden Name</label>
                        <Input
                          value={editFormData.motherMaidenName}
                          onChange={(e) => setEditFormData({ ...editFormData, motherMaidenName: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Mother Occupation</label>
                        <Input
                          value={editFormData.motherOccupation}
                          onChange={(e) => setEditFormData({ ...editFormData, motherOccupation: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {editModalTab === 'address' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Hometown</label>
                        <Input
                          value={editFormData.hometown}
                          onChange={(e) => setEditFormData({ ...editFormData, hometown: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">District</label>
                        <Input
                          value={editFormData.district}
                          onChange={(e) => setEditFormData({ ...editFormData, district: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">State</label>
                        <Input
                          value={editFormData.state}
                          onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Permanent Address</label>
                        <Input
                          value={editFormData.permanentAddress}
                          onChange={(e) => setEditFormData({ ...editFormData, permanentAddress: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Current Address</label>
                        <Input
                          value={editFormData.currentAddress}
                          onChange={(e) => setEditFormData({ ...editFormData, currentAddress: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">PAN Card Number</label>
                        <Input
                          value={editFormData.panNumber}
                          onChange={(e) => setEditFormData({ ...editFormData, panNumber: e.target.value.toUpperCase() })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">Aadhar Card Number</label>
                        <Input
                          value={editFormData.aadharNumber}
                          onChange={(e) => setEditFormData({ ...editFormData, aadharNumber: e.target.value })}
                          className="bg-slate-50 border-slate-300"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {editModalTab === 'placement' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div>
                        <h3 className="font-extrabold text-[#1e3a8a] uppercase tracking-wider text-[11px]">
                          Placement Offers Management
                        </h3>
                        <p className="text-[11px] text-slate-500">Manage multiple placement offers for this student</p>
                      </div>
                      <div className="w-44">
                        <select
                          value={editFormData.placementStatus}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            setEditFormData({ ...editFormData, placementStatus: newStatus });
                            if (newStatus === 'PLACED' && editOffers.length === 0) {
                              setEditOffers([{ companyName: '', packageOffered: '' }]);
                            }
                          }}
                          className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-900"
                        >
                          <option value="UNPLACED">UNPLACED</option>
                          <option value="PLACED">PLACED</option>
                        </select>
                      </div>
                    </div>

                    {editFormData.placementStatus === 'UNPLACED' && editOffers.length === 0 ? (
                      <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
                        <p className="text-xs text-slate-500">Student is currently marked as UNPLACED.</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditFormData({ ...editFormData, placementStatus: 'PLACED' });
                            setEditOffers([{ companyName: '', packageOffered: '' }]);
                          }}
                          className="font-bold text-xs gap-1 border-blue-300 text-[#1e3a8a]"
                        >
                          + Add First Placement Offer
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {editOffers.map((offer, idx) => (
                          <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between border-b pb-2">
                              <span className="font-bold text-xs text-[#1e3a8a] flex items-center gap-1.5">
                                <Briefcase className="h-4 w-4" />
                                Offer #{idx + 1} {idx === 0 ? '(Primary Offer)' : ''}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const updated = editOffers.filter((_, i) => i !== idx);
                                  setEditOffers(updated);
                                  if (updated.length === 0) {
                                    setEditFormData({ ...editFormData, placementStatus: 'UNPLACED' });
                                  }
                                }}
                                className="h-7 px-2 text-red-600 hover:text-red-800 hover:bg-red-50 text-xs font-semibold gap-1"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Remove Offer
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-slate-700 font-bold block mb-1">Company Name *</label>
                                <Input
                                  required
                                  placeholder="e.g. Google, Microsoft, TCS"
                                  value={offer.companyName || ''}
                                  onChange={(e) => {
                                    const updated = [...editOffers];
                                    updated[idx].companyName = e.target.value;
                                    setEditOffers(updated);
                                  }}
                                  className="bg-white border-slate-300 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-slate-700 font-bold block mb-1">Package Offered (LPA) *</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="e.g. 14.5"
                                  value={offer.packageOffered ?? ''}
                                  onChange={(e) => {
                                    const updated = [...editOffers];
                                    updated[idx].packageOffered = e.target.value;
                                    setEditOffers(updated);
                                  }}
                                  className="bg-white border-slate-300 text-xs"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-slate-700 font-bold block mb-1">
                                Attach Offer Letter (PDF / Image) {!offer.id || offer.id === 'primary' ? <span className="text-red-600 font-bold">*</span> : ''}
                              </label>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const updated = [...editOffers];
                                    updated[idx].file = file;
                                    setEditOffers(updated);
                                  }
                                }}
                                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#1e3a8a] hover:file:bg-blue-100 cursor-pointer"
                              />
                              {offer.file ? (
                                <p className="text-[11px] text-emerald-700 font-bold mt-1">Attached: {offer.file.name}</p>
                              ) : offer.documentFileName ? (
                                <p className="text-[11px] text-slate-500 mt-1">Uploaded file: {offer.documentFileName}</p>
                              ) : null}
                            </div>
                          </div>
                        ))}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditOffers([...editOffers, { companyName: '', packageOffered: '' }]);
                            setEditFormData({ ...editFormData, placementStatus: 'PLACED' });
                          }}
                          className="w-full py-2.5 font-bold text-xs gap-1.5 border-dashed border-slate-300 hover:border-[#1e3a8a] text-[#1e3a8a]"
                        >
                          + Add Another Placement Offer
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 bg-slate-50">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} variant="gradient" size="sm" className="px-6 font-bold">
                  {isSaving ? 'Saving...' : 'Save All Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INDIVIDUAL STUDENT REGISTRATION MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl text-slate-900 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-[#1e3a8a]" />
                  Add Individual Student Record
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Register new student account with the same attribute fields as the Excel import template
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                disabled={isAddingStudent}
                onClick={() => setIsAddModalOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Roll Number (Student ID) <span className="text-red-600 font-bold">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. 21V91A0501"
                    value={addFormData.rollNo}
                    onChange={(e) => setAddFormData({ ...addFormData, rollNo: e.target.value.toUpperCase() })}
                    className="bg-slate-50 border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Full Name <span className="text-red-600 font-bold">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. Rahul Kumar Sharma"
                    value={addFormData.fullName}
                    onChange={(e) => setAddFormData({ ...addFormData, fullName: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Department / Branch <span className="text-red-600 font-bold">*</span>
                  </label>
                  <select
                    value={addFormData.branch}
                    onChange={(e) => setAddFormData({ ...addFormData, branch: e.target.value as any })}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-slate-50 px-3 text-slate-900 font-medium"
                    required
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">Section</label>
                  <Input
                    placeholder="e.g. A"
                    value={addFormData.section}
                    onChange={(e) => setAddFormData({ ...addFormData, section: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Year Start <span className="text-red-600 font-bold">*</span>
                  </label>
                  <Input
                    required
                    type="number"
                    placeholder="e.g. 2024"
                    value={addFormData.academicYearStart}
                    onChange={(e) => setAddFormData({ ...addFormData, academicYearStart: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Year End <span className="text-red-600 font-bold">*</span>
                  </label>
                  <Input
                    required
                    type="number"
                    placeholder="e.g. 2028"
                    value={addFormData.academicYearEnd}
                    onChange={(e) => setAddFormData({ ...addFormData, academicYearEnd: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="text-slate-700 font-bold block mb-1">Initial Password</label>
                <Input
                  type="password"
                  placeholder="Defaults to RollNo@123 if empty"
                  value={addFormData.password}
                  onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                  className="bg-slate-50 border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-600 font-bold text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isAddingStudent}
                  variant="gradient"
                  size="sm"
                  className="font-bold text-xs gap-1.5 px-6"
                >
                  <UserPlus className="h-4 w-4" />
                  {isAddingStudent ? 'Registering...' : 'Register Student Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK EXCEL IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl space-y-4 p-6 text-slate-900 relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-[#1e3a8a] text-base min-w-0">
                {importing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-[#1e3a8a] shrink-0" />
                    <span className="truncate">Importing Student Accounts...</span>
                  </>
                ) : importSummary ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span className="truncate">Bulk Import Task Completed</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-5 w-5 text-[#1e3a8a] shrink-0" />
                    <span className="truncate">Bulk Import Student Accounts (Excel)</span>
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsImportModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Body */}
            {importing ? (
              /* LIVE IMPORT PROGRESS VIEW */
              <div className="space-y-4 py-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600">Overall Progress</span>
                  <span className="text-[#1e3a8a] text-sm">{importProgress.percentage}%</span>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-[#1e3a8a] to-blue-500 rounded-full transition-all duration-300 ease-out shadow-sm"
                    style={{ width: `${importProgress.percentage}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold tracking-wider uppercase">Current Batch</span>
                    <span className="font-extrabold text-slate-900 text-xs">
                      Batch {importProgress.currentBatch} of {importProgress.totalBatches}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] font-bold tracking-wider uppercase">Records Processed</span>
                    <span className="font-extrabold text-slate-900 text-xs">
                      {importProgress.processed} / {importProgress.total}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 italic bg-blue-50/70 p-3 rounded-xl border border-blue-100 text-center">
                  ⚡ Import is processing in background. You can close this modal at any time.
                </p>

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsImportModalOpen(false)}
                    className="font-bold text-xs"
                  >
                    Run in Background (Close Modal)
                  </Button>
                </div>
              </div>
            ) : importSummary ? (
              /* COMPLETED SUMMARY VIEW */
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                  <div className="flex items-center justify-between font-extrabold text-sm">
                    <span className="text-emerald-800">Accounts Created:</span>
                    <span className="text-emerald-700 text-base">{importSummary.imported}</span>
                  </div>
                  {importSummary.skipped > 0 && (
                    <div className="flex items-center justify-between font-bold text-amber-800 pt-1.5 border-t border-emerald-200/60">
                      <span>Skipped / Duplicates:</span>
                      <span>{importSummary.skipped}</span>
                    </div>
                  )}
                </div>

                {importSummary.errors && importSummary.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        Skipped Records & Error Log ({importSummary.errors.length})
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-3 bg-slate-900 text-amber-300 rounded-xl text-xs font-mono space-y-1 shadow-inner border border-slate-800">
                      {importSummary.errors.map((err: string, i: number) => (
                        <div key={i} className="leading-relaxed border-b border-slate-800/60 pb-1 last:border-b-0">
                          {err}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImportFile(null);
                      dismissImportSummary();
                    }}
                    className="font-bold text-xs"
                  >
                    Import Another File
                  </Button>
                  <Button
                    type="button"
                    variant="gradient"
                    size="sm"
                    onClick={() => {
                      dismissImportSummary();
                      setIsImportModalOpen(false);
                    }}
                    className="font-bold text-xs px-6"
                  >
                    Done / Close Modal
                  </Button>
                </div>
              </div>
            ) : (
              /* INITIAL UPLOAD FORM VIEW */
              <>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Upload an Excel spreadsheet with columns: <span className="font-bold text-[#1e3a8a]">Roll No</span>,{' '}
                  <span className="font-bold text-[#1e3a8a]">Full Name</span>,{' '}
                  <span className="font-bold text-[#1e3a8a]">Dept</span>,{' '}
                  <span className="font-bold text-[#1e3a8a]">Section</span>, and{' '}
                  <span className="font-bold text-[#1e3a8a]">Academic Year</span>.
                </p>

                <div className="flex justify-start">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    className="gap-2 border-slate-300 text-slate-700 hover:text-slate-900 font-bold text-xs"
                  >
                    <Download className="h-4 w-4 text-emerald-600" />
                    Download Excel Template
                  </Button>
                </div>

                <form onSubmit={handleImportSubmit} className="space-y-4 pt-2">
                  {!importFile ? (
                    <label className="border-2 border-dashed border-slate-300 hover:border-[#1e3a8a] rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-blue-50/50 transition-colors cursor-pointer group">
                      <Input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
                        required
                        className="hidden"
                      />
                      <div className="h-12 w-12 rounded-full bg-blue-100 group-hover:bg-blue-200 text-[#1e3a8a] flex items-center justify-center mb-3 transition-colors">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800 group-hover:text-[#1e3a8a]">
                        Click to select Excel file
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Supports .xlsx and .xls formats</p>
                    </label>
                  ) : (
                    <div className="border-2 border-emerald-300/80 bg-emerald-50/70 rounded-xl p-4 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          <FileSpreadsheet className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 truncate">{importFile.name}</p>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                              <CheckCircle2 className="h-3 w-3" /> Ready
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {(importFile.size / 1024).toFixed(1)} KB • Click "Start Import" below
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setImportFile(null);
                          dismissImportSummary();
                        }}
                        className="text-slate-500 hover:text-red-600 hover:bg-red-50 text-xs font-semibold gap-1 shrink-0 ml-2"
                      >
                        <X className="h-4 w-4" />
                        Change File
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsImportModalOpen(false)}
                      className="text-slate-600 font-bold text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!importFile || importing}
                      variant="gradient"
                      size="sm"
                      className="font-bold text-xs gap-1.5 px-5"
                    >
                      <UploadCloud className="h-4 w-4" />
                      Start Import
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
