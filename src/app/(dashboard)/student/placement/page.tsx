'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { formatPackage, getOfferLetterViewUrl, getOfferLetterDownloadUrl } from '@/lib/utils';
import { DOCUMENT_TYPES } from '@/lib/constants';
import { checkStudentProfileCompleteness } from '@/lib/profile-validation';
import {
  Building2,
  Plus,
  FileText,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  X,
  Briefcase,
  FileCheck,
  User,
  Edit,
  Download,
} from 'lucide-react';

export default function StudentPlacementPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [student, setStudent] = useState<any | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isIncompleteModalOpen, setIsIncompleteModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [packageOffered, setPackageOffered] = useState('');
  const [documentType, setDocumentType] = useState('OL');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Edit Offer Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editPackageOffered, setEditPackageOffered] = useState('');
  const [editDocumentType, setEditDocumentType] = useState('OL');
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();

      if (meData.authenticated && meData.user.studentId) {
        setStudentId(meData.user.studentId);
        
        const [studentRes, offersRes] = await Promise.all([
          fetch(`/api/students/${meData.user.studentId}`),
          fetch(`/api/students/${meData.user.studentId}/offers`),
        ]);

        const studentData = await studentRes.json();
        const offersData = await offersRes.json();

        if (studentRes.ok && studentData.student) {
          setStudent(studentData.student);
        }
        if (offersRes.ok) {
          setOffers(offersData.offers || []);
        }
      }
    } catch (e) {
      console.error('Failed to load placement offers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png)$/i)) {
        setError('Only PDF, JPG, and PNG files are allowed.');
        if (isEdit) setEditSelectedFile(null); else setSelectedFile(null);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be 5MB or less.');
        if (isEdit) setEditSelectedFile(null); else setSelectedFile(null);
        return;
      }
      setError(null);
      if (isEdit) setEditSelectedFile(file); else setSelectedFile(file);
    }
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !packageOffered || !selectedFile || !studentId) return;

    setSubmitting(true);
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.append('companyName', companyName);
    formData.append('packageOffered', packageOffered);
    formData.append('documentType', documentType);
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`/api/students/${studentId}/offers`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Placement offer added successfully!');
        setIsAddModalOpen(false);
        setCompanyName('');
        setPackageOffered('');
        setSelectedFile(null);
        setDocumentType('OL');
        fetchOffers();
      } else {
        setError(data.error || 'Failed to save offer.');
      }
    } catch (e) {
      setError('Connection error saving offer.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (off: any) => {
    setEditingOfferId(off.id);
    setEditCompanyName(off.companyName);
    setEditPackageOffered(off.packageOffered?.toString() || '');
    setEditDocumentType(off.documentType || 'OL');
    setEditSelectedFile(null);
    setError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOfferId || !editCompanyName || !editPackageOffered || !studentId) return;

    setEditSubmitting(true);
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.append('offerId', editingOfferId);
    formData.append('companyName', editCompanyName);
    formData.append('packageOffered', editPackageOffered);
    formData.append('documentType', editDocumentType);
    if (editSelectedFile) {
      formData.append('file', editSelectedFile);
    }

    try {
      const res = await fetch(`/api/students/${studentId}/offers`, {
        method: 'PATCH',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Placement offer updated successfully!');
        setIsEditModalOpen(false);
        setEditingOfferId(null);
        setEditSelectedFile(null);
        fetchOffers();
      } else {
        setError(data.error || 'Failed to update offer.');
      }
    } catch (e) {
      setError('Connection error updating offer.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteOffer = async (offerId: string, company: string) => {
    if (!studentId || !confirm(`Are you sure you want to delete offer from ${company}?`)) return;

    try {
      const res = await fetch(`/api/students/${studentId}/offers?offerId=${offerId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMessage(`Offer from ${company} removed.`);
        fetchOffers();
      } else {
        setError('Failed to delete offer.');
      }
    } catch (e) {
      setError('Error deleting offer.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1e3a8a]"></div>
      </div>
    );
  }

  const validation = checkStudentProfileCompleteness(student);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Student Placement Details</h1>
        <p className="text-sm text-slate-500 mt-1">Offers Management & Verification</p>
      </div>

      {/* MANDATORY PROFILE COMPLETENESS WARNING */}
      {!validation.isComplete && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-extrabold text-amber-900 text-sm">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <span>MANDATORY PROFILE INCOMPLETE ({validation.completionPercentage}% Completed)</span>
          </div>
          <p className="text-xs text-amber-800 font-medium leading-relaxed">
            You must complete all required profile fields marked with an asterisk (<span className="text-red-600 font-bold">*</span>) in <strong>My Profile</strong> before you can add new placement offers.
          </p>
          <div>
            <Link href="/student/profile">
              <Button variant="gradient" size="sm" className="gap-2 font-bold px-4">
                <User className="h-4 w-4" />
                Complete My Profile Now
              </Button>
            </Link>
          </div>
        </div>
      )}

      {message && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* PLACEMENT – OFFERS RECEIVED TABLE */}
      <Card className="glass-card bg-white border-slate-200 overflow-hidden shadow-md">
        <CardHeader className="border-b border-slate-200 pb-4">
          <CardTitle className="text-base flex items-center gap-2 font-bold text-slate-900">
            <Briefcase className="h-5 w-5 text-[#1e3a8a]" />
            Placement – Offers Received
          </CardTitle>
          <CardDescription className="text-slate-500 mt-0.5">
            Student can add multiple offers. All saved offers are listed in the table below.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Offer</th>
                  <th className="px-4 py-3.5">Employer / Company</th>
                  <th className="px-4 py-3.5">Salary Package (LPA)</th>
                  <th className="px-4 py-3.5">Document Access</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {offers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500 space-y-3">
                      <div className="h-12 w-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-500">
                        <UploadCloud className="h-6 w-6 text-[#1e3a8a]" />
                      </div>
                      <p className="font-bold text-slate-800 text-sm">No placement offers recorded yet</p>
                      <p className="text-xs text-slate-500">Click the button below to record your placement offer.</p>
                      <div className="pt-2">
                        <Button
                          variant="gradient"
                          size="sm"
                          onClick={() => {
                            if (!validation.isComplete) {
                              setIsIncompleteModalOpen(true);
                              return;
                            }
                            setError(null);
                            setIsAddModalOpen(true);
                          }}
                          className="gap-2 font-bold px-5"
                        >
                          <Plus className="h-4 w-4" />
                          Add Offer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  offers.map((off, idx) => (
                    <tr key={off.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-[#1e3a8a]">Offer {idx + 1}</td>
                      <td className="px-4 py-3.5 font-extrabold text-slate-900 text-sm">{off.companyName}</td>
                      <td className="px-4 py-3.5 font-extrabold text-emerald-700 text-sm">
                        {formatPackage(off.packageOffered)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <a
                            href={getOfferLetterViewUrl(off.googleDriveFileId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-[#1e3a8a] border border-blue-200 hover:bg-blue-100 font-bold text-xs"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            View
                          </a>
                          <a
                            href={getOfferLetterDownloadUrl(off.googleDriveFileId)}
                            download
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(off)}
                          title="Edit Offer"
                          className="h-8 w-8 text-slate-600 hover:text-[#1e3a8a] hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteOffer(off.id, off.companyName)}
                          title="Delete Offer"
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {offers.length > 0 && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <Button
                variant="gradient"
                size="sm"
                onClick={() => {
                  if (!validation.isComplete) {
                    setIsIncompleteModalOpen(true);
                    return;
                  }
                  setError(null);
                  setIsAddModalOpen(true);
                }}
                className="gap-2 font-bold px-5"
              >
                <Plus className="h-4 w-4" />
                Add Offer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ADD NEW OFFER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-slate-900">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#1e3a8a]" />
                ADD NEW OFFER
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsAddModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSaveOffer} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              <div className="space-y-3">
                <h4 className="font-bold text-slate-600 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1">
                  EMPLOYER DETAILS
                </h4>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Name of Employer / Company *</label>
                  <Input
                    placeholder="Enter Company Name (e.g. ABC Technologies / TCS)"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-600 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1">
                  COMPENSATION
                </h4>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Salary Package (LPA) *</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Enter Package (e.g., 6.0)"
                    value={packageOffered}
                    onChange={(e) => setPackageOffered(e.target.value)}
                    required
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-600 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1">
                  OFFER DOCUMENT
                </h4>
                <div>
                  <label className="text-slate-700 font-bold block mb-2">Document Type *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DOCUMENT_TYPES.map((doc) => (
                      <label
                        key={doc.code}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          documentType === doc.code
                            ? 'bg-blue-50 text-[#1e3a8a] border-blue-300 font-extrabold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="documentType"
                          value={doc.code}
                          checked={documentType === doc.code}
                          onChange={(e) => setDocumentType(e.target.value)}
                          className="accent-[#1e3a8a]"
                        />
                        <span>{doc.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">Upload Document (PDF / JPG / PNG) *</label>
                  {selectedFile ? (
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 animate-fade-in shadow-sm">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-10 w-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0 text-emerald-700">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-xs text-slate-900 truncate">{selectedFile.name}</p>
                          <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                            {(selectedFile.size / 1024).toFixed(1)} KB • Document Selected
                          </p>
                        </div>
                      </div>
                      <label
                        htmlFor="offer-file-input"
                        className="px-3 py-1.5 rounded-lg bg-white border border-emerald-400 text-emerald-800 hover:bg-emerald-100 text-xs font-bold shrink-0 ml-2 cursor-pointer shadow-xs"
                      >
                        Change File
                      </label>
                      <input
                        type="file"
                        id="offer-file-input"
                        accept="application/pdf,image/jpeg,image/png"
                        onChange={(e) => handleFileChange(e, false)}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        id="offer-file-input"
                        accept="application/pdf,image/jpeg,image/png"
                        onChange={(e) => handleFileChange(e, false)}
                        required
                        className="hidden"
                      />
                      <label
                        htmlFor="offer-file-input"
                        className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-blue-50/50 hover:border-[#1e3a8a] cursor-pointer transition-all text-center group"
                      >
                        <UploadCloud className="h-8 w-8 text-[#1e3a8a] mb-2 group-hover:scale-110 transition-transform" />
                        <span className="font-extrabold text-xs text-[#1e3a8a]">Click to Select Offer Document</span>
                        <span className="text-[11px] text-slate-500 mt-1">Accepted Formats: PDF, JPG, PNG (Max 5 MB)</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-200">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || !selectedFile} variant="gradient" className="gap-2 px-6 font-bold">
                  <FileCheck className="h-4 w-4" />
                  {submitting ? 'Saving Offer...' : 'Save Offer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT OFFER MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-slate-900">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Edit className="h-5 w-5 text-[#1e3a8a]" />
                EDIT PLACEMENT OFFER
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleUpdateOffer} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              <div className="space-y-3">
                <h4 className="font-bold text-slate-600 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1">
                  EMPLOYER DETAILS
                </h4>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Name of Employer / Company *</label>
                  <Input
                    placeholder="Enter Company Name"
                    value={editCompanyName}
                    onChange={(e) => setEditCompanyName(e.target.value)}
                    required
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-600 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1">
                  COMPENSATION
                </h4>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Salary Package (LPA) *</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Enter Package (e.g. 6.0)"
                    value={editPackageOffered}
                    onChange={(e) => setEditPackageOffered(e.target.value)}
                    required
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-600 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1">
                  OFFER DOCUMENT (OPTIONAL REPLACEMENT)
                </h4>
                <div>
                  <label className="text-slate-700 font-bold block mb-2">Document Type *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DOCUMENT_TYPES.map((doc) => (
                      <label
                        key={doc.code}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          editDocumentType === doc.code
                            ? 'bg-blue-50 text-[#1e3a8a] border-blue-300 font-extrabold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="editDocumentType"
                          value={doc.code}
                          checked={editDocumentType === doc.code}
                          onChange={(e) => setEditDocumentType(e.target.value)}
                          className="accent-[#1e3a8a]"
                        />
                        <span>{doc.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">Replace Document File (Optional)</label>
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    onChange={(e) => handleFileChange(e, true)}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#1e3a8a] hover:file:bg-blue-100 cursor-pointer"
                  />
                  {editSelectedFile && (
                    <p className="text-[11px] text-emerald-700 font-bold mt-1">New File Selected: {editSelectedFile.name}</p>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-200">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editSubmitting} variant="gradient" className="gap-2 px-6 font-bold">
                  <FileCheck className="h-4 w-4" />
                  {editSubmitting ? 'Updating Offer...' : 'Update Offer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY PROFILE INCOMPLETE WARNING MODAL */}
      {isIncompleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl space-y-5 text-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Mandatory Profile Incomplete</h3>
                <p className="text-xs text-amber-700 font-semibold">
                  {validation.completedMandatory} of {validation.totalMandatory} required fields completed ({validation.completionPercentage}%)
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Please complete all required profile details marked with an asterisk (<span className="text-red-600 font-bold">*</span>) in <strong>My Profile</strong> before adding new placement offers.
            </p>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsIncompleteModalOpen(false)}
                className="border-slate-300 text-slate-700 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="gradient"
                size="sm"
                onClick={() => {
                  setIsIncompleteModalOpen(false);
                  router.push('/student/profile');
                }}
                className="gap-2 font-bold px-4"
              >
                <User className="h-4 w-4" />
                OK / Go to Profile
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
