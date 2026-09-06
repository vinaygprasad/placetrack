'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
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
              Placement Cell
            </p>
          </div>
        </div>

        <Card className="glass-card border-slate-200 shadow-xl bg-white text-center">
          <CardHeader>
            <div className="mx-auto h-12 w-12 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mb-2">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900 uppercase tracking-wide">
              Public Registration Closed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-slate-600">
            <p className="text-slate-500">
              Please sign in using your <span className="font-bold text-slate-800">Student Roll Number</span> and default password.
            </p>

            <div className="pt-4 border-t border-slate-100">
              <Link href="/login">
                <Button variant="gradient" className="w-full gap-2 font-bold">
                  <ArrowLeft className="h-4 w-4" />
                  Go to Student Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
