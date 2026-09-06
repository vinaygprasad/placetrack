'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertModal } from '@/components/ui/alert-modal';
import { ShieldCheck, Plus, UserCheck, CheckCircle2 } from 'lucide-react';

export default function AdminAccountsPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Modal alert state
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

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admins');
      const data = await res.json();
      if (res.ok) {
        // Filter out Super Admin accounts so only standard Admins are displayed
        const standardAdmins = (data.admins || []).filter((a: any) => a.role === 'ADMIN');
        setAdmins(standardAdmins);
      }
    } catch (e) {
      console.error('Failed to load admin list:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpId.trim() || !newEmail.trim() || !newPassword.trim()) {
      showAlert('All three fields (Employee ID, Email, and Password) are mandatory.', 'warning', 'Missing Information');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empId: newEmpId.trim(), email: newEmail.trim(), password: newPassword, role: 'ADMIN' }),
      });

      const data = await res.json();
      if (res.ok) {
        setNewEmpId('');
        setNewEmail('');
        setNewPassword('');
        fetchAdmins();
        setNotification(`Admin account created for Employee ID: ${data.admin.id} (${data.admin.email})`);
        setTimeout(() => setNotification(null), 4000);
      } else {
        showAlert(data.error || 'Failed to create admin account.', 'error', 'Error Creating Admin');
      }
    } catch (e) {
      showAlert('Error creating admin user. Please try again.', 'error', 'Server Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (adminId: string, currentActiveStatus: boolean) => {
    try {
      const res = await fetch(`/api/admins/${adminId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActiveStatus }),
      });

      if (res.ok) {
        fetchAdmins();
        setNotification(`Admin status updated.`);
        setTimeout(() => setNotification(null), 4000);
      } else {
        const data = await res.json();
        showAlert(data.error || 'Failed to update admin status.', 'error', 'Update Failed');
      }
    } catch (e) {
      showAlert('Failed to update admin status.', 'error', 'Network Error');
    }
  };

  return (
    <div className="space-y-8">
      <AlertModal
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />

      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Accounts Management</h1>
        <p className="text-sm text-slate-500 mt-1">Super Admin portal to manage administrator accounts & access</p>
      </div>

      {notification && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Admin Form */}
        <Card className="glass-card bg-white border-slate-200 shadow-md lg:col-span-1">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-base flex items-center gap-2 font-bold text-slate-900">
              <Plus className="h-5 w-5 text-[#1e3a8a]" />
              Add Admin Account
            </CardTitle>
            <CardDescription className="text-slate-500">Grant placement administrator privileges</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleCreateAdmin} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-700 font-bold">Employee ID *</label>
                <Input
                  type="text"
                  placeholder="e.g. EMP101"
                  value={newEmpId}
                  onChange={(e) => setNewEmpId(e.target.value)}
                  required
                  className="bg-slate-50 border-slate-300 text-slate-900 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-bold">Admin Email Address *</label>
                <Input
                  type="email"
                  placeholder="admin.staff@placetrack.edu"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  className="bg-slate-50 border-slate-300 text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-bold">Temporary Password (min 8 chars) *</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="bg-slate-50 border-slate-300 text-slate-900"
                />
              </div>

              <Button type="submit" disabled={isSubmitting} variant="gradient" className="w-full h-10 gap-2 font-bold">
                <UserCheck className="h-4 w-4" />
                {isSubmitting ? 'Creating...' : 'Create Admin Account'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing Admins List */}
        <Card className="glass-card bg-white border-slate-200 shadow-md lg:col-span-2 overflow-hidden">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-base flex items-center gap-2 font-bold text-slate-900">
              <ShieldCheck className="h-5 w-5 text-[#1e3a8a]" />
              Administrator Accounts
            </CardTitle>
            <CardDescription className="text-slate-500">List of created placement administrators</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">Employee ID</th>
                    <th className="px-4 py-3.5">Email Address</th>
                    <th className="px-4 py-3.5">Role</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        Loading admin accounts...
                      </td>
                    </tr>
                  ) : admins.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500 font-bold">
                        No admin accounts created yet.
                      </td>
                    </tr>
                  ) : (
                    admins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5 font-bold font-mono text-slate-900">{admin.id}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">{admin.email}</td>
                        <td className="px-4 py-3.5">
                          <Badge variant="accepted">
                            {admin.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              admin.isActive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {admin.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(admin.id, admin.isActive)}
                            className={admin.isActive ? 'text-red-600 hover:text-red-700 font-bold' : 'text-emerald-700 hover:text-emerald-800 font-bold'}
                          >
                            {admin.isActive ? 'Disable' : 'Enable'}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
