'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { UserCheck, Lock, ArrowRight, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

export default function StudentLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, portal: 'student' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed.');
        setLoading(false);
        return;
      }

      if (data.user.role !== 'STUDENT') {
        setError('This portal is for students. Please use the Admin Login.');
        setLoading(false);
        return;
      }

      if (data.requireEmailSetup) {
        setSuccessMsg('First time login detected. Redirecting to email setup...');
        setTimeout(() => {
          router.push('/setup-email');
          router.refresh();
        }, 800);
        return;
      }

      setSuccessMsg('Login successful! Redirecting to My Profile...');
      setTimeout(() => {
        router.push('/student/profile');
        router.refresh();
      }, 800);
    } catch (err: any) {
      setError('An unexpected connection error occurred.');
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
              Training & Placement
            </p>
          </div>
        </div>

        <Card className="glass-card border-slate-200 shadow-xl bg-white">
          <CardHeader className="space-y-1 text-center pb-4 border-b border-slate-100">
            <CardTitle className="text-lg font-bold text-slate-900 uppercase tracking-wide">
              STUDENT SIGN IN
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-[#1e3a8a]" />
                  Student Roll Number *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 2101A0501"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="font-mono font-semibold bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-[#1e3a8a]" />
                    Password *
                  </label>
                  <Link href="/forgot-password" className="text-xs text-[#1e3a8a] font-semibold hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                variant="gradient"
                className="w-full h-11 text-sm font-bold gap-2 mt-2"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
            <div className="pt-1 w-full">
              <Link href="/admin/login">
                <Button variant="outline" size="sm" className="w-full gap-2 border-slate-300 hover:bg-slate-100 text-slate-700">
                  <ShieldCheck className="h-4 w-4 text-[#1e3a8a]" />
                  Admin Login Portal
                </Button>
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
