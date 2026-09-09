'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  User,
  FileCheck,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  role: 'SUPER_ADMIN' | 'ADMIN' | 'STUDENT';
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const adminNavItems = [
    {
      title: 'Placement Analytics',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Student Placements',
      href: '/admin/students',
      icon: Users,
    },
    ...(role === 'SUPER_ADMIN'
      ? [
          {
            title: 'Manage Admins',
            href: '/admin/admins',
            icon: ShieldCheck,
          },
        ]
      : []),
    {
      title: 'Change Password',
      href: '/admin/change-password',
      icon: KeyRound,
    },
  ];

  const studentNavItems = [
    {
      title: 'Master Database',
      href: '/student/profile',
      icon: User,
    },
    {
      title: 'Placement Details',
      href: '/student/placement',
      icon: FileCheck,
    },
    {
      title: 'Change Password',
      href: '/student/change-password',
      icon: KeyRound,
    },
  ];

  const items = role === 'STUDENT' ? studentNavItems : adminNavItems;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-5rem)] p-4 hidden md:block shadow-sm">
      <div className="space-y-6">
        <div>
          <h2 className="px-3 text-[11px] font-extrabold text-[#1e3a8a] uppercase tracking-wider border-b border-slate-200 pb-2">
            {role === 'STUDENT' ? 'STUDENT PORTAL' : role === 'SUPER_ADMIN' ? 'SUPER ADMIN PORTAL' : 'ADMIN PORTAL'}
          </h2>
          <nav className="mt-3 space-y-1.5">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all',
                    isActive
                      ? 'bg-blue-50 text-[#1e3a8a] border border-blue-200 shadow-sm font-extrabold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-[#1e3a8a]' : 'text-slate-500'}`} />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
