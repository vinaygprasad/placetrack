'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, KeyRound, ExternalLink } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
      } else {
        setError(data.error || 'Failed to request password reset.');
      }
    } catch (e) {
      setError('Connection error requesting password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md">
        {/* VNRVJIET Header Logo Branding */}
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
              STUDENT PERFORMANCE
            </h1>
            <p className="text-xs text-[#1e3a8a] font-bold tracking-wider uppercase mt-0.5">
              Training & Placement — Account Recovery
            </p>
          </div>
        </div>

        <Card className="glass-card border-slate-200 shadow-xl bg-white text-slate-900">
          <CardHeader className="space-y-1 text-center pb-4 border-b border-slate-100">
            <CardTitle className="text-lg font-bold text-slate-900 uppercase tracking-wide flex items-center justify-center gap-2">
              <KeyRound className="h-5 w-5 text-[#1e3a8a]" />
              FORGOT PASSWORD
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Enter your registered primary email address to receive password reset instructions.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {message ? (
              <div className="text-center py-4 space-y-4">
                <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">{message}</p>

                <div className="pt-2">
                  <Link href="/login">
                    <Button variant="outline" className="w-full border-slate-300 text-slate-700 hover:bg-slate-100">
                      Return to Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-[#1e3a8a]" />
                    Registered Account Email *
                  </label>
                  <Input
                    type="email"
                    placeholder="e.g. student@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                  />
                </div>

                <Button type="submit" disabled={loading} variant="gradient" className="w-full h-11 text-sm font-bold gap-2 mt-2">
                  {loading ? 'Processing...' : 'Send Reset Instructions'}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex justify-center border-t border-slate-100 pt-4">
            <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-[#1e3a8a] font-semibold">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Student Sign In
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
