'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setStatus('error');
      setMessage('Missing verification token in URL.');
      return;
    }

    async function verify() {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email successfully verified!');
        } else {
          setStatus('error');
          setMessage(data.error || 'Email verification failed.');
        }
      } catch (e) {
        setStatus('error');
        setMessage('Network error verifying email address.');
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md text-center">
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
              Placement Cell — Account Verification
            </p>
          </div>
        </div>

        <Card className="glass-card border-slate-200 p-6 shadow-xl bg-white text-slate-900">
          <CardContent className="pt-4 space-y-6">
            {loading ? (
              <div className="space-y-4 py-8">
                <Loader2 className="h-10 w-10 animate-spin text-[#1e3a8a] mx-auto" />
                <h2 className="text-lg font-bold text-slate-900">Verifying Email Address...</h2>
                <p className="text-xs text-slate-500">Please wait while we validate your activation token.</p>
              </div>
            ) : status === 'success' ? (
              <div className="space-y-4 py-4">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">Email Verified!</h2>
                <p className="text-sm text-slate-700">{message}</p>
                <div className="pt-4">
                  <Link href="/login">
                    <Button variant="gradient" className="w-full h-11 font-bold">
                      Proceed to Login
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-200">
                  <AlertCircle className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">Verification Failed</h2>
                <p className="text-sm text-slate-700">{message}</p>
                <div className="pt-4">
                  <Link href="/login">
                    <Button variant="outline" className="w-full border-slate-300">
                      Back to Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Loading...
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
