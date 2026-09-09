'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut } from 'lucide-react';

interface NavbarProps {
  user?: {
    id?: string | null;
    name?: string | null;
    fullName?: string | null;
    email?: string | null;
    primaryEmail?: string | null;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'STUDENT';
    rollNo?: string | null;
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  const displayId = user?.rollNo || user?.id || '';
  const displayName = user?.fullName || (user?.name && user?.name !== displayId ? user.name : '');
  const displayEmail = user?.email || user?.primaryEmail || '';

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 border-t-4 border-t-[#002147] shadow-sm">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* VNRVJIET Official Logo Header */}
        <Link href="/" className="flex items-center gap-4 group">
          <div className="bg-white p-1 rounded-lg">
            <Image
              src="/vnrvjiet-full-logo.png"
              alt="VNRVJIET Logo"
              width={200}
              height={50}
              className="h-11 w-auto object-contain"
              priority
            />
          </div>
          <div className="hidden md:block border-l border-slate-300 pl-3">
            <span className="text-base font-extrabold tracking-wider text-slate-900 block uppercase">
              STUDENT PERFORMANCE
            </span>
            <p className="text-[11px] text-[#1e3a8a] tracking-wider font-bold uppercase">
              Training & Placement
            </p>
          </div>
        </Link>

        {user ? (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200">
              <div className="text-left text-xs">
                {/* Top Line: Full Name & Roll No */}
                <p className="font-extrabold text-slate-900 text-xs leading-none">
                  {user.role === 'STUDENT' ? displayId : displayName ? `${displayName} (${displayId})` : displayId}
                </p>
                {/* Below Line: Email Address */}
                <p className="text-[11px] text-slate-500 leading-tight mt-1">
                  {displayEmail || 'No Email Registered'}
                </p>
              </div>
              {/* To the side: Role Badge */}
              <Badge variant={user.role === 'SUPER_ADMIN' ? 'destructive' : user.role === 'ADMIN' ? 'accepted' : 'placed'} className="ml-1 font-bold uppercase shrink-0">
                {user.role}
              </Badge>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-slate-700 hover:text-red-600 hover:border-red-300 gap-1.5 h-9"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log In
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
