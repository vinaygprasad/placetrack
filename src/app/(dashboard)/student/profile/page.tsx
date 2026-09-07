'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { DEPARTMENTS } from '@/lib/constants';
import { checkStudentProfileCompleteness } from '@/lib/profile-validation';
import { SensitiveField } from '@/components/ui/sensitive-field';
import {
  User,
  GraduationCap,
  Users,
  Home,
  Save,
  CheckCircle2,
  AlertCircle,
  Edit3,
  MailCheck,
  Lock,
  ShieldCheck,
} from 'lucide-react';

const CATEGORIES = ['General / OC', 'BC-A', 'BC-B', 'BC-C', 'BC-D', 'BC-E', 'SC', 'ST', 'EWS'];

type TabType = 'personal' | 'academic' | 'family' | 'address';

export default function StudentProfilePage() {
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [student, setStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingTab, setSavingTab] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Edit mode state per tab (Default: false = Read-only mode)
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingAcademic, setIsEditingAcademic] = useState(false);
  const [isEditingFamily, setIsEditingFamily] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  // Form Tab States
  const [personalData, setPersonalData] = useState<any>({});
  const [academicData, setAcademicData] = useState<any>({});
  const [familyData, setFamilyData] = useState<any>({});
  const [addressData, setAddressData] = useState<any>({});

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();

      if (meData.authenticated && meData.user.studentId) {
        const res = await fetch(`/api/students/${meData.user.studentId}`);
        const data = await res.json();
        if (res.ok && data.student) {
          const s = data.student;
          setStudent(s);

          // Populate Tab 1: Personal
          setPersonalData({
            fullName: s.fullName || (s.surname ? `${s.name || ''} ${s.surname}`.trim() : s.name) || '',
            fullNameAsPerSSC: s.fullNameAsPerSSC || '',
            name: s.name || '',
            surname: s.surname || '',
            gender: s.gender || '',
            dob: s.dob ? new Date(s.dob).toISOString().slice(0, 10) : '',
            mobileNo: s.mobileNo || '',
            altEmail: s.altEmail || '',
            emergencyContact: s.emergencyContact || '',
            category: s.category || 'General / OC',
          });

          // Populate Tab 2: Academic
          setAcademicData({
            btechCGPA: s.btechCGPA ?? '',
            activeBacklogs: s.activeBacklogs ?? 0,
            tenthCGPA: s.tenthCGPA ?? '',
            tenthYear: s.tenthYear ?? '',
            tenthBoard: s.tenthBoard || '',
            tenthSchool: s.tenthSchool || '',
            interDiplomaPercentage: s.interDiplomaPercentage ?? '',
            interDiplomaBranch: s.interDiplomaBranch || '',
            interDiplomaYear: s.interDiplomaYear ?? '',
            interDiplomaCollege: s.interDiplomaCollege || '',
            interDiplomaBoard: s.interDiplomaBoard || '',
            eamcetRank: s.eamcetRank ?? '',
            jeeRank: s.jeeRank ?? '',
            ecetRank: s.ecetRank ?? '',
          });

          // Populate Tab 3: Family
          setFamilyData({
            fatherName: s.fatherName || '',
            fatherOccupation: s.fatherOccupation || '',
            fatherOrg: s.fatherOrg || '',
            motherName: s.motherName || '',
            motherMaidenName: s.motherMaidenName || '',
            motherOccupation: s.motherOccupation || '',
            motherOrg: s.motherOrg || '',
          });

          // Populate Tab 4: Address & ID
          setAddressData({
            permanentAddress: s.permanentAddress || '',
            hometown: s.hometown || '',
            district: s.district || '',
            state: s.state || '',
            currentAddress: s.currentAddress || '',
            panNumber: s.panNumber || '',
            aadharNumber: s.aadharNumber || '',
          });
        }
      }
    } catch (e) {
      console.error('Error fetching student profile:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const showSuccess = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 6000);
  };

  // Generic Save Handler for individual tabs
  const handleSaveTab = async (tabName: string, payload: Record<string, any>) => {
    if (!student) return;
    setSavingTab(tabName);
    setError(null);
    setNotification(null);

    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message || `${tabName} updated successfully!`);
        setIsEditingPersonal(false);
        setIsEditingAcademic(false);
        setIsEditingFamily(false);
        setIsEditingAddress(false);
        fetchProfile();
      } else {
        setError(data.error || `Failed to update ${tabName.toLowerCase()}.`);
      }
    } catch (e) {
      setError(`Connection error updating ${tabName.toLowerCase()}.`);
    } finally {
      setSavingTab(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1e3a8a]"></div>
      </div>
    );
  }

  if (!student) {
    return <div className="text-red-600 p-4 font-semibold">Student profile record not found.</div>;
  }

  const validation = checkStudentProfileCompleteness(student);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Student Master Database</h1>
        <p className="text-sm text-slate-500 mt-1">
          {student.id} • {student.fullName || (student.surname ? `${student.name || ''} ${student.surname}`.trim() : student.name)}
        </p>
      </div>

      {/* READ-ONLY INSTITUTIONAL CREDENTIALS CARD */}
      <Card className="glass-card bg-white border-slate-200 overflow-hidden shadow-sm">
        <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-3.5 px-6 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#1e3a8a]" />
            <CardTitle className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              Institutional Identification Credentials
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Roll Number</span>
            <span className="text-sm font-extrabold text-[#1e3a8a] font-mono">{student.id}</span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Full Name</span>
            <span className="text-sm font-extrabold text-slate-900">{student.fullName || (student.surname ? `${student.name || ''} ${student.surname}`.trim() : student.name) || student.fullNameAsPerSSC || '—'}</span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Primary Email</span>
            <span className="text-sm font-semibold text-slate-800 font-mono break-all">{student.user?.email || '—'}</span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Department / Branch</span>
            <span className="text-sm font-bold text-slate-800">{student.branch}</span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Section</span>
            <span className="text-sm font-bold text-slate-800">{student.section ? `Sec ${student.section}` : '—'}</span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Academic Year</span>
            <span className="text-sm font-bold text-slate-800">{student.academicYear || '2024-2028'}</span>
          </div>
        </CardContent>
      </Card>

      {/* MANDATORY PROFILE COMPLETENESS ENFORCEMENT BANNER */}
      {!validation.isComplete ? (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-2">
            <span className="flex items-center gap-2 font-extrabold text-amber-900 text-sm">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              MANDATORY PROFILE INCOMPLETE ({validation.completionPercentage}% Completed)
            </span>
            <span className="text-xs bg-amber-200/80 text-amber-900 px-3 py-1 rounded-full font-mono font-bold w-fit">
              {validation.completedMandatory} / {validation.totalMandatory} Fields Completed
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-amber-200/60 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-600 h-full transition-all duration-500 rounded-full"
              style={{ width: `${validation.completionPercentage}%` }}
            />
          </div>

          <p className="text-xs text-amber-800 font-semibold leading-relaxed">
            All required fields marked with an asterisk (<span className="text-red-600 font-bold">*</span>) must be filled in to unlock complete Placement Portal access. Please complete the missing details below.
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-sm">
          <span className="flex items-center gap-2 font-bold text-emerald-800">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            MANDATORY PROFILE 100% COMPLETE & VERIFIED
          </span>
          <span className="bg-emerald-200/80 text-emerald-900 px-3 py-1 rounded-full font-mono font-bold">
            All Required Fields Filled
          </span>
        </div>
      )}

      {notification && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-blue-50 border border-blue-200 text-[#1e3a8a] text-sm animate-fade-in font-medium">
          <MailCheck className="h-5 w-5 shrink-0 text-[#1e3a8a]" />
          <span>{notification}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in font-medium">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* TABS NAVIGATION BAR WITH MISSING FIELD BADGES */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('personal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'personal'
              ? 'bg-blue-50 text-[#1e3a8a] border border-blue-200 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <User className="h-4 w-4" />
          Personal Info
          {validation.missingByTab.personal.length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full ml-1">
              {validation.missingByTab.personal.length} missing
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('academic')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'academic'
              ? 'bg-blue-50 text-[#1e3a8a] border border-blue-200 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          Academic Records
          {validation.missingByTab.academic.length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full ml-1">
              {validation.missingByTab.academic.length} missing
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('family')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'family'
              ? 'bg-blue-50 text-[#1e3a8a] border border-blue-200 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="h-4 w-4" />
          Family Details
          {validation.missingByTab.family.length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full ml-1">
              {validation.missingByTab.family.length} missing
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('address')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'address'
              ? 'bg-blue-50 text-[#1e3a8a] border border-blue-200 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Home className="h-4 w-4" />
          Address & ID
          {validation.missingByTab.address.length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full ml-1">
              {validation.missingByTab.address.length} missing
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: PERSONAL INFO */}
      {activeTab === 'personal' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveTab('Personal Information', personalData);
          }}
        >
          <Card className="glass-card bg-white border-slate-200 shadow-md">
            <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2 text-slate-900 font-bold">
                  <User className="h-5 w-5 text-[#1e3a8a]" />
                  Personal Information
                </CardTitle>
                <CardDescription className="text-slate-500 mt-0.5">
                  Basic student details, contact emails, mobile numbers, and category
                </CardDescription>
              </div>

              {!isEditingPersonal ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingPersonal(true)}
                  className="gap-1.5 font-bold border-slate-300 text-[#1e3a8a] hover:bg-blue-50 shrink-0"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingPersonal(false)}
                    className="text-slate-600 font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={savingTab === 'Personal Information'}
                    variant="gradient"
                    size="sm"
                    className="gap-1.5 font-bold px-4"
                  >
                    <Save className="h-4 w-4" />
                    {savingTab === 'Personal Information' ? 'Saving...' : 'Save Personal Info'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4 text-xs pt-4">
              {/* Row 1: Student Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Full Name (As Per SSC) <span className="text-red-600 font-bold">*</span>
                  </label>
                  <Input
                    placeholder="e.g. SHARMA RAHUL KUMAR"
                    value={personalData.fullNameAsPerSSC || ''}
                    onChange={(e) => setPersonalData({ ...personalData, fullNameAsPerSSC: e.target.value })}
                    disabled={!isEditingPersonal}
                    required
                    className="bg-slate-50 border-slate-300 font-medium"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Given Name <span className="text-red-600 font-bold">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Rahul"
                    value={personalData.name || ''}
                    onChange={(e) => setPersonalData({ ...personalData, name: e.target.value })}
                    disabled={!isEditingPersonal}
                    required
                    className="bg-slate-50 border-slate-300 font-medium"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Surname <span className="text-red-600 font-bold">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Sharma"
                    value={personalData.surname || ''}
                    onChange={(e) => setPersonalData({ ...personalData, surname: e.target.value })}
                    disabled={!isEditingPersonal}
                    required
                    className="bg-slate-50 border-slate-300 font-medium"
                  />
                </div>
              </div>

              {/* Row 2: Demographics & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Gender <span className="text-red-600 font-bold">*</span>
                  </label>
                  <select
                    value={personalData.gender}
                    onChange={(e) => setPersonalData({ ...personalData, gender: e.target.value })}
                    disabled={!isEditingPersonal}
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 disabled:opacity-80 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">-- Select Gender --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Date of Birth <span className="text-red-600 font-bold">*</span>
                  </label>
                  <Input
                    type="date"
                    value={personalData.dob}
                    onChange={(e) => setPersonalData({ ...personalData, dob: e.target.value })}
                    disabled={!isEditingPersonal}
                    required
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Category (OC, BC-A, SC, ST...) <span className="text-red-600 font-bold">*</span>
                  </label>
                  <select
                    value={personalData.category}
                    onChange={(e) => setPersonalData({ ...personalData, category: e.target.value })}
                    disabled={!isEditingPersonal}
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 disabled:opacity-80 disabled:cursor-not-allowed"
                    required
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Contact & Emergency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Student Mobile Number <span className="text-red-600 font-bold">*</span>
                  </label>
                  <Input
                    value={personalData.mobileNo}
                    onChange={(e) => setPersonalData({ ...personalData, mobileNo: e.target.value })}
                    disabled={!isEditingPersonal}
                    required
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Emergency Contact Number (Parent Mobile) <span className="text-red-600 font-bold">*</span>
                  </label>
                  <Input
                    value={personalData.emergencyContact}
                    onChange={(e) => setPersonalData({ ...personalData, emergencyContact: e.target.value })}
                    disabled={!isEditingPersonal}
                    required
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Alternate Email ID
                  </label>
                  <Input
                    type="email"
                    value={personalData.altEmail}
                    onChange={(e) => setPersonalData({ ...personalData, altEmail: e.target.value })}
                    disabled={!isEditingPersonal}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* TAB 2: ACADEMIC RECORDS */}
      {activeTab === 'academic' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveTab('Academic Records', academicData);
          }}
        >
          <Card className="glass-card bg-white border-slate-200 shadow-md">
            <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2 text-slate-900 font-bold">
                  <GraduationCap className="h-5 w-5 text-[#1e3a8a]" />
                  Academic Records
                </CardTitle>
                <CardDescription className="text-slate-500 mt-0.5">B.Tech, 10th, Diploma/Inter, and Entrance Exam Ranks</CardDescription>
              </div>

              {!isEditingAcademic ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingAcademic(true)}
                  className="gap-1.5 font-bold border-slate-300 text-[#1e3a8a] hover:bg-blue-50 shrink-0"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingAcademic(false)}
                    className="text-slate-600 font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={savingTab === 'Academic Records'}
                    variant="gradient"
                    size="sm"
                    className="gap-1.5 font-bold px-4"
                  >
                    <Save className="h-4 w-4" />
                    {savingTab === 'Academic Records' ? 'Saving...' : 'Save Academic Info'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6 text-xs pt-4">
              {/* B.Tech & Backlogs */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#1e3a8a] uppercase tracking-wider text-[11px]">B.Tech Academic Status</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">
                      B.Tech CGPA Till Date
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 8.4"
                      value={academicData.btechCGPA}
                      onChange={(e) => setAcademicData({ ...academicData, btechCGPA: e.target.value })}
                      disabled={!isEditingAcademic}
                      className="bg-slate-50 border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">
                      Number of Active Backlogs
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={academicData.activeBacklogs}
                      onChange={(e) => setAcademicData({ ...academicData, activeBacklogs: e.target.value })}
                      disabled={!isEditingAcademic}
                      className="bg-slate-50 border-slate-300"
                    />
                  </div>
                </div>
              </div>

              {/* 10th Details */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="font-bold text-[#1e3a8a] uppercase tracking-wider text-[11px]">10th Standard Academic History</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">
                      10th CGPA / Percentage <span className="text-red-600 font-bold">*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 9.5"
                      value={academicData.tenthCGPA}
                      onChange={(e) => setAcademicData({ ...academicData, tenthCGPA: e.target.value })}
                      disabled={!isEditingAcademic}
                      required
                      className="bg-slate-50 border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">
                      10th Year of Passing <span className="text-red-600 font-bold">*</span>
                    </label>
                    <Input
                      type="number"
                      placeholder="2019"
                      value={academicData.tenthYear}
                      onChange={(e) => setAcademicData({ ...academicData, tenthYear: e.target.value })}
                      disabled={!isEditingAcademic}
                      required
                      className="bg-slate-50 border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">
                      10th Board Name <span className="text-red-600 font-bold">*</span>
                    </label>
                    <Input
                      placeholder="e.g. SSC / CBSE"
                      value={academicData.tenthBoard}
                      onChange={(e) => setAcademicData({ ...academicData, tenthBoard: e.target.value })}
                      disabled={!isEditingAcademic}
                      required
                      className="bg-slate-50 border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">
                      10th School Name <span className="text-red-600 font-bold">*</span>
                    </label>
                    <Input
                      placeholder="School Name"
                      value={academicData.tenthSchool}
                      onChange={(e) => setAcademicData({ ...academicData, tenthSchool: e.target.value })}
                      disabled={!isEditingAcademic}
                      required
                      className="bg-slate-50 border-slate-300"
                    />
                  </div>
                </div>
              </div>

              {/* Intermediate / Diploma Details */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="font-bold text-[#1e3a8a] uppercase tracking-wider text-[11px]">Intermediate / Diploma Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">
                      Inter / Diploma % or CGPA <span className="text-red-600 font-bold">*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 92.5"
                      value={academicData.interDiplomaPercentage}
                      onChange={(e) => setAcademicData({ ...academicData, interDiplomaPercentage: e.target.value })}
                      disabled={!isEditingAcademic}
                      required
                      className="bg-slate-50 border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">
                      Inter/Diploma Branch <span className="text-red-600 font-bold">*</span>
                    </label>
                    <Input
                      placeholder="e.g. ECE / CME / MPC"
                      value={academicData.interDiplomaBranch}
                      onChange={(e) => setAcademicData({ ...academicData, interDiplomaBranch: e.target.value })}
                      disabled={!isEditingAcademic}
                      required
                      className="bg-slate-50 border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">
                      Inter / Diploma Year of Passing <span className="text-red-600 font-bold">*</span>
                    </label>
                    <Input
                      type="number"
                      placeholder="2021"
                      value={academicData.interDiplomaYear}
                      onChange={(e) => setAcademicData({ ...academicData, interDiplomaYear: e.target.value })}
                      disabled={!isEditingAcademic}
                      required
                      className="bg-slate-50 border-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">
                      Inter / Diploma College Name <span className="text-red-600 font-bold">*</span>
                    </label>
                    <Input
                      placeholder="Junior College / Polytechnic Name"
                      value={academicData.interDiplomaCollege}
                      onChange={(e) => setAcademicData({ ...academicData, interDiplomaCollege: e.target.value })}
                      disabled={!isEditingAcademic}
                      required
                      className="bg-slate-50 border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">
                      Inter / Diploma Board <span className="text-red-600 font-bold">*</span>
                    </label>
                    <Input
                      placeholder="e.g. TSBIE / SBTET"
                      value={academicData.interDiplomaBoard}
                      onChange={(e) => setAcademicData({ ...academicData, interDiplomaBoard: e.target.value })}
                      disabled={!isEditingAcademic}
                      required
                      className="bg-slate-50 border-slate-300"
                    />
                  </div>
                </div>
              </div>

              {/* Entrance Ranks */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="font-bold text-[#1e3a8a] uppercase tracking-wider text-[11px]">
                  Competitive Entrance Exam Ranks
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">EAMCET Rank</label>
                    <Input
                      type="number"
                      placeholder="Rank"
                      value={academicData.eamcetRank}
                      onChange={(e) => setAcademicData({ ...academicData, eamcetRank: e.target.value })}
                      disabled={!isEditingAcademic}
                      className="bg-slate-50 border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">JEE Rank</label>
                    <Input
                      type="number"
                      placeholder="Rank"
                      value={academicData.jeeRank}
                      onChange={(e) => setAcademicData({ ...academicData, jeeRank: e.target.value })}
                      disabled={!isEditingAcademic}
                      className="bg-slate-50 border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">ECET Rank</label>
                    <Input
                      type="number"
                      placeholder="Rank"
                      value={academicData.ecetRank}
                      onChange={(e) => setAcademicData({ ...academicData, ecetRank: e.target.value })}
                      disabled={!isEditingAcademic}
                      className="bg-slate-50 border-slate-300"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* TAB 3: FAMILY DETAILS */}
      {activeTab === 'family' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveTab('Family Information', familyData);
          }}
        >
          <Card className="glass-card bg-white border-slate-200 shadow-md">
            <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2 text-slate-900 font-bold">
                  <Users className="h-5 w-5 text-[#1e3a8a]" />
                  Family Details
                </CardTitle>
                <CardDescription className="text-slate-500 mt-0.5">Father and Mother details, occupations, and organizations</CardDescription>
              </div>

              {!isEditingFamily ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingFamily(true)}
                  className="gap-1.5 font-bold border-slate-300 text-[#1e3a8a] hover:bg-blue-50 shrink-0"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingFamily(false)}
                    className="text-slate-600 font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={savingTab === 'Family Information'}
                    variant="gradient"
                    size="sm"
                    className="gap-1.5 font-bold px-4"
                  >
                    <Save className="h-4 w-4" />
                    {savingTab === 'Family Information' ? 'Saving...' : 'Save Family Info'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4 text-xs pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Father's Name <span className="text-red-600 font-bold">*</span>
                  </label>
                  <Input
                    value={familyData.fatherName}
                    onChange={(e) => setFamilyData({ ...familyData, fatherName: e.target.value })}
                    disabled={!isEditingFamily}
                    required
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Father Occupation
                  </label>
                  <Input
                    value={familyData.fatherOccupation}
                    onChange={(e) => setFamilyData({ ...familyData, fatherOccupation: e.target.value })}
                    disabled={!isEditingFamily}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Father Working Organization
                  </label>
                  <Input
                    value={familyData.fatherOrg}
                    onChange={(e) => setFamilyData({ ...familyData, fatherOrg: e.target.value })}
                    disabled={!isEditingFamily}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Mother Name <span className="text-red-600 font-bold">*</span>
                  </label>
                  <Input
                    value={familyData.motherName}
                    onChange={(e) => setFamilyData({ ...familyData, motherName: e.target.value })}
                    disabled={!isEditingFamily}
                    required
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Mother Maiden Name (Surname) <span className="text-red-600 font-bold">*</span>
                  </label>
                  <Input
                    value={familyData.motherMaidenName}
                    onChange={(e) => setFamilyData({ ...familyData, motherMaidenName: e.target.value })}
                    disabled={!isEditingFamily}
                    required
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Mother Occupation
                  </label>
                  <Input
                    value={familyData.motherOccupation}
                    onChange={(e) => setFamilyData({ ...familyData, motherOccupation: e.target.value })}
                    disabled={!isEditingFamily}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Mother Working Organization
                  </label>
                  <Input
                    value={familyData.motherOrg}
                    onChange={(e) => setFamilyData({ ...familyData, motherOrg: e.target.value })}
                    disabled={!isEditingFamily}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* TAB 4: ADDRESS & IDENTIFICATION */}
      {activeTab === 'address' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveTab('Address & Identification', addressData);
          }}
        >
          <Card className="glass-card bg-white border-slate-200 shadow-md">
            <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2 text-slate-900 font-bold">
                  <Home className="h-5 w-5 text-[#1e3a8a]" />
                  Address & Identification Details
                </CardTitle>
                <CardDescription className="text-slate-500 mt-0.5">Permanent address, current address, hometown, PAN and Aadhar details</CardDescription>
              </div>

              {!isEditingAddress ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingAddress(true)}
                  className="gap-1.5 font-bold border-slate-300 text-[#1e3a8a] hover:bg-blue-50 shrink-0"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingAddress(false)}
                    className="text-slate-600 font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={savingTab === 'Address & Identification'}
                    variant="gradient"
                    size="sm"
                    className="gap-1.5 font-bold px-4"
                  >
                    <Save className="h-4 w-4" />
                    {savingTab === 'Address & Identification' ? 'Saving...' : 'Save Address & ID'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4 text-xs pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Hometown <span className="text-red-600 font-bold">*</span>
                  </label>
                  <Input
                    value={addressData.hometown}
                    onChange={(e) => setAddressData({ ...addressData, hometown: e.target.value })}
                    disabled={!isEditingAddress}
                    required
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Student District <span className="text-red-600 font-bold">*</span>
                  </label>
                  <Input
                    value={addressData.district}
                    onChange={(e) => setAddressData({ ...addressData, district: e.target.value })}
                    disabled={!isEditingAddress}
                    required
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Student State <span className="text-red-600 font-bold">*</span>
                  </label>
                  <Input
                    value={addressData.state}
                    onChange={(e) => setAddressData({ ...addressData, state: e.target.value })}
                    disabled={!isEditingAddress}
                    required
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Student Permanent Address <span className="text-red-600 font-bold">*</span>
                  </label>
                  <Input
                    value={addressData.permanentAddress}
                    onChange={(e) => setAddressData({ ...addressData, permanentAddress: e.target.value })}
                    disabled={!isEditingAddress}
                    required
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Student Current Address <span className="text-red-600 font-bold">*</span>
                  </label>
                  <Input
                    value={addressData.currentAddress}
                    onChange={(e) => setAddressData({ ...addressData, currentAddress: e.target.value })}
                    disabled={!isEditingAddress}
                    required
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    PAN Number
                  </label>
                  {isEditingAddress ? (
                    <SensitiveField
                      type="pan"
                      mode="edit"
                      value={addressData.panNumber}
                      onChange={(val) => setAddressData({ ...addressData, panNumber: val })}
                      placeholder="Apply immediately if not having"
                    />
                  ) : (
                    <div className="py-2.5 px-3 rounded-lg bg-slate-50 border border-slate-300 min-h-[38px] flex items-center">
                      <SensitiveField
                        type="pan"
                        mode="view"
                        value={addressData.panNumber}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">
                    Aadhar Card Number
                  </label>
                  {isEditingAddress ? (
                    <SensitiveField
                      type="aadhar"
                      mode="edit"
                      value={addressData.aadharNumber}
                      onChange={(val) => setAddressData({ ...addressData, aadharNumber: val })}
                      placeholder="Apply immediately if not having"
                    />
                  ) : (
                    <div className="py-2.5 px-3 rounded-lg bg-slate-50 border border-slate-300 min-h-[38px] flex items-center">
                      <SensitiveField
                        type="aadhar"
                        mode="view"
                        value={addressData.aadharNumber}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
