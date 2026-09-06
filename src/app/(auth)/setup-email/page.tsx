'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Mail, CheckCircle2, AlertCircle, Send } from 'lucide-react';

export default function SetupEmailPage() {
  const router = useRouter();
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [studentInfo, setStudentInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated || data.user?.role !== 'STUDENT') {
          router.push('/login');
        } else {
          setStudentInfo(data.user);
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/setup-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryEmail }),
      });

      const data = await res.json();
      if (res.ok) {
        setSent(true);
        setMessage(data.message);
      } else {
        setError(data.error || 'Failed to send verification email.');
      }
    } catch (e) {
      setError('Connection error sending verification email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 space-y-3">
          <div className="inline-block bg-white p-3 rounded-2xl border border-slate-200 shadow-lg">
            <Image
              src="/vnrvjiet-full-logo.png"
              alt="VNRVJIET Logo"
              width={260}
              height={65}
              className="h-14 w-auto object-contain mx-auto"
              priority
            />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-wider text-slate-900 uppercase mt-2">
              VNRVJIET PLACEMENT TRACKER
            </h1>
            <p className="text-xs text-[#1e3a8a] font-bold tracking-wider uppercase mt-0.5">
              Placement Cell — Account Setup {studentInfo?.rollNo ? `(${studentInfo.rollNo})` : ''}
            </p>
          </div>
        </div>

        <Card className="glass-card border-slate-200 shadow-xl bg-white text-slate-900">
          <CardHeader className="space-y-1 text-center pb-4 border-b border-slate-100">
            <CardTitle className="text-lg font-bold text-slate-900 uppercase tracking-wide">
              Primary Email Setup
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Provide your personal Primary Email ID (Not College Domain Email) to verify your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{message}</span>
              </div>
            )}

            {!sent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-[#1e3a8a]" />
                    Primary Personal Email ID *
                  </label>
                  <Input
                    type="email"
                    placeholder="e.g. rahul.kumar@gmail.com"
                    value={primaryEmail}
                    onChange={(e) => setPrimaryEmail(e.target.value)}
                    required
                    className="bg-slate-50 border-slate-300"
                  />
                  <p className="text-[11px] text-slate-500 italic">
                    Note: Please enter your personal Gmail/Yahoo address.
                  </p>
                </div>

                <Button type="submit" disabled={loading} variant="gradient" className="w-full h-11 text-sm font-bold gap-2">
                  <Send className="h-4 w-4" />
                  {loading ? 'Sending Email...' : 'Send Verification Token Link'}
                </Button>
              </form>
            ) : (
              <div className="text-center py-4 space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="text-xs text-slate-700">
                  Verification email sent! Please check your inbox at <span className="font-bold text-slate-900">{primaryEmail}</span> and click the link to complete account setup.
                </p>
                <Button variant="outline" size="sm" onClick={() => setSent(false)} className="border-slate-300 text-slate-700">
                  Change Email Address
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
